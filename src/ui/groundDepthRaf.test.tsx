import {act,cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('./useAssetSrc',async()=>{const u=await import('../content/assetUrls');return {useAssetSrc:(id:string|null)=>({src:id?(u.travelerFrameUrl(id)||u.trajAssetUrl(id)||u.slotAssetUrl(id)||null):null,onError:()=>{}})};});
vi.mock('./firstScreenReady',()=>({useFirstScreenReady:()=>({status:'ready',done:1,total:1,retry:()=>{}})}));
vi.mock('./soleClip',()=>({clippedBootUrl:vi.fn(()=> 'data:image/png;base64,aHVtYW4='),catContactUrl:vi.fn(()=> 'data:image/png;base64,Y2F0')}));
vi.mock('./hemPunch',async()=>({...await vi.importActual('./hemPunch'),punchHemUrl:async(src:string)=>src}));
vi.mock('./travelerArt',async()=>{const u=await import('../content/assetUrls');return {frameUrl:(file:string)=>u.travelerFrameUrl(file),loadFrame:async(file:string)=>u.travelerFrameUrl(file),forgetFrame:vi.fn()};});
let raf=new Map<number,FrameRequestCallback>(),seq=0,dx=0,dy=0,vx=20,vy=40;
function step(time=1000){act(()=>{const f=[...raf.values()];raf.clear();f.forEach(cb=>cb(time));});}
async function mount(paused=true,onExit=()=>{},x=.46){
 const {WalkLayer}=await import('./WalkLayer');const {visibleSpots}=await import('./spotViews');const {newGameState}=await import('../core/save');const {companionPost}=await import('../core/companionPost');const hint={level:0 as const,anchor:'driftwood' as const,wordId:null,pose:'idle' as const};
 const v=render(<WalkLayer scene="dba.scene.shore" drank={false} spots={visibleSpots('dba.scene.shore',newGameState(),hint)} hint={hint} paused={paused} purr={false} knot="rest" remembered={{x,y:.69}} catPost={{...companionPost('dba.scene.shore',{}),y:.80}} taught presentationFrozen onRemember={()=>{}} onExit={onExit} onInteract={()=>{}} onAsk={()=>{}} onEscape={()=>{}}/>);await act(async()=>{await Promise.resolve();});return v;
}
beforeEach(()=>{
 vi.resetModules();vi.stubEnv('MODE','production');vi.stubEnv('VITE_VISUAL_SAMPLE','1');vi.stubEnv('VITE_SHORE_DEPLOY_ORIGIN','');history.replaceState({},'','/?shoreVisual=candidate');raf=new Map();seq=0;dx=dy=0;vx=20;vy=40;
 vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{raf.set(++seq,cb);return seq;});vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>raf.delete(id));vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
  if(this.classList.contains('traveler-figure'))return new DOMRect(300+dx,400+dy,80,110);
  if(this.classList.contains('nanaicha-ground'))return new DOMRect(600+dx,300+dy,120,160);
  if(this.classList.contains('world-layer'))return new DOMRect(-200+dx,-100+dy,1870,1050);
  if(this.classList.contains('walk-viewport'))return new DOMRect(vx,vy,1280,720);return new DOMRect(0,0,0,0);
 });
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();history.replaceState({},'','/');});
describe('real production contact RAF under common depth',()=>{
 it('keeps human/cat world geometry invariant through camera and viewport-origin shifts; mirror unchanged',async()=>{
  const read=vi.spyOn(Storage.prototype,'getItem'),write=vi.spyOn(Storage.prototype,'setItem');await mount();const img=document.querySelector<HTMLImageElement>('.traveler-figure')!;expect(img).not.toBeNull();img.parentElement!.dataset.mirror='yes';step();
  const sole=screen.getByTestId('sole-soft'),cat=screen.getByTestId('cat-sole');
  const box=(n:HTMLElement)=>[n.style.left,n.style.top,n.style.width,n.style.height,n.style.getPropertyValue('--fit')];
  expect(box(sole)).toEqual(['500px','500px','80px','124px',(110/124).toFixed(4)]);expect(box(cat)).toEqual(['800px','400px','120px','176px',(160/176).toFixed(4)]);expect(sole.style.transform).toBe('scaleX(-1)');const a=box(sole),b=box(cat);
  dx=-150;dy=-40;step(2000);vx=-100;vy=-200;step(3000);expect(box(sole)).toEqual(a);expect(box(cat)).toEqual(b);expect(read).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();
 });
 it('does not remount actor/prop/source or refetch the cat when crossing authored propY',async()=>{
  await mount(false);const body=screen.getByTestId('traveler'),prop=screen.getByTestId('prop-art.shore.prop.break-shard'),cat=document.querySelector('.nanaicha-ground');const unit=body.closest<HTMLElement>('[data-depth-id]');expect(unit).not.toBeNull();const rank=unit!.style.zIndex;const requests=vi.mocked(fetch).mock.calls.length;
  fireEvent.keyDown(window,{key:'s',code:'KeyS'});for(let i=0;i<90;i++)step(1000+i*16);fireEvent.keyUp(window,{key:'s',code:'KeyS'});
  expect(screen.getByTestId('traveler')).toBe(body);expect(screen.getByTestId('prop-art.shore.prop.break-shard')).toBe(prop);expect(document.querySelector('.nanaicha-ground')).toBe(cat);expect(body.closest('[data-depth-id]')).toBe(unit);expect(unit!.style.zIndex).not.toBe(rank);expect(vi.mocked(fetch).mock.calls.length).toBe(requests);
 });
 it('uses world-space contacts even with the old baseline query',async()=>{
  history.replaceState({},'','/?shoreVisual=baseline');await mount();step();expect(screen.getByTestId('sole-soft').style.left).toBe('500px');expect(screen.getByTestId('sole-soft').style.top).toBe('500px');expect(screen.getByTestId('sole-soft').closest('[data-depth-id]')).toBe(screen.getByTestId('traveler').closest('[data-depth-id]'));
 });
 it('real exit click seeks the unchanged gate and production movement emits onExit',async()=>{
  const exit=vi.fn();await mount(false,exit,.94);fireEvent.click(screen.getByTestId('exit-camp'));for(let i=0;i<100;i++)step(1000+i*16);expect(exit).toHaveBeenCalledWith('dba.scene.camp');
 });
 it('a newly unmatched contact source hides only the stale contact, then recovers without body removal',async()=>{
  await mount();step();const img=document.querySelector<HTMLImageElement>('.traveler-figure')!;const sole=screen.getByTestId('sole-soft');const {clippedBootUrl}=await import('./soleClip');Object.defineProperty(img,'currentSrc',{configurable:true,value:'blob:http://localhost/new-current'});vi.mocked(clippedBootUrl).mockReturnValueOnce(null as unknown as string);step(2000);expect(sole.style.visibility).toBe('hidden');expect(img.isConnected).toBe(true);step(3000);expect(sole.style.visibility).toBe('visible');expect(sole.dataset.base).toBe('blob:http://localhost/new-current');
 });

});
