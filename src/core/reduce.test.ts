import { describe, expect, it } from 'vitest';
import { hintPresentation } from './hints';
import { newGameState } from './save';
import { reduce } from './reduce';
import type { SaveData } from './schema';

function atIsland(): SaveData {
  let state = reduce(newGameState(), { type: 'new-game' });
  for (let i = 0; i < 4; i += 1) state = reduce(state, { type: 'advance-prologue' });
  return state;
}

function learn(state: SaveData, wordId: string): SaveData {
  let next = reduce(state, { type: 'open-mural' });
  next = reduce(next, { type: 'select-cell', wordId });
  return reduce(next, { type: 'match-object', wordId });
}

describe('prologue', () => {
  it('starts a new game with teaching glosses off', () => {
    const state = newGameState();
    expect(state.screen).toBe('title');
    expect(state.settings.showGloss).toBe(false);
    expect(Object.values(state.words).every((word) => word.state === 'unseen')).toBe(true);
  });

  it('shows the contract break, then the cat on the tide line', () => {
    let state = reduce(newGameState(), { type: 'new-game' });
    expect(state.screen).toBe('prologue');
    expect(state.prologueStep).toBe(0);

    state = reduce(state, { type: 'advance-prologue' });
    expect(state.prologueStep).toBe(1);
    expect(state.flags['pro.flag.heard-meow']).toBe(true);

    state = reduce(state, { type: 'advance-prologue' });
    expect(state.prologueStep).toBe(2);
    expect(state.evidence).toContain('dba.ev.a');
    expect(state.beats['pro.beat.storm']).toBe(true);

    state = reduce(state, { type: 'advance-prologue' });
    expect(state.prologueStep).toBe(3);
    expect(state.screen).toBe('prologue');

    state = reduce(state, { type: 'advance-prologue' });
    expect(state.screen).toBe('island');
    expect(state.currentScene).toBe('dba.scene.shore');
    expect(state.flags['pro.flag.met-companion']).toBe(true);
    expect(state.beats['dba.beat.meet']).toBe(true);
    state = reduce(state, { type: 'teach-approach' });
    expect(state.flags['dba.flag.taught-approach']).toBe(true);
    expect(reduce(state, { type: 'teach-approach' }).feedback.seq).toBe(state.feedback.seq);
  });

  it('keeps the gloss setting when the player starts over', () => {
    let state = reduce(newGameState(), { type: 'set-show-gloss', value: true });
    state = reduce(state, { type: 'new-game' });
    expect(state.settings.showGloss).toBe(true);
    expect(state.screen).toBe('prologue');
    expect(state.evidence).toEqual([]);
  });
});

describe('island 1 teach loop', () => {
  it('learns a word only when the mural cell matches the object', () => {
    let state = atIsland();
    state = reduce(state, { type: 'open-mural' });
    state = reduce(state, { type: 'select-cell', wordId: 'dba.word.water' });
    state = reduce(state, { type: 'match-object', wordId: 'dba.word.fish' });
    expect(state.words['dba.word.water'].state).toBe('guessed');

    state = reduce(state, { type: 'match-object', wordId: 'dba.word.water' });
    expect(state.words['dba.word.water'].state).toBe('learned');
    expect(state.companion.level).toBe(0);
  });

  it('uses the learned water word on the offered gourd', () => {
    let state = learn(atIsland(), 'dba.word.water');
    state = reduce(state, { type: 'close-screen' });
    state = reduce(state, { type: 'use-word', wordId: 'dba.word.fish' });
    expect(state.beats['dba.beat.water']).toBeUndefined();

    state = reduce(state, { type: 'poke-gourd' });
    expect(state.overlay).toBe('use-word');
    state = reduce(state, { type: 'use-word', wordId: 'dba.word.water' });
    expect(state.beats['dba.beat.water']).toBe(true);
    expect(state.overlay).toBe('none');
  });

  it('does not complete the drink before water is learned', () => {
    let state = atIsland();
    state = reduce(state, { type: 'poke-gourd' });
    expect(state.overlay).toBe('none');
    state = reduce(state, { type: 'use-word', wordId: 'dba.word.water' });
    expect(state.beats['dba.beat.water']).toBeUndefined();
  });

  it('points the companion at the selected mural object', () => {
    let state = reduce(atIsland(), { type: 'open-mural' });
    state = reduce(state, { type: 'select-cell', wordId: 'dba.word.fish' });
    state = reduce(state, { type: 'request-hint' });
    const hint = hintPresentation(state);
    expect(hint.level).toBe(1);
    expect(hint.anchor).toBe('mural-object');
    expect(hint.wordId).toBe('dba.word.fish');
  });

  it('raises the companion hint one step at a time and stops at a paw', () => {
    let state = reduce(atIsland(), { type: 'open-mural' });
    state = reduce(state, { type: 'request-hint' });
    expect(state.companion.level).toBe(1);
    state = reduce(state, { type: 'request-hint' });
    state = reduce(state, { type: 'request-hint' });
    expect(state.companion.level).toBe(3);
    expect(state.companion.pawUsed).toBe(true);
    const stats = state.hintStats[state.companion.targetId ?? ''];
    expect(stats?.paw).toBe(1);
    state = reduce(state, { type: 'request-hint' });
    expect(state.companion.level).toBe(3);
  });
});

describe('save schema', () => {
  it('round-trips a learned word through the save parser', async () => {
    const { saveDataSchema } = await import('./schema');
    const state = learn(atIsland(), 'dba.word.sun');
    const parsed = saveDataSchema.parse(JSON.parse(JSON.stringify(state)));
    expect(parsed.words['dba.word.sun'].state).toBe('learned');
    expect(parsed.settings.showGloss).toBe(false);
  });
});
