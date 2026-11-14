import { act, cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Only platform/pixel boundaries are controlled. The resource hook, decoded cache,
// load gate, production RAF, nextGuide, Companion owner and views are all real.
vi.mock('./soleClip', () => ({ clippedBootUrl: () => null, catContactUrl: () => null }));
vi.mock('./hemPunch', async () => ({ ...await vi.importActual('./hemPunch'), punchHemUrl: async (src: string) => src }));
let clock = 0, sequence = 0, blobSequence = 0;
let callbacks = new Map<number, FrameRequestCallback>();
const modes = new Map<string, 'pending' | 'fail'>();
const decodes = new Map<string, { resolve: () => void; reject: (error: Error) => void }[]>();
const fetches = new Map<string, (response: Response) => void>();
let attempts = new Map<string, number>();
let WalkLayer: typeof import('./WalkLayer')['WalkLayer'];
let urls: typeof import('../content/assetUrls');
let post: typeof import('../core/companionPost')['companionPost'];
let traj: typeof import('./trajArt');

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
async function flush() { await act(async () => { for (let i = 0; i < 120; i++) await Promise.resolve(); }); }
async function ready(url: string) {
  await act(async () => { modes.delete(url); for (const task of decodes.get(url) ?? []) task.resolve(); decodes.delete(url); });
  await flush();
}
async function reject(url: string) {
  await act(async () => { modes.set(url, 'fail'); for (const task of decodes.get(url) ?? []) task.reject(new Error('controlled decode rejection')); decodes.delete(url); });
  await flush();
}
async function frame() { clock += 1000 / 60; await act(async () => { const batch = [...callbacks.values()]; callbacks.clear(); batch.forEach(fn => fn(clock)); }); }
async function frames(count: number) { for (let i = 0; i < count; i++) await frame(); }
function layer(beat: 'S0' | 'S1' | 'S2' | 'C1', paused = false) {
  const scene = beat === 'C1' ? 'dba.scene.camp' : 'dba.scene.shore';
  const beats = beat === 'S2' ? { 'dba.beat.water': true } : {};
  const flags = beat === 'S1' || beat === 'S2' ? { 'dba.flag.driftwood': true } : {};
  return <WalkLayer scene={scene} drank={false} spots={[]} hint={{ level: 0, anchor: 'driftwood', wordId: null, pose: 'idle' }} catPost={post(scene, beats, flags)} paused={paused} purr={false} knot="rest" remembered={null} onRemember={() => {}} onExit={() => {}} onInteract={() => {}} onAsk={() => {}} onEscape={() => {}} />;
}
function picture() { return document.querySelector<HTMLImageElement>('.nanaicha-ground')!; }
function anchor() { return document.querySelector<HTMLElement>('[data-testid="companion-anchor"]')!; }
async function mountS0() { const view = render(layer('S0')); await flush(); expect(picture().getAttribute('src')).toBe(urls.trajAssetUrl('land-shore-driftwood')); return view; }
function geometry() { return [anchor().style.height, anchor().style.getPropertyValue('--foot-x'), anchor().style.getPropertyValue('--foot-y')]; }
async function completeRoute() {
  let moves = 0;
  for (let i = 0; i < 160; i++) {
    await frame();
    if (anchor().dataset.guide === 'move') {
      moves++; expect(picture().getAttribute('src')).toMatch(/leap-0[12]/);
      expect(picture().dataset.frame).toMatch(/leap-0[12]/);
    }
    if (moves && anchor().dataset.guide === 'hold') return moves;
  }
  throw new Error('real guide route did not finish');
}
beforeEach(async () => {
  vi.resetModules(); vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
  vi.stubEnv('MODE', 'production'); vi.stubEnv('VITE_VISUAL_SAMPLE', '1');
  history.replaceState({}, '', '/?shoreVisual=candidate');
  clock = 0; sequence = 0; blobSequence = 0; callbacks = new Map(); modes.clear(); decodes.clear(); fetches.clear(); attempts = new Map();
  vi.stubGlobal('Image', ControlledImage);
  vi.stubGlobal('fetch', vi.fn((url: string) => new Promise<Response>(resolve => fetches.set(url, resolve))));
  const OriginalURL = URL;
  vi.stubGlobal('URL', class extends OriginalURL { static createObjectURL() { return `blob:cat-landing-${++blobSequence}`; } });
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { callbacks.set(++sequence, fn); return sequence; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { callbacks.delete(id); });
  WalkLayer = (await import('./WalkLayer')).WalkLayer; urls = await import('../content/assetUrls'); post = (await import('../core/companionPost')).companionPost; traj = await import('./trajArt');
  (await import('../content/loadGate')).setLoadRetryDelayForTests(() => 0);
  // Exercise the real full-figure fallback, not a disabled animation mode. The
  // optional new sheet fails decoding; legacy records must still recover intact.
  modes.set((await import('../content/characterPerformanceAtlas')).COMPANION_ATLAS.url, 'fail');
});
afterEach(() => { cleanup(); vi.clearAllTimers(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });

describe('production decoded landing record through real WalkLayer/Companion', () => {
  it('keeps ready S0 through a cold S1 gaze instead of shrinking to wide scene fallback', async () => {
    const view = await mountS0(); const old = picture().getAttribute('src'), foot = geometry();
    modes.set(urls.trajAssetUrl('land-shore-gourd')!, 'pending'); view.rerender(layer('S1')); await flush();
    expect(anchor().dataset.guide).toBe('gaze'); expect(traj.trajUrl('land-shore-gourd')).toBeUndefined();
    expect(picture().getAttribute('src')).toBe(old); expect(picture().dataset.frame).toBe('land-shore-driftwood'); expect(geometry()).toEqual(foot);
  });
  it('preloads an already-ready target but does not display its landing during gaze', async () => {
    const view = await mountS0(); await act(async () => { await traj.loadTraj('land-shore-gourd'); });
    const old = picture().getAttribute('src'); view.rerender(layer('S1')); await flush(); await frames(12);
    expect(anchor().dataset.guide).toBe('gaze'); expect(picture().getAttribute('src')).toBe(old); expect(picture().dataset.frame).toBe('land-shore-driftwood');
    await completeRoute(); expect(picture().getAttribute('src')).toBe(urls.trajAssetUrl('land-shore-gourd'));
  });
  it('keeps the departure on decoder rejection and retry, then commits only after actual arrival', async () => {
    const view = await mountS0(); const target = urls.trajAssetUrl('land-shore-gourd')!; modes.set(target, 'pending');
    view.rerender(layer('S1', true)); await flush(); await reject(target); expect(attempts.get(target)).toBe(3);
    expect(picture().getAttribute('src')).toBe(urls.trajAssetUrl('land-shore-driftwood'));
    modes.delete(target); await act(async () => { await vi.advanceTimersByTimeAsync(5000); }); await flush();
    expect(traj.trajUrl('land-shore-gourd')).toBe(target); expect(picture().getAttribute('src')).toBe(urls.trajAssetUrl('land-shore-driftwood'));
    view.rerender(layer('S1')); await completeRoute(); expect(picture().getAttribute('src')).toBe(target);
  });
  it('never translates a landing during move and holds its final leap at arrival while target is cold', async () => {
    const view = await mountS0(); const target = urls.trajAssetUrl('land-shore-gourd')!; modes.set(target, 'pending'); view.rerender(layer('S1')); await flush();
    expect(await completeRoute()).toBeGreaterThan(0); expect(picture().getAttribute('src')).toBe(urls.trajAssetUrl('leap-02'));
    expect(picture().dataset.frame).toBe('leap-02'); const at = [anchor().style.left, anchor().style.top];
    await frames(20); expect([anchor().style.left, anchor().style.top]).toEqual(at); expect(picture().getAttribute('src')).toBe(urls.trajAssetUrl('leap-02'));
    await ready(target); expect(picture().getAttribute('src')).toBe(target); expect(picture().dataset.frame).toBe('land-shore-gourd'); expect([anchor().style.left, anchor().style.top]).toEqual(at);
  });
  it('does not replace paused gaze on late target readiness, then supports reverse retarget', async () => {
    const view = await mountS0(); const target = urls.trajAssetUrl('land-shore-gourd')!; modes.set(target, 'pending'); view.rerender(layer('S1', true)); await flush();
    const at = [anchor().style.left, anchor().style.top]; await frames(60); await ready(target);
    expect(picture().getAttribute('src')).toBe(urls.trajAssetUrl('land-shore-driftwood')); expect([anchor().style.left, anchor().style.top]).toEqual(at);
    view.rerender(layer('S1')); await completeRoute(); view.rerender(layer('S0')); await flush();
    expect(picture().getAttribute('src')).toBe(target); expect(picture().dataset.frame).toBe('land-shore-gourd');
    await completeRoute(); expect(picture().getAttribute('src')).toBe(urls.trajAssetUrl('land-shore-driftwood'));
  });
  it('never lets old raw-to-blob completions replace a moving leap or arrived target', async () => {
    const view = await mountS0(); const old = urls.trajAssetUrl('land-shore-driftwood')!;
    view.rerender(layer('S1')); await flush(); await frames(36); expect(anchor().dataset.guide).toBe('move');
    const current = picture().getAttribute('src'); await act(async () => { fetches.get(old)?.({ ok: true, blob: async () => new Blob(['x'.repeat(64)]) } as Response); }); await flush();
    expect(picture().getAttribute('src')).toBe(current); await completeRoute(); const arrived = picture().getAttribute('src');
    await act(async () => { fetches.get(urls.trajAssetUrl('leap-01')!)?.({ ok: true, blob: async () => new Blob(['y'.repeat(64)]) } as Response); }); await flush();
    expect(picture().getAttribute('src')).toBe(arrived); expect(picture().dataset.frame).toBe('land-shore-gourd');
  });
  it('clears the prior scene record, permits only its own initial fallback, and ignores late old-scene completion', async () => {
    const view = await mountS0(); const oldTarget = urls.trajAssetUrl('land-shore-gourd')!, camp = urls.trajAssetUrl('land-camp-fireside')!;
    modes.set(oldTarget, 'pending'); view.rerender(layer('S1')); await flush(); modes.set(camp, 'pending'); view.rerender(layer('C1')); await flush();
    expect(picture().getAttribute('src')).toBe(urls.slotAssetUrl('art.camp.prop.nanaicha')); expect(picture().dataset.frame).toBe('fallback');
    await ready(oldTarget); expect(picture().getAttribute('src')).toBe(urls.slotAssetUrl('art.camp.prop.nanaicha'));
    await ready(camp); expect(picture().getAttribute('src')).toBe(camp); view.rerender(layer('S0')); await flush();
    expect(picture().getAttribute('src')).toBe(urls.trajAssetUrl('land-shore-driftwood')); expect(picture().dataset.frame).toBe('land-shore-driftwood');
    view.unmount(); expect(callbacks.size).toBe(0);
  });
});
