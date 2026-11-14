import { ACTION_FILES, actionAtlasSource } from '../content/travelerActionAtlas';
import { supportForSource, supportTransform, type TravelerSupport } from './travelerSupport';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { IslandScene } from '../core/island';
import { WALK_SPEED, groundDistance, WORLD_ASPECT } from '../core/walk';
import { depthScale, worldToScreen } from '../core/world';
import { punchHemUrl, wakeHemPunch } from './hemPunch';
import { heldFrameIndex } from './travelerDisplay';
import { forgetFrame, frameUrl, loadFrame } from './travelerArt';
import { useAssetSrc } from './useAssetSrc';
import { WALK_ATLAS, walkAtlasSource } from '../content/travelerWalkAtlas';
import { SETTLE_FILES, settleAtlasSource } from '../content/characterPerformanceAtlas';
import { REST_LOWER_MS, REST_RISE_MS } from './characterActionTimeline';
import './character-performance.css';

export type TravelerFacing = 'front' | 'back' | 'left' | 'right';
export type TravelerSheet = 'front' | 'side' | 'back';
export type TravelerPose = 'idle' | 'walk' | 'interact' | 'reach' | 'drink' | 'lie' | 'rise';
export type TravelerLocomotion = 'idle' | 'walk';

/** Four registered walk poses per direction and four authored frames per action. */
export const TRAVELER_FRAME_COUNTS = {
  idle: 2,
  walk: 4,
  interact: 1,
  reach: 4,
  drink: 4,
  lie: 4,
  rise: 4,
} as const;

/** One reach cycle while a hotspot interaction is playing. */
export const REACH_HOLD_MS = 1200;
export const REACH_HZ = 1000 / REACH_HOLD_MS;
export const DRINK_HOLD_MS = 1800;

const WALK_FILES: Record<TravelerSheet, readonly string[]> = {
  front: ['stride-front-01.png', 'stride-front-02.png', 'stride-front-03.png', 'stride-front-04.png'],
  side: ['stride-side-01.png', 'stride-side-02.png', 'stride-side-03.png', 'stride-side-04.png'],
  back: ['stride-back-01.png', 'stride-back-02.png', 'stride-back-03.png', 'stride-back-04.png'],
};

const IDLE_FILES: Record<TravelerSheet, readonly string[]> = {
  front: ['idle-front-01.png', 'idle-front-02.png'],
  side: ['idle-side-01.png', 'idle-side-02.png'],
  back: ['idle-back-01.png', 'idle-back-02.png'],
};

function filesFor(pose: TravelerPose, sheet: TravelerSheet): readonly string[] {
  if (pose === 'walk') return WALK_FILES[sheet];
  if (pose === 'lie' || pose === 'rise') return SETTLE_FILES[pose];
  if (pose === 'reach' || pose === 'drink') return ACTION_FILES[pose];
  return pose === 'interact' ? [IDLE_FILES[sheet][0]] : IDLE_FILES[sheet];
}
function atlasSource(src: string) {
  const walk = walkAtlasSource(src);
  return walk ? { ...walk, sole: walk.height, atlasWidth: WALK_ATLAS.width, atlasHeight: WALK_ATLAS.height } : settleAtlasSource(src) ?? actionAtlasSource(src);
}

function frameSrc(file: string): string {
  return frameUrl(file) ?? '';
}

/**
 * Full-speed walk cycles per second while covering WALK_SPEED.
 * Playback follows distance (`WALK_STRIDE`), so a slower stick does not skate.
 * At full speed the new sheet completes 1.5 cycles per second on the shore.
 */
export const WALK_CYCLE_HZ = 1.5;
export const WALK_STRIDE = WALK_SPEED / WALK_CYCLE_HZ;
/**
 * Figure box height as a fraction of the world layer.
 * At WORLD_SCALE 1.46 a 0.15 box filled ~22% of the viewport and read as too tall
 * against the plate. 0.136 is about 20% of the viewport: taller than the
 * shore cat's painted body, still under that 22% mark.
 */
export const TRAVELER_HEIGHT = 0.136;
/**
 * Hall (木经堂) reads from a much nearer camera than the shore: the timber
 * pillars span ~3.7 m in the plate, so the shore's 0.136 box painted the
 * traveler at about a metre, roughly a third of the architecture. 0.22 keeps
 * a 1.75 m body at the scroll-and-pillar scale the hall art was drawn to.
 */
export const HALL_TRAVELER_HEIGHT = 0.22;

/** Figure box height for the scene the traveler is standing in. */
export function travelerHeight(scene: IslandScene): number {
  return scene === 'dba.scene.hall' ? HALL_TRAVELER_HEIGHT : TRAVELER_HEIGHT;
}
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
export const FRAME_BLEND_MS = 45;
export const TURN_BLEND_MS = 110;
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
  const ax = Math.abs(dx) * WORLD_ASPECT;
  const ay = Math.abs(dy);
  if (ax < 0.001 && ay < 0.001) return current;
  const side = current === 'left' || current === 'right';
  // A small dead band around diagonals avoids flickering between two sheets.
  if (ax >= ay * (side ? 0.85 : 1.15)) return dx < 0 ? 'left' : 'right';
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
  if (prev.pose !== next.pose) return TURN_BLEND_MS;
  if (prev.frame !== next.frame) return FRAME_BLEND_MS;
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

export function poseForSheet(pose: TravelerPose, _sheet: TravelerSheet): TravelerPose {
  return pose;
}

export function clipFrames(pose: TravelerPose, sheet: TravelerSheet): readonly string[] {
  return filesFor(pose, sheet).map(frameSrc);
}

type Motion = { gait: number; pose: TravelerPose; frame: number };

function useTravelerMotion(
  stride: number,
  override: 'auto' | 'interact' | 'reach' | 'drink' | 'lie' | 'rise',
  sheet: TravelerSheet,
  x: number,
  y: number,
  presentationFrozen: boolean,
  height: number,
  actionSeq: number,
  paused: boolean,
  actionElapsed?: number,
): Motion {
  const actionRef = useRef(actionSeq);
  const elapsedRef = useRef(actionElapsed); elapsedRef.current = actionElapsed;
  const pauseRef = useRef(paused);
  const pauseRevision = useRef(0);
  if (pauseRef.current !== paused) { pauseRef.current = paused; pauseRevision.current++; }
  actionRef.current = actionSeq;
  const strideRef = useRef(stride);
  const overrideRef = useRef(override);
  const sheetRef = useRef(sheet);
  const posRef = useRef({ x, y });
  const heightRef = useRef(height);
  heightRef.current = height;
  strideRef.current = stride;
  overrideRef.current = override;
  sheetRef.current = sheet;
  posRef.current = { x, y };
  const [motion, setMotion] = useState<Motion>({ gait: 0, pose: 'idle', frame: 0 });

  useEffect(() => {
    if (presentationFrozen || import.meta.env.MODE === 'test') return undefined;
    let raf = 0;
    let last = performance.now();
    let gait = 0;
    let walkPhase = 0;
    let idlePhase = 0;
    let reachPhase = 0;
    let previousAction = actionRef.current;
    let prevPose: TravelerPose = 'idle';
    let locomotion: TravelerLocomotion = 'idle';
    let lastPos = { ...posRef.current };
    let lastMovementAt = -Infinity;
    let activeActionTime = 0;
    let seenPause = pauseRevision.current;
    const tick = (now: number) => {
      const delta = seenPause === pauseRevision.current ? Math.max(0, now - last) : 0;
      seenPause = pauseRevision.current;
      const dt = Math.min(0.05, delta / 1000);
      last = now;
      if (pauseRef.current) { raf = window.requestAnimationFrame(tick); return; }
      const here = posRef.current;
      const moved = groundDistance(here, lastPos);
      const dist = moved < 0.1 ? moved : 0; // scene entry is not a step
      lastPos = here;
      const physicallyWalking = dist > 1e-6 && strideRef.current > 0.001;
      if (physicallyWalking) lastMovementAt = now;
      gait = stepGait(gait, physicallyWalking ? strideRef.current : 0, dt);
      // Movement and presentation have separate RAF/React commits. A missed
      // position sample must not insert a differently drawn idle into a step.
      // Explicit release still stops immediately; collision settles in 80 ms.
      locomotion = strideRef.current > 0.001 && now - lastMovementAt < 80 ? 'walk' : 'idle';
      const requested: TravelerPose = overrideRef.current === 'auto' ? locomotion : overrideRef.current;
      const pose = poseForSheet(requested, sheetRef.current);
      if (pose === 'walk') {
        if (dist > 1e-6) walkPhase = stepCycleByDistance(walkPhase, dist,
          WALK_STRIDE * heightRef.current / TRAVELER_HEIGHT * depthScale(here.y));
      } else if (pose === 'reach' || pose === 'drink' || pose === 'lie' || pose === 'rise') {
        if (prevPose !== pose || previousAction !== actionRef.current) activeActionTime = 0;
        else activeActionTime += delta;
        // Action timers use elapsed real time, matching their owners. Slow frames
        // must not consume the hold duration while leaving the arm in frame one.
        const duration = pose === 'drink' ? DRINK_HOLD_MS : pose === 'lie' ? REST_LOWER_MS : pose === 'rise' ? REST_RISE_MS : REACH_HOLD_MS;
        reachPhase = Math.min(.999, (elapsedRef.current ?? activeActionTime) / duration);
        previousAction = actionRef.current;
      } else idlePhase = stepCycle(idlePhase, 1, dt, IDLE_CYCLE_HZ);
      prevPose = pose;
      const phase = pose === 'walk' ? walkPhase : (pose === 'reach' || pose === 'drink' || pose === 'lie' || pose === 'rise') ? reachPhase : idlePhase;
      setMotion({ gait, pose, frame: frameIndex(phase, clipFrames(pose, sheetRef.current).length) });
      raf = window.requestAnimationFrame(tick);
    };
    raf = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(raf);
  }, [presentationFrozen]);

  if (presentationFrozen) return { gait: 0, pose: 'idle', frame: 0 };

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

const FRAME_SRC_API = {
  resolve: (id: string | null) => (id ? frameUrl(id) ?? null : null),
  load: (id: string | null) => (id ? loadFrame(id).then((url) => url || null) : Promise.resolve(null)),
  forget: (id: string) => forgetFrame(id),
};

export type FramePresentation = { blend:FrameBlend; shown:string; support:TravelerSupport|null; onError:()=>void };
/** One persistent display slot. current/outgoing call independently; no borrowed lastReady. */
function useFramePresentation(blend:FrameBlend|null,contactCleanup:boolean):FramePresentation|null {
  const facing=blend?.facing??'front';
  const files=filesFor(blend?.pose ?? 'idle', sheetOf(facing));
  const file=blend ? files[Math.min(files.length-1,Math.max(0,blend.frame))]??files[0] : null;
  const {src:loaded,onError}=useAssetSrc(file,FRAME_SRC_API);
  const [processed,setProcessed]=useState<{file:string;originalUrl:string;src:string}|null>(null);
  const lastReady=useRef<{shown:string;blend:FrameBlend}|null>(null);
  useEffect(() => {
    let live = true;
    // Keep the last ready bitmap on screen until the next punch resolves.
    // Clearing punched here unmounts <img> and leaves only the
    // viewport sole layer visible ("only feet") for the duration of decode.
    if (!file || !loaded) return undefined;
    const frameFile = file; // Stable non-null source identity for async closures.
    // useAssetSrc can expose its previous state for one render when file changes.
    // Keep lastReady rather than apply the next frame's coordinates to that bitmap.
    if (loaded !== frameUrl(file)) return undefined;
    if (import.meta.env.MODE === 'test' || atlasSource(loaded)) {
      setProcessed({file:frameFile,originalUrl:loaded,src:loaded});
      return undefined;
    }
    let timer: ReturnType<typeof setTimeout> | undefined;
    let pending = false;
    let retries = 0;
    async function attempt() {
      if (!live || pending) return;
      pending = true;
      try {
        const next = await punchHemUrl(loaded!, contactCleanup ? frameFile : undefined);
        if (live) setProcessed({file:frameFile,originalUrl:loaded!,src:next});
      } catch (error) {
        // Never clear lastReady, or spin on rejected/uncached processing.
        // Baseline only gains rejection handling, not new retry semantics.
        if (!live || !contactCleanup || retries >= 4) return;
        const retryAt = error instanceof Error && 'retryAt' in error && typeof error.retryAt === 'number'
          ? error.retryAt : Date.now() + Math.min(30000,5000*2**retries);
        if (!Number.isFinite(retryAt)) return;
        retries += 1;
        if (timer !== undefined) clearTimeout(timer);
        timer = setTimeout(() => { timer = undefined; void attempt(); }, Math.max(1,retryAt-Date.now()));
      } finally {
        pending = false;
      }
    }
    function online() {
      retries = 0;
      if (timer !== undefined) clearTimeout(timer);
      timer = undefined;
      wakeHemPunch(loaded!,frameFile);
      void attempt();
    }
    void attempt();
    if (contactCleanup) window.addEventListener('online',online);
    return () => {
      live = false;
      if (timer !== undefined) clearTimeout(timer);
      if (contactCleanup) window.removeEventListener('online',online);
    };
  }, [file, loaded, contactCleanup]);
  if (!blend || !file) {
    // Match the former outgoing component's logical unmount, not its view parent.
    lastReady.current=null;
    if (processed!==null) setProcessed(null);
    return null;
  }
  const matchingOriginal=loaded===frameUrl(file)?loaded:null;
  const punched=processed?.file===file && processed.originalUrl===matchingOriginal ? processed.src : null;
  // Advance live walk frames (and their stop) even if processing is slow.
  // Keep reviewed idle-turn lastReady and baseline idle-first-paint contracts.
  const advanceRaw=blend.pose==='walk' || lastReady.current?.blend.pose==='walk' || (contactCleanup && !lastReady.current);
  const current=punched || (advanceRaw ? matchingOriginal : null);
  if (current) lastReady.current={shown:current,blend};
  const shown=current || lastReady.current?.shown || '';
  const shownBlend=current ? blend : lastReady.current?.blend ?? blend;
  const cell = atlasSource(shown);
  const support = cell ? { file: cell.file, x: cell.width / 2, y: cell.sole, width: cell.width, height: cell.height }
    : contactCleanup && shownBlend.pose !== 'lie' ? supportForSource(shown) : null;
  return {blend:shownBlend,shown,support,onError};
}

/** Pure bitmap/metadata view; async work belongs entirely to the persistent slot. */
export function FramePictureView({picture,layer,onMount}:{picture:FramePresentation;layer:'out'|'current';onMount?:(node:HTMLSpanElement|null)=>void}) {
  const {blend,shown,support,onError}=picture;
  const cell = atlasSource(shown);
  const bitmap = cell ? shown.slice(0, shown.indexOf('#')) : shown;
  return (
    <span
      ref={onMount}
      className={layer === 'out' ? 'traveler-frame-wrap out' : 'traveler-frame-wrap'}
      data-mirror={blend.facing === 'left' ? 'yes' : 'no'}
      data-support-frame={support?.file}
      data-support-x={support?.x}
      data-support-y={support?.y}
      style={{ ...(support ? { transform: supportTransform(support, blend.facing === 'left', TRAVELER_FOOT) } : {}), ...(cell ? { overflow: 'hidden' } : {}) }}
    >
      {shown ? (
        <img
          // Native image ownership follows the bitmap, including standalone
          // processed frames. Changing src on an existing native image can
          // leave currentSrc empty even after its replacement was predecoded.
          // Within an atlas the node/URL stay fixed; only its crop changes.
          key={bitmap}
          className={layer === 'current' ? 'traveler-figure traveler-frame' : 'traveler-frame'}
          data-layer={layer}
          data-frame={blend.frame}
          data-atlas={cell ? cell.file : undefined}
          style={cell ? { position: 'absolute', width: `${cell.atlasWidth / cell.width * 100}%`, height: `${cell.atlasHeight / cell.height * 100}%`, left: `${-cell.x / cell.width * 100}%`, top: `${-cell.y / cell.height * 100}%`, maxWidth: 'none', objectFit: 'fill' } : undefined}
          src={bitmap}
          alt=""
          draggable={false}
          onError={onError}
        />
      ) : null}
    </span>
  );
}

export type TravelerProps = {
  x: number;
  y: number;
  facing: TravelerFacing;
  moving: boolean;
  /** 0–1 movement power. Defaults to a full step while `moving` is set. */
  stride?: number;
  /** `reach` and `drink` play on interaction; `lie` is the authored seated-rest clip. */
  actionSeq?: number;
  pose?: 'auto' | 'interact' | 'reach' | 'drink' | 'lie' | 'rise';
  /** Active-time action phase owned by WalkLayer; no second wall-clock timer. */
  actionElapsed?: number;
  paused?: boolean;
  /** Paint order against the guide. Near props stay above both. */
  depthZ?: number;
  /** Diagnostic presentation only; normal gameplay must leave this off. */
  presentationFrozen?: boolean;
  /** Candidate shore only: reviewed, alpha-only exterior contact cleanup. */
  contactCleanup?: boolean;
  /** Figure box as a fraction of the world. Defaults to the shared TRAVELER_HEIGHT. */
  height?: number;
};

export function useTravelerPresentation({
  x,
  y,
  facing,
  moving,
  stride,
  pose = 'auto',
  actionSeq = 0,
  actionElapsed,
  paused = false,
  depthZ = 5,
  presentationFrozen = false,
  contactCleanup = false,
  height = TRAVELER_HEIGHT,
}: TravelerProps) {
  const sheet = sheetOf(facing);
  const power = stride ?? (moving ? 1 : 0);
  const motion = useTravelerMotion(power, pose, sheet, x, y, presentationFrozen, height, actionSeq, paused, actionElapsed);
  const frames = clipFrames(motion.pose, sheet);
  const firstFile = filesFor(motion.pose, sheet)[0];
  const { src: firstSrc } = useAssetSrc(firstFile, FRAME_SRC_API);
  const firstReady = Boolean(firstSrc);
  const frame = heldFrameIndex(Math.min(frames.length - 1, motion.frame), firstReady);
  const current: FrameBlend = { sheet, pose: motion.pose, frame, facing };
  const [shown, setShown] = useState(current);
  const [outgoing, setOutgoing] = useState<FrameBlend | null>(null);
  const fade=useRef({token:0,startedAt:0,deadline:0,duration:0});
  if (presentationFrozen && outgoing) setOutgoing(null);
  if (!sameBlend(shown, current)) {
    // Do not crossfade away from a frame that has not finished: a 140ms unmount cancels 0B GETs.
    if (!presentationFrozen && blendDuration(shown, current) > 0 && firstReady) {
      const duration=blendDuration(shown,current)||FRAME_BLEND_MS;const startedAt=Date.now();
      fade.current={token:fade.current.token+1,startedAt,deadline:startedAt+duration,duration};
      setOutgoing(shown);
    } else if (!presentationFrozen && outgoing) {
      const duration=blendDuration(outgoing,current)||FRAME_BLEND_MS;const startedAt=Date.now();
      fade.current={token:fade.current.token+1,startedAt,deadline:startedAt+duration,duration};
    }
    setShown(current);
  }

  useEffect(() => {
    if (!outgoing || import.meta.env.MODE === 'test') return undefined;
    const remaining=Math.max(0,fade.current.deadline-Date.now());
    const id = window.setTimeout(() => setOutgoing(null), remaining);
    return () => window.clearTimeout(id);
  }, [outgoing, shown]);

  const blendMs = outgoing ? fade.current.duration : 0;
  const poseNow = pose === 'lie' ? 'lie' : motion.pose;
  const currentPicture=useFramePresentation(shown,contactCleanup)!;
  const outgoingPicture=useFramePresentation(outgoing,contactCleanup);
  const supported=currentPicture.support;
  const planted = worldToScreen({ x, y }, TRAVELER_FOOT);
  const fadeToken=fade.current.token;
  // Run once per native view mount, not every motion tick (which would double-advance CSS).
  const onOutgoingMount=useCallback((node:HTMLSpanElement|null)=>{
    if(node) node.style.animationDelay=`${-Math.max(0,Date.now()-fade.current.startedAt)}ms`;
  },[fadeToken]);
  return {x,y,facing,moving,paused,depthZ,presentationFrozen,contactCleanup,height,sheet,motion,frame,frameCount:frames.length,blendMs,poseNow,supported,planted,current:currentPicture,outgoing:outgoingPicture,fadeToken,onOutgoingMount};
}
export type TravelerPresentation=ReturnType<typeof useTravelerPresentation>;

export function TravelerView({presentation}:{presentation:TravelerPresentation}) {
  const {x,y,facing,moving,paused,depthZ,presentationFrozen,contactCleanup,height,sheet,motion,frame,frameCount,blendMs,poseNow,supported,planted,current,outgoing,fadeToken,onOutgoingMount}=presentation;
  return (
    <div
      className="traveler"
      data-testid="traveler"
      data-figure="traveler"
      data-contact-cleanup={contactCleanup ? 'yes' : 'no'}
      data-support-registered={supported ? 'yes' : undefined}
      data-facing={facing}
      data-sheet={sheet}
      data-moving={moving ? 'yes' : 'no'}
      data-animation-paused={paused ? 'yes' : 'no'}
      data-presentation-frozen={presentationFrozen ? 'yes' : undefined}
      data-pose={poseNow}
      data-gait={motion.gait.toFixed(2)}
      data-frame={frame}
      data-clip-frames={frameCount}
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
        ['--sole-y' as string]: `${(poseNow === 'lie' || supported ? TRAVELER_FOOT.y : TRAVELER_SOLE) * 100}%`,
        height: `${height * 100}%`,
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
      <div className="traveler-bob" style={presentationFrozen || supported ? { ...(presentationFrozen ? { animation: 'none' } : {}), ...(supported ? { transformOrigin: `50% ${TRAVELER_FOOT.y * 100}%` } : {}) } : undefined}>
        <span className="traveler-frames" style={{ ['--frame-blend' as string]: `${blendMs}ms` }}>
          {outgoing ? <FramePictureView key={fadeToken} picture={outgoing} layer="out" onMount={onOutgoingMount} /> : null}
          <FramePictureView picture={current} layer="current" />
        </span>
      </div>
    </div>
  );
}

/** Standalone compatibility owner. WalkLayer owns the hook above its conditional depth DOM. */
export function TravelerMark(props:TravelerProps) {
  const presentation=useTravelerPresentation(props);
  return <TravelerView presentation={presentation}/>;
}
