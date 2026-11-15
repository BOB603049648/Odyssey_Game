import type { SaveData } from './schema';
import { isLearnedState, transitionWord } from './words';

export const BRIDGE = {
  boards: 'dba.puzzle.bridge.boards', rope: 'dba.puzzle.bridge.rope',
  reason: 'dba.puzzle.bridge.reason', intent: 'dba.puzzle.bridge.intent', agreed: 'dba.puzzle.bridge.agreed',
} as const;
export const BRIDGE_WORDS = ['water', 'danger', 'give', 'sleep', 'wait', 'protect'].map(id => `dba.word.${id}`);
export type BridgeAction =
  | { type: 'bridge-act'; move: 'inspect'; clue: 'boards' | 'rope' }
  | { type: 'bridge-act'; move: 'decipher'; wordId: string }
  | { type: 'bridge-act'; move: 'select'; slot: 'reason' | 'intent'; wordId: string | null }
  | { type: 'bridge-act'; move: 'signal' };
export type BridgeState = {
  stage: 'unseen' | 'observing' | 'planning' | 'agreed' | 'done';
  boards: boolean; rope: boolean; reason: string | null; intent: string | null;
};
const known = (save: SaveData, id: string) => isLearnedState(save.words[id]?.state);
const validPlan = (reason: string | null, intent: string | null) => reason === 'dba.word.danger' &&
  (intent === 'dba.word.wait' || intent === 'dba.word.protect');

/** Saved observations and phrase survive leaving, refreshing and old-save imports.
 * A legacy completed danger beat stays complete without granting a new word. */
export function bridgeState(save: SaveData): BridgeState {
  const done = save.beats['dba.beat.danger'] === true;
  const boards = done || save.flags[BRIDGE.boards] === true;
  const rope = done || save.flags[BRIDGE.rope] === true;
  const selection = (slot: 'reason' | 'intent') => {
    const id = save.flags[BRIDGE[slot]];
    return typeof id === 'string' && BRIDGE_WORDS.includes(id) && known(save, id) ? id : null;
  };
  const reason = selection('reason'), intent = selection('intent');
  const agreed = boards && rope && validPlan(reason, intent) && save.flags[BRIDGE.agreed] === true;
  return { boards, rope, reason, intent,
    stage: done ? 'done' : agreed ? 'agreed' : boards && rope ? 'planning' : boards || rope ? 'observing' : 'unseen' };
}

const canAct = (save: SaveData) => save.screen === 'island' && save.currentScene === 'dba.scene.path' && save.overlay === 'none';
function respond(save: SaveData, kind: 'ok' | 'no', line: string, spot = 'path-stop', patch: Partial<SaveData> = {}): SaveData {
  return { ...save, ...patch, feedback: { seq: save.feedback.seq + 1, kind, line, spot } };
}

export function inspectBridgeApproach(save: SaveData, step: boolean): SaveData {
  if (!canAct(save)) return save;
  if (bridgeState(save).stage === 'done') return respond(save, 'ok', 'spot.bridge.done');
  if (bridgeState(save).stage === 'agreed') return respond(save, 'ok', 'spot.bridge.return');
  return respond(save, step ? 'no' : 'ok', step ? 'spot.path.step' : 'spot.bridge.inspect', step ? 'path-step' : 'path-stop');
}

export function applyBridgeAction(save: SaveData, action: BridgeAction): SaveData {
  if (!canAct(save)) return save;
  const bridge = bridgeState(save);
  if (bridge.stage === 'done' || bridge.stage === 'agreed') return save;
  if (action.move === 'inspect') {
    return respond(save, 'ok', `spot.bridge.${action.clue}`, `bridge-${action.clue}`, {
      flags: { ...save.flags, [BRIDGE[action.clue]]: true },
    });
  }
  if (!bridge.boards || !bridge.rope) return respond(save, 'no', 'spot.bridge.observeFirst');
  if (action.move === 'decipher') {
    const id = 'dba.word.wait', word = save.words[id];
    if (!word || known(save, id)) return save;
    if (!known(save, 'dba.word.danger')) return respond(save, 'no', 'spot.bridge.unknown');
    const correct = action.wordId === id;
    return respond(save, correct ? 'ok' : 'no', correct ? 'spot.bridge.read' : 'spot.bridge.misread', 'bridge-lesson', {
      words: { ...save.words, [id]: { ...transitionWord(word, correct ? 'learn' : 'miss'),
        ...(correct ? { lastReviewStep: save.stepCounter + 1 } : {}) } },
      stepCounter: save.stepCounter + 1,
    });
  }
  if (action.move === 'select') {
    if (action.wordId !== null && (!BRIDGE_WORDS.includes(action.wordId) || !known(save, action.wordId))) return save;
    return respond(save, 'ok', 'spot.bridge.compose', 'bridge-select', {
      flags: { ...save.flags, [BRIDGE[action.slot]]: action.wordId ?? '' },
    });
  }
  if (!bridge.reason || !bridge.intent) return respond(save, 'no', 'spot.bridge.incomplete');
  if (bridge.reason !== 'dba.word.danger') return respond(save, 'no', 'spot.bridge.wrongReason');
  if (!validPlan(bridge.reason, bridge.intent)) return respond(save, 'no', 'spot.bridge.wrongIntent');
  return respond(save, 'ok', bridge.intent === 'dba.word.protect' ? 'spot.bridge.protect' : 'spot.bridge.agreed', 'bridge-signal', {
    flags: { ...save.flags, [BRIDGE.agreed]: true },
    companion: { level: 0, targetId: null, pawUsed: false },
  });
}

/** Understanding and signaling do not replace the final physical return. */
export function completeBridgeReturn(save: SaveData, destination: string): SaveData {
  if (!canAct(save) || destination !== 'dba.scene.yard' || bridgeState(save).stage !== 'agreed') return save;
  return respond(save, 'ok', 'spot.bridge.done', 'bridge-return', {
    beats: { ...save.beats, 'dba.beat.danger': true }, stepCounter: save.stepCounter + 1,
    companion: { level: 0, targetId: null, pawUsed: false },
  });
}
