import { SPAWNS } from './stage';
import { cameraOffset, lookEast, WORLD_SCALE } from './walk';
import { buildingFoot, type Foot } from './world';

// The old placed gate was composed with parallax .72 at the shore spawn.
// Resolve that reference camera once in normalized coordinates, NOT from the
// moving camera or screenshot pixels. Unit viewport axes scale independently.
const reference = lookEast(cameraOffset(SPAWNS['dba.scene.shore'], 1, 1), 1, true);

/** Migrate the authored box foot into the ground plane, preserving spawn framing. */
export function shoreBuildingFoot(slot: { x: number; y: number; h?: number; parallax: number }): Foot {
  const foot = buildingFoot(slot);
  const authoredDrift = 1 - slot.parallax;
  return {
    x: foot.x + authoredDrift * reference.x / WORLD_SCALE,
    y: foot.y + authoredDrift * reference.y / WORLD_SCALE,
  };
}
