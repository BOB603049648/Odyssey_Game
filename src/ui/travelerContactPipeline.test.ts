import { readFileSync } from 'node:fs';
import { gunzipSync } from 'node:zlib';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
vi.mock('./travelerContactIdentity',()=>({approvedTravelerContactSource:(file:string,src:string)=>Boolean(file)&&src.startsWith('https://unit-assets.invalid/')}));
import { punchHemUrl, travelerContactFile } from './hemPunch';
import { clippedBootUrl } from './soleClip';

const processUrl:(src:string,file?:string)=>Promise<string>=punchHemUrl;
let serial=0,caseId=0;
let failImage=false,failBlob='',failCanvas=false;
let bitmaps:Map<string,Uint8ClampedArray>;
let canvases:WeakMap<HTMLCanvasElement,Uint8ClampedArray>;
const frames=JSON.parse(readFileSync('src/ui/__fixtures__/traveler-contact/manifest.json','utf8')) as Array<{logical:string}>;
function source(file='idle-front-01.png'){const crop=gunzipSync(readFileSync('src/ui/__fixtures__/traveler-contact/'+file.replace('.png','.rgba.gz')));const data=new Uint8ClampedArray(864*1152*4);data.set(crop,900*864*4);return data;}
beforeEach(()=>{
 caseId++;failImage=false;failBlob='';failCanvas=false;bitmaps=new Map();canvases=new WeakMap();const blobs=new WeakMap<Blob,Uint8ClampedArray>();const NativeURL=URL;
 vi.stubGlobal('URL',class extends NativeURL{static createObjectURL(blob:Blob){const key=`blob:unit-${caseId}-${serial++}`;bitmaps.set(key,blobs.get(blob)!.slice());return key;}});
 vi.stubGlobal('Image',class{naturalWidth=864;naturalHeight=1152;onload:(()=>void)|null=null;onerror:(()=>void)|null=null;private value='';get src(){return this.value;}get currentSrc(){return this.value;}set src(s:string){this.value=s;queueMicrotask(()=>failImage?this.onerror?.():this.onload?.());}});
 vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockImplementation(function(this:HTMLCanvasElement){const canvas=this;return{
  drawImage(img:HTMLImageElement){canvases.set(canvas,bitmaps.get(img.currentSrc||img.src)!.slice());},
  getImageData(){if(failCanvas)throw new Error('canvas unavailable');return{data:canvases.get(canvas)!,width:864,height:1152};},
  putImageData(image:{data:Uint8ClampedArray}){canvases.set(canvas,image.data.slice());},
 } as unknown as CanvasRenderingContext2D;});
 vi.spyOn(HTMLCanvasElement.prototype,'toBlob').mockImplementation(function(this:HTMLCanvasElement,done:BlobCallback){if(failBlob==='throw')throw new Error('toBlob unavailable');if(failBlob==='null'){done(null);return;}const b=new Blob();blobs.set(b,canvases.get(this)!.slice());done(b);});
 vi.spyOn(HTMLCanvasElement.prototype,'toDataURL').mockImplementation(function(this:HTMLCanvasElement){const key=`data:unit-${caseId}-${serial++}`;bitmaps.set(key,canvases.get(this)!.slice());return key;});
});
afterEach(()=>{vi.restoreAllMocks();vi.unstubAllGlobals();});

describe('production punch→actual-bitmap sole transport with real source pixels',()=>{
 it('does not alias cleaned and legacy cached promises, and retains both cache identities',async()=>{
  const src=`https://unit-assets.invalid/${caseId}/idle.webp`;bitmaps.set(src,source());
  const legacy=await processUrl(src),clean=await processUrl(src,'idle-front-01.png');
  expect(clean).not.toBe(legacy);expect(await processUrl(src,'idle-front-01.png')).toBe(clean);expect(await processUrl(src)).toBe(legacy);
  let oldFooter=0,newFooter=0;const old=bitmaps.get(legacy)!,next=bitmaps.get(clean)!;
  for(let i=1120*864*4+3;i<old.length;i+=4){oldFooter+=old[i];newFooter+=next[i];}
  expect(oldFooter).toBeGreaterThan(1000);expect(newFooter).toBeLessThan(oldFooter/100);
 });
 it.each(frames)('$logical: actual processed bitmap sole copies contact only, never true shoe leather',async({logical})=>{
  const raw=source(logical),src=`https://unit-assets.invalid/${caseId}/idle.webp`;bitmaps.set(src,raw);
  const clean=await processUrl(src,logical);const img=new Image();img.src=clean;
  const copy=clippedBootUrl(img);expect(copy).not.toBeNull();const pixels=bitmaps.get(copy!)!;
  let paintedLeather=0,contact=0;
  for(let y=900;y<1152;y++)for(let x=0;x<864;x++){const i=(y*864+x)*4;if(y<1110&&raw[i+3]>=228&&pixels[i+3]>0)paintedLeather++;if(pixels[i+3]>0)contact++;}
  expect(paintedLeather,'sole must not overpaint opaque boot/heel/toe').toBe(0);expect(contact).toBeGreaterThan(10);
 });
 it.each(['image','blob-null','blob-throw','canvas-throw'])('%s failure is not a successful cache entry and recovers after cooldown',async failure=>{
  vi.useFakeTimers();try {
   const src=`https://unit-assets.invalid/${caseId}/recover-${failure}.webp`;bitmaps.set(src,source());
   if(failure==='image')failImage=true;if(failure==='blob-null')failBlob='null';if(failure==='blob-throw')failBlob='throw';if(failure==='canvas-throw')failCanvas=true;
   const first=processUrl(src,'idle-front-01.png');await vi.runAllTicks();await expect(first).rejects.toThrow();
   failImage=false;failBlob='';failCanvas=false;
   const second=processUrl(src,'idle-front-01.png');await expect(second).rejects.toThrow();
   await vi.advanceTimersByTimeAsync(5000);const next=processUrl(src,'idle-front-01.png');await vi.runAllTicks();const ready=await next;
   expect(ready).not.toBe(src);expect(await processUrl(src,'idle-front-01.png')).toBe(ready);
  }finally{vi.useRealTimers();}
 });
 it('raw fallback never acquires processed contact metadata before or after successful enhancement',async()=>{
  const file='idle-front-01.png',src=`https://unit-assets.invalid/${caseId}/metadata.webp`;bitmaps.set(src,source());
  const job=processUrl(src,file);expect(travelerContactFile(src)).toBeUndefined();
  const cleaned=await job;expect(cleaned).not.toBe(src);expect(travelerContactFile(cleaned)).toBe(file);expect(travelerContactFile(src)).toBeUndefined();
 });
 it('unsupported reach cleanup uses the same legacy cached result',async()=>{
  const src=`https://unit-assets.invalid/${caseId}/unsupported.webp`;bitmaps.set(src,source());
  const legacy=await processUrl(src);expect(await processUrl(src,'reach-front-01.png')).toBe(legacy);
 });
 it('only explicit contour contacts bypass the dye/morphology/vertical mask, never cat or legacy',()=>{
  const css=readFileSync('src/styles.css','utf8');const rule=css.match(/\.sole-soft\[data-contact="contour"\]\s*\{([^}]+)\}/);
  expect(rule?.[1]).toMatch(/filter:\s*none/);expect(rule?.[1]).toMatch(/mask-image:\s*none/);
  const walk=readFileSync('src/ui/WalkLayer.tsx','utf8');expect(walk).toContain("sole.dataset.contact = travelerContactFile(src) ? 'contour' : 'legacy'");
 });
});
