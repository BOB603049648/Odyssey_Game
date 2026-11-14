import { act, cleanup, render, fireEvent } from '@testing-library/react';
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
function layer(beat: 'S0' | 'S1' | 'S2' | 'C1', paused = false, level: 0 | 1 | 2 | 3 = 0) {
  const scene = beat === 'C1' ? 'dba.scene.camp' : 'dba.scene.shore';
  const beats = beat === 'S2' ? { 'dba.beat.water': true } : {};
  const flags = beat === 'S1' || beat === 'S2' ? { 'dba.flag.driftwood': true } : {};
  return <WalkLayer scene={scene} drank={false} spots={[]} hint={{ level, anchor: 'driftwood', wordId: null, pose: 'idle' }} catPost={post(scene, beats, flags)} paused={paused} purr={false} knot="rest" remembered={null} onRemember={() => {}} onExit={() => {}} onInteract={() => {}} onAsk={() => {}} onEscape={() => {}} />;
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
  vi.stubGlobal('URL', class extends OriginalURL { static createObjectURL() { return `blob:cat-landing-${++blobSequence}`; } static revokeObjectURL = vi.fn(); });
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

function fetchCount(url: string) { return vi.mocked(fetch).mock.calls.filter(call => String(call[0]) === url).length; }
async function blobReady(url: string) {
  await act(async () => { fetches.get(url)!({ ok: true, blob: async () => new Blob(['x'.repeat(64)]) } as Response); });
  await flush();
}
async function tickRecovery(ms: number) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); await flush(); }

describe('I1 actual displayed record error through production loading chain', () => {
  it('keeps a complete playable guide while the optional pose sheet is cold, then installs its decoded cells', async () => {
    const { COMPANION_ATLAS } = await import('../content/characterPerformanceAtlas');
    modes.set(COMPANION_ATLAS.url, 'pending');
    const view = await mountS0();
    expect(document.querySelector('[data-testid="walk-stage"]')?.getAttribute('data-display')).toBe('ready');
    expect(traj.trajUrl('pose-observe-01')).toBeUndefined();
    await ready(COMPANION_ATLAS.url);
    expect(picture().getAttribute('src')).toBe(COMPANION_ATLAS.url);
    expect(picture().dataset.performance).toBe('pose-observe-01');
    expect(attempts.get(COMPANION_ATLAS.url)).toBe(1);
    view.unmount(); expect(callbacks.size).toBe(0);
  });
  it('changes decoded pose cells on one native bitmap and routes a genuine pose failure to that sheet only', async () => {
    const { COMPANION_ATLAS } = await import('../content/characterPerformanceAtlas'); modes.delete(COMPANION_ATLAS.url);
    const view = render(layer('S0')); await flush(); const old = picture();
    expect(old.getAttribute('src')).toBe(COMPANION_ATLAS.url);
    view.rerender(layer('S0', false, 1)); await flush();
    for (let i = 0; i < 40; i++) await frame();
    expect(picture()).toBe(old); expect(picture().dataset.performance).toBe('pose-point-01');
    const legacy = traj.trajUrl('land-shore-driftwood');
    fireEvent.error(picture()); await flush();
    expect(traj.trajUrl('pose-point-01')).toBeUndefined();
    expect(traj.trajUrl('land-shore-driftwood')).toBe(legacy);
    expect(picture().getAttribute('src')).toBe(legacy);
    expect(document.querySelector('[data-testid="walk-stage"]')?.getAttribute('data-display')).toBe('ready');
    await tickRecovery(5000);
    expect(picture().getAttribute('src')).toBe(COMPANION_ATLAS.url); expect(picture()).not.toBe(old);
    expect(picture().dataset.performance).toBe('pose-point-01');
    fireEvent.error(picture()); await flush(); expect(traj.trajUrl('pose-point-01')).toBeUndefined();
  });
  it('isolates native atlas images across scenes and ignores a queued error from the departed scene', async () => {
    const { COMPANION_ATLAS } = await import('../content/characterPerformanceAtlas'); modes.delete(COMPANION_ATLAS.url);
    const view = render(layer('S0')); await flush(); const old = picture();
    view.rerender(layer('C1')); await flush();
    expect(picture().getAttribute('src')).toBe(COMPANION_ATLAS.url); expect(picture()).not.toBe(old);
    fireEvent.error(old); await flush();
    expect(traj.trajUrl('pose-observe-01')).toBe(urls.trajAssetUrl('pose-observe-01'));
    expect(picture().getAttribute('src')).toBe(COMPANION_ATLAS.url);
  });
  it('uses real leaps during travel and ignores a late leap blob after returning to an atlas pose', async () => {
    const { COMPANION_ATLAS } = await import('../content/characterPerformanceAtlas'); modes.delete(COMPANION_ATLAS.url);
    const view = render(layer('S0')); await flush(); const old = picture();
    view.rerender(layer('S1')); await flush(); expect(anchor().dataset.guide).toBe('gaze');
    expect(picture()).toBe(old); expect(picture().getAttribute('src')).toBe(COMPANION_ATLAS.url);
    await completeRoute(); expect(picture().getAttribute('src')).toBe(COMPANION_ATLAS.url);
    const current = picture(); await blobReady(urls.trajAssetUrl('leap-01')!);
    expect(picture()).toBe(current); expect(picture().getAttribute('src')).toBe(COMPANION_ATLAS.url);
  });
  it('invalidates held S0 only, retries its decoder once after5s, and preserves ready S1 prewarm', async () => {
    const view = await mountS0(), departure = urls.trajAssetUrl('land-shore-driftwood')!, target = urls.trajAssetUrl('land-shore-gourd')!;
    const slots = await import('../content/slotAssets'); await act(async () => { await traj.loadTraj('land-shore-gourd'); });
    view.rerender(layer('S1', true)); await flush(); const old = picture(), feet = geometry();
    fireEvent.error(old); await flush();
    expect(traj.trajUrl('land-shore-driftwood')).toBeUndefined(); expect(traj.trajUrl('land-shore-gourd')).toBe(target);
    expect(slots.resolveSlotAsset('art.shore.prop.nanaicha')).toBe(urls.slotAssetUrl('art.shore.prop.nanaicha'));
    expect(picture().getAttribute('src')).toBe(departure); expect(geometry()).toEqual(feet);
    const priorAttempts = attempts.get(departure)!;
    for (let i = 0; i < 8; i++) fireEvent.error(picture());
    await tickRecovery(4999); expect(attempts.get(departure)).toBe(priorAttempts);
    await tickRecovery(1); expect(attempts.get(departure)).toBe(priorAttempts + 1); expect(traj.trajUrl('land-shore-driftwood')).toBe(departure);
    expect(picture()).not.toBe(old); expect(picture().dataset.frame).toBe('land-shore-driftwood'); expect(traj.trajUrl('land-shore-gourd')).toBe(target);
    expect(fetchCount(departure)).toBe(2); view.rerender(layer('S1')); await completeRoute(); expect(picture().getAttribute('src')).toBe(target);
  });
  it('recovers arrival-held leap itself after decode rejection and online wake without clearing cold target', async () => {
    const view = await mountS0(), target = urls.trajAssetUrl('land-shore-gourd')!, leap = urls.trajAssetUrl('leap-02')!;
    modes.set(target, 'pending'); view.rerender(layer('S1')); await flush(); await completeRoute(); const arrived = [anchor().style.left, anchor().style.top];
    expect(picture().getAttribute('src')).toBe(leap); const targetAttempts = attempts.get(target)!;
    fireEvent.error(picture()); await flush(); expect(traj.trajUrl('leap-02')).toBeUndefined();
    await reject(leap); await tickRecovery(5000); expect(traj.trajUrl('leap-02')).toBeUndefined();
    expect(attempts.get(target)).toBe(targetAttempts); expect(picture().dataset.frame).toBe('leap-02'); expect(picture().getAttribute('src')).toBe(leap);
    modes.delete(leap); fireEvent.online(window); await tickRecovery(5000);
    expect(traj.trajUrl('leap-02')).toBe(leap); expect([anchor().style.left, anchor().style.top]).toEqual(arrived); expect(fetchCount(leap)).toBe(2);
    await ready(target); expect(picture().getAttribute('src')).toBe(target); expect(picture().dataset.frame).toBe('land-shore-gourd');
  });
  it('forgets a failed held blob and refreshes raw/blob only after its actual source has redecoded', async () => {
    const view = await mountS0(), departure = urls.trajAssetUrl('land-shore-driftwood')!, target = urls.trajAssetUrl('land-shore-gourd')!;
    await blobReady(departure); const badBlob = picture().getAttribute('src'); expect(badBlob).toMatch(/^blob:/);
    await act(async () => { await traj.loadTraj('land-shore-gourd'); }); view.rerender(layer('S1', true)); await flush(); fireEvent.error(picture()); await flush();
    expect(traj.trajUrl('land-shore-driftwood')).toBeUndefined(); expect(traj.trajUrl('land-shore-gourd')).toBe(target);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith(badBlob); expect(fetchCount(departure)).toBe(1);
    await tickRecovery(5000); expect(fetchCount(departure)).toBe(2); expect(picture().getAttribute('src')).toBe(departure);
    await blobReady(departure); expect(picture().getAttribute('src')).toMatch(/^blob:/); expect(picture().getAttribute('src')).not.toBe(badBlob); expect(picture().dataset.frame).toBe('land-shore-driftwood');
  });
  it('ignores an old raw img error after the same record has switched to its blob', async () => {
    await mountS0(); const departure = urls.trajAssetUrl('land-shore-driftwood')!, old = picture(); await blobReady(departure); const goodBlob = picture().getAttribute('src');
    expect(picture()).toBe(old);
    // Native currentSrc identifies a queued prior-raw error while src already points at blob.
    Object.defineProperty(old, 'currentSrc', { configurable: true, value: new URL(departure, document.baseURI).href });
    fireEvent.error(old); await flush();
    expect(traj.trajUrl('land-shore-driftwood')).toBe(departure); expect(picture().getAttribute('src')).toBe(goodBlob); expect(fetchCount(departure)).toBe(1);
  });
  it('ignores the prior scene img error and does not clear the new actual landing or slot', async () => {
    const view = await mountS0(), old = picture(); view.rerender(layer('C1')); await flush(); const camp = urls.trajAssetUrl('land-camp-fireside')!;
    expect(picture().getAttribute('src')).toBe(camp); expect(picture()).not.toBe(old); fireEvent.error(old); await flush();
    expect(traj.trajUrl('land-camp-fireside')).toBe(camp); expect((await import('../content/slotAssets')).resolveSlotAsset('art.camp.prop.nanaicha')).toBe(urls.slotAssetUrl('art.camp.prop.nanaicha'));
    view.rerender(layer('S0')); await flush(); expect(picture().getAttribute('src')).toBe(urls.trajAssetUrl('land-shore-driftwood')); view.unmount(); expect(callbacks.size).toBe(0);
  });
  it('routes initial scene fallback errors to that slot only, then permits the decoded landing', async () => {
    const view = await mountS0(), camp = urls.trajAssetUrl('land-camp-fireside')!; modes.set(camp, 'pending'); view.rerender(layer('C1')); await flush();
    const slots = await import('../content/slotAssets'), fallback = urls.slotAssetUrl('art.camp.prop.nanaicha')!; expect(picture().getAttribute('src')).toBe(fallback);
    const count = attempts.get(camp); fireEvent.error(picture()); await flush(); expect(slots.resolveSlotAsset('art.camp.prop.nanaicha')).toBeNull(); expect(attempts.get(camp)).toBe(count);
    await tickRecovery(5000); expect(slots.resolveSlotAsset('art.camp.prop.nanaicha')).toBe(fallback); expect(attempts.get(camp)).toBe(count);
    await ready(camp); expect(picture().getAttribute('src')).toBe(camp); expect(picture().dataset.frame).toBe('land-camp-fireside');
  });
  it('fences a pre-error fetch completion so its obsolete blob cannot replace the held raw record or new attempt', async () => {
    const view = await mountS0(), departure = urls.trajAssetUrl('land-shore-driftwood')!; const late = fetches.get(departure)!;
    view.rerender(layer('S1', true)); await flush(); fireEvent.error(picture()); await flush();
    await act(async () => { late({ ok: true, blob: async () => new Blob(['z'.repeat(64)]) } as Response); }); await flush();
    expect(picture().getAttribute('src')).toBe(departure); expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:cat-landing-1');
    await tickRecovery(5000); expect(fetchCount(departure)).toBe(2); await blobReady(departure);
    expect(picture().getAttribute('src')).toBe('blob:cat-landing-2'); expect(picture().dataset.frame).toBe('land-shore-driftwood');
  });
});
