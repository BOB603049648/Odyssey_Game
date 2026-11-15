import { loadSlotAsset, resolveSlotAsset } from './slotAssets';
import { loadTraj, trajUrl } from '../ui/trajArt';
import { loadFrame, frameUrl } from '../ui/travelerArt';

export function loadNamedAsset(id: string): Promise<string | null> {
  if (id.endsWith('.png') || id.endsWith('.webp') || id.startsWith('idle-') || id.startsWith('walk-') || id.startsWith('reach-')) {
    return loadFrame(id).then((url) => url || null);
  }
  if (id.startsWith('land-') || id.startsWith('leap-') || id.startsWith('pose-')) {
    return loadTraj(id);
  }
  return loadSlotAsset(id);
}

/** Readiness checks after recovery must not start more requests. */
export function resolveNamedAsset(id: string): string | null {
  if (id.endsWith('.png') || id.endsWith('.webp') || id.startsWith('idle-') || id.startsWith('walk-') || id.startsWith('reach-')) {
    return frameUrl(id) ?? null;
  }
  if (id.startsWith('land-') || id.startsWith('leap-') || id.startsWith('pose-')) return trajUrl(id) ?? null;
  return resolveSlotAsset(id);
}
