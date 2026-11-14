import { LEXEMES } from '../content/catalog';
import { isLayerUnlocked, requirementsMet } from './conditions';
import { expeditionGoal, type ExpeditionGoal } from './expedition';
import { puzzleState } from './puzzles';
import type { Lexeme, MuralLayer, SaveData } from './schema';
import { isLearnedState } from './words';

export const LEARNING_LAYERS: readonly MuralLayer[] = ['concrete', 'action', 'relation', 'abstract'];
export type LearningJourney =
  | { kind: 'explore'; goal: ExpeditionGoal }
  | { kind: 'learn'; goal: ExpeditionGoal; focus: Lexeme; prerequisite: boolean };

/** Offer the next usable clue, never unlock a band or supply its picture answer. */
export function learningJourney(save: SaveData): LearningJourney | null {
  const goal = expeditionGoal(save);
  if (goal.spot !== 'island-mural') return { kind: 'explore', goal };
  const puzzle = puzzleState(save);
  const needed = puzzle.water !== 'done' ? ['water']
    : !save.beats['dba.beat.sleep'] ? ['fire', 'sleep']
    : puzzle.food.stage !== 'done' ? ['give', 'share']
    : !save.beats['dba.beat.danger'] ? ['danger'] : ['hunger', 'promise', 'danger'];
  const known = (id: string) => isLearnedState(save.words[id]?.state);
  const required = needed.map(id => `dba.word.${id}`).find(id => !known(id));
  if (!required) return null;
  function nextClue(id: string, visited = new Set<string>()): Lexeme | undefined {
    if (known(id) || visited.has(id)) return;
    visited.add(id);
    const word = LEXEMES.find(item => item.id === id);
    if (!word) return;
    for (const dependency of word.requires) {
      if (!known(dependency)) return nextClue(dependency, visited);
    }
    if (isLayerUnlocked(word.layer as MuralLayer, save.words, LEXEMES)) return word;
    // An unopened band is approached through the latest currently readable
    // band. Both this suggestion and selection use the authored conditions.
    return LEXEMES.filter(item => !known(item.id) && requirementsMet(item, save.words) &&
      isLayerUnlocked(item.layer as MuralLayer, save.words, LEXEMES) &&
      LEARNING_LAYERS.indexOf(item.layer as MuralLayer) < LEARNING_LAYERS.indexOf(word.layer as MuralLayer))
      .sort((a, b) => LEARNING_LAYERS.indexOf(b.layer as MuralLayer) - LEARNING_LAYERS.indexOf(a.layer as MuralLayer))[0];
  }
  const focus = nextClue(required);
  return focus ? { kind: 'learn', goal, focus, prerequisite: focus.id !== required } : null;
}
