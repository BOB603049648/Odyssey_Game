import type { IslandScene } from './island';
import { BANDS, BRIDGE_KNOTS, NIGHT_FOOTPRINTS, SHORE_MARKER, SHORE_PROP_FOOTPRINTS, YARD_APRONS, YARD_FACADE, plantOnGround } from './stage';
import { groundDistance, WORLD_ASPECT, type Point } from './walk';

const MARGIN = 0.003;
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t });
export function onGround(scene: IslandScene, pos: Point): boolean {
  return groundDistance(pos, plantOnGround(scene, pos)) < 1e-7;
}

/** About three artwork pixels: tolerate an imprecise edge tap, not a tap in the sea. */
export const GROUND_TARGET_TOLERANCE = .004;

/** Cheap enough for pointer hover; rejected ground never becomes a distant projected goal. */
export function groundTargetPoint(scene: IslandScene, requested: Point): Point | null {
  if (!Number.isFinite(requested.x) || !Number.isFinite(requested.y)) return null;
  if (onGround(scene, requested)) return requested;
  const planted = plantOnGround(scene, requested);
  return groundDistance(requested, planted) <= GROUND_TARGET_TOLERANCE ? planted : null;
}

export type GroundTarget =
  | { kind: 'accepted'; goal: Point; route: Point[] }
  | { kind: 'rejected'; reason: 'off-ground' | 'unreachable' };

export function selectGroundTarget(scene: IslandScene, from: Point, requested: Point): GroundTarget {
  const goal = groundTargetPoint(scene, requested);
  if (!goal) return { kind: 'rejected', reason: 'off-ground' };
  if (!onGround(scene, from)) return { kind: 'rejected', reason: 'unreachable' };
  const route = groundRoute(scene, from, goal);
  let previous = from;
  for (const next of route) {
    if (!onGround(scene, next) || !clearSegment(scene, previous, next)) return { kind: 'rejected', reason: 'unreachable' };
    previous = next;
  }
  return groundDistance(previous, goal) < 1e-7
    ? { kind: 'accepted', goal, route }
    : { kind: 'rejected', reason: 'unreachable' };
}

const guidePaths = new Map<IslandScene, string>();
const GUIDE_STEP = .004;
const GUIDE_X_STEP = GUIDE_STEP / WORLD_ASPECT;

/** Conservative ground contours in 1280×720 artwork coordinates. Render with
 * evenodd fill: the same collision predicate cuts holes around solid props.
 * Cache the finished outline, not a second independently authored walk mask. */
export function groundGuidePath(scene: IslandScene): string {
  const cached = guidePaths.get(scene);
  if (cached !== undefined) return cached;
  const band = BANDS[scene];
  const x0 = Math.ceil(band.minX / GUIDE_X_STEP), x1 = Math.floor(band.maxX / GUIDE_X_STEP);
  const y0 = Math.ceil(band.minY / GUIDE_STEP), y1 = Math.floor(band.maxY / GUIDE_STEP);
  const cells = new Set<string>();
  const key = (x: number, y: number) => `${x},${y}`;
  for (let y = y0; y < y1; y++) for (let x = x0; x < x1; x++) {
    const left = x * GUIDE_X_STEP, right = (x + 1) * GUIDE_X_STEP;
    const top = y * GUIDE_STEP, bottom = (y + 1) * GUIDE_STEP;
    const xs = [left, (left + right) / 2, right];
    // The bridge is piecewise linear: include a bend inside a cell so its
    // outer corner cannot be advertised as walkable across the ravine.
    if (scene === 'dba.scene.path') for (const [bend] of BRIDGE_KNOTS) if (bend > left && bend < right) xs.push(bend);
    if (xs.every(atX => [top, (top + bottom) / 2, bottom].every(atY => onGround(scene, { x: atX, y: atY })))) cells.add(key(x, y));
  }
  type Edge = { from: Point; to: Point; direction: number; used: boolean };
  const starts = new Map<string, Edge[]>(), edges: Edge[] = [];
  function add(from: Point, to: Point, direction: number) {
    const edge = { from, to, direction, used: false };
    edges.push(edge);
    const id = key(from.x, from.y), existing = starts.get(id) ?? [];
    existing.push(edge); starts.set(id, existing);
  }
  for (const cell of cells) {
    const [x, y] = cell.split(',').map(Number);
    if (!cells.has(key(x, y - 1))) add({ x, y }, { x: x + 1, y }, 0);
    if (!cells.has(key(x + 1, y))) add({ x: x + 1, y }, { x: x + 1, y: y + 1 }, 1);
    if (!cells.has(key(x, y + 1))) add({ x: x + 1, y: y + 1 }, { x, y: y + 1 }, 2);
    if (!cells.has(key(x - 1, y))) add({ x, y: y + 1 }, { x, y }, 3);
  }
  const pixel = (point: Point) => `${Number((point.x * GUIDE_X_STEP * 1280).toFixed(3))} ${Number((point.y * GUIDE_STEP * 720).toFixed(3))}`;
  const outlines: string[] = [];
  for (const first of edges) {
    if (first.used) continue;
    let edge = first;
    const points = [first.from];
    while (!edge.used) {
      edge.used = true;
      const candidates = starts.get(key(edge.to.x, edge.to.y)) ?? [];
      const next = [1, 0, 3, 2].map(turn => candidates.find(candidate => !candidate.used && candidate.direction === (edge.direction + turn) % 4)).find(Boolean);
      if (!next) break;
      if (next.direction !== edge.direction) points.push(edge.to);
      edge = next;
    }
    outlines.push(`M${points.map(pixel).join('L')}Z`);
  }
  const path = outlines.join('');
  guidePaths.set(scene, path);
  return path;
}

/** Sampling is finer than the narrowest authored obstruction, including the bridge. */
function clearSegment(scene: IslandScene, a: Point, b: Point): boolean {
  const count = Math.max(1, Math.ceil(groundDistance(a, b) / 0.003));
  for (let i = 1; i <= count; i++) if (!onGround(scene, lerp(a, b, i / count))) return false;
  return true;
}

/** Small visibility graph over the actual plate's obstruction corners. */
export function groundRoute(scene: IslandScene, from: Point, requested: Point): Point[] {
  const goal = plantOnGround(scene, requested);
  if (clearSegment(scene, from, goal)) return [goal];
  if (scene === 'dba.scene.path') {
    const east = goal.x > from.x;
    const knots = BRIDGE_KNOTS.map(([x,y]) => ({ x,y }))
      .filter(p => east ? p.x > from.x + MARGIN && p.x < goal.x : p.x < from.x - MARGIN && p.x > goal.x);
    return [...(east ? knots : knots.reverse()), goal];
  }
  const blocks = scene === 'dba.scene.shore'
    ? [{ ...SHORE_MARKER, groundY: SHORE_MARKER.sandY }]
    : scene === 'dba.scene.yard' ? [YARD_FACADE, ...YARD_APRONS.map(a => ({ ...a, groundY: YARD_FACADE.groundY }))]
    : scene === 'dba.scene.night' ? NIGHT_FOOTPRINTS : [];
  const nodes = [from, goal, ...blocks.flatMap(b => [
    { x: b.minX - MARGIN, y: b.groundY + MARGIN },
    { x: b.maxX + MARGIN, y: b.groundY + MARGIN },
  ]), ...(scene === 'dba.scene.shore' ? SHORE_PROP_FOOTPRINTS.flatMap(b => [
    { x: b.minX - MARGIN, y: b.maxY + MARGIN },
    { x: b.maxX + MARGIN, y: b.maxY + MARGIN },
    ...(b.minY >= BANDS[scene].minY ? [
      { x: b.minX - MARGIN, y: b.minY - MARGIN },
      { x: b.maxX + MARGIN, y: b.minY - MARGIN },
    ] : []),
  ]) : [])];
  const costs = nodes.map(() => Infinity), previous = nodes.map(() => -1), visited = new Set<number>();
  costs[0] = 0;
  for (let n = 0; n < nodes.length; n++) {
    let at = -1;
    for (let i = 0; i < nodes.length; i++) if (!visited.has(i) && (at < 0 || costs[i] < costs[at])) at = i;
    if (at < 0 || !Number.isFinite(costs[at])) break;
    if (at === 1) {
      const route = [nodes[1]];
      for (let i = previous[1]; i > 0; i = previous[i]) route.unshift(nodes[i]);
      return route;
    }
    visited.add(at);
    for (let i = 0; i < nodes.length; i++) {
      if (visited.has(i)) continue;
      const next = costs[at] + groundDistance(nodes[at], nodes[i]);
      if (next < costs[i] && clearSegment(scene, nodes[at], nodes[i])) { costs[i] = next; previous[i] = at; }
    }
  }
  return [from];
}

/** A collision never pushes the actor across a wall or farther than this step.
 * Keyboard input slides along obstacles; on the bridge it follows the planks.
 */
export function groundStep(scene: IslandScene, from: Point, wish: Point): Point {
  if (scene === 'dba.scene.path') {
    const budget = groundDistance(from, wish);
    let end = plantOnGround(scene, wish);
    if (groundDistance(from, end) <= budget + 1e-7) return end;
    let lo = 0, hi = 1;
    for (let i = 0; i < 14; i++) {
      const t = (lo + hi) / 2;
      const candidate = plantOnGround(scene, lerp(from, wish, t));
      if (groundDistance(from, candidate) <= budget) { lo = t; end = candidate; } else hi = t;
    }
    return lo > 0 ? end : from;
  }
  const steps = Math.max(1, Math.ceil(groundDistance(from, wish) / 0.002));
  const dx = (wish.x-from.x)/steps, dy = (wish.y-from.y)/steps;
  let pos = from;
  for (let i = 0; i < steps; i++) {
    const next = { x: pos.x+dx, y: pos.y+dy };
    if (onGround(scene, next)) pos = next;
    else {
      const xOnly = { x: next.x, y: pos.y }, yOnly = { x: pos.x, y: next.y };
      if (onGround(scene, xOnly)) pos = xOnly;
      else if (onGround(scene, yOnly)) pos = yOnly;
    }
  }
  // `from` and every accepted substep are inside the scene band.
  const band = BANDS[scene];
  return { x: Math.max(band.minX, Math.min(band.maxX, pos.x)), y: Math.max(band.minY, Math.min(band.maxY, pos.y)) };
}
