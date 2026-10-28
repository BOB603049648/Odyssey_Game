import type { CompanionPose, HintAnchor } from './hints';
import type { IslandScene } from './island';
import { BANDS, GATES, SPOTS, YARD_RIGHT_STEP } from './stage';
import { clampToBand, type Point } from './walk';

/** Locked landings: opaque foot sits 8px above the 1152 canvas bottom. */
export const NANAICHA_FOOT = { x: 0.5, y: 1144 / 1152 } as const;
/**
 * land-yard-give only. The one bottom paw blob sits left of center
 * (authored for the old face=left mirror). This frame stays unmirrored,
 * so the pivot is that blob, not the canvas center.
 * Other beats keep NANAICHA_FOOT so shore and camp paws do not shift.
 */
export const YARD_GIVE_FOOT = { x: 0.259, y: 1129 / 1152 } as const;

export function companionFoot(frameId: string): { readonly x: number; readonly y: number } {
  return frameId === 'land-yard-give' ? YARD_GIVE_FOOT : NANAICHA_FOOT;
}

/**
 * Visible paw row on the 1152 sheet. The plant pivot stays near the canvas
 * bottom; several landings keep the claws higher, so the contact ellipse
 * uses this row instead of the box edge.
 */
const COMPANION_SOLE: Record<string, number> = {
  'land-shore-driftwood': 897 / 1152,
  'land-shore-east-gap': 1117 / 1152,
  /* Cloak hem. Edge scraps below it are not the center paw. */
  'land-shore-gourd': 897 / 1152,
  'land-yard-give': 1128 / 1152,
  'land-camp-fireside': 1143 / 1152,
  'land-camp-sleep-mat': 1143 / 1152,
  'leap-01': 1143 / 1152,
  'leap-02': 1143 / 1152,
};

export function companionSole(frameId: string): number {
  return COMPANION_SOLE[frameId] ?? NANAICHA_FOOT.y;
}

/**
 * Give is authored with the paw on the right of the sheet.
 * A left-face mirror is taken around the box center, which slides that paw
 * off the foot pivot and leaves a scrap on the other tread. Keep this frame unmirrored.
 */
export function companionFace(frameId: string, postX: number, catX: number): 'left' | 'right' {
  if (frameId === 'land-yard-give') return 'right';
  return postX >= catX ? 'right' : 'left';
}
/** Canvas height as a fraction of the world layer. Subject reads a little taller than the traveler. */
export const NANAICHA_HEIGHT = 0.22;

export type GazeStep = 'water' | 'food' | 'sleep' | 'danger' | 'done';

export type CatBeat = 'S0' | 'S1' | 'S2' | 'C1' | 'C2' | 'C3' | 'Y0' | 'Y1' | 'Y2' | 'P0' | 'N0' | 'H0';

export type CatPost = {
  x: number;
  y: number;
  look: HintAnchor;
  pose: CompanionPose;
  targetId: string;
  /** Waypoint id from scene-card §5.1. Switching this is what plays the trail. */
  beat: CatBeat;
  queue: GazeStep | 'rest' | 'guard';
};

type Beats = Record<string, boolean | undefined>;
type Flags = Record<string, boolean | number | string | undefined>;

export function gazeQueue(beats: Beats): GazeStep {
  if (beats['dba.beat.water'] !== true) return 'water';
  if (beats['dba.beat.food'] !== true) return 'food';
  if (beats['dba.beat.sleep'] !== true) return 'sleep';
  if (beats['dba.beat.danger'] !== true) return 'danger';
  return 'done';
}

function spotAt(scene: IslandScene, id: string): Point {
  const found = SPOTS[scene].find((spot) => spot.id === id);
  if (!found) return { x: 0.5, y: 0.64 };
  return found;
}

function gateAt(from: IslandScene, to: IslandScene): Point | null {
  return GATES.find((gate) => gate.from === from && gate.to === to) ?? null;
}

/** Feet share the hotspot's ground y. Offset is horizontal so she does not cover the prop or the gate. */
function plant(scene: IslandScene, at: Point, side: -1 | 1): Point {
  return clampToBand({ x: at.x + side * 0.05, y: at.y }, BANDS[scene]);
}

function insideGate(scene: IslandScene, to: IslandScene): Point {
  const gate = gateAt(scene, to) ?? { x: 0.5, y: 0.64 };
  const side: -1 | 1 = gate.x > 0.5 ? -1 : 1;
  return plant(scene, gate, side);
}

export function companionPost(
  scene: IslandScene,
  beats: Beats,
  flags: Flags = {},
  options?: { skipWelcome?: boolean },
): CatPost {
  const queue = gazeQueue(beats);

  if (scene === 'dba.scene.shore') {
    const welcomed = flags['dba.flag.driftwood'] === true || options?.skipWelcome === true;
    if (!welcomed && beats['dba.beat.depart'] !== true) {
      const feet = plant(scene, spotAt(scene, 'shore-driftwood'), 1);
      return { ...feet, look: 'driftwood', pose: 'sit-near', targetId: 'shore-driftwood', beat: 'S0', queue: 'rest' };
    }
    if (queue === 'water') {
      const feet = plant(scene, spotAt(scene, 'island-gourd'), -1);
      return { ...feet, look: 'gourd', pose: 'lead', targetId: 'island-gourd', beat: 'S1', queue: 'water' };
    }
    const feet = insideGate(scene, 'dba.scene.camp');
    return { ...feet, look: 'depart', pose: 'look-back', targetId: 'shore-east', beat: 'S2', queue: 'food' };
  }

  if (scene === 'dba.scene.camp') {
    if (beats['dba.beat.food'] !== true) {
      /* East porch deck. The yard-gate lip (x≈0.85) is the water-side fog, off the boards. */
      const feet = clampToBand({ x: 0.7, y: 0.85 }, BANDS[scene]);
      return { ...feet, look: 'give', pose: 'lead', targetId: 'camp-east', beat: 'C1', queue: 'food' };
    }
    if (beats['dba.beat.sleep'] !== true) {
      const mat = spotAt(scene, 'camp-sleep');
      const feet = clampToBand({ x: mat.x - 0.14, y: mat.y }, BANDS[scene]);
      return { ...feet, look: 'sleep', pose: 'sit-near', targetId: 'camp-sleep', beat: 'C2', queue: 'sleep' };
    }
    /* Porch boards. 0.82 still sits on the wall side of the deck seam. */
    const feet = clampToBand({ x: 0.66, y: 0.86 }, BANDS[scene]);
    return { ...feet, look: 'sleep', pose: 'curl', targetId: 'camp-fire', beat: 'C3', queue: 'guard' };
  }

  if (scene === 'dba.scene.yard') {
    if (beats['dba.beat.food'] !== true) {
      /* Right stair groove, lowest tread. Not the west stone plinth, and not beside the grain pile. */
      const feet = clampToBand({ x: YARD_RIGHT_STEP.x, y: YARD_RIGHT_STEP.y }, BANDS[scene]);
      const tilt = flags['dba.flag.wrong-share'] === true;
      return {
        ...feet,
        look: 'give',
        pose: tilt ? 'look-at' : 'lead',
        targetId: 'yard-give',
        beat: 'Y0',
        queue: 'food',
      };
    }
    if (beats['dba.beat.sleep'] !== true) {
      const feet = insideGate(scene, 'dba.scene.camp');
      return { ...feet, look: 'sleep', pose: 'look-back', targetId: 'yard-west', beat: 'Y1', queue: 'sleep' };
    }
    const feet = insideGate(scene, 'dba.scene.path');
    return { ...feet, look: 'path-stop', pose: 'lead', targetId: 'yard-east', beat: 'Y2', queue: 'danger' };
  }

  if (scene === 'dba.scene.path') {
    const feet = plant(scene, spotAt(scene, 'path-stop'), 1);
    return { ...feet, look: 'path-stop', pose: 'wait', targetId: 'path-stop', beat: 'P0', queue: queue === 'done' ? 'done' : 'danger' };
  }

  if (scene === 'dba.scene.night') {
    const feet = plant(scene, spotAt(scene, 'night-read'), 1);
    return { ...feet, look: 'old-layer', pose: 'curl', targetId: 'night-read', beat: 'N0', queue: 'guard' };
  }

  const feet = plant(scene, { x: 0.48, y: 0.66 }, 1);
  return { ...feet, look: 'mural-entrance', pose: 'wait', targetId: 'hall', beat: 'H0', queue: queue === 'done' ? 'done' : queue };
}
