import { LEXEMES } from '../content/catalog';
import { isLayerUnlocked, requirementsMet } from './conditions';
import type { HintLevel, SaveData } from './schema';
import { isLearnedState } from './words';

export type HintAnchor = 'mural-entrance' | 'mural-cell' | 'mural-object' | 'gourd' | 'use-word';

const WATER = 'myp.word.water';
const WATER_BEAT = 'myp.beat.water';

export function hintTarget(state: SaveData): string | null {
  if (state.overlay === 'use-word') return WATER;
  const waterReady =
    isLearnedState(state.words[WATER]?.state) && state.beats[WATER_BEAT] !== true;
  if (state.screen !== 'mural' && waterReady) return WATER;
  if (state.screen === 'mural' && state.selectedCellId) {
    const selected = state.words[state.selectedCellId];
    if (selected && !isLearnedState(selected.state)) return state.selectedCellId;
  }
  const pool =
    state.screen === 'mural'
      ? LEXEMES.filter((lexeme) => lexeme.layer === state.activeLayer)
      : LEXEMES;
  const next = pool.find(
    (lexeme) =>
      isLayerUnlocked(lexeme.layer as SaveData['activeLayer'], state.words, LEXEMES) &&
      requirementsMet(lexeme, state.words) &&
      !isLearnedState(state.words[lexeme.id]?.state),
  );
  return next?.id ?? null;
}

export function hintAnchor(state: SaveData): HintAnchor {
  if (state.overlay === 'use-word') return 'use-word';
  if (state.screen === 'mural') return state.selectedCellId ? 'mural-object' : 'mural-cell';
  if (isLearnedState(state.words[WATER]?.state) && state.beats[WATER_BEAT] !== true) return 'gourd';
  return 'mural-entrance';
}

export function hintPresentation(state: SaveData): {
  level: HintLevel;
  anchor: HintAnchor;
  wordId: string | null;
} {
  return {
    level: state.companion.level,
    anchor: hintAnchor(state),
    wordId: state.companion.level === 0 ? hintTarget(state) : state.companion.targetId,
  };
}
