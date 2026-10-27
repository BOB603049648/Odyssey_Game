import { useEffect, useRef, useState } from 'react';
import reachFront01 from '../assets/traveler/reach-front-01.png';
import reachFront02 from '../assets/traveler/reach-front-02.png';
import reachSide01 from '../assets/traveler/reach-side-01.png';
import idleFront01 from '../assets/traveler/idle-front-01.png';
import idleFront02 from '../assets/traveler/idle-front-02.png';
import idleSide01 from '../assets/traveler/idle-side-01.png';
import idleSide02 from '../assets/traveler/idle-side-02.png';
import silhouette from '../assets/traveler/05-silhouette.png';
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
export type TravelerPose = 'idle' | 'walk' | 'interact' | 'reach';
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

/** Back idle was not in the P0 set. Both slots hold walk-back-01 until that sheet arrives. */
const IDLE: Record<TravelerSheet, readonly string[]> = {
  front: [idleFront01, idleFront02],
  side: [idleSide01, idleSide02],
  back: [walkBack01, walkBack01],
};

/** Back reach was not delivered. Missing sheets fall back to idle. */
const REACH: Partial<Record<TravelerSheet, readonly string[]>> = {
  front: [reachFront01, reachFront02],
  side: [reachSide01],
};

/** Full-speed walk cycles per second. Frame rate scales with gait, which eases toward stride. */
export const WALK_CYCLE_HZ = 2.4;
export const IDLE_CYCLE_HZ = 0.35;
export const GAIT_RISE = 3.4;
export const GAIT_FALL = 2.2;
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
  if (shown === 'idle') return IDLE[sheet];
  return [IDLE[sheet][0]];
}

type Motion = { gait: number; pose: TravelerPose; frame: number };

function useTravelerMotion(stride: number, override: 'auto' | 'interact' | 'reach', sheet: TravelerSheet): Motion {
  const strideRef = useRef(stride);
  const overrideRef = useRef(override);
  const sheetRef = useRef(sheet);
  strideRef.current = stride;
  overrideRef.current = override;
  sheetRef.current = sheet;
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
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      gait = stepGait(gait, strideRef.current, dt);
      locomotion = nextLocomotion(locomotion, gait);
      const requested: TravelerPose = overrideRef.current === 'auto' ? locomotion : overrideRef.current;
      const pose = poseForSheet(requested, sheetRef.current);
      if (pose === 'walk') walkPhase = stepCycle(walkPhase, gait, dt);
      else if (pose === 'reach') {
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
  pose?: 'auto' | 'interact' | 'reach';
}) {
  const sheet = sheetOf(facing);
  const power = stride ?? (moving ? 1 : 0);
  const motion = useTravelerMotion(power, pose, sheet);
  const frames = clipFrames(motion.pose, sheet);
  const frame = Math.min(frames.length - 1, motion.frame);
  const shownRef = useRef({ sheet, pose: motion.pose, frame });
  const [outgoing, setOutgoing] = useState<{ sheet: TravelerSheet; pose: TravelerPose; frame: number } | null>(null);

  useEffect(() => {
    const previous = shownRef.current;
    const changed = previous.sheet !== sheet || previous.pose !== motion.pose;
    shownRef.current = { sheet, pose: motion.pose, frame };
    if (!changed) return undefined;
    if (import.meta.env.MODE === 'test') return undefined;
    setOutgoing(previous);
    const id = window.setTimeout(() => setOutgoing(null), 200);
    return () => window.clearTimeout(id);
  }, [sheet, motion.pose, frame]);

  const showShade = sheet === 'front' || outgoing?.sheet === 'front';
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
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      aria-hidden="true"
    >
      <div className="traveler-bob">
        <span
          className="contact-shadow"
          data-testid="contact-shadow"
          style={{ width: `${(36 + y * 22) * 0.64}px` }}
        />
        {showShade ? <img className="traveler-shade" src={silhouette} alt="" draggable={false} /> : null}
        <span className="traveler-frames">
          {outgoing ? (
            <img
              className="traveler-frame"
              data-layer="out"
              data-frame={outgoing.frame}
              src={clipFrames(outgoing.pose, outgoing.sheet)[outgoing.frame] ?? clipFrames(outgoing.pose, outgoing.sheet)[0]}
              alt=""
              draggable={false}
            />
          ) : null}
          <img
            className="traveler-figure traveler-frame"
            data-layer="current"
            data-frame={frame}
            src={frames[frame]}
            alt=""
            draggable={false}
          />
        </span>
      </div>
    </div>
  );
}
