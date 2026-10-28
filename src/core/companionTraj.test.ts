import { describe, expect, it } from 'vitest';
import { LEAP_01_MS, LEAP_02_MS, TRAJ_FOOT, companionFrameId, trajClip } from './companionTraj';

describe('nanaicha trajectory frames', () => {
  it('pivots landings on the opaque foot, just above the canvas bottom', () => {
    expect(TRAJ_FOOT.x).toBeCloseTo(0.5);
    expect(TRAJ_FOOT.y).toBeGreaterThan(0.97);
    expect(TRAJ_FOOT.y).toBeLessThan(1);
  });

  it('plays leap-01, then leap-02, then the landing', () => {
    expect(trajClip(0)).toBe('leap-01');
    expect(trajClip(LEAP_01_MS - 1)).toBe('leap-01');
    expect(trajClip(LEAP_01_MS)).toBe('leap-02');
    expect(trajClip(LEAP_01_MS + LEAP_02_MS - 1)).toBe('leap-02');
    expect(trajClip(LEAP_01_MS + LEAP_02_MS)).toBe('land');
  });

  it('maps the delivered landings and falls back when a beat has no frame', () => {
    expect(companionFrameId('S0', 'land')).toBe('land-shore-driftwood');
    expect(companionFrameId('S1', 'land')).toBe('land-shore-gourd');
    expect(companionFrameId('S2', 'land')).toBe('land-shore-east-gap');
    expect(companionFrameId('C2', 'land')).toBe('land-camp-sleep-mat');
    expect(companionFrameId('C3', 'land')).toBe('land-camp-fireside');
    expect(companionFrameId('C2', 'land')).not.toContain('curtain');
    expect(companionFrameId('C3', 'land')).not.toContain('curtain');
    expect(companionFrameId('Y0', 'land')).toBe('land-yard-give');
    expect(companionFrameId('C1', 'land')).toBe('land-camp-fireside');
    expect(companionFrameId('Y1', 'land')).toBe('fallback');
    expect(companionFrameId('Y2', 'land')).toBe('fallback');
    expect(companionFrameId('S0', 'leap-01')).toBe('leap-01');
    expect(companionFrameId('Y0', 'leap-02')).toBe('leap-02');
  });
});
