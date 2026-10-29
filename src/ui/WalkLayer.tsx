import { useEffect, useRef, useState } from 'react';
import type { CatPost } from '../core/companionPost';
import { companionFace, companionFoot, companionSole, NANAICHA_HEIGHT, SHORE_CAT_HEIGHT } from '../core/companionPost';
import { companionFrameId, trajClip, type GuidePhase, type TrajClip } from '../core/companionTraj';
import type { CompanionPose, HintAnchor } from '../core/hints';
import type { IslandScene } from '../core/island';
import type { HintLevel } from '../core/schema';
import { BANDS, SPAWNS, SPOTS, closestSpot, gateAt, gatesFrom, nearestSpot, plantOnGround, standsAt, type GateEdge } from '../core/stage';
import { stepWorld } from '../core/worldLoop';
import {
  WALK_SPEED,
  WORLD_SCALE,
  cameraOffset,
  followCamera,
  inRadius,
  pointerToWorld,
  stepKey,
  type Point,
  type WalkKey,
} from '../core/walk';
import { sceneAssembly } from '../content/catalog';
import { loadSlotAsset, preloadSceneAssets, resolveSlotAsset } from '../content/slotAssets';
import { Companion } from './Companion';
import type { KnotMark } from './companion/CatMark';
import { Glyph } from './glyphs';
import { t } from './i18n';
import { PlateStack, type SpotBeat } from './Plate';
import { gateLabel, type SpotView } from './spotViews';
import { sceneGrade, sceneLook, sceneStrip } from './cohesion';
import { loadTraj, trajUrl } from './trajArt';
import { contactLift, contactOpacity, depthScale, worldToScreen } from '../core/world';
import { facingFromMove, REACH_HOLD_MS, TravelerMark, type TravelerFacing } from './Traveler';

import { WalkStick } from './WalkStick';
import { useCrossfade } from './useCrossfade';

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
  resting = false,
  flash = null,
  beat = null,
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
  resting?: boolean;
  flash?: { kind: 'driftwood' | 'sleep' | 'give'; seq: number; x: number; y: number } | null;
  beat?: SpotBeat | null;
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const soleRef = useRef<HTMLImageElement>(null);
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
  const posRef = useRef<Point>(plantOnGround(scene, remembered ?? SPAWNS[scene]));
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
  const [reaching, setReaching] = useState(false);
  const reachTimer = useRef(0);
  const driftSeek = useRef(0);
  const restingRef = useRef(resting);
  restingRef.current = resting;
  const viewRef = useRef(view);
  const plates = useCrossfade(scene, 980);
  viewRef.current = view;

  spotsRef.current = spots;
  hintRef.current = hint;
  pausedRef.current = paused;
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
    const planted = plantOnGround(sceneRef.current, next);
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
    setStride(isMoving ? Math.min(1, Math.max(0, power)) : 0);
    setBlocked(isBlocked);
    movingRef.current = isMoving;
  }

  function beginReach() {
    setReaching(true);
    window.clearTimeout(reachTimer.current);
    reachTimer.current = window.setTimeout(() => setReaching(false), REACH_HOLD_MS);
  }

  function seek(point: Point) {
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
      if (isInteractKey(event)) {
        if (event.repeat) return;
        const standing = nearestSpot(spotsRef.current, posRef.current, sceneRef.current);
        if (standing) {
          event.preventDefault();
          beginReach();
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
    window.addEventListener('blur', () => held.current.clear());
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
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
          targetRef.current = null;
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
          walker: { pos: from, velocity: lying ? { x: 0, y: 0 } : velocityRef.current, seek: lying ? null : targetRef.current },
          intent: { move: lying ? null : heldDirection(), seek: lying ? null : targetRef.current },
          band: BANDS[sceneRef.current],
          dt,
          guide: {
            phase: guideRef.current,
            elapsed: guideElapsed.current,
            cat: prevCat,
            post: { x: desired.x, y: desired.y },
          },
        });
        velocityRef.current = stepped.walker.velocity;
        targetRef.current = stepped.walker.seek;
        const speed = Math.hypot(stepped.walker.velocity.x, stepped.walker.velocity.y);
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
        const clipNow = stepped.guide.phase === 'move' ? trajClip(stepped.guide.elapsed) : 'land';
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
      if (sole && vp && img instanceof HTMLImageElement) {
        const ir = img.getBoundingClientRect();
        const vr = vp.getBoundingClientRect();
        const pose = vp.querySelector('[data-testid="traveler"]')?.getAttribute('data-pose');
        if (pose === 'lie' || ir.width < 2) {
          sole.style.visibility = 'hidden';
        } else {
          sole.style.visibility = 'visible';
          const src = img.currentSrc || img.src;
          if (sole.src !== src) sole.src = src;
          sole.style.left = `${ir.left - vr.left}px`;
          sole.style.top = `${ir.top - vr.top}px`;
          sole.style.width = `${ir.width}px`;
          sole.style.height = `${ir.height}px`;
          sole.style.transform = img.parentElement?.getAttribute('data-mirror') === 'yes' ? 'scaleX(-1)' : 'none';
        }
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const worldW = view.w * WORLD_SCALE;
  const worldH = view.h * WORLD_SCALE;
  const catSprite = companionFrameId(catPost.beat, clip);
  const groundAsset = sceneAssembly(scene)?.slots.find((slot) => slot.slot === 'ground')?.asset ?? null;
  const [groundPlate, setGroundPlate] = useState<string | null>(() => resolveSlotAsset(groundAsset));
  const slotCat =
    scene === 'dba.scene.camp'
      ? 'art.camp.prop.nanaicha'
      : scene === 'dba.scene.yard' || scene === 'dba.scene.path'
        ? 'art.yard.prop.nanaicha'
        : 'art.shore.prop.nanaicha';
  const [catFigure, setCatFigure] = useState<string | undefined>(
    () => trajUrl(catSprite) ?? resolveSlotAsset(slotCat) ?? undefined,
  );
  const flashId =
    flash?.kind === 'driftwood'
      ? 'art.shore.prop.driftwood.interact'
      : flash?.kind === 'sleep'
        ? 'art.camp.prop.sleep-mat.interact'
        : flash?.kind === 'give'
          ? 'art.yard.prop.grain-bags.interact'
          : null;
  const [flashSrc, setFlashSrc] = useState<string | null>(() => resolveSlotAsset(flashId));
  useEffect(() => {
    let live = true;
    const kit = sceneAssembly(scene);
    preloadSceneAssets(kit?.slots.map((slot) => slot.asset) ?? []);
    loadSlotAsset(groundAsset).then((url) => {
      if (live) setGroundPlate(url);
    });
    Promise.all([loadTraj(catSprite), loadSlotAsset(slotCat)]).then(([frame, plate]) => {
      if (live) setCatFigure(frame ?? plate ?? undefined);
    });
    return () => {
      live = false;
    };
  }, [scene, groundAsset, catSprite, slotCat]);
  useEffect(() => {
    let live = true;
    setFlashSrc(resolveSlotAsset(flashId));
    loadSlotAsset(flashId).then((url) => {
      if (live) setFlashSrc(url);
    });
    return () => {
      live = false;
    };
  }, [flashId]);
  const shownCam = import.meta.env.MODE === 'test' ? cameraOffset(pos, view.w, view.h) : cam;
  const look = sceneLook(scene);
  const near = spots.filter((spot) => standsAt(scene, spot, pos)).map((spot) => spot.id);
  const teachSpot = near.includes('shore-driftwood') ? 'shore-driftwood' : '';
  const onTeachRef = useRef(onTeach);
  const taughtRef = useRef(taught);
  onTeachRef.current = onTeach;
  taughtRef.current = taught;
  const spotIds = spots.map((spot) => spot.id);
  const sleepFoot = SPOTS[scene].find((spot) => spot.id === 'camp-sleep');
  const feetY = resting && sleepFoot ? sleepFoot.y : pos.y;

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
    if (!arrive) return undefined;
    const id = window.setTimeout(() => setArrive(null), 980);
    return () => window.clearTimeout(id);
  }, [arrive]);

  useEffect(() => () => {
    window.clearTimeout(reachTimer.current);
    window.clearTimeout(driftSeek.current);
    window.clearTimeout(landTimer.current);
  }, []);

  const catFoot = companionFoot(catSprite);
  const catScreen = worldToScreen({ x: cat.x, y: cat.y }, catFoot);
  const catInFront = cat.y > feetY + 0.012;

  return (
    <div
      ref={viewportRef}
      className="walk-viewport"
      data-testid="walk-stage"
      data-blocked={blocked ? 'yes' : 'no'}
      data-near={near.join(' ')}
      data-cam-x={shownCam.x.toFixed(1)}
      data-cam-y={shownCam.y.toFixed(1)}
      data-scene={scene}
      data-arrive={arrive ?? 'no'}
      data-resting={resting ? 'yes' : 'no'}
      data-drank={drank ? 'yes' : 'no'}
      style={{ ['--ambient' as string]: look.ambient, ['--shadow-tint' as string]: look.shadowTint }}
    >
      <div className="world-root" data-testid="world-root" data-ambient={look.ambient}>
        {groundPlate ? <img className="ground-fill" src={groundPlate} alt="" draggable={false} /> : null}
        <div className="world-cam" data-testid="world-camera" style={{ transform: `translate3d(${-shownCam.x}px, ${-shownCam.y}px, 0)`, zIndex: 1 }}>
        <div ref={worldRef} className="world-layer" style={{ width: worldW, height: worldH }}>
          <PlateStack
            plate={plates.current}
            previous={plates.previous}
            cam={shownCam}
            near={near}
            activeSpots={spotIds}
            showWalkMask={showWalkMask}
            pass="back"
            feetY={feetY}
            beat={beat}
          />
          <div className="walk-ground" data-testid="walk-ground" onPointerDown={onGround} />
          {gatesFrom(scene).map((gate) => (
            <button
              key={gate.to}
              type="button"
              className={inRadius(pos, gate, gate.r) ? 'path-exit near' : 'path-exit'}
              data-hearth={gate.to === 'dba.scene.camp' ? 'yes' : 'no'}
              data-testid={`exit-${gate.to.split('.').at(-1)}`}
              style={{ left: pct(gate.x), top: pct(gate.y) }}
              aria-label={gateLabel(gate.to)}
              onClick={(event) => {
                event.stopPropagation();
                if (!pausedRef.current) seek(gate);
              }}
            >
              <i />
              <span aria-hidden="true">{gateLabel(gate.to)}</span>
            </button>
          ))}
          {spots.map((spot) => {
            const inside = near.includes(spot.id);
            return (
              <button
                key={spot.id}
                type="button"
                className={inside ? `${spot.className} near` : spot.className}
                data-testid={spot.testId}
                data-result={beat && beat.spot === spot.id ? beat.kind : undefined}
                style={{ left: pct(spot.x), top: pct(spot.y), right: 'auto', bottom: 'auto' }}
                aria-label={spot.ariaLabel}
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
                  beginReach();
                  interactRef.current(spot.id);
                }}
              >
                {spot.glyph ? <Glyph id={spot.glyph} /> : spot.label}
              </button>
            );
          })}
          <div
            className="companion-anchor"
            data-testid="companion-anchor"
            data-beat={catPost.beat}
            data-look={catPost.look}
            data-traveling={guide === 'move' ? 'yes' : 'no'}
            data-guide={guide}
            data-traj={clip}
            data-face={companionFace(catSprite, catPost.x, cat.x)}
            data-sprite={catSprite}
            style={{
              ...catScreen,
              transform: `${catScreen.transform} scale(${depthScale(cat.y).toFixed(3)})`,
              transformOrigin: `${catFoot.x * 100}% ${catFoot.y * 100}%`,
              zIndex: catInFront ? 6 : 4,
              ['--foot-x' as string]: `${catFoot.x * 100}%`,
              ['--foot-y' as string]: `${catFoot.y * 100}%`,
              ['--sole-y' as string]: `${companionSole(catSprite) * 100}%`,
              height: `${(scene === 'dba.scene.shore' ? SHORE_CAT_HEIGHT : NANAICHA_HEIGHT) * 100}%`,
            }}
          >
            <span
              className="contact-shadow"
              data-testid="contact-shadow"
              data-land={land ? 'yes' : 'no'}
              style={{ ['--shadow-opacity' as string]: contactOpacity(contactLift(guide, clip)).toFixed(2) }}
            />
            <Companion
              frame={catSprite}
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
            />
          </div>
          {flash ? (
            <img
              key={`${scene}-${flash.seq}`}
              className="interact-flash"
              data-testid="interact-flash"
              src={flashSrc ?? ''}
              alt=""
              style={{ left: pct(flash.x), top: pct(flash.y) }}
            />
          ) : null}
          <TravelerMark
            x={resting && sleepFoot ? sleepFoot.x : pos.x}
            y={feetY}
            facing={facing}
            moving={moving}
            stride={stride}
            pose={resting ? 'lie' : reaching ? 'reach' : 'auto'}
            depthZ={catInFront ? 4 : 6}
          />
          <PlateStack
            plate={plates.current}
            previous={plates.previous}
            cam={shownCam}
            near={near}
            activeSpots={spotIds}
            pass="near"
            feetY={feetY}
            beat={beat}
          />
          <PlateStack
            plate={plates.current}
            previous={plates.previous}
            cam={shownCam}
            near={near}
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
        <img ref={soleRef} className="sole-soft" data-testid="sole-soft" alt="" />
      </div>
        {teachLine && scene === 'dba.scene.shore' ? (
          <p className="approach-hint" data-testid="approach-hint">
            {t('hint.approach')}
          </p>
        ) : null}
      <WalkStick
        onVector={(vector) => {
          stickRef.current = vector;
          if (vector) targetRef.current = null;
        }}
      />
    </div>
  );
}
