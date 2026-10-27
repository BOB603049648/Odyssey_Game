import { describe, expect, it } from 'vitest';
import { ISLAND_SCENES } from './island';
import { BANDS, GATES, SPAWNS, SPOTS, crossed, gateAt, plantOnGround } from './stage';
import {
  KEY_STEP,
  WALK_SPEED,
  approachPlan,
  cameraOffset,
  followCamera,
  companionSpot,
  contains,
  distance,
  inRadius,
  integrate,
  pointerToWorld,
  soften,
  coastStep,
  desiredVelocity,
  easeVelocity,
  stepKey,
} from './walk';

describe('walk', () => {
  const band = { minX: 0.1, maxX: 0.9, minY: 0.2, maxY: 0.8 };

  it('walks a ground target in steps and stops inside the band', () => {
    let pos = { x: 0.2, y: 0.5 };
    const goal = { x: 0.7, y: 0.55 };
    for (let i = 0; i < 40; i += 1) pos = integrate(pos, goal, band, 0.05).pos;
    expect(distance(pos, goal)).toBeLessThan(0.05);
    expect(pos.x).toBeGreaterThanOrEqual(band.minX);
    expect(pos.x).toBeLessThanOrEqual(band.maxX);
  });

  it('stops on the band edge and eases a point that slipped outside', () => {
    let pos = { x: 0.86, y: 0.5 };
    let blocked = false;
    for (let i = 0; i < 8; i += 1) {
      const step = integrate(pos, { x: 1.4, y: 0.5 }, band, 0.08);
      pos = step.pos;
      blocked = blocked || step.blocked;
    }
    expect(pos.x).toBeLessThanOrEqual(band.maxX);
    expect(pos.x).toBeGreaterThan(0.8);
    expect(blocked).toBe(true);

    const eased = soften({ x: -0.2, y: 0.5 }, band, 0.5);
    expect(eased.x).toBeGreaterThan(-0.2);
    expect(eased.x).toBeLessThan(0);
    const pulled = integrate({ x: -0.4, y: 0.5 }, { x: -0.4, y: 0.5 }, band, 0.05);
    expect(pulled.pos.x).toBeGreaterThan(-0.4);
    expect(pulled.pos.x).toBeLessThanOrEqual(band.minX);
    expect(pulled.blocked).toBe(true);
  });

  it('holds the camera at the scene edge', () => {
    expect(cameraOffset({ x: 0, y: 0.5 }, 1000, 500, 1.5).x).toBe(0);
    expect(cameraOffset({ x: 1, y: 0.5 }, 1000, 500, 1.5).x).toBe(500);
    expect(cameraOffset({ x: 0.5, y: 0 }, 1000, 500, 1.5).y).toBe(0);
    expect(cameraOffset({ x: 0.5, y: 1 }, 1000, 500, 1.5).y).toBe(250);
    expect(cameraOffset({ x: 0.5, y: 0.5 }, 1000, 500, 1.5)).toEqual({ x: 250, y: 125 });
  });

  it('eases the camera toward the traveler instead of jumping', () => {
    expect(followCamera({ x: 0, y: 0 }, { x: 100, y: 40 }, 0.25)).toEqual({ x: 25, y: 10 });
    expect(followCamera({ x: 10, y: 10 }, { x: 10, y: 30 }, 1)).toEqual({ x: 10, y: 30 });
  });

  it('eases velocity in and out instead of snapping to a stop', () => {
    const band = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const glide = coastStep({ x: 0.4, y: 0.6 }, { x: WALK_SPEED, y: 0 }, { x: 0, y: 0 }, band, 1 / 60);
    expect(glide.pos.x).toBeGreaterThan(0.4);
    expect(glide.pos.x - 0.4).toBeLessThan(KEY_STEP);
    expect(glide.velocity.x).toBeGreaterThan(0);
    expect(glide.velocity.x).toBeLessThan(WALK_SPEED);

    const start = coastStep({ x: 0.4, y: 0.6 }, { x: 0, y: 0 }, { x: WALK_SPEED, y: 0 }, band, 1 / 60);
    expect(start.pos.x - 0.4).toBeGreaterThan(0);
    expect(start.pos.x - 0.4).toBeLessThan(KEY_STEP * 0.5);
    expect(start.velocity.x).toBeGreaterThan(0);
    expect(start.velocity.x).toBeLessThan(WALK_SPEED * 0.5);

    let velocity = { x: WALK_SPEED, y: 0 };
    for (let i = 0; i < 27; i += 1) velocity = easeVelocity(velocity, { x: 0, y: 0 }, 1 / 60);
    expect(velocity.x).toBeGreaterThan(WALK_SPEED * 0.15);
    expect(velocity.x).toBeLessThan(WALK_SPEED * 0.7);
    for (let i = 0; i < 70; i += 1) velocity = easeVelocity(velocity, { x: 0, y: 0 }, 1 / 60);
    expect(velocity.x).toBeLessThan(WALK_SPEED * 0.08);

    const far = desiredVelocity(null, { x: 0.8, y: 0.5 }, { x: 0.2, y: 0.5 });
    const near = desiredVelocity(null, { x: 0.23, y: 0.5 }, { x: 0.2, y: 0.5 });
    expect(far.x).toBeCloseTo(WALK_SPEED, 2);
    expect(near.x).toBeGreaterThan(0);
    expect(near.x).toBeLessThan(far.x * 0.6);
  });

  it('reads a ground click as a world point', () => {
    expect(pointerToWorld(30, 40, { left: 10, top: 10, width: 100, height: 50 })).toEqual({ x: 0.2, y: 0.6 });
    expect(pointerToWorld(0, 0, { left: 0, top: 0, width: 0, height: 10 })).toBeNull();
  });

  it('keeps the companion on the same ground line as the traveler or the hotspot', () => {
    const traveler = { x: 0.5, y: 0.62 };
    const open = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const follow = companionSpot(traveler, 0, { x: 0.2, y: 0.2 }, open, 0);
    expect(follow.y).toBeCloseTo(traveler.y);
    expect(distance(follow, traveler)).toBeGreaterThan(0.08);
    const beside = companionSpot(traveler, 2, { x: 0.7, y: 0.6 }, open, 0);
    expect(beside.y).toBeCloseTo(0.6);
    expect(distance(beside, { x: 0.7, y: 0.6 })).toBeLessThan(0.1);
    expect(beside).not.toEqual(traveler);
  });

  it('only counts a hotspot when the traveler is inside its radius', () => {
    const spot = { x: 0.2, y: 0.56 };
    expect(inRadius({ x: 0.42, y: 0.62 }, spot, 0.072)).toBe(false);
    expect(inRadius({ x: 0.22, y: 0.58 }, spot, 0.072)).toBe(true);
  });
});

describe('shore and camp layout', () => {
  it('keeps spawns, spots, and gates inside the walkable band', () => {
    expect(BANDS['dba.scene.camp'].minY).toBeGreaterThanOrEqual(0.8);
    expect(BANDS['dba.scene.yard'].minY).toBeGreaterThanOrEqual(0.76);
    expect(plantOnGround('dba.scene.yard', { x: 0.5, y: 0.8 }).y).toBeGreaterThanOrEqual(0.92);
    expect(plantOnGround('dba.scene.yard', { x: 0.16, y: 0.78 }).y).toBeCloseTo(0.78);
    expect(plantOnGround('dba.scene.camp', { x: 0.5, y: 0.84 }).y).toBeCloseTo(0.84);
    expect(SPAWNS['dba.scene.yard'].y).toBeGreaterThanOrEqual(0.92);
    const give = SPOTS['dba.scene.yard'].find((spot) => spot.id === 'yard-give');
    expect(give && give.y).toBeGreaterThanOrEqual(0.88);
    for (const scene of ISLAND_SCENES) {
      const band = BANDS[scene];
      const spawn = SPAWNS[scene];
      expect(spawn.x).toBeGreaterThanOrEqual(band.minX);
      expect(spawn.x).toBeLessThanOrEqual(band.maxX);
      expect(spawn.y).toBeGreaterThanOrEqual(band.minY);
      expect(spawn.y).toBeLessThanOrEqual(band.maxY);
      expect(gateAt(scene, spawn)).toBeNull();
      for (const spot of SPOTS[scene]) {
        expect(spot.x).toBeGreaterThanOrEqual(band.minX);
        expect(spot.x).toBeLessThanOrEqual(band.maxX);
        expect(spot.y).toBeGreaterThanOrEqual(band.minY);
        expect(spot.y).toBeLessThanOrEqual(band.maxY);
      }
      for (let i = 0; i < SPOTS[scene].length; i += 1) {
        for (let j = i + 1; j < SPOTS[scene].length; j += 1) {
          const a = SPOTS[scene][i];
          const b = SPOTS[scene][j];
          expect(distance(a, b)).toBeGreaterThan(a.r + b.r - 0.001);
        }
      }
    }
    for (const gate of GATES) {
      const from = BANDS[gate.from];
      const to = BANDS[gate.to];
      expect(contains(gate, from)).toBe(true);
      expect(contains(gate.arrival, to)).toBe(true);
      expect(crossed(gate, SPAWNS[gate.from])).toBe(false);
      for (const other of GATES.filter((item) => item.from === gate.to)) {
        expect(crossed(other, gate.arrival)).toBe(false);
        const nudged = {
          x: gate.arrival.x + (other.edge === 'east' ? KEY_STEP : other.edge === 'west' ? -KEY_STEP : 0),
          y: gate.arrival.y + (other.edge === 'south' ? KEY_STEP : other.edge === 'north' ? -KEY_STEP : 0),
        };
        if (contains(nudged, to)) expect(crossed(other, nudged)).toBe(false);
      }
      for (const spot of SPOTS[gate.from]) {
        const toward = {
          x: spot.x + (gate.edge === 'east' ? spot.r : gate.edge === 'west' ? -spot.r : 0),
          y: spot.y + (gate.edge === 'south' ? spot.r : gate.edge === 'north' ? -spot.r : 0),
        };
        expect(crossed(gate, toward)).toBe(false);
      }
    }
  });

  it('reaches the camp edge from any height on the tide line', () => {
    for (const y of [0.52, 0.62, 0.74]) {
      let pos = { x: SPAWNS['dba.scene.shore'].x, y };
      let found = false;
      for (let i = 0; i < 24; i += 1) {
        pos = stepKey(pos, 'd', BANDS['dba.scene.shore']).pos;
        if (gateAt('dba.scene.shore', pos)?.to === 'dba.scene.camp') found = true;
      }
      expect(found).toBe(true);
      expect(pos.x).toBeLessThanOrEqual(BANDS['dba.scene.shore'].maxX);
    }
  });

  it('reaches the mural only after several steps from the spawn', () => {
    const mural = SPOTS['dba.scene.shore'].find((spot) => spot.id === 'island-mural');
    expect(mural).toBeTruthy();
    expect(inRadius(SPAWNS['dba.scene.shore'], mural!, mural!.r)).toBe(false);
    let pos = SPAWNS['dba.scene.shore'];
    const keys = approachPlan(pos, mural!, BANDS['dba.scene.shore'], mural!.r);
    expect(keys.length).toBeGreaterThan(1);
    for (const key of keys) pos = stepKey(pos, key, BANDS['dba.scene.shore']).pos;
    expect(inRadius(pos, mural!, mural!.r)).toBe(true);
    expect(gateAt('dba.scene.shore', pos)).toBeNull();
  });
});
