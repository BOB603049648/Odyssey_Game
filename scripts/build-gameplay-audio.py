"""Build v0.1.2 foley/music from the CC0 archives in gameplay-sources.json.
Usage: python scripts/build-gameplay-audio.py SOURCE_DIR
Extract MoreSounds.zip into foley/, footsteps.7z into footsteps/, birds.7z into
birds/ and liquid.7z into liquid/. Requires NumPy and FFmpeg; release
builds use the committed files and never download or synthesize audio.
"""
import sys, subprocess, json, hashlib
from pathlib import Path
import numpy as np
RATE = 44100
source = Path(sys.argv[1])
root = Path(__file__).resolve().parents[1]
target = root / 'src/assets/audio/foley'
target.mkdir(parents=True, exist_ok=True)
for spec in json.loads((root/'src/assets/audio/gameplay-sources.json').read_text()):
    path = source/spec['localName']
    if hashlib.sha256(path.read_bytes()).hexdigest() != spec['sha256']:
        raise ValueError(f"Source hash mismatch: {path}")
metrics = {}

def read(path, filters='highpass=f=75,lowpass=f=7500', start=0, duration=None):
    args = ['ffmpeg','-v','error','-ss',str(start),'-i',str(source/path)]
    if duration: args += ['-t',str(duration)]
    if filters: args += ['-af',filters]
    args += ['-ar',str(RATE),'-ac','2','-f','f32le','-']
    return np.frombuffer(subprocess.check_output(args),'<f4').reshape(-1,2).copy()

def trim(data, max_seconds=2):
    envelope = np.max(np.abs(data),axis=1)
    active = np.flatnonzero(envelope > max(.003, envelope.max()*.025))
    if len(active): data=data[max(0,active[0]-440):min(len(data),active[-1]+1323)]
    return data[:int(max_seconds*RATE)]

def save(name, data, rms=.09, peak=.55, loop=False, folder=target):
    data=data-data.mean(axis=0)
    data *= min(rms/max(1e-8,np.sqrt(np.mean(data**2))), peak/max(1e-8,np.max(abs(data))))
    if not loop:
        n=min(440,len(data)//4);data[:n]*=np.linspace(0,1,n)[:,None];data[-n:]*=np.linspace(1,0,n)[:,None]
    subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(RATE),'-ac','2','-i','pipe:0','-c:a','libmp3lame','-b:a','96k','-map_metadata','-1',str(folder/(name+'.mp3'))],input=data.astype('<f4').tobytes(),check=True)
    metrics[name]={'seconds':round(len(data)/RATE,3),'rms':round(float(np.sqrt(np.mean(data**2))),4),'peak':round(float(np.max(abs(data))),4)}

# Six genuine alternating left/right sand and stone recordings, never one step
# repitched and relabeled as a different ground material.
for surface in ['Sand','Stone']:
    for i,(foot,n) in enumerate([(f,n) for n in [1,2,3] for f in ['L','R']],1):
        d=read(f'footsteps/Fantozzi-footsteps/flac/Fantozzi-{surface}{foot}{n}.flac')
        save(f'step-{surface.lower()}-{i}',trim(d,.5),rms=.12)
# Isolate four different footfalls from the wooden-floor recording.
wood=read('wood.wav')
for i,at in enumerate([.16,.66,1.2,2.22],1):
    save(f'step-wood-{i}',trim(wood[max(0,int((at-.075)*RATE)):int((at+.26)*RATE)],.4),rms=.105)
for i,n in enumerate([4,5,7],1): save(f'cloth-{i}',trim(read(f'foley/Cloth/Cloth_0{n}.wav'),.45),rms=.045)
for i in [1,2,3]: save(f'drink-{i}',trim(read(f'foley/Drink/Drink_0{i}.wav'),.6),rms=.12)
for i,n in enumerate([1,6],1): save(f'water-draw-{i}',trim(read(f'liquid/qubodup-bottle-and-drink-sounds/bottle-shake-{n:02}.flac'),.65),rms=.09)
save('sit',trim(read('foley/Cloth/Cloth_06.wav'),.8),rms=.065)
save('pickup',trim(read('foley/Cloth/Cloth_04.wav'),.4), rms=.08)
save('place',trim(read('foley/Kitchen/Kitchen_02.wav'),.35),rms=.065)
save('paper',trim(read('foley/Paper & Stationery/Stationery_01.wav'),.8),rms=.055)
for i,n in enumerate([1,3,5],1):
    save(f'bird-{i}',trim(read(f'birds/Forest Birds/Forest Birds {n}.wav','highpass=f=1700,lowpass=f=7800,afftdn=nf=-25'),3),rms=.045,peak=.22)
save('wood-creak',trim(wood[int(1.65*RATE):int(2.1*RATE)],.45),rms=.045)

# Original, restrained musical vocabulary: one four-note motif in three
# arrangements. All notes are synthesized here; no sampled instrument claims.
def note(frequency,seconds,plucked=True):
    t=np.arange(int(seconds*RATE))/RATE
    env=(1-np.exp(-t*(90 if plucked else 2.2)))*np.exp(-t/(.8 if plucked else 3.5))
    tone=sum(np.sin(2*np.pi*frequency*h*t+.12*h)/(h**(2.2 if plucked else 3)) for h in [1,2,3,4])
    return np.column_stack([tone*env,np.sin(2*np.pi*frequency*t+.08)*env*.8])
def add(dst,clip,at,gain=1):
    start=int(at*RATE);n=min(len(clip),len(dst)-start)
    if n>0:dst[start:start+n]+=clip[:n]*gain

def theme(seconds,kind):
    out=np.zeros((int(seconds*RATE),2));beat=.88
    melody=[(0,62),(1.5,69),(3,74),(4,76),(6,74),(8,69),(10,67),(12,64),(14,62),
            (18,65),(20,69),(22,74),(24,72),(26,69),(28,67),(30,62)]
    if kind=='memory': melody=[(a,n-12) for a,n in melody[:9]];beat=1.2
    if kind=='resolve':melody=[(0,62),(1.5,65),(3,69),(4.5,74),(7,76),(9,74)];beat=.7
    for at,midi in melody:
        if at*beat+2<seconds:add(out,note(440*2**((midi-69)/12),3.2),at*beat,.15)
    for at,bass in [(0,38),(7,46),(14,41),(21,45),(28,38)]:
        if at<seconds-4:
            for semitone in [0,7,12]:add(out,note(440*2**((bass+semitone-69)/12),7,False),at,.04)
    # Short stereo echoes with empty tail; title loop breathes before repeating.
    dry=out.copy()
    for delay,gain in [(.19,.18),(.37,.12),(.63,.08)]:add(out,dry,delay,gain)
    fade=min(len(out)//3,2*RATE);out[-fade:]*=np.linspace(1,0,fade)[:,None]
    return out
for name,seconds in [('title',32),('memory',24),('resolve',12)]:save('theme-'+name,theme(seconds,name),rms=.055,peak=.24)
for name,notes in {'select':[(0,62)],'answer-right':[(0,69),(.13,74)],'word-learn':[(0,62),(.15,69),(.32,74)],'milestone':[(0,62),(.2,65),(.4,69),(.65,74)],'answer-wrong':[(0,57),(.12,55)]}.items():
    out=np.zeros((int((notes[-1][0]+.65)*RATE),2))
    for at,m in notes:add(out,note(440*2**((m-69)/12),.65),at,.2)
    save(name,out,rms=.075,peak=.28)

# 48-second environment beds with independently drifting recorded layers.
def periodic(data,seconds=48,cross=.65):
    n=min(int(cross*RATE),len(data)//4);f=np.linspace(0,1,n)[:,None]
    cycle=np.concatenate([data[n:-n],data[-n:]*(1-f)+data[:n]*f])
    length=int(seconds*RATE);extended=np.tile(cycle,(int(np.ceil((length+n)/len(cycle)))+1,1))[:length+n]
    extended[:n]=extended[:n]*f+extended[length:length+n]*(1-f)
    return extended[:length]
def unit(data):return data/max(1e-8,np.sqrt(np.mean(data**2)))
# Existing credited recordings are copied into SOURCE_DIR by the rebuild caller.
wind=periodic(read('wind.wav','highpass=f=90,lowpass=f=2000'))
waves=periodic(read('waves.flac','highpass=f=65,lowpass=f=5500'))
fire=periodic(read('fire.wav','highpass=f=100,lowpass=f=5500'))
crickets=periodic(read('crickets.mp3','highpass=f=1700,lowpass=f=7800'))
t=np.arange(len(wind))/RATE
swell=(.65+.18*np.sin(2*np.pi*t/48)+.12*np.sin(2*np.pi*t/16))[:,None]
for name,d,rms in [('camp',unit(fire)*.8+unit(wind)*.12,.043),('forest',unit(wind)*swell,.04),('night',unit(crickets)*.48+unit(fire)*.12+unit(wind)*.08,.036),('shore',unit(waves)*swell+unit(wind)*.07,.055),('yard',unit(wind)*.4+unit(waves)*.13,.033)]:
    save(name,d,rms=rms,peak=.35,loop=True,folder=target.parent)
(target/'metrics.json').write_text(json.dumps(metrics,indent=2)+'\n')
print(json.dumps(metrics,indent=2))
