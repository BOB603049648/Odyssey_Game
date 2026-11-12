import { useCallback, useLayoutEffect, useMemo, useRef, useSyncExternalStore, type SyntheticEvent } from 'react';
import { subscribeAssetUpdates } from '../content/assetUpdates';
import { forgetCatSrc } from './catImage';
import { useAssetSrc, type AssetSrcApi, type RecoveryLifecycle, type RecoveryReceipt } from './useAssetSrc';

export type CatRecoveryBinding = {
  scene: string;
  kind: 'traj' | 'slot';
  id: string;
  originalURL: string;
  api: AssetSrcApi;
};
type Phase = 'active' | 'pendingConsumer' | 'invalidating' | 'awaitingDecode';
type Snapshot = Readonly<{
  binding: CatRecoveryBinding | null;
  key: string;
  recordEpoch: number;
  imageEpoch: number;
  failureSerial: number;
  phase: Phase;
  version: number;
}>;
type NodeLease = {
  node: HTMLImageElement;
  key: string;
  image: number;
  record: number | null;
  attached: boolean;
  staged?: string;
};
type Command = {
  node: NodeLease;
  source: string;
  record: number;
  image: number;
  serial: number;
  empty: boolean;
  ready: boolean;
  accepted: boolean;
};
const EMPTY_API: AssetSrcApi = { resolve: () => null, load: async () => null };
const bindingKey = (b: CatRecoveryBinding | null) => b ? JSON.stringify([b.scene, b.kind, b.id, b.originalURL]) : '';
const absolute = (url: string) => new URL(url, document.baseURI).href;

/** One cat instance only: no resource loader, timer, or render-time side effects. */
export function createCatRecordRecovery() {
  let state: Snapshot = Object.freeze({ binding: null, key: '', recordEpoch: 0, imageEpoch: 0, failureSerial: 0, phase: 'active', version: 0 });
  const listeners = new Set<() => void>();
  const nodes = new WeakMap<HTMLImageElement, NodeLease>();
  let currentNode: NodeLease | null = null;
  let command: Command | null = null;
  let receipt: RecoveryReceipt | null = null;
  let connection: symbol | null = null;

  function publish(patch: Partial<Snapshot>) {
    state = Object.freeze({ ...state, ...patch, version: state.version + 1 });
    for (const listener of [...listeners]) listener();
  }
  function validFailure(node: NodeLease, source: string) {
    const img = node.node;
    const native = img.currentSrc || img.getAttribute('src');
    const requested = img.getAttribute('src');
    return node === currentNode && node.attached && img.isConnected && !!native && !!requested
      && absolute(native) === source && absolute(requested) === source
      && !(img.complete && img.naturalWidth > 0);
  }
  function matches(c: Command) {
    return command === c && c.record === state.recordEpoch && c.image === state.imageEpoch;
  }
  function confirm(c: Command) {
    if (!matches(c) || !c.accepted || state.phase !== 'awaitingDecode' || !c.empty || !c.ready) return;
    command = null;
    publish({ phase: 'active', imageEpoch: state.imageEpoch + 1 });
  }
  function observe() {
    const c = command, b = state.binding;
    if (!c || !b || !matches(c) || (state.phase !== 'invalidating' && state.phase !== 'awaitingDecode')) return;
    const url = b.api.resolve(b.id);
    if (!url) { c.empty = true; c.ready = false; }
    else if (c.empty) c.ready = url === b.originalURL;
    // Reentrant notifications only record facts while the invalidation is open.
    if (state.phase === 'awaitingDecode') confirm(c);
  }
  function cancel(c: Command) {
    if (!matches(c)) return;
    command = null;
    publish({ phase: 'active' });
  }
  function flush() {
    const c = command, b = state.binding, r = receipt;
    if (!c || !b || c.accepted || !matches(c) || state.phase !== 'pendingConsumer' || !connection) return;
    if (!validFailure(c.node, c.source)) { cancel(c); return; }
    if (!r || r.id !== b.id || r.loadIdentity !== b.api.load) return;
    c.empty = false; c.ready = false;
    publish({ phase: 'invalidating' });
    observe(); // Also witnesses an already empty cache that emits no forget notice.
    const accepted = r.invalidate(`${c.record}:${c.serial}`);
    if (!matches(c)) return;
    if (accepted === 'retired') { publish({ phase: 'pendingConsumer' }); return; }
    c.accepted = true;
    // A rejected/retired receipt must never clear the blob, and a nested ready
    // notification must not publish a new image before this cleanup completes.
    forgetCatSrc(b.originalURL);
    observe();
    if (!matches(c)) return;
    publish({ phase: 'awaitingDecode' });
    confirm(c);
  }
  function promote(node: NodeLease, source: string) {
    if (node.record !== state.recordEpoch || node.key !== state.key || node.image !== state.imageEpoch
      || state.phase !== 'active' || !validFailure(node, source)) return;
    command = { node, source, record: state.recordEpoch, image: state.imageEpoch, serial: state.failureSerial + 1, empty: false, ready: false, accepted: false };
    publish({ phase: 'pendingConsumer', failureSerial: command.serial });
    flush();
  }
  const lifecycle: RecoveryLifecycle = {
    connected: (next) => { receipt = next; flush(); },
    retired: (lease) => { if (receipt?.lease === lease) receipt = null; },
  };
  return {
    getSnapshot: () => state,
    subscribe: (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; },
    lifecycle,
    connect: () => {
      const lease = Symbol('cat-asset-observer');
      connection = lease;
      const stop = subscribeAssetUpdates(() => { if (connection === lease) observe(); });
      observe(); // Subscribe first; only a witnessed pending cycle can reconcile.
      flush();
      return () => { if (connection === lease) connection = null; stop(); };
    },
    attach: (node: HTMLImageElement, key: string, image: number) => {
      let lease = nodes.get(node);
      if (!lease || lease.key !== key || lease.image !== image) {
        lease = { node, key, image, record: null, attached: true };
        nodes.set(node, lease);
      }
      lease.attached = true;
      // A same-record view may remount without rerunning the parent's unchanged
      // semantic layout effect. This ref itself is a real commit, not a render.
      lease.record = key === state.key && image === state.imageEpoch ? state.recordEpoch : null;
      currentNode = lease;
      if (command && !command.accepted && command.node !== lease) cancel(command);
      return lease;
    },
    detach: (node: NodeLease) => { node.attached = false; if (currentNode === node) currentNode = null; },
    commit: (binding: CatRecoveryBinding | null) => {
      const key = bindingKey(binding);
      if (key !== state.key) {
        command = null;
        publish({ binding, key, recordEpoch: state.recordEpoch + 1, imageEpoch: 0, phase: 'active' });
      }
      const node = currentNode;
      if (node && node.key === key && node.image === state.imageEpoch) {
        node.record = state.recordEpoch;
        const staged = node.staged;
        node.staged = undefined;
        if (staged) promote(node, staged);
      }
      flush();
    },
    error: (image: HTMLImageElement) => {
      const node = currentNode;
      if (!node || node.node !== image) return;
      const native = image.currentSrc || image.getAttribute('src');
      if (!native) return;
      const source = absolute(native);
      if (!validFailure(node, source)) return;
      if (node.record === null) { node.staged ??= source; return; }
      promote(node, source);
    },
  };
}

/** Actual consumer follows committed binding, not the speculative chosen record. */
export function useCatRecordRecovery(candidate: CatRecoveryBinding | null, commitSelected: () => void) {
  const instance = useRef<ReturnType<typeof createCatRecordRecovery> | null>(null);
  if (!instance.current) instance.current = createCatRecordRecovery();
  const owner = instance.current;
  const snapshot = useSyncExternalStore(owner.subscribe, owner.getSnapshot);
  const key = bindingKey(candidate);
  const intent = key === snapshot.key ? snapshot.imageEpoch : 0;
  useLayoutEffect(owner.connect, [owner]);
  useAssetSrc(snapshot.binding?.id, snapshot.binding?.api ?? EMPTY_API, owner.lifecycle);
  useLayoutEffect(() => { commitSelected(); owner.commit(candidate); }, [owner, key, intent]);
  const imageRef = useMemo(() => {
    let attached: NodeLease | null = null;
    return (node: HTMLImageElement | null) => {
      if (node) attached = owner.attach(node, key, intent);
      else if (attached) { owner.detach(attached); attached = null; }
    };
  }, [owner, key, intent]);
  const onError = useCallback((event: SyntheticEvent<HTMLImageElement>) => owner.error(event.currentTarget), [owner]);
  return { imageRef, onError, revision: intent, imageKey: JSON.stringify([key, intent]) };
}
