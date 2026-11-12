/**
 * Scene art URLs are known at compile time. Bitmaps are fetched when a frame
 * asks for them. The opening route must not reference the rest of the island.
 * Shore entry asks for sky, ground, building, and fg before props.
 */
import { allSlotIds, slotAssetUrl } from './assetUrls';
import { notifyAssetUpdates } from './assetUpdates';
import { recordLoadTrace } from './loadTrace';
import { decodeAssetUrl } from './decodedImage';
import { loadGated, partitionSceneAssets, slotLoadTier } from './loadGate';

const ids = allSlotIds();

/** Ids the content check can see without downloading the files. */
export const SLOT_ASSETS: Record<string, true> = Object.fromEntries(ids.map((id) => [id, true]));

const cache = new Map<string, string>();

export function resolveSlotAsset(asset: string | null): string | null {
  if (!asset) return null;
  return cache.get(asset) ?? null;
}

export function forgetSlotAsset(asset: string): void {
  recordLoadTrace({ event: 'forget', key: asset });
  if (!cache.has(asset)) return;
  cache.delete(asset);
  notifyAssetUpdates();
}

export function loadSlotAsset(asset: string | null): Promise<string | null> {
  if (!asset) return Promise.resolve(null);
  const hit = cache.get(asset);
  if (hit) return Promise.resolve(hit);
  const url = slotAssetUrl(asset);
  if (!url) return Promise.resolve(null);
  const tier = slotLoadTier(asset) ?? 'shell';
  return loadGated(`slot:${asset}`, tier, () => decodeAssetUrl(url), cache, { cacheKey: asset });
}

export function preloadSceneAssets(ids: readonly (string | null | undefined)[]): void {
  const { shell, props } = partitionSceneAssets(ids);
  for (const id of shell) void loadSlotAsset(id);
  for (const id of props) void loadSlotAsset(id);
}

if (import.meta.env.MODE === 'test') {
  await Promise.all(ids.map((id) => loadSlotAsset(id)));
}
