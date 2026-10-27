import { describe, expect, it } from 'vitest';
import { LEXEMES } from '../content/catalog';
import { guidePose, hintCap } from './hints';
import { reduce } from './reduce';
import { newGameState } from './save';
import type { MuralLayer, SaveData } from './schema';

function ashore(): SaveData {
  let state = reduce(newGameState(), { type: 'new-game' });
  for (let step = 0; step < 4; step += 1) state = reduce(state, { type: 'advance-prologue' });
  return state;
}

function learn(state: SaveData, id: string): SaveData {
  const lexeme = LEXEMES.find((item) => item.id === id);
  if (!lexeme) throw new Error(id);
  return reduce(
    reduce(
      reduce(reduce(state, { type: 'open-mural' }), {
        type: 'select-layer',
        layer: lexeme.layer as MuralLayer,
      }),
      { type: 'select-cell', wordId: id },
    ),
    { type: 'match-object', wordId: id },
  );
}

function learnLayer(state: SaveData, layer: MuralLayer): SaveData {
  return LEXEMES.filter((item) => item.layer === layer).reduce((next, item) => learn(next, item.id), state);
}

function readyToLeave(state = ashore()): SaveData {
  let next = learnLayer(learnLayer(learnLayer(state, 'concrete'), 'action'), 'relation');
  next = learn(learn(next, 'myp.word.hunger'), 'myp.word.promise');
  next = reduce(next, { type: 'goto-scene', scene: 'myp.scene.shore' });
  return reduce(next, { type: 'use-word', wordId: 'myp.word.water' });
}

describe('island 1 reachability', () => {
  it('still leaves when the skippable evidence was never picked up', () => {
    const state = reduce(readyToLeave(), { type: 'depart' });
    expect(state.beats['myp.beat.depart']).toBe(true);
    expect(state.evidence).toEqual(['myp.ev.a']);
    expect(state.memories).toEqual(['myp.mem.rain-night']);
    expect(state.chart).toEqual(['chart.nmn']);
    expect(state.overlay).toBe('depart');
    expect(guidePose(state)).toBe('fetch');
  });

  it('can still collect every island 1 evidence before leaving', () => {
    let state = readyToLeave();
    state = learn(state, 'myp.word.betray');
    state = reduce(state, { type: 'collect-tattoo' });
    state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.night' });
    state = reduce(state, { type: 'read-old-layer' });
    state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.shore' });
    state = reduce(state, { type: 'depart' });
    expect(state.evidence).toEqual(['myp.ev.a', 'myp.ev.b', 'myp.ev.main']);
    expect(state.beats['myp.beat.depart']).toBe(true);
  });

  it('plays the silent memory and opens it again from the night, the case, and the map', () => {
    let state = reduce(readyToLeave(), { type: 'depart' });
    expect(reduce(ashore(), { type: 'open-memory' }).overlay).toBe('none');
    state = reduce(state, { type: 'advance-cutscene' });
    expect(state.overlay).toBe('memory');
    expect(state.cutsceneStep).toBe(0);
    state = reduce(state, { type: 'advance-cutscene' });
    expect(state.cutsceneStep).toBe(1);
    state = reduce(state, { type: 'advance-cutscene' });
    expect(state.cutsceneStep).toBe(2);
    state = reduce(state, { type: 'advance-cutscene' });
    expect(state.overlay).toBe('none');
    expect(state.evidence).toEqual(['myp.ev.a']);

    state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.night' });
    state = reduce(state, { type: 'open-memory' });
    expect(state.overlay).toBe('memory');
    state = reduce(state, { type: 'open-overlay', overlay: 'casefile' });
    state = reduce(state, { type: 'open-memory' });
    expect(state.overlay).toBe('memory');
    expect(guidePose(state)).toBe('wait');
  });
});

describe('guide hints', () => {
  it('leads to the driftwood before it will point at the mural, and a miss only turns her head', () => {
    const shore = ashore();
    expect(guidePose(shore)).toBe('lead');
    expect(hintCap(shore)).toBe(2);
    const capped = [1, 2, 3].reduce((next) => reduce(next, { type: 'request-hint' }), shore);
    expect(capped.companion.level).toBe(2);
    expect(capped.companion.pawUsed).toBe(false);

    let missed = reduce(shore, { type: 'open-mural' });
    missed = reduce(missed, { type: 'select-cell', wordId: 'myp.word.water' });
    missed = reduce(missed, { type: 'match-object', wordId: 'myp.word.fish' });
    expect(missed.companion.level).toBe(0);
    expect(guidePose(missed)).toBe('look-at');
  });
});
