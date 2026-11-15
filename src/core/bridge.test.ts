import { describe, expect, it } from 'vitest';
import { BRIDGE, applyBridgeAction, bridgeState } from './bridge';
import { reduce } from './reduce';
import { newGameState } from './save';
import { saveDataSchema } from './schema';
import { agreeAtBridge } from './__fixtures__/bridgeJourney';
import { companionPost } from './companionPost';
import { expeditionGoal } from './expedition';
import { hintTarget } from './hints';
import { isLayerUnlocked } from './conditions';
import { LEXEMES } from '../content/catalog';
import { gameCues } from '../audio/gameCues';

function path() {
  const save = reduce(reduce(reduce(newGameState(), { type: 'new-game' }), { type: 'skip-prologue' }), { type: 'goto-scene', scene: 'dba.scene.path' });
  for (const id of ['danger', 'water', 'sleep', 'give']) save.words[`dba.word.${id}`].state = 'learned';
  return save;
}
const inspect = () => ['boards', 'rope'].reduce((save, clue) => reduce(save, { type: 'bridge-act', move: 'inspect', clue: clue as 'boards' | 'rope' }), path());

describe('reasoning at the old bridge', () => {
  it('does not grant survival for stopping, stepping, observing only one clue or simply leaving', () => {
    for (const choice of ['stop', 'step'] as const) expect(reduce(path(), { type: 'forest-choice', choice }).beats['dba.beat.danger']).toBeUndefined();
    const first = reduce(path(), { type: 'bridge-act', move: 'inspect', clue: 'boards' });
    const premature = reduce(first, { type: 'bridge-act', move: 'decipher', wordId: 'dba.word.wait' });
    expect(premature.words['dba.word.wait'].state).toBe('unseen');
    expect(premature.feedback.line).toBe('spot.bridge.observeFirst');
    expect(reduce(first, { type: 'goto-scene', scene: 'dba.scene.yard' }).beats['dba.beat.danger']).toBeUndefined();
  });
  it('keeps observations and editable choices through save validation and a round trip', () => {
    let save = reduce(inspect(), { type: 'bridge-act', move: 'select', slot: 'reason', wordId: 'dba.word.water' });
    save = reduce(save, { type: 'goto-scene', scene: 'dba.scene.yard' });
    save = saveDataSchema.parse(JSON.parse(JSON.stringify(save)));
    save = reduce(save, { type: 'goto-scene', scene: 'dba.scene.path' });
    expect(bridgeState(save)).toMatchObject({ stage: 'planning', boards: true, rope: true, reason: 'dba.word.water' });
    save = reduce(save, { type: 'bridge-act', move: 'select', slot: 'reason', wordId: null });
    expect(bridgeState(save).reason).toBeNull();
  });
  it.each(['title', 'mural', 'other-scene', 'menu'] as const)('rejects operations in %s', mode => {
    const save = inspect();
    if (mode === 'title' || mode === 'mural') save.screen = mode;
    if (mode === 'other-scene') save.currentScene = 'dba.scene.yard';
    if (mode === 'menu') save.overlay = 'lexicon';
    for (const action of [{ type: 'bridge-act', move: 'inspect', clue: 'rope' }, { type: 'bridge-act', move: 'decipher', wordId: 'dba.word.wait' },
      { type: 'bridge-act', move: 'select', slot: 'reason', wordId: 'dba.word.danger' }, { type: 'bridge-act', move: 'signal' }] as const) {
      expect(applyBridgeAction(save, action)).toBe(save);
    }
  });
  it('teaches waiting from its local context, records a mistaken reading, and leaves the whole abstract band locked', () => {
    const before = inspect();
    const wrong = reduce(before, { type: 'bridge-act', move: 'decipher', wordId: 'dba.word.sleep' });
    expect(wrong.words['dba.word.wait']).toMatchObject({ state: 'guessed', wrong: 1, correct: 0 });
    expect(wrong.words['dba.word.sleep']).toEqual(before.words['dba.word.sleep']);
    const learned = reduce(wrong, { type: 'bridge-act', move: 'decipher', wordId: 'dba.word.wait' });
    expect(learned.words['dba.word.wait']).toMatchObject({ state: 'learned', wrong: 1, correct: 1, lastReviewStep: learned.stepCounter });
    expect(learned.beats['dba.beat.danger']).toBeUndefined();
    expect(isLayerUnlocked('abstract', learned.words, LEXEMES)).toBe(false);
    expect(reduce(learned, { type: 'bridge-act', move: 'decipher', wordId: 'dba.word.wait' }).words).toBe(learned.words);
    before.words['dba.word.danger'].state = 'unseen';
    expect(reduce(before, { type: 'bridge-act', move: 'decipher', wordId: 'dba.word.wait' }).words['dba.word.wait'].state).toBe('unseen');
  });
  it('explains wrong reasons and intentions without consuming items or secretly completing the plan', () => {
    let save = inspect(); const inventory = save.inventory;
    save = reduce(save, { type: 'bridge-act', move: 'select', slot: 'intent', wordId: 'dba.word.give' });
    expect(reduce(save, { type: 'bridge-act', move: 'signal' }).feedback.line).toBe('spot.bridge.incomplete');
    save = reduce(save, { type: 'bridge-act', move: 'select', slot: 'reason', wordId: 'dba.word.water' });
    expect(reduce(save, { type: 'bridge-act', move: 'signal' }).feedback.line).toBe('spot.bridge.wrongReason');
    save = reduce(save, { type: 'bridge-act', move: 'select', slot: 'reason', wordId: 'dba.word.danger' });
    expect(reduce(save, { type: 'bridge-act', move: 'signal' }).feedback.line).toBe('spot.bridge.wrongIntent');
    expect(save.inventory).toBe(inventory); expect(save.beats['dba.beat.danger']).toBeUndefined();
    expect(bridgeState(reduce(save, { type: 'bridge-act', move: 'select', slot: 'intent', wordId: 'dba.word.protect' })).intent).toBe('dba.word.give');
  });
  it('moves the guide toward the return gate, and completes only when both return to the yard', () => {
    const initial = path(), agreed = agreeAtBridge(initial);
    expect(bridgeState(agreed).stage).toBe('agreed'); expect(agreed.beats['dba.beat.danger']).toBeUndefined();
    const post = companionPost('dba.scene.path', agreed.beats, agreed.flags);
    expect(post).toMatchObject({ beat: 'P1', targetId: 'path-west' });
    expect(post.x).toBeLessThan(companionPost('dba.scene.path', initial.beats, initial.flags).x);
    expect(expeditionGoal(agreed)).toMatchObject({ destination: 'dba.scene.yard', spot: 'path-west' });
    expect(hintTarget(agreed)).toBeNull();
    expect(reduce(agreed, { type: 'goto-scene', scene: 'dba.scene.shore' }).beats['dba.beat.danger']).toBeUndefined();
    const done = reduce(agreed, { type: 'goto-scene', scene: 'dba.scene.yard' });
    expect(done.beats['dba.beat.danger']).toBe(true); expect(done.feedback.line).toBe('spot.bridge.done');
    const repeat = reduce(reduce(done, { type: 'goto-scene', scene: 'dba.scene.path' }), { type: 'goto-scene', scene: 'dba.scene.yard' });
    expect(repeat.stepCounter).toBe(done.stepCounter);
  });
  it('also accepts an understood protective intention, without forcing the waiting lesson', () => {
    const save = path(); save.words['dba.word.protect'].state = 'mastered';
    const agreed = agreeAtBridge(save, 'dba.word.protect');
    expect(bridgeState(agreed).stage).toBe('agreed'); expect(agreed.feedback.line).toBe('spot.bridge.protect');
    expect(agreed.words['dba.word.wait'].state).toBe('unseen');
  });
  it('keeps legacy completion and repairs malformed partial state without granting knowledge', () => {
    const old = path(); old.beats['dba.beat.danger'] = true;
    expect(bridgeState(old).stage).toBe('done');
    expect(reduce(old, { type: 'forest-choice', choice: 'stop' }).words).toBe(old.words);
    const corrupt = path(); corrupt.flags = { [BRIDGE.boards]: 'yes', [BRIDGE.rope]: 1, [BRIDGE.agreed]: true, [BRIDGE.reason]: 'unknown', [BRIDGE.intent]: 'dba.word.wait' };
    expect(bridgeState(corrupt)).toEqual({ stage: 'unseen', boards: false, rope: false, reason: null, intent: null });
    expect(reduce(corrupt, { type: 'goto-scene', scene: 'dba.scene.yard' }).beats['dba.beat.danger']).toBeUndefined();
  });
  it('uses creaking, learning, acknowledgement and completion sounds for their actual events only', () => {
    const start = path(), seen = reduce(start, { type: 'bridge-act', move: 'inspect', clue: 'boards' });
    expect(gameCues(start, seen).map(c => c.id)).toEqual(['wood-creak']);
    const observed = inspect(), learned = reduce(observed, { type: 'bridge-act', move: 'decipher', wordId: 'dba.word.wait' });
    expect(gameCues(observed, learned).map(c => c.id)).toEqual(['word-learn']);
    const agreed = agreeAtBridge(learned);
    expect(gameCues(learned, agreed).map(c => c.id)).toEqual(['cat-call']);
    expect(gameCues(agreed, agreed)).toEqual([]);
    expect(gameCues(agreed, reduce(agreed, { type: 'goto-scene', scene: 'dba.scene.yard' })).map(c => c.id)).toEqual(['milestone']);
  });
});
