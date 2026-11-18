import { act } from '@testing-library/react';
import { vi } from 'vitest';

/** Drive real cinematic hooks one frame at a time, allowing React to commit
 * each cut. A long fake-timer batch would hide stale effects between frames. */
export function filmClock() {
  let now = 0, sequence = 0;
  const frames = new Map<number, FrameRequestCallback>();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => {
    frames.set(++sequence, callback); return sequence;
  });
  vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id));
  const tick = async (milliseconds: number) => {
    now += milliseconds;
    await act(async () => {
      const pending = [...frames.values()]; frames.clear();
      for (const callback of pending) callback(now);
    });
  };
  return {
    tick,
    async advance(seconds: number) {
      for (let left = Math.round(seconds * 1000); left > 0; left -= 50) await tick(Math.min(left, 50));
    },
    restore() { vi.unstubAllGlobals(); vi.restoreAllMocks(); },
  };
}
