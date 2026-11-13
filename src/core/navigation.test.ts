import { describe, expect, it } from 'vitest';
import type { IslandScene } from './island';
import { groundRoute, groundStep, onGround } from './navigation';
import { BANDS, plantOnGround } from './stage';
import { desiredVelocity, groundDistance, WALK_SPEED, type Point } from './walk';
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
