import { recordLoadTrace } from '../content/loadTrace';
import { useCallback, useEffect, useState } from 'react';
import { firstScreenAssetIds } from '../content/firstScreen';
import { loadNamedAsset, resolveNamedAsset } from '../content/imageLoad';
import { subscribeAssetUpdates } from '../content/assetUpdates';

export type FirstScreenStatus = 'loading' | 'ready' | 'failed';

export function useFirstScreenReady(scene: string): {
  status: FirstScreenStatus;
  done: number;
  total: number;
  retry: () => void;
} {
  const [tick, setTick] = useState(0);
  const ids = firstScreenAssetIds(scene);
  const key = `${scene}::${tick}`;
  const [status, setStatus] = useState<FirstScreenStatus>('loading');
  const [done, setDone] = useState(0);
  const [activeKey, setActiveKey] = useState(key);

  const retry = useCallback(() => {
    recordLoadTrace({ event: 'retry', key: `first-screen:${scene}` });
    setTick((value) => value + 1);
  }, [scene]);

  useEffect(() => {
    let cancelled = false;
    setActiveKey(key);
    setStatus('loading');
    setDone(0);
    const required = firstScreenAssetIds(scene);
    if (required.length === 0) {
      setStatus('ready');
      return undefined;
    }
    // Mounted image hooks retry failed assets in the background. Their cache
    // updates must also release a previously failed loading overlay; do not
    // leave the repaired scene hidden or launch another batch here.
    const allCached = () => required.every((id) => Boolean(resolveNamedAsset(id)));
    const stop = subscribeAssetUpdates(() => {
      if (cancelled) return;
      if (allCached()) { setDone(required.length); setStatus('ready'); }
      else setStatus((current) => current === 'ready' ? 'failed' : current);
    });
    let finished = 0;
    void Promise.all(
      required.map((id) =>
        loadNamedAsset(id).then((url) => {
          if (!cancelled) {
            finished += 1;
            setDone(finished);
          }
          return url;
        }),
      ),
    ).then((urls) => {
      if (cancelled) return;
      if (urls.every(Boolean) || allCached()) setStatus('ready');
      else setStatus('failed');
    });
    return () => {
      cancelled = true;
      stop();
    };
  }, [key, scene]);

  void activeKey;
  return { status, done, total: ids.length, retry };
}
