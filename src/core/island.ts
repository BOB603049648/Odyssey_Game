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
  const gained = addEvidence(state, 'myp.ev.main');
  return withBoneCell({
    ...gained,
    beats: { ...gained.beats, 'myp.beat.old-layer': true },
  });
}

const SCENE_ACTS: Record<string, { scene: IslandScene; beat: string }> = {
  'myp.word.eat': { scene: 'myp.scene.camp', beat: 'myp.beat.eat' },
  'myp.word.drink': { scene: 'myp.scene.camp', beat: 'myp.beat.drink' },
  'myp.word.walk': { scene: 'myp.scene.camp', beat: 'myp.beat.walk' },
  'myp.word.take': { scene: 'myp.scene.camp', beat: 'myp.beat.take' },
  'myp.word.me': { scene: 'myp.scene.camp', beat: 'myp.beat.me' },
  'myp.word.you': { scene: 'myp.scene.camp', beat: 'myp.beat.you' },
  'myp.word.home': { scene: 'myp.scene.camp', beat: 'myp.beat.home' },
  'myp.word.wait': { scene: 'myp.scene.rock', beat: 'myp.beat.wait' },
};

export function sceneAct(state: SaveData, wordId: string, part?: 'a' | 'b' | 'more' | 'less'): SaveData {
  if (wordId === 'myp.word.size') return sizeAct(state, part);
  if (wordId === 'myp.word.amount') {
    if (state.currentScene !== 'myp.scene.fishery' || part !== 'more') return deny(state);
  }
  const spec = SCENE_ACTS[wordId] ?? (wordId === 'myp.word.amount'
    ? { scene: 'myp.scene.fishery' as const, beat: 'myp.beat.amount' }
    : undefined);
  if (!spec || state.currentScene !== spec.scene) return deny(state);
  if (!learned(state, wordId)) return deny(state);
  const marked = markBeat(state, spec.beat);
  return wordId === 'myp.word.wait' ? giveBone(marked) : marked;
}

export function grabFish(state: SaveData): SaveData {
  if (state.currentScene !== 'myp.scene.fishery') return deny(state);
  return {
    ...state,
    flags: { ...state.flags, 'myp.flag.wrong-share': true },
    feedback: { seq: state.feedback.seq + 1, kind: 'no' },
  };
}

export function shoreStone(state: SaveData): SaveData {
  if (state.currentScene !== 'myp.scene.shore') return deny(state);
  const evidence = state.evidence.includes('myp.ev.a') ? state.evidence : [...state.evidence, 'myp.ev.a'];
  return {
    ...state,
    evidence,
    beats: { ...state.beats, 'myp.beat.stone': true },
    overlay: 'casefile',
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
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

function markBeat(state: SaveData, beat: string): SaveData {
  return {
    ...state,
    beats: { ...state.beats, [beat]: true },
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}

function sizeAct(state: SaveData, part?: 'a' | 'b' | 'more' | 'less'): SaveData {
  if (state.currentScene !== 'myp.scene.fishery' || (part !== 'a' && part !== 'b')) return deny(state);
  if (!learned(state, 'myp.word.size')) return deny(state);
  const flags = { ...state.flags, [`myp.flag.size-${part}`]: true };
  const both = flags['myp.flag.size-a'] === true && flags['myp.flag.size-b'] === true;
  return {
    ...state,
    flags,
    beats: both ? { ...state.beats, 'myp.beat.size': true } : state.beats,
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}

function giveBone(state: SaveData): SaveData {
  const inventory = state.inventory.includes('myp.item.bone') ? state.inventory : [...state.inventory, 'myp.item.bone'];
  return withBoneCell({ ...state, inventory });
}

function withBoneCell(state: SaveData): SaveData {
  if (!state.inventory.includes('myp.item.bone') || !state.evidence.includes('myp.ev.main')) return state;
  if (state.flags['myp.flag.bone-cell'] === true) return state;
  return { ...state, flags: { ...state.flags, 'myp.flag.bone-cell': true } };
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
