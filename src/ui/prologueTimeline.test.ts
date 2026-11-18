import { describe, expect, it } from 'vitest';
import { PROLOGUE_DURATIONS, prologueCamera } from './prologueTimeline';
import { reduce } from '../core/reduce';
import { newGameState } from '../core/save';

describe('opening camera framing', () => {
  it.each([0, 1, 2, 3])('keeps image edges and protected story subjects in frame throughout shot %i', step => {
    const subjects = [
      [[.55,.45], [.78,.64], [.495,.555]],
      [[.372,.38], [.664,.56], [.416,.533], [.68,.611]],
      [[.505,.30], [.525,.59], [.505,.621], [.525,.705]],
      [[.54,.4], [.421,.709], [.55,.515], [.414,.694], [.24,.5]],
    ][step];
    for (let time = 0; time <= PROLOGUE_DURATIONS[step]; time += 1 / 60) {
      const camera = prologueCamera(step, time);
      expect(Math.abs(camera.x)).toBeLessThanOrEqual((camera.scale - 1) / 2);
      expect(Math.abs(camera.y)).toBeLessThanOrEqual((camera.scale - 1) / 2);
      for (const [x, y] of subjects) {
        const projected = [(x - .5) * camera.scale + .5 + camera.x, (y - .5) * camera.scale + .5 + camera.y];
        for (const axis of projected) { expect(axis).toBeGreaterThan(.08); expect(axis).toBeLessThan(.92); }
      }
    }
  });
  it('disables camera movement for reduced motion', () => {
    for (let step = 0; step < 4; step++) expect(prologueCamera(step, 5, true)).toEqual({ scale: 1, x: 0, y: 0 });
  });
  it('does not reset game progress when restarting the film, or reopen it after landing', () => {
    let state = reduce(newGameState(), { type: 'new-game' });
    for (let i = 0; i < 3; i++) state = reduce(state, { type: 'advance-prologue' });
    const replay = reduce(state, { type: 'replay-prologue' });
    expect(replay.prologueStep).toBe(0);
    expect(replay.evidence).toEqual(state.evidence);
    expect(replay.flags).toEqual(state.flags);
    expect(replay.words).toEqual(state.words);
    const landed = reduce(replay, { type: 'skip-prologue' });
    expect(landed.evidence).toEqual(['dba.ev.a']);
    expect(reduce(landed, { type: 'replay-prologue' })).toBe(landed);
  });
});
