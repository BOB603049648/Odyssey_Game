import { useEffect, useRef, useState } from 'react';
import type { CompanionPose, HintAnchor } from '../core/hints';
import type { IslandScene } from '../core/island';
import type { HintLevel } from '../core/schema';
import { BANDS, SPAWNS, gateAt, gatesFrom, nearestSpot, type GateEdge } from '../core/stage';
import {
  WALK_SPEED,
  WORLD_SCALE,
  cameraOffset,
  companionSpot,
  distance,
  followCamera,
  inRadius,
  integrate,
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
import { gateLabel, hintSpotId, type SpotView } from './spotViews';
import { facingFromMove, TravelerMark, type TravelerFacing } from './Traveler';
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

function hintPoint(scene: IslandScene, hint: Hint, spots: readonly SpotView[]): Point | null {
  if (hint.level < 2) return null;
  const id = hintSpotId(scene, hint.anchor);
  return spots.find((spot) => spot.id === id) ?? null;
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
  const posRef = useRef<Point>(remembered ?? SPAWNS[scene]);
  const [pos, setPos] = useState<Point>(posRef.current);
  const [facing, setFacing] = useState<TravelerFacing>('front');
  const [moving, setMoving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [cat, setCat] = useState<Point>(() => companionSpot(posRef.current, hint.level, null, BANDS[scene], 0));
  const [view, setView] = useState({ w: 1280, h: 720 });
  const [arrive, setArrive] = useState<string | null>(null);
  const [cam, setCam] = useState<Point>({ x: 0, y: 0 });
  const [teachLine, setTeachLine] = useState(false);
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
    const next = pending.current ?? remembered ?? SPAWNS[scene];
    pending.current = null;
    sceneRef.current = scene;
    posRef.current = next;
    targetRef.current = null;
    stickRef.current = null;
    smoothRef.current = null;
    held.current.clear();
    setArrive(entryRef.current);
    entryRef.current = null;
    setPos(next);
    setMoving(false);
    setBlocked(false);
    setCat(companionSpot(next, hint.level, hintPoint(scene, hint, spots), BANDS[scene], 0));
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

  function apply(next: Point, isMoving: boolean, isBlocked: boolean, dx: number, dy: number) {
    const gate = gateAt(sceneRef.current, next);
    if (gate) {
      pending.current = gate.arrival;
      entryRef.current = entrySide(gate.edge);
      targetRef.current = null;
      stickRef.current = null;
      held.current.clear();
      rememberRef.current(gate.to, gate.arrival);
      exitRef.current(gate.to);
      return;
    }
    posRef.current = next;
    setFacing((current) => facingFromMove(dx, dy, current));
    setPos(next);
    setMoving(isMoving);
    setBlocked(isBlocked);
    movingRef.current = isMoving;
    if (import.meta.env.MODE === 'test') {
      setCat(
        companionSpot(
          next,
          hintRef.current.level,
          hintPoint(sceneRef.current, hintRef.current, spotsRef.current),
          BANDS[sceneRef.current],
          0,
        ),
      );
    }
  }

  function seek(point: Point) {
    const band = BANDS[sceneRef.current];
    targetRef.current = {
      x: Math.min(band.maxX, Math.max(band.minX, point.x)),
      y: Math.min(band.maxY, Math.max(band.minY, point.y)),
    };
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
        interactRef.current(spot.id);
        return;
      }
      const key = keyOf(event);
      if (!key) return;
      event.preventDefault();
      held.current.add(key);
      targetRef.current = null;
      if (!event.repeat) {
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
        if (dir) {
          const power = Math.hypot(dir.x, dir.y);
          const step = integrate(
            from,
            { x: from.x + dir.x, y: from.y + dir.y },
            BANDS[sceneRef.current],
            WALK_SPEED * dt * power,
          );
          apply(step.pos, step.moving, step.blocked, dir.x, dir.y);
        } else if (goal) {
          const step = integrate(from, goal, BANDS[sceneRef.current], WALK_SPEED * dt);
          if (distance(step.pos, goal) < 0.012 || (!step.moving && step.blocked)) targetRef.current = null;
          apply(step.pos, step.moving, step.blocked, goal.x - from.x, goal.y - from.y);
        } else if (movingRef.current) {
          movingRef.current = false;
          setMoving(false);
          setBlocked(false);
        }
        const desired = companionSpot(
          posRef.current,
          hintRef.current.level,
          hintPoint(sceneRef.current, hintRef.current, spotsRef.current),
          BANDS[sceneRef.current],
          now / 1000,
        );
        setCat((prev) => ({
          x: prev.x + (desired.x - prev.x) * 0.14,
          y: prev.y + (desired.y - prev.y) * 0.14,
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
  const near = spots.filter((spot) => inRadius(pos, spot, spot.r)).map((spot) => spot.id);
  const teachSpot = near.includes('shore-driftwood') ? 'shore-driftwood' : '';
  const onTeachRef = useRef(onTeach);
  const taughtRef = useRef(taught);
  onTeachRef.current = onTeach;
  taughtRef.current = taught;
  const spotIds = spots.map((spot) => spot.id);

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

  return (
    <div
      ref={viewportRef}
      className="walk-viewport"
      data-testid="walk-stage"
      data-blocked={blocked ? 'yes' : 'no'}
      data-near={near.join(' ')}
      data-cam-x={shownCam.x.toFixed(1)}
      data-cam-y={shownCam.y.toFixed(1)}
      data-arrive={arrive ?? 'no'}
      data-drank={drank ? 'yes' : 'no'}
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
          />
          <div className="walk-ground" data-testid="walk-ground" onPointerDown={onGround} />
          {gatesFrom(scene).map((gate) => (
            <button
              key={gate.to}
              type="button"
              className={inRadius(pos, gate, gate.r) ? 'path-exit near' : 'path-exit'}
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
                    return;
                  }
                  interactRef.current(spot.id);
                }}
              >
                {spot.glyph ? <Glyph id={spot.glyph} /> : spot.label}
              </button>
            );
          })}
          <div className="companion-anchor" style={{ left: pct(cat.x), top: pct(cat.y) }} data-testid="companion-anchor">
            <span className="contact-shadow" data-testid="contact-shadow" />
            <Companion level={hint.level} anchor={hint.anchor} pose={hint.pose} purr={purr} knot={knot} onAsk={onAsk} />
          </div>
          <TravelerMark x={pos.x} y={pos.y} facing={facing} moving={moving} />
          <PlateStack
            plate={plates.current}
            previous={plates.previous}
            cam={shownCam}
            near={near}
            activeSpots={spotIds}
            pass="fg"
          />
        </div>
      </div>
      <div className="grade-veil" data-grade={sceneAssembly(scene)?.grade ?? 'mist-dawn'} data-testid="grade-veil" />
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
