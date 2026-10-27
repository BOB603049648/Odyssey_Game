import { describe, expect, it } from 'vitest';
import { LEXEMES } from '../content/catalog';
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
  const next = reduce(
    reduce(
      reduce(reduce(state, { type: 'open-mural' }), {
        type: 'select-layer',
        layer: lexeme.layer as MuralLayer,
      }),
      { type: 'select-cell', wordId: id },
    ),
    { type: 'match-object', wordId: id },
  );
  if (next.words[id]?.state !== 'learned' && next.words[id]?.state !== 'mastered') {
    throw new Error(`failed to learn ${id}`);
  }
  return next;
}

function learnLayer(state: SaveData, layer: MuralLayer): SaveData {
  return LEXEMES.filter((item) => item.layer === layer).reduce((next, item) => learn(next, item.id), state);
}

describe('island 1 scenes', () => {
  it('walks the six scenes and keeps the mural return path', () => {
    let state = ashore();
    for (const scene of [
      'myp.scene.camp',
      'myp.scene.fishery',
      'myp.scene.rock',
      'myp.scene.forest',
      'myp.scene.night',
      'myp.scene.shore',
    ]) {
      state = reduce(state, { type: 'goto-scene', scene });
      expect(state.currentScene).toBe(scene);
      expect(state.screen).toBe('island');
    }
    state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.camp' });
    state = reduce(state, { type: 'open-mural' });
    state = reduce(state, { type: 'close-screen' });
    expect(state.screen).toBe('island');
    expect(state.currentScene).toBe('myp.scene.camp');
  });

  it('treats driftwood as a place to sit, not another piece of evidence', () => {
    const state = reduce(ashore(), { type: 'sit-driftwood' });
    expect(state.flags['myp.flag.driftwood']).toBe(true);
    expect(state.evidence).toEqual(['myp.ev.a']);
  });

  it('lets sleep and shared food land only after the matching words', () => {
    let state = reduce(ashore(), { type: 'goto-scene', scene: 'myp.scene.camp' });
    expect(reduce(state, { type: 'sleep-at-camp' }).beats['myp.beat.sleep']).toBeUndefined();
    state = learn(learnLayer(ashore(), 'concrete'), 'myp.word.sleep');
    state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.camp' });
    state = reduce(state, { type: 'sleep-at-camp' });
    expect(state.beats['myp.beat.sleep']).toBe(true);

    state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.fishery' });
    expect(reduce(state, { type: 'give-fish' }).beats['myp.beat.food']).toBeUndefined();
    state = learnLayer(state, 'action');
    state = learnLayer(state, 'relation');
    state = learn(state, 'myp.word.share');
    state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.fishery' });
    state = reduce(state, { type: 'give-fish' });
    expect(state.beats['myp.beat.food']).toBe(true);
  });

  it('opens the forest only when the player stops after learning danger', () => {
    let state = reduce(ashore(), { type: 'goto-scene', scene: 'myp.scene.forest' });
    expect(reduce(state, { type: 'forest-choice', choice: 'stop' }).beats['myp.beat.danger']).toBeUndefined();
    state = learnLayer(learnLayer(ashore(), 'concrete'), 'action');
    state = learn(state, 'myp.word.danger');
    state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.forest' });
    expect(reduce(state, { type: 'forest-choice', choice: 'step' }).beats['myp.beat.danger']).toBeUndefined();
    state = reduce(state, { type: 'forest-choice', choice: 'stop' });
    expect(state.beats['myp.beat.danger']).toBe(true);
  });

  it('collects the tattoo and the numbered stone, then departs east', () => {
    let state = learnLayer(learnLayer(learnLayer(ashore(), 'concrete'), 'action'), 'relation');
    expect(reduce(state, { type: 'collect-tattoo' }).evidence).not.toContain('myp.ev.b');
    state = reduce(state, { type: 'open-mural' });
    state = reduce(state, { type: 'select-layer', layer: 'abstract' });
    expect(state.beats['myp.beat.abstract-open']).toBe(true);
    state = learn(state, 'myp.word.betray');
    state = reduce(state, { type: 'collect-tattoo' });
    expect(state.evidence).toContain('myp.ev.b');
    expect(state.overlay).toBe('casefile');

    state = learn(learn(state, 'myp.word.hunger'), 'myp.word.promise');
    state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.night' });
    expect(reduce(ashore(), { type: 'read-old-layer' }).evidence).not.toContain('myp.ev.main');
    state = reduce(state, { type: 'read-old-layer' });
    expect(state.evidence).toContain('myp.ev.main');
    expect(state.beats['myp.beat.old-layer']).toBe(true);

    state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.shore' });
    expect(reduce(state, { type: 'depart' }).beats['myp.beat.depart']).toBeUndefined();
    state = reduce(state, { type: 'use-word', wordId: 'myp.word.water' });
    state = reduce(state, { type: 'depart' });
    expect(state.beats['myp.beat.depart']).toBe(true);
    expect(state.chart).toContain('chart.nmn');
    expect(state.memories).toEqual(['myp.mem.rain-night']);
    expect(state.evidence).not.toContain('myp.mem.rain-night');
  });

  it('masters a learned word on the review band unless a paw was used', () => {
    let state = learn(ashore(), 'myp.word.water');
    state = reduce(state, { type: 'select-review' });
    expect(state.muralMode).toBe('review');
    const blocked = reduce(
      {
        ...state,
        companion: { level: 3, targetId: 'myp.word.water', pawUsed: true },
      },
      { type: 'review-tap', wordId: 'myp.word.water' },
    );
    expect(blocked.words['myp.word.water']?.state).toBe('learned');
    state = reduce(state, { type: 'review-tap', wordId: 'myp.word.sun' });
    expect(state.words['myp.word.water']?.state).toBe('learned');
    state = reduce(state, { type: 'review-tap', wordId: 'myp.word.water' });
    expect(state.words['myp.word.water']?.state).toBe('mastered');
  });
});
