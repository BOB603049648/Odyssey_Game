import { WORLD_SCALE } from './walk';

export type Foot = { x: number; y: number };

/** Bottom-center of the opaque bounds. Never the canvas center. */
export const FOOT_PIVOT = { x: 0.5, y: 1 } as const;

/**
 * Pin an element so `pivot` (default: bottom-center) sits on the world foot.
 * `shift` is an extra transform (parallax), appended after the foot translate.
 */
export function worldToScreen(foot: Foot, pivot: Foot = FOOT_PIVOT, shift = ''): {
  left: string;
  top: string;
  transform: string;
} {
  const transform = `translate(${-pivot.x * 100}%, ${-pivot.y * 100}%)${shift ? ` ${shift}` : ''}`;
  return {
    left: `${foot.x * 100}%`,
    top: `${foot.y * 100}%`,
    transform,
  };
}

/** Placed buildings were authored as box centers. The foot is the bottom of that box. */
export function buildingFoot(slot: { x: number; y: number; h?: number }): Foot {
  return { x: slot.x, y: slot.y + (slot.h ?? 0) / 2 };
}

/** 1 on the ground, 0 in the air. Leap passes lift = 1. */
export function contactOpacity(lift = 0): number {
  const t = Math.min(1, Math.max(0, lift));
  return 1 - t;
}

/**
 * Nearer feet (larger y) read slightly larger. The range stays small so a
 * planted foot, including the yard give claw, does not leave its anchor.
 */
export function depthScale(y: number): number {
  const t = Math.min(1, Math.max(0, (y - 0.42) / 0.52));
  return 0.95 + t * 0.08;
}

/**
 * How far a full-bleed plate must extend, as a fraction of the world,
 * so a camera parked on either edge does not reveal a hard vertical seam.
 */
export function parallaxBleed(parallax: number, scale = WORLD_SCALE): number {
  const reach = ((scale - 1) / scale) * Math.abs(1 - parallax);
  return Math.min(0.48, reach + 0.04);
}
