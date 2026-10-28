import { LEXEMES } from '../content/catalog';
import type { SaveData } from './schema';
import { isLearnedState, reviewForMastery } from './words';

export const ISLAND_SCENES = [
  'dba.scene.shore',
  'dba.scene.camp',
  'dba.scene.yard',
  'dba.scene.hall',
  'dba.scene.path',
  'dba.scene.night',
] as const;

export type IslandScene = (typeof ISLAND_SCENES)[number];

const SLEEP = 'dba.word.sleep';
const FIRE = 'dba.word.fire';
const SHARE = 'dba.word.share';
const GIVE = 'dba.word.give';
const DANGER = 'dba.word.danger';
const HUNGER = 'dba.word.hunger';
const PROMISE = 'dba.word.promise';
const BETRAY = 'dba.word.betray';

export function isIslandScene(scene: string): scene is IslandScene {
  return (ISLAND_SCENES as readonly string[]).includes(scene);
}

export function gotoScene(state: SaveData, scene: string): SaveData {
  if (!isIslandScene(scene)) return state;
  if (state.screen === 'title' || state.screen === 'prologue') return state;
  const changed = state.currentScene !== scene;
  return {
    ...state,
    screen: 'island',
    currentScene: scene,
    overlay: 'none',
    selectedCellId: null,
    muralMode: 'learn',
    feedback: changed ? { seq: state.feedback.seq, kind: 'none' } : state.feedback,
  };
}

export function sitDriftwood(state: SaveData): SaveData {
  if (state.currentScene !== 'dba.scene.shore') return deny(state);
  const again = state.flags['dba.flag.driftwood'] === true;
  return {
    ...state,
    flags: { ...state.flags, 'dba.flag.driftwood': true },
    feedback: {
      seq: state.feedback.seq + 1,
      kind: 'ok',
      line: again ? 'spot.driftwood.again' : 'spot.driftwood.ok',
      spot: 'shore-driftwood',
    },
  };
}

export function sleepAtCamp(state: SaveData): SaveData {
  if (state.currentScene !== 'dba.scene.camp') return deny(state);
  if (!learned(state, SLEEP) || !learned(state, FIRE)) return deny(state, 'spot.sleep.no', 'camp-sleep');
  return {
    ...state,
    beats: { ...state.beats, 'dba.beat.sleep': true },
    feedback: { seq: state.feedback.seq + 1, kind: 'ok', line: 'spot.sleep.ok', spot: 'camp-sleep' },
  };
}

export function giveSharedFish(state: SaveData): SaveData {
  if (state.currentScene !== 'dba.scene.yard') return deny(state);
  if (!learned(state, SHARE) || !learned(state, GIVE)) return deny(state, 'spot.give.no', 'yard-give');
  return {
    ...state,
    beats: { ...state.beats, 'dba.beat.food': true },
    feedback: { seq: state.feedback.seq + 1, kind: 'ok', line: 'spot.give.ok', spot: 'yard-give' },
  };
}

export function forestChoice(state: SaveData, choice: 'step' | 'stop'): SaveData {
  if (state.currentScene !== 'dba.scene.path') return deny(state);
  if (!learned(state, DANGER) || choice === 'step') return deny(state);
  return {
    ...state,
    beats: { ...state.beats, 'dba.beat.danger': true },
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}

export function collectTattoo(state: SaveData): SaveData {
  if (!learned(state, BETRAY)) return deny(state);
  return addEvidence(state, 'dba.ev.b');
}

export function canReadOldLayer(state: SaveData): boolean {
  return learned(state, HUNGER) && learned(state, PROMISE) && learned(state, DANGER);
}

export function readOldLayer(state: SaveData): SaveData {
  if (state.currentScene !== 'dba.scene.night') return deny(state);
  if (!canReadOldLayer(state)) return deny(state);
  const gained = addEvidence(state, 'dba.ev.main');
  return withBoneCell({
    ...gained,
    beats: { ...gained.beats, 'dba.beat.old-layer': true },
  });
}

const SCENE_ACTS: Record<string, { scene: IslandScene; beat: string }> = {
  'dba.word.eat': { scene: 'dba.scene.camp', beat: 'dba.beat.eat' },
  'dba.word.drink': { scene: 'dba.scene.camp', beat: 'dba.beat.drink' },
  'dba.word.walk': { scene: 'dba.scene.camp', beat: 'dba.beat.walk' },
  'dba.word.take': { scene: 'dba.scene.camp', beat: 'dba.beat.take' },
  'dba.word.me': { scene: 'dba.scene.camp', beat: 'dba.beat.me' },
  'dba.word.you': { scene: 'dba.scene.camp', beat: 'dba.beat.you' },
  'dba.word.home': { scene: 'dba.scene.camp', beat: 'dba.beat.home' },
  'dba.word.wait': { scene: 'dba.scene.hall', beat: 'dba.beat.wait' },
};

export function sceneAct(state: SaveData, wordId: string, part?: 'a' | 'b' | 'more' | 'less'): SaveData {
  if (wordId === 'dba.word.size') return sizeAct(state, part);
  if (wordId === 'dba.word.amount') {
    if (state.currentScene !== 'dba.scene.yard' || part !== 'more') {
      return deny(state, 'spot.act.no', part === 'less' ? 'act:dba.word.amount:less' : 'act:dba.word.amount:more');
    }
  }
  const spec = SCENE_ACTS[wordId] ?? (wordId === 'dba.word.amount'
    ? { scene: 'dba.scene.yard' as const, beat: 'dba.beat.amount' }
    : undefined);
  const spot = `act:${wordId}`;
  if (!spec || state.currentScene !== spec.scene) return deny(state);
  if (!learned(state, wordId)) return deny(state, 'spot.act.no', spot);
  const line = spec.scene === 'dba.scene.camp' ? 'spot.act.ok' : undefined;
  const marked = markBeat(state, spec.beat, line, spot);
  return wordId === 'dba.word.wait' ? giveBone(marked) : marked;
}

export function grabFish(state: SaveData): SaveData {
  if (state.currentScene !== 'dba.scene.yard') return deny(state);
  return {
    ...state,
    flags: { ...state.flags, 'dba.flag.wrong-share': true },
    feedback: { seq: state.feedback.seq + 1, kind: 'no', line: 'spot.give.wrong', spot: 'yard-grab' },
  };
}

const FAR_LINES: Record<string, string> = {
  'shore-driftwood': 'spot.driftwood.far',
  'shore-stone': 'spot.stone.far',
  'island-gourd': 'spot.gourd.far',
  'island-mural': 'spot.mural.far',
  'shore-depart': 'spot.depart.far',
  'camp-sleep': 'spot.sleep.far',
  'yard-give': 'spot.give.far',
  'yard-grab': 'spot.grab.far',
};

/** Out of radius: a line only. No sit, no beat, no taught-approach, no word. */
export function farSpot(state: SaveData, id: string): SaveData {
  const line = FAR_LINES[id] ?? (id.startsWith('act:') ? 'spot.act.far' : undefined);
  if (!line) return state;
  return {
    ...state,
    feedback: { seq: state.feedback.seq + 1, kind: 'no', line, spot: id },
  };
}

export function shoreStone(state: SaveData): SaveData {
  if (state.currentScene !== 'dba.scene.shore') return deny(state);
  const evidence = state.evidence.includes('dba.ev.a') ? state.evidence : [...state.evidence, 'dba.ev.a'];
  return {
    ...state,
    evidence,
    beats: { ...state.beats, 'dba.beat.stone': true },
    overlay: 'casefile',
    feedback: { seq: state.feedback.seq + 1, kind: 'ok', line: 'spot.stone.ok', spot: 'shore-stone' },
  };
}

export function canDepart(state: SaveData): boolean {
  return (
    state.beats['dba.beat.water'] === true &&
    learned(state, HUNGER) &&
    learned(state, PROMISE) &&
    learned(state, DANGER)
  );
}

export function departEast(state: SaveData): SaveData {
  if (state.currentScene !== 'dba.scene.shore') return deny(state);
  if (!canDepart(state)) return deny(state, 'spot.depart.no', 'shore-depart');
  const chart = state.chart.includes('chart.jgw') ? state.chart : [...state.chart, 'chart.jgw'];
  const memories = state.memories.includes('dba.mem.rain-night')
    ? state.memories
    : [...state.memories, 'dba.mem.rain-night'];
  return {
    ...state,
    beats: { ...state.beats, 'dba.beat.depart': true },
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
  if (!state.memories.includes('dba.mem.rain-night')) return deny(state);
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

function markBeat(state: SaveData, beat: string, line?: string, spot?: string): SaveData {
  return {
    ...state,
    beats: { ...state.beats, [beat]: true },
    feedback: {
      seq: state.feedback.seq + 1,
      kind: 'ok',
      ...(line ? { line } : {}),
      ...(spot ? { spot } : {}),
    },
  };
}

function sizeAct(state: SaveData, part?: 'a' | 'b' | 'more' | 'less'): SaveData {
  if (state.currentScene !== 'dba.scene.yard' || (part !== 'a' && part !== 'b')) return deny(state);
  if (!learned(state, 'dba.word.size')) return deny(state);
  const flags = { ...state.flags, [`dba.flag.size-${part}`]: true };
  const both = flags['dba.flag.size-a'] === true && flags['dba.flag.size-b'] === true;
  return {
    ...state,
    flags,
    beats: both ? { ...state.beats, 'dba.beat.size': true } : state.beats,
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  };
}

function giveBone(state: SaveData): SaveData {
  const inventory = state.inventory.includes('dba.item.token') ? state.inventory : [...state.inventory, 'dba.item.token'];
  return withBoneCell({ ...state, inventory });
}

function withBoneCell(state: SaveData): SaveData {
  if (!state.inventory.includes('dba.item.token') || !state.evidence.includes('dba.ev.main')) return state;
  if (state.flags['dba.flag.bone-cell'] === true) return state;
  return { ...state, flags: { ...state.flags, 'dba.flag.bone-cell': true } };
}

function deny(state: SaveData, line?: string, spot?: string): SaveData {
  return {
    ...state,
    feedback: {
      seq: state.feedback.seq + 1,
      kind: 'no',
      ...(line ? { line } : {}),
      ...(spot ? { spot } : {}),
    },
  };
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
