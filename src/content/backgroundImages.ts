import { decodeAssetUrl } from './decodedImage';

type Connection = { saveData?: boolean; effectiveType?: string; downlink?: number };
export function canWarmImages(connection?: Connection): boolean {
  return !connection?.saveData && !['slow-2g', '2g', '3g'].includes(connection?.effectiveType ?? '')
    && !(connection?.downlink !== undefined && connection.downlink < 1.5);
}

/** Warm the browser cache after the visible scene has settled. One low-priority
 * image at a time; no speculative GPU uploads, and no queued work after leaving. */
export function warmSceneImages(
  urls: readonly (string | undefined)[],
  isCurrent: () => boolean,
  foregroundBusy: () => boolean,
  load = (url: string) => decodeAssetUrl(url, { priority: 'low' }),
): () => void {
  const connection = () => (navigator as Navigator & { connection?: Connection }).connection;
  if (!canWarmImages(connection())) return () => {};
  const queue = [...new Set(urls.filter((url): url is string => !!url))];
  let stopped = false;
  let timer: ReturnType<typeof setTimeout>;
  let idle: number | undefined;
  function active() { return !stopped && isCurrent() && canWarmImages(connection()); }
  function next() {
    if (!active() || !queue.length) return;
    if (document.hidden || foregroundBusy()) { timer = setTimeout(next, 500); return; }
    const run = () => {
      idle = undefined;
      if (!active()) return;
      if (document.hidden || foregroundBusy()) { timer = setTimeout(next, 500); return; }
      void load(queue.shift()!).catch(() => undefined).finally(() => {
        if (active()) timer = setTimeout(next, 500);
      });
    };
    if (window.requestIdleCallback) idle = window.requestIdleCallback(run, { timeout: 1500 });
    else run();
  }
  timer = setTimeout(next, 2000);
  return () => {
    stopped = true;
    clearTimeout(timer);
    if (idle !== undefined) window.cancelIdleCallback(idle);
  };
}
