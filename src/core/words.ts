import type { Box, WordProgress, WordState } from './schema';

const BOXES = [1, 2, 3, 4] as const;

export type WordEvent = 'reveal' | 'miss' | 'learn';

export function isLearnedState(state: WordState | undefined): boolean {
  return state === 'learned' || state === 'mastered' || state === 'ghost';
}

export function transitionWord(word: WordProgress, event: WordEvent): WordProgress {
  if (event === 'reveal') {
    if (word.state !== 'unseen') return word;
    return { ...word, state: 'seen' };
  }
  if (event === 'miss') {
    const next: WordProgress = {
      ...word,
      wrong: word.wrong + 1,
      box: lowerBox(word.box),
    };
    if (word.state === 'learned' || word.state === 'mastered' || word.state === 'ghost') return next;
    return { ...next, state: 'guessed' };
  }
  return {
    ...word,
    state: word.state === 'mastered' || word.state === 'ghost' ? word.state : 'learned',
    correct: word.correct + 1,
    box: raiseBox(word.box),
  };
}

export function reviewForMastery(
  word: WordProgress,
  input: { correct: boolean; pawUsed: boolean },
): WordProgress {
  if (!input.correct) return transitionWord(word, 'miss');
  const raised: WordProgress = {
    ...word,
    correct: word.correct + 1,
    box: raiseBox(word.box),
  };
  if (word.state === 'learned' && !input.pawUsed) return { ...raised, state: 'mastered' };
  return raised;
}

function raiseBox(box: Box): Box {
  const index = BOXES.indexOf(box);
  return BOXES[Math.min(BOXES.length - 1, index + 1)] ?? 4;
}

function lowerBox(box: Box): Box {
  const index = BOXES.indexOf(box);
  return BOXES[Math.max(0, index - 1)] ?? 1;
}
