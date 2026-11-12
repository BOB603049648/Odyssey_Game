import { registerCatAlias } from './catDisplay';

const cache = new Map<string, Promise<string>>();
const blobs = new Map<string, string>();

/** An error belongs to this original source, including its current blob alias. */
export function forgetCatSrc(src: string): void {
  cache.delete(src);
  const blob = blobs.get(src);
  if (blob && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(blob);
  blobs.delete(src);
}

/**
 * Load a cat frame through fetch, then a blob URL.
 * A direct <img> GET of the shore landings has failed with HTTP/2 in playtests;
 * a second fetch with a reload bypasses a bad cached response.
 */
export function loadCatSrc(src: string): Promise<string> {
  const hit = cache.get(src);
  if (hit) return hit;
  const job = fetchCat(src).then((url) => {
    // A pre-error fetch must not resurrect its obsolete bitmap or cache entry.
    if (cache.get(src) !== job) {
      if (url !== src && typeof URL.revokeObjectURL === 'function') URL.revokeObjectURL(url);
      return src;
    }
    if (url !== src) blobs.set(src, url);
    // A fallback URL is not a recovered blob. Share the current attempt, but
    // let the next caller fetch again after connectivity has returned.
    if (url === src && cache.get(src) === job) cache.delete(src);
    if (url !== src) registerCatAlias(src, url);
    return url;
  }, () => {
    if (cache.get(src) === job) cache.delete(src);
    return src;
  });
  cache.set(src, job);
  return job;
}

async function fetchCat(src: string): Promise<string> {
  if (typeof fetch !== 'function') return src;
  for (const cacheMode of ['default', 'reload'] as const) {
    try {
      const res = await fetch(src, { cache: cacheMode });
      if (!res.ok) continue;
      const blob = await res.blob();
      if (blob.size < 32) continue;
      return URL.createObjectURL(blob);
    } catch {
      /* try the other cache mode */
    }
  }
  return src;
}
