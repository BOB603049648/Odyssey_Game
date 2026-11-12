import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { IMAGE_TIMEOUT_MS, decodeImage } from './decodedImage';
import {
  LOAD_ATTEMPTS,
  loadGated,
  resetLoadGateForTests,
  setLoadRetryDelayForTests,
} from './loadGate';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

beforeEach(() => {
  resetLoadGateForTests();
  setLoadRetryDelayForTests(() => 0);
});

type Mode = 'ok' | 'fail' | 'hang';

function stubBitmap(control: { mode: Mode; srcSets: string[] }) {
  vi.stubGlobal(
    'Image',
    class {
      decode = vi.fn().mockResolvedValue(undefined);
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(url: string) {
        control.srcSets.push(url);
        if (control.mode === 'ok') queueMicrotask(() => this.onload?.());
        if (control.mode === 'fail') queueMicrotask(() => this.onerror?.());
      }
    },
  );
}

async function loadDecoded(key: string, url: string, cache: Map<string, string>) {
  return loadGated(key, 'shell', () => decodeImage(url), cache, { cacheKey: key });
}

describe('bitmap load/decode recovery (not just URL resolve)', () => {
  it('after the first request fails, a later call of the same URL downloads again and succeeds', async () => {
    const cache = new Map<string, string>();
    const control = { mode: 'fail' as Mode, srcSets: [] as string[] };
    stubBitmap(control);
    const urls = [
      'https://example.test/art.shore.ground.jpg',
      'https://example.test/art.shore.building.webp',
      'https://example.test/land-shore-driftwood.webp',
      'https://example.test/idle-front-01.webp',
    ];

    for (const url of urls) {
      const failed = await loadDecoded(url, url, cache);
      expect(failed, url).toBeNull();
      expect(cache.has(url), url).toBe(false);
    }
    const failedSets = control.srcSets.length;
    expect(failedSets).toBe(urls.length * LOAD_ATTEMPTS);

    control.mode = 'ok';
    for (const url of urls) {
      const recovered = await loadDecoded(url, url, cache);
      expect(recovered, url).toBe(url);
      expect(cache.get(url), url).toBe(url);
    }
    expect(control.srcSets.length).toBe(failedSets + urls.length);
  });

  it('a hung Image/load/decode fails in a bounded time, then a later same-URL call succeeds', async () => {
    vi.useFakeTimers();
    const cache = new Map<string, string>();
    const control = { mode: 'hang' as Mode, srcSets: [] as string[] };
    stubBitmap(control);
    const url = 'https://example.test/art.shore.building.webp';
    const first = loadDecoded(url, url, cache);
    const pending = expect(first).resolves.toBeNull();
    await vi.advanceTimersByTimeAsync(IMAGE_TIMEOUT_MS * LOAD_ATTEMPTS);
    await pending;
    expect(cache.has(url)).toBe(false);
    expect(control.srcSets.length).toBe(LOAD_ATTEMPTS);

    vi.useRealTimers();
    control.mode = 'ok';
    const second = await loadDecoded(url, url, cache);
    expect(second).toBe(url);
    expect(control.srcSets.length).toBe(LOAD_ATTEMPTS + 1);
  });

  it('a hanging in-flight load is shared, then after it settles a new call starts a new Image', async () => {
    vi.useFakeTimers();
    const cache = new Map<string, string>();
    const control = { mode: 'hang' as Mode, srcSets: [] as string[] };
    stubBitmap(control);
    const url = 'https://example.test/art.shore.ground.jpg';
    const a = loadDecoded(url, url, cache);
    const b = loadDecoded(url, url, cache);
    await Promise.resolve();
    expect(control.srcSets.length).toBe(1);
    const done = Promise.all([expect(a).resolves.toBeNull(), expect(b).resolves.toBeNull()]);
    await vi.advanceTimersByTimeAsync(IMAGE_TIMEOUT_MS * LOAD_ATTEMPTS);
    await done;
    expect(control.srcSets.length).toBe(LOAD_ATTEMPTS);

    vi.useRealTimers();
    control.mode = 'ok';
    expect(await loadDecoded(url, url, cache)).toBe(url);
    expect(control.srcSets.length).toBe(LOAD_ATTEMPTS + 1);
  });

  it('characterizes the official wrapper-only run: a resolved URL is cached even when no bitmap Image was created', async () => {
    const cache = new Map<string, string>();
    const control = { mode: 'fail' as Mode, srcSets: [] as string[] };
    stubBitmap(control);
    const url = 'https://example.test/idle-front-01.png';
    const officialStyle = await loadGated('frame:idle-front-01.png', 'idle', async () => url, cache, {
      cacheKey: 'idle-front-01.png',
    });
    expect(officialStyle).toBe(url);
    expect(cache.get('idle-front-01.png')).toBe(url);
    expect(control.srcSets).toEqual([]);
    // A later loadGated call hits that cache and still does not download the bitmap.
    const later = await loadGated('frame:idle-front-01.png', 'idle', async () => {
      throw new Error('should not run');
    }, cache, { cacheKey: 'idle-front-01.png' });
    expect(later).toBe(url);
    expect(control.srcSets).toEqual([]);
  });
});
