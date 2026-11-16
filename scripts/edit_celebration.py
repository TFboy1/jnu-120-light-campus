"""Beat-edit the saved local screen capture. Does not open or control a browser."""
import json
import re
import subprocess
from pathlib import Path
import imageio_ffmpeg

ROOT=Path(__file__).resolve().parents[1]
MEDIA=ROOT/'renders'/'jnu120-20261116'
EDIT=MEDIA/'edit'
EDIT.mkdir(exist_ok=True)
FFMPEG=imageio_ffmpeg.get_ffmpeg_exe()
SOURCE=MEDIA/'raw-screen-take-01.mkv'
MUSIC=MEDIA/'Titan-Scott-Buckley.mp3'
FINAL=EDIT/'暨南大学120周年-实机踩点版.mp4'
FPS=30
MUSIC_IN=89.808
cuts=json.loads((EDIT/'cut-frames.json').read_text(encoding='utf-8'))
starts=[c['frame'] for c in cuts]+[2925]
names=['石牌','番禺','广园东','珠海','深圳','五校地图','转向星空','星光120','星光校徽','主题蛋糕','生日快乐','烟花秀','片尾祝福']
durations=[6,6,6,6,6,6,3,6,6,7.5,6,10.5,4.5]
segments=[{'name':'三地五校·序','in_frame':1530,'out_frame':1617,'duration':3}]
segments += [dict(name=name,in_frame=starts[i],out_frame=starts[i+1],duration=duration)
             for i,(name,duration) in enumerate(zip(names,durations))]
cursor=0
for i,s in enumerate(segments):
    s.update(index=i,start=cursor,end=cursor+s['duration'],frames=round(s['duration']*FPS))
    cursor+=s['duration']
assert cursor==82.5 and sum(s['frames'] for s in segments)==2475
assert all(s['out_frame']>s['in_frame'] for s in segments)
edl=dict(source=str(SOURCE),music=str(MUSIC),music_in=MUSIC_IN,duration=cursor,fps=FPS,
         resolution=[1920,1080],segments=segments)
(EDIT/'edl.json').write_text(json.dumps(edl,ensure_ascii=False,indent=2),encoding='utf-8')
(EDIT/'credit-overlay.txt').write_text('Music: Titan / Scott Buckley  -  CC BY 4.0  -  scottbuckley.com.au',encoding='utf-8')
(EDIT/'music-credit.txt').write_text((MEDIA/'music-credit.txt').read_text(encoding='utf-8'),encoding='utf-8')

def run(args,log):
    with (EDIT/log).open('w',encoding='utf-8') as file:
        subprocess.run([FFMPEG,'-hide_banner','-nostdin','-y',*args],cwd=EDIT,stdout=file,stderr=file,check=True)

# Crop only the capture border and control buttons; retain original colors and all captions.
cleanup='delogo=x=146:y=578:w=124:h=124,delogo=x=1362:y=910:w=108:h=104,crop=1692:986:114:4,pad=1920:1080:114:47:color=0x050d1d'
for s in segments:
    source_frames=s['out_frame']-s['in_frame']
    vf=(f"trim=end_frame={source_frames},setpts=(PTS-STARTPTS)*{s['frames']}/{source_frames},"
        f"fps={FPS},tpad=stop_mode=clone:stop_duration=0.2,trim=end_frame={s['frames']},"
        f"setpts=N/({FPS}*TB),{cleanup}")
    if s['index']==0:
        vf+=',fade=t=in:st=0:d=0.4'
    if s['index']==len(segments)-1:
        vf+=",drawtext=fontfile='C\\:/Windows/Fonts/segoeui.ttf':textfile='credit-overlay.txt':fontsize=16:fontcolor=0xb7c9d3:x=(w-tw)/2:y=1045,fade=t=out:st=3.7:d=0.8"
    output=f"clip-{s['index']:02}.mp4"
    run(['-v','warning','-threads','2','-ss',str(s['in_frame']/FPS),'-i',str(SOURCE),
         '-an','-vf',vf,'-frames:v',str(s['frames']),'-c:v','libx264','-preset','fast','-crf','18',
         '-pix_fmt','yuv420p','-threads','4','-filter_threads','1','-r',str(FPS),
         '-video_track_timescale','15360','-movflags','+faststart',output],f"clip-{s['index']:02}.log")
    print(f"已编码 {s['index']+1}/{len(segments)} {s['name']} {s['start']:g}–{s['end']:g}s",flush=True)

(EDIT/'concat.txt').write_text(''.join(f"file 'clip-{s['index']:02}.mp4'\n" for s in segments),encoding='utf-8')
run(['-v','warning','-f','concat','-safe','0','-i','concat.txt','-c','copy','picture.mp4'],'concat.log')
base=f'atrim=start={MUSIC_IN}:duration={cursor},asetpts=PTS-STARTPTS,afade=t=in:st=0:d=0.4,afade=t=out:st={cursor-3}:d=3'
run(['-i',str(MUSIC),'-af',base+',loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json','-f','null','-'],'music-measure.log')
measure=json.loads(re.findall(r'\{[^{}]+\}',(EDIT/'music-measure.log').read_text(encoding='utf-8'))[-1])
norm=(f"loudnorm=I=-14:TP=-1.5:LRA=11:measured_I={measure['input_i']}:"
      f"measured_TP={measure['input_tp']}:measured_LRA={measure['input_lra']}:"
      f"measured_thresh={measure['input_thresh']}:offset={measure['target_offset']}:linear=true:print_format=json")
run(['-v','warning','-i','picture.mp4','-i',str(MUSIC),'-map','0:v:0','-map','1:a:0',
     '-af',base+','+norm,'-c:v','copy','-c:a','aac','-b:a','320k','-ar','48000','-t',str(cursor),
     '-metadata','title=暨南大学120周年 · 点亮暨南',
     '-metadata','comment=Local screen capture. Music: Titan by Scott Buckley, CC BY 4.0, scottbuckley.com.au',
     '-movflags','+faststart',str(FINAL)],'mux.log')
print('成片已合成，正在检查解码与音量。',flush=True)
run(['-v','error','-threads','2','-i',str(FINAL),'-f','null','-'],'decode-check.log')
frames,seconds=imageio_ffmpeg.count_frames_and_secs(str(FINAL))
assert frames==2475 and abs(seconds-cursor)<0.05,(frames,seconds)
run(['-i',str(FINAL),'-vn','-af','loudnorm=I=-14:TP=-1.5:LRA=11:print_format=json','-f','null','-'],'final-loudness.log')
levels=json.loads(re.findall(r'\{[^{}]+\}',(EDIT/'final-loudness.log').read_text(encoding='utf-8'))[-1])
report=dict(frames=frames,duration=seconds,size_bytes=FINAL.stat().st_size,
            integrated_lufs=float(levels['input_i']),true_peak_dbtp=float(levels['input_tp']),
            decode_errors=(EDIT/'decode-check.log').read_text(encoding='utf-8').strip())
assert report['decode_errors']==''
assert -15<report['integrated_lufs']<-13 and report['true_peak_dbtp']<=-0.9,report
(EDIT/'verification.json').write_text(json.dumps(report,indent=2),encoding='utf-8')
print(json.dumps(report,ensure_ascii=False),flush=True)

rows='\n'.join(f"| {s['start']:05.1f}–{s['end']:05.1f} | {s['name']} | {s['in_frame']/30:.3f}–{s['out_frame']/30:.3f} |" for s in segments)
(EDIT/'project.md').write_text(f'''# 暨南大学 120 周年 · 实机踩点版

2026-11-16：使用本机第一遍完整录屏进行后期，未重新控制浏览器，未使用生成画面或生成音乐。
82.5 秒，1920×1080，30 fps，H.264 / AAC。原始录屏为 30 fps 封装，存在重复帧；保留实机运动表现，没有插帧生成。
按约 80 BPM 编排；前五校各 6 秒。“120 / 校徽 / 蛋糕”分别落在成片 42 / 48 / 54 秒，对应配乐 131.808 / 137.808 / 143.808 秒。
音乐摘选 89.808–172.308 秒。连续配乐，起末淡入淡出，两遍响度归一化。无对白或原始音轨，无 ASR 需求。
清理捕获边框、两处鼠标提示，裁掉底部控制按钮；保留原始建筑、文字、颜色及完整演出顺序。
来源素材保持原文件不变。分段只编码一次，后续视频无损拼接和封装。

| 成片时间（秒） | 段落 | 原片时间（秒） |
| --- | --- | --- |
{rows}

音频实测：{report['integrated_lufs']} LUFS，{report['true_peak_dbtp']} dBTP。全片解码通过，共 {frames} 帧。
发布时复制同目录 music-credit.txt 的署名到作品简介。
重新生成：在项目根目录运行 `.venv-video/Scripts/python.exe scripts/edit_celebration.py`。
''',encoding='utf-8')
print(str(FINAL),flush=True)
