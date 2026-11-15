/** Bound a stalled transfer. A slow 3G fetch of a compressed plate should finish well under this. */
export const IMAGE_TIMEOUT_MS = 20_000;

/**
 * A Vite URL only means the module resolved. Readiness is a loaded, decoded
 * bitmap (or an error / timeout).
 */
export function decodeImage(url: string, options: { timeout?: number; priority?: 'high' | 'low' | 'auto' } = {}): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    let settled = false;
    const timer = window.setTimeout(() => finish(new Error('image timed out')), options.timeout ?? IMAGE_TIMEOUT_MS);

    function finish(error?: Error) {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      image.onload = null;
      image.onerror = null;
      if (error) { image.removeAttribute?.('src'); reject(error); }
      else resolve(url);
    }

    image.onload = () => {
      const decoded = typeof image.decode === 'function' ? image.decode() : Promise.resolve();
      void decoded.then(() => finish()).catch((reason) => {
        finish(reason instanceof Error ? reason : new Error('image decode failed'));
      });
    };
    image.onerror = () => finish(new Error('image failed'));
    image.fetchPriority = options.priority ?? 'auto';
    image.src = url;
  });
}

export function decodeAssetUrl(url: string, options?: Parameters<typeof decodeImage>[1]): Promise<string> {
  if (import.meta.env.MODE === 'test') return Promise.resolve(url);
  return decodeImage(url, options);
}
