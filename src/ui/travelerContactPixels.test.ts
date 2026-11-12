import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { punchHemPixels } from './hemPunch';

const root='src/ui/__fixtures__/traveler-contact/';
const records=JSON.parse(readFileSync(root+'manifest.json','utf8')) as Array<{logical:string;source:string;source_sha256:string;fixture_sha256:string;crop_y:number;crop_width:number;crop_height:number}>;
const sha=(b:Uint8Array|Uint8ClampedArray)=>createHash('sha256').update(new Uint8Array(b.buffer,b.byteOffset,b.byteLength)).digest('hex');
const processFrame:(d:Uint8ClampedArray,w:number,h:number,file?:string)=>void=punchHemPixels;
function realFrame(logical:string) {
 const m=records.find(m=>m.logical===logical)!;const packed=readFileSync(root+logical.replace('.png','.rgba.gz'));
 expect(sha(readFileSync('src/assets/traveler/'+m.source))).toBe(m.source_sha256);expect(sha(packed)).toBe(m.fixture_sha256);
 const crop=gunzipSync(packed);expect(crop.length).toBe(m.crop_width*m.crop_height*4);
 const data=new Uint8ClampedArray(864*1152*4);data.set(crop,m.crop_y*864*4);return data;
}

describe('actual idle/walk shoe-exterior matte repair',()=>{
 for(const m of records) it(`${m.logical}: removes far matte but preserves real shoe/RGB and default legacy`,()=>{
  const raw=realFrame(m.logical),legacy=raw.slice(),candidate=raw.slice();
  processFrame(legacy,864,1152);processFrame(candidate,864,1152,m.logical);
  const protectedPixels=new Uint8Array(864*1152);
  for(let y=900;y<1110;y++)for(let x=0;x<864;x++)if(raw[(y*864+x)*4+3]>=228){
   for(let yy=Math.max(900,y-2);yy<=Math.min(1151,y+2);yy++)for(let xx=Math.max(0,x-2);xx<=Math.min(863,x+2);xx++)protectedPixels[yy*864+xx]=1;
  }
  let before=0,after=0,shoe=0,rgbChanges=0,shoeChanges=0,alphaIncreases=0;
  for(let y=900;y<1152;y++)for(let x=0;x<864;x++){
   const i=(y*864+x)*4;
   if(protectedPixels[y*864+x]){shoe++;for(let k=0;k<4;k++)if(candidate[i+k]!==legacy[i+k])shoeChanges++;}
   for(let k=0;k<3;k++)if(candidate[i+k]!==legacy[i+k])rgbChanges++;
   if(candidate[i+3]>legacy[i+3])alphaIncreases++;
   const matte=Math.abs(raw[i]-28)<=4&&Math.abs(raw[i+1]-22)<=4&&Math.abs(raw[i+2]-16)<=4;
   if(y>=1120&&matte&&raw[i+3]>=128){before++;if(candidate[i+3]>=24)after++;}
  }
  expect(before).toBeGreaterThan(100);expect(shoe).toBeGreaterThan(1000);
  expect(after,'known shoe-exterior footer must not remain a tall rectangular pedestal').toBe(0);
  expect(shoeChanges,'opaque shoes/true toe/heel plus 2px AA margin must remain byte-identical to legacy').toBe(0);
  expect(rgbChanges).toBe(0);expect(alphaIncreases).toBe(0);
  const second=raw.slice();processFrame(second,864,1152);expect(sha(second)).toBe(sha(legacy));
 });
 it('unknown or unsupported pose never receives an inferred mask',()=>{
  const raw=realFrame('idle-front-01.png'),legacy=raw.slice(),unknown=raw.slice();processFrame(legacy,864,1152);processFrame(unknown,864,1152,'reach-front-01.png');expect(sha(unknown)).toBe(sha(legacy));
 });
});
