import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Only the browser bitmap boundary is simulated. Keep the production URL,
// slot cache, gate, hook, PlateStack and readiness overlay in the chain.
const bitmap = vi.hoisted(() => ({ real: false }));
vi.mock('../content/decodedImage', async (original) => {
  const real = await original<typeof import('../content/decodedImage')>();
  return { ...real, decodeAssetUrl: (url: string) => bitmap.real ? real.decodeImage(url) : real.decodeAssetUrl(url) };
});
import { forgetSlotAsset, resolveSlotAsset } from '../content/slotAssets';
import { slotAssetUrl } from '../content/assetUrls';
import { decodeImage } from '../content/decodedImage';
import { loadGated, resetLoadGateForTests, setLoadRetryDelayForTests } from '../content/loadGate';
import { useAssetSrc } from './useAssetSrc';
import { PlateStack } from './Plate';
import { FirstScreenGate } from './FirstScreenGate';
import { useFirstScreenReady } from './firstScreenReady';

const ground = 'art.shore.ground';
const url = slotAssetUrl(ground)!;
let control: { succeeds: boolean; requests: string[]; hanging: boolean };

beforeEach(() => {
  vi.useFakeTimers();
  resetLoadGateForTests();
  setLoadRetryDelayForTests(() => 0);
  bitmap.real = true;
  control = { succeeds: false, requests: [], hanging: false };
  vi.stubGlobal('Image', class {
    onload: (() => void) | null = null;
    onerror: (() => void) | null = null;
    decode = () => Promise.resolve();
    set src(src: string) {
      control.requests.push(src);
      if (control.hanging) return;
      const ok = control.succeeds;
      queueMicrotask(() => ok ? this.onload?.() : this.onerror?.());
    }
  });
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  forgetSlotAsset(ground);
});
afterEach(() => {
  cleanup();
  bitmap.real = false;
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});
async function advance(ms = 1) { await act(async () => { await vi.advanceTimersByTimeAsync(ms); }); }
function Scene() {
  const ready = useFirstScreenReady('dba.scene.shore');
  return <><PlateStack plate="dba.scene.shore" previous={null} pass="back" />
    <FirstScreenGate state={ready.status} done={ready.done} total={ready.total} onRetry={ready.retry} /></>;
}
function setupHook() {
  const cache = new Map<string, string>();
  const api = {
    resolve: (id: string | null) => id ? cache.get(id) ?? null : null,
    load: (id: string | null) => id ? loadGated(id, 'shell', () => decodeImage(url), cache) : Promise.resolve(null),
    forget: (id: string) => { cache.delete(id); },
  };
  return { api, cache };
}

describe('mounted image recovery regressions (real bitmap decode and gate)', () => {
  it('preserves the original online reproduction: recovers same mounted hook without another loader caller', async () => {
    const { api } = setupHook();
    const { result } = renderHook(() => useAssetSrc(ground, api));
    await advance();
    expect(control.requests).toHaveLength(3);
    expect(result.current.src).toBeNull();
    control.succeeds = true;
    await act(async () => { window.dispatchEvent(new Event('online')); });
    await advance(5_000);
    expect(result.current.src).toBe(url);
    expect(control.requests).toHaveLength(4);
  });

  it('restores actual ground image AND dismisses failed readiness overlay without online, refresh or scene change', async () => {
    const view = render(<Scene />);
    await advance();
    expect(control.requests.filter((src) => src === url)).toHaveLength(3);
    expect(view.container.querySelector('.shore-ground-plate')).toBeNull();
    expect(view.container.querySelector('[data-display="failed"]')).not.toBeNull();
    control.succeeds = true; // Request-block removed; no online event.
    await advance(5_000);
    expect(view.container.querySelector('.shore-ground-plate')?.getAttribute('src')).toBe(url);
    expect(view.container.querySelector('.scene-display')).toBeNull();
    expect(resolveSlotAsset(ground)).toBe(url);
    const count = control.requests.length;
    for (let i = 0; i < 20; i++) window.dispatchEvent(new Event('online'));
    await advance(120_000);
    expect(control.requests).toHaveLength(count);
  });

  it('coalesces duplicate mounts and repeated online events; backs off from 5s to 10s, 20s and max30s', async () => {
    const view = render(<><PlateStack plate="dba.scene.shore" previous={null} /><PlateStack plate="dba.scene.shore" previous={null} /></>);
    await advance();
    expect(control.requests).toHaveLength(3);
    for (let i = 0; i < 50; i++) window.dispatchEvent(new Event('online'));
    await advance(4_998);
    expect(control.requests).toHaveLength(3);
    await advance(1);
    expect(control.requests).toHaveLength(6);
    await advance(9_999);
    expect(control.requests).toHaveLength(6);
    await advance(1);
    expect(control.requests).toHaveLength(9);
    await advance(20_000);
    expect(control.requests).toHaveLength(12);
    await advance(30_000);
    expect(control.requests).toHaveLength(15);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('does not start bitmap requests while offline; online resumes once and never bypasses an in-flight load', async () => {
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
    const { api } = setupHook();
    const { result } = renderHook(() => useAssetSrc(ground, api));
    await advance(60_000);
    expect(control.requests).toHaveLength(0);
    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
    control.hanging = true;
    for (let i = 0; i < 20; i++) window.dispatchEvent(new Event('online'));
    await advance(1_000);
    expect(control.requests).toHaveLength(1);
    expect(result.current.src).toBeNull();
    for (let i = 0; i < 20; i++) window.dispatchEvent(new Event('online'));
    await advance(1_000);
    expect(control.requests).toHaveLength(1);
  });

  it('unmount removes timers/listeners and prevents new retry batches even if connectivity changes later', async () => {
    const { api } = setupHook();
    const view = renderHook(() => useAssetSrc(ground, api));
    await advance();
    expect(control.requests).toHaveLength(3);
    view.unmount();
    expect(vi.getTimerCount()).toBe(0);
    control.succeeds = true;
    window.dispatchEvent(new Event('online'));
    await advance(120_000);
    expect(control.requests).toHaveLength(3);
  });

  it('displayed img onError re-enters recovery; success does not create an endless reload loop', async () => {
    control.succeeds = true;
    const { api } = setupHook();
    function Figure() {
      const { src, onError } = useAssetSrc(ground, api);
      return src ? <img alt="probe" src={src} onError={onError} /> : <span>missing</span>;
    }
    const view = render(<Figure />);
    await advance();
    expect(control.requests).toHaveLength(1);
    fireEvent.error(view.getByAltText('probe'));
    expect(view.queryByAltText('probe')).toBeNull();
    await advance(5_000);
    expect(view.getByAltText('probe').getAttribute('src')).toBe(url);
    expect(control.requests).toHaveLength(2);
    await advance(120_000);
    expect(control.requests).toHaveLength(2);
  });

  it('a rejected loader is contained and an empty id cancels recovery', async () => {
    const { api } = setupHook();
    const rejectApi = { ...api, load: () => Promise.reject(new Error('unexpected loader rejection')) };
    const view = renderHook(({ id }) => useAssetSrc(id, rejectApi), { initialProps: { id: ground } });
    await advance();
    expect(view.result.current.src).toBeNull();
    view.rerender({ id: '' });
    await advance(120_000);
    expect(view.result.current.src).toBeNull();
  });

  it('online wakes a failed resource before its longer backoff, still respecting the shared 5s cooldown', async () => {
    const { api } = setupHook();
    const { result } = renderHook(() => useAssetSrc(ground, api));
    await advance();
    await advance(5_000);
    expect(control.requests).toHaveLength(6);
    await advance(4_999); // At t=10s; next ordinary retry is t=15s.
    expect(result.current.src).toBeNull();
    control.succeeds = true;
    window.dispatchEvent(new Event('online'));
    await advance(1);
    expect(result.current.src).toBe(url);
    expect(control.requests).toHaveLength(7);
  });

  it('ignores a previous asset completion after id change and cancels its future retry scheduling', async () => {
    let finish!: (url: string | null) => void;
    const load = vi.fn((id: string | null) => id === 'old'
      ? new Promise<string | null>((resolve) => { finish = resolve; })
      : Promise.resolve('/new.webp'));
    const api = { resolve: () => null, load };
    const view = renderHook(({ id }) => useAssetSrc(id, api), { initialProps: { id: 'old' } });
    await advance();
    view.rerender({ id: 'new' });
    await advance();
    expect(view.result.current.src).toBe('/new.webp');
    await act(async () => finish('/old.webp'));
    await advance(120_000);
    expect(view.result.current.src).toBe('/new.webp');
    expect(load).toHaveBeenCalledTimes(2);
    expect(vi.getTimerCount()).toBe(0);
  });

  it('an in-flight failure after unmount cannot schedule another recovery batch', async () => {
    let finish!: (url: string | null) => void;
    const load = vi.fn(() => new Promise<string | null>((resolve) => { finish = resolve; }));
    const view = renderHook(() => useAssetSrc(ground, { resolve: () => null, load }));
    await advance();
    view.unmount();
    await act(async () => finish(null));
    window.dispatchEvent(new Event('online'));
    await advance(120_000);
    expect(load).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
  });

});
