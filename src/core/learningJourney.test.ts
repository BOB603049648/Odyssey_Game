import { returnFromBridge } from './__fixtures__/bridgeJourney';
import { describe, expect, it } from 'vitest';
import { LEXEMES } from '../content/catalog';
import { isLayerUnlocked, requirementsMet } from './conditions';
import { learningJourney } from './learningJourney';
import { reduce } from './reduce';
import { newGameState } from './save';
import type { MuralLayer, SaveData } from './schema';

function followClues(initial: SaveData) {
  let save = initial;
  const learned: string[] = [];
  for (let n = 0; n < LEXEMES.length; n++) {
    const lesson = learningJourney(save);
    if (lesson?.kind !== 'learn') return { save, learned, lesson };
    const word = lesson.focus;
    expect(isLayerUnlocked(word.layer as MuralLayer, save.words, LEXEMES)).toBe(true);
    expect(requirementsMet(word, save.words)).toBe(true);
    expect(learned).not.toContain(word.id);
    save = reduce(save, { type: 'select-layer', layer: word.layer as MuralLayer });
    save = reduce(save, { type: 'select-cell', wordId: word.id });
    expect(save.selectedCellId).toBe(word.id);
    save = reduce(save, { type: 'match-object', wordId: word.id });
    expect(save.words[word.id].state).toBe('learned');
    learned.push(word.id);
  }
  throw new Error('Learning suggestions did not return to a physical task');
}

describe('learning in the context of exploration', () => {
  it('suggests taking the cup before a lesson, then returns after just the water clue', () => {
    const save = newGameState();
    expect(learningJourney(save)).toMatchObject({ kind: 'explore', goal: { spot: 'island-gourd' } });
    save.flags['dba.puzzle.water'] = 'carried';
    expect(learningJourney(save)).toMatchObject({ kind: 'learn', focus: { id: 'dba.word.water' }, prerequisite: false });
    const result = followClues(save);
    expect(result.learned).toEqual(['dba.word.water']);
    expect(result.lesson).toMatchObject({ kind: 'explore', goal: { spot: 'water-spring' } });
    expect(result.save.words['dba.word.sun'].state).not.toBe('learned');
  });

  it('follows existing band gates, alternates physical tasks, and leaves optional words optional', () => {
    let save = newGameState();
    save.flags['dba.puzzle.water'] = 'carried';
    save = followClues(save).save;
    save.beats['dba.beat.water'] = true;
    const rest = followClues(save);
    expect(rest.learned[0]).toBe('dba.word.fire');
    expect(rest.learned.at(-1)).toBe('dba.word.sleep');
    expect(rest.lesson).toMatchObject({ kind: 'explore', goal: { spot: 'camp-sleep' } });
    save = rest.save; save.beats['dba.beat.sleep'] = true;
    expect(learningJourney(save)).toMatchObject({ kind: 'explore', goal: { spot: 'yard-grab' } });
    save.flags['dba.puzzle.food'] = 'allocating'; save.flags['dba.puzzle.food-self'] = 2;
    const food = followClues(save);
    expect(food.learned.at(-1)).toBe('dba.word.share');
    expect(food.lesson).toMatchObject({ kind: 'explore', goal: { spot: 'yard-give' } });
    save = food.save; save.beats['dba.beat.food'] = true;
    expect(learningJourney(save)).toMatchObject({ kind: 'explore', goal: { spot: 'path-stop' } });
    save.screen = 'island'; save.currentScene = 'dba.scene.path';
    save = returnFromBridge(save);
    expect(save.beats['dba.beat.danger']).toBe(true);
    const depart = followClues(save);
    expect(depart.learned).toEqual(['dba.word.hunger', 'dba.word.promise']);
    expect(depart.lesson).toMatchObject({ kind: 'explore', goal: { spot: 'shore-depart' } });
    expect(Object.values(depart.save.words).filter(word => word.state === 'learned')).toHaveLength(19);
    expect(depart.save.words['dba.word.betray'].state).not.toBe('learned');
  });

  it('respects a completed legacy journey and does not manufacture new study requirements', () => {
    const save = newGameState(); save.beats['dba.beat.depart'] = true;
    expect(learningJourney(save)).toMatchObject({ kind: 'explore', goal: { spot: 'night-memory' } });
  });
});
