import { useEffect, useRef, useState } from 'react';
import type { CompanionPose, HintAnchor } from '../core/hints';
import type { IslandScene } from '../core/island';
import type { HintLevel } from '../core/schema';
import { BANDS, SPAWNS, gateAt, gatesFrom, nearestSpot } from '../core/stage';
import {
  WALK_SPEED,
  WORLD_SCALE,
  cameraOffset,
  companionSpot,
  distance,
  inRadius,
  integrate,
  pointerToWorld,
  stepKey,
  type Point,
  type WalkKey,
} from '../core/walk';
import { Companion } from './Companion';
import type { KnotMark } from './companion/CatMark';
import { Glyph } from './glyphs';
import { PlateStack } from './Plate';
import { CampArt, FisheryArt, ForestArt, NightArt, RockArt, ShoreArt } from './scenes';
import { gateLabel, hintSpotId, type SpotView } from './spotViews';
import { TravelerMark } from './Traveler';
import { useCrossfade } from './useCrossfade';

type Hint = { level: HintLevel; anchor: HintAnchor; wordId: string | null; pose: CompanionPose };

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
  const held = useRef(new Set<WalkKey>());
  const movingRef = useRef(false);
  const posRef = useRef<Point>(remembered ?? SPAWNS[scene]);
  const [pos, setPos] = useState<Point>(posRef.current);
  const [facing, setFacing] = useState<'left' | 'right'>('right');
  const [moving, setMoving] = useState(false);
  const [blocked, setBlocked] = useState(false);
  const [cat, setCat] = useState<Point>(() => companionSpot(posRef.current, hint.level, null, BANDS[scene], 0));
  const [view, setView] = useState({ w: 1280, h: 720 });
  const plates = useCrossfade(scene);

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
    held.current.clear();
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
    if (x === 0 && y === 0) return null;
    const len = Math.hypot(x, y);
    return { x: x / len, y: y / len };
  }

  function apply(next: Point, isMoving: boolean, isBlocked: boolean, dx: number) {
    const gate = gateAt(sceneRef.current, next);
    if (gate) {
      pending.current = gate.arrival;
      targetRef.current = null;
      held.current.clear();
      rememberRef.current(gate.to, gate.arrival);
      exitRef.current(gate.to);
      return;
    }
    posRef.current = next;
    if (dx < -0.001) setFacing('left');
    else if (dx > 0.001) setFacing('right');
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
      if (event.key === 'e' || event.key === 'E') {
        event.preventDefault();
        const spot = nearestSpot(spotsRef.current, posRef.current);
        if (spot) interactRef.current(spot.id);
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
        apply(step.pos, step.moving, step.blocked, dx);
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
          const step = integrate(from, { x: from.x + dir.x, y: from.y + dir.y }, BANDS[sceneRef.current], WALK_SPEED * dt);
          apply(step.pos, step.moving, step.blocked, dir.x);
        } else if (goal) {
          const step = integrate(from, goal, BANDS[sceneRef.current], WALK_SPEED * dt);
          if (distance(step.pos, goal) < 0.012 || (!step.moving && step.blocked)) targetRef.current = null;
          apply(step.pos, step.moving, step.blocked, goal.x - from.x);
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
      }
      frame = window.requestAnimationFrame(tick);
    };
    frame = window.requestAnimationFrame(tick);
    return () => window.cancelAnimationFrame(frame);
  }, []);

  const worldW = view.w * WORLD_SCALE;
  const worldH = view.h * WORLD_SCALE;
  const cam = cameraOffset(pos, view.w, view.h);
  const near = spots.filter((spot) => inRadius(pos, spot, spot.r)).map((spot) => spot.id);

  return (
    <div
      ref={viewportRef}
      className="walk-viewport"
      data-testid="walk-stage"
      data-blocked={blocked ? 'yes' : 'no'}
      data-near={near.join(' ')}
      data-cam-x={cam.x.toFixed(1)}
      data-cam-y={cam.y.toFixed(1)}
    >
      <div className="world-cam" data-testid="world-camera" style={{ transform: `translate3d(${-cam.x}px, ${-cam.y}px, 0)` }}>
        <div ref={worldRef} className="world-layer" style={{ width: worldW, height: worldH }}>
          <PlateStack plate={plates.current} previous={plates.previous} />
          <ScenePlate scene={scene} drank={drank} />
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
                {spot.id === 'island-gourd' ? <GourdMark /> : null}
                {spot.glyph ? <Glyph id={spot.glyph} /> : spot.label}
              </button>
            );
          })}
          <div className="companion-anchor" style={{ left: pct(cat.x), top: pct(cat.y) }} data-testid="companion-anchor">
            <Companion level={hint.level} anchor={hint.anchor} pose={hint.pose} purr={purr} knot={knot} onAsk={onAsk} />
          </div>
          <TravelerMark x={pos.x} y={pos.y} facing={facing} moving={moving} />
        </div>
      </div>
    </div>
  );
}

function ScenePlate({ scene, drank }: { scene: IslandScene; drank: boolean }) {
  if (scene === 'myp.scene.camp') return <CampArt />;
  if (scene === 'myp.scene.fishery') return <FisheryArt />;
  if (scene === 'myp.scene.rock') return <RockArt />;
  if (scene === 'myp.scene.forest') return <ForestArt />;
  if (scene === 'myp.scene.night') return <NightArt />;
  return <ShoreArt drank={drank} />;
}

function GourdMark() {
  return (
    <svg className="glyph pouch" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M24 18h16c2 8 10 10 10 18 0 12-8 16-18 16S14 48 14 36c0-8 8-10 10-18z" />
    </svg>
  );
}
