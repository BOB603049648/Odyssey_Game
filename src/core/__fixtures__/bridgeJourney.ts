import { reduce } from '../reduce';
import type { SaveData } from '../schema';
import { isLearnedState } from '../words';

/** Test journeys perform the public puzzle operations instead of seeding a beat. */
export function agreeAtBridge(save: SaveData, intent = 'dba.word.wait'): SaveData {
  for (const clue of ['boards', 'rope'] as const) save = reduce(save, { type: 'bridge-act', move: 'inspect', clue });
  if (intent === 'dba.word.wait' && !isLearnedState(save.words[intent]?.state)) {
    save = reduce(save, { type: 'bridge-act', move: 'decipher', wordId: intent });
  }
  save = reduce(save, { type: 'bridge-act', move: 'select', slot: 'reason', wordId: 'dba.word.danger' });
  save = reduce(save, { type: 'bridge-act', move: 'select', slot: 'intent', wordId: intent });
  return reduce(save, { type: 'bridge-act', move: 'signal' });
}
export function returnFromBridge(save: SaveData): SaveData {
  return reduce(agreeAtBridge(save), { type: 'goto-scene', scene: 'dba.scene.yard' });
}
