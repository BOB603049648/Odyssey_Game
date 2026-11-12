import { useLayoutEffect } from 'react';
import { act, cleanup, render, fireEvent } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Only platform/pixel boundaries are controlled. The resource hook, decoded cache,
// load gate, production RAF, nextGuide, Companion owner and views are all real.
vi.mock('/workspace/odyssey-visual-sample-20261111/src/ui/soleClip', () => ({ clippedBootUrl: () => null, catContactUrl: () => null }));
vi.mock('/workspace/odyssey-visual-sample-20261111/src/ui/hemPunch', async () => ({ ...await vi.importActual('/workspace/odyssey-visual-sample-20261111/src/ui/hemPunch'), punchHemUrl: async (src: string) => src }));
let clock = 0, sequence = 0, blobSequence = 0;
let callbacks = new Map<number, FrameRequestCallback>();
const modes = new Map<string, 'pending' | 'fail'>();
const decodes = new Map<string, { resolve: () => void; reject: (error: Error) => void }[]>();
const fetches = new Map<string, (response: Response) => void>();
let attempts = new Map<string, number>();
let WalkLayer: typeof import('/workspace/odyssey-visual-sample-20261111/src/ui/WalkLayer')['WalkLayer'];
let urls: typeof import('/workspace/odyssey-visual-sample-20261111/src/content/assetUrls');
let post: typeof import('/workspace/odyssey-visual-sample-20261111/src/core/companionPost')['companionPost'];
let traj: typeof import('/workspace/odyssey-visual-sample-20261111/src/ui/trajArt');

class ControlledImage {
  onload: (() => void) | null = null;
  onerror: (() => void) | null = null;
  naturalWidth = 864; naturalHeight = 1152; complete = true;
  private value = '';
  set src(value: string) { this.value = value; queueMicrotask(() => this.onload?.()); }
  get src() { return this.value; }
  decode() {
    attempts.set(this.value, (attempts.get(this.value) ?? 0) + 1);
    if (modes.get(this.value) === 'fail') return Promise.reject(new Error('controlled decode rejection'));
    if (modes.get(this.value) !== 'pending') return Promise.resolve();
    return new Promise<void>((resolve, reject) => {
      const jobs = decodes.get(this.value) ?? []; jobs.push({ resolve, reject }); decodes.set(this.value, jobs);
    });
  }
}
async function flush() { await act(async () => { for (let i = 0; i < 600; i++) await Promise.resolve(); }); }
function layer(beat: 'S0' | 'S1' | 'S2' | 'C1', paused = false) {
  const scene = beat === 'C1' ? 'dba.scene.camp' : 'dba.scene.shore';
  const beats = beat === 'S2' ? { 'dba.beat.water': true } : {};
  const flags = beat === 'S1' || beat === 'S2' ? { 'dba.flag.driftwood': true } : {};
  return <WalkLayer scene={scene} drank={false} spots={[]} hint={{ level: 0, anchor: 'driftwood', wordId: null, pose: 'idle' }} catPost={post(scene, beats, flags)} paused={paused} purr={false} knot="rest" remembered={null} onRemember={() => {}} onExit={() => {}} onInteract={() => {}} onAsk={() => {}} onEscape={() => {}} />;
}
function picture() { return document.querySelector<HTMLImageElement>('.nanaicha-ground')!; }
async function mountS0() { const view = render(layer('S0')); await flush(); expect(picture().getAttribute('src')).toBe(urls.trajAssetUrl('land-shore-driftwood')); return view; }
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.stubEnv('MODE', 'production'); vi.stubEnv('VITE_VISUAL_SAMPLE', '1');
  history.replaceState({}, '', '/?shoreVisual=candidate');
  clock = 0; sequence = 0; blobSequence = 0; callbacks = new Map(); modes.clear(); decodes.clear(); fetches.clear(); attempts = new Map();
  vi.stubGlobal('Image', ControlledImage);
  vi.stubGlobal('fetch', vi.fn((url: string) => new Promise<Response>(resolve => fetches.set(url, resolve))));
  const OriginalURL = URL;
  vi.stubGlobal('URL', class extends OriginalURL { static createObjectURL() { return `blob:cat-landing-${++blobSequence}`; } static revokeObjectURL = vi.fn(); });
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { callbacks.set(++sequence, fn); return sequence; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { callbacks.delete(id); });
  WalkLayer = (await import('/workspace/odyssey-visual-sample-20261111/src/ui/WalkLayer')).WalkLayer; urls = await import('/workspace/odyssey-visual-sample-20261111/src/content/assetUrls'); post = (await import('/workspace/odyssey-visual-sample-20261111/src/core/companionPost')).companionPost; traj = await import('/workspace/odyssey-visual-sample-20261111/src/ui/trajArt');
  (await import('/workspace/odyssey-visual-sample-20261111/src/content/loadGate')).setLoadRetryDelayForTests(() => 0);
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

function fetchCount(url: string) { return vi.mocked(fetch).mock.calls.filter(call => String(call[0]) === url).length; }
async function tickRecovery(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); await flush(); }


describe('B-lite production recovery regression',()=>{
 it('successful-image stale error ignore does not poison a subsequent genuine broken-image error',async()=>{
  await mountS0();const source=urls.trajAssetUrl('land-shore-driftwood')!,img=picture();
  Object.defineProperty(img,'complete',{configurable:true,value:true});Object.defineProperty(img,'naturalWidth',{configurable:true,value:864});
  Object.defineProperty(img,'currentSrc',{configurable:true,value:new URL(source,document.baseURI).href});
  fireEvent.error(img);await flush();expect(traj.trajUrl('land-shore-driftwood')).toBe(source);
  Object.defineProperty(img,'naturalWidth',{configurable:true,value:0});fireEvent.error(img);await flush();expect(traj.trajUrl('land-shore-driftwood')).toBeUndefined();
  await tickRecovery(5000);expect(traj.trajUrl('land-shore-driftwood')).toBe(source);expect(picture()).not.toBe(img);
  fireEvent.error(picture());await flush();expect(traj.trajUrl('land-shore-driftwood')).toBeUndefined();
  await tickRecovery(5000);expect(traj.trajUrl('land-shore-driftwood')).toBe(source);
 });
 it('a later pre-error fetch cannot overwrite or revoke an already successful new cache job',async()=>{
  await mountS0();const source=urls.trajAssetUrl('land-shore-driftwood')!,old=fetches.get(source)!;
  const {forgetCatSrc,loadCatSrc}=await import('/workspace/odyssey-visual-sample-20261111/src/ui/catImage');
  forgetCatSrc(source);const fresh=loadCatSrc(source);const freshResolve=fetches.get(source)!;
  await act(async()=>{freshResolve({ok:true,blob:async()=>new Blob(['n'.repeat(64)])} as Response);});await flush();
  const newBlob=await fresh;expect(newBlob).toBe('blob:cat-landing-1');
  await act(async()=>{old({ok:true,blob:async()=>new Blob(['o'.repeat(64)])} as Response);});await flush();
  expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cat-landing-2');expect(URL.revokeObjectURL).not.toHaveBeenCalledWith(newBlob);expect(await loadCatSrc(source)).toBe(newBlob);
 });
 it('same-batch error and immediate online recovery refreshes the image and permits another genuine failure',async()=>{
  const view=await mountS0();await act(async()=>{await traj.loadTraj('land-shore-gourd');});view.rerender(layer('S1',true));await flush();
  const source=urls.trajAssetUrl('land-shore-driftwood')!,old=picture(),before=attempts.get(source)!;
  await act(async()=>{fireEvent.error(old);fireEvent.online(window);await vi.advanceTimersByTimeAsync(0);for(let i=0;i<120;i++)await Promise.resolve();});await flush();
  console.log('COALESCED_RECOVERY',JSON.stringify({cache:traj.trajUrl('land-shore-driftwood'),attempts:attempts.get(source),before,sameImage:picture()===old,fetches:fetchCount(source)}));
  expect(traj.trajUrl('land-shore-driftwood')).toBe(source);
  fireEvent.error(picture());await flush();console.log('SECOND_GENUINE_ERROR',JSON.stringify({cache:traj.trajUrl('land-shore-driftwood'),sameImage:picture()===old,fetches:fetchCount(source)}));expect(traj.trajUrl('land-shore-driftwood')).toBeUndefined();
 });
 it('captures the only new-scene error in parent layout before the actual consumer passive installs',async()=>{
  let delivered=0;
  function Parent({beat}:{beat:'S0'|'C1'}) {
   useLayoutEffect(()=>{if(beat==='C1'){const img=picture();expect(img).not.toBeNull();delivered++;img.dispatchEvent(new Event('error'));}},[beat]);
   return layer(beat,true);
  }
  const view=render(<Parent beat="S0"/>);await flush();
  await act(async()=>{const slot=await import('/workspace/odyssey-visual-sample-20261111/src/content/slotAssets');await traj.loadTraj('land-camp-fireside');await slot.loadSlotAsset('art.camp.prop.nanaicha');});await flush();
  const camp=urls.trajAssetUrl('land-camp-fireside')!,shore=urls.trajAssetUrl('land-shore-driftwood')!;
  view.rerender(<Parent beat="C1"/>);await flush();
  expect(delivered).toBe(1);expect(traj.trajUrl('land-camp-fireside')).toBeUndefined();expect(traj.trajUrl('land-shore-driftwood')).toBe(shore);
  await tickRecovery(5000);expect(traj.trajUrl('land-camp-fireside')).toBe(camp);expect(picture().getAttribute('src')).toBe(camp);
 });
 it('same-batch recovery must refresh once and accept the next error before any DOM load event',async()=>{
  await mountS0();const source=urls.trajAssetUrl('land-shore-driftwood')!,old=picture();
  await act(async()=>{fireEvent.error(old);fireEvent.error(old);fireEvent.online(window);await vi.advanceTimersByTimeAsync(0);for(let i=0;i<120;i++)await Promise.resolve();});await flush();
  expect(picture()).not.toBe(old);expect(fetchCount(source)).toBe(2);
  const next=picture();fireEvent.error(next);await flush();expect(traj.trajUrl('land-shore-driftwood')).toBeUndefined();
  fireEvent.error(old);await flush();expect(traj.trajUrl('land-shore-driftwood')).toBeUndefined();
  await tickRecovery(5000);expect(picture()).not.toBe(next);expect(fetchCount(source)).toBe(3);
 });

});
