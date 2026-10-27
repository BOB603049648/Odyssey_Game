import { describe, expect, it } from 'vitest';
import { ISLAND_SCENES } from './island';
import { BANDS, GATES, SPAWNS, SPOTS, gateAt } from './stage';
import {
  KEY_STEP,
  approachPlan,
  cameraOffset,
  companionSpot,
  distance,
  inRadius,
  integrate,
  pointerToWorld,
  soften,
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

  it('reads a ground click as a world point', () => {
    expect(pointerToWorld(30, 40, { left: 10, top: 10, width: 100, height: 50 })).toEqual({ x: 0.2, y: 0.6 });
    expect(pointerToWorld(0, 0, { left: 0, top: 0, width: 0, height: 10 })).toBeNull();
  });

  it('keeps the companion on a ring away from the traveler until a hint sends them to the spot', () => {
    const traveler = { x: 0.5, y: 0.62 };
    const open = { minX: 0, maxX: 1, minY: 0, maxY: 1 };
    const follow = companionSpot(traveler, 0, { x: 0.2, y: 0.2 }, open, 0);
    expect(distance(follow, traveler)).toBeGreaterThan(0.08);
    const beside = companionSpot(traveler, 2, { x: 0.7, y: 0.6 }, open, 0);
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
      expect(gate.x).toBeGreaterThanOrEqual(from.minX);
      expect(gate.x).toBeLessThanOrEqual(from.maxX);
      expect(gate.y).toBeGreaterThanOrEqual(from.minY);
      expect(gate.y).toBeLessThanOrEqual(from.maxY);
      expect(gate.arrival.x).toBeGreaterThan(to.minX);
      expect(gate.arrival.x).toBeLessThan(to.maxX);
      expect(gate.arrival.y).toBeGreaterThan(to.minY);
      expect(gate.arrival.y).toBeLessThan(to.maxY);
      for (const other of GATES.filter((item) => item.from === gate.to)) {
        expect(distance(gate.arrival, other)).toBeGreaterThan(other.r + KEY_STEP);
      }
      for (const spot of SPOTS[gate.from]) {
        expect(distance(spot, gate)).toBeGreaterThan(spot.r + gate.r - 0.001);
      }
    }
  });

  it('reaches the camp gate from the tide line without opening a hotspot', () => {
    const gate = GATES.find((item) => item.from === 'myp.scene.shore' && item.to === 'myp.scene.camp');
    expect(gate).toBeTruthy();
    let pos = SPAWNS['myp.scene.shore'];
    const keys = approachPlan(pos, gate!, BANDS['myp.scene.shore'], gate!.r);
    expect(keys.length).toBeGreaterThan(2);
    for (const key of keys) {
      pos = stepKey(pos, key, BANDS['myp.scene.shore']).pos;
      expect(SPOTS['myp.scene.shore'].some((spot) => inRadius(pos, spot, spot.r) && spot.id === 'island-mural')).toBe(false);
    }
    expect(gateAt('myp.scene.shore', pos)?.to).toBe('myp.scene.camp');
    expect(gateAt('myp.scene.camp', gate!.arrival)).toBeNull();
  });

  it('reaches the mural only after several steps from the spawn', () => {
    const mural = SPOTS['myp.scene.shore'].find((spot) => spot.id === 'island-mural');
    expect(mural).toBeTruthy();
    expect(inRadius(SPAWNS['myp.scene.shore'], mural!, mural!.r)).toBe(false);
    let pos = SPAWNS['myp.scene.shore'];
    const keys = approachPlan(pos, mural!, BANDS['myp.scene.shore'], mural!.r);
    expect(keys.length).toBeGreaterThan(1);
    for (const key of keys) pos = stepKey(pos, key, BANDS['myp.scene.shore']).pos;
    expect(inRadius(pos, mural!, mural!.r)).toBe(true);
    expect(gateAt('myp.scene.shore', pos)).toBeNull();
  });
});
