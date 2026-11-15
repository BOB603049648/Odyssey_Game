import { describe, expect, it } from 'vitest';
import type { IslandScene } from './island';
import { groundGuidePath, groundRoute, groundStep, groundTargetPoint, GROUND_TARGET_TOLERANCE, onGround, selectGroundTarget } from './navigation';
import { BANDS, BRIDGE_KNOTS, crossed, gateApproach, gateAt, gateCrossing, gateRegion, GATES, isMovingThroughGate, plantOnGround, SPAWNS } from './stage';
import { ISLAND_SCENES } from './island';
import { desiredVelocity, groundDistance, WALK_SPEED, WORLD_ASPECT, type Point } from './walk';
import { stepWorld } from './worldLoop';

const guide = { phase: 'hold' as const, elapsed: 0, cat: { x: .4, y: .7 }, post: { x: .4, y: .7 } };
describe('continuous ground navigation', () => {
  it('uses the same visible speed in every key and stick direction', () => {
    for (const move of [{ x: 1, y: 0 }, { x: 0, y: 1 }, { x: Math.SQRT1_2, y: Math.SQRT1_2 }]) {
      expect(groundDistance(desiredVelocity(move, null, { x: 0, y: 0 }), { x: 0, y: 0 })).toBeCloseTo(WALK_SPEED);
    }
  });

  it('blocks a keyboard step at the marker without dropping the actor down its face', () => {
    const from = { x: .709, y: .65 };
    const next = groundStep('dba.scene.shore', from, { x: .72, y: .651 });
    expect(next.x).toBeLessThan(.71);
    expect(next.y).toBeLessThan(.652);
    expect(onGround('dba.scene.shore', next)).toBe(true);
  });

  it('releases within a fraction of a body length and gives keyboard input priority over an old seek', () => {
    const scene = 'dba.scene.shore', band = BANDS[scene];
    let walker = { pos: { x: .4, y: .7 }, velocity: desiredVelocity({ x: 1, y: 0 }, null, { x: 0, y: 0 }), seek: null as Point | null };
    const start = walker.pos;
    for (let i = 0; i < 30; i++) walker = stepWorld({ walker, intent: { move: null, seek: null }, band, dt: 1/60, guide, scene }).walker;
    expect(groundDistance(start, walker.pos)).toBeLessThan(.012);
    expect(walker.velocity).toEqual({ x: 0, y: 0 });
    const next = stepWorld({ walker: { ...walker, seek: { x: .8, y: .7 } }, intent: { move: { x: -1, y: 0 }, seek: null }, band, dt: 1/60, guide, scene }).walker;
    expect(next.seek).toBeNull();
    expect(next.pos.x).toBeLessThan(walker.pos.x);
  });

  it.each([
    ['dba.scene.shore', { x: .6, y: .65 }, { x: .87, y: .65 }],
    ['dba.scene.shore', { x: .87, y: .65 }, { x: .6, y: .65 }],
    ['dba.scene.shore', { x: .24, y: .72 }, { x: .46, y: .72 }],
    ['dba.scene.shore', { x: .46, y: .72 }, { x: .24, y: .72 }],
    ['dba.scene.shore', { x: .52, y: .64 }, { x: .69, y: .64 }],
    ['dba.scene.shore', { x: .69, y: .64 }, { x: .52, y: .64 }],
    ['dba.scene.yard', { x: .16, y: .79 }, { x: .87, y: .79 }],
    ['dba.scene.yard', { x: .87, y: .79 }, { x: .16, y: .79 }],
    ['dba.scene.path', { x: .12, y: .43 }, { x: .76, y: .69 }],
    ['dba.scene.path', { x: .76, y: .69 }, { x: .11, y: .43 }],
    ['dba.scene.night', { x: .5, y: .74 }, { x: .1, y: .68 }],
    ['dba.scene.night', { x: .5, y: .74 }, { x: .92, y: .68 }],
  ] as [IslandScene, Point, Point][])('walks %s around its obstacles without a teleport', (scene, start, goal) => {
    let walker = { pos: plantOnGround(scene, start), velocity: { x: 0, y: 0 }, seek: goal as Point | null };
    expect(groundRoute(scene, walker.pos, goal).length).toBeGreaterThan(1);
    let frames = 0;
    for (; frames < 1800 && walker.seek; frames++) {
      const before = walker.pos;
      walker = stepWorld({ walker, intent: { move: null, seek: null }, band: BANDS[scene], scene, dt: 1/60, guide }).walker;
      expect(onGround(scene, walker.pos), JSON.stringify(walker.pos)).toBe(true);
      expect(groundDistance(before, walker.pos)).toBeLessThan(WALK_SPEED/60 + .0016);
    }
    expect(walker.seek, JSON.stringify(walker.pos)).toBeNull();
    expect(groundDistance(walker.pos, plantOnGround(scene, goal))).toBeLessThan(.0015);
    expect(frames).toBeGreaterThan(50);
  });
});

describe('finite path mouths', () => {
  it('keeps width and depth in the same world-height units for every exit direction', () => {
    for (const gate of GATES) {
      const region = gateRegion(gate);
      const horizontal = gate.edge === 'east' || gate.edge === 'west';
      expect((region.maxX - region.minX) * WORLD_ASPECT).toBeCloseTo(gate.r * (horizontal ? 1 : 2));
      expect(region.maxY - region.minY).toBeCloseTo(gate.r * (horizontal ? 2 : 1));
      expect(crossed(gate, gate)).toBe(true);
      const beyondMouth = horizontal ? { x: gate.x, y: gate.y + gate.r + .001 }
        : { x: gate.x + (gate.r + .001) / WORLD_ASPECT, y: gate.y };
      expect(crossed(gate, beyondMouth)).toBe(false);
      const farPast = {
        x: gate.x + (gate.edge === 'east' ? 1 : gate.edge === 'west' ? -1 : 0) * (gate.r + .001) / WORLD_ASPECT,
        y: gate.y + (gate.edge === 'south' ? 1 : gate.edge === 'north' ? -1 : 0) * (gate.r + .001),
      };
      expect(crossed(gate, farPast)).toBe(false);
      const approach = gateApproach(gate);
      expect(onGround(gate.from, approach)).toBe(true);
      expect(crossed(gate, approach)).toBe(false);
      expect(isMovingThroughGate(gate, approach, gate)).toBe(true);
      expect(isMovingThroughGate(gate, gate, approach)).toBe(false);
      expect(isMovingThroughGate(gate, beyondMouth, gate)).toBe(false);
      expect(isMovingThroughGate(gate, gate, gate)).toBe(false);
    }
  });

  it.each([
    ['dba.scene.camp', { x: .25, y: .8 }],
    ['dba.scene.hall', { x: .25, y: .8 }],
    ['dba.scene.night', { x: .25, y: .8 }],
    ['dba.scene.shore', { x: .9, y: .63 }],
    ['dba.scene.yard', { x: .9, y: .93 }],
  ] as [IslandScene, Point][])('does not leave %s at an unrelated wall or edge', (scene, pos) => {
    expect(onGround(scene, pos)).toBe(true);
    expect(gateAt(scene, pos)).toBeNull();
  });

  it.each(GATES)('detects a long step across the $from → $to mouth without widening it', gate => {
    const outward = {
      x: (gate.edge === 'east' ? 1 : gate.edge === 'west' ? -1 : 0) / WORLD_ASPECT,
      y: gate.edge === 'south' ? 1 : gate.edge === 'north' ? -1 : 0,
    };
    const from = { x: gate.x - outward.x * .02, y: gate.y - outward.y * .02 };
    const beyond = { x: gate.x + outward.x * .09, y: gate.y + outward.y * .09 };
    expect(crossed(gate, beyond)).toBe(false);
    expect(isMovingThroughGate(gate, from, beyond)).toBe(true);
    expect(gateCrossing(gate.from, from, beyond)).toEqual(gate);
    expect(isMovingThroughGate(gate, beyond, from)).toBe(false);
    const offset = gate.edge === 'east' || gate.edge === 'west'
      ? { x: 0, y: gate.r + .001 } : { x: (gate.r + .001) / WORLD_ASPECT, y: 0 };
    expect(isMovingThroughGate(gate,
      { x: from.x + offset.x, y: from.y + offset.y },
      { x: beyond.x + offset.x, y: beyond.y + offset.y })).toBe(false);
  });

  it.each(GATES)('walks $from → $to through its approach and actual doorway', gate => {
    let walker = { pos: plantOnGround(gate.from, SPAWNS[gate.from]), velocity: { x: 0, y: 0 }, seek: null as Point | null };
    let crossedGate = null;
    for (const goal of [gateApproach(gate), { x: gate.x, y: gate.y }]) {
      const target = selectGroundTarget(gate.from, walker.pos, goal);
      expect(target.kind).toBe('accepted');
      walker.seek = goal;
      let frames = 0;
      for (; frames < 1800 && walker.seek; frames++) {
        const before = walker.pos;
        walker = stepWorld({ walker, intent: { move: null, seek: null }, band: BANDS[gate.from], scene: gate.from, dt: 1/60, guide }).walker;
        expect(onGround(gate.from, walker.pos)).toBe(true);
        const crossing = gateCrossing(gate.from, before, walker.pos);
        if (crossing) {
          expect(goal).toEqual({ x: gate.x, y: gate.y });
          expect(crossing.to).toBe(gate.to);
          crossedGate = crossing;
        }
      }
      expect(walker.seek, `${gate.from} failed to reach ${JSON.stringify(goal)} from ${JSON.stringify(walker.pos)}`).toBeNull();
    }
    expect(crossedGate).toEqual(gate);
    expect(onGround(gate.to, gate.arrival)).toBe(true);
    expect(gateAt(gate.to, gate.arrival)).toBeNull();
    expect(gateCrossing(gate.to, gate.arrival, gate.arrival)).toBeNull();
  });

  it('keeps a northward keyboard press blocked away from the camp mouth', () => {
    const from = { x: .25, y: .805 };
    const to = groundStep('dba.scene.camp', from, { x: .25, y: .77 });
    expect(to.y).toBeGreaterThanOrEqual(.8);
    expect(gateCrossing('dba.scene.camp', from, to)).toBeNull();
  });

  it.each(GATES)('reaches the $from → $to mouth with variable manual steps and no target snap', gate => {
    let seed = 104729 + GATES.indexOf(gate);
    const random = () => { seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0; return seed / 2 ** 32; };
    const outward = {
      x: (gate.edge === 'east' ? 1 : gate.edge === 'west' ? -1 : 0) / WORLD_ASPECT,
      y: gate.edge === 'south' ? 1 : gate.edge === 'north' ? -1 : 0,
    };
    for (let trial = 0; trial < 8; trial++) {
      const inward = .025 + random() * .035, lateral = (random() - .5) * gate.r * .6;
      const pos = plantOnGround(gate.from, {
        x: gate.x - outward.x * inward + (outward.y ? lateral / WORLD_ASPECT : 0),
        y: gate.y - outward.y * inward + (outward.x ? lateral : 0),
      });
      let walker = { pos, velocity: { x: 0, y: 0 }, seek: null as Point | null };
      let crossing = null;
      for (let frame = 0; frame < 120 && !crossing; frame++) {
        const before = walker.pos, dt = .008 + random() * .04;
        walker = stepWorld({ walker, intent: { move: { x: outward.x * WORLD_ASPECT, y: outward.y }, seek: null },
          band: BANDS[gate.from], scene: gate.from, dt, guide }).walker;
        expect(walker.seek).toBeNull();
        expect(onGround(gate.from, walker.pos)).toBe(true);
        expect(groundDistance(before, walker.pos)).toBeLessThanOrEqual(WALK_SPEED * dt + 1e-7);
        crossing = gateCrossing(gate.from, before, walker.pos);
      }
      expect(crossing, `manual step stalled at ${JSON.stringify(walker.pos)}`).toEqual(gate);
    }
  });

  it.each([.84, .846])('crosses the camp north door using sustained world-loop W from y=%s', y => {
    const scene = 'dba.scene.camp';
    let walker = { pos: { x: .5, y }, velocity: { x: 0, y: 0 }, seek: null as Point | null };
    let crossing = null;
    for (let frame = 0; frame < 180 && !crossing; frame++) {
      const before = walker.pos;
      walker = stepWorld({ walker, intent: { move: { x: 0, y: -1 }, seek: null }, band: BANDS[scene], scene, dt: 1 / 60, guide }).walker;
      crossing = gateCrossing(scene, before, walker.pos);
    }
    expect(crossing?.to).toBe('dba.scene.night');
    expect(walker.pos.y).toBe(.8);
  });
});

describe('intentional ground targets and their preview', () => {
  it.each([
    ['dba.scene.shore', { x: .48, y: .4 }],
    ['dba.scene.shore', { x: .6, y: .65 }],
    ['dba.scene.shore', { x: .78, y: .66 }],
    ['dba.scene.yard', { x: .5, y: .82 }],
    ['dba.scene.camp', { x: .5, y: .6 }],
    ['dba.scene.path', { x: .5, y: .7 }],
  ] as [IslandScene, Point][])('rejects a tap off the ground in %s instead of projecting it elsewhere', (scene, requested) => {
    expect(groundTargetPoint(scene, requested)).toBeNull();
    expect(selectGroundTarget(scene, plantOnGround(scene, SPAWNS[scene]), requested)).toEqual({ kind: 'rejected', reason: 'off-ground' });
  });

  it('tolerates only a small physical miss at a ground edge in either axis', () => {
    const scene = 'dba.scene.camp';
    expect(groundTargetPoint(scene, { x: .5, y: .8 - GROUND_TARGET_TOLERANCE / 2 })).toEqual({ x: .5, y: .8 });
    expect(groundTargetPoint(scene, { x: .05 - GROUND_TARGET_TOLERANCE / (2 * WORLD_ASPECT), y: .84 })).toEqual({ x: .05, y: .84 });
    expect(groundTargetPoint(scene, { x: .05 - GROUND_TARGET_TOLERANCE, y: .84 })).toBeNull();
    expect(groundTargetPoint(scene, { x: NaN, y: .84 })).toBeNull();
    expect(selectGroundTarget(scene, { x: .5, y: .2 }, { x: .5, y: .84 })).toEqual({ kind: 'rejected', reason: 'unreachable' });
  });

  it.each([
    ['dba.scene.shore', { x: .6, y: .72 }, { x: .87, y: .65 }],
    ['dba.scene.night', { x: .5, y: .74 }, { x: .1, y: .68 }],
    ['dba.scene.night', { x: .5, y: .74 }, { x: .92, y: .68 }],
  ] as [IslandScene, Point, Point][])('returns the actual obstruction-avoiding route for a legal %s tap', (scene, from, goal) => {
    const result = selectGroundTarget(scene, from, goal);
    expect(result.kind).toBe('accepted');
    if (result.kind !== 'accepted') return;
    expect(result.goal).toEqual(goal);
    expect(result.route).toEqual(groundRoute(scene, from, goal));
    expect(result.route.length).toBeGreaterThan(1);
  });

  function polygons(scene: IslandScene): Point[][] {
    return groundGuidePath(scene).split('Z').filter(Boolean).map(path => path.slice(1).split('L').map(pair => {
      const [x, y] = pair.split(' ').map(Number); return { x: x / 1280, y: y / 720 };
    }));
  }
  function inside(shapes: Point[][], point: Point): boolean {
    let result = false;
    for (const polygon of shapes) for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
      const a = polygon[i], b = polygon[j];
      if ((a.y > point.y) !== (b.y > point.y) && point.x < (b.x - a.x) * (point.y - a.y) / (b.y - a.y) + a.x) result = !result;
    }
    return result;
  }

  it.each(ISLAND_SCENES)('draws a conservative collision-derived preview for %s', scene => {
    const path = groundGuidePath(scene), shapes = polygons(scene);
    expect(path).not.toBe('');
    expect(groundGuidePath(scene)).toBe(path);
    const band = BANDS[scene];
    let advertised = 0;
    for (let y = band.minY + .0013; y <= band.maxY; y += .0031) for (let x = band.minX + .0017; x <= band.maxX; x += .0043) {
      const point = { x, y };
      if (!inside(shapes, point)) continue;
      advertised++;
      expect(onGround(scene, point), `preview includes obstruction at ${JSON.stringify(point)}`).toBe(true);
    }
    expect(advertised).toBeGreaterThan(100);
    if (scene === 'dba.scene.path') for (const [x, y] of BRIDGE_KNOTS.slice(1, -1)) expect(inside(shapes, { x, y })).toBe(true);
    if (scene === 'dba.scene.shore') expect(inside(shapes, { x: .35, y: .72 })).toBe(false);
  });
});
