import { describe, expect, it } from 'vitest';
import { cameraOffset, lookEast, worldSize } from './walk';
import { plantOnGround, SPOTS, standsAt } from './stage';

describe('production scene projection', () => {
  it.each([[390,844],[844,390],[1440,900],[2560,1080]])('keeps artwork proportional and the traveler visible at %sx%s', (w,h) => {
    const world=worldSize(w,h);
    expect(world.w/world.h).toBeCloseTo(16/9,12);
    for(const x of [.05,.42,.74,.96]) for(const y of [.48,.62,.84]) {
      const cam=lookEast(cameraOffset({x,y},w,h),w,true,undefined,h);
      expect(x*world.w-cam.x).toBeGreaterThan(0);
      expect(x*world.w-cam.x).toBeLessThan(w);
      expect(y*world.h-cam.y).toBeGreaterThan(0);
      expect(y*world.h-cam.y).toBeLessThan(h);
    }
  });
  it('clamps bridge movement to the measured plank surface, not the cliff below', () => {
    for(const [x,y] of [[.11,.43],[.24,.46],[.36,.50],[.52,.55],[.66,.61],[.77,.69]]) {
      for(const wish of [0,1]) expect(Math.abs(plantOnGround('dba.scene.path',{x,y:wish}).y-y)).toBeLessThanOrEqual(.0120001);
    }
    for(const spot of SPOTS['dba.scene.path']) expect(standsAt('dba.scene.path',spot,plantOnGround('dba.scene.path',spot))).toBe(true);
  });
});
