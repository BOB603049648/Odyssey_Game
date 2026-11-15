import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { ACTION_DURATION, REST_HOLD_MS, REST_LOWER_MS, actionPhase, useCharacterAction } from './characterActionTimeline';
import { companionPerformanceFrame, useCompanionPerformance } from './companionPerformance';

let now = 0, serial = 0;
let frames = new Map<number, FrameRequestCallback>();
beforeEach(() => {
  now = 0; serial = 0; frames = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (cb: FrameRequestCallback) => { frames.set(++serial, cb); return serial; });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
});
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllGlobals(); });
async function advance(ms: number) {
  now += ms;
  await act(async () => { const batch = [...frames.values()]; frames.clear(); batch.forEach(cb => cb(now)); });
}
it('keeps one active-time action through a long menu/background pause, resumes and can restart or cancel', async () => {
  const view = renderHook(({active}) => useCharacterAction(active, 'camp'), { initialProps: { active: true } });
  act(() => view.result.current.begin('drink'));
  await advance(600); expect(view.result.current.elapsed).toBe(600);
  view.rerender({ active: false }); await advance(60000);
  expect(view.result.current.elapsed).toBe(600); expect(view.result.current.pose).toBe('drink');
  view.rerender({ active: true }); await advance(400);
  expect(view.result.current.elapsed).toBe(1000);
  const old = view.result.current.sequence;
  act(() => view.result.current.begin('drink'));
  expect(view.result.current.sequence).toBe(old + 1); expect(view.result.current.elapsed).toBe(0);
  act(() => view.result.current.cancel()); expect(view.result.current.pose).toBe('auto');
  await advance(6000); expect(view.result.current.pose).toBe('auto');
});
it('has a seated hold and a separate authored rise, and discards a previous scene action', async () => {
  const view = renderHook(({scene}) => useCharacterAction(true, scene), { initialProps: { scene: 'camp' } });
  act(() => view.result.current.begin('rest'));
  await advance(REST_LOWER_MS); expect(view.result.current.pose).toBe('lie');
  await advance(REST_HOLD_MS); expect(view.result.current.pose).toBe('rise'); expect(view.result.current.elapsed).toBe(0);
  expect(actionPhase('rest', ACTION_DURATION.rest).pose).toBe('auto');
  view.rerender({ scene: 'shore' }); expect(view.result.current.pose).toBe('auto');
});
it('gives the companion distinct observation, indication and settled poses without replaying after pause', async () => {
  expect(companionPerformanceFrame('point', 500)).toBe('pose-point-01');
  expect(companionPerformanceFrame('point', 1100)).toBe('pose-point-02');
  expect(companionPerformanceFrame('rest', 1500)).toBe('pose-curl-02');
  expect(companionPerformanceFrame('rest', 0, true)).toBe('pose-curl-02');
  const view = renderHook(({active}) => useCompanionPerformance('point', active, 1, false), { initialProps: { active: true } });
  await advance(600); expect(view.result.current).toBe('pose-point-01');
  view.rerender({ active: false }); await advance(5000); expect(view.result.current).toBe('pose-point-01');
  view.rerender({ active: true }); await advance(500); expect(view.result.current).toBe('pose-point-02');
});
