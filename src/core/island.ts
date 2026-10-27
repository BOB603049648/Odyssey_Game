import { LEXEMES } from '../content/catalog';
import type { SaveData } from './schema';
import { isLearnedState, reviewForMastery } from './words';

export const ISLAND_SCENES = [
  'myp.scene.shore',
  'myp.scene.camp',
  'myp.scene.fishery',
  'myp.scene.rock',
  'myp.scene.forest',
  'myp.scene.night',
] as const;

export type IslandScene = (typeof ISLAND_SCENES)[number];

const SLEEP = 'myp.word.sleep';
const FIRE = 'myp.word.fire';
const SHARE = 'myp.word.share';
const GIVE = 'myp.word.give';
const DANGER = 'myp.word.danger';
const HUNGER = 'myp.word.hunger';
const PROMISE = 'myp.word.promise';
const BETRAY = 'myp.word.betray';

export function isIslandScene(scene: string): scene is IslandScene {
  return (ISLAND_SCENES as readonly string[]).includes(scene);
}

export function gotoScene(state: SaveData, scene: string): SaveData {
  if (!isIslandScene(scene)) return state;
  if (state.screen === 'title' || state.screen === 'prologue') return state;
  return {
    ...state,
    screen: 'island',
    currentScene: scene,
    overlay: 'none',
    selectedCellId: null,
    muralMode: 'learn',
  };
}

export function sitDriftwood(state: SaveData): SaveData {
  if (state.currentScene !== 'myp.scene.shore') return deny(state);
  return {
    ...state,
    flags: { ...state.flags, 'myp.flag.driftwood': true },
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}

export function sleepAtCamp(state: SaveData): SaveData {
  if (state.currentScene !== 'myp.scene.camp') return deny(state);
  if (!learned(state, SLEEP) || !learned(state, FIRE)) return deny(state);
  return {
    ...state,
    beats: { ...state.beats, 'myp.beat.sleep': true },
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}

export function giveSharedFish(state: SaveData): SaveData {
  if (state.currentScene !== 'myp.scene.fishery') return deny(state);
  if (!learned(state, SHARE) || !learned(state, GIVE)) return deny(state);
  return {
    ...state,
    beats: { ...state.beats, 'myp.beat.food': true },
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}

export function forestChoice(state: SaveData, choice: 'step' | 'stop'): SaveData {
  if (state.currentScene !== 'myp.scene.forest') return deny(state);
  if (!learned(state, DANGER) || choice === 'step') return deny(state);
  return {
    ...state,
    beats: { ...state.beats, 'myp.beat.danger': true },
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}

export function collectTattoo(state: SaveData): SaveData {
  if (!learned(state, BETRAY)) return deny(state);
  return addEvidence(state, 'myp.ev.b');
}

export function readOldLayer(state: SaveData): SaveData {
  if (state.currentScene !== 'myp.scene.night') return deny(state);
  if (!learned(state, HUNGER) || !learned(state, PROMISE) || !learned(state, DANGER)) return deny(state);
  return {
    ...addEvidence(state, 'myp.ev.main'),
    beats: { ...state.beats, 'myp.beat.old-layer': true },
  };
}

export function canDepart(state: SaveData): boolean {
  return (
    state.beats['myp.beat.water'] === true &&
    learned(state, HUNGER) &&
    learned(state, PROMISE) &&
    learned(state, DANGER)
  );
}

export function departEast(state: SaveData): SaveData {
  if (state.currentScene !== 'myp.scene.shore') return deny(state);
  if (!canDepart(state)) return deny(state);
  const chart = state.chart.includes('chart.nmn') ? state.chart : [...state.chart, 'chart.nmn'];
  const memories = state.memories.includes('myp.mem.rain-night')
    ? state.memories
    : [...state.memories, 'myp.mem.rain-night'];
  return {
    ...state,
    beats: { ...state.beats, 'myp.beat.depart': true },
    chart,
    memories,
    overlay: 'depart',
    cutsceneStep: 0,
    companion: { level: 0, targetId: null, pawUsed: false },
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}

const MEMORY_FRAMES = 3;

export function openMemory(state: SaveData): SaveData {
  if (!state.memories.includes('myp.mem.rain-night')) return deny(state);
  return {
    ...state,
    overlay: 'memory',
    cutsceneStep: 0,
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}

export function advanceCutscene(state: SaveData): SaveData {
  if (state.overlay === 'depart') {
    return { ...state, overlay: 'memory', cutsceneStep: 0 };
  }
  if (state.overlay !== 'memory') return state;
  if (state.cutsceneStep >= MEMORY_FRAMES - 1) {
    return { ...state, overlay: 'none', cutsceneStep: 0 };
  }
  return { ...state, cutsceneStep: state.cutsceneStep + 1 };
}

export function reviewTarget(state: SaveData): string | null {
  const next = LEXEMES.find((lexeme) => state.words[lexeme.id]?.state === 'learned');
  return next?.id ?? null;
}

export function reviewTap(state: SaveData, wordId: string): SaveData {
  const target = reviewTarget(state);
  const word = target ? state.words[target] : undefined;
  if (!target || !word || wordId !== target) return deny(state);
  return {
    ...state,
    words: {
      ...state.words,
      [target]: reviewForMastery(word, { correct: true, pawUsed: state.companion.pawUsed }),
    },
    companion: { level: 0, targetId: null, pawUsed: false },
    stepCounter: state.stepCounter + 1,
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}

function learned(state: SaveData, id: string): boolean {
  return isLearnedState(state.words[id]?.state);
}

function deny(state: SaveData): SaveData {
  return { ...state, feedback: { seq: state.feedback.seq + 1, kind: 'no' } };
}

function addEvidence(state: SaveData, id: string): SaveData {
  if (state.evidence.includes(id)) return { ...state, feedback: { seq: state.feedback.seq + 1, kind: 'ok' } };
  return {
    ...state,
    evidence: [...state.evidence, id],
    overlay: 'casefile',
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}
