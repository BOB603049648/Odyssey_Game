import { describe, expect, it } from 'vitest';
import { LEXEMES } from '../content/catalog';
import { createMemoryStorage } from '../platform/storage';
import { hintCap, hintPresentation, hintSituation } from './hints';
import { reduce } from './reduce';
import { newGameState } from './save';
import type { MuralLayer, SaveData } from './schema';
import { isLearnedState } from './words';

const FULL_CASE = [
  'myp.ev.a',
  'myp.ev.b',
  'myp.ev.main',
  'nmn.ev.a',
  'nmn.ev.b',
  'nmn.ev.main',
  'amh.ev.a',
  'amh.ev.b',
  'amh.ev.main',
  'iku.ev.a',
  'iku.ev.main',
  'eus.ev.main',
];

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

function escalate(state: SaveData): SaveData {
  let next = state;
  for (let step = 0; step < 3; step += 1) next = reduce(next, { type: 'request-hint' });
  return next;
}

function clearIsland(): SaveData {
  let state = reduce(ashore(), { type: 'shore-stone' });
  state = reduce(state, { type: 'close-overlay' });
  state = learnLayer(state, 'concrete');
  state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.shore' });
  state = reduce(state, { type: 'poke-gourd' });
  state = reduce(state, { type: 'use-word', wordId: 'myp.word.water' });
  state = learnLayer(state, 'action');
  state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.camp' });
  state = reduce(state, { type: 'sleep-at-camp' });
  state = learnLayer(state, 'relation');
  state = learn(learn(learn(state, 'myp.word.share'), 'myp.word.hunger'), 'myp.word.promise');
  state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.fishery' });
  state = reduce(state, { type: 'grab-fish' });
  state = reduce(state, { type: 'give-fish' });
  state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.forest' });
  state = reduce(state, { type: 'forest-choice', choice: 'stop' });
  state = reduce(state, { type: 'goto-scene', scene: 'myp.scene.shore' });
  return reduce(state, { type: 'depart' });
}

describe('island 1 clear path', () => {
  it('drinks, sleeps, shares food, stores at least ten words, and still leaves without the skippable evidence', () => {
    const state = clearIsland();
    expect(state.beats['myp.beat.water']).toBe(true);
    expect(state.beats['myp.beat.sleep']).toBe(true);
    expect(state.beats['myp.beat.food']).toBe(true);
    expect(state.beats['myp.beat.danger']).toBe(true);
    expect(state.beats['myp.beat.depart']).toBe(true);
    expect(state.flags['myp.flag.wrong-share']).toBe(true);
    expect(state.chart).toEqual(['chart.nmn']);
    expect(state.evidence).toEqual(['myp.ev.a']);
    expect(state.evidence).not.toContain('myp.ev.b');
    expect(state.evidence).not.toContain('myp.ev.main');
    const learned = LEXEMES.filter((lexeme) => isLearnedState(state.words[lexeme.id]?.state));
    expect(learned.length).toBeGreaterThanOrEqual(10);

    const storage = createMemoryStorage();
    storage.save(state);
    const loaded = storage.load();
    expect(loaded?.beats['myp.beat.depart']).toBe(true);
    expect(loaded?.words['myp.word.water']?.state).toBe('learned');
    expect(loaded?.chart).toEqual(['chart.nmn']);
    expect(loaded?.evidence).toEqual(['myp.ev.a']);
  });

  it('points look, walk, and paw at a stuck beat instead of the skipped driftwood', () => {
    let water = learn(ashore(), 'myp.word.water');
    water = reduce(water, { type: 'close-screen' });
    expect(water.flags['myp.flag.driftwood']).toBeUndefined();
    expect(hintSituation(water)).toBe('shore-water-ready');
    water = escalate(water);
    expect(water.companion.level).toBe(3);
    expect(water.companion.pawUsed).toBe(true);
    expect(hintPresentation(water).anchor).toBe('gourd');
    expect(hintPresentation(water).pose).toBe('paw');
    expect(water.hintStats['myp.word.water']).toEqual({ look: 1, walk: 1, paw: 1 });

    let forest = learnLayer(learnLayer(ashore(), 'concrete'), 'action');
    forest = learn(forest, 'myp.word.danger');
    forest = reduce(forest, { type: 'goto-scene', scene: 'myp.scene.forest' });
    expect(hintCap(forest)).toBe(3);
    forest = escalate(forest);
    expect(forest.companion.level).toBe(3);
    expect(hintPresentation(forest).anchor).toBe('forest-stop');
    expect(hintPresentation(forest).pose).toBe('paw');

    let night = learnLayer(learnLayer(learnLayer(ashore(), 'concrete'), 'action'), 'relation');
    night = learn(learn(night, 'myp.word.hunger'), 'myp.word.promise');
    night = reduce(night, { type: 'goto-scene', scene: 'myp.scene.night' });
    expect(hintCap(night)).toBe(3);
    night = escalate(night);
    expect(hintPresentation(night).anchor).toBe('old-layer');
    expect(night.companion.pawUsed).toBe(true);

    let east = clearIsland();
    east = reduce(east, { type: 'advance-cutscene' });
    east = reduce(east, { type: 'advance-cutscene' });
    east = reduce(east, { type: 'advance-cutscene' });
    east = reduce(east, { type: 'advance-cutscene' });
    expect(east.overlay).toBe('none');
    east = {
      ...east,
      beats: { ...east.beats, 'myp.beat.depart': false },
      overlay: 'none',
    };
    expect(hintSituation(east)).toBe('shore-depart');
    expect(hintCap(east)).toBe(3);
    east = escalate(east);
    expect(hintPresentation(east).anchor).toBe('depart');
    expect(east.companion.level).toBe(3);
  });

  it('resolves A when evidence is thin, and B or C only when the case is full', () => {
    const left = clearIsland();
    expect(reduce(ashore(), { type: 'open-finale' }).overlay).toBe('none');
    const open = reduce(left, { type: 'open-finale' });
    expect(open.overlay).toBe('finale');

    const denied = reduce(open, { type: 'choose-ending', choice: 'deny' });
    expect(denied.flags['fin.flag.ending']).toBe('false-home');
    expect(denied.flags['fin.flag.name-recalled']).toBeUndefined();
    expect(denied.beats['myp.beat.depart']).toBe(true);

    const stayedThin = reduce(open, { type: 'choose-ending', choice: 'stay' });
    expect(stayedThin.flags['fin.flag.ending']).toBe('false-home');
    expect(stayedThin.flags['fin.flag.admit']).toBe(false);
    expect(stayedThin.flags['fin.flag.name-recalled']).toBeUndefined();

    const full = { ...open, evidence: FULL_CASE };
    const stayed = reduce(full, { type: 'choose-ending', choice: 'stay' });
    expect(stayed.flags['fin.flag.ending']).toBe('new-interpreter');
    expect(stayed.flags['fin.flag.name-recalled']).toBe(true);
    expect(stayed.flags['fin.flag.recognition-lost']).toBeUndefined();

    const restarted = reduce(full, { type: 'choose-ending', choice: 'restart' });
    expect(restarted.flags['fin.flag.ending']).toBe('restart-echo');
    expect(restarted.flags['fin.flag.name-recalled']).toBe(true);
    expect(restarted.flags['fin.flag.recognition-lost']).toBe(true);
    expect(restarted.words['myp.word.water']?.state).toBe('learned');
  });
});
