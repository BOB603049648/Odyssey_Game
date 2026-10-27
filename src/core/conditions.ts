import type { Lexeme, MuralLayer, WordProgress } from './schema';
import { isLearnedState } from './words';

export function learnedCount(
  layer: MuralLayer,
  words: Record<string, WordProgress>,
  lexemes: readonly Lexeme[],
): number {
  return lexemes.filter(
    (lexeme) => lexeme.layer === layer && isLearnedState(words[lexeme.id]?.state),
  ).length;
}

export function isLayerUnlocked(
  layer: MuralLayer,
  words: Record<string, WordProgress>,
  lexemes: readonly Lexeme[],
): boolean {
  if (layer === 'concrete') return true;
  if (layer === 'action') return learnedCount('concrete', words, lexemes) >= 6;
  if (layer === 'relation') return learnedCount('action', words, lexemes) >= 4;
  return learnedCount('relation', words, lexemes) >= 5;
}

export function requirementsMet(lexeme: Lexeme, words: Record<string, WordProgress>): boolean {
  return lexeme.requires.every((id) => isLearnedState(words[id]?.state));
}
