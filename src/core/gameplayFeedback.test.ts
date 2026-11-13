import { describe, expect, it } from 'vitest';
import { hintPresentation } from './hints';
import { reduce } from './reduce';
import { newGameState } from './save';
import { canDepart, departureBlocker, SURVIVAL_BEATS } from './island';

function ashore() {
  let state = reduce(newGameState(), { type: 'new-game' });
  for (let i = 0; i < 4; i++) state = reduce(state, { type: 'advance-prologue' });
  return state;
}

describe('player action feedback', () => {
  it('requires real survival actions even with every word learned, while evidence stays optional', () => {
    const state = ashore();
    for (const word of Object.values(state.words)) word.state = 'learned';
    state.beats['dba.beat.water'] = true;
    expect(canDepart(state)).toBe(false);
    expect(reduce(state, { type: 'depart' }).feedback.line).toBe('spot.depart.food');
    for (const beat of SURVIVAL_BEATS) state.beats[`dba.beat.${beat}`] = true;
    state.evidence = [];
    expect(canDepart(state)).toBe(true);
    for (const beat of SURVIVAL_BEATS) {
      expect(departureBlocker({ ...state, beats: { ...state.beats, [`dba.beat.${beat}`]: false } })).toBe(beat);
    }
    expect(departureBlocker({ ...state, words: newGameState().words })).toBe('words');
  });

  it('retains a legacy completed chapter without inventing missing survival records', () => {
    const state = { ...ashore(), beats: { 'dba.beat.depart': true } };
    expect(canDepart(state)).toBe(true);
    const next = reduce(state, { type: 'depart' });
    expect(next.overlay).toBe('depart');
    expect(next.beats['dba.beat.food']).toBeUndefined();
  });
  it('clears a previous answer hint when the player selects a different cell', () => {
    let state = reduce(ashore(), { type: 'open-mural' });
    for (let i = 0; i < 3; i++) state = reduce(state, { type: 'request-hint' });
    expect(state.companion.targetId).toBe('dba.word.sun');
    state = reduce(state, { type: 'select-cell', wordId: 'dba.word.fire' });
    expect(hintPresentation(state)).toMatchObject({ level: 0, wordId: 'dba.word.fire' });
    state = reduce(state, { type: 'request-hint' });
    expect(hintPresentation(state)).toMatchObject({ level: 1, anchor: 'mural-object', wordId: 'dba.word.fire' });
    state = reduce(state, { type: 'close-screen' });
    expect(state.companion.level).toBe(0);
  });

  it('recovers a stale hint target from an existing save on the next hint request', () => {
    const state = { ...reduce(ashore(), { type: 'open-mural' }), selectedCellId: 'dba.word.water',
      companion: { level: 3 as const, targetId: 'dba.word.sun', pawUsed: true } };
    expect(reduce(state, { type: 'request-hint' }).companion).toEqual({ level: 1, targetId: 'dba.word.water', pawUsed: false });
  });

  it('acknowledges completed drinking without a false failure or duplicate progress', () => {
    const state = { ...ashore(), beats: { 'dba.beat.water': true } };
    const next = reduce(state, { type: 'poke-gourd' });
    expect(next.feedback).toMatchObject({ kind: 'ok', line: 'spot.gourd.again', spot: 'island-gourd' });
    expect(next.beats).toEqual(state.beats);
    expect(next.overlay).toBe('none');
    expect(next.stepCounter).toBe(state.stepCounter);
  });

  it('responds to the visible ember hotspot without granting a story beat or evidence', () => {
    const state = reduce(ashore(), { type: 'goto-scene', scene: 'dba.scene.night' });
    const next = reduce(state, { type: 'inspect-embers' });
    expect(next.feedback).toMatchObject({ kind: 'ok', line: 'spot.ember.ok', spot: 'night-ember' });
    expect(next.feedback.seq).toBe(state.feedback.seq + 1);
    expect(next.beats).toEqual(state.beats);
    expect(next.evidence).toEqual(state.evidence);
    expect(reduce(ashore(), { type: 'inspect-embers' }).flags['dba.flag.embers-seen']).toBeUndefined();
  });

  it('explains a dangerous step and a successful stop at the corresponding prop', () => {
    const state = reduce(ashore(), { type: 'goto-scene', scene: 'dba.scene.path' });
    expect(reduce(state, { type: 'forest-choice', choice: 'step' }).feedback).toMatchObject({ kind: 'no', spot: 'path-step', line: 'spot.path.step' });
    expect(reduce(state, { type: 'forest-choice', choice: 'stop' }).feedback).toMatchObject({ kind: 'no', spot: 'path-stop', line: 'spot.path.no' });
    state.words['dba.word.danger'].state = 'learned';
    const next = reduce(state, { type: 'forest-choice', choice: 'stop' });
    expect(next.feedback).toMatchObject({ kind: 'ok', spot: 'path-stop', line: 'spot.path.ok' });
    expect(next.beats['dba.beat.danger']).toBe(true);
  });
});
