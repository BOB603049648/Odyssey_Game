import { useTravelerAudio } from '../audio/useTravelerAudio';
import { useCharacterAction } from './characterActionTimeline';
import { companionPerformanceKind, useCompanionPerformance } from './companionPerformance';
import { usePagePresentation } from './useCinematicClock';
import type { WorldState } from '../core/worldState';
import { WorldStateLayer } from './WorldStateLayer';
import { useCatRecordRecovery } from './useCatRecordRecovery';
import { getShoreVisualProfile } from '../dev/shoreVisualProfile';
import { catDisplaySnapshot, lookupCatDisplay, writeCatDisplayAttributes } from './catDisplay';
import { travelerContactFile } from './hemPunch';
import { useEffect, useRef, useState } from 'react';
import type { CatPost } from '../core/companionPost';
import { companionFace, NANAICHA_HEIGHT, SHORE_CAT_HEIGHT } from '../core/companionPost';
import { catMotionGeometry } from './catMotionGeometry';
import { companionFrameId, trajClip, type GuidePhase, type TrajClip } from '../core/companionTraj';
import type { CompanionPose, HintAnchor } from '../core/hints';
import type { IslandScene } from '../core/island';
import type { HintLevel } from '../core/schema';
import { BANDS, SPAWNS, SPOTS, closestSpot, gateAt, gatesFrom, nearestSpot, plantOnGround, standsAt, type GateEdge } from '../core/stage';
import { stepWorld } from '../core/worldLoop';
import { groundStep } from '../core/navigation';
import {
  WALK_SPEED,
  groundDistance,
  worldSize,
  cameraOffset,
  followCamera,
  inRadius,
  lookEast,
  pathExitNear,
  pathExitPoint,
  pointerToWorld,
  reachOf,
  stepKey,
  type Point,
  type WalkKey,
} from '../core/walk';
import { sceneAssembly } from '../content/catalog';
import { slotAssetUrl, trajAssetUrl } from '../content/assetUrls';
import { forgetSlotAsset, loadSlotAsset, preloadSceneAssets, resolveSlotAsset } from '../content/slotAssets';
import { CompanionView, useCompanionPresentation } from './Companion';
import type { KnotMark } from './companion/CatMark';
import { Glyph } from './glyphs';
import { t } from './i18n';
import { PlateStack, SlotPiece, groundDepthSlots, type SpotBeat } from './Plate';
import { GroundDepth, type GroundDepthNode } from './GroundDepth';
import { worldContactBox } from './soleCoordinates';
import { gateLabel, type SpotView } from './spotViews';
import { sceneGrade, sceneLook, sceneStrip } from './cohesion';
import { forgetTraj, loadTraj, trajUrl } from './trajArt';
import { contactLift, contactOpacity, depthScale, worldToScreen } from '../core/world';
import { catContactUrl, clippedBootUrl } from './soleClip';
import { FirstScreenGate } from './FirstScreenGate';
import { facingFromMove, TravelerView, travelerHeight, useTravelerPresentation, type TravelerFacing } from './Traveler';
import { useFirstScreenReady } from './firstScreenReady';
import { useAssetSrc } from './useAssetSrc';

import { WalkStick } from './WalkStick';
import { StageControls } from './StageControls';
import { WorldFeedback } from './WorldFeedback';
import { useCrossfade } from './useCrossfade';
import { useShoreCuePresentation } from './useShoreCuePresentation';

type Hint = { level: HintLevel; anchor: HintAnchor; wordId: string | null; pose: CompanionPose };

function isInteractKey(event: KeyboardEvent): boolean {
  const key = event.key;
  if (key === 'e' || key === 'E' || key === 'f' || key === 'F' || key === 'Enter' || key === ' ') return true;
  return event.code === 'KeyE' || event.code === 'KeyF' || event.code === 'Enter' || event.code === 'NumpadEnter' || event.code === 'Space';
}

function keyOf(event: KeyboardEvent): WalkKey | null {
  const code = event.code;
  const key = event.key.toLowerCase();
  if (code === 'KeyA' || code === 'ArrowLeft' || key === 'a' || key === 'arrowleft') return 'a';
  if (code === 'KeyD' || code === 'ArrowRight' || key === 'd' || key === 'arrowright') return 'd';
  if (code === 'KeyW' || code === 'ArrowUp' || key === 'w' || key === 'arrowup') return 'w';
  if (code === 'KeyS' || code === 'ArrowDown' || key === 's' || key === 'arrowdown') return 's';
  return null;
}

function pct(value: number): string {
  return `${value * 100}%`;
}

function entrySide(edge: GateEdge | undefined): string | null {
  if (edge === 'east') return 'from-left';
  if (edge === 'west') return 'from-right';
  if (edge === 'north') return 'from-down';
  if (edge === 'south') return 'from-up';
  return null;
}

const SLOT_SRC_API = {
  resolve: resolveSlotAsset,
  load: loadSlotAsset,
  forget: forgetSlotAsset,
};

const TRAJ_SRC_API = {
  resolve: (id: string | null) => (id ? trajUrl(id) ?? null : null),
  load: (id: string | null) => (id ? loadTraj(id) : Promise.resolve(null)),
  forget: (id: string) => forgetTraj(id),
};

export function WalkLayer({
  scene,
  drank,
  spots,
  hint,
  paused,
  purr,
  knot,
  remembered,
  onRemember,
  onExit,
  onInteract,
  onAsk,
  onEscape,
  taught = false,
  onTeach,
  showWalkMask = false,
  catPost,
  onFar,
  onApproachHint,
  resting = false,
  flash = null,
  beat = null,
  presentationFrozen = false,
  interactionSeq = 0,
  worldState,
}: {
  scene: IslandScene;
  drank: boolean;
  spots: SpotView[];
  hint: Hint;
  paused: boolean;
  purr: boolean;
  knot: KnotMark;
  remembered: Point | null;
  onRemember: (scene: IslandScene, pos: Point) => void;
  onExit: (scene: IslandScene) => void;
  onInteract: (id: string) => void;
  onAsk: () => void;
  onEscape: () => void;
  taught?: boolean;
  onTeach?: () => void;
  showWalkMask?: boolean;
  catPost: CatPost;
  onFar?: (id: string) => void;
  /** True while the one-shot driftwood approach line is on screen. */
  onApproachHint?: (visible: boolean) => void;
  resting?: boolean;
  flash?: { kind: 'driftwood' | 'sleep' | 'give'; seq: number; x: number; y: number } | null;
  beat?: SpotBeat | null;
  /** Static local fixture only. Does not pause asset/contact RAF work. */
  presentationFrozen?: boolean;
  interactionSeq?: number;
  worldState?: WorldState;
}) {
  const painted = !presentationFrozen;
  const { visible, reduced } = usePagePresentation();
  const firstScreen = useFirstScreenReady(scene, 'land-companion', painted);
  const viewportRef = useRef<HTMLDivElement>(null);
  const soleRef = useRef<HTMLImageElement>(null);
  const catSoleRef = useRef<HTMLImageElement>(null);
  const catDiagnosticRef = useRef<HTMLOutputElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const pending = useRef<Point | null>(null);
  const sceneRef = useRef(scene);
  const spotsRef = useRef(spots);
  const hintRef = useRef(hint);
  const pausedRef = useRef(paused);
  const rememberRef = useRef(onRemember);
  const exitRef = useRef(onExit);
  const interactRef = useRef(onInteract);
  const farRef = useRef(onFar);
  const escapeRef = useRef(onEscape);
  const targetRef = useRef<Point | null>(null);
  const stickRef = useRef<Point | null>(null);
  const smoothRef = useRef<Point | null>(null);
  const entryRef = useRef<string | null>(null);
  const held = useRef(new Set<WalkKey>());
  const movingRef = useRef(false);
  const velocityRef = useRef<Point>({ x: 0, y: 0 });
  // Frozen composition fixtures can place feet on either side of a prop to test
  // depth sorting. Live saves always pass through the current navigation mask.
  const initialFoot = remembered ?? SPAWNS[scene];
  const posRef = useRef<Point>(presentationFrozen ? initialFoot : plantOnGround(scene, initialFoot));
  const [pos, setPos] = useState<Point>(posRef.current);
  const [facing, setFacing] = useState<TravelerFacing>('front');
  const [moving, setMoving] = useState(false);
  const [stride, setStride] = useState(0);
  const [blocked, setBlocked] = useState(false);
  const [cat, setCat] = useState<Point>({ x: catPost.x, y: catPost.y });
  const [clip, setClip] = useState<TrajClip>('land');
  const [guide, setGuide] = useState<GuidePhase>('hold');
  const [land, setLand] = useState(false);
  const landTimer = useRef(0);
  const postRef = useRef(catPost);
  const catRef = useRef(cat);
  const beatRef = useRef(catPost.beat);
  const guideRef = useRef<GuidePhase>('hold');
  const guideElapsed = useRef(0);
  const clipRef = useRef<TrajClip>('land');
  postRef.current = catPost;
  catRef.current = cat;
  const [view, setView] = useState({ w: 1280, h: 720 });
  const [arrive, setArrive] = useState<string | null>(null);
  const [cam, setCam] = useState<Point>({ x: 0, y: 0 });
  const [teachLine, setTeachLine] = useState(false);
  const worldPaused = paused || !visible || firstScreen.status !== 'ready';
  const performancePaused = worldPaused || presentationFrozen;
  const body = useCharacterAction(!performancePaused, scene);
  const handledResponse = useRef(interactionSeq);
  useEffect(() => {
    if (handledResponse.current === interactionSeq) return;
    handledResponse.current = interactionSeq;
    if (beat?.kind !== 'ok') return;
    if (beat.spot === 'food-inspect' || beat.spot === 'food-self' || beat.spot === 'food-companion') { body.cancel(); return; }
    if (beat.spot === 'camp-sleep') body.begin('rest');
    else if (beat.spot === 'island-gourd' || beat.spot === 'act:dba.word.drink') body.begin('drink');
    else if (beat.spot === 'water-take' || beat.spot === 'water-spring' || beat.spot === 'food-take' || beat.spot === 'yard-give') body.begin('reach');
    const targetId = beat.spot === 'water-take' ? 'island-gourd' : beat.spot === 'food-take' ? 'yard-grab' : beat.spot;
    const target = spotsRef.current.find(spot => spot.id === targetId);
    if (target) setFacing(current => target.x < posRef.current.x - .005 ? 'left' : target.x > posRef.current.x + .005 ? 'right' : current === 'left' ? 'left' : 'right');
  }, [interactionSeq, beat?.kind, beat?.spot, body.begin, body.cancel]);
  const restingNow = resting || body.kind === 'rest';
  const driftSeek = useRef(0);
  const restingRef = useRef(restingNow);
  restingRef.current = restingNow;
  useEffect(() => {
    if (!restingNow) return;
    targetRef.current = null;
    held.current.clear();
    stickRef.current = null;
  }, [restingNow]);
  const viewRef = useRef(view);
  const plates = useCrossfade(scene, 980);
  const depthComparison = getShoreVisualProfile().fixture !== null && new URLSearchParams(window.location.search).get('depth') === 'legacy';
  const depthScenes = !depthComparison
    ? [plates.current, ...(plates.previous ? [plates.previous] : [])] : [];
  const sharedDepth = depthScenes.length > 0;
  viewRef.current = view;

  spotsRef.current = spots;
  hintRef.current = hint;
  pausedRef.current = worldPaused;
  rememberRef.current = onRemember;
  exitRef.current = onExit;
  interactRef.current = onInteract;
  farRef.current = onFar;
  escapeRef.current = onEscape;
  movingRef.current = moving;

  if (sceneRef.current !== scene) {
    const next = plantOnGround(scene, pending.current ?? remembered ?? SPAWNS[scene]);
    pending.current = null;
    sceneRef.current = scene;
    posRef.current = next;
    targetRef.current = null;
    stickRef.current = null;
    smoothRef.current = null;
    velocityRef.current = { x: 0, y: 0 };
    held.current.clear();
    setArrive(entryRef.current);
    entryRef.current = null;
    setPos(next);
    setMoving(false);
    setStride(0);
    setBlocked(false);
    const plantedCat = { x: catPost.x, y: catPost.y };
    catRef.current = plantedCat;
    beatRef.current = catPost.beat;
    guideRef.current = 'hold';
    guideElapsed.current = 0;
    clipRef.current = 'land';
    setCat(plantedCat);
    setGuide('hold');
    setClip('land');
    setLand(false);
    setTeachLine(false);
    window.clearTimeout(driftSeek.current);
  } else if (beatRef.current !== catPost.beat) {
    beatRef.current = catPost.beat;
    guideRef.current = 'gaze';
    guideElapsed.current = 0;
    clipRef.current = 'land';
    setGuide('gaze');
    setClip('land');
  }

  useEffect(() => {
    return () => rememberRef.current(sceneRef.current, posRef.current);
  }, []);

  useEffect(() => {
    const el = viewportRef.current;
    if (!el) return undefined;
    const read = () => {
      const w = el.clientWidth;
      const h = el.clientHeight;
      if (w > 1 && h > 1) setView({ w, h });
    };
    read();
    if (import.meta.env.MODE !== 'test' && !smoothRef.current && el.clientWidth > 1) {
      smoothRef.current = cameraOffset(posRef.current, el.clientWidth, el.clientHeight);
      setCam(smoothRef.current);
    }
    if (typeof ResizeObserver === 'undefined') return undefined;
    const observer = new ResizeObserver(read);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  function heldDirection(): Point | null {
    let x = 0;
    let y = 0;
    if (held.current.has('a')) x -= 1;
    if (held.current.has('d')) x += 1;
    if (held.current.has('w')) y -= 1;
    if (held.current.has('s')) y += 1;
    const stick = stickRef.current;
    if (stick) {
      x += stick.x;
      y += stick.y;
    }
    const len = Math.hypot(x, y);
    if (len < 0.12) return null;
    const power = Math.min(1, len);
    return { x: (x / len) * power, y: (y / len) * power };
  }

  function apply(next: Point, isMoving: boolean, isBlocked: boolean, dx: number, dy: number, power = 1) {
    const planted = groundStep(sceneRef.current, posRef.current, next);
    const moved = groundDistance(planted, posRef.current) > 1e-6;
    isBlocked ||= groundDistance(planted, next) > 1e-7;
    isMoving &&= moved;
    const gate = gateAt(sceneRef.current, planted);
    if (gate) {
      velocityRef.current = { x: 0, y: 0 };
      pending.current = gate.arrival;
      entryRef.current = entrySide(gate.edge);
      targetRef.current = null;
      stickRef.current = null;
      held.current.clear();
      rememberRef.current(gate.to, gate.arrival);
      exitRef.current(gate.to);
      return;
    }
    next = planted;
    posRef.current = next;
    setFacing((current) => facingFromMove(dx, dy, current));
    setPos(planted);
    setMoving(isMoving);
    if (isMoving) body.cancel();
    setStride(isMoving ? Math.min(1, Math.max(0, power)) : 0);
    setBlocked(isBlocked);
    movingRef.current = isMoving;
  }

  function beginReach(point?: Point) {
    setFacing(current => point && point.x < posRef.current.x - .005 ? 'left' : point && point.x > posRef.current.x + .005 ? 'right' : current === 'left' ? 'left' : 'right');
    body.begin('reach');
  }

  function interruptForMovement() {
    body.cancel();
    if (!resting) restingRef.current = false;
  }

  function seek(point: Point) {
    interruptForMovement();
    const band = BANDS[sceneRef.current];
    targetRef.current = plantOnGround(sceneRef.current, {
      x: Math.min(band.maxX, Math.max(band.minX, point.x)),
      y: Math.min(band.maxY, Math.max(band.minY, point.y)),
    });
  }

  function onGround(event: React.PointerEvent<HTMLDivElement>) {
    if (pausedRef.current || event.button !== 0) return;
    const rect = worldRef.current?.getBoundingClientRect();
    if (!rect) return;
    const point = pointerToWorld(event.clientX, event.clientY, rect);
    if (!point) return;
    seek(point);
  }

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        escapeRef.current();
        return;
      }
      if (pausedRef.current) return;
      const target = event.target instanceof Element ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (isInteractKey(event)) {
        // Native controls own Enter/Space, including a focused world hotspot.
        // Otherwise pressing Enter on the HUD also dispatches a nearby action.
        if ((event.key === 'Enter' || event.key === ' ') && target?.closest('button, a, [role="button"]')) return;
        if (event.repeat) return;
        const standing = nearestSpot(spotsRef.current, posRef.current, sceneRef.current);
        if (standing) {
          event.preventDefault();
          beginReach(standing);
          interactRef.current(standing.id);
          return;
        }
        const aimed = closestSpot(spotsRef.current, posRef.current);
        if (!aimed) return;
        event.preventDefault();
        farRef.current?.(aimed.id);
        return;
      }
      const key = keyOf(event);
      if (!key) return;
      event.preventDefault();
      interruptForMovement();
      held.current.add(key);
      targetRef.current = null;
      if (!event.repeat && import.meta.env.MODE === 'test') {
        const from = posRef.current;
        const step = stepKey(from, key, BANDS[sceneRef.current]);
        const dx = key === 'a' ? -1 : key === 'd' ? 1 : 0;
        const dy = key === 'w' ? -1 : key === 's' ? 1 : 0;
        apply(step.pos, step.moving, step.blocked, dx, dy);
      }
    };
    const onKeyUp = (event: KeyboardEvent) => {
      const key = keyOf(event);
      if (key) held.current.delete(key);
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    const onBlur = () => {
      held.current.clear();
      stickRef.current = null;
      targetRef.current = null;
      velocityRef.current = { x: 0, y: 0 };
    };
    window.addEventListener('blur', onBlur);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onBlur);
    };
  }, []);

  useEffect(() => {
    if (import.meta.env.MODE === 'test') return undefined;
    let frame = 0;
    let last = performance.now();
    const tick = (now: number) => {
      const dt = Math.min(0.05, (now - last) / 1000);
      last = now;
      if (!pausedRef.current) {
        const lying = restingRef.current;
        if (lying) {
          velocityRef.current = { x: 0, y: 0 };
          if (movingRef.current) {
            movingRef.current = false;
            setMoving(false);
            setStride(0);
          }
        }
        const from = posRef.current;
        const prevCat = catRef.current;
        const desired = postRef.current;
        const stepped = stepWorld({
          scene: sceneRef.current,
          walker: { pos: from, velocity: lying ? { x: 0, y: 0 } : velocityRef.current, seek: lying ? null : targetRef.current },
          intent: { move: lying ? null : heldDirection(), seek: lying ? null : targetRef.current },
          band: BANDS[sceneRef.current],
          dt,
          guide: {
            phase: guideRef.current,
            elapsed: guideElapsed.current,
            cat: prevCat,
            post: { x: desired.x, y: desired.y },
            ready: guideReadyRef.current,
          },
        });
        velocityRef.current = stepped.walker.velocity;
        // A route selected while resting waits for the rise instead of being
        // discarded every frame. Clear only the old intent when rest starts.
        if (!lying) targetRef.current = stepped.walker.seek;
        const speed = groundDistance(stepped.walker.velocity, { x: 0, y: 0 });
        if (stepped.walker.moving) {
          apply(
            stepped.walker.pos,
            true,
            stepped.walker.blocked,
            stepped.walker.velocity.x,
            stepped.walker.velocity.y,
            Math.min(1, speed / WALK_SPEED),
          );
        } else if (movingRef.current) {
          movingRef.current = false;
          setMoving(false);
          setStride(0);
          setBlocked(false);
        }
        guideElapsed.current = stepped.guide.elapsed;
        catRef.current = stepped.guide.cat;
        const clipNow = trajClip(stepped.guide.elapsed, {phase:stepped.guide.phase,cat:stepped.guide.cat,post:desired});
        if (guideRef.current === 'move' && stepped.guide.phase === 'hold') {
          setLand(true);
          window.clearTimeout(landTimer.current);
          landTimer.current = window.setTimeout(() => setLand(false), 280);
        }
        if (stepped.guide.phase !== guideRef.current) {
          guideRef.current = stepped.guide.phase;
          setGuide(stepped.guide.phase);
        }
        if (clipNow !== clipRef.current) {
          clipRef.current = clipNow;
          setClip(clipNow);
        }
        if (stepped.guide.cat.x !== prevCat.x || stepped.guide.cat.y !== prevCat.y) setCat(stepped.guide.cat);
        const frameEl = viewportRef.current;
        if (frameEl && frameEl.clientWidth > 1 && (frameEl.clientWidth !== viewRef.current.w || frameEl.clientHeight !== viewRef.current.h)) {
          const nextView = { w: frameEl.clientWidth, h: frameEl.clientHeight };
          viewRef.current = nextView;
          setView(nextView);
        }
        const frameView = viewRef.current;
        const goalCam = cameraOffset(posRef.current, frameView.w, frameView.h);
        const prevCam = smoothRef.current ?? goalCam;
        const gap = Math.hypot(goalCam.x - prevCam.x, goalCam.y - prevCam.y);
        const nextCam = !smoothRef.current || gap < 1.5
          ? goalCam
          : followCamera(prevCam, goalCam, 1 - Math.exp(-2.6 * dt));
        smoothRef.current = nextCam;
        setCam(nextCam);
      }
      const sole = soleRef.current;
      const vp = viewportRef.current;
      const img = vp?.querySelector('.traveler-figure');
      const catImg = vp?.querySelector('.nanaicha-ground');
      const anchor = vp?.querySelector('[data-testid="companion-anchor"]');
      const worldContact = vp?.dataset.groundDepth === 'world';
      // Capture the same-frame containing origin before any contact writes. No second scale/support adjustment.
      const contactOrigin = worldContact ? worldRef.current?.getBoundingClientRect() : vp?.getBoundingClientRect();
      const humanRect = img instanceof HTMLImageElement ? img.getBoundingClientRect() : null;
      const catRect = catImg instanceof HTMLImageElement ? catImg.getBoundingClientRect() : null;
      if (sole && vp && img instanceof HTMLImageElement && humanRect && contactOrigin) {
        const ir = humanRect;
        const pose = vp.querySelector('[data-testid="traveler"]')?.getAttribute('data-pose');
        if (pose === 'lie' || img.dataset.atlas || ir.width < 2) {
          sole.style.visibility = 'hidden';
        } else {
          sole.style.visibility = 'visible';
          const src = img.currentSrc || img.src;
          if (sole.dataset.base !== src) {
            const clipped = clippedBootUrl(img);
            if (clipped) {
              sole.dataset.base = src;
              sole.src = clipped;
              sole.dataset.contact = travelerContactFile(src) ? 'contour' : 'legacy';
            }
          }
          const box = worldContactBox(ir, contactOrigin, 14);
          sole.style.left = `${box.left}px`;
          sole.style.top = `${box.top}px`;
          sole.style.width = `${box.width}px`;
          sole.style.height = `${box.height}px`;
          sole.style.setProperty('--fit', box.fit.toFixed(4));
          if (worldContact && sole.dataset.base !== src) sole.style.visibility = 'hidden';
          sole.style.transform = img.parentElement?.getAttribute('data-mirror') === 'yes' ? 'scaleX(-1)' : 'none';
        }
      }
      const catSole = catSoleRef.current;
      const actualContact = vp?.dataset.catContactSource === 'actual';
      const displayedCat = actualContact && catImg instanceof HTMLImageElement ? lookupCatDisplay(catImg.currentSrc || catImg.src) : null;
      const shoreCat =
        vp?.getAttribute('data-scene') === 'dba.scene.shore' &&
        (actualContact ? displayedCat !== null : (anchor?.getAttribute('data-sprite') ?? '').startsWith('land-shore'));
      if (catSole && vp && shoreCat && catImg instanceof HTMLImageElement && anchor instanceof HTMLElement && catRect && contactOrigin) {
        const cr = catRect;
        const tip = actualContact ? displayedCat!.supportY : parseFloat(anchor.style.getPropertyValue('--sole-y')) / 100;
        if (cr.width < 2 || !Number.isFinite(tip)) {
          catSole.style.visibility = 'hidden';
        } else {
          const src = catImg.currentSrc || catImg.src;
          const key = `${src}@${tip.toFixed(4)}`;
          if (catSole.dataset.base !== key) {
            const contact = catContactUrl(catImg, tip);
            if (contact) {
              catSole.dataset.base = key;
              catSole.src = contact;
            }
          }
          if (catSole.dataset.base === key) {
            const box = worldContactBox(cr, contactOrigin, 16);
            const fit = box.fit;
            catSole.style.visibility = 'visible';
            catSole.style.left = `${box.left}px`;
            catSole.style.top = `${box.top}px`;
            catSole.style.width = `${box.width}px`;
            catSole.style.height = `${box.height}px`;
            catSole.style.setProperty('--fit', fit.toFixed(4));
            catSole.style.setProperty('--cat-a', `${((tip - 0.09) * fit * 100).toFixed(2)}%`);
            catSole.style.setProperty('--cat-b', `${((tip - 0.05) * fit * 100).toFixed(2)}%`);
            catSole.style.setProperty('--cat-c', `${Math.min(97, (tip + 0.11) * fit * 100).toFixed(2)}%`);
            catSole.style.setProperty('--cat-d', `${Math.min(99.2, (tip + 0.15) * fit * 100).toFixed(2)}%`);
            catSole.style.transform = anchor.getAttribute('data-face') === 'left' ? 'scaleX(-1)' : 'none';
          } else if (actualContact) {
            catSole.style.visibility = 'hidden'; // Never retain another image's contact after an unmatched swap.
          }
        }
      } else if (catSole) {
        catSole.style.visibility = 'hidden';
      }
      const diagnostic = catDiagnosticRef.current;
      const world = worldRef.current;
      if (diagnostic && vp && world && catImg instanceof HTMLImageElement && anchor instanceof HTMLElement) {
        writeCatDisplayAttributes(catImg, true);
        const value = JSON.stringify(catDisplaySnapshot(catImg, anchor, world.getBoundingClientRect(), vp.getBoundingClientRect()));
        if (diagnostic.textContent !== value) diagnostic.textContent = value;
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  // Decode both leap poses during the existing gaze. A failed/missing frame
  // waits here, not halfway across the scene on a stationary landing bitmap.
  const warmLeap = !presentationFrozen && guide !== 'hold';
  const {src:leap01} = useAssetSrc(warmLeap ? 'leap-01' : null, TRAJ_SRC_API);
  const {src:leap02} = useAssetSrc(warmLeap ? 'leap-02' : null, TRAJ_SRC_API);
  const guideReadyRef = useRef(false);
  guideReadyRef.current = !!leap01 && !!leap02;
  const { w: worldW, h: worldH } = worldSize(view.w, view.h);
  const requestedCatSprite = companionFrameId(catPost.beat, clip);
  const catPerformance = companionPerformanceKind(hint.pose === 'fetch' || hint.pose === 'paw' ? hint.pose : catPost.pose,
    hint.level, restingNow, beat?.kind === 'ok' && beat.spot === 'yard-give' && body.kind === 'reach');
  const performanceFrame = useCompanionPerformance(catPerformance, !performancePaused && guide === 'hold', interactionSeq, reduced);
  // A single mounted preload owns retry timing for the whole sheet. Changing
  // pose cells must not create new retry consumers or bypass its backoff.
  useAssetSrc(!presentationFrozen ? 'pose-observe-01' : null, TRAJ_SRC_API);
  // The shared sheet publishes every cell atomically. useAssetSrc's state can
  // lag a new cell id by one render; that is not a missing bitmap and must not
  // temporarily swap to the standing fallback/remount the native atlas image.
  const performanceReady = !!trajUrl(performanceFrame);
  // Contract permits the complete scene prop as a temporary Y0 landing fallback.
  // Keep the beat/guide/queue and the dedicated trajectory file untouched.
  const yardLandingFallback = scene === 'dba.scene.yard' && requestedCatSprite === 'land-yard-give';
  const legacyCatSprite = yardLandingFallback ? 'fallback' : requestedCatSprite;
  const targetCatSprite = !presentationFrozen && guide === 'hold' && performanceReady ? performanceFrame : legacyCatSprite;
  const groundAsset = painted ? null : sceneAssembly(scene)?.slots.find((slot) => slot.slot === 'ground')?.asset ?? null;
  const { src: groundPlate, onError: onGroundError } = useAssetSrc(groundAsset, SLOT_SRC_API);
  const slotCat =
    scene === 'dba.scene.camp'
      ? 'art.camp.prop.nanaicha'
      : scene === 'dba.scene.yard' || scene === 'dba.scene.path'
        ? 'art.yard.prop.nanaicha'
        : 'art.shore.prop.nanaicha';
  // Prewarm the complete standing fallback as well as the optional pose sheet.
  // A sheet failure must not remove the guide or prevent an otherwise ready scene.
  const { src: trajFigure } = useAssetSrc(legacyCatSprite === 'fallback' ? null : legacyCatSprite, TRAJ_SRC_API);
  const { src: slotCatFigure } = useAssetSrc(slotCat, SLOT_SRC_API);
  // A target beat is not an arrived picture. Keep one committed, scene-scoped
  // record through gaze/cold loading; metadata always follows its actual bitmap.
  // The decode hooks above still preload the target while the departure is shown.
  type CatRecord = { scene: IslandScene; frame: string; figure: string };
  const committedCat = useRef<CatRecord | null>(null);
  const previousCat = committedCat.current?.scene === scene ? committedCat.current : null;
  // Hook state can lag an id change by one render. Never pair that old URL with
  // the requested frame, or reuse the previous scene's fallback on entry.
  const readyTraj = targetCatSprite === 'fallback' ? undefined : trajUrl(targetCatSprite)
    ?? (trajFigure === trajAssetUrl(targetCatSprite) ? trajFigure : undefined);
  const initialCat: CatRecord | null = slotCatFigure && slotCatFigure === slotAssetUrl(slotCat)
    ? { scene, frame: 'fallback', figure: slotCatFigure } : null;
  const requestedCat: CatRecord | null = readyTraj
    ? { scene, frame: targetCatSprite, figure: readyTraj }
    : targetCatSprite === 'fallback' ? initialCat : null;
  const shownCat = guide === 'gaze' ? previousCat ?? initialCat
    : requestedCat ?? previousCat ?? initialCat;
  // If arrival precedes target decode, keep the final ready leap at the now-fixed
  // arrival foot. Never move a held departure landing: the guide gates on leaps.
  const catSprite = shownCat?.frame ?? 'fallback';
  const catFigure = shownCat?.figure;
  const catRecovery = useCatRecordRecovery(shownCat ? {
    scene, kind: catSprite === 'fallback' ? 'slot' : 'traj',
    id: catSprite === 'fallback' ? slotCat : catSprite,
    originalURL: shownCat.figure, api: catSprite === 'fallback' ? SLOT_SRC_API : TRAJ_SRC_API,
  } : null, () => { committedCat.current = shownCat; });
  const flashId = painted ? null :
    flash?.kind === 'driftwood'
      ? 'art.shore.prop.driftwood.interact'
      : flash?.kind === 'sleep'
        ? 'art.camp.prop.sleep-mat.interact'
        : flash?.kind === 'give'
          ? 'art.yard.prop.grain-bags.interact'
          : null;
  const { src: flashSrc, onError: onFlashError } = useAssetSrc(flashId, SLOT_SRC_API);
  useEffect(() => {
    const kit = sceneAssembly(scene);
    preloadSceneAssets(painted ? [`art.${scene.split('.').at(-1)}.landscape`] : kit?.slots.map((slot) => slot.asset) ?? []);
  }, [scene, painted]);
  // Only the explicitly frozen depth matrix shares a fixed reference camera; live camera is unchanged.
  const fixedFixtureCamera = presentationFrozen && getShoreVisualProfile().fixture?.startsWith('depth-')
    ? cameraOffset(SPAWNS['dba.scene.shore'], view.w, view.h) : null;
  const rawCam = fixedFixtureCamera ?? (import.meta.env.MODE === 'test' ? cameraOffset(pos, view.w, view.h) : cam);
  const shownCam = lookEast(rawCam, view.w, scene === 'dba.scene.shore', undefined, view.h);
  const look = sceneLook(scene);
  const near = spots.filter((spot) => standsAt(scene, spot, pos)).map((spot) => spot.id);
  const glance = spots
    .filter((spot) => !near.includes(spot.id) && reachOf(Math.hypot(spot.x - pos.x, spot.y - pos.y), spot.r) === 'glance')
    .map((spot) => spot.id);
  const teachSpot = near.includes('shore-driftwood') ? 'shore-driftwood' : '';
  const onTeachRef = useRef(onTeach);
  const taughtRef = useRef(taught);
  const approachRef = useRef(onApproachHint);
  onTeachRef.current = onTeach;
  taughtRef.current = taught;
  approachRef.current = onApproachHint;
  const spotIds = spots.map((spot) => spot.id);
  const sleepFoot = SPOTS[scene].find((spot) => spot.id === 'camp-sleep');
  const feetY = resting && sleepFoot ? sleepFoot.y : pos.y;
  useShoreCuePresentation(viewportRef, scene === 'dba.scene.shore',
    [shownCam.x, shownCam.y, feetY, plates.current, plates.previous, near.join(','), glance.join(','), spotIds.join(',')].join('|'));
  const exits = gatesFrom(scene);
  // The light is always present at this exit; only its name is proximity-gated.
  const hearthLightGate = exits.find(
    (gate) => gate.from === 'dba.scene.shore' && gate.to === 'dba.scene.camp',
  );
  const hearthLightAt = hearthLightGate ? pathExitPoint(hearthLightGate) : null;
  const hearthGate = exits.find(
    (gate) => gate.from === 'dba.scene.shore' && gate.to === 'dba.scene.camp' && pathExitNear(pos, gate),
  );
  const hearthAt = hearthGate ? pathExitPoint(hearthGate) : null;

  useEffect(() => {
    if (!teachSpot) {
      setTeachLine(false);
      return;
    }
    if (taughtRef.current) return;
    setTeachLine(true);
    onTeachRef.current?.();
  }, [teachSpot]);

  useEffect(() => {
    approachRef.current?.(teachLine && scene === 'dba.scene.shore');
  }, [teachLine, scene]);

  useEffect(() => {
    if (!arrive) return undefined;
    const id = window.setTimeout(() => setArrive(null), 980);
    return () => window.clearTimeout(id);
  }, [arrive]);

  useEffect(() => () => {
    window.clearTimeout(driftSeek.current);
    window.clearTimeout(landTimer.current);
  }, []);

  const watchTarget = catPerformance === 'point' ? spots.find(spot => spot.id === catPost.targetId) ?? pos : pos;
  const catFace = !presentationFrozen && guide === 'hold'
    ? watchTarget.x < cat.x ? 'left' : 'right' : companionFace(catSprite, catPost.x, cat.x);
  const companionPresentation=useCompanionPresentation(catFigure,catRecovery.revision);
  // A detached old img may still finish/error. Match its committed render, not
  // just a URL that could recur after a scene round-trip or a raw/blob swap.
  const catGeometry=catMotionGeometry(companionPresentation.originalUrl,scene,catSprite,catFace);
  const catFoot=catGeometry.foot;
  const catScreen = worldToScreen({ x: cat.x, y: cat.y }, catFoot);
  const catInFront = !sharedDepth && cat.y > feetY + 0.012;
  const shoreCandidate = scene === 'dba.scene.shore';
  const catDiagnostic = shoreCandidate && getShoreVisualProfile().variant === 'candidate' && getShoreVisualProfile().fixture !== null && new URLSearchParams(window.location.search).get('diagnostic') === '1';


  // These owners are unconditional for WalkLayer's lifetime; only their stateless views reparent.
  const travelerPresentation=useTravelerPresentation({
    x:resting && sleepFoot?sleepFoot.x:pos.x,y:feetY,facing,moving,stride,
    pose:moving?'auto':body.pose !== 'auto' ? body.pose : resting?'lie':'auto',actionSeq:body.sequence,actionElapsed:body.kind ? body.elapsed : undefined,paused:performancePaused,depthZ:catInFront?4:6,
    presentationFrozen,contactCleanup:true,
    height:travelerHeight(scene),
  });
  const displayStatus = firstScreen.status === 'ready' && (!travelerPresentation.current.shown || !companionPresentation.src) ? 'loading' : firstScreen.status;
  pausedRef.current = worldPaused || displayStatus !== 'ready';
  useTravelerAudio(travelerPresentation, scene, pausedRef.current, body.sequence, beat);
  const catNode = (<div
            className="companion-anchor"
            data-testid="companion-anchor"
            data-beat={catPost.beat}
            data-look={catPost.look}
            data-traveling={guide === 'move' ? 'yes' : 'no'}
            data-guide={guide}
            data-traj={clip}
            data-face={catFace}
            data-sprite={catSprite}
            data-fallback-for={yardLandingFallback ? requestedCatSprite : undefined}
            style={{
              ...catScreen,
              transform: `${catScreen.transform} scale(${depthScale(cat.y).toFixed(3)})`,
              transformOrigin: `${catFoot.x * 100}% ${catFoot.y * 100}%`,
              zIndex: catInFront ? 6 : 4,
              ['--foot-x' as string]: `${catFoot.x * 100}%`,
              ['--foot-y' as string]: `${catFoot.y * 100}%`,
              ['--sole-y' as string]: `${catGeometry.sole * 100}%`,
              height: `${(scene === 'dba.scene.shore' ? SHORE_CAT_HEIGHT : NANAICHA_HEIGHT) * catGeometry.heightScale * 100}%`,
            }}
          >
            <span
              className="contact-shadow"
              data-testid="contact-shadow"
              data-land={land ? 'yes' : 'no'}
              style={{ ['--shadow-opacity' as string]: contactOpacity(contactLift(guide, clip)).toFixed(2) }}
            />
            <CompanionView
              presentation={companionPresentation}
              imageKey={catRecovery.imageKey}
              imageRevision={catRecovery.revision}
              imageScope={scene}
              figureRef={catRecovery.imageRef}
              frame={catSprite}
              diagnostic={catDiagnostic}
              figure={catFigure}
              level={hint.level}
              anchor={hint.pose === 'fetch' ? hint.anchor : catPost.look}
              pose={
                hint.pose === 'fetch' || hint.pose === 'look-at'
                  ? hint.pose
                  : guide === 'gaze'
                    ? 'look-at'
                    : guide === 'move'
                      ? 'lead'
                      : scene === 'dba.scene.yard' && spots.some((spot) => spot.id === 'yard-grab' && inRadius(pos, spot, spot.r)) && catPost.beat === 'Y0'
                        ? 'look-at'
                        : catPost.pose
              }
              purr={purr}
              knot={knot}
              onAsk={onAsk}
              onFigureError={catRecovery.onError}
            />
          </div>);
  const travelerNode = <TravelerView presentation={travelerPresentation}/>;
  const depthItems:GroundDepthNode[] = sharedDepth ? depthScenes.flatMap(plate => {
    const leaving = plate !== plates.current;
    return groundDepthSlots(plate, painted)
      .filter(slot => leaving || !slot.spot || spotIds.includes(slot.spot))
      .map(slot => ({ id:`${plate}:${slot.id}`, footY:slot.y!, kind:'prop' as const, scene:plate,
        phase:leaving ? 'leaving' as const : plates.previous ? 'entering' as const : 'stable' as const,
        node:<SlotPiece scene={plate as IslandScene} slot={slot} cam={shownCam} lit={!leaving && !!slot.spot && near.includes(slot.spot)} glanced={!leaving && !!slot.spot && glance.includes(slot.spot)} hidden={false} showWalkMask={false} beat={leaving?null:beat}/> }));
  }) : [];
  if (sharedDepth) depthItems.push(
    {id:'cat',footY:cat.y,kind:'cat',scene,node:<>{catNode}<img ref={catSoleRef} className="sole-soft cat-sole" data-testid="cat-sole" alt="" /></>},
    {id:'traveler',footY:feetY,kind:'traveler',scene,node:<>{travelerNode}<img ref={soleRef} className="sole-soft" data-testid="sole-soft" alt="" />
      {hearthLightGate && hearthLightAt ? <span
        className={pathExitNear(pos, hearthLightGate) ? 'path-exit depth-hearth-emitter near' : 'path-exit depth-hearth-emitter'}
        data-hearth="yes" data-testid="hearth-depth-light" aria-hidden="true"
        style={{ left: pct(hearthLightAt.x), top: pct(hearthLightAt.y) }}
      /> : null}
    </>},
  );

  return (
    <>
    <div
      ref={viewportRef}
      className="walk-viewport"
      data-display={displayStatus}
      data-testid="walk-stage"
      data-blocked={blocked ? 'yes' : 'no'}
      data-near={near.join(' ')}
      data-cam-x={shownCam.x.toFixed(1)}
      data-cam-y={shownCam.y.toFixed(1)}
      data-scene={scene}
      data-ground-depth={sharedDepth ? 'world' : undefined}
      data-cat-contact-source={shoreCandidate ? 'actual' : undefined}
      data-arrive={arrive ?? 'no'}
      data-resting={restingNow ? 'yes' : 'no'}
      data-performance-paused={performancePaused ? 'yes' : 'no'}
      data-drank={drank ? 'yes' : 'no'}
      style={{ ['--ambient' as string]: look.ambient, ['--shadow-tint' as string]: look.shadowTint }}
    >
      <div className="world-root" data-testid="world-root" data-ambient={look.ambient}>
        {groundPlate ? <img className="ground-fill" src={groundPlate} alt="" draggable={false} onError={onGroundError} /> : null}
        <div className="world-cam" data-testid="world-camera" style={{ transform: `translate3d(${-shownCam.x}px, ${-shownCam.y}px, 0)`, zIndex: 1 }}>
        <div ref={worldRef} className="world-layer" style={{ width: worldW, height: worldH, ['--world-w' as string]: `${worldW}px` }}>
          <PlateStack
            painted={painted}
            plate={plates.current}
            previous={plates.previous}
            depthScenes={depthScenes}
            cam={shownCam}
            near={near}
            glance={glance}
            activeSpots={spotIds}
            showWalkMask={showWalkMask}
            pass="back"
            feetY={feetY}
            beat={beat}
          />
          {worldState && !presentationFrozen ? <WorldStateLayer scene={scene} state={worldState} paused={pausedRef.current} /> : null}
          {sharedDepth ? <GroundDepth items={depthItems}/> : null}
          <div className="walk-ground" data-testid="walk-ground" onPointerDown={onGround} />
          {!presentationFrozen ? <WorldFeedback scene={scene} pos={pos} moving={moving} target={targetRef.current}
            response={beat} sequence={interactionSeq} /> : null}
          {exits.map((gate) => {
            const at = pathExitPoint(gate);
            return (
              <button
                key={gate.to}
                type="button"
                className={pathExitNear(pos, gate) ? 'path-exit near' : 'path-exit'}
                data-hearth={gate.from === 'dba.scene.shore' && gate.to === 'dba.scene.camp' ? 'yes' : 'no'}
                data-testid={`exit-${gate.to.split('.').at(-1)}`}
                style={{ left: pct(at.x), top: pct(at.y) }}
                aria-label={gateLabel(gate.to)}
                onClick={(event) => {
                  event.stopPropagation();
                  if (!pausedRef.current) seek(gate);
                }}
              >
                <i />
                <span aria-hidden="true">{gateLabel(gate.to)}</span>
              </button>
            );
          })}
          {spots.map((spot) => {
            const inside = near.includes(spot.id);
            const reach = inside ? 'near' : glance.includes(spot.id) ? 'glance' : 'far';
            const art = sceneAssembly(scene)?.slots.find(slot => slot.spot === spot.id && slot.x === spot.x && slot.y === spot.y);
            return (
              <button
                key={spot.id}
                type="button"
                className={reach === 'near' ? `${spot.className} near` : reach === 'glance' ? `${spot.className} glance` : spot.className}
                data-reach={reach}
                data-testid={spot.testId}
                data-result={beat && beat.spot === spot.id ? beat.kind : undefined}
                style={{ left: pct(spot.x), top: pct(spot.y), right: 'auto', bottom: 'auto',
                  ...(art?.w && art.h ? { width: `max(44px, ${pct(art.w)})`, height: `max(44px, ${pct(art.h)})`, transform: 'translate(-50%, -100%)' } : {}),
                }}
                aria-label={spot.ariaLabel}
                title={spot.ariaLabel}
                onClick={(event) => {
                  event.stopPropagation();
                  if (pausedRef.current) return;
                  if (!standsAt(sceneRef.current, spot, posRef.current)) {
                    onFar?.(spot.id);
                    window.clearTimeout(driftSeek.current);
                    const lineFirst = spot.id === 'shore-driftwood' && !taughtRef.current;
                    if (lineFirst) {
                      driftSeek.current = window.setTimeout(() => {
                        if (sceneRef.current !== 'dba.scene.shore') return;
                        seek(spot);
                      }, 720);
                    } else {
                      seek(spot);
                    }
                    return;
                  }
                  beginReach(spot);
                  interactRef.current(spot.id);
                }}
              >
                {spot.glyph ? <Glyph id={spot.glyph} /> : spot.label}
              </button>
            );
          })}
          {!sharedDepth ? catNode : null}
          {flash ? (
            <img
              key={`${scene}-${flash.seq}`}
              className="interact-flash"
              data-testid="interact-flash"
              src={flashSrc ?? ''}
              onError={onFlashError}
              alt=""
              style={{ left: pct(flash.x), top: pct(flash.y) }}
            />
          ) : null}
          {!sharedDepth ? travelerNode : null}
          <PlateStack
            painted={painted}
            plate={plates.current}
            previous={plates.previous}
            depthScenes={depthScenes}
            cam={shownCam}
            near={near}
            glance={glance}
            activeSpots={spotIds}
            pass="near"
            feetY={feetY}
            beat={beat}
          />
          <PlateStack
            painted={painted}
            plate={plates.current}
            previous={plates.previous}
            depthScenes={depthScenes}
            cam={shownCam}
            near={near}
            glance={glance}
            activeSpots={spotIds}
            pass="fg"
            feetY={feetY}
            beat={beat}
          />
        </div>
        </div>
        <div className="scene-ambient" data-testid="scene-ambient" />
      </div>
      <div className="world-post" data-testid="world-post" data-scene={scene}>
        <div className="world-ambient" />
        <div className="world-strip" style={{ backgroundImage: `url("${sceneStrip(scene)}")` }} />
        <div className="world-vignette" />
        <div className="scene-grain" data-testid="scene-grain" />
      </div>
      <div className="grade-veil" data-grade={sceneAssembly(plates.previous ?? scene)?.grade ?? 'mist-dawn'} data-testid="grade-veil" />
      <img className="scene-grade" data-testid="scene-grade" src={sceneGrade(scene)} alt="" draggable={false} />
      <div className="sole-layer" data-testid="sole-layer">
        <svg className="sole-filter" aria-hidden="true" focusable="false" width="0" height="0">
          <filter id="sole-warm" colorInterpolationFilters="sRGB" x="-8%" y="-10%" width="116%" height="145%">
            <feComponentTransfer in="SourceGraphic" result="boot">
              <feFuncA type="table" tableValues="0 0 0 0 0 1 1 1" />
            </feComponentTransfer>
            <feColorMatrix
              in="boot"
              type="matrix"
              values="0 0 0 0 0.109804 0 0 0 0 0.086275 0 0 0 0 0.062745 0 0 0 1 0"
              result="warm"
            />
            <feOffset in="warm" dx="0" dy="2" result="dropped" />
            <feComposite in="dropped" in2="warm" operator="out" result="rim" />
            <feMorphology in="rim" operator="dilate" radius="0.3 6" result="band" />
            <feGaussianBlur in="band" stdDeviation="0.35 2.2" result="tail" />
            <feComposite in="warm" in2="tail" operator="over" result="body" />
            <feGaussianBlur in="body" stdDeviation="0.25 0.35" />
          </filter>
        </svg>
        {!sharedDepth ? <>
          <img ref={soleRef} className="sole-soft" data-testid="sole-soft" alt="" />
          <img ref={catSoleRef} className="sole-soft cat-sole" data-testid="cat-sole" alt="" />
        </> : null}
      </div>
      {catDiagnostic ? <output ref={catDiagnosticRef} hidden data-testid="cat-display-diagnostic" /> : null}
        {teachLine && scene === 'dba.scene.shore' ? (
          <p className="approach-hint once" data-testid="approach-hint">
            {t('hint.approach')}
          </p>
        ) : null}
      <FirstScreenGate state={displayStatus} done={firstScreen.done} total={firstScreen.total} onRetry={firstScreen.retry} />
      <WalkStick
        disabled={paused || displayStatus !== 'ready'}
        onVector={(vector) => {
          if (vector) interruptForMovement();
          stickRef.current = vector;
          if (vector) targetRef.current = null;
        }}
      />
    </div>
    {!paused && displayStatus === 'ready' ? <StageControls scene={scene} exits={exits}
      nearby={spots.find(spot => spot.id === nearestSpot(spots, pos, scene)?.id) ?? null}
      onTravel={gate => { if (!pausedRef.current) seek(gate); }}
      onInteract={spot => {
        if (pausedRef.current || !standsAt(sceneRef.current, spot, posRef.current)) return;
        beginReach(spot);
        interactRef.current(spot.id);
      }} /> : null}
    {hearthGate && hearthAt ? (
      <span
        className="hearth-name"
        data-testid="hearth-name"
        aria-hidden="true"
        style={{
          left: `${hearthAt.x * worldW - shownCam.x}px`,
          top: `${hearthAt.y * worldH - shownCam.y + 10}px`,
        }}
      >
        {gateLabel(hearthGate.to)}
      </span>
    ) : null}
    </>
  );
}
