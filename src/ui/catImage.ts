const cache = new Map<string, Promise<string>>();

/**
 * Load a cat frame through fetch, then a blob URL.
 * A direct <img> GET of the shore landings has failed with HTTP/2 in playtests;
 * a second fetch with a reload bypasses a bad cached response.
 */
export function loadCatSrc(src: string): Promise<string> {
  const hit = cache.get(src);
  if (hit) return hit;
  const job = fetchCat(src);
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
