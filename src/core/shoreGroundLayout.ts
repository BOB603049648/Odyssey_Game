import { BANDS } from './stage';

/**
 * Existing Plate hang: the ground slot extends past the world south edge
 * so a parked camera does not flash empty grade under the feet.
 * Do not change this value; the mask is computed in that slot's coordinates.
 */
export const GROUND_SOUTH_HANG = 0.22;

/**
 * North tide transition in art.shore.ground.jpg (1280×720, opaque RGB).
 * First row with sand_frac (lum>80) ≥ 0.25 is y=269; ≥ 0.80 is y=317.
 * Used only as the fade *width*, not as raw crop lines: after the 22% south
 * hang, those image rows would land south of the walk-band north edge.
 */
export const SHORE_GROUND_TIDE_START_IMAGE = 269 / 720;
export const SHORE_GROUND_TIDE_OPAQUE_IMAGE = 317 / 720;

const slotHeight = 1 + GROUND_SOUTH_HANG;
const tideWidthImage = SHORE_GROUND_TIDE_OPAQUE_IMAGE - SHORE_GROUND_TIDE_START_IMAGE;

/**
 * Walk-band north edge. The mask is already nearly opaque here so feet stay
 * on solid ground, but the CSS 100% stop is *not* placed on this line —
 * a hard #000 stop exactly at minY painted a 1px horizon through the scene
 * (browser shot y≈235/576 on the DGwRK4Qh spawn frame).
 */
export const SHORE_TIDE_FADE_END_WORLD = BANDS['dba.scene.shore'].minY;

/** Opacity at the walk-band north edge, before the soft tail reaches 1. */
export const SHORE_TIDE_BAND_EDGE_OPACITY = 0.92;

/**
 * Where the mask becomes fully opaque. A short tail south of minY, still
 * north of the spawn Y (0.62), so the 100% stop is not coincident with
 * the shore-tread / fog-line junction.
 */
export const SHORE_TIDE_FADE_OPAQUE_WORLD = SHORE_TIDE_FADE_END_WORLD + tideWidthImage * slotHeight;

/**
 * Soft fade starts above the walk band by the measured tide width, mapped
 * through the hung slot so the seam is not a hard horizontal cut.
 */
export const SHORE_TIDE_FADE_START_WORLD =
  (SHORE_TIDE_FADE_END_WORLD / slotHeight - tideWidthImage) * slotHeight;

function worldToSlot(worldY: number): number {
  return worldY / slotHeight;
}

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Ground plate alpha at a world-Y, 0 = sky shows through, 1 = wet-sand plate. */
export function shoreGroundMaskOpacityAtWorldY(worldY: number): number {
  if (worldY <= SHORE_TIDE_FADE_START_WORLD) return 0;
  if (worldY >= SHORE_TIDE_FADE_OPAQUE_WORLD) return 1;
  if (worldY <= SHORE_TIDE_FADE_END_WORLD) {
    const span = SHORE_TIDE_FADE_END_WORLD - SHORE_TIDE_FADE_START_WORLD;
    return lerp(0, SHORE_TIDE_BAND_EDGE_OPACITY, (worldY - SHORE_TIDE_FADE_START_WORLD) / span);
  }
  const tail = SHORE_TIDE_FADE_OPAQUE_WORLD - SHORE_TIDE_FADE_END_WORLD;
  return lerp(SHORE_TIDE_BAND_EDGE_OPACITY, 1, (worldY - SHORE_TIDE_FADE_END_WORLD) / tail);
}

/** CSS mask-image for the hung shore ground slot (percentages are of the slot). */
export function shoreGroundMaskImage(): string {
  const start = (worldToSlot(SHORE_TIDE_FADE_START_WORLD) * 100).toFixed(4);
  const edge = (worldToSlot(SHORE_TIDE_FADE_END_WORLD) * 100).toFixed(4);
  const opaque = (worldToSlot(SHORE_TIDE_FADE_OPAQUE_WORLD) * 100).toFixed(4);
  const edgeAlpha = SHORE_TIDE_BAND_EDGE_OPACITY.toFixed(2);
  return `linear-gradient(180deg, transparent 0%, transparent ${start}%, rgba(0, 0, 0, ${edgeAlpha}) ${edge}%, #000 ${opaque}%, #000 100%)`;
}
