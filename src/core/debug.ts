import { LEXEMES } from '../content/catalog';
import { isLayerUnlocked, requirementsMet } from './conditions';
import { isIslandScene } from './island';
import type { EndingContent, SaveData } from './schema';
import { isLearnedState } from './words';

export function debugScene(state: SaveData, scene: string): SaveData {
  if (!isIslandScene(scene)) return state;
  return {
    ...state,
    screen: 'island',
    currentScene: scene,
    overlay: 'none',
    selectedCellId: null,
  };
}

export function debugLearnNext(state: SaveData): SaveData {
  const next = LEXEMES.find(
    (lexeme) =>
      isLayerUnlocked(lexeme.layer as SaveData['activeLayer'], state.words, LEXEMES) &&
      requirementsMet(lexeme, state.words) &&
      !isLearnedState(state.words[lexeme.id]?.state),
  );
  if (!next) return state;
  const word = state.words[next.id];
  if (!word) return state;
  return {
    ...state,
    words: {
      ...state.words,
      [next.id]: { ...word, state: 'learned', correct: word.correct + 1 },
    },
  };
}

export function debugEvidence(state: SaveData, id: string): SaveData {
  if (state.evidence.includes(id)) return state;
  return { ...state, evidence: [...state.evidence, id] };
}

export function debugHotspots(state: SaveData, value: boolean): SaveData {
  return { ...state, flags: { ...state.flags, 'dev.hotspots': value } };
}

export function debugForceEnding(state: SaveData, id: EndingContent['id']): SaveData {
  return { ...state, flags: { ...state.flags, 'dev.forceEnding': id } };
}
