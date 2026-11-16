"""Measure the downloaded music's onsets and dynamics for the edit."""
import json
import subprocess
from pathlib import Path
import numpy as np
from scipy import signal
import imageio_ffmpeg

OUT = Path(__file__).resolve().parents[1] / 'renders' / 'jnu120-20261116'
sample_rate, hop = 22050, 256
result = subprocess.run([imageio_ffmpeg.get_ffmpeg_exe(), '-v', 'error', '-i',
    str(OUT/'Titan-Scott-Buckley.mp3'), '-f', 'f32le', '-ac', '1', '-ar', str(sample_rate), '-'],
    stdout=subprocess.PIPE, check=True)
audio = np.frombuffer(result.stdout, dtype=np.float32)
freq, times, spectrum = signal.stft(audio, sample_rate, nperseg=2048, noverlap=2048-hop)
magnitude = np.log1p(np.abs(spectrum)*100)
flux = np.maximum(0, np.diff(magnitude, axis=1)).mean(axis=0)
flux = np.r_[0, flux]
onset = np.maximum(0, flux - signal.medfilt(flux, 65))
peaks, props = signal.find_peaks(onset, distance=int(.23*sample_rate/hop),
    prominence=np.percentile(onset, 70)*.8)
events = [{'time':round(float(times[i]),3), 'strength':round(float(onset[i]),5)} for i in peaks]
energy = [{'start':i, 'rms':round(float(np.sqrt(np.mean(audio[i*sample_rate:(i+5)*sample_rate]**2))),4)}
    for i in range(0, int(len(audio)/sample_rate)-4, 5)]
auto = signal.correlate(onset, onset, mode='full', method='fft')[len(onset)-1:]
lo, hi = int(.35*sample_rate/hop), int(.85*sample_rate/hop)
lag = lo + np.argmax(auto[lo:hi])
report = {'duration':len(audio)/sample_rate, 'estimated_bpm':60/(lag*hop/sample_rate),
          'energy_5s':energy, 'onsets':events}
(OUT/'music-analysis.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), encoding='utf-8')
print(json.dumps({k:v for k,v in report.items() if k!='onsets'}, ensure_ascii=False))
print('strong_onsets', sorted(events,key=lambda p:p['strength'],reverse=True)[:30])
