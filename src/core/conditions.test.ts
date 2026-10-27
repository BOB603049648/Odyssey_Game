import { describe, expect, it } from 'vitest';
import { LEXEMES } from '../content/catalog';
import { isLayerUnlocked, requirementsMet } from './conditions';
import { newGameState } from './save';
import type { WordProgress } from './schema';

function learned(state: ReturnType<typeof newGameState>, ids: string[]) {
  const words = { ...state.words };
  for (const id of ids) {
    words[id] = { ...words[id], state: 'learned' } as WordProgress;
  }
  return words;
}

describe('mural layer locks', () => {
  it('opens the action band only after six concrete words are learned', () => {
    const base = newGameState();
    const concrete = LEXEMES.filter((item) => item.layer === 'concrete').map((item) => item.id);
    expect(isLayerUnlocked('action', base.words, LEXEMES)).toBe(false);
    expect(isLayerUnlocked('action', learned(base, concrete.slice(0, 5)), LEXEMES)).toBe(false);
    expect(isLayerUnlocked('action', learned(base, concrete), LEXEMES)).toBe(true);
  });

  it('opens relation after four action words and abstract after every relation word', () => {
    const base = newGameState();
    const action = LEXEMES.filter((item) => item.layer === 'action').map((item) => item.id);
    const relation = LEXEMES.filter((item) => item.layer === 'relation').map((item) => item.id);
    expect(isLayerUnlocked('relation', learned(base, action.slice(0, 3)), LEXEMES)).toBe(false);
    expect(isLayerUnlocked('relation', learned(base, action.slice(0, 4)), LEXEMES)).toBe(true);
    expect(isLayerUnlocked('abstract', learned(base, relation.slice(0, 4)), LEXEMES)).toBe(false);
    expect(isLayerUnlocked('abstract', learned(base, relation), LEXEMES)).toBe(true);
  });

  it('keeps an abstract cell shut until its required words are learned', () => {
    const hunger = LEXEMES.find((item) => item.id === 'myp.word.hunger');
    expect(hunger?.requires).toEqual(['myp.word.person', 'myp.word.fish']);
    const base = newGameState();
    expect(requirementsMet(hunger!, base.words)).toBe(false);
    expect(requirementsMet(hunger!, learned(base, ['myp.word.person', 'myp.word.fish']))).toBe(true);
  });
});
