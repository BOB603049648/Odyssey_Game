import { trajAssetUrl } from '../content/assetUrls';
import { notifyAssetUpdates } from '../content/assetUpdates';
import { recordLoadTrace } from '../content/loadTrace';
import { decodeAssetUrl } from '../content/decodedImage';
import { loadGated } from '../content/loadGate';

const cache = new Map<string, string>();

export function trajUrl(id: string): string | undefined {
  return cache.get(id);
}

export function forgetTraj(id: string): void {
  recordLoadTrace({ event: 'forget', key: id });
  if (!cache.has(id)) return;
  cache.delete(id);
  notifyAssetUpdates();
}

export function hasTraj(id: string): boolean {
  return Boolean(trajAssetUrl(id));
}

export function loadTraj(id: string): Promise<string | null> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const url = trajAssetUrl(id);
  if (!url) return Promise.resolve(null);
  return loadGated(`traj:${id}`, 'traj', () => decodeAssetUrl(url), cache, { cacheKey: id });
}

if (import.meta.env.MODE === 'test') {
  const modules = import.meta.glob<string>('../assets/companion/nanaicha/traj/*.{png,webp}', {
    eager: true,
    import: 'default',
  });
  const ids = [...new Set(['land-companion', ...Object.keys(modules).map((path) => path.split('/').pop()!.replace(/\.(png|webp)$/, ''))])];
  await Promise.all(ids.map((id) => loadTraj(id)));
}
