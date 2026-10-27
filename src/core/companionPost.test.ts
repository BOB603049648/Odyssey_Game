import { describe, expect, it } from 'vitest';
import { companionPost, gazeQueue, NANAICHA_FOOT } from './companionPost';
import { BANDS, GATES, SPOTS, YARD_FACADE } from './stage';

const shore = 'dba.scene.shore' as const;
const camp = 'dba.scene.camp' as const;
const yard = 'dba.scene.yard' as const;

function onGround(scene: typeof shore | typeof camp | typeof yard, y: number) {
  const band = BANDS[scene];
  expect(y).toBeGreaterThanOrEqual(band.minY);
  expect(y).toBeLessThanOrEqual(band.maxY);
}

describe('companion feet and gaze', () => {
  it('pivots on the opaque foot, not the canvas center', () => {
    expect(NANAICHA_FOOT.y).toBeGreaterThan(0.9);
    expect(NANAICHA_FOOT.y).toBeLessThan(1);
    expect(NANAICHA_FOOT.x).toBeCloseTo(0.5);
  });

  it('queues water, then food, then sleep, then danger', () => {
    expect(gazeQueue({})).toBe('water');
    expect(gazeQueue({ 'dba.beat.water': true })).toBe('food');
    expect(gazeQueue({ 'dba.beat.water': true, 'dba.beat.food': true })).toBe('sleep');
    expect(gazeQueue({ 'dba.beat.water': true, 'dba.beat.food': true, 'dba.beat.sleep': true })).toBe('danger');
  });

  it('stands beside the driftwood, then the gourd, then inside the east gate', () => {
    const wood = companionPost(shore, {}, {});
    const log = SPOTS[shore].find((spot) => spot.id === 'shore-driftwood')!;
    expect(wood.beat).toBe('S0');
    expect(wood.targetId).toBe('shore-driftwood');
    expect(wood.look).toBe('driftwood');
    expect(wood.y).toBeCloseTo(log.y);
    onGround(shore, wood.y);

    const thirsty = companionPost(shore, {}, { 'dba.flag.driftwood': true });
    const gourd = SPOTS[shore].find((spot) => spot.id === 'island-gourd')!;
    expect(thirsty.beat).toBe('S1');
    expect(companionPost(shore, {}, {}, { skipWelcome: true }).beat).toBe('S1');
    expect(thirsty.targetId).toBe('island-gourd');
    expect(thirsty.look).toBe('gourd');
    expect(thirsty.y).toBeCloseTo(gourd.y);

    const east = companionPost(shore, { 'dba.beat.water': true }, { 'dba.flag.driftwood': true });
    const gate = GATES.find((item) => item.from === shore && item.to === camp)!;
    expect(east.beat).toBe('S2');
    expect(east.targetId).toBe('shore-east');
    expect(east.x).toBeLessThan(gate.x);
    expect(east.y).toBeCloseTo(gate.y);
  });

  it('moves from the yard gate to the mat, then curls by the fire', () => {
    const hungry = companionPost(camp, { 'dba.beat.water': true }, {});
    const east = GATES.find((item) => item.from === camp && item.to === yard)!;
    expect(hungry.targetId).toBe('camp-east');
    expect(hungry.y).toBeCloseTo(east.y);
    expect(hungry.x).toBeLessThan(east.x);

    const sleepy = companionPost(camp, { 'dba.beat.water': true, 'dba.beat.food': true }, {});
    const mat = SPOTS[camp].find((spot) => spot.id === 'camp-sleep')!;
    expect(sleepy.targetId).toBe('camp-sleep');
    expect(sleepy.look).toBe('sleep');
    expect(sleepy.y).toBeCloseTo(mat.y);
    expect(sleepy.x).toBeCloseTo(mat.x - 0.14);
    expect(sleepy.x).toBeLessThan(0.35);

    const guard = companionPost(camp, { 'dba.beat.water': true, 'dba.beat.food': true, 'dba.beat.sleep': true }, {});
    expect(guard.pose).toBe('curl');
    expect(guard.targetId).toBe('camp-fire');
    onGround(camp, guard.y);
  });

  it('stands at the give pile, then the warm west gate, then looks east', () => {
    const give = companionPost(yard, { 'dba.beat.water': true }, {});
    const pile = SPOTS[yard].find((spot) => spot.id === 'yard-give')!;
    const grab = SPOTS[yard].find((spot) => spot.id === 'yard-grab')!;
    expect(give.targetId).toBe('yard-give');
    expect(give.look).toBe('give');
    expect(give.y).toBeCloseTo(YARD_FACADE.groundY);
    expect(give.y).toBeGreaterThan(pile.y);
    expect(Math.abs(give.x - grab.x)).toBeGreaterThan(0.2);

    const home = companionPost(yard, { 'dba.beat.water': true, 'dba.beat.food': true }, {});
    const west = GATES.find((item) => item.from === yard && item.to === camp)!;
    expect(home.targetId).toBe('yard-west');
    expect(home.look).toBe('sleep');
    expect(home.x).toBeGreaterThan(west.x);
    expect(home.y).toBeCloseTo(west.y);

    const danger = companionPost(yard, {
      'dba.beat.water': true,
      'dba.beat.food': true,
      'dba.beat.sleep': true,
    }, {});
    const east = GATES.find((item) => item.from === yard && item.to === 'dba.scene.path')!;
    expect(danger.look).toBe('path-stop');
    expect(danger.x).toBeLessThan(east.x);
    expect(danger.y).toBeCloseTo(east.y);
  });
});
