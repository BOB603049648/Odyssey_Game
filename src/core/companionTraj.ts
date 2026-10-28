import type { CatBeat } from './companionPost';
import type { Point } from './walk';

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
  /* Default porch beat. The wide camp prop is a fallback and reads empty in the foot box. */
  C1: 'land-camp-fireside',
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

/** Stop, look toward the next mark, then travel. A scene change plants her already looking. */
export const GUIDE_GAZE_MS = 520;
export const GUIDE_ARRIVE = 0.01;
const GUIDE_SPEED = 0.42;

export type GuidePhase = 'hold' | 'gaze' | 'move';

export function nextGuide(input: {
  phase: GuidePhase;
  elapsed: number;
  cat: Point;
  post: Point;
  dt: number;
  retarget: boolean;
  sceneChanged: boolean;
}): { phase: GuidePhase; elapsed: number; cat: Point; moving: boolean } {
  if (input.sceneChanged) {
    return { phase: 'hold', elapsed: 0, cat: { x: input.post.x, y: input.post.y }, moving: false };
  }
  let phase = input.phase;
  let elapsed = input.elapsed;
  let cat = input.cat;
  if (input.retarget) {
    phase = 'gaze';
    elapsed = 0;
  }
  const gap = () => Math.hypot(input.post.x - cat.x, input.post.y - cat.y);
  if (phase === 'hold') {
    if (gap() > GUIDE_ARRIVE) {
      phase = 'gaze';
      elapsed = 0;
    } else {
      return { phase: 'hold', elapsed: 0, cat: { x: input.post.x, y: input.post.y }, moving: false };
    }
  }
  if (phase === 'gaze') {
    const nextElapsed = elapsed + Math.max(0, input.dt) * 1000;
    if (nextElapsed < GUIDE_GAZE_MS) {
      return { phase: 'gaze', elapsed: nextElapsed, cat, moving: false };
    }
    phase = 'move';
    elapsed = nextElapsed - GUIDE_GAZE_MS;
  }
  const distance = gap();
  const step = GUIDE_SPEED * Math.max(0, input.dt);
  if (distance <= GUIDE_ARRIVE || distance <= step) {
    return { phase: 'hold', elapsed: 0, cat: { x: input.post.x, y: input.post.y }, moving: false };
  }
  const scale = step / distance;
  return {
    phase: 'move',
    elapsed: elapsed + Math.max(0, input.dt) * 1000,
    cat: {
      x: cat.x + (input.post.x - cat.x) * scale,
      y: cat.y + (input.post.y - cat.y) * scale,
    },
    moving: true,
  };
}
