"""Keep generated PNG sources; encode WebP Q95 with exact alpha and measure registration."""
from pathlib import Path
import hashlib,json,shutil,subprocess
import numpy as np
from PIL import Image

ROOT=Path(__file__).resolve().parents[1]
SOURCE=ROOT/'docs/assets/actors-v15'; DEST=ROOT/'src/assets/art/actors'
SOURCE.mkdir(parents=True,exist_ok=True);DEST.mkdir(parents=True,exist_ok=True)
SPECS={
 'idle':('37f8e175-721a-4855-a95b-2d5c73000592',3,2),
 'walk':('7b18f32d-3158-4405-ad35-5396d35b1c81',8,3),
 'action':('74782211-ad6f-4808-8955-db07d57562be',4,3),
 'settle':('139b2bbd-cf97-47c4-8852-5d5ae16e4cb8',4,2),
 'cat':('678de351-4ed0-499e-ab3c-8c750ec0f22e',1,1),
 'cat-performance':('999e329b-f173-4d00-8113-1452bfe83014',4,2),
 'cat-leap':('ff3595dc-8d31-4b54-b2aa-2d28a6aa1178',2,1),
}
result={};provenance=[]
for key,(id,cols,rows) in SPECS.items():
 src=Path('/workspace/generated_images')/f'exec-{id}.png'; saved=SOURCE/f'{key}.png';shutil.copyfile(src,saved)
 dest=DEST/f'{key}.webp'
 subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-i',str(saved),'-c:v','libwebp','-quality','95','-compression_level','6','-pix_fmt','bgra',str(dest)],check=True)
 a=np.asarray(Image.open(saved).convert('RGBA'));b=np.asarray(Image.open(dest).convert('RGBA'))
 assert np.array_equal(a[:,:,3],b[:,:,3]),key
 mask=a[:,:,3]>160;delta=a[:,:,:3].astype(float)-b[:,:,:3]
 rmse=float(np.sqrt((delta[mask]**2).mean()));assert rmse<4,key
 H,W=a.shape[:2];frames=[]
 for i in range(cols*rows):
  x=int(i%cols*W/cols);y=int(i//cols*H/rows);right=int((i%cols+1)*W/cols);bottom=int((i//cols+1)*H/rows)
  alpha=a[y:bottom,x:right,3];h,w=alpha.shape
  mask=alpha>160;rowcounts=mask.sum(axis=1);ys=np.where(rowcounts>max(3,w*.025))[0];top=int(ys[0]);sole=int(ys[-1])+1
  # Head centre excludes hand/staff swing; translation registers the body root,
  # and does not move any individual limb or resample the artwork.
  head=mask[top+max(1,int((sole-top)*.045)):top+max(2,int((sole-top)*.15))]
  centers=[]
  for line in head:
   xs=np.where(line)[0]
   if len(xs)>3:centers.append(float((np.quantile(xs,.1)+np.quantile(xs,.9))/2))
  bodyX=float(np.median(centers)) if centers else w*.5
  if key not in ['idle','walk']:bodyX=w*.5
  frames.append({'x':x,'y':y,'width':w,'height':h,'sole':sole,'bodyX':round(bodyX,3),'top':top})
 # Uniform scale inside each animation: crouches and seated poses never inflate.
 if key=='action':reference=frames[:8]
 elif key=='settle':reference=[frames[0],frames[-1]]
 elif key=='cat-performance':reference=frames[:4]
 else:reference=frames
 fraction=float(np.median([(f['sole']-f['top'])/f['height'] for f in reference]))
 scale=.88/fraction if key in ['idle','walk','action','settle'] else 1.
 for f in frames:f['scale']=round(scale,6)
 if key=='walk':
  for row in range(rows):
   group=frames[row*cols:(row+1)*cols];row_fraction=float(np.median([(f['sole']-f['top'])/f['height'] for f in group]))
   for f in group:f['scale']=round(.88/row_fraction,6)
 result[key]={'width':W,'height':H,'columns':cols,'rows':rows,'standingFraction':fraction,'frames':frames}
 provenance.append({'name':key,'generated':src.name,'sourceSha256':hashlib.sha256(saved.read_bytes()).hexdigest(),'runtimeSha256':hashlib.sha256(dest.read_bytes()).hexdigest(),'bytes':dest.stat().st_size,'quality':95,'alphaExact':True,'opaqueRgbRmse':round(rmse,4),'visibleRGBAExact':False})
(DEST/'registration.json').write_text(json.dumps(result,indent=2)+'\n')
out=ROOT/'artifacts/three-v15';out.mkdir(parents=True,exist_ok=True)
(out/'model-assets.json').write_text(json.dumps(provenance,indent=2)+'\n')
print(json.dumps({'sheets':len(result),'runtimeBytes':sum(x['bytes'] for x in provenance),'registration':{k:round(v['standingFraction'],3) for k,v in result.items()}}))
