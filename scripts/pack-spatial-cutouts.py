"""Package model-authored art without retouching pixels.
Keep full generated PNGs; losslessly crop empty padding for GPU/transfer size.
Pillow/numpy only inspect and verify; ffmpeg performs WebP packaging.
"""
from pathlib import Path
import hashlib,json,shutil,subprocess
from PIL import Image
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'src/assets/art/spatial/refined';OUT.mkdir(exist_ok=True)
SOURCES=ROOT/'docs/assets/spatial-v14';SOURCES.mkdir(parents=True,exist_ok=True)
INPUTS={
 'shore-atlas':'exec-94a5d7f8-4dae-4eff-9bf7-c440bc5baeee.png',
 'hall-atlas':'exec-09097e6e-65f2-48b2-8482-fdc069eff890.png',
 'gate':'exec-cbe2f5a1-ffd1-4a34-8480-77e540d25cc9.png',
 'mural':'exec-c9065ef4-87d0-4727-b57a-396d786d21cc.png',
 'spring':'exec-6daf94ae-2f64-4222-b926-db142c266fbd.png',
 'spring-empty':'exec-9e04ad11-6d86-4e76-b7fb-af06ffc266b9.png',
 'waystone':'exec-1385892b-d89b-4f51-a581-6d84179b29f6.png',
}
regions={};report=[]
for name,artifact in INPUTS.items():
 source=ROOT.parent/'generated_images'/artifact; copy=SOURCES/(name+'.png');shutil.copyfile(source,copy)
 pixels=np.asarray(Image.open(source).convert('RGBA'));h,w=pixels.shape[:2]
 if name.endswith('atlas'):x0,y0,x1,y1=0,0,w,h
 else:
  y,x=np.nonzero(pixels[:,:,3]>102);x0=max(0,int(x.min())-8);x1=min(w,int(x.max())+9);y0=max(0,int(y.min())-8);y1=min(h,int(y.max())+9)
 target=OUT/(name+'.webp')
 subprocess.run(['ffmpeg','-v','error','-i',str(source),'-vf',f'crop={x1-x0}:{y1-y0}:{x0}:{y0}','-c:v','libwebp','-lossless','1','-compression_level','6','-pix_fmt','bgra','-y',str(target)],check=True)
 expected=pixels[y0:y1,x0:x1];actual=np.asarray(Image.open(target).convert('RGBA'))
 assert actual.shape==expected.shape
 assert np.array_equal(actual[:,:,3],expected[:,:,3])
 visible=expected[:,:,3]>0;assert np.array_equal(actual[visible],expected[visible])
 regions[name]={'x':x0,'y':y0,'width':x1-x0,'height':y1-y0,'atlasWidth':w,'atlasHeight':h}
 report.append({'name':name,'artifact':artifact,'sourceSha256':hashlib.sha256(source.read_bytes()).hexdigest(),'webpSha256':hashlib.sha256(target.read_bytes()).hexdigest(),'bytes':target.stat().st_size,'visibleRGBAExact':True,**regions[name]})
(OUT/'regions.json').write_text(json.dumps(regions,indent=2)+'\n')
qa=ROOT/'artifacts/three-v14';qa.mkdir(parents=True,exist_ok=True);(qa/'model-assets.json').write_text(json.dumps(report,indent=2)+'\n')
print(json.dumps({'assets':len(report),'runtimeBytes':sum(item['bytes'] for item in report),'rgbaVerification':'PASS'}))
