import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { PlateStack } from './Plate';
import { sceneAssembly } from '../content/catalog';
import { BANDS, SPAWNS } from '../core/stage';
import { cameraOffset, lookEast, WORLD_SCALE } from '../core/walk';
import { buildingFoot, FOOT_PIVOT } from '../core/world';

const scene = 'dba.scene.shore' as const;
const building = sceneAssembly(scene)!.slots.find(s => s.slot === 'building')!;
const authored = buildingFoot({ x:building.x!, y:building.y!, h:building.h });
const css = readFileSync('src/styles.css','utf8');
afterEach(() => { cleanup(); vi.unstubAllEnvs(); history.replaceState({},'', '/'); });
function shot(variant:'baseline'|'candidate', cam:{x:number;y:number}, w:number, h:number) {
  vi.stubEnv('VITE_VISUAL_SAMPLE','1'); history.replaceState({},'', '/?shoreVisual='+variant);
  const view = render(<PlateStack plate={scene} previous={null} cam={cam} />);
  const element = view.container.querySelector<HTMLElement>('[data-slot="building"]')!;
  const shift = element.style.transform.match(/translate3d\(([-.\d]+)px, ([-.\d]+)px, 0\)/)!;
  const result = {
    x:parseFloat(element.style.left)/100*w*WORLD_SCALE + Number(shift[1])-cam.x,
    y:parseFloat(element.style.top)/100*h*WORLD_SCALE + Number(shift[2])-cam.y,
    foot:{x:parseFloat(element.style.left)/100,y:parseFloat(element.style.top)/100},
    width:element.style.width,height:element.style.height,transform:element.style.transform,
    parallax:element.dataset.parallax,anchor:element.dataset.anchor,
  };view.unmount(); return result;
}

describe('shore gate fixed world foot calibrated at the authored spawn camera', () => {
  for (const [w,h] of [[1920,1072],[390,844],[844,390]]) {
    it(`keeps the original gate foot and all same-size image pixels at the reference ${w}x${h}`, () => {
      const ref = lookEast(cameraOffset(SPAWNS[scene],w,h),w,true);
      const before = shot('baseline',ref,w,h), after = shot('candidate',ref,w,h);
      expect(after.x).toBeCloseTo(before.x,8);expect(after.y).toBeCloseTo(before.y,8);
      expect(after.width).toBe(before.width);expect(after.height).toBe(before.height);
      expect(after.anchor).toBe('foot');expect(after.parallax).toBe('1');
      // Equal box translation and unchanged fit preserve source pixels, not a claim that box bottom is the physical pillar contact.
      expect(css).toMatch(/\.scene-slot \.slot-asset,[\s\S]*?object-fit:\s*contain/);
      for (const [u,v] of [[.15,.95],[.65,.95],[.42,.1]]) {
        const boxW=parseFloat(after.width)/100*w*WORLD_SCALE;
        const boxH=parseFloat(after.height)/100*h*WORLD_SCALE;
        expect(after.x+(u-.5)*boxW).toBeCloseTo(before.x+(u-.5)*boxW,8);
        expect(after.y+(v-1)*boxH).toBeCloseTo(before.y+(v-1)*boxH,8);
      }
    });
  }
  it('has one normalized world foot at spawn and south/edge cameras, retaining ground-relative geometry', () => {
    const w=1920,h=1072, ground={x:.3,y:.66};
    const cameras=[SPAWNS[scene],{x:.62,y:.83},{x:.06,y:.8},{x:.95,y:.8}].map(p=>lookEast(cameraOffset(p,w,h),w,true));
    const normalizedRef = lookEast(cameraOffset(SPAWNS[scene],1,1),1,true);
    const expected={x:authored.x+(1-building.parallax)*normalizedRef.x/WORLD_SCALE,y:authored.y+(1-building.parallax)*normalizedRef.y/WORLD_SCALE};
    let gap:{x:number;y:number}|null=null;
    for (const cam of cameras) {
      const gate=shot('candidate',cam,w,h);
      expect(gate.foot.x).toBeCloseTo(expected.x,12);expect(gate.foot.y).toBeCloseTo(expected.y,12);
      expect(gate.foot.x).toBeGreaterThanOrEqual(BANDS[scene].minX);expect(gate.foot.x).toBeLessThanOrEqual(BANDS[scene].maxX);
      expect(gate.foot.y).toBeGreaterThanOrEqual(BANDS[scene].minY);expect(gate.foot.y).toBeLessThanOrEqual(BANDS[scene].maxY);
      const current={x:gate.x-(ground.x*w*WORLD_SCALE-cam.x),y:gate.y-(ground.y*h*WORLD_SCALE-cam.y)};
      if(gap){expect(current.x).toBeCloseTo(gap.x,8);expect(current.y).toBeCloseTo(gap.y,8);}gap=current;
      expect(gate.transform).toContain('translate3d(0px, 0px, 0)');
    }
  });
  it('preserves the authored content foot, dimensions, pivot and shore movement constants', () => {
    expect(authored).toEqual({x:.16,y:.6});expect(building).toMatchObject({w:.48,h:.36,parallax:.72});
    expect(FOOT_PIVOT).toEqual({x:.5,y:1});expect(WORLD_SCALE).toBe(1.46);
    expect(BANDS[scene]).toEqual({minX:.05,maxX:.96,minY:.48,maxY:.84});
    const at=shot('baseline',{x:259.392,y:305.7344},1920,1072);
    expect(at.foot).toEqual(authored);expect(at.width).toBe('48%');expect(at.height).toBe('36%');
  });
});
