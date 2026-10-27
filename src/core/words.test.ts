import { describe, expect, it } from 'vitest';
import { reviewForMastery, transitionWord } from './words';
import type { WordProgress } from './schema';

function word(overrides: Partial<WordProgress> = {}): WordProgress {
  return {
    id: 'dba.word.water',
    state: 'seen',
    box: 1,
    correct: 0,
    wrong: 0,
    ...overrides,
  };
}

describe('word progress', () => {
  it('moves unseen to seen on reveal, then guessed on a miss, then learned on a match', () => {
    const seen = transitionWord(word({ state: 'unseen' }), 'reveal');
    expect(seen.state).toBe('seen');

    const guessed = transitionWord(seen, 'miss');
    expect(guessed.state).toBe('guessed');
    expect(guessed.wrong).toBe(1);

    const learned = transitionWord(guessed, 'learn');
    expect(learned.state).toBe('learned');
    expect(learned.correct).toBe(1);
  });

  it('does not drop a learned word back to guessed when the player misses', () => {
    const next = transitionWord(word({ state: 'learned', box: 3, wrong: 0 }), 'miss');
    expect(next.state).toBe('learned');
    expect(next.box).toBe(2);
    expect(next.wrong).toBe(1);
  });

  it('masters a learned word only when the review did not use a level-3 paw hint', () => {
    const learned = word({ state: 'learned', box: 2 });
    expect(reviewForMastery(learned, { correct: true, pawUsed: false }).state).toBe('mastered');
    expect(reviewForMastery(learned, { correct: true, pawUsed: true }).state).toBe('learned');
    expect(reviewForMastery(word({ state: 'seen' }), { correct: true, pawUsed: false }).state).toBe('seen');
  });
});
