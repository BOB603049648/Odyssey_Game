import { useEffect } from 'react';
import { forgetSlotAsset, loadSlotAsset, resolveSlotAsset } from '../content/slotAssets';
import { useAssetSrc } from './useAssetSrc';

const stillAssets = { resolve: resolveSlotAsset, load: loadSlotAsset, forget: forgetSlotAsset };

const MOTIF = {
  'art.pro.storm': 'wreck',
  'art.pro.dark': 'eyes',
  'art.pro.break': 'scroll-break',
  'art.pro.tide': 'follow-step',
  'art.mem.rain': 'rain',
  'art.mem.kitten': 'kitten',
  'art.mem.cloak': 'cloak',
} as const;

export type StillId = keyof typeof MOTIF;

export function isStillId(plate: string): plate is StillId {
  return plate in MOTIF;
}

export function StillFrame({ id }: { id: StillId }) {
  const { src, onError } = useAssetSrc(id, stillAssets);
  useEffect(() => {
    const order = Object.keys(MOTIF) as StillId[];
    const next = order[order.indexOf(id) + 1];
    // Prefetch is best-effort; requested frames recover through useAssetSrc.
    if (next) void loadSlotAsset(next).catch(() => undefined);
  }, [id]);
  return (
    <div className="plate-still" data-testid="still-frame" data-art-id={id} data-motif={MOTIF[id]} data-placeholder={src ? 'art' : 'block'}>
      {src ? <img src={src} alt="" draggable={false} onError={onError} /> : null}
    </div>
  );
}
