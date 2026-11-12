import {readFileSync} from 'node:fs';
import {gunzipSync} from 'node:zlib';
import {expect,it} from 'vitest';
import {punchHemPixels} from './hemPunch';
import {supportForFile,supportTransform} from './travelerSupport';
const records=JSON.parse(readFileSync('src/ui/__fixtures__/traveler-support-contracts.json','utf8')) as Array<{file:string;support:{x:number;y:number;width:number;height:number}}>;
const pivot={x:.5,y:1151/1152};
for(const r of records)it(r.file+' real shoe contour and viewport/mirror/camera matrix',()=>{
 const b=gunzipSync(readFileSync('src/ui/__fixtures__/traveler-contact/'+r.file.replace('.png','.rgba.gz'))),d=new Uint8ClampedArray(864*1152*4);d.set(b,900*864*4);punchHemPixels(d,864,1152,r.file);
 let last=0;for(let y=1000;y<1110;y++){let n=0;for(let x=0;x<864;x++)if(d[(y*864+x)*4+3]>=228)n++;if(n>=5)last=y;}expect(last+1).toBe(r.support.y);
 let touching=0;for(let y=last-2;y<=last;y++)for(let x=Math.floor(r.support.x)-2;x<=Math.ceil(r.support.x)+2;x++)if(d[(y*864+x)*4+3]>=228)touching++;expect(touching).toBeGreaterThan(0);
 const s=supportForFile(r.file)!;expect(s).toMatchObject(r.support);
 for(const mirror of [false,true])for(const [vw,vh]of[[1920,1072],[390,844],[844,390]])for(const cam of[-.3,0,.25]){
 const m=supportTransform(s,mirror,pivot).match(/translate\(([-\d.]+)%, ([-\d.]+)%\)/)!;const dx=Number(m[1])/100,dy=Number(m[2])/100,h=vh*.136*1.46*.981,w=h*.75,foot={x:(.42-cam)*vw,y:(.62+cam)*vh};
 expect(dx,'never anchor whole body to alternating shoe X').toBe(0);expect(foot.x+((mirror?1-s.x/864:s.x/864)+dx-pivot.x)*w).toBeCloseTo(foot.x+((mirror?1-s.x/864:s.x/864)-pivot.x)*w,7);expect(foot.y+(s.y/1152+dy-pivot.y)*h).toBeCloseTo(foot.y,7);
 }
});
it('unknown reach is not guessed',()=>{expect(supportForFile('reach-front-01.png')).toBeNull();});
