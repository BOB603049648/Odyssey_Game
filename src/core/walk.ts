export const WORLD_SCALE = 1.15;
/** Artwork and authored coordinates share a 16:9 stage on every device. */
export function worldSize(viewW: number, viewH: number, scale = WORLD_SCALE) {
  const h = Math.max(viewH, viewW * 9 / 16) * scale;
  return { w: h * 16 / 9, h };
}
export const KEY_STEP = 0.05;
/** Two steps past a hotspot's click radius, it should still read as touchable. */
export const GLANCE_REACH = KEY_STEP * 2;

export type Reach = 'near' | 'glance' | 'far';

/** Distance from a hotspot center. Inside `radius` is the click. The next two steps are a glance. */
export function reachOf(dist: number, radius: number, glance = GLANCE_REACH): Reach {
  if (dist <= radius) return 'near';
  if (dist <= radius + glance) return 'glance';
  return 'far';
}
export const WALK_SPEED = 0.38;
export const COMPANION_RING = 0.13;

/** How fast wished speed is approached, and how long a release takes to settle. */
export const VELOCITY_RISE = 3.4;
export const VELOCITY_FALL = 2.2;
/** Ground clicks ease off inside this distance so the last step is not a snap. */
export const ARRIVE_WINDOW = 0.08;
const STOP_SPEED = 0.012;

function easeAxis(from: number, to: number, dt: number): number {
  const braking = Math.abs(to) < Math.abs(from) || from * to < 0;
  const rate = braking ? VELOCITY_FALL : VELOCITY_RISE;
  const next = from + (to - from) * (1 - Math.exp(-rate * Math.max(0, dt)));
  if (Math.abs(next) < 1e-4) return 0;
  return next;
}

export function easeVelocity(current: Point, desired: Point, dt: number): Point {
  return { x: easeAxis(current.x, desired.x, dt), y: easeAxis(current.y, desired.y, dt) };
}

/** `input` is a stick or key vector already scaled by power (length 0–1). */
export function desiredVelocity(input: Point | null, goal: Point | null, pos: Point, maxSpeed = WALK_SPEED): Point {
  if (input) return { x: input.x * maxSpeed, y: input.y * maxSpeed };
  if (!goal) return { x: 0, y: 0 };
  const dx = goal.x - pos.x;
  const dy = goal.y - pos.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 1e-5) return { x: 0, y: 0 };
  const power = Math.min(1, dist / ARRIVE_WINDOW);
  return { x: (dx / dist) * maxSpeed * power, y: (dy / dist) * maxSpeed * power };
}

export function coastStep(
  pos: Point,
  velocity: Point,
  desired: Point,
  band: Band,
  dt: number,
): { pos: Point; velocity: Point; moving: boolean; blocked: boolean } {
  const nextVel = easeVelocity(velocity, desired, dt);
  const speed = Math.hypot(nextVel.x, nextVel.y);
  if (speed < STOP_SPEED && Math.hypot(desired.x, desired.y) < STOP_SPEED) {
    return { pos, velocity: { x: 0, y: 0 }, moving: false, blocked: false };
  }
  const step = integrate(
    pos,
    { x: pos.x + nextVel.x, y: pos.y + nextVel.y },
    band,
    speed * Math.max(0, dt),
  );
  const movedX = step.pos.x - pos.x;
  const movedY = step.pos.y - pos.y;
  const settled = step.blocked && dt > 0 ? { x: movedX / dt, y: movedY / dt } : nextVel;
  return {
    pos: step.pos,
    velocity: settled,
    moving: Math.hypot(movedX, movedY) > 1e-6,
    blocked: step.blocked,
  };
}

export type Point = { x: number; y: number };

export type Band = { minX: number; maxX: number; minY: number; maxY: number };

export type Move = { pos: Point; blocked: boolean; moving: boolean };

const AXIS = {
  a: { x: -1, y: 0 },
  d: { x: 1, y: 0 },
  w: { x: 0, y: -1 },
  s: { x: 0, y: 1 },
} as const;

export type WalkKey = keyof typeof AXIS;

export function distance(a: Point, b: Point): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export function contains(pos: Point, band: Band): boolean {
  return pos.x >= band.minX && pos.x <= band.maxX && pos.y >= band.minY && pos.y <= band.maxY;
}

export function clampToBand(pos: Point, band: Band): Point {
  return {
    x: Math.min(band.maxX, Math.max(band.minX, pos.x)),
    y: Math.min(band.maxY, Math.max(band.minY, pos.y)),
  };
}

export function soften(pos: Point, band: Band, amount = 0.65): Point {
  const inside = clampToBand(pos, band);
  if (inside.x === pos.x && inside.y === pos.y) return pos;
  return {
    x: pos.x + (inside.x - pos.x) * amount,
    y: pos.y + (inside.y - pos.y) * amount,
  };
}

export function integrate(pos: Point, wish: Point, band: Band, maxStep: number): Move {
  const startedOutside = !contains(pos, band);
  const eased = startedOutside ? soften(pos, band, 0.65) : pos;
  const dx = wish.x - eased.x;
  const dy = wish.y - eased.y;
  const dist = Math.hypot(dx, dy);
  if (dist <= 0.0008) {
    const settled = clampToBand(eased, band);
    return {
      pos: settled,
      blocked: startedOutside || settled.x !== wish.x || settled.y !== wish.y,
      moving: startedOutside && (settled.x !== pos.x || settled.y !== pos.y),
    };
  }
  const step = Math.min(maxStep, dist);
  const next = { x: eased.x + (dx / dist) * step, y: eased.y + (dy / dist) * step };
  const settled = clampToBand(next, band);
  const moved = Math.hypot(settled.x - eased.x, settled.y - eased.y);
  return {
    pos: settled,
    blocked: startedOutside || moved + 1e-4 < step,
    moving: moved > 0.0008,
  };
}

export function inRadius(pos: Point, spot: Point, radius: number): boolean {
  return distance(pos, spot) <= radius;
}

export function followCamera(current: Point, goal: Point, blend: number): Point {
  const t = Math.min(1, Math.max(0, blend));
  return {
    x: current.x + (goal.x - current.x) * t,
    y: current.y + (goal.y - current.y) * t,
  };
}

export function cameraOffset(focus: Point, viewW: number, viewH: number, scale = WORLD_SCALE): Point {
  const { w: worldW, h: worldH } = worldSize(viewW, viewH, scale);
  const maxX = Math.max(0, worldW - viewW);
  const maxY = Math.max(0, worldH - viewH);
  // Feet sit below center so the textured plate continues under them.
  // The south edge of the world stays available; we do not park the view on it.
  const focusY = viewH * 0.62;
  return {
    x: Math.min(maxX, Math.max(0, focus.x * worldW - viewW / 2)),
    y: Math.min(maxY, Math.max(0, focus.y * worldH - focusY)),
  };
}

/**
 * Shore spawn looks a little east so the camp hearth's west tail
 * enters the first frame. Small enough that the west gate stays on screen.
 */
export const SHORE_LOOK_EAST = 0.015;

/** South of the fog-line gate. The east cross itself stays on the gate point. */
export const CAMP_HEARTH_Y = 0.72;
/** Name lights in this radius around the warm pool, before x reaches the east cross. */
export const CAMP_HEARTH_R = 0.14;
/**
 * How far west of the gate the warm pool still has body, in world fraction.
 * The hearth ::before width is twice this, centered on the gate.
 */
export const CAMP_HEARTH_GLOW_WEST = 0.22;

export function lookEast(cam: Point, viewW: number, shore: boolean, scale = WORLD_SCALE, viewH = viewW * 9 / 16): Point {
  if (!shore || viewW < 1) return cam;
  const { w } = worldSize(viewW, viewH, scale);
  const maxX = Math.max(0, w - viewW);
  return { x: Math.min(maxX, cam.x + SHORE_LOOK_EAST * w), y: cam.y };
}

export function frameWorldX(camX: number, viewW: number, scale = WORLD_SCALE): { left: number; right: number } {
  const worldW = viewW * scale;
  return { left: camX / worldW, right: camX / worldW + viewW / worldW };
}

export function pathExitPoint(gate: { from: string; to: string; x: number; y: number }): Point {
  if (gate.from === 'dba.scene.shore' && gate.to === 'dba.scene.camp') return { x: gate.x, y: CAMP_HEARTH_Y };
  return { x: gate.x, y: gate.y };
}

export function pathExitNear(pos: Point, gate: { from: string; to: string; x: number; y: number; r: number }): boolean {
  const at = pathExitPoint(gate);
  const radius = gate.from === 'dba.scene.shore' && gate.to === 'dba.scene.camp' ? CAMP_HEARTH_R : gate.r;
  return inRadius(pos, at, radius);
}

export function pointerToWorld(
  clientX: number,
  clientY: number,
  rect: { left: number; top: number; width: number; height: number },
): Point | null {
  if (rect.width < 1 || rect.height < 1) return null;
  return {
    x: (clientX - rect.left) / rect.width,
    y: (clientY - rect.top) / rect.height,
  };
}

/** Beside a person or a prop, on the same ground y. Never orbit upward off the foot plane. */
export function companionSpot(traveler: Point, level: number, target: Point | null, band: Band, _phase = 0): Point {
  if (level >= 2 && target) {
    const side = target.x >= traveler.x ? -1 : 1;
    return clampToBand({ x: target.x + side * 0.05, y: target.y }, band);
  }
  return clampToBand({ x: traveler.x - COMPANION_RING, y: traveler.y }, band);
}

export function approachPlan(from: Point, goal: Point, band: Band, radius: number, step = KEY_STEP): WalkKey[] {
  const keys: WalkKey[] = [];
  let pos = clampToBand(from, band);
  for (let i = 0; i < 80 && distance(pos, goal) > radius; i += 1) {
    const dx = goal.x - pos.x;
    const dy = goal.y - pos.y;
    const key: WalkKey = Math.abs(dx) >= Math.abs(dy) ? (dx >= 0 ? 'd' : 'a') : dy >= 0 ? 's' : 'w';
    const dir = AXIS[key];
    const next = integrate(pos, { x: pos.x + dir.x, y: pos.y + dir.y }, band, step);
    if (next.pos.x === pos.x && next.pos.y === pos.y) break;
    pos = next.pos;
    keys.push(key);
  }
  return keys;
}

export function stepKey(pos: Point, key: WalkKey, band: Band, step = KEY_STEP): Move {
  const dir = AXIS[key];
  return integrate(pos, { x: pos.x + dir.x, y: pos.y + dir.y }, band, step);
}
