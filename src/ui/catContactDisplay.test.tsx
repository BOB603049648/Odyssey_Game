import { act,cleanup,render,screen } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
vi.mock('./useAssetSrc',async()=>{const urls=await import('../content/assetUrls');return {useAssetSrc:(id:string|null)=>({src:id?(urls.trajAssetUrl(id)||urls.slotAssetUrl(id)||null):null,onError:()=>{}})};});
vi.mock('./firstScreenReady',()=>({useFirstScreenReady:()=>({status:'ready',done:1,total:1,retry:()=>{}})}));
vi.mock('./soleClip',()=>({clippedBootUrl:()=>null,catContactUrl:vi.fn(()=> 'data:image/png;base64,Y2F0')}));
let callbacks=new Map<number,FrameRequestCallback>(),seq=0;
const S1='land-shore-gourd',S2='land-shore-east-gap';
const hint={level:0 as const,anchor:'gourd' as const,wordId:null,pose:'idle' as const};
function step(){act(()=>{const rows=[...callbacks.values()];callbacks.clear();rows.forEach(cb=>cb(1000));});}
async function mount(){
 const {WalkLayer}=await import('./WalkLayer');const {visibleSpots}=await import('./spotViews');const {newGameState}=await import('../core/save');const {companionPost}=await import('../core/companionPost');
 return render(<WalkLayer scene="dba.scene.shore" drank={false} spots={visibleSpots('dba.scene.shore',newGameState(),hint)} hint={hint}
  paused purr={false} knot="rest" remembered={{x:.42,y:.62}} presentationFrozen catPost={companionPost('dba.scene.shore',{'dba.beat.water':true},{'dba.flag.driftwood':true})} taught
  onRemember={()=>{}} onExit={()=>{}} onInteract={()=>{}} onAsk={()=>{}} onEscape={()=>{}}/>);
}
function setActual(src:string){
 const img=document.querySelector<HTMLImageElement>('.nanaicha-ground')!;
 Object.defineProperty(img,'currentSrc',{configurable:true,value:new URL(src,document.baseURI).href});
 Object.defineProperty(img,'naturalWidth',{configurable:true,value:864});Object.defineProperty(img,'naturalHeight',{configurable:true,value:1152});
 return img;
}
beforeEach(()=>{
 vi.resetModules();vi.stubEnv('MODE','production');vi.stubEnv('VITE_VISUAL_SAMPLE','1');vi.stubEnv('VITE_SHORE_DEPLOY_ORIGIN','');
 history.replaceState({},'','/?shoreVisual=candidate&fixture=shore-spawn&freeze=1&diagnostic=1');callbacks=new Map();seq=0;
 vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{callbacks.set(++seq,cb);return seq;});vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>callbacks.delete(id));
 vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement){
  if(this.classList.contains('nanaicha-ground'))return new DOMRect(300,200,129.6,172.8);
  if(this.classList.contains('world-layer'))return new DOMRect(-180,-120,1870,1050);
  if(this.classList.contains('walk-viewport'))return new DOMRect(20,40,1280,720);
  return new DOMRect(0,0,0,0);
 });
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();history.replaceState({},'','/');});
describe('production RAF actual cat contact band and explicit fixture diagnostics',()=>{
 it.each(['raw','blob'])('desiredS2 with actual%sS1 uses legacy976 and synchronizes diagnostic source/geometry',async(kind)=>{
  await mount();const {trajAssetUrl}=await import('../content/assetUrls');let actual=trajAssetUrl(S1)!;
  if(kind==='blob'){
   const fetcher=vi.mocked(fetch);fetcher.mockResolvedValue({ok:true,blob:async()=>new Blob(['x'.repeat(64)])} as Response);
   Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(()=> 'blob:http://localhost/d0-contact-s1')});
   const {loadCatSrc}=await import('./catImage');actual=await loadCatSrc(actual);
  }
  const img=setActual(actual);const anchor=screen.getByTestId('companion-anchor');expect(anchor.dataset.sprite).toBe(S2);
  expect(callbacks.size).toBeGreaterThan(0);step();
  const {catContactUrl}=await import('./soleClip');expect(catContactUrl).toHaveBeenLastCalledWith(img,976/1152);
  const out=screen.getByTestId('cat-display-diagnostic');const d=JSON.parse(out.textContent!);
  expect(d.actualFrame).toBe(S1);expect(d.desiredFrame).toBe(S2);expect(d.legacySoleRow).toBe(976);expect(d.supportStatus).toBe('legacy-declared');
  expect(d.currentSrc).toBe(new URL(actual,document.baseURI).href);expect(d.natural).toEqual({width:864,height:1152});
  expect(d.rect).toEqual({left:300,top:200,width:129.6,height:172.8});expect(d.mirror).toBe('right');expect(d.guide).toBe('hold');expect(d.clip).toBe('land');
  expect(d.hop.eligible).toBe(false);expect(d.logicalFoot.normalized).toEqual({x:.85,y:.63});expect(d.logicalFoot.viewport.x).toBeCloseTo(-180+.85*1870-20,7);
  expect(img.dataset.displayedFrame).toBe(S1);expect(img.dataset.supportStatus).toBe('legacy-declared');
 });
 it('unknown actual fallback is not coerced into desiredS2; hides only unmatched contact, not cat',async()=>{
  await mount();const img=setActual('/unknown/land-shore-gourd.webp');step();
  const {catContactUrl}=await import('./soleClip');expect(catContactUrl).not.toHaveBeenCalled();
  expect(screen.getByTestId('cat-sole').style.visibility).toBe('hidden');expect(img.isConnected).toBe(true);
  const d=JSON.parse(screen.getByTestId('cat-display-diagnostic').textContent!);expect(d.supportStatus).toBe('unknown');expect(d.legacySoleRow).toBeNull();
 });
 it.each(['?shoreVisual=candidate&diagnostic=1','?shoreVisual=candidate&fixture=shore-spawn&diagnostic=1','?shoreVisual=baseline&fixture=shore-spawn&freeze=1&diagnostic=1'])('does not expose diagnostics outside approved explicit frozen candidate fixture: %s',async(query)=>{
  history.replaceState({},'','/'+query);await mount();step();expect(screen.queryByTestId('cat-display-diagnostic')).toBeNull();
  expect(document.querySelector('.nanaicha-ground')?.getAttribute('data-support-status')).toBeNull();
 });
});
