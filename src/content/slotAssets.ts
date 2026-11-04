/**
 * Scene art is fetched when a frame asks for it. The opening route
 * (title → new game → shore) must not reference the rest of the island.
 * Shore entry asks for sky, ground, building, and fg before props.
 */
import { loadGated, partitionSceneAssets, slotLoadTier } from './loadGate';

const loaders = import.meta.glob<string>('../assets/art/slots/*.{png,webp,jpg,jpeg}', {
  import: 'default',
});

function idOf(path: string): string {
  return path.split('/').pop()!.replace(/\.(png|webp|jpe?g)$/, '');
}

const byId = new Map<string, () => Promise<string>>();
for (const [path, loader] of Object.entries(loaders)) {
  const id = idOf(path);
  const current = byId.get(id);
  if (current && !path.endsWith('.webp')) continue;
  byId.set(id, loader as () => Promise<string>);
}

/** Ids the content check can see without downloading the files. */
export const SLOT_ASSETS: Record<string, true> = Object.fromEntries([...byId.keys()].map((id) => [id, true]));

const cache = new Map<string, string>();

export function resolveSlotAsset(asset: string | null): string | null {
  if (!asset) return null;
  return cache.get(asset) ?? null;
}

export function loadSlotAsset(asset: string | null): Promise<string | null> {
  if (!asset) return Promise.resolve(null);
  const hit = cache.get(asset);
  if (hit) return Promise.resolve(hit);
  const loader = byId.get(asset);
  if (!loader) return Promise.resolve(null);
  const tier = slotLoadTier(asset) ?? 'shell';
  return loadGated(`slot:${asset}`, tier, () => loader(), cache, { cacheKey: asset });
}

export function preloadSceneAssets(ids: readonly (string | null | undefined)[]): void {
  const { shell, props } = partitionSceneAssets(ids);
  for (const id of shell) void loadSlotAsset(id);
  for (const id of props) void loadSlotAsset(id);
}

if (import.meta.env.MODE === 'test') {
  await Promise.all([...byId.keys()].map((id) => loadSlotAsset(id)));
}
