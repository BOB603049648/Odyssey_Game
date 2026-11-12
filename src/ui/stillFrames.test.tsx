import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { notifyAssetUpdates } from '../content/assetUpdates';

// Only the resource boundary is controlled. StillFrame and useAssetSrc are real.
const io = vi.hoisted(() => ({
  cache: new Map<string, string>(),
  handlers: new Map<string, () => Promise<string | null>>(),
  load: vi.fn<(id: string | null) => Promise<string | null>>(),
  forget: vi.fn<(id: string) => void>(),
}));
vi.mock('../content/slotAssets', () => ({
  resolveSlotAsset: (id: string | null) => id ? io.cache.get(id) ?? null : null,
  loadSlotAsset: io.load,
  forgetSlotAsset: io.forget,
}));
import { StillFrame, type StillId } from './stillFrames';

const FIRST: StillId = 'art.pro.storm';
const LAST: StillId = 'art.mem.cloak';
const url = (id: string) => `/assets/${id}.png`;
const requested = (id: StillId = FIRST) => io.load.mock.calls.filter(([asset]) => asset === id).length;
const image = (container: HTMLElement) => container.querySelector('img');
const flush = () => act(async () => { for (let n = 0; n < 12; n++) await Promise.resolve(); });
const advance = (ms: number) => act(async () => { await vi.advanceTimersByTimeAsync(ms); });
function deferred() {
  let resolve!: (value: string | null) => void;
  let reject!: (reason: Error) => void;
  const promise = new Promise<string | null>((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}
beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
  io.cache.clear(); io.handlers.clear(); io.load.mockReset(); io.forget.mockReset();
  io.load.mockImplementation(async (id) => {
    if (!id) return null;
    const hit = io.cache.get(id);
    if (hit) return hit;
    const next = io.handlers.get(id);
    const src = next ? await next() : url(id);
    if (src) { io.cache.set(id, src); notifyAssetUpdates(); }
    return src;
  });
  io.forget.mockImplementation((id) => { if (io.cache.delete(id)) notifyAssetUpdates(); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

describe('real StillFrame demand recovery', () => {
  it('recovers a failed/null first bitmap through the existing five-second backoff', async () => {
    let tries = 0;
    io.handlers.set(FIRST, async () => ++tries === 1 ? null : url(FIRST));
    const view = render(<StillFrame id={FIRST} />); await flush();
    expect(image(view.container)).toBeNull(); expect(requested()).toBe(1);
    await advance(4999); expect(requested()).toBe(1);
    await advance(1);
    expect(image(view.container)?.getAttribute('src')).toBe(url(FIRST));
    expect(requested()).toBe(2);
  });

  it('contains an unexpected first load rejection and later shows the recovered bitmap', async () => {
    let tries = 0;
    io.handlers.set(FIRST, async () => { if (++tries === 1) throw new Error('still decode unavailable'); return url(FIRST); });
    const view = render(<StillFrame id={FIRST} />); await flush();
    expect(image(view.container)).toBeNull();
    await advance(5000);
    expect(image(view.container)?.getAttribute('src')).toBe(url(FIRST));
    expect(requested()).toBe(2);
  });

  it('online shortens a longer backoff without repeated events causing duplicate loads', async () => {
    let tries = 0;
    io.handlers.set(FIRST, async () => ++tries < 3 ? null : url(FIRST));
    const view = render(<StillFrame id={FIRST} />); await flush();
    await advance(5000); expect(requested()).toBe(2);
    await advance(5000); expect(image(view.container)).toBeNull();
    await act(async () => { window.dispatchEvent(new Event('online')); window.dispatchEvent(new Event('online')); });
    await advance(0);
    expect(image(view.container)?.getAttribute('src')).toBe(url(FIRST));
    expect(requested()).toBe(3);
    await advance(30000); expect(requested()).toBe(3);
  });

  it('uses bounded 5/10/20/30-second retries rather than a render-driven loop', async () => {
    let tries = 0;
    io.handlers.set(FIRST, async () => ++tries < 5 ? null : url(FIRST));
    const view = render(<StillFrame id={FIRST} />); await flush();
    for (const [n, delay] of [5000, 10000, 20000, 30000].entries()) {
      await advance(delay - 1); expect(requested()).toBe(n + 1);
      await advance(1); expect(requested()).toBe(n + 2);
    }
    expect(image(view.container)?.getAttribute('src')).toBe(url(FIRST));
    await advance(60000); expect(requested()).toBe(5);
  });

  it('invalidates a displayed img error and recovers the same URL after fresh demand loading', async () => {
    const view = render(<StillFrame id={FIRST} />); await flush();
    expect(image(view.container)?.getAttribute('src')).toBe(url(FIRST));
    fireEvent.error(image(view.container)!); await flush();
    expect(io.forget).toHaveBeenCalledWith(FIRST);
    expect(image(view.container)).toBeNull();
    await advance(5000);
    expect(image(view.container)?.getAttribute('src')).toBe(url(FIRST));
    expect(requested()).toBe(2);
  });

  it('a late previous-id result cannot replace the new still', async () => {
    const late = deferred(); io.handlers.set(FIRST, () => late.promise);
    const view = render(<StillFrame id={FIRST} />); await flush();
    view.rerender(<StillFrame id={LAST} />); await flush();
    expect(image(view.container)?.getAttribute('src')).toBe(url(LAST));
    await act(async () => { late.resolve(url(FIRST)); }); await flush();
    expect(view.getByTestId('still-frame').getAttribute('data-art-id')).toBe(LAST);
    expect(image(view.container)?.getAttribute('src')).toBe(url(LAST));
    await advance(30000); expect(requested()).toBe(1);
  });

  it('cleans up its online listener and timer after unmount while retrying', async () => {
    const add = vi.spyOn(window, 'addEventListener'); const remove = vi.spyOn(window, 'removeEventListener');
    io.handlers.set(FIRST, async () => null);
    const view = render(<StillFrame id={FIRST} />); await flush(); view.unmount();
    const calls = requested();
    await act(async () => { window.dispatchEvent(new Event('online')); }); await advance(60000);
    expect(requested()).toBe(calls);
    const installed = add.mock.calls.filter(([type]) => type === 'online');
    expect(installed).toHaveLength(1);
    expect(remove.mock.calls.some(([type, fn]) => type === 'online' && fn === installed[0][1])).toBe(true);
  });

  it('contains a late rejection after unmount without starting another request', async () => {
    const late = deferred(); io.handlers.set(FIRST, () => late.promise);
    const view = render(<StillFrame id={FIRST} />); await flush(); view.unmount();
    await act(async () => { late.reject(new Error('late decode failure')); }); await flush();
    await advance(60000); expect(requested()).toBe(1);
  });

  it('keeps next-still prefetch best-effort and contains its rejection', async () => {
    io.handlers.set('art.pro.dark', async () => { throw new Error('prefetch unavailable'); });
    const view = render(<StillFrame id={FIRST} />); await flush();
    expect(image(view.container)?.getAttribute('src')).toBe(url(FIRST));
    expect(requested('art.pro.dark')).toBe(1);
    await advance(30000); expect(requested('art.pro.dark')).toBe(1);
  });

  it.each(['art.pro.storm','art.pro.dark','art.pro.break','art.pro.tide','art.mem.rain','art.mem.kitten','art.mem.cloak'] as StillId[])('preserves DOM and art identity for %s', async (id) => {
    const view = render(<StillFrame id={id} />); await flush();
    expect(image(view.container)?.getAttribute('src')).toBe(url(id));
    expect(image(view.container)?.getAttribute('draggable')).toBe('false');
    expect(view.getByTestId('still-frame').getAttribute('data-placeholder')).toBe('art');
    expect(view.getByTestId('still-frame').getAttribute('data-motif')).toBeTruthy();
  });
});
