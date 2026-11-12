import { describe, expect, it } from 'vitest';
import { slotAssetUrl, trajAssetUrl, travelerFrameUrl } from './assetUrls';

describe('compile-time asset URL map', () => {
  it('resolves first-screen URLs synchronously as strings, not loader promises', () => {
    const ground = slotAssetUrl('art.shore.ground');
    const sky = slotAssetUrl('art.shore.sky');
    const idle = travelerFrameUrl('idle-front-01.png');
    const traj = trajAssetUrl('land-shore-driftwood');
    expect(typeof ground).toBe('string');
    expect(typeof sky).toBe('string');
    expect(typeof idle).toBe('string');
    expect(typeof traj).toBe('string');
    expect(ground!.length).toBeGreaterThan(4);
    expect(slotAssetUrl('art.shore.far')).toBeUndefined();
  });
});
