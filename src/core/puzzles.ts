import type { SaveData } from './schema';
import { isLearnedState } from './words';

export type WaterStage = 'empty' | 'carried' | 'filled' | 'done';
export type FoodStage = 'unseen' | 'inspected' | 'taken' | 'allocating' | 'done';
export type FoodState = { stage: FoodStage; self: number; companion: number };
export type WaterMove = 'take' | 'try-sea' | 'fill' | 'drink';
export type FoodMove = 'inspect' | 'take' | 'move-to-companion' | 'move-to-self' | 'offer';
export type PuzzleAction =
  | { type: 'puzzle-act'; puzzle: 'water'; move: WaterMove }
  | { type: 'puzzle-act'; puzzle: 'food'; move: FoodMove };

export const PUZZLE_FLAGS = {
  water: 'dba.puzzle.water',
  food: 'dba.puzzle.food',
  foodSelf: 'dba.puzzle.food-self',
} as const;

/** Existing completed journeys remain complete without manufacturing new beats.
 * Unknown or malformed partial flags fall back to a recoverable initial state. */
export function puzzleState(save: SaveData): { water: WaterStage; food: FoodState } {
  const waterFlag = save.flags[PUZZLE_FLAGS.water];
  // v0.1.2 opened this sheet after offering the cup, before partial puzzle
  // flags existed. Preserve that in-progress interaction on old save imports.
  const legacyOfferedCup = waterFlag === undefined && save.screen === 'island'
    && save.currentScene === 'dba.scene.shore' && save.overlay === 'use-word';
  const water: WaterStage = save.beats['dba.beat.water'] === true ? 'done'
    : waterFlag === 'carried' || waterFlag === 'filled' ? waterFlag : legacyOfferedCup ? 'carried' : 'empty';
  if (save.beats['dba.beat.food'] === true) return { water, food: { stage: 'done', self: 2, companion: 2 } };
  const foodFlag = save.flags[PUZZLE_FLAGS.food];
  const stage: FoodStage = foodFlag === 'inspected' || foodFlag === 'taken' || foodFlag === 'allocating' ? foodFlag : 'unseen';
  const amount = save.flags[PUZZLE_FLAGS.foodSelf];
  const self = stage === 'allocating' && typeof amount === 'number' && Number.isInteger(amount) && amount >= 0 && amount <= 4 ? amount : 4;
  return { water, food: { stage, self, companion: 4 - self } };
}

function response(save: SaveData, kind: 'ok' | 'no', line: string, spot: string, patch: Partial<SaveData> = {}): SaveData {
  return { ...save, ...patch, feedback: { seq: save.feedback.seq + 1, kind, line, spot } };
}

export function canOperatePuzzle(save: SaveData, puzzle: PuzzleAction['puzzle'], allowWaterOverlay = false): boolean {
  return save.screen === 'island' && save.currentScene === (puzzle === 'water' ? 'dba.scene.shore' : 'dba.scene.yard')
    && (save.overlay === 'none' || (allowWaterOverlay && puzzle === 'water' && save.overlay === 'use-word'));
}

/** Every operation validates its scene and phase; UI visibility is not a rule. */
export function applyPuzzleAction(save: SaveData, action: PuzzleAction): SaveData {
  if (!canOperatePuzzle(save, action.puzzle)) return save;
  return action.puzzle === 'water' ? waterAction(save, action.move) : foodAction(save, action.move);
}

function waterAction(save: SaveData, move: WaterMove): SaveData {
  const stage = puzzleState(save).water;
  const spot = move === 'take' ? 'water-take' : move === 'try-sea' ? 'water-sea' : move === 'fill' ? 'water-spring' : 'island-gourd';
  if (stage === 'done') return response(save, 'ok', move === 'drink' ? 'spot.gourd.again' : 'spot.water.done', spot);
  if (move === 'take') {
    if (stage !== 'empty') return response(save, 'ok', stage === 'filled' ? 'spot.water.full' : 'spot.water.carried', spot);
    return response(save, 'ok', 'spot.water.take', spot, { flags: { ...save.flags, [PUZZLE_FLAGS.water]: 'carried' } });
  }
  if (stage === 'empty') return response(save, 'no', 'spot.water.needCup', spot);
  if (move === 'try-sea') return response(save, 'no', 'spot.water.salt', spot);
  if (move === 'fill') {
    if (stage === 'filled') return response(save, 'ok', 'spot.water.full', spot);
    if (!isLearnedState(save.words['dba.word.water']?.state)) return response(save, 'no', 'spot.water.unknown', spot);
    return response(save, 'ok', 'spot.water.fill', spot, { flags: { ...save.flags, [PUZZLE_FLAGS.water]: 'filled' } });
  }
  if (stage !== 'filled') return response(save, 'no', 'spot.water.empty', spot);
  return response(save, 'ok', 'spot.gourd.ok', spot, {
    flags: { ...save.flags, [PUZZLE_FLAGS.water]: 'done' },
    beats: { ...save.beats, 'dba.beat.water': true },
    stepCounter: save.stepCounter + 1,
    companion: { level: 0, targetId: null, pawUsed: false },
  });
}

/** Compatibility for the existing water-glyph sheet: selecting the right glyph
 * fills a held cup only. Drinking is a separate physical operation. */
export function useWaterWord(save: SaveData, wordId: string): SaveData {
  if (!canOperatePuzzle(save, 'water', true) || save.overlay !== 'use-word' || puzzleState(save).water !== 'carried') return save;
  if (wordId !== 'dba.word.water' || !isLearnedState(save.words[wordId]?.state)) {
    return response(save, 'no', 'spot.water.wrongGlyph', 'water-spring', { stepCounter: save.stepCounter + 1 });
  }
  // Materialize the offered-cup projection before closing a legacy sheet;
  // otherwise removing the sheet would make its implicit held cup disappear.
  return waterAction({ ...save, overlay: 'none', flags: { ...save.flags, [PUZZLE_FLAGS.water]: 'carried' } }, 'fill');
}

/** The old cup hotspot remains usable throughout the new sequence. */
export function useGourd(save: SaveData): SaveData {
  if (!canOperatePuzzle(save, 'water')) return save;
  const stage = puzzleState(save).water;
  if (stage === 'empty') return waterAction(save, 'take');
  if (stage === 'filled' || stage === 'done') return waterAction(save, 'drink');
  return response(save, 'no', 'spot.water.findSpring', 'water-take');
}

function foodAction(save: SaveData, move: FoodMove): SaveData {
  const food = puzzleState(save).food;
  const spot = move === 'inspect' ? 'food-inspect' : move === 'take' ? 'food-take'
    : move === 'move-to-companion' ? 'food-companion' : move === 'move-to-self' ? 'food-self' : 'yard-give';
  if (food.stage === 'done') return response(save, 'ok', 'spot.food.done', spot);
  if (move === 'inspect') {
    if (food.stage !== 'unseen') return response(save, 'ok', food.stage === 'inspected' ? 'spot.food.observed' : 'spot.food.taken', spot);
    return response(save, 'ok', 'spot.food.inspect', spot, { flags: { ...save.flags, [PUZZLE_FLAGS.food]: 'inspected' } });
  }
  if (food.stage === 'unseen') return response(save, 'no', 'spot.food.inspectFirst', spot);
  if (move === 'take') {
    if (food.stage !== 'inspected') return response(save, 'ok', 'spot.food.taken', spot);
    return response(save, 'ok', 'spot.food.take', spot, { flags: { ...save.flags, [PUZZLE_FLAGS.food]: 'taken', [PUZZLE_FLAGS.foodSelf]: 4 } });
  }
  if (food.stage === 'inspected') return response(save, 'no', 'spot.food.takeFirst', spot);
  if (move === 'move-to-companion' || move === 'move-to-self') {
    const next = food.self + (move === 'move-to-self' ? 1 : -1);
    if (next < 0 || next > 4) return response(save, 'no', 'spot.food.emptyBowl', spot);
    return response(save, 'ok', next === 2 ? 'spot.food.balanced' : 'spot.food.move', spot, {
      flags: { ...save.flags, [PUZZLE_FLAGS.food]: 'allocating', [PUZZLE_FLAGS.foodSelf]: next },
    });
  }
  if (food.self !== 2) return response(save, 'no', food.self === 0 ? 'spot.food.noSelf' : food.companion === 0 ? 'spot.food.noCompanion' : 'spot.food.unequal', spot);
  if (!isLearnedState(save.words['dba.word.share']?.state) || !isLearnedState(save.words['dba.word.give']?.state)) {
    return response(save, 'no', 'spot.give.no', spot);
  }
  return response(save, 'ok', 'spot.give.ok', spot, {
    flags: { ...save.flags, [PUZZLE_FLAGS.food]: 'done', [PUZZLE_FLAGS.foodSelf]: 2 },
    beats: { ...save.beats, 'dba.beat.food': true },
    stepCounter: save.stepCounter + 1,
    companion: { level: 0, targetId: null, pawUsed: false },
  });
}
