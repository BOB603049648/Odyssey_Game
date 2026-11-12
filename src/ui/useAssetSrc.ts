import { useCallback, useEffect, useRef, useState } from 'react';
import { notifyAssetUpdates, subscribeAssetUpdates } from '../content/assetUpdates';

export { notifyAssetUpdates, subscribeAssetUpdates };

export type AssetSrcApi = {
  resolve: (id: string | null) => string | null;
  load: (id: string | null) => Promise<string | null>;
  forget?: (id: string) => void;
};

/** Internal actual-image handshake; default consumers keep the existing contract. */
export type RecoveryReceipt = {
  lease: symbol;
  id: string | null;
  loadIdentity: AssetSrcApi['load'];
  invalidate: (commandId: string) => 'accepted' | 'retired';
};
export type RecoveryLifecycle = {
  connected: (receipt: RecoveryReceipt) => void;
  retired: (lease: symbol) => void;
};

const RETRY_MIN_MS = 5_000;
const RETRY_MAX_MS = 30_000;

type RecoveryLoad = {
  users: number;
  retryAt: number;
  pending?: Promise<string | null>;
};
const recoveryLoads = new WeakMap<AssetSrcApi['load'], Map<string, RecoveryLoad>>();

function acquireRecovery(load: AssetSrcApi['load'], asset: string) {
  let jobs = recoveryLoads.get(load);
  if (!jobs) { jobs = new Map(); recoveryLoads.set(load, jobs); }
  let job = jobs.get(asset);
  if (!job) { job = { users: 0, retryAt: 0 }; jobs.set(asset, job); }
  job.users += 1;
  const shared = job;
  return {
    load: () => {
      if (shared.pending) return shared.pending;
      // Timer callbacks can run with microtasks BETWEEN them: the first
      // consumer's fast failure may settle before the second timer fires.
      // Keep a short failed-batch cooldown, not just an in-flight promise.
      if (Date.now() < shared.retryAt) return Promise.resolve(null);
      shared.pending = Promise.resolve().then(() => load(asset)).catch(() => null).then((url) => {
        shared.pending = undefined;
        shared.retryAt = url ? 0 : Date.now() + RETRY_MIN_MS;
        return url;
      });
      return shared.pending;
    },
    release: () => { if (--shared.users === 0) jobs.delete(asset); },
  };
}

/**
 * Recover only art still requested by a mounted consumer. Failed batches back
 * off 5/10/20/30s, including when request blocking ends without an online event.
 * The existing loader gate still owns cross-consumer deduplication/concurrency.
 */
export function useAssetSrc(
  id: string | null | undefined,
  api: AssetSrcApi,
  internalLifecycle?: RecoveryLifecycle,
): { src: string | null; onError: () => void } {
  const asset = id || null;
  const apiRef = useRef(api);
  apiRef.current = api;
  const recoveryRef = useRef<{ asset: string | null; invalidate: () => void; forget?: () => void } | null>(null);
  const [src, setSrc] = useState<string | null>(() => api.resolve(asset));

  useEffect(() => {
    // Only the optional consumer is effect-bound; default callers still read apiRef.
    const installedApi = internalLifecycle ? api : null;
    const effectApi = () => installedApi ?? apiRef.current;
    const lifecycle = internalLifecycle;
    const lease = Symbol('asset-consumer');
    let lastCommand: string | undefined;
    const shared = asset ? acquireRecovery(effectApi().load, asset) : null;
    let live = true;
    let current = effectApi().resolve(asset);
    let pending = false;
    let failures = 0;
    let revision = 0;
    let lastAttempt = -Infinity;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let due = Infinity;

    function clearTimer() {
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      due = Infinity;
    }
    function apply(url: string | null) {
      current = url;
      setSrc(url);
      if (url) {
        failures = 0;
        clearTimer();
      }
    }
    function queue(delay: number) {
      if (!live || !asset || current || pending) return;
      const next = Date.now() + delay;
      if (timer !== undefined && due <= next) return;
      clearTimer();
      due = next;
      timer = setTimeout(() => { clearTimer(); void attempt(); }, delay);
    }
    function retryLater() {
      queue(Math.min(RETRY_MAX_MS, RETRY_MIN_MS * 2 ** Math.min(3, Math.max(0, failures - 1))));
    }
    async function attempt() {
      if (!live || !asset || current || pending) return;
      if (navigator.onLine === false) { retryLater(); return; }
      pending = true;
      lastAttempt = Date.now();
      const started = revision;
      let url: string | null = null;
      try {
        url = await shared!.load();
      } catch {
        // Treat unexpected loader rejection like a normal failed batch.
      }
      pending = false;
      if (!live) return;
      if (started === revision) apply(effectApi().resolve(asset) ?? url);
      if (!current) { failures += 1; retryLater(); }
    }
    function invalidate() {
      revision += 1;
      apply(null);
      retryLater();
    }
    function online() {
      // Connectivity events may shorten a long backoff, but never allow more
      // than one batch per 5s or overlap an in-flight load. Repeated events do
      // not keep resetting/postponing an already scheduled retry.
      queue(Math.max(0, RETRY_MIN_MS - (Date.now() - lastAttempt)));
    }

    recoveryRef.current = { asset, invalidate, forget: installedApi && asset ? () => installedApi.forget?.(asset) : undefined };
    const stop = subscribeAssetUpdates(() => {
      const hit = effectApi().resolve(asset);
      if (hit) apply(hit);
      else if (current) invalidate();
    });
    window.addEventListener('online', online);
    apply(current);
    if (!current) void attempt();
    // Do not await the initial attempt, and do not move this before its invocation.
    lifecycle?.connected({
      lease, id: asset, loadIdentity: effectApi().load,
      invalidate: (commandId) => {
        if (!live) return 'retired';
        if (lastCommand === commandId) return 'accepted';
        lastCommand = commandId;
        if (asset) installedApi!.forget?.(asset);
        invalidate();
        return 'accepted';
      },
    });
    return () => {
      live = false;
      lifecycle?.retired(lease);
      clearTimer();
      stop();
      window.removeEventListener('online', online);
      shared?.release();
      recoveryRef.current = null;
    };
  }, [asset, api.load]);

  const onError = useCallback(() => {
    const recovery = recoveryRef.current;
    if (!recovery || recovery.asset !== asset) return;
    if (asset) { if (recovery.forget) recovery.forget(); else apiRef.current.forget?.(asset); }
    recovery.invalidate();
  }, [asset]);

  return { src, onError };
}
