import {execFileSync} from 'node:child_process';
import {expect,it} from 'vitest';
import {supportForFile,supportTransform} from './travelerSupport';
const files=['walk-back-03.png','walk-back-04.png','idle-front-01.png','walk-front-01.png','idle-side-01.png','walk-side-01.png'];
const code=`from PIL import Image
from pathlib import Path
import json,sys
r={}
for f in json.loads(sys.argv[1]):
 p=Path('src/assets/traveler')/f;w=p.with_suffix('.webp');p=w if w.exists() else p;im=Image.open(p).convert('RGBA');r[f]={}
 for label,a,b in [('head',100,400),('torso',300,700)]:
  width=im.width;raw=im.crop((0,a,width,b)).tobytes();xs=[(i//4)%width for i in range(3,len(raw),4) if raw[i]>=228];r[f][label]=sum(xs)/len(xs)
print(json.dumps(r))`;
const means=JSON.parse(execFileSync('python3',['-c',code,JSON.stringify(files)],{encoding:'utf8'})) as Record<string,Record<string,number>>;
const pairs=[['walk-back-03.png','walk-back-04.png'],['idle-front-01.png','walk-front-01.png'],['idle-side-01.png','walk-side-01.png']];
for(const [a,b]of pairs)for(const region of['head','torso'])it(`${a}→${b} ${region}: actual RGBA centroid adds zero horizontal displacement`,()=>{
 const w=1072*.136*1.46*.981*.75;
 for(const mirror of[false,true]){
  const dx=(file:string)=>Number(supportTransform(supportForFile(file)!,mirror,{x:.5,y:1151/1152}).match(/translate\(([-\d.]+)%/)![1])/100;
  const intrinsic=(means[b][region]-means[a][region])/864*w*(mirror?-1:1),after=intrinsic+(dx(b)-dx(a))*w;
  expect(after).toBeCloseTo(intrinsic,7);expect((dx(b)-dx(a))*w).toBeCloseTo(0,7);
 }
});
