import { describe, expect, it } from 'vitest';
import { LEXEMES } from '../content/catalog';
import { reduce } from './reduce';
import { newGameState } from './save';
import type { MuralLayer, SaveData } from './schema';
import { GATES } from './stage';

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
      'dba.scene.camp',
      'dba.scene.yard',
      'dba.scene.hall',
      'dba.scene.path',
      'dba.scene.night',
      'dba.scene.shore',
    ]) {
      state = reduce(state, { type: 'goto-scene', scene });
      expect(state.currentScene).toBe(scene);
      expect(state.screen).toBe('island');
    }
    state = reduce(state, { type: 'goto-scene', scene: 'dba.scene.camp' });
    state = reduce(state, { type: 'open-mural' });
    state = reduce(state, { type: 'close-screen' });
    expect(state.screen).toBe('island');
    expect(state.currentScene).toBe('dba.scene.camp');
  });

  it('treats driftwood as a place to sit, not another piece of evidence', () => {
    const before = ashore();
    const state = reduce(before, { type: 'sit-driftwood' });
    expect(state.flags['dba.flag.driftwood']).toBe(true);
    expect(state.evidence).toEqual(['dba.ev.a']);
    expect(state.feedback.line).toBe('spot.driftwood.ok');
    expect(state.words).toEqual(before.words);
    const again = reduce(state, { type: 'sit-driftwood' });
    expect(again.feedback.line).toBe('spot.driftwood.again');
    const far = reduce(before, { type: 'spot-far', id: 'shore-driftwood' });
    expect(far.feedback.line).toBe('spot.driftwood.far');
    expect(far.flags['dba.flag.driftwood']).toBeUndefined();
    expect(far.flags['dba.flag.taught-approach']).toBeUndefined();
  });

  it('lets sleep and shared food land only after the matching words', () => {
    let state = reduce(ashore(), { type: 'goto-scene', scene: 'dba.scene.camp' });
    const denied = reduce(state, { type: 'sleep-at-camp' });
    expect(denied.beats['dba.beat.sleep']).toBeUndefined();
    expect(denied.feedback.line).toBe('spot.sleep.no');
    expect(denied.flags['dba.flag.taught-approach']).toBeUndefined();
    state = learn(learnLayer(ashore(), 'concrete'), 'dba.word.sleep');
    state = reduce(state, { type: 'goto-scene', scene: 'dba.scene.camp' });
    state = reduce(state, { type: 'sleep-at-camp' });
    expect(state.beats['dba.beat.sleep']).toBe(true);
    expect(state.feedback.line).toBe('spot.sleep.ok');
    expect(state.flags['dba.flag.taught-approach']).toBeUndefined();

    state = reduce(state, { type: 'goto-scene', scene: 'dba.scene.yard' });
    const refused = reduce(state, { type: 'give-fish' });
    expect(refused.beats['dba.beat.food']).toBeUndefined();
    expect(refused.feedback.line).toBe('spot.give.no');
    state = learnLayer(state, 'action');
    state = learnLayer(state, 'relation');
    state = learn(state, 'dba.word.share');
    state = reduce(state, { type: 'goto-scene', scene: 'dba.scene.yard' });
    state = reduce(state, { type: 'give-fish' });
    expect(state.beats['dba.beat.food']).toBe(true);
    expect(state.feedback.line).toBe('spot.give.ok');
    const wrong = reduce(state, { type: 'grab-fish' });
    expect(wrong.feedback.line).toBe('spot.give.wrong');
    expect(wrong.flags['dba.flag.wrong-share']).toBe(true);
    expect(wrong.beats['dba.beat.food']).toBe(true);
    expect(reduce(state, { type: 'spot-far', id: 'yard-give' }).feedback.line).toBe('spot.give.far');
    const grabFar = reduce(state, { type: 'spot-far', id: 'yard-grab' });
    expect(grabFar.feedback.line).toBe('spot.grab.far');
    expect(grabFar.feedback.kind).toBe('no');
    expect(grabFar.flags['dba.flag.wrong-share']).toBeUndefined();
  });

  it('clears a leftover sleep line when the scene changes', () => {
    let state = reduce(ashore(), { type: 'goto-scene', scene: 'dba.scene.camp' });
    state = reduce(state, { type: 'spot-far', id: 'camp-sleep' });
    expect(state.feedback.line).toBe('spot.sleep.far');
    expect(reduce(state, { type: 'goto-scene', scene: 'dba.scene.camp' }).feedback.line).toBe('spot.sleep.far');
    state = reduce(state, { type: 'goto-scene', scene: 'dba.scene.shore' });
    expect(state.currentScene).toBe('dba.scene.shore');
    expect(state.feedback.kind).toBe('none');
    expect(state.feedback.line).toBeUndefined();
    expect(state.feedback.spot).toBeUndefined();
  });

  it('answers every shore, camp, and yard reach with a line', () => {
    const shore = ashore();
    for (const [id, line] of [
      ['shore-stone', 'spot.stone.far'],
      ['island-gourd', 'spot.gourd.far'],
      ['island-mural', 'spot.mural.far'],
      ['shore-depart', 'spot.depart.far'],
      ['act:dba.word.eat', 'spot.act.far'],
    ] as const) {
      const far = reduce(shore, { type: 'spot-far', id });
      expect(far.feedback).toMatchObject({ kind: 'no', line, spot: id });
      expect(far.flags['dba.flag.taught-approach']).toBeUndefined();
      expect(far.feedback.seq).toBe(shore.feedback.seq + 1);
    }
    const empty = reduce(shore, { type: 'poke-gourd' });
    expect(empty.feedback.line).toBe('spot.gourd.no');
    expect(empty.beats['dba.beat.water']).toBeUndefined();
    const held = reduce(shore, { type: 'depart' });
    expect(held.feedback.line).toBe('spot.depart.no');
    expect(held.beats['dba.beat.depart']).toBeUndefined();

    const camp = reduce(shore, { type: 'goto-scene', scene: 'dba.scene.camp' });
    const missed = reduce(camp, { type: 'scene-act', wordId: 'dba.word.eat' });
    expect(missed.feedback.line).toBe('spot.act.no');
    expect(missed.beats['dba.beat.eat']).toBeUndefined();
  });

  it('opens the forest only when the player stops after learning danger', () => {
    let state = reduce(ashore(), { type: 'goto-scene', scene: 'dba.scene.path' });
    expect(reduce(state, { type: 'forest-choice', choice: 'stop' }).beats['dba.beat.danger']).toBeUndefined();
    state = learnLayer(learnLayer(ashore(), 'concrete'), 'action');
    state = learn(state, 'dba.word.danger');
    state = reduce(state, { type: 'goto-scene', scene: 'dba.scene.path' });
    expect(reduce(state, { type: 'forest-choice', choice: 'step' }).beats['dba.beat.danger']).toBeUndefined();
    state = reduce(state, { type: 'forest-choice', choice: 'stop' });
    expect(state.beats['dba.beat.danger']).toBe(true);
  });

  it('collects the tattoo and the numbered stone, then departs east', () => {
    let state = learnLayer(learnLayer(learnLayer(ashore(), 'concrete'), 'action'), 'relation');
    expect(reduce(state, { type: 'collect-tattoo' }).evidence).not.toContain('dba.ev.b');
    state = reduce(state, { type: 'open-mural' });
    state = reduce(state, { type: 'select-layer', layer: 'abstract' });
    expect(state.beats['dba.beat.abstract-open']).toBe(true);
    state = learn(state, 'dba.word.betray');
    state = reduce(state, { type: 'collect-tattoo' });
    expect(state.evidence).toContain('dba.ev.b');
    expect(state.overlay).toBe('casefile');

    state = learn(learn(state, 'dba.word.hunger'), 'dba.word.promise');
    state = reduce(state, { type: 'goto-scene', scene: 'dba.scene.night' });
    expect(reduce(ashore(), { type: 'read-old-layer' }).evidence).not.toContain('dba.ev.main');
    const early = reduce(reduce(ashore(), { type: 'goto-scene', scene: 'dba.scene.night' }), { type: 'read-old-layer' });
    expect(early.screen).toBe('mural');
    expect(early.currentScene).toBe('dba.scene.night');
    expect(early.evidence).not.toContain('dba.ev.main');
    state = reduce(state, { type: 'read-old-layer' });
    expect(state.evidence).toContain('dba.ev.main');
    expect(state.overlay).toBe('casefile');
    expect(state.beats['dba.beat.old-layer']).toBe(true);

    state = reduce(state, { type: 'goto-scene', scene: 'dba.scene.shore' });
    expect(reduce(state, { type: 'depart' }).beats['dba.beat.depart']).toBeUndefined();
    state = reduce(state, { type: 'use-word', wordId: 'dba.word.water' });
    state = reduce(state, { type: 'depart' });
    expect(state.beats['dba.beat.depart']).toBe(true);
    expect(state.chart).toContain('chart.jgw');
    expect(state.memories).toEqual(['dba.mem.rain-night']);
    expect(state.evidence).not.toContain('dba.mem.rain-night');
  });

  it('keeps the north night gate open before anyone sleeps', () => {
    // camp：火旁过夜铺可读 + 北缝始终可进 night。读旧层另锁词，北门不加 sleep 锁。
    const gate = GATES.find((item) => item.from === 'dba.scene.camp' && item.to === 'dba.scene.night');
    expect(gate?.edge).toBe('north');
    expect(gate && 'condition' in gate).toBe(false);
    const state = reduce(ashore(), { type: 'goto-scene', scene: 'dba.scene.night' });
    expect(state.beats['dba.beat.sleep']).not.toBe(true);
    expect(state.currentScene).toBe('dba.scene.night');
    expect(state.screen).toBe('island');
  });

  it('masters a learned word on the review band unless a paw was used', () => {
    let state = learn(ashore(), 'dba.word.water');
    state = reduce(state, { type: 'select-review' });
    expect(state.muralMode).toBe('review');
    const blocked = reduce(
      {
        ...state,
        companion: { level: 3, targetId: 'dba.word.water', pawUsed: true },
      },
      { type: 'review-tap', wordId: 'dba.word.water' },
    );
    expect(blocked.words['dba.word.water']?.state).toBe('learned');
    state = reduce(state, { type: 'review-tap', wordId: 'dba.word.sun' });
    expect(state.words['dba.word.water']?.state).toBe('learned');
    state = reduce(state, { type: 'review-tap', wordId: 'dba.word.water' });
    expect(state.words['dba.word.water']?.state).toBe('mastered');
  });
});
