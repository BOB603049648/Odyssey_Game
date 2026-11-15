import { describe, expect, it } from 'vitest';
import { newGameState } from './save';
import { parseSave } from './migrate';
import { reduce } from './reduce';
import { applyPuzzleAction, puzzleState, useGourd, useWaterWord, type FoodMove, type WaterMove } from './puzzles';
import type { SaveData } from './schema';
import { hintPresentation } from './hints';

function shore(): SaveData {
  const save = newGameState('2026-11-14T00:00:00Z');
  return { ...save, screen: 'island', currentScene: 'dba.scene.shore' };
}
const water = (save: SaveData, move: WaterMove) => reduce(save, { type: 'puzzle-act', puzzle: 'water', move });
const food = (save: SaveData, move: FoodMove) => reduce(save, { type: 'puzzle-act', puzzle: 'food', move });
function yard(): SaveData { return { ...shore(), currentScene: 'dba.scene.yard' }; }
function preparedFood(): SaveData { return food(food(yard(), 'inspect'), 'take'); }

describe('water as a physical sequence', () => {
  it('requires a vessel, understood water and a separate drink before granting the survival beat', () => {
    let save = shore();
    expect(water(save, 'fill').feedback.line).toBe('spot.water.needCup');
    expect(water(save, 'drink').beats['dba.beat.water']).not.toBe(true);
    save = water(save, 'take');
    expect(puzzleState(save).water).toBe('carried');
    expect(save.feedback.spot).toBe('water-take');
    expect(water(save, 'fill').feedback.line).toBe('spot.water.unknown');
    expect(water(save, 'drink').feedback.line).toBe('spot.water.empty');
    save.words['dba.word.water'].state = 'learned';
    save = water(save, 'fill');
    expect(puzzleState(save).water).toBe('filled');
    expect(save.feedback.spot).toBe('water-spring');
    expect(save.beats['dba.beat.water']).not.toBe(true);
    save = water(save, 'drink');
    expect(puzzleState(save).water).toBe('done');
    expect(save.beats['dba.beat.water']).toBe(true);
    expect(save.feedback.spot).toBe('island-gourd');
  });
  it('lets wrong water sources fail without consuming the cup or previously filled water', () => {
    let save = water(shore(), 'take');
    const wrong = water(save, 'try-sea');
    expect(wrong.flags).toEqual(save.flags);
    expect(wrong.feedback.line).toBe('spot.water.salt');
    save.words['dba.word.water'].state = 'learned';
    save = water(save, 'fill');
    expect(puzzleState(water(save, 'try-sea')).water).toBe('filled');
  });
  it('does not let the legacy water-word event skip context, filling or drinking', () => {
    const save = shore(); save.words['dba.word.water'].state = 'learned';
    expect(useWaterWord(save, 'dba.word.water')).toBe(save);
    expect(useWaterWord({ ...save, overlay: 'use-word' }, 'dba.word.water').beats['dba.beat.water']).not.toBe(true);
    const held = { ...water(save, 'take'), overlay: 'use-word' as const };
    const wrong = useWaterWord(held, 'dba.word.fire');
    expect(puzzleState(wrong).water).toBe('carried');
    expect(wrong.overlay).toBe('use-word');
    const filled = useWaterWord(wrong, 'dba.word.water');
    expect(filled.overlay).toBe('none');
    expect(puzzleState(filled).water).toBe('filled');
    expect(filled.beats['dba.beat.water']).not.toBe(true);
    expect(puzzleState(useGourd(filled)).water).toBe('done');
    const wrongScene = { ...held, currentScene: 'dba.scene.camp' };
    expect(useWaterWord(wrongScene, 'dba.word.water')).toBe(wrongScene);
  });
  it('resumes the held and filled cup after a save round trip and never repeats completion progress', () => {
    let save = water(shore(), 'take'); save.words['dba.word.water'].state = 'learned';
    for (const move of ['fill', 'drink'] as const) {
      const restored = parseSave(JSON.parse(JSON.stringify(save)));
      expect(restored).not.toBeNull();
      save = water(restored!, move);
    }
    const again = water(save, 'drink');
    expect(again.beats).toEqual(save.beats);
    expect(again.flags).toEqual(save.flags);
    expect(again.stepCounter).toBe(save.stepCounter);
    expect(again.feedback.line).toBe('spot.gourd.again');
  });
});

describe('sharing conserves food and allows correction', () => {
  it('requires observation and taking before allocation or offering', () => {
    const save = yard();
    for (const move of ['take', 'move-to-companion', 'offer'] as const) {
      const next = food(save, move);
      expect(puzzleState(next).food.stage).toBe('unseen');
      expect(next.beats['dba.beat.food']).not.toBe(true);
    }
    const inspected = food(save, 'inspect');
    expect(puzzleState(inspected).food.stage).toBe('inspected');
    expect(food(inspected, 'offer').feedback.line).toBe('spot.food.takeFirst');
    expect(puzzleState(food(inspected, 'take')).food).toEqual({ stage: 'taken', self: 4, companion: 0 });
  });
  it('conserves four portions through mistakes, bounds and reversing transfers', () => {
    let save = preparedFood();
    for (let i = 0; i < 6; i++) {
      save = food(save, 'move-to-companion');
      const portions = puzzleState(save).food;
      expect(portions.self + portions.companion).toBe(4);
      expect(portions.self).toBeGreaterThanOrEqual(0);
    }
    expect(puzzleState(save).food.self).toBe(0);
    expect(food(save, 'offer').feedback.line).toBe('spot.food.noSelf');
    save = food(food(save, 'move-to-self'), 'move-to-self');
    expect(puzzleState(save).food).toEqual({ stage: 'allocating', self: 2, companion: 2 });
    expect(food(save, 'offer').feedback.line).toBe('spot.give.no');
    expect(food(save, 'take').flags).toEqual(save.flags);
    expect(food(save, 'inspect').flags).toEqual(save.flags);
  });
  it('finishes only a balanced, understood offering and preserves it after reload and repeated input', () => {
    let save = food(food(preparedFood(), 'move-to-companion'), 'move-to-companion');
    save.words['dba.word.share'].state = save.words['dba.word.give'].state = 'learned';
    save = parseSave(JSON.parse(JSON.stringify(save)))!;
    save = reduce(save, { type: 'give-fish' });
    expect(save.beats['dba.beat.food']).toBe(true);
    expect(puzzleState(save).food).toEqual({ stage: 'done', self: 2, companion: 2 });
    for (const move of ['take', 'move-to-self', 'move-to-companion', 'offer'] as const) {
      const again = food(save, move);
      expect(again.beats).toEqual(save.beats);
      expect(again.flags).toEqual(save.flags);
      expect(again.stepCounter).toBe(save.stepCounter);
    }
  });
});

describe('puzzle context and old saves', () => {
  it('rejects operations from another scene, title, mural or any modal overlay', () => {
    const origin = shore();
    for (const save of [yard(), { ...origin, screen: 'title' as const }, { ...origin, screen: 'mural' as const }, { ...origin, overlay: 'settings' as const }, { ...origin, overlay: 'use-word' as const }]) {
      expect(applyPuzzleAction(save, { type: 'puzzle-act', puzzle: 'water', move: 'take' })).toBe(save);
    }
    expect(applyPuzzleAction(origin, { type: 'puzzle-act', puzzle: 'food', move: 'inspect' })).toBe(origin);
  });
  it('projects old completion beats without erasing progress or requiring new flags', () => {
    const save = { ...shore(), beats: { 'dba.beat.water': true, 'dba.beat.food': true } };
    expect(puzzleState(save)).toEqual({ water: 'done', food: { stage: 'done', self: 2, companion: 2 } });
    expect(water(save, 'drink').stepCounter).toBe(save.stepCounter);
    expect(food({ ...save, currentScene: 'dba.scene.yard' }, 'offer').beats).toEqual(save.beats);
  });
  it('continues the offered cup sheet from a v0.1.2 save without replaying or bypassing drinking', () => {
    const legacy = { ...shore(), overlay: 'use-word' as const };
    legacy.words['dba.word.water'].state = 'learned';
    const restored = parseSave(JSON.parse(JSON.stringify(legacy)))!;
    expect(restored.flags['dba.puzzle.water']).toBeUndefined();
    expect(puzzleState(restored).water).toBe('carried');
    const filled = reduce(restored, { type: 'use-word', wordId: 'dba.word.water' });
    expect(puzzleState(filled).water).toBe('filled');
    expect(filled.overlay).toBe('none');
    expect(filled.beats['dba.beat.water']).not.toBe(true);
    expect(puzzleState(water(filled, 'drink')).water).toBe('done');
    expect(puzzleState({ ...legacy, overlay: 'none' }).water).toBe('empty');
    expect(puzzleState({ ...legacy, currentScene: 'dba.scene.camp' }).water).toBe('empty');
    expect(puzzleState({ ...legacy, screen: 'mural' }).water).toBe('empty');
  });
  it('normalizes malformed partial flags to recoverable stages without inventing completion', () => {
    const save = { ...shore(), flags: { 'dba.puzzle.water': 'done', 'dba.puzzle.food': 'done', 'dba.puzzle.food-self': 99 } };
    expect(puzzleState(save)).toEqual({ water: 'empty', food: { stage: 'unseen', self: 4, companion: 0 } });
    save.flags['dba.puzzle.food'] = 'allocating';
    expect(puzzleState(save).food).toEqual({ stage: 'allocating', self: 4, companion: 0 });
    expect(puzzleState(food({ ...save, currentScene: 'dba.scene.yard' }, 'move-to-companion')).food.self).toBe(3);
  });
  it('moves hints between physical steps and clears the previous target after progress', () => {
    let save = shore(); save.flags['dba.flag.driftwood'] = true;
    save = reduce(save, { type: 'request-hint' });
    expect(hintPresentation(save)).toMatchObject({ anchor: 'water-take', wordId: 'island-gourd', level: 1 });
    save = water(save, 'take');
    expect(save.companion.level).toBe(0);
    save.words['dba.word.water'].state = 'learned';
    expect(hintPresentation(save)).toMatchObject({ anchor: 'water-spring', wordId: 'water-spring' });
    save = water(save, 'fill');
    expect(hintPresentation(save)).toMatchObject({ anchor: 'water-drink', wordId: 'island-gourd' });
    let sharing = preparedFood();
    expect(hintPresentation(sharing)).toMatchObject({ anchor: 'food-companion', wordId: 'act:dba.word.amount:less' });
    sharing = food(food(sharing, 'move-to-companion'), 'move-to-companion');
    expect(hintPresentation(sharing)).toMatchObject({ anchor: 'give', wordId: 'yard-give' });
    sharing = food(sharing, 'move-to-companion');
    expect(hintPresentation(sharing)).toMatchObject({ anchor: 'food-self', wordId: 'act:dba.word.amount:more' });
  });
});
