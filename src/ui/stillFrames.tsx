import { useEffect, useState } from 'react';
import { loadSlotAsset, resolveSlotAsset } from '../content/slotAssets';

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
  const [src, setSrc] = useState(() => resolveSlotAsset(id));
  useEffect(() => {
    let live = true;
    const order = Object.keys(MOTIF) as StillId[];
    const next = order[order.indexOf(id) + 1];
    loadSlotAsset(id).then((url) => {
      if (live) setSrc(url);
    });
    if (next) void loadSlotAsset(next);
    return () => {
      live = false;
    };
  }, [id]);
  return (
    <div className="plate-still" data-testid="still-frame" data-art-id={id} data-motif={MOTIF[id]} data-placeholder={src ? 'art' : 'block'}>
      {src ? <img src={src} alt="" draggable={false} /> : null}
    </div>
  );
}
