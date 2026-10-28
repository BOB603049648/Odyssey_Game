import { describe, expect, it } from 'vitest';
import { BANDS, GATES, gateAt } from './stage';
import { stepWorld } from './worldLoop';
import type { Point } from './walk';

describe('world loop', () => {
  const band = BANDS['dba.scene.shore'];

  it('keeps a settled foot still when nothing is asked', () => {
    const stepped = stepWorld({
      walker: { pos: { x: 0.42, y: 0.62 }, velocity: { x: 0, y: 0 }, seek: null },
      intent: { move: null, seek: null },
      band,
      dt: 1 / 60,
      guide: { phase: 'hold', elapsed: 0, cat: { x: 0.38, y: 0.71 }, post: { x: 0.38, y: 0.71 } },
    });
    expect(stepped.walker.pos).toEqual({ x: 0.42, y: 0.62 });
    expect(stepped.walker.moving).toBe(false);
    expect(stepped.guide.moving).toBe(false);
    expect(stepped.guide.cat).toEqual({ x: 0.38, y: 0.71 });
  });

  it('walks a seek toward its point instead of jumping there', () => {
    const stepped = stepWorld({
      walker: { pos: { x: 0.42, y: 0.62 }, velocity: { x: 0, y: 0 }, seek: null },
      intent: { move: null, seek: { x: 0.7, y: 0.62 } },
      band,
      dt: 1 / 60,
      guide: { phase: 'hold', elapsed: 0, cat: { x: 0.4, y: 0.7 }, post: { x: 0.4, y: 0.7 } },
    });
    expect(stepped.walker.moving).toBe(true);
    expect(stepped.walker.pos.x).toBeGreaterThan(0.42);
    expect(stepped.walker.pos.x).toBeLessThan(0.7);
    expect(stepped.walker.seek).toEqual({ x: 0.7, y: 0.62 });
  });

  it('plants a north-edge seek on the night trip instead of stopping a hair south', () => {
    const gate = GATES.find((item) => item.from === 'dba.scene.camp' && item.to === 'dba.scene.night');
    expect(gate?.edge).toBe('north');
    const band = BANDS['dba.scene.camp'];
    let pos: Point = { x: 0.5, y: 0.84 };
    let velocity: Point = { x: 0, y: 0 };
    let seek: Point | null = { x: gate!.x, y: gate!.y };
    let crossed = false;
    for (let frame = 0; frame < 400 && seek && !crossed; frame += 1) {
      const stepped = stepWorld({
        walker: { pos, velocity, seek },
        intent: { move: null, seek },
        band,
        dt: 1 / 60,
        guide: { phase: 'hold', elapsed: 0, cat: { x: 0.7, y: 0.85 }, post: { x: 0.7, y: 0.85 } },
      });
      pos = stepped.walker.pos;
      velocity = stepped.walker.velocity;
      seek = stepped.walker.seek;
      crossed = gateAt('dba.scene.camp', pos)?.to === 'dba.scene.night';
    }
    expect(crossed).toBe(true);
    expect(pos.y).toBeLessThanOrEqual(gate!.y);
  });
});
