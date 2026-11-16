"""Inspect recorded frames and subtitle changes without controlling the browser."""
import json
import subprocess
from pathlib import Path
import numpy as np
from scipy.signal import find_peaks
import imageio_ffmpeg

OUT=Path(__file__).resolve().parents[1]/'renders'/'jnu120-20261116'
EDIT=OUT/'edit'
EDIT.mkdir(exist_ok=True)
ffmpeg=imageio_ffmpeg.get_ffmpeg_exe()
source=OUT/'raw-screen-take-01.mkv'
for time,name in [(22,'campus-frame'),(78,'cake-frame')]:
    subprocess.run([ffmpeg,'-v','error','-y','-threads','2','-ss',str(time),'-i',str(source),
        '-frames:v','1',str(EDIT/f'{name}.png')],check=True)
cache=EDIT/'caption-frames.npy'
if cache.exists():
    frames=np.load(cache)
else:
    result=subprocess.run([ffmpeg,'-v','error','-threads','2','-i',str(source),'-an',
        '-vf','fps=10,crop=680:70:620:900','-f','rawvideo','-pix_fmt','rgb24','-'],
        stdout=subprocess.PIPE,check=True)
    frames=np.frombuffer(result.stdout,dtype=np.uint8).reshape(-1,70,680,3)
    np.save(cache,frames)
rgb=frames.astype(np.int16)
mask=(rgb[:,:,:,0]>180)&(rgb[:,:,:,1]>160)&(rgb[:,:,:,2]>110)
scores=np.count_nonzero(mask[1:]!=mask[:-1],axis=(1,2))
peaks,_=find_peaks(scores,distance=35,prominence=500)
events=[{'time':round((int(i)+1)/10,2),'difference':int(scores[i])} for i in peaks]
(EDIT/'caption-events.json').write_text(json.dumps(events,indent=2),encoding='utf-8')
print('caption_events',events,flush=True)
analysis=json.loads((OUT/'music-analysis.json').read_text(encoding='utf-8'))
for target in [89.808,92.808,98.808,104.808,110.808,116.808,122.808,128.808,131.808,137.808,143.808,151.308,157.308,167.808]:
    near=sorted(analysis['onsets'],key=lambda e:abs(e['time']-target))[:2]
    print('music_anchor',target,near,flush=True)
