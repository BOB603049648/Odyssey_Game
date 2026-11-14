"""Rebuild the committed sound pack: python scripts/build-prologue-audio.py SOURCE_DIR.
Requires Python + NumPy + FFmpeg. Source URLs and licenses are in the pack README.
Normal game builds use committed MP3 files and do not run this script.
"""
import sys, subprocess, wave
from pathlib import Path
import numpy as np

RATE = 44100
source = Path(sys.argv[1])
target = Path(__file__).resolve().parents[1] / 'src/assets/audio'
target.mkdir(parents=True, exist_ok=True)

def read(name, filters='', start=0, duration=None):
    args = ['ffmpeg', '-v', 'error', '-ss', str(start), '-i', str(source / name)]
    if duration: args += ['-t', str(duration)]
    if filters: args += ['-af', filters]
    args += ['-ar', str(RATE), '-ac', '2', '-f', 'f32le', '-']
    return np.frombuffer(subprocess.check_output(args), dtype='<f4').reshape(-1, 2).copy()

def loop(data, seconds=16, cross=.65):
    # Overlap the tail into the head, then rotate at a continuous interior sample.
    n = min(int(cross * RATE), len(data)//3)
    fade = np.linspace(0, 1, n)[:, None]
    cycle = np.concatenate((data[n:-n], data[-n:] * (1-fade) + data[:n] * fade))
    # A second seam blend makes the final 16-second buffer itself periodic.
    length = int(seconds*RATE)
    extended = np.tile(cycle, (int(np.ceil((length+n)/len(cycle)))+1, 1))[:length+n]
    extended[:n] = extended[:n] * fade + extended[length:length+n] * (1-fade)
    return extended[:length]

def save(name, data, rms=.09, peak=.65, fade=False):
    data = data - data.mean(axis=0)
    data *= min(rms / max(1e-8, np.sqrt(np.mean(data**2))), peak / max(1e-8, np.max(np.abs(data))))
    if fade:
        n = min(int(.035*RATE), len(data)//4)
        data[:n] *= np.linspace(0, 1, n)[:,None]
        data[-n:] *= np.linspace(1, 0, n)[:,None]
    wav = source / (name+'.wav')
    with wave.open(str(wav),'wb') as out:
        out.setnchannels(2); out.setsampwidth(2); out.setframerate(RATE)
        out.writeframes((np.clip(data,-1,1)*32767).astype('<i2').tobytes())
    subprocess.run(['ffmpeg','-v','error','-y','-i',str(wav),'-c:a','libmp3lame','-b:a','96k','-map_metadata','-1',str(target/(name+'.mp3'))],check=True)
    print(name, 'seconds',round(len(data)/RATE,2),'rms',round(float(np.sqrt(np.mean(data**2))),4),'peak',round(float(np.max(np.abs(data))),4))

waves = loop(read('waves.flac', 'highpass=f=65,lowpass=f=5500'))
wind = loop(read('wind.wav', 'highpass=f=80,lowpass=f=1800'))
rain = loop(read('rain.ogg', 'highpass=f=70,lowpass=f=6500',start=34,duration=18))
def unit(data): return data/max(1e-8,np.sqrt(np.mean(data**2)))
t = np.arange(len(waves))/RATE
save('storm', unit(rain)*.62 + unit(waves)*(.35+.12*np.sin(2*np.pi*t/8))[:,None] + unit(wind)*.13)
save('rescue', unit(waves)*.7 + unit(wind)*.16 + unit(rain)*.12, rms=.075)
# Original, quiet D/A/C/E harmonic texture. Integer periods make a periodic bed.
pad = np.zeros_like(waves)
for i,frequency in enumerate([146.8125,220.,261.625,329.625]):
    for harmonic in [1,2,3]:
        phase = 2*np.pi*(frequency*harmonic)*t
        envelope = .65 + .35*np.cos(2*np.pi*t/16 + i)
        for channel in range(2):
            pad[:,channel] += np.sin(phase + channel*.18*harmonic)*envelope/(harmonic**2*5)
save('memory', pad + unit(wind)*.025, rms=.055, peak=.25)
save('shore', unit(waves)*.75 + unit(wind)*.06, rms=.055)
save('cat-call',read('cat-food.wav','highpass=f=100,lowpass=f=7000'),rms=.12,fade=True)
save('cat-purr',read('purr.wav','highpass=f=45,lowpass=f=2200',duration=2),rms=.07,fade=True)
# Original brief paper/fissure accent, not an imitation of an acoustic recording.
rng=np.random.default_rng(20261114)
t=np.arange(int(RATE*1.4))/RATE
noise=rng.normal(0,1,len(t))
noise=np.convolve(noise,np.ones(5)/5,mode='same')
envelope=(1-np.exp(-t*35))*np.exp(-t*6)
crack=noise*envelope*.3+np.sin(2*np.pi*(880*t-100*t*t))*np.exp(-t*5)*.09
save('glyph-break',np.column_stack([crack,np.roll(crack,130)]),rms=.07,peak=.45,fade=True)
