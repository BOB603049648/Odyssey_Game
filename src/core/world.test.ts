import { describe, expect, it } from 'vitest';
import { WORLD_SCALE } from './walk';
import { buildingFoot, contactOpacity, parallaxBleed, worldToScreen } from './world';

describe('world foot projection', () => {
  it('pins the opaque foot and never the canvas center', () => {
    const screen = worldToScreen({ x: 0.4, y: 0.7 });
    expect(screen.left).toBe('40%');
    expect(screen.top).toBe('70%');
    expect(screen.transform).toBe('translate(-50%, -100%)');
    expect(screen.transform).not.toContain('-50%, -50%');
  });

  it('turns a center-authored building box into a foundation foot', () => {
    expect(buildingFoot({ x: 0.5, y: 0.26, h: 0.4 })).toEqual({ x: 0.5, y: 0.46 });
  });

  it('fades the contact shadow as a leap rises', () => {
    expect(contactOpacity(0)).toBe(1);
    expect(contactOpacity(1)).toBe(0);
    expect(contactOpacity(0.25)).toBeCloseTo(0.75);
  });

  it('bleeds parallax plates past a camera parked on the edge', () => {
    const sky = parallaxBleed(0.22, WORLD_SCALE);
    const ground = parallaxBleed(1, WORLD_SCALE);
    expect(sky).toBeGreaterThan(0.2);
    expect(ground).toBeLessThan(sky);
    expect(sky).toBeLessThanOrEqual(0.48);
  });
});
