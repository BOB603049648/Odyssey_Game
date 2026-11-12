import { supportForSource, supportTransform, type TravelerSupport } from './travelerSupport';
import { useCallback, useEffect, useRef, useState } from 'react';
import { WALK_SPEED } from '../core/walk';
import { depthScale, worldToScreen } from '../core/world';
import { punchHemUrl, wakeHemPunch } from './hemPunch';
import { heldFrameIndex } from './travelerDisplay';
import { forgetFrame, frameUrl, loadFrame } from './travelerArt';
import { useAssetSrc } from './useAssetSrc';

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

const WALK_FILES: Record<TravelerSheet, readonly string[]> = {
  front: ['walk-front-01.png', 'walk-front-02.png', 'walk-front-03.png', 'walk-front-04.png'],
  side: ['walk-side-01.png', 'walk-side-02.png', 'walk-side-03.png', 'walk-side-04.png'],
  back: ['walk-back-01.png', 'walk-back-02.png', 'walk-back-03.png', 'walk-back-04.png'],
};

const IDLE_FILES: Record<TravelerSheet, readonly string[]> = {
  front: ['idle-front-01.png', 'idle-front-02.png'],
  side: ['idle-side-01.png', 'idle-side-02.png'],
  back: ['idle-back-01.png', 'idle-back-02.png'],
};

/** Back reach was not delivered. Missing sheets fall back to idle. */
const REACH_FILES: Partial<Record<TravelerSheet, readonly string[]>> = {
  front: ['reach-front-01.png', 'reach-front-02.png'],
  side: ['reach-side-01.png'],
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
 * against the plate. 0.136 is about 20% of the viewport: taller than the
 * shore cat's painted body, still under that 22% mark.
 */
export const TRAVELER_HEIGHT = 0.136;
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
  presentationFrozen: boolean,
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
    if (presentationFrozen || import.meta.env.MODE === 'test') return undefined;
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
      const physicallyWalking = dist > 1e-6 && strideRef.current > 0.001;
      gait = stepGait(gait, physicallyWalking ? strideRef.current : 0, dt);
      locomotion = physicallyWalking ? nextLocomotion(locomotion, gait) : 'idle';
      const requested: TravelerPose = overrideRef.current === 'auto' ? locomotion : overrideRef.current;
      const pose = poseForSheet(requested, sheetRef.current);
      if (pose === 'walk') {
        if (dist > 1e-6) walkPhase = stepCycleByDistance(walkPhase, dist);
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
  const files=blend?.pose==='walk'?WALK_FILES[sheetOf(facing)]:blend?.pose==='reach'?REACH_FILES[sheetOf(facing)]??IDLE_FILES[sheetOf(facing)]:IDLE_FILES[sheetOf(facing)];
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
    if (import.meta.env.MODE === 'test') {
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
  const support=contactCleanup && shownBlend.pose!=='lie'?supportForSource(shown):null;
  return {blend:shownBlend,shown,support,onError};
}

/** Pure bitmap/metadata view; async work belongs entirely to the persistent slot. */
export function FramePictureView({picture,layer,onMount}:{picture:FramePresentation;layer:'out'|'current';onMount?:(node:HTMLSpanElement|null)=>void}) {
  const {blend,shown,support,onError}=picture;
  return (
    <span
      ref={onMount}
      className={layer === 'out' ? 'traveler-frame-wrap out' : 'traveler-frame-wrap'}
      data-mirror={blend.facing === 'left' ? 'yes' : 'no'}
      data-support-frame={support?.file}
      data-support-x={support?.x}
      data-support-y={support?.y}
      style={support ? { transform: supportTransform(support, blend.facing === 'left', TRAVELER_FOOT) } : undefined}
    >
      {shown ? (
        <img
          className={layer === 'current' ? 'traveler-figure traveler-frame' : 'traveler-frame'}
          data-layer={layer}
          data-frame={blend.frame}
          src={shown}
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
  /** `reach` plays on a hotspot interaction. `interact` is still reserved, with no frames of its own. */
  pose?: 'auto' | 'interact' | 'reach' | 'lie';
  /** Paint order against the guide. Near props stay above both. */
  depthZ?: number;
  /** Diagnostic presentation only; normal gameplay must leave this off. */
  presentationFrozen?: boolean;
  /** Candidate shore only: reviewed, alpha-only exterior contact cleanup. */
  contactCleanup?: boolean;
};

export function useTravelerPresentation({
  x,
  y,
  facing,
  moving,
  stride,
  pose = 'auto',
  depthZ = 5,
  presentationFrozen = false,
  contactCleanup = false,
}: TravelerProps) {
  const sheet = sheetOf(facing);
  const power = stride ?? (moving ? 1 : 0);
  const motion = useTravelerMotion(power, pose, sheet, x, y, presentationFrozen);
  const frames = clipFrames(motion.pose, sheet);
  const firstFile =
    motion.pose === 'walk'
      ? WALK_FILES[sheet][0]
      : motion.pose === 'reach'
        ? (REACH_FILES[sheet] ?? IDLE_FILES[sheet])[0]
        : IDLE_FILES[sheet][0];
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
  const supported=contactCleanup?currentPicture.support:null;
  const planted = worldToScreen({ x, y }, TRAVELER_FOOT, poseNow === 'lie' ? 'rotate(-86deg)' : '');
  const fadeToken=fade.current.token;
  // Run once per native view mount, not every motion tick (which would double-advance CSS).
  const onOutgoingMount=useCallback((node:HTMLSpanElement|null)=>{
    if(node) node.style.animationDelay=`${-Math.max(0,Date.now()-fade.current.startedAt)}ms`;
  },[fadeToken]);
  return {x,y,facing,moving,depthZ,presentationFrozen,contactCleanup,sheet,motion,frame,frameCount:frames.length,blendMs,poseNow,supported,planted,current:currentPicture,outgoing:outgoingPicture,fadeToken,onOutgoingMount};
}
export type TravelerPresentation=ReturnType<typeof useTravelerPresentation>;

export function TravelerView({presentation}:{presentation:TravelerPresentation}) {
  const {x,y,facing,moving,depthZ,presentationFrozen,contactCleanup,sheet,motion,frame,frameCount,blendMs,poseNow,supported,planted,current,outgoing,fadeToken,onOutgoingMount}=presentation;
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
