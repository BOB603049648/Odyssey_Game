import { act,cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
vi.mock('./useAssetSrc',async()=>{const u=await import('../content/assetUrls');return {useAssetSrc:(id:string|null)=>({src:id?(u.travelerFrameUrl(id)||u.trajAssetUrl(id)||u.slotAssetUrl(id)||null):null,onError:()=>{}})};});
vi.mock('./firstScreenReady',()=>({useFirstScreenReady:()=>({status:'ready',done:1,total:1,retry:()=>{}})}));
const hint={level:0 as const,anchor:'driftwood' as const,wordId:null,pose:'idle' as const};
async function setup(scene='dba.scene.shore',hy=.62,cy=.66){
 const {WalkLayer}=await import('./WalkLayer');const {visibleSpots}=await import('./spotViews');const {newGameState}=await import('../core/save');const {companionPost}=await import('../core/companionPost');
 const s=scene as import('../core/island').IslandScene;const callbacks={onRemember:vi.fn(),onExit:vi.fn(),onInteract:vi.fn(),onAsk:vi.fn(),onEscape:vi.fn()};
 const props={scene:s,drank:false,spots:visibleSpots(s,newGameState(),hint),hint,paused:true,purr:false,knot:'rest' as const,remembered:{x:.33,y:hy},catPost:{...companionPost(s,{}),y:cy},taught:true,presentationFrozen:true,...callbacks};
 return {WalkLayer,props,callbacks};
}
beforeEach(()=>{vi.stubEnv('VITE_VISUAL_SAMPLE','1');history.replaceState({},'','/?shoreVisual=candidate');vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();vi.useRealTimers();history.replaceState({},'','/');});
describe('one physical shore depth root',()=>{
 it('puts five real props and each complete actor+contact in sibling full-world units; gate remains scenic',async()=>{
  const {WalkLayer,props}=await setup();render(<WalkLayer {...props}/>);
  const root=document.querySelector('.ground-depth-root');expect(root).not.toBeNull();
  const units=[...root!.children] as HTMLElement[];expect(units).toHaveLength(7);expect(new Set(units.map(n=>n.parentElement))).toEqual(new Set([root]));
  for(const id of ['driftwood','gourd','break-shard','mural-wall','east-gap']){
   const prop=screen.getByTestId('prop-art.shore.prop.'+id);expect(prop.closest('[data-depth-id]')?.parentElement).toBe(root);
   expect(screen.getAllByTestId('prop-art.shore.prop.'+id)).toHaveLength(1);expect(prop.closest('[data-shore-visual="candidate"]')).not.toBeNull();
   expect(screen.getByTestId('cue-art.shore.prop.'+id).parentElement).toBe(prop);
  }
  for(const [body,sole] of [['traveler','sole-soft'],['companion-anchor','cat-sole']])expect(screen.getByTestId(body).closest('[data-depth-id]')).toBe(screen.getByTestId(sole).closest('[data-depth-id]'));
  expect(screen.getByTestId('sole-layer').querySelectorAll('img')).toHaveLength(0);expect(screen.getByTestId('slot-building').closest('.ground-depth-root')).toBeNull();
 });
 for(const [id,y] of [['mural-wall',.62],['gourd',.70],['east-gap',.73],['break-shard',.73],['driftwood',.75]] as const) for(const hy of [y-.02,y+.02]) for(const cy of [y-.02,y+.02]) {
  it(`real DOM rank ${id} H${hy} C${cy}`,async()=>{
   const {WalkLayer,props}=await setup('dba.scene.shore',hy,cy);render(<WalkLayer {...props}/>);
   const h=screen.getByTestId('traveler').closest<HTMLElement>('[data-depth-id]');const c=screen.getByTestId('companion-anchor').closest<HTMLElement>('[data-depth-id]');const p=screen.getByTestId('prop-art.shore.prop.'+id).closest<HTMLElement>('[data-depth-id]');expect(h).not.toBeNull();expect(c).not.toBeNull();expect(p).not.toBeNull();
   expect(Number(h!.style.zIndex)<Number(p!.style.zIndex)).toBe(hy<y);expect(Number(c!.style.zIndex)<Number(p!.style.zIndex)).toBe(cy<y);
   expect(screen.getByTestId('sole-soft').closest('[data-depth-id]')).toBe(h);expect(screen.getByTestId('cat-sole').closest('[data-depth-id]')).toBe(c);
  });
 }
 it.each(['baseline','camp'])('uses shared world depth for %s',async(mode)=>{
  if(mode==='baseline')history.replaceState({},'','/?shoreVisual=baseline');const {WalkLayer,props}=await setup(mode==='camp'?'dba.scene.camp':'dba.scene.shore');render(<WalkLayer {...props}/>);
  expect(document.querySelector('.ground-depth-root')).not.toBeNull();expect(screen.getByTestId('sole-soft').closest('[data-depth-id]')).toBe(screen.getByTestId('traveler').closest('[data-depth-id]'));
 });
 it('keeps E/click/ask/exit routes and original hotspot geometry',async()=>{
  const {WalkLayer,props,callbacks}=await setup('dba.scene.shore',.72,.66);render(<WalkLayer {...props} paused={false}/>);
  const target=screen.getByTestId('shore-driftwood');const rectStyle=target.getAttribute('style');fireEvent.keyDown(window,{key:'e',code:'KeyE'});expect(callbacks.onInteract).toHaveBeenCalledWith('shore-driftwood');callbacks.onInteract.mockClear();fireEvent.click(target);expect(callbacks.onInteract).toHaveBeenCalledWith('shore-driftwood');fireEvent.click(screen.getByTestId('companion'));expect(callbacks.onAsk).toHaveBeenCalledOnce();
  expect(target.getAttribute('style')).toBe(rectStyle);expect(screen.getByTestId('exit-camp').getAttribute('type')).toBe('button');fireEvent.click(screen.getByTestId('exit-camp'));expect(screen.getByTestId('exit-camp').isConnected).toBe(true);
 });
 it.each([['dba.scene.shore','dba.scene.camp'],['dba.scene.camp','dba.scene.shore']])('splits current/previous prop units for980ms %s→%s without duplicates or omissions',async(from,to)=>{
  vi.useFakeTimers();const {WalkLayer,props}=await setup(from);const {sceneAssembly}=await import('../content/catalog');const {visibleSpots}=await import('./spotViews');const {newGameState}=await import('../core/save');const {companionPost}=await import('../core/companionPost');
  const v=render(<WalkLayer {...props}/>);const dest=to as import('../core/island').IslandScene;
  v.rerender(<WalkLayer {...props} scene={dest} spots={visibleSpots(dest,newGameState(),hint)} catPost={companionPost(dest,{})}/>);
  for(const scene of [from,to])for(const slot of sceneAssembly(scene as import('../core/island').IslandScene)!.slots.filter(s=>s.slot==='props'&&s.depthMode!=='wall-art'&&s.x!==undefined&&s.y!==undefined)){
   const nodes=document.querySelectorAll(`[data-art-id="${slot.id}"]`);expect(nodes).toHaveLength(1);expect(nodes[0].closest('[data-depth-id]')).not.toBeNull();
  }
  expect(document.querySelector('.ground-depth-root [data-phase="leaving"]')).not.toBeNull();expect(document.querySelector('.ground-depth-root [data-phase="entering"]')).not.toBeNull();expect(screen.getAllByTestId('traveler')).toHaveLength(1);expect(screen.getAllByTestId('companion-anchor')).toHaveLength(1);
  act(()=>vi.advanceTimersByTime(979));expect(document.querySelector('.ground-depth-root [data-phase="leaving"]')).not.toBeNull();act(()=>vi.advanceTimersByTime(1));expect(document.querySelector('[data-phase="leaving"]')).toBeNull();
  for(const slot of sceneAssembly(from as import('../core/island').IslandScene)!.slots.filter(s=>s.slot==='props'))expect(document.querySelector(`[data-art-id="${slot.id}"]`)).toBeNull();
  expect(document.querySelector('.ground-depth-root')).not.toBeNull();
 });
 it('keeps the exact contact filter/masks and declares pointer/reduced-motion behavior',()=>{
  const css=readFileSync('src/styles.css','utf8');const block=css.slice(css.indexOf('.sole-layer {'),css.indexOf('.foot-ellipse {'));expect(createHash('sha256').update(block).digest('hex')).toBe('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
  expect(css).toMatch(/\.ground-depth-root\s*\{[^}]*pointer-events:\s*none/s);expect(css).toMatch(/\.depth-unit\s*\{[^}]*inset:\s*0/s);expect(css).toMatch(/\.depth-unit\s+\.companion\s*\{[^}]*pointer-events:\s*auto/s);expect(css).toMatch(/prefers-reduced-motion: reduce[\s\S]*depth-unit/);
 });
 for(const [prop,x,y] of [['gourd',.60,.70],['east-gap',.78,.73],['driftwood',.37,.75]] as const)for(const side of ['bb','bf','fb','ff']){
  it(`explicit memory-only fixed-camera fixture depth-${prop}-${side}`,async()=>{
   const name=`depth-${prop}-${side}`;history.replaceState({},'','/?shoreVisual=candidate&fixture='+name+'&freeze=1');
   const {getShoreVisualProfile,makeShoreFixture}=await import('../dev/shoreVisualProfile');expect(getShoreVisualProfile().fixture).toBe(name);
   const read=vi.spyOn(Storage.prototype,'getItem'),write=vi.spyOn(Storage.prototype,'setItem');
   const fixture=makeShoreFixture(name as import('../dev/shoreVisualProfile').ShoreFixtureName,'S1');expect(fixture.traveler.x).toBeCloseTo(prop==='east-gap'?.68:x-.025,12);expect(fixture.traveler.y).toBeCloseTo(y+(side[0]==='b'?-.02:.02),12);expect(fixture.catPost.x).toBe(prop==='east-gap'?.70:x+.025);expect(fixture.catPost.y).toBe(y+(side[1]==='b'?-.02:.02));
   const {WalkLayer,props}=await setup();render(<WalkLayer {...props} remembered={fixture.traveler} catPost={fixture.catPost}/>);
   const {cameraOffset,lookEast}=await import('../core/walk');const reference=lookEast(cameraOffset({x:.44,y:.72},1280,720),1280,true);
   expect(screen.getByTestId('world-camera').style.transform).toBe(`translate3d(${-reference.x}px, ${-reference.y}px, 0)`);expect(read).not.toHaveBeenCalled();expect(write).not.toHaveBeenCalled();
  });
 }

 it('provides explicit fixture-only D0 depth comparison without undoing candidate art/cue/shoe fixes',async()=>{
  history.replaceState({},'','/?shoreVisual=candidate&fixture=shore-spawn&freeze=1&depth=legacy');const {WalkLayer,props}=await setup();render(<WalkLayer {...props}/>);expect(document.querySelector('.ground-depth-root')).toBeNull();expect(screen.getByTestId('sole-soft').parentElement).toBe(screen.getByTestId('sole-layer'));expect(screen.getByTestId('walk-stage').dataset.catContactSource).toBe('actual');
 });
 it('ignores depth=legacy outside explicit frozen fixture',async()=>{
  history.replaceState({},'','/?shoreVisual=candidate&depth=legacy');const {WalkLayer,props}=await setup();render(<WalkLayer {...props}/>);expect(document.querySelector('.ground-depth-root')).not.toBeNull();
 });

});
