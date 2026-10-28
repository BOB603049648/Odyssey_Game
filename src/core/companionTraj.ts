import type { CatBeat } from './companionPost';

/** Landing frames hold the opaque foot 18px above the 1152 canvas bottom. */
export const TRAJ_FOOT = { x: 0.5, y: 1144 / 1152 } as const;

export const LEAP_01_MS = 240;
export const LEAP_02_MS = 240;

export type TrajClip = 'leap-01' | 'leap-02' | 'land';

/** Beat → landing file. Missing beats fall back to the scene prop. */
export const LAND_BY_BEAT: Partial<Record<CatBeat, string>> = {
  S0: 'land-shore-driftwood',
  S1: 'land-shore-gourd',
  S2: 'land-shore-east-gap',
  C2: 'land-camp-sleep-mat',
  C3: 'land-camp-fireside',
  /* Bag-free give pose. Paws are the canvas bottom-center; the sack is gone. */
  Y0: 'land-yard-give',
};

/** On a beat change: leap-01, then leap-02, then the landing. First paint stays on land. */
export function trajClip(elapsedMs: number): TrajClip {
  if (elapsedMs < LEAP_01_MS) return 'leap-01';
  if (elapsedMs < LEAP_01_MS + LEAP_02_MS) return 'leap-02';
  return 'land';
}

export function companionFrameId(beat: CatBeat, clip: TrajClip): string {
  if (clip === 'leap-01') return 'leap-01';
  if (clip === 'leap-02') return 'leap-02';
  return LAND_BY_BEAT[beat] ?? 'fallback';
}
