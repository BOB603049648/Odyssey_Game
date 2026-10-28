import { useEffect, useRef, useState } from 'react';
import { WALK_SPEED } from '../core/walk';
import { depthScale, worldToScreen } from '../core/world';
import { punchHemUrl } from './hemPunch';
import { frameUrl, loadFrame } from './travelerArt';

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

/**
 * Temporary color lock. From #26 the idle/walk/reach sheets are near-black
 * silhouettes. Show the older colored plates until those sheets are relit.
 * Hem punch still runs (it only drops near-black hem pixels) and the sole row stays.
 */
const COLOR_LOCK: Record<TravelerSheet, string> = {
  front: '04-front.png',
  side: '02-side.png',
  back: '03-back.png',
};

const WALK_FILES: Record<TravelerSheet, readonly string[]> = {
  front: [COLOR_LOCK.front, COLOR_LOCK.front, COLOR_LOCK.front, COLOR_LOCK.front],
  side: [COLOR_LOCK.side, COLOR_LOCK.side, COLOR_LOCK.side, COLOR_LOCK.side],
  back: [COLOR_LOCK.back, COLOR_LOCK.back, COLOR_LOCK.back, COLOR_LOCK.back],
};

const IDLE_FILES: Record<TravelerSheet, readonly string[]> = {
  front: [COLOR_LOCK.front, COLOR_LOCK.front],
  side: [COLOR_LOCK.side, COLOR_LOCK.side],
  back: [COLOR_LOCK.back, COLOR_LOCK.back],
};

/** Back reach was not delivered. Missing sheets fall back to idle. */
const REACH_FILES: Partial<Record<TravelerSheet, readonly string[]>> = {
  front: [COLOR_LOCK.front, COLOR_LOCK.front],
  side: [COLOR_LOCK.side],
};

function frameSrc(file: string): string {
  return frameUrl(file) ?? '';
}

/**
 * Full-speed walk cycles per second while covering WALK_SPEED.
 * Playback follows distance (`WALK_STRIDE`), so a slower stick does not skate.
 * The old 2.4 Hz read as a scramble at full speed.
 */
export const WALK_CYCLE_HZ = 1.15;
export const WALK_STRIDE = WALK_SPEED / WALK_CYCLE_HZ;
/**
 * Figure box height as a fraction of the world layer.
 * At WORLD_SCALE 1.46 a 0.15 box filled ~22% of the viewport and read as too tall
 * against the plate. 0.118 keeps the opaque body on the ground band.
 */
export const TRAVELER_HEIGHT = 0.118;
/**
 * Opaque-bounds bottom center on the 864×1152 sheet.
 * The soft contact (rgb ≈ 28,22,16, gaussian edge) reaches the last row.
 * Planting that row keeps the melt on the sand instead of hanging south of the sole.
 */
export const TRAVELER_FOOT = { x: 0.5, y: 1151 / 1152 } as const;
/**
 * Last standing row before the hem punch (HEM_Y0). The box bottom is the
 * punched lip, so a shadow parked there floats a sole below the coat.
 */
export const TRAVELER_SOLE = 995 / 1152;
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

/** Boot-width contact ellipse. Wider when the figure is lower, never a full-body slab. */
export function contactShadowWidth(y: number): number {
  const depth = Math.min(1, Math.max(0, y));
  return 0.36 + depth * 0.12;
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
  if (pose === 'reach' && !REACH_FILES[sheet]) return 'idle';
  return pose;
}

export function clipFrames(pose: TravelerPose, sheet: TravelerSheet): readonly string[] {
  const shown = poseForSheet(pose, sheet);
  if (shown === 'walk') return WALK_FILES[sheet].map(frameSrc);
  if (shown === 'reach') return (REACH_FILES[sheet] ?? IDLE_FILES[sheet]).map(frameSrc);
  if (shown === 'idle' || shown === 'lie') return IDLE_FILES[sheet].map(frameSrc);
  return [frameSrc(IDLE_FILES[sheet][0])];
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
  const files =
    blend.pose === 'walk'
      ? WALK_FILES[sheetOf(blend.facing)]
      : blend.pose === 'reach'
        ? REACH_FILES[sheetOf(blend.facing)] ?? IDLE_FILES[sheetOf(blend.facing)]
        : IDLE_FILES[sheetOf(blend.facing)];
  const file = files[Math.min(files.length - 1, Math.max(0, blend.frame))] ?? files[0];
  const cached = frameSrc(file);
  const [punched, setPunched] = useState<{ file: string; url: string } | null>(null);
  useEffect(() => {
    let live = true;
    loadFrame(file).then((url) => {
      if (!live || !url) return;
      punchHemUrl(url).then((next) => {
        if (live) setPunched({ file, url: next });
      });
    });
    return () => {
      live = false;
    };
  }, [file]);
  const shown = punched?.file === file ? punched.url : cached;
  return (
    <span
      className={layer === 'out' ? 'traveler-frame-wrap out' : 'traveler-frame-wrap'}
      data-mirror={blend.facing === 'left' ? 'yes' : 'no'}
      style={{ ['--figure' as string]: `url("${shown}")` }}
    >
      <img
        className={layer === 'current' ? 'traveler-figure traveler-frame' : 'traveler-frame'}
        data-layer={layer}
        data-frame={blend.frame}
        src={shown}
        alt=""
        draggable={false}
      />
      <span className="figure-grade grade-color" />
      <span className="figure-grade grade-soft" />
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
  depthZ = 5,
}: {
  x: number;
  y: number;
  facing: TravelerFacing;
  moving: boolean;
  /** 0–1 movement power. Defaults to a full step while `moving` is set. */
  stride?: number;
  /** `reach` plays on a hotspot interaction. `interact` is still reserved, with no frames of its own. */
  pose?: 'auto' | 'interact' | 'reach' | 'lie';
  /** Paint order against the guide. Near props stay above both. */
  depthZ?: number;
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
  const poseNow = pose === 'lie' ? 'lie' : motion.pose;
  const planted = worldToScreen({ x, y }, TRAVELER_FOOT, poseNow === 'lie' ? 'rotate(-86deg)' : '');
  return (
    <div
      className="traveler"
      data-testid="traveler"
      data-figure="traveler"
      data-facing={facing}
      data-sheet={sheet}
      data-moving={moving ? 'yes' : 'no'}
      data-pose={poseNow}
      data-gait={motion.gait.toFixed(2)}
      data-frame={frame}
      data-clip-frames={frames.length}
      data-crossfade={outgoing ? 'yes' : 'no'}
      data-anchor="foot"
      data-x={x}
      data-y={y}
      style={{
        left: planted.left,
        top: planted.top,
        transform: `${planted.transform} scale(${depthScale(y).toFixed(3)})`,
        transformOrigin: `${TRAVELER_FOOT.x * 100}% ${TRAVELER_FOOT.y * 100}%`,
        zIndex: depthZ,
        ['--sole-y' as string]: `${(poseNow === 'lie' ? TRAVELER_FOOT.y : TRAVELER_SOLE) * 100}%`,
        height: `${TRAVELER_HEIGHT * 100}%`,
        width: 'auto',
        aspectRatio: '3 / 4',
      }}
      aria-hidden="true"
    >
      <span
        className="contact-shadow"
        data-testid="contact-shadow"
        style={{
          width: `${contactShadowWidth(y) * 100}%`,
          ['--shadow-opacity' as string]: '1',
          ['--foot-x' as string]: '50%',
        }}
      />
      <div className="traveler-bob">
        <span className="traveler-frames" style={{ ['--frame-blend' as string]: `${blendMs}ms` }}>
          {outgoing ? <FramePicture blend={outgoing} layer="out" /> : null}
          <FramePicture blend={shown} layer="current" />
        </span>
      </div>
    </div>
  );
}
