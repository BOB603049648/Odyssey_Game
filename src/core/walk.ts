export const WORLD_SCALE = 1.46;
export const KEY_STEP = 0.05;
export const WALK_SPEED = 0.38;
export const COMPANION_RING = 0.13;

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

export function companionSpot(traveler: Point, level: number, target: Point | null, band: Band, phase = 0): Point {
  if (level >= 2 && target) {
    return clampToBand({ x: target.x - 0.06, y: target.y - 0.045 }, band);
  }
  const angle = -Math.PI / 2 + Math.sin(phase) * 0.45;
  return clampToBand(
    {
      x: traveler.x + Math.cos(angle) * COMPANION_RING,
      y: traveler.y + Math.sin(angle) * COMPANION_RING,
    },
    band,
  );
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
