"""Extract cut-boundary and chapter frames from the finished video only."""
import json
import subprocess
from pathlib import Path
import imageio_ffmpeg

edit=Path(__file__).resolve().parents[1]/'renders'/'jnu120-20261116'/'edit'
video=edit/'暨南大学120周年-实机踩点版.mp4'
edl=json.loads((edit/'edl.json').read_text(encoding='utf-8'))
verify=edit/'verify'
verify.mkdir(exist_ok=True)
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
font="fontfile='C\\:/Windows/Fonts/segoeui.ttf'"

def sheet(frames,name,layout):
    selector='+'.join(f'eq(n,{f})' for f in frames)
    vf=f"select='{selector}',scale=480:270,drawtext={font}:text='%{{pts\\:hms}}':x=10:y=10:fontsize=18:fontcolor=white:box=1:boxcolor=black@0.65,tile={layout}"
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-y','-threads','2','-i',str(video),
        '-vf',vf,'-frames:v','1','-filter_threads','1',str(verify/name)],check=True)

boundaries=[round(s['start']*30) for s in edl['segments'][1:]]
for i in range(0,len(boundaries),7):
    group=boundaries[i:i+7]
    sheet([f for b in group for f in [b-1,b,b+2]],f'cuts-{i//7+1}.png',f'3x{len(group)}')
times=[1.5,6,12,18,24,30,36,40.5,46,52,59,65,69,73,77,80]
sheet([round(t*30) for t in times],'chapters.png','4x4')
for time,name in [(36,'map'),(46,'120'),(52,'emblem'),(59,'cake'),(73,'fireworks'),(80,'outro')]:
    subprocess.run([ffmpeg,'-hide_banner','-loglevel','error','-nostdin','-y','-threads','2','-ss',str(time),'-i',str(video),
        '-frames:v','1',str(verify/f'{name}.png')],check=True)
print(str(verify),flush=True)
