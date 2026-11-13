import { describe, expect, it } from 'vitest';
import { newGameState } from './save';
import { expeditionGoal } from './expedition';
import { reviewChoices, reviewTap, reviewTarget } from './island';
import { meaningChoices } from './conceptChoices';

describe('a journey with a purpose', () => {
  it('contrasts sharing with giving and taking, without exposing unavailable words', () => {
    const pool = ['share', 'take', 'give', 'hunger', 'sun'].map(id => `dba.word.${id}`);
    expect(new Set(meaningChoices('dba.word.share', pool, 3))).toEqual(new Set(pool.slice(0, 3)));
    const early = meaningChoices('dba.word.water', ['dba.word.water', 'dba.word.fire', 'dba.word.fish'], 3);
    expect(early).toHaveLength(3);
    expect(early).not.toContain('dba.word.drink');
    expect(meaningChoices('dba.word.promise', pool, 3)).toEqual([]);
  });
  it('moves from observing the wall to applying water, then resting, without collecting optional evidence', () => {
    const state = newGameState();
    expect(expeditionGoal(state).spot).toBe('island-mural');
    state.words['dba.word.water'].state = 'learned';
    expect(expeditionGoal(state).spot).toBe('island-gourd');
    state.beats['dba.beat.water'] = true;
    expect(expeditionGoal(state).spot).toBe('island-mural');
    state.words['dba.word.sleep'].state = state.words['dba.word.fire'].state = 'learned';
    expect(expeditionGoal(state)).toMatchObject({ destination: 'dba.scene.camp', spot: 'camp-sleep' });
    state.beats['dba.beat.depart'] = true;
    expect(expeditionGoal(state).spot).toBe('night-memory');
  });

  it('offers several learned answers and records a mistaken interpretation on the question', () => {
    const state = newGameState();
    state.words['dba.word.sun'].state = 'learned';
    expect(reviewChoices(state)).toEqual([]);
    for (const id of ['moon','water','fire','fish']) state.words[`dba.word.${id}`].state = 'learned';
    const choices = reviewChoices(state);
    expect(choices).toHaveLength(4);
    expect(new Set(choices).size).toBe(4);
    expect(choices).toContain(reviewTarget(state));
    expect(choices).not.toContain('dba.word.person');
    const wrong = reviewTap(state, 'dba.word.water');
    expect(wrong.words['dba.word.sun'].wrong).toBe(1);
    expect(wrong.words['dba.word.water'].wrong).toBe(0);
    expect(wrong.words['dba.word.sun'].state).toBe('learned');
    const right = reviewTap(wrong, 'dba.word.sun');
    expect(right.words['dba.word.sun'].state).toBe('mastered');
    expect(reviewTarget(right)).toBe('dba.word.moon');
  });
});
