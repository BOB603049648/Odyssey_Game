import { afterEach, expect, it, vi } from 'vitest';
import { loadCatSrc } from './catImage';
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });
it('preserves original reproduction: failed cat fallback is not cached, later same URL fetch recovers', async () => {
  const url = '/assets/cat-failed-cache-regression.webp';
  const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
  vi.stubGlobal('fetch', fetcher);
  Object.defineProperty(URL, 'createObjectURL', { configurable: true, value: vi.fn(() => 'blob:recovered') });
  expect(await loadCatSrc(url)).toBe(url);
  expect(fetcher).toHaveBeenCalledTimes(2);
  fetcher.mockResolvedValue({ ok: true, blob: async () => new Blob(['a'.repeat(64)]) });
  expect(await loadCatSrc(url)).toBe('blob:recovered');
  expect(fetcher).toHaveBeenCalledTimes(3);
  expect(await loadCatSrc(url)).toBe('blob:recovered');
  expect(fetcher).toHaveBeenCalledTimes(3);
});
it('shares concurrent cat attempts and settles all failures without unhandled rejections', async () => {
  const fetcher = vi.fn().mockRejectedValue(new Error('offline'));
  vi.stubGlobal('fetch', fetcher);
  const url = '/assets/cat-concurrent-regression.webp';
  const first = loadCatSrc(url);
  expect(loadCatSrc(url)).toBe(first);
  expect(await first).toBe(url);
  expect(fetcher).toHaveBeenCalledTimes(2);
  expect(await loadCatSrc(url)).toBe(url);
  expect(fetcher).toHaveBeenCalledTimes(4);
});
