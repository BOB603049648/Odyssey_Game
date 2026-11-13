import type { IslandScene } from './island';
import { BANDS, BRIDGE_KNOTS, SHORE_MARKER, SHORE_PROP_FOOTPRINTS, YARD_APRONS, YARD_FACADE, plantOnGround } from './stage';
import { groundDistance, type Point } from './walk';

const MARGIN = 0.003;
const lerp = (a: Point, b: Point, t: number): Point => ({ x: a.x + (b.x-a.x)*t, y: a.y + (b.y-a.y)*t });
export function onGround(scene: IslandScene, pos: Point): boolean {
  return groundDistance(pos, plantOnGround(scene, pos)) < 1e-7;
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
    : scene === 'dba.scene.yard' ? [YARD_FACADE, ...YARD_APRONS.map(a => ({ ...a, groundY: YARD_FACADE.groundY }))] : [];
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
