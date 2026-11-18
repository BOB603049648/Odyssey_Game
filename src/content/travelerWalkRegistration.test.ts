import {execFileSync} from 'node:child_process';
import {describe,expect,it} from 'vitest';
import {WALK_ATLAS_FILES,walkAtlasFrame} from './travelerWalkAtlas';
import {supportTransform,travelerFramePivot} from '../ui/travelerSupport';

const heads=JSON.parse(execFileSync('python',['-c',`
import json,numpy as np
from PIL import Image
from pathlib import Path
a=np.array(Image.open('src/assets/art/actors/walk.webp').convert('RGBA'))
frames=json.loads(Path('src/assets/art/actors/registration.json').read_text())['walk']['frames']
heads=[]
for f in frames:
 cell=a[f['y']:f['y']+f['height'],f['x']:f['x']+f['width']]
 band=cell[f['top']+int((f['sole']-f['top'])*.055):f['top']+int((f['sole']-f['top'])*.14),:,3]>200
 y,x=np.nonzero(band);heads.append(float(np.median(x)))
print(json.dumps(heads))
`],{encoding:'utf8'})) as number[];
describe('painted walk registration from delivered pixels',()=>{
  it('keeps the head/body root stable through all directions and mirrors',()=>{
    for(const mirror of [false,true])for(const [i,file] of WALK_ATLAS_FILES.entries()){
      const cell=walkAtlasFrame(file)!,sx=cell.scale*cell.width/cell.height/.75;
      expect(Math.abs(cell.bodyX-heads[i])/cell.width).toBeLessThan(.025);
      const support={file,x:cell.width/2,y:cell.sole,width:cell.width,height:cell.height,bodyX:cell.bodyX,scaleX:sx,scaleY:cell.scale};
      const pivot=travelerFramePivot(support,mirror);
      const translate=Number(supportTransform(support,mirror,{x:.5,y:1151/1152}).match(/translate\(([-\d.]+)%/)![1])/100;
      expect(.5+(pivot.x-.5)*sx+translate).toBeCloseTo(.5,8);
    }
  });
  it('does not treat an alternating support shoe as the whole body root',()=>{
    const s={file:'old.png',x:14,y:480,width:384,height:512};
    expect(travelerFramePivot(s,false).x).toBe(.5);
    expect(travelerFramePivot({...s,x:370},true).x).toBe(.5);
  });
});
