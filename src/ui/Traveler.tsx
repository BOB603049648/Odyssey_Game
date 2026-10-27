import { useEffect, useRef, useState } from 'react';
import { WALK_SPEED } from '../core/walk';
import reachFront01 from '../assets/traveler/reach-front-01.png';
import reachFront02 from '../assets/traveler/reach-front-02.png';
import reachSide01 from '../assets/traveler/reach-side-01.png';
import idleBack01 from '../assets/traveler/idle-back-01.png';
import idleBack02 from '../assets/traveler/idle-back-02.png';
import idleFront01 from '../assets/traveler/idle-front-01.png';
import idleFront02 from '../assets/traveler/idle-front-02.png';
import idleSide01 from '../assets/traveler/idle-side-01.png';
import idleSide02 from '../assets/traveler/idle-side-02.png';
import walkBack01 from '../assets/traveler/walk-back-01.png';
import walkBack02 from '../assets/traveler/walk-back-02.png';
import walkBack03 from '../assets/traveler/walk-back-03.png';
import walkBack04 from '../assets/traveler/walk-back-04.png';
import walkFront01 from '../assets/traveler/walk-front-01.png';
import walkFront02 from '../assets/traveler/walk-front-02.png';
import walkFront03 from '../assets/traveler/walk-front-03.png';
import walkFront04 from '../assets/traveler/walk-front-04.png';
import walkSide01 from '../assets/traveler/walk-side-01.png';
import walkSide02 from '../assets/traveler/walk-side-02.png';
import walkSide03 from '../assets/traveler/walk-side-03.png';
import walkSide04 from '../assets/traveler/walk-side-04.png';

export type TravelerFacing = 'front' | 'back' | 'left' | 'right';
export type TravelerSheet = 'front' | 'side' | 'back';
export type TravelerPose = 'idle' | 'walk' | 'interact' | 'reach' | 'lie';
export type TravelerLocomotion = 'idle' | 'walk';

/** v3 P0: walk is 4 × front/side/back; idle is 2 for front and side. Reach front is 2, side is 1. */
export const TRAVELER_FRAME_COUNTS = {
  idle: 2,
  walk: 4,
  interact: 1,
  reach: 2,
} as const;

/** One reach cycle while a hotspot interaction is playing. */
export const REACH_HZ = 1.4;
export const REACH_HOLD_MS = 720;

const WALK: Record<TravelerSheet, readonly string[]> = {
  front: [walkFront01, walkFront02, walkFront03, walkFront04],
  side: [walkSide01, walkSide02, walkSide03, walkSide04],
  back: [walkBack01, walkBack02, walkBack03, walkBack04],
};

const IDLE: Record<TravelerSheet, readonly string[]> = {
  front: [idleFront01, idleFront02],
  side: [idleSide01, idleSide02],
  back: [idleBack01, idleBack02],
};

/** Back reach was not delivered. Missing sheets fall back to idle. */
const REACH: Partial<Record<TravelerSheet, readonly string[]>> = {
  front: [reachFront01, reachFront02],
  side: [reachSide01],
};

/**
 * Full-speed walk cycles per second while covering WALK_SPEED.
 * Playback follows distance (`WALK_STRIDE`), so a slower stick does not skate.
 * The old 2.4 Hz read as a scramble at full speed.
 */
export const WALK_CYCLE_HZ = 1.15;
export const WALK_STRIDE = WALK_SPEED / WALK_CYCLE_HZ;
/** Figure box height as a fraction of the world layer — same space as prop slots. */
export const TRAVELER_HEIGHT = 0.15;
/** Overlap between frames inside one clip, and a slightly longer blend on a turn. */
export const FRAME_BLEND_MS = 140;
export const TURN_BLEND_MS = 220;
export const IDLE_CYCLE_HZ = 0.35;
export const GAIT_RISE = 3.4;
export const GAIT_FALL = 1.65;
const WALK_ON = 0.2;
const WALK_OFF = 0.07;

export function sheetOf(facing: TravelerFacing): TravelerSheet {
  if (facing === 'left' || facing === 'right') return 'side';
  return facing;
}

export function facingFromMove(dx: number, dy: number, current: TravelerFacing): TravelerFacing {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < 0.001 && ay < 0.001) return current;
  if (ax >= ay) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'back' : 'front';
}

export function stepGait(gait: number, stride: number, dt: number): number {
  const target = Math.min(1, Math.max(0, stride));
  const rate = target > gait ? GAIT_RISE : GAIT_FALL;
  const next = gait + (target - gait) * (1 - Math.exp(-rate * dt));
  if (next < 0.0008) return 0;
  if (next > 0.999) return 1;
  return next;
}

/** Phase keeps moving with gait and does not snap back to a rest frame when speed falls. */
export function stepCycle(phase: number, gait: number, dt: number, hz = WALK_CYCLE_HZ): number {
  const next = phase + Math.min(1, Math.max(0, gait)) * hz * dt;
  return next - Math.floor(next);
}

/** One walk cycle per `stride` world-units, so feet stay with the distance actually moved. */
export function stepCycleByDistance(phase: number, distance: number, stride = WALK_STRIDE): number {
  if (!(stride > 0)) return phase;
  const next = phase + Math.max(0, distance) / stride;
  return next - Math.floor(next);
}

export type FrameBlend = {
  sheet: TravelerSheet;
  pose: TravelerPose;
  frame: number;
  facing: TravelerFacing;
};

export function blendDuration(prev: FrameBlend, next: FrameBlend): number {
  if (prev.facing !== next.facing || prev.sheet !== next.sheet) return TURN_BLEND_MS;
  if (prev.pose !== next.pose || prev.frame !== next.frame) return FRAME_BLEND_MS;
  return 0;
}

/** Contact shadow width as a fraction of the figure box. Wider when the figure is lower in the scene. */
export function contactShadowWidth(y: number): number {
  const depth = Math.min(1, Math.max(0, y));
  return ((36 + depth * 22) * 0.64) / 117;
}

export function nextLocomotion(current: TravelerLocomotion, gait: number): TravelerLocomotion {
  if (current === 'idle') return gait >= WALK_ON ? 'walk' : 'idle';
  return gait <= WALK_OFF ? 'idle' : 'walk';
}

export function frameIndex(phase: number, count: number): number {
  if (count <= 1) return 0;
  return Math.min(count - 1, Math.floor(phase * count));
}

export function poseForSheet(pose: TravelerPose, sheet: TravelerSheet): TravelerPose {
  if (pose === 'reach' && !REACH[sheet]) return 'idle';
  return pose;
}

export function clipFrames(pose: TravelerPose, sheet: TravelerSheet): readonly string[] {
  const shown = poseForSheet(pose, sheet);
  if (shown === 'walk') return WALK[sheet];
  if (shown === 'reach') return REACH[sheet] ?? IDLE[sheet];
  if (shown === 'idle' || shown === 'lie') return IDLE[sheet];
  return [IDLE[sheet][0]];
}

type Motion = { gait: number; pose: TravelerPose; frame: number };

function useTravelerMotion(
  stride: number,
  override: 'auto' | 'interact' | 'reach' | 'lie',
  sheet: TravelerSheet,
  x: number,
  y: number,
): Motion {
  const strideRef = useRef(stride);
  const overrideRef = useRef(override);
  const sheetRef = useRef(sheet);
  const posRef = useRef({ x, y });
  strideRef.current = stride;
  overrideRef.current = override;
  sheetRef.current = sheet;
  posRef.current = { x, y };
  const [motion, setMotion] = useState<Motion>({ gait: 0, pose: 'idle', frame: 0 });

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return undefined;
    let raf = 0;
    let last = performance.now();
    let gait = 0;
    let walkPhase = 0;
    let idlePhase = 0;
    let reachPhase = 0;
    let prevPose: TravelerPose = 'idle';
    let locomotion: TravelerLocomotion = 'idle';
    let lastPos = { ...posRef.current };
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const here = posRef.current;
      const dist = Math.hypot(here.x - lastPos.x, here.y - lastPos.y);
      lastPos = here;
      gait = stepGait(gait, strideRef.current, dt);
      locomotion = nextLocomotion(locomotion, gait);
      const requested: TravelerPose = overrideRef.current === 'auto' ? locomotion : overrideRef.current;
      const pose = poseForSheet(requested, sheetRef.current);
      if (pose === 'walk') {
        if (dist > 1e-6) walkPhase = stepCycleByDistance(walkPhase, dist);
        else if (strideRef.current <= 0.001) walkPhase = stepCycle(walkPhase, gait, dt);
      } else if (pose === 'reach') {
        reachPhase = prevPose === 'reach' ? stepCycle(reachPhase, 1, dt, REACH_HZ) : 0;
      } else idlePhase = stepCycle(idlePhase, 1, dt, IDLE_CYCLE_HZ);
      prevPose = pose;
      const phase = pose === 'walk' ? walkPhase : pose === 'reach' ? reachPhase : idlePhase;
      setMotion({ gait, pose, frame: frameIndex(phase, clipFrames(pose, sheetRef.current).length) });
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, []);

  if (import.meta.env.MODE === 'test') {
    const gait = Math.min(1, Math.max(0, stride));
    const requested: TravelerPose = override === 'auto' ? (gait > 0 ? 'walk' : 'idle') : override;
    const pose = poseForSheet(requested, sheet);
    return { gait, pose, frame: 0 };
  }
  return motion;
}

function sameBlend(a: FrameBlend, b: FrameBlend): boolean {
  return a.sheet === b.sheet && a.pose === b.pose && a.frame === b.frame && a.facing === b.facing;
}

function FramePicture({ blend, layer }: { blend: FrameBlend; layer: 'out' | 'current' }) {
  const frames = clipFrames(blend.pose, blend.sheet);
  const index = Math.min(frames.length - 1, Math.max(0, blend.frame));
  return (
    <span
      className={layer === 'out' ? 'traveler-frame-wrap out' : 'traveler-frame-wrap'}
      data-mirror={blend.facing === 'right' ? 'yes' : 'no'}
    >
      <img
        className={layer === 'current' ? 'traveler-figure traveler-frame' : 'traveler-frame'}
        data-layer={layer}
        data-frame={index}
        src={frames[index] ?? frames[0]}
        alt=""
        draggable={false}
      />
    </span>
  );
}

export function TravelerMark({
  x,
  y,
  facing,
  moving,
  stride,
  pose = 'auto',
}: {
  x: number;
  y: number;
  facing: TravelerFacing;
  moving: boolean;
  /** 0–1 movement power. Defaults to a full step while `moving` is set. */
  stride?: number;
  /** `reach` plays on a hotspot interaction. `interact` is still reserved, with no frames of its own. */
  pose?: 'auto' | 'interact' | 'reach' | 'lie';
}) {
  const sheet = sheetOf(facing);
  const power = stride ?? (moving ? 1 : 0);
  const motion = useTravelerMotion(power, pose, sheet, x, y);
  const frames = clipFrames(motion.pose, sheet);
  const frame = Math.min(frames.length - 1, motion.frame);
  const current: FrameBlend = { sheet, pose: motion.pose, frame, facing };
  const [shown, setShown] = useState(current);
  const [outgoing, setOutgoing] = useState<FrameBlend | null>(null);
  if (!sameBlend(shown, current)) {
    if (blendDuration(shown, current) > 0) setOutgoing(shown);
    setShown(current);
  }

  useEffect(() => {
    if (!outgoing || import.meta.env.MODE === 'test') return undefined;
    const ms = blendDuration(outgoing, shown) || FRAME_BLEND_MS;
    const id = window.setTimeout(() => setOutgoing(null), ms);
    return () => window.clearTimeout(id);
  }, [outgoing, shown]);

  const blendMs = outgoing ? blendDuration(outgoing, shown) || FRAME_BLEND_MS : 0;
  return (
    <div
      className="traveler"
      data-testid="traveler"
      data-figure="traveler"
      data-facing={facing}
      data-sheet={sheet}
      data-moving={moving ? 'yes' : 'no'}
      data-pose={motion.pose}
      data-gait={motion.gait.toFixed(2)}
      data-frame={frame}
      data-clip-frames={frames.length}
      data-crossfade={outgoing ? 'yes' : 'no'}
      data-x={x}
      data-y={y}
      style={{
        left: `${x * 100}%`,
        top: `${y * 100}%`,
        height: `${TRAVELER_HEIGHT * 100}%`,
        width: 'auto',
        aspectRatio: '3 / 4',
      }}
      aria-hidden="true"
    >
      <div className="traveler-bob">
        <span
          className="contact-shadow"
          data-testid="contact-shadow"
          style={{ width: `${contactShadowWidth(y) * 100}%`, height: `${(12 / 156) * 100}%` }}
        />
        <span className="traveler-frames" style={{ ['--frame-blend' as string]: `${blendMs}ms` }}>
          {outgoing ? <FramePicture blend={outgoing} layer="out" /> : null}
          <FramePicture blend={shown} layer="current" />
        </span>
      </div>
    </div>
  );
}
