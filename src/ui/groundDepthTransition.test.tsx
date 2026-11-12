import {act,cleanup,render} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('./useAssetSrc',async()=>{const u=await import('../content/assetUrls');return {useAssetSrc:(id:string|null)=>({src:id?(u.travelerFrameUrl(id)||u.trajAssetUrl(id)||u.slotAssetUrl(id)||null):null,onError:()=>{}})};});
vi.mock('./travelerArt',async()=>{const u=await import('../content/assetUrls');return {frameUrl:(file:string)=>u.travelerFrameUrl(file),loadFrame:async(file:string)=>u.travelerFrameUrl(file),forgetFrame:vi.fn()};});
vi.mock('./firstScreenReady',()=>({useFirstScreenReady:()=>({status:'ready',done:1,total:1,retry:()=>{}})}));
vi.mock('./hemPunch',async()=>({...await vi.importActual('./hemPunch'),punchHemUrl:vi.fn(async(src:string)=>src)}));
beforeEach(()=>{vi.resetModules();vi.useFakeTimers();vi.stubEnv('MODE','production');vi.stubEnv('VITE_VISUAL_SAMPLE','1');vi.stubEnv('VITE_SHORE_DEPLOY_ORIGIN','');history.replaceState({},'','/?shoreVisual=candidate');vi.spyOn(window,'requestAnimationFrame').mockImplementation(()=>1);vi.spyOn(window,'cancelAnimationFrame').mockImplementation(()=>{});vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();vi.useRealTimers();history.replaceState({},'','/');});
describe('D1 scene boundary must retain real FramePicture lastReady during pending legacy enhancement',()=>{
 it.each(['common','legacy'])('keeps ready actor through camp→shore→camp including980ms root removal while punch remains pending: %s',async(mode)=>{
  if(mode==='legacy')history.replaceState({},'','/?shoreVisual=candidate&fixture=shore-spawn&freeze=1&depth=legacy');
  const {WalkLayer}=await import('./WalkLayer');const {visibleSpots}=await import('./spotViews');const {newGameState}=await import('../core/save');const {companionPost}=await import('../core/companionPost');const {punchHemUrl}=await import('./hemPunch');
  const hint={level:0 as const,anchor:'driftwood' as const,wordId:null,pose:'idle' as const};
  const props=(scene:import('../core/island').IslandScene)=>({scene,drank:false,spots:visibleSpots(scene,newGameState(),hint),hint,paused:true,purr:false,knot:'rest' as const,remembered:{x:.42,y:.72},catPost:companionPost(scene,{}),taught:true,presentationFrozen:true,onRemember:()=>{},onExit:()=>{},onInteract:()=>{},onAsk:()=>{},onEscape:()=>{}});
  vi.mocked(punchHemUrl).mockImplementation(async(src:string)=>src);
  const v=render(<WalkLayer {...props('dba.scene.camp')}/>);await act(async()=>{await Promise.resolve();await Promise.resolve();});expect(document.querySelector('.traveler-figure')).not.toBeNull();
  // The original bitmap stays decode-ready; only optional punch is now slow.
  vi.mocked(punchHemUrl).mockImplementation(()=>new Promise(()=>{}));
  v.rerender(<WalkLayer {...props('dba.scene.shore')}/>);await act(async()=>{await Promise.resolve();});expect(document.querySelector('.traveler-figure')).not.toBeNull();act(()=>vi.advanceTimersByTime(980));
  v.rerender(<WalkLayer {...props('dba.scene.camp')}/>);await act(async()=>{await Promise.resolve();});act(()=>vi.advanceTimersByTime(979));const ready=document.querySelector<HTMLImageElement>('.traveler-figure');expect(ready).not.toBeNull();const readySrc=ready!.src;
  act(()=>vi.advanceTimersByTime(1));await act(async()=>{await Promise.resolve();});expect(document.querySelector<HTMLImageElement>('.traveler-figure')?.src).toBe(readySrc);
 });
});
