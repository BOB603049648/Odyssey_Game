import {act,cleanup,render} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
let leapsReady=true,clock=0,seq=0,raf=new Map<number,FrameRequestCallback>();
const paints:{frame:string;src:string}[]=[];
const jobs=new Map<string,{resolve:(src:string)=>void,promise:Promise<string>}>();
vi.mock('./useAssetSrc',async()=>{const u=await import('../content/assetUrls');const react=await import('react');return {useAssetSrc:(id:string|null)=>{
 const resolve=()=>id&&(!id.startsWith('leap-')||leapsReady)?(u.travelerFrameUrl(id)||u.trajAssetUrl(id)||u.slotAssetUrl(id)||null):null;
 const [src,setSrc]=react.useState(resolve);react.useEffect(()=>setSrc(resolve()),[id,leapsReady]);return {src,onError:()=>{}};
}};});
vi.mock('./trajArt',async()=>{const u=await import('../content/assetUrls');return {trajUrl:(id:string)=>id&&(!id.startsWith('leap-')||leapsReady)?u.trajAssetUrl(id):null,loadTraj:async(id:string)=>u.trajAssetUrl(id),forgetTraj:vi.fn()};});
vi.mock('./Companion',async()=>{const a=await vi.importActual<typeof import('./Companion')>('./Companion');return {...a,CompanionView:(props:Parameters<typeof a.CompanionView>[0])=>{paints.push({frame:props.frame!,src:props.presentation.src!});return <a.CompanionView {...props}/>;}};});
vi.mock('./catImage',()=>({loadCatSrc:(src:string)=>{let job=jobs.get(src);if(!job){let resolve!:(s:string)=>void;const promise=new Promise<string>(r=>{resolve=r;});job={promise,resolve};jobs.set(src,job);}return job.promise;}}));
vi.mock('./firstScreenReady',()=>({useFirstScreenReady:()=>({status:'ready',done:1,total:1,retry:()=>{}})}));
vi.mock('./soleClip',()=>({clippedBootUrl:()=>null,catContactUrl:()=>null}));
vi.mock('./hemPunch',async()=>({...await vi.importActual('./hemPunch'),punchHemUrl:async(src:string)=>src}));
vi.mock('./travelerArt',async()=>{const u=await import('../content/assetUrls');return {frameUrl:(f:string)=>u.travelerFrameUrl(f),loadFrame:async(f:string)=>u.travelerFrameUrl(f),forgetFrame:vi.fn()};});
async function frame(){clock+=1000/60;await act(async()=>{const q=[...raf.values()];raf.clear();q.forEach(fn=>fn(clock));});}
let WalkLayer:typeof import('./WalkLayer')['WalkLayer'];
let post:typeof import('../core/companionPost')['companionPost'];
let urls:typeof import('../content/assetUrls');
beforeEach(async()=>{vi.resetModules();vi.stubEnv('MODE','production');vi.stubEnv('VITE_VISUAL_SAMPLE','1');history.replaceState({},'','/?shoreVisual=candidate');clock=0;seq=0;raf=new Map();jobs.clear();paints.length=0;leapsReady=true;vi.spyOn(performance,'now').mockImplementation(()=>clock);vi.spyOn(window,'requestAnimationFrame').mockImplementation(fn=>{raf.set(++seq,fn);return seq;});vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>raf.delete(id));vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));WalkLayer=(await import('./WalkLayer')).WalkLayer;post=(await import('../core/companionPost')).companionPost;urls=await import('../content/assetUrls');});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();});
function layer(scene:'dba.scene.shore'|'dba.scene.camp'|'dba.scene.yard',after=false,paused=false){
 const beats=after?(scene==='dba.scene.shore'?{'dba.beat.water':true}:{'dba.beat.food':true}):{};
 return <WalkLayer scene={scene} drank={false} spots={[]} hint={{level:0,anchor:'driftwood',wordId:null,pose:'idle'}} catPost={post(scene,beats,{}, {skipWelcome:true})} paused={paused} purr={false} knot="rest" remembered={null} onRemember={()=>{}} onExit={()=>{}} onInteract={()=>{}} onAsk={()=>{}} onEscape={()=>{}}/>;
}
describe('actual production guide RAF and persistent cat source',()=>{
 it.each(['dba.scene.shore','dba.scene.camp','dba.scene.yard'] as const)('%s never slides landing pixels during its real guide route',async scene=>{
  const v=render(layer(scene));v.rerender(layer(scene,true));let moved=0,finished=false;for(let n=0;n<180;n++){await frame();const anchor=v.getByTestId('companion-anchor');if(anchor.dataset.guide==='move'){moved++;expect(anchor.dataset.traj).not.toBe('land');expect(v.container.querySelector('.nanaicha-ground')?.getAttribute('src')).toMatch(/leap-0[12]/);}if(moved&&anchor.dataset.guide==='hold'){finished=true;break;}}
  expect(moved).toBeGreaterThan(0);expect(finished).toBe(true);
 });
 it('keeps gaze/position while leap sources are unavailable and resumes after decoded readiness, with pause not advancing',async()=>{
  leapsReady=false;const v=render(layer('dba.scene.yard'));v.rerender(layer('dba.scene.yard',true));const anchor=v.getByTestId('companion-anchor');const left=anchor.style.left,top=anchor.style.top;
  for(let n=0;n<80;n++)await frame();expect(anchor.dataset.guide).toBe('gaze');expect([anchor.style.left,anchor.style.top]).toEqual([left,top]);
  leapsReady=true;v.rerender(layer('dba.scene.yard',true));for(let n=0;n<8;n++)await frame();expect(anchor.dataset.guide).toBe('move');const moving=[anchor.style.left,anchor.style.top,anchor.dataset.traj];
  v.rerender(layer('dba.scene.yard',true,true));for(let n=0;n<30;n++)await frame();expect([anchor.style.left,anchor.style.top,anchor.dataset.traj]).toEqual(moving);
  v.rerender(layer('dba.scene.yard',true));for(let n=0;n<100;n++)await frame();expect(anchor.dataset.guide).toBe('hold');
 });
 it('Y0→leap uses equal visible-height extent and its actual leap foot, not the wide default or Y0 special pivot',async()=>{
  const v=render(layer('dba.scene.yard'));const anchor=v.getByTestId('companion-anchor');const before=parseFloat(anchor.style.height)*435*.75/1280;
  v.rerender(layer('dba.scene.yard',true));for(let n=0;n<40;n++)await frame();expect(anchor.dataset.guide).toBe('move');
  const after=parseFloat(anchor.style.height)*829/1152;expect(after).toBeCloseTo(before,8);
  expect(parseFloat(anchor.style.getPropertyValue('--foot-x'))/100).toBe(.5);expect(parseFloat(anchor.style.getPropertyValue('--foot-y'))/100).toBeCloseTo(1144/1152,10);
  const leap01=urls.trajAssetUrl('leap-01')!;for(let n=0;n<25;n++)await frame();const shown=v.container.querySelector('.nanaicha-ground')!;const current=shown.getAttribute('src');
  await act(async()=>{jobs.get(leap01)?.resolve('blob:late-leap01');});expect(shown.getAttribute('src')).toBe(current);
 });
 it('a warm decoded leap never commits the previous landing/frame during useAssetSrc render-to-effect lag',async()=>{
  const v=render(layer('dba.scene.yard'));v.rerender(layer('dba.scene.yard',true));for(let n=0;n<105;n++)await frame();
  const leapPaints=paints.filter(p=>p.frame.startsWith('leap-'));expect(leapPaints.length).toBeGreaterThan(0);
  for(const p of leapPaints)expect(p.src).toBe(urls.trajAssetUrl(p.frame));
 });
 it('moving-land CSS cannot add a looping hop to a stale landing bitmap',()=>{
  const css=document.createElement('style');css.textContent=readFileSync('src/styles.css','utf8');document.head.append(css);
  const root=document.createElement('div');root.className='companion-anchor';root.dataset.traveling='yes';root.dataset.traj='land';root.innerHTML='<span class="nanaicha-figure"></span>';document.body.append(root);
  expect(getComputedStyle(root.firstElementChild!).animation).not.toContain('nanaicha-hop');root.remove();css.remove();
 });
});
