import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { useFeedbackFx } from './useFeedbackFx';
import type { SaveData } from '../core/schema';
vi.mock('../audio/placeholder', () => ({ playPurr: vi.fn(), playThunk: vi.fn() }));
afterEach(() => vi.useRealTimers());

it('releases both visual effects after quickly alternating wrong and right answers', () => {
  vi.useFakeTimers();
  const view = renderHook(({ feedback }) => useFeedbackFx(feedback), { initialProps: { feedback: { seq: 0, kind: 'none' } as SaveData['feedback'] } });
  view.rerender({ feedback: { seq: 1, kind: 'no' } });
  expect(view.result.current.shake).toBe(true);
  act(() => vi.advanceTimersByTime(50));
  view.rerender({ feedback: { seq: 2, kind: 'ok' } });
  expect(view.result.current).toEqual({ shake: false, purr: true });
  act(() => vi.advanceTimersByTime(50));
  view.rerender({ feedback: { seq: 3, kind: 'no' } });
  expect(view.result.current).toEqual({ shake: true, purr: false });
  act(() => vi.advanceTimersByTime(600));
  expect(view.result.current).toEqual({ shake: false, purr: false });
});
