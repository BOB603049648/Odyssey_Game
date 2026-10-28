import { describe, expect, it } from 'vitest';
import { GUIDE_GAZE_MS, LEAP_01_MS, LEAP_02_MS, TRAJ_FOOT, companionFrameId, nextGuide, trajClip } from './companionTraj';

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

  it('stops, looks, then moves, and a scene change plants her', () => {
    const from = { x: 0.3, y: 0.7 };
    const post = { x: 0.58, y: 0.64 };
    const gazed = nextGuide({
      phase: 'hold',
      elapsed: 0,
      cat: from,
      post,
      dt: 0.016,
      retarget: true,
      sceneChanged: false,
    });
    expect(gazed.phase).toBe('gaze');
    expect(gazed.moving).toBe(false);
    expect(gazed.cat).toEqual(from);

    const still = nextGuide({ ...gazed, cat: gazed.cat, post, dt: 0.2, retarget: false, sceneChanged: false });
    expect(still.phase).toBe('gaze');
    expect(still.moving).toBe(false);
    expect(still.cat).toEqual(from);

    const going = nextGuide({
      phase: 'gaze',
      elapsed: GUIDE_GAZE_MS - 10,
      cat: from,
      post,
      dt: 0.05,
      retarget: false,
      sceneChanged: false,
    });
    expect(going.phase).toBe('move');
    expect(going.moving).toBe(true);
    expect(going.cat.x).toBeGreaterThan(from.x);
    expect(going.cat.x).toBeLessThan(post.x);

    const arrived = nextGuide({
      phase: 'move',
      elapsed: 0,
      cat: { x: post.x - 0.004, y: post.y },
      post,
      dt: 0.05,
      retarget: false,
      sceneChanged: false,
    });
    expect(arrived.phase).toBe('hold');
    expect(arrived.moving).toBe(false);
    expect(arrived.cat).toEqual(post);

    const jitter = nextGuide({
      phase: 'hold',
      elapsed: 0,
      cat: { x: post.x + 0.0004, y: post.y },
      post,
      dt: 0.016,
      retarget: false,
      sceneChanged: false,
    });
    expect(jitter.phase).toBe('hold');
    expect(jitter.moving).toBe(false);
    expect(jitter.cat).toEqual(post);

    const planted = nextGuide({
      phase: 'move',
      elapsed: 80,
      cat: from,
      post,
      dt: 0.016,
      retarget: true,
      sceneChanged: true,
    });
    expect(planted.phase).toBe('hold');
    expect(planted.moving).toBe(false);
    expect(planted.cat).toEqual(post);
  });
});
