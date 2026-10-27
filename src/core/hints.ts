import { HINT_PLANS, LEXEMES } from '../content/catalog';
import { isLayerUnlocked, requirementsMet } from './conditions';
import { canDepart } from './island';
import type { HintLevel, HintPlanContent, SaveData } from './schema';
import { isLearnedState } from './words';

export type HintAnchor =
  | 'mural-entrance'
  | 'mural-cell'
  | 'mural-object'
  | 'gourd'
  | 'use-word'
  | 'driftwood'
  | 'sleep'
  | 'give'
  | 'path-stop'
  | 'old-layer'
  | 'depart';

export type CompanionPose =
  | 'idle'
  | 'lead'
  | 'wait'
  | 'look-back'
  | 'curl'
  | 'look-at'
  | 'sit-near'
  | 'tail-point'
  | 'paw'
  | 'fetch';

const WATER = 'dba.word.water';
const WATER_BEAT = 'dba.beat.water';

export const HOTSPOT_IDS = [
  'shore-driftwood',
  'shore-depart',
  'camp-sleep',
  'yard-give',
  'path-stop',
  'path-step',
  'night-read',
  'island-mural',
  'island-gourd',
  'hall-mural',
] as const;

export function hintSituation(state: SaveData): HintPlanContent['when'] | null {
  if (state.overlay === 'use-word') return 'use-word';
  if (state.screen === 'mural') return 'mural';
  if (state.currentScene === 'dba.scene.camp' && learned(state, 'dba.word.sleep') && learned(state, 'dba.word.fire') && state.beats['dba.beat.sleep'] !== true) {
    return 'camp-sleep';
  }
  if (state.currentScene === 'dba.scene.yard' && learned(state, 'dba.word.share') && learned(state, 'dba.word.give') && state.beats['dba.beat.food'] !== true) {
    return 'yard-give';
  }
  if (state.currentScene === 'dba.scene.path' && learned(state, 'dba.word.danger') && state.beats['dba.beat.danger'] !== true) {
    return 'path-stop';
  }
  if (
    state.currentScene === 'dba.scene.night' &&
    learned(state, 'dba.word.hunger') &&
    learned(state, 'dba.word.promise') &&
    learned(state, 'dba.word.danger') &&
    state.beats['dba.beat.old-layer'] !== true
  ) {
    return 'night-read';
  }
  if (state.currentScene === 'dba.scene.shore') {
    if (state.flags['dba.flag.driftwood'] !== true && state.beats['dba.beat.depart'] !== true) return 'shore-driftwood';
    if (isLearnedState(state.words[WATER]?.state) && state.beats[WATER_BEAT] !== true) return 'shore-water-ready';
    if (canDepart(state) && state.beats['dba.beat.depart'] !== true) return 'shore-depart';
    if (!isLearnedState(state.words[WATER]?.state)) return 'shore-unlearned-water';
  }
  return null;
}

export function activeHintPlan(state: SaveData): HintPlanContent | null {
  const when = hintSituation(state);
  if (!when) return null;
  return HINT_PLANS.find((plan) => plan.when === when) ?? null;
}

export function hintCap(state: SaveData): HintLevel {
  const plan = activeHintPlan(state);
  if (!plan) return 3;
  if (plan.paw) return 3;
  if (plan.walk) return 2;
  return 1;
}

export function hintTarget(state: SaveData): string | null {
  if (state.overlay === 'use-word') return WATER;
  if (state.screen === 'mural' && state.selectedCellId) {
    const selected = state.words[state.selectedCellId];
    if (selected && !isLearnedState(selected.state)) return state.selectedCellId;
  }
  if (state.screen === 'mural') {
    const next = LEXEMES.find(
      (lexeme) =>
        lexeme.layer === state.activeLayer &&
        isLayerUnlocked(lexeme.layer as SaveData['activeLayer'], state.words, LEXEMES) &&
        requirementsMet(lexeme, state.words) &&
        !isLearnedState(state.words[lexeme.id]?.state),
    );
    return next?.id ?? null;
  }
  const ready =
    isLearnedState(state.words[WATER]?.state) && state.beats[WATER_BEAT] !== true && state.currentScene === 'dba.scene.shore';
  if (ready) return WATER;
  const plan = activeHintPlan(state);
  if (plan?.target.startsWith('dba.word.')) return plan.target;
  return plan?.target ?? null;
}

export function hintAnchor(state: SaveData): HintAnchor {
  if (state.overlay === 'use-word') return 'use-word';
  if (state.screen === 'mural') return state.selectedCellId ? 'mural-object' : 'mural-cell';
  const plan = activeHintPlan(state);
  if (plan) return plan.anchor as HintAnchor;
  if (isLearnedState(state.words[WATER]?.state) && state.beats[WATER_BEAT] !== true) return 'gourd';
  return 'mural-entrance';
}

export function guidePose(state: SaveData): CompanionPose {
  if (state.overlay === 'depart') return 'fetch';
  if (state.overlay === 'memory') return 'wait';
  if (state.feedback.kind === 'no') return 'look-at';
  if (state.companion.level >= 3) return 'paw';
  if (state.companion.level === 2) return 'tail-point';
  if (state.beats['dba.beat.depart'] === true) return 'look-back';
  if (state.currentScene === 'dba.scene.shore' && canDepart(state)) return 'fetch';
  if (state.currentScene === 'dba.scene.night' || state.currentScene === 'dba.scene.camp') return 'curl';
  if (state.currentScene === 'dba.scene.path') return 'wait';
  if (state.currentScene === 'dba.scene.yard') return 'sit-near';
  if (state.currentScene === 'dba.scene.shore' && state.flags['dba.flag.driftwood'] !== true) return 'lead';
  if (state.currentScene === 'dba.scene.shore') return 'wait';
  return 'idle';
}

export function hintPresentation(state: SaveData): {
  level: HintLevel;
  anchor: HintAnchor;
  wordId: string | null;
  pose: CompanionPose;
} {
  return {
    level: state.companion.level,
    anchor: hintAnchor(state),
    wordId: state.companion.level === 0 ? hintTarget(state) : state.companion.targetId,
    pose: guidePose(state),
  };
}

function learned(state: SaveData, id: string): boolean {
  return isLearnedState(state.words[id]?.state);
}
