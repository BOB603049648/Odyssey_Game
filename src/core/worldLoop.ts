import { nextGuide, type GuidePhase } from './companionTraj';
import { clampToBand, coastStep, desiredVelocity, groundDistance, type Band, type Point } from './walk';
import type { IslandScene } from './island';
import { plantOnGround } from './stage';
import { groundRoute, groundStep } from './navigation';

/** What the player asked for this frame. The loop applies it; the view only shows the result. */
export type MoveIntent = {
  move: Point | null;
  seek: Point | null;
};

export type WalkerSim = {
  pos: Point;
  velocity: Point;
  seek: Point | null;
};

export type GuideSim = {
  phase: GuidePhase;
  elapsed: number;
  cat: Point;
  post: Point;
  ready?: boolean;
};

/**
 * One simulation step: walk intent, then the guide.
 * A frame with no move and no seek leaves a settled foot where it is.
 */
export function stepWorld(input: { walker: WalkerSim; intent: MoveIntent; band: Band; dt: number; guide: GuideSim; scene?: IslandScene }): {
  walker: WalkerSim & { moving: boolean; blocked: boolean };
  guide: ReturnType<typeof nextGuide>;
} {
  const requested = input.intent.move ? null : input.intent.seek ?? input.walker.seek;
  const seek = requested ? input.scene ? plantOnGround(input.scene, requested) : clampToBand(requested, input.band) : null;
  const waypoint = seek && input.scene ? groundRoute(input.scene, input.walker.pos, seek)[0] : seek;
  const wish = desiredVelocity(input.intent.move, waypoint, input.walker.pos);
  const step = coastStep(input.walker.pos, input.walker.velocity, wish, input.band, input.dt);
  const grounded = input.scene ? groundStep(input.scene, input.walker.pos, step.pos) : step.pos;
  const hitGround = groundDistance(grounded, step.pos) > 1e-7;
  // Only a very short final approach may settle on the reachable goal edge.
  // A blocked actor must never teleport to a distant seek.
  const arrived = !!seek && groundDistance(grounded, seek) < 0.0015;
  const planted = arrived ? seek : grounded;
  const moving = groundDistance(input.walker.pos, planted) > 1e-6;
  const velocity = hitGround && input.dt > 0 ? {
    x: (planted.x - input.walker.pos.x) / input.dt,
    y: (planted.y - input.walker.pos.y) / input.dt,
  } : step.velocity;
  return {
    walker: {
      pos: planted,
      velocity: arrived ? { x: 0, y: 0 } : velocity,
      moving,
      blocked: step.blocked || hitGround,
      seek: arrived ? null : seek,
    },
    guide: nextGuide({
      phase: input.guide.phase,
      elapsed: input.guide.elapsed,
      cat: input.guide.cat,
      post: input.guide.post,
      dt: input.dt,
      retarget: false,
      sceneChanged: false,
      ready: input.guide.ready,
    }),
  };
}
