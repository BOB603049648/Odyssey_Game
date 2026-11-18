import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, renderHook } from '@testing-library/react';
import { usePrologueSound, useSoundscape } from './useSoundscape';
const mock = vi.hoisted(() => ({ play: vi.fn(), load: vi.fn(), audio: { status: 'ready', muted: false, volume: .7 } }));
vi.mock('./mixer', () => ({ audioSnapshot: () => mock.audio, initializeAudioPreferences: () => {}, subscribeAudio: () => () => {} }));
vi.mock('./sounds', () => ({ playSound: (...args: unknown[]) => mock.play(...args), loadSound: (...args: unknown[]) => mock.load(...args), soundChannel: () => 'ambience' }));
beforeEach(() => { vi.useFakeTimers(); mock.play.mockReset().mockImplementation(() => Promise.resolve({ stop: vi.fn() })); mock.load.mockReset().mockResolvedValue(null); });
afterEach(() => { cleanup(); vi.useRealTimers(); });

describe('soundscape lifecycle', () => {
  it('cleans up a late voice on a fast scene change', async () => {
    let finish!: (voice: { stop: ReturnType<typeof vi.fn> }) => void;
    mock.play.mockImplementationOnce(() => new Promise(done => { finish = done; }));
    const view = renderHook(({ id }: { id: 'storm' | 'memory' }) => useSoundscape(id, true), { initialProps: { id: 'storm' } });
    view.rerender({ id: 'memory' });
    expect(mock.play.mock.calls[0][1].valid()).toBe(false);
    const old = { stop: vi.fn() };
    await act(async () => finish(old));
    expect(old.stop).toHaveBeenCalledWith(0);
  });
  it('retries failed sound without retrying after departure', async () => {
    mock.play.mockResolvedValue(null);
    const view = renderHook(() => useSoundscape('storm', true));
    await act(async () => {});
    expect(view.result.current.status).toBe('failed');
    await act(() => vi.advanceTimersByTimeAsync(5000));
    expect(mock.play).toHaveBeenCalledTimes(2);
    view.unmount();
    await act(() => vi.advanceTimersByTimeAsync(30000));
    expect(mock.play).toHaveBeenCalledTimes(2);
  });
  it('does not repeat the cat on pause/resume, but replays it on revisiting the shot', async () => {
    const time = { current: 0 };
    const view = renderHook(({ step, running }) => usePrologueSound(step, 0, running, time), { initialProps: { step: 1, running: true } });
    await act(() => vi.advanceTimersByTimeAsync(850));
    const calls = () => mock.play.mock.calls.filter(call => call[0] === 'cat-call').length;
    expect(calls()).toBe(1);
    view.rerender({ step: 1, running: false });
    view.rerender({ step: 1, running: true });
    await act(() => vi.advanceTimersByTimeAsync(1000));
    expect(calls()).toBe(1);
    view.rerender({ step: 0, running: true });
    view.rerender({ step: 1, running: true });
    await act(() => vi.advanceTimersByTimeAsync(850));
    expect(calls()).toBe(2);
  });
});

describe('continuous opening audio cuts', () => {
  it('crossfades ambience at a cut but stops promptly for pause and replay', async () => {
    const stops: ReturnType<typeof vi.fn>[] = [];
    mock.play.mockImplementation(() => { const stop = vi.fn(); stops.push(stop); return Promise.resolve({ stop }); });
    const time = { current: 0 };
    const view = renderHook(({ step, take, running }) => usePrologueSound(step, take, running, time),
      { initialProps: { step: 0, take: 0, running: true } });
    await act(async () => {});
    expect(mock.play.mock.calls[0][1].fadeIn).toBe(1.1);
    view.rerender({ step: 1, take: 0, running: true });
    await act(async () => {});
    expect(stops[0]).toHaveBeenCalledWith(1.1);
    view.rerender({ step: 1, take: 0, running: false });
    expect(stops[1]).toHaveBeenCalledWith(.14);
    view.rerender({ step: 1, take: 0, running: true });
    await act(async () => {});
    view.rerender({ step: 0, take: 1, running: true });
    expect(stops[2]).toHaveBeenCalledWith(.14);
  });
});
