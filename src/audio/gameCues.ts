import { SURVIVAL_BEATS } from '../core/island';
import type { SaveData } from '../core/schema';
import { isLearnedState } from '../core/words';
import type { SoundId } from './sounds';
import { puzzleState } from '../core/puzzles';
export type GameCue = { id: SoundId; delay?: number; level?: number };
/** State transitions only: continuing/restoring a save must not replay rewards. */
export function gameCues(previous: SaveData, next: SaveData): GameCue[] {
  if (previous.createdAt !== next.createdAt || next.screen === 'prologue' || previous.screen === 'prologue') return [];
  const cues: GameCue[] = [];
  const changed = next.feedback.seq !== previous.feedback.seq;
  if (changed && next.feedback.kind === 'ok' && next.feedback.spot?.startsWith('bridge-')) {
    if (next.feedback.spot === 'bridge-boards' || next.feedback.spot === 'bridge-rope') cues.push({ id: 'wood-creak', level: .5 });
    if (next.feedback.spot === 'bridge-select') cues.push({ id: 'select', level: .55 });
    if (next.feedback.spot === 'bridge-lesson' && isLearnedState(next.words['dba.word.wait']?.state) && !isLearnedState(previous.words['dba.word.wait']?.state)) cues.push({ id: 'word-learn', level: .8 });
    if (next.feedback.spot === 'bridge-signal') cues.push({ id: 'cat-call', level: .65 });
  }
  if (changed && next.feedback.kind === 'ok' &&
      (next.feedback.spot === 'food-self' || next.feedback.spot === 'food-companion') &&
      puzzleState(previous).food.self !== puzzleState(next).food.self) cues.push({ id: 'place', level: .55 });
  if (next.evidence.some(id => !previous.evidence.includes(id)) || next.inventory.some(id => !previous.inventory.includes(id))) cues.push({ id: 'pickup', level: .8 });
  if (next.screen === 'mural' && next.selectedCellId && next.selectedCellId !== previous.selectedCellId) cues.push({ id: 'select', level: .6 });
  if (next.screen === 'mural' && changed) {
    if (next.feedback.kind === 'no') cues.push({ id: 'answer-wrong', level: .65 });
    if (next.feedback.kind === 'ok') {
      const learned = Object.entries(next.words).some(([id,word]) => isLearnedState(word.state) && !isLearnedState(previous.words[id]?.state));
      cues.push({ id: learned ? 'word-learn' : 'answer-right', level: .8 });
    }
  } else if (changed && next.feedback.kind === 'no') cues.push({ id: 'answer-wrong', level: .5 });
  if (next.companion.level > previous.companion.level && next.companion.level > 0) cues.push({ id: 'cat-call', level: .65 });
  if (changed && next.feedback.kind === 'ok' && next.feedback.spot === 'shore-driftwood') cues.push({ id: 'cat-purr', level: .85 });
  if (next.screen !== previous.screen && (next.screen === 'mural' || previous.screen === 'mural') || next.overlay !== previous.overlay && ['lexicon','casefile'].includes(next.overlay) || next.cutsceneStep !== previous.cutsceneStep && next.overlay === 'memory') cues.push({ id: 'paper', level: .65 });
  if (SURVIVAL_BEATS.some(beat => next.beats[`dba.beat.${beat}`] && !previous.beats[`dba.beat.${beat}`])) cues.push({ id: 'milestone', delay: 1100, level: .7 });
  return cues;
}
