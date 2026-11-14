import type { SaveData } from './schema';
import { puzzleState } from './puzzles';

/** Rendering reads the gameplay projection; it never keeps a second puzzle save. */
export type WorldState = ReturnType<typeof puzzleState> & { rested: boolean };

export function worldState(save: SaveData): WorldState {
  return { ...puzzleState(save), rested: save.beats['dba.beat.sleep'] === true };
}
