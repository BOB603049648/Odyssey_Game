import { nextGuide, type GuidePhase } from './companionTraj';
import { coastStep, desiredVelocity, distance, type Band, type Point } from './walk';

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
};

/**
 * One simulation step: walk intent, then the guide.
 * A frame with no move and no seek leaves a settled foot where it is.
 */
export function stepWorld(input: { walker: WalkerSim; intent: MoveIntent; band: Band; dt: number; guide: GuideSim }): {
  walker: WalkerSim & { moving: boolean; blocked: boolean };
  guide: ReturnType<typeof nextGuide>;
} {
  const seek = input.intent.seek ?? input.walker.seek;
  const wish = desiredVelocity(input.intent.move, input.intent.move ? null : seek, input.walker.pos);
  const step = coastStep(input.walker.pos, input.walker.velocity, wish, input.band, input.dt);
  const arrived = !!seek && (distance(step.pos, seek) < 0.01 || (!step.moving && step.blocked));
  // The last ease stops a hair short of the point. A north-edge seek is the
  // night trip itself, so plant the foot on the point instead of abandoning it.
  const planted = arrived ? seek : step.pos;
  const committed = arrived && distance(step.pos, planted) > 1e-6;
  return {
    walker: {
      pos: planted,
      velocity: arrived ? { x: 0, y: 0 } : step.velocity,
      moving: step.moving || committed,
      blocked: step.blocked,
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
    }),
  };
}
