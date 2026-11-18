import { WALK_SPEED } from './walk';

/**
 * Full-speed walk cycles per second while covering WALK_SPEED.
 * Playback follows distance (`WALK_STRIDE`), so a slower stick does not skate.
 * At reference scale, 1.65 cycles/sec gives 13.2 distinct poses/sec. Perspective
 * and the nearer hall scale still adjust stride to the displayed body size.
 */
export const WALK_CYCLE_HZ = 1.65;
export const WALK_STRIDE = WALK_SPEED / WALK_CYCLE_HZ;
/**
 * Figure box height as a fraction of the world layer.
 * At WORLD_SCALE 1.46 a 0.15 box filled ~22% of the viewport and read as too tall
 * against the plate. 0.136 is about 20% of the viewport: taller than the
 * shore cat's painted body, still under that 22% mark.
 */
export const TRAVELER_HEIGHT = 0.136;
