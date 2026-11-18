import { afterEach, describe, expect, it, vi } from 'vitest';
import { canWarmImages, warmSceneImages } from './backgroundImages';

afterEach(() => { vi.useRealTimers(); vi.restoreAllMocks(); });
describe('background image warmup', () => {
  it('does not speculate on a metered or slow connection', () => {
    expect(canWarmImages({ saveData: true })).toBe(false);
    expect(canWarmImages({ effectiveType: '3g' })).toBe(false);
    expect(canWarmImages({ effectiveType: '2g' })).toBe(false);
    expect(canWarmImages({ downlink: 0.5 })).toBe(false);
    expect(canWarmImages({ effectiveType: '4g', downlink: 10 })).toBe(true);
    expect(canWarmImages()).toBe(true);
  });
  it('waits for the visible scene and lets only one image transfer at a time', async () => {
    vi.useFakeTimers();
    let busy = true;
    let resolve!: (url: string) => void;
    const load = vi.fn(() => new Promise<string>(r => { resolve = r; }));
    const stop = warmSceneImages(['a', 'a', undefined, 'b'], () => true, () => busy, load);
    await vi.advanceTimersByTimeAsync(2000);
    expect(load).not.toHaveBeenCalled();
    busy = false;
    await vi.advanceTimersByTimeAsync(500);
    expect(load.mock.calls).toEqual([['a']]);
    await vi.advanceTimersByTimeAsync(5000);
    expect(load).toHaveBeenCalledTimes(1);
    resolve('a');
    await vi.advanceTimersByTimeAsync(500);
    expect(load.mock.calls).toEqual([['a'], ['b']]);
    stop();
    resolve('b');
  });
  it('drops queued requests when the player changes scene', async () => {
    vi.useFakeTimers();
    let current = true;
    const load = vi.fn(async () => { current = false; return 'ok'; });
    warmSceneImages(['a', 'b'], () => current, () => false, load);
    await vi.advanceTimersByTimeAsync(5000);
    expect(load.mock.calls).toEqual([['a']]);
  });
  it('cancels before downloading and tolerates an optional image failure', async () => {
    vi.useFakeTimers();
    const load = vi.fn().mockRejectedValueOnce(new Error('offline')).mockResolvedValue('b');
    const stop = warmSceneImages(['cancelled'], () => true, () => false, load);
    stop();
    await vi.advanceTimersByTimeAsync(5000);
    expect(load).not.toHaveBeenCalled();
    const cancel = warmSceneImages(['a', 'b'], () => true, () => false, load);
    await vi.advanceTimersByTimeAsync(3000);
    expect(load.mock.calls).toEqual([['a'], ['b']]);
    cancel();
  });
});
