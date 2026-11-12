type Listener = () => void;
const listeners = new Set<Listener>();

export function notifyAssetUpdates(): void {
  for (const listener of [...listeners]) listener();
}

export function subscribeAssetUpdates(listener: Listener): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
