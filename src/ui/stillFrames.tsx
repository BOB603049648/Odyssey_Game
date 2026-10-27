import { SLOT_ASSETS } from '../content/slotAssets';

const MOTIF = {
  'art.pro.storm': 'wreck',
  'art.pro.dark': 'eyes',
  'art.pro.break': 'scroll-break',
  'art.pro.tide': 'follow-step',
} as const;

export type StillId = keyof typeof MOTIF;

export function isStillId(plate: string): plate is StillId {
  return plate in MOTIF;
}

export function StillFrame({ id }: { id: StillId }) {
  return (
    <div className="plate-still" data-testid="still-frame" data-art-id={id} data-motif={MOTIF[id]} data-placeholder="art">
      <img src={SLOT_ASSETS[id]} alt="" draggable={false} />
    </div>
  );
}
