"""Record the real Windows display; UI interactions are handled by Computer Use."""
import json
import argparse
import subprocess
import threading
import time
from datetime import datetime, timezone
from pathlib import Path

import imageio_ffmpeg

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "renders" / "jnu120-20261116"
OUT.mkdir(parents=True, exist_ok=True)
parser=argparse.ArgumentParser()
parser.add_argument('--take',type=int,default=1)
parser.add_argument('--dda',action='store_true')
args=parser.parse_args()
tag=f'take-{args.take:02d}'
STOP = OUT / f"stop-{tag}"
if STOP.exists():
    raise SystemExit("Remove the old stop marker before starting another take.")
capture = (['-f','lavfi','-i','ddagrab=framerate=30:draw_mouse=0',
            '-vf','hwdownload,format=bgra,scale=1920:1280:flags=bilinear'] if args.dda else
           ['-f','gdigrab','-framerate','30','-draw_mouse','0',
            '-offset_x','0','-offset_y','84','-video_size','2520x1596','-i','desktop',
            '-vf','scale=1704:1080:flags=lanczos,pad=1920:1080:108:0:color=0x050d1d'])
command = [
    imageio_ffmpeg.get_ffmpeg_exe(), "-hide_banner", "-n", "-loglevel", "warning",
    '-filter_threads','2',*capture,'-an',
    "-c:v", "libx264", "-threads", "2", "-preset", "ultrafast", "-crf", "18",
    "-pix_fmt", "yuv420p", "-fps_mode", "passthrough", "-t", "180", "-progress", "pipe:1",
    str(OUT / f"raw-screen-{tag}.mkv"),
]
metadata = {"started_utc": datetime.now(timezone.utc).isoformat(), "command": command,
            "capture": "Windows Desktop Duplication" if args.dda else "Windows GDI"}
(OUT / f"capture-{tag}.json").write_text(json.dumps(metadata, ensure_ascii=False, indent=2), encoding="utf-8")
with (OUT / f"capture-{tag}.log").open("w", encoding="utf-8") as log:
    process = subprocess.Popen(command, stdin=subprocess.PIPE, stdout=subprocess.PIPE,
                               stderr=log, text=True, encoding="utf-8")
    def stop_when_requested():
        while process.poll() is None:
            if STOP.exists():
                process.stdin.write("q\n")
                process.stdin.flush()
                return
            time.sleep(.5)
    threading.Thread(target=stop_when_requested, daemon=True).start()
    report = {}
    announced = False
    for line in process.stdout:
        key, _, value = line.strip().partition("=")
        report[key] = value
        if key == "progress":
            (OUT / f"capture-progress-{tag}.json").write_text(json.dumps(report), encoding="utf-8")
            if not announced and int(report.get("frame", "0")) > 0:
                print("RECORDING_STARTED " + datetime.now(timezone.utc).isoformat(), flush=True)
                announced = True
    code = process.wait()
    print(f"RECORDING_FINISHED exit={code} frames={report.get('frame')}", flush=True)
    raise SystemExit(code)
