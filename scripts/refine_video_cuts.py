"""Find frame-accurate title changes in the existing screen recording."""
import json
import subprocess
from pathlib import Path
import imageio_ffmpeg
import numpy as np

root=Path(__file__).resolve().parents[1]/'renders'/'jnu120-20261116'
edit=root/'edit'
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
coarse=json.loads((edit/'caption-events.json').read_text(encoding='utf-8'))
events=[]
for event in coarse:
    start=round(event['time']-.3,3)
    r=subprocess.run([ffmpeg,'-v','error','-threads','2','-ss',str(start),'-i',str(root/'raw-screen-take-01.mkv'),
        '-t','0.6','-vf','crop=680:70:620:900','-f','rawvideo','-pix_fmt','rgb24','-'],stdout=subprocess.PIPE,check=True)
    rgb=np.frombuffer(r.stdout,dtype=np.uint8).reshape(-1,70,680,3)
    mask=(rgb[:,:,:,0]>180)&(rgb[:,:,:,1]>160)&(rgb[:,:,:,2]>110)
    scores=np.count_nonzero(mask[1:]!=mask[:-1],axis=(1,2))
    frame=round((start+(int(np.argmax(scores))+1)/30)*30)
    events.append({'frame':frame,'time':frame/30,'difference':int(max(scores))})
    print(events[-1],flush=True)
(edit/'cut-frames.json').write_text(json.dumps(events,indent=2),encoding='utf-8')
# Two representative cleanup frames, not application/browser validation.
cleanup='delogo=x=146:y=578:w=124:h=124,delogo=x=1362:y=910:w=108:h=104,crop=1692:1072:114:4,pad=1920:1080:114:4:color=0x050d1d'
for seconds,name in [(10,'intro-clean'),(22,'campus-clean'),(76,'cake-clean')]:
    subprocess.run([ffmpeg,'-v','error','-y','-threads','2','-ss',str(seconds),'-i',str(root/'raw-screen-take-01.mkv'),
        '-vf',cleanup,'-frames:v','1',str(edit/f'{name}.png')],check=True)
