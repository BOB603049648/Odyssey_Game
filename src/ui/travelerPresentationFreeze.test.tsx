import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { TravelerMark } from './Traveler';
import { ShoreVisualSample } from '../dev/ShoreVisualSample';

// The motion hook must run its real production RAF branch. Only the bitmap/canvas
// operation is stubbed: jsdom has no real image decoding, so preserve URL identity.
vi.mock('./hemPunch', async () => ({ ...await vi.importActual('./hemPunch'), punchHemUrl: async (src: string) => src }));
let now = 0;
let id = 0;
let queued = new Map<number, FrameRequestCallback>();
beforeEach(() => {
  vi.stubEnv('MODE', 'production');
  now = 0; id = 0; queued = new Map();
  vi.spyOn(performance, 'now').mockImplementation(() => now);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(cb => { const key = ++id; queued.set(key, cb); return key; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(key => { queued.delete(key); });
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllEnvs(); });
async function settle() { await act(async () => { await Promise.resolve(); }); }
async function frames(count: number, read: () => void) {
  for (let i = 0; i < count; i++) {
    now += 1000 / 60;
    const callbacks = [...queued.values()]; queued.clear();
    await act(async () => { callbacks.forEach(cb => cb(now)); await Promise.resolve(); });
    read();
  }
}
function current() {
  const mark = screen.getByTestId('traveler');
  return { frame: mark.dataset.frame, pose: mark.dataset.pose, src: mark.querySelector('[data-layer="current"]')?.getAttribute('src'), crossfade: mark.dataset.crossfade };
}

describe('presentation freeze against real production RAF', () => {
  it('keeps actual fixture pose/frame/src fixed for six simulated seconds without stopping sole/global RAF or storage isolation', async () => {
    const get = vi.spyOn(Storage.prototype, 'getItem'); const set = vi.spyOn(Storage.prototype, 'setItem');
    render(<ShoreVisualSample profile={{ variant:'baseline', fixture:'shore-spawn', cat:'S0' }} />);
    await settle(); const first = current();
    expect(first.src).toBeTruthy(); expect(first.frame).toBe('0');
    const observed = new Set<string>();
    await frames(360, () => observed.add(JSON.stringify(current())));
    expect(observed).toEqual(new Set([JSON.stringify(first)]));
    expect(first.crossfade).toBe('no');
    expect(screen.getByTestId('traveler').querySelector<HTMLElement>('.traveler-bob')?.style.animation).toBe('none');
    expect(queued.size, 'WalkLayer sole/asset RAF remains live').toBeGreaterThan(0);
    expect(get).not.toHaveBeenCalled(); expect(set).not.toHaveBeenCalled();
  });
  it('keeps ordinary traveler idle animation advancing by default on the same production RAF path', async () => {
    render(<TravelerMark x={.42} y={.62} facing="front" moving={false} />);
    await settle(); const seen = new Set<string>(); const urls = new Set<string>();
    await frames(360, () => { seen.add(current().frame!); urls.add(current().src!); });
    expect(seen.size).toBeGreaterThan(1); expect(urls.size).toBeGreaterThan(1);
    expect(queued.size).toBeGreaterThan(0);
  });
  it('stops an existing motion/crossfade when frozen and resumes RAF when released', async () => {
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
    const view = render(<TravelerMark x={.42} y={.62} facing="front" moving={false} />);
    await settle(); await frames(100, () => {});
    expect(current().frame).toBe('1'); expect(current().crossfade).toBe('yes');
    view.rerender(<TravelerMark x={.42} y={.62} facing="front" moving={false} presentationFrozen />);
    await settle(); const frozen = current();
    expect(frozen.frame).toBe('0'); expect(frozen.crossfade).toBe('no');
    await frames(180, () => expect(current()).toEqual(frozen));
    view.rerender(<TravelerMark x={.42} y={.62} facing="front" moving={false} />);
    const seen = new Set<string>(); await frames(180, () => seen.add(current().frame!));
    expect(seen.size).toBeGreaterThan(1);
  });
});
