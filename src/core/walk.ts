export const WORLD_SCALE = 1.46;
export const KEY_STEP = 0.05;
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
  const worldW = viewW * scale;
  const worldH = viewH * scale;
  const maxX = Math.max(0, worldW - viewW);
  const maxY = Math.max(0, worldH - viewH);
  return {
    x: Math.min(maxX, Math.max(0, focus.x * worldW - viewW / 2)),
    y: Math.min(maxY, Math.max(0, focus.y * worldH - viewH / 2)),
  };
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
