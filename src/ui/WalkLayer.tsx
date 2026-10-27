import { useEffect, useRef, useState } from 'react';
import type { CatPost } from '../core/companionPost';
import { NANAICHA_FOOT, NANAICHA_HEIGHT } from '../core/companionPost';
import { companionFrameId, LEAP_01_MS, LEAP_02_MS, type TrajClip } from '../core/companionTraj';
import type { CompanionPose, HintAnchor } from '../core/hints';
import type { IslandScene } from '../core/island';
import type { HintLevel } from '../core/schema';
import { BANDS, SPAWNS, SPOTS, gateAt, gatesFrom, nearestSpot, plantOnGround, type GateEdge } from '../core/stage';
import {
  WALK_SPEED,
  WORLD_SCALE,
  cameraOffset,
  coastStep,
  desiredVelocity,
  distance,
  followCamera,
  inRadius,
  pointerToWorld,
  stepKey,
  type Point,
  type WalkKey,
} from '../core/walk';
import { sceneAssembly } from '../content/catalog';
import { Companion } from './Companion';
import type { KnotMark } from './companion/CatMark';
import { Glyph } from './glyphs';
import { t } from './i18n';
import { PlateStack } from './Plate';
import { gateLabel, type SpotView } from './spotViews';
import shoreCat from '../assets/art/slots/art.shore.prop.nanaicha.png';
import campCat from '../assets/art/slots/art.camp.prop.nanaicha.png';
import yardCat from '../assets/art/slots/art.yard.prop.nanaicha.png';
import landDriftwood from '../assets/companion/nanaicha/traj/land-shore-driftwood.png';
import landGourd from '../assets/companion/nanaicha/traj/land-shore-gourd.png';
import landEast from '../assets/companion/nanaicha/traj/land-shore-east-gap.png';
import landMat from '../assets/companion/nanaicha/traj/land-camp-sleep-mat.png';
import landFire from '../assets/companion/nanaicha/traj/land-camp-fireside.png';
import landGive from '../assets/companion/nanaicha/traj/land-yard-give.png';
import leap01 from '../assets/companion/nanaicha/traj/leap-01.png';
import leap02 from '../assets/companion/nanaicha/traj/leap-02.png';
import driftFlash from '../assets/art/slots/art.shore.prop.driftwood.interact.png';
import sleepFlash from '../assets/art/slots/art.camp.prop.sleep-mat.interact.png';
import grainFlash from '../assets/art/slots/art.yard.prop.grain-bags.interact.png';
import { sceneGrade, sceneLook, sceneStrip } from './cohesion';
import { worldToScreen } from '../core/world';
import { facingFromMove, REACH_HOLD_MS, TravelerMark, type TravelerFacing } from './Traveler';

const TRAJ_SRC: Record<string, string> = {
  'land-shore-driftwood': landDriftwood,
  'land-shore-gourd': landGourd,
  'land-shore-east-gap': landEast,
  'land-camp-sleep-mat': landMat,
  'land-camp-fireside': landFire,
  'land-yard-give': landGive,
  'leap-01': leap01,
  'leap-02': leap02,
};
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
}) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const pending = useRef<Point | null>(null);
  const sceneRef = useRef(scene);
  const spotsRef = useRef(spots);
  const hintRef = useRef(hint);
  const pausedRef = useRef(paused);
  const rememberRef = useRef(onRemember);
  const exitRef = useRef(onExit);
  const interactRef = useRef(onInteract);
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
  const [cat, setCat] = useState<Point>(posRef.current);
  const [clip, setClip] = useState<TrajClip>('land');
  const postRef = useRef(catPost);
  const trajBoot = useRef(true);
  postRef.current = catPost;
  useEffect(() => {
    if (trajBoot.current) {
      trajBoot.current = false;
      return undefined;
    }
    setClip('leap-01');
    const toPeak = window.setTimeout(() => setClip('leap-02'), LEAP_01_MS);
    const toLand = window.setTimeout(() => setClip('land'), LEAP_01_MS + LEAP_02_MS);
    return () => {
      window.clearTimeout(toPeak);
      window.clearTimeout(toLand);
    };
  }, [catPost.beat]);
  const [view, setView] = useState({ w: 1280, h: 720 });
  const [arrive, setArrive] = useState<string | null>(null);
  const [cam, setCam] = useState<Point>({ x: 0, y: 0 });
  const [teachLine, setTeachLine] = useState(false);
  const [reaching, setReaching] = useState(false);
  const reachTimer = useRef(0);
  const viewRef = useRef(view);
  const plates = useCrossfade(scene, 980);
  viewRef.current = view;

  spotsRef.current = spots;
  hintRef.current = hint;
  pausedRef.current = paused;
  rememberRef.current = onRemember;
  exitRef.current = onExit;
  interactRef.current = onInteract;
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
    setCat(next);
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
    if (import.meta.env.MODE === 'test') {
      const post = postRef.current;
      setCat((prev) => ({
        x: prev.x + (post.x - prev.x) * 0.35,
        y: prev.y + (post.y - prev.y) * 0.35,
      }));
    }
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
        const spot = nearestSpot(spotsRef.current, posRef.current);
        if (!spot) return;
        event.preventDefault();
        beginReach();
        interactRef.current(spot.id);
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
        const dir = heldDirection();
        const goal = targetRef.current;
        const from = posRef.current;
        const wish = desiredVelocity(dir, dir ? null : goal, from);
        const step = coastStep(from, velocityRef.current, wish, BANDS[sceneRef.current], dt);
        velocityRef.current = step.velocity;
        if (goal && (distance(step.pos, goal) < 0.01 || (!step.moving && step.blocked))) {
          targetRef.current = null;
          velocityRef.current = { x: 0, y: 0 };
        }
        const speed = Math.hypot(step.velocity.x, step.velocity.y);
        if (step.moving) {
          apply(step.pos, true, step.blocked, step.velocity.x, step.velocity.y, Math.min(1, speed / WALK_SPEED));
        } else if (movingRef.current) {
          movingRef.current = false;
          setMoving(false);
          setStride(0);
          setBlocked(false);
        }
        const desired = postRef.current;
        setCat((prev) => ({
          x: prev.x + (desired.x - prev.x) * 0.07,
          y: prev.y + (desired.y - prev.y) * 0.07,
        }));
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
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const worldW = view.w * WORLD_SCALE;
  const worldH = view.h * WORLD_SCALE;
  const shownCam = import.meta.env.MODE === 'test' ? cameraOffset(pos, view.w, view.h) : cam;
  const look = sceneLook(scene);
  const near = spots.filter((spot) => inRadius(pos, spot, spot.r)).map((spot) => spot.id);
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

  useEffect(() => () => window.clearTimeout(reachTimer.current), []);

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
      data-drank={drank ? 'yes' : 'no'}
      style={{ ['--ambient' as string]: look.ambient, ['--shadow-tint' as string]: look.shadowTint }}
    >
      <div className="world-cam" data-testid="world-camera" style={{ transform: `translate3d(${-shownCam.x}px, ${-shownCam.y}px, 0)` }}>
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
                style={{ left: pct(spot.x), top: pct(spot.y), right: 'auto', bottom: 'auto' }}
                aria-label={spot.ariaLabel}
                onClick={(event) => {
                  event.stopPropagation();
                  if (pausedRef.current) return;
                  if (!inRadius(posRef.current, spot, spot.r)) {
                    seek(spot);
                    onFar?.(spot.id);
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
            data-traveling={Math.hypot(catPost.x - cat.x, catPost.y - cat.y) > 0.025 ? 'yes' : 'no'}
            data-traj={clip}
            data-face={catPost.x >= cat.x ? 'right' : 'left'}
            data-sprite={companionFrameId(catPost.beat, clip)}
            style={{
              ...worldToScreen({ x: cat.x, y: cat.y }, NANAICHA_FOOT),
              height: `${NANAICHA_HEIGHT * 100}%`,
            }}
          >
            <Companion
              frame={companionFrameId(catPost.beat, clip)}
              figure={
                TRAJ_SRC[companionFrameId(catPost.beat, clip)] ??
                (scene === 'dba.scene.camp'
                  ? campCat
                  : scene === 'dba.scene.yard' || scene === 'dba.scene.path'
                    ? yardCat
                    : shoreCat)
              }
              level={hint.level}
              anchor={hint.pose === 'fetch' ? hint.anchor : catPost.look}
              pose={
                hint.pose === 'fetch' || hint.pose === 'look-at'
                  ? hint.pose
                  : scene === 'dba.scene.yard' && spots.some((spot) => spot.id === 'yard-grab' && inRadius(pos, spot, spot.r)) && catPost.beat === 'Y0'
                    ? 'look-at'
                    : Math.hypot(catPost.x - cat.x, catPost.y - cat.y) > 0.025
                      ? 'lead'
                      : catPost.pose
              }
              purr={purr}
              knot={knot}
              onAsk={onAsk}
            />
          </div>
          {flash ? (
            <img
              key={flash.seq}
              className="interact-flash"
              data-testid="interact-flash"
              src={flash.kind === 'driftwood' ? driftFlash : flash.kind === 'sleep' ? sleepFlash : grainFlash}
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
          />
          <PlateStack
            plate={plates.current}
            previous={plates.previous}
            cam={shownCam}
            near={near}
            activeSpots={spotIds}
            pass="near"
            feetY={feetY}
          />
          <PlateStack
            plate={plates.current}
            previous={plates.previous}
            cam={shownCam}
            near={near}
            activeSpots={spotIds}
            pass="fg"
            feetY={feetY}
          />
        </div>
      </div>
      <div className="world-post" data-testid="world-post" data-scene={scene}>
        <div className="world-ambient" />
        <div className="world-strip" style={{ backgroundImage: `url("${sceneStrip(scene)}")` }} />
        <div className="world-vignette" />
      </div>
      <div className="grade-veil" data-grade={sceneAssembly(plates.previous ?? scene)?.grade ?? 'mist-dawn'} data-testid="grade-veil" />
      <img className="scene-grade" data-testid="scene-grade" src={sceneGrade(scene)} alt="" draggable={false} />
      {teachLine ? (
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
