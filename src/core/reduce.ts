import { LEXEMES } from '../content/catalog';
import { isLayerUnlocked, requirementsMet } from './conditions';
import { debugEvidence, debugForceEnding, debugHotspots, debugLearnNext, debugScene } from './debug';
import { hintCap, hintTarget, type CompanionPose, type HintAnchor } from './hints';
import {
  advanceCutscene,
  collectTattoo,
  departEast,
  forestChoice,
  giveSharedFish,
  gotoScene,
  openMemory,
  grabFish,
  canReadOldLayer,
  readOldLayer,
  reviewTap,
  sceneAct,
  shoreStone,
  sitDriftwood,
  sleepAtCamp,
} from './island';
import { newGameState } from './save';
import type { EndingContent, HintLevel, MuralLayer, SaveData, WordProgress } from './schema';
import { chooseEnding, resolveEnding, type EndingChoice } from './endings';
import { isLearnedState, transitionWord } from './words';

export type Action =
  | { type: 'new-game' }
  | { type: 'advance-prologue' }
  | { type: 'open-mural' }
  | { type: 'close-screen' }
  | { type: 'select-layer'; layer: MuralLayer }
  | { type: 'select-cell'; wordId: string }
  | { type: 'match-object'; wordId: string }
  | { type: 'request-hint' }
  | { type: 'poke-gourd' }
  | { type: 'use-word'; wordId: string }
  | { type: 'set-show-gloss'; value: boolean }
  | { type: 'open-overlay'; overlay: 'lexicon' | 'settings' | 'casefile' }
  | { type: 'close-overlay' }
  | { type: 'goto-scene'; scene: string }
  | { type: 'sit-driftwood' }
  | { type: 'sleep-at-camp' }
  | { type: 'give-fish' }
  | { type: 'forest-choice'; choice: 'step' | 'stop' }
  | { type: 'collect-tattoo' }
  | { type: 'read-old-layer' }
  | { type: 'depart' }
  | { type: 'select-review' }
  | { type: 'review-tap'; wordId: string }
  | { type: 'open-memory' }
  | { type: 'advance-cutscene' }
  | { type: 'debug-scene'; scene: string }
  | { type: 'debug-learn-next' }
  | { type: 'debug-evidence'; id: string }
  | { type: 'debug-hotspots'; value: boolean }
  | { type: 'debug-ending'; id: EndingContent['id'] }
  | { type: 'scene-act'; wordId: string; part?: 'a' | 'b' | 'more' | 'less' }
  | { type: 'grab-fish' }
  | { type: 'shore-stone' }
  | { type: 'open-finale' }
  | { type: 'choose-ending'; choice: EndingChoice };

const WATER = 'myp.word.water';

export function reduce(state: SaveData, action: Action): SaveData {
  switch (action.type) {
    case 'new-game':
      return beginPrologue(state.settings.showGloss);
    case 'set-show-gloss':
      return touch({ ...state, settings: { showGloss: action.value } });
    case 'advance-prologue':
      return advancePrologue(state);
    case 'open-mural':
      return openMural(state);
    case 'close-screen':
      return closeScreen(state);
    case 'close-overlay':
      return touch({ ...state, overlay: 'none' });
    case 'open-overlay':
      return touch({ ...state, overlay: action.overlay });
    case 'select-layer':
      return selectLayer(state, action.layer);
    case 'select-cell':
      return selectCell(state, action.wordId);
    case 'match-object':
      return matchObject(state, action.wordId);
    case 'request-hint':
      return requestHint(state);
    case 'poke-gourd':
      return pokeGourd(state);
    case 'use-word':
      return useWord(state, action.wordId);
    case 'goto-scene':
      return touch(gotoScene(state, action.scene));
    case 'sit-driftwood':
      return touch(sitDriftwood(state));
    case 'sleep-at-camp':
      return touch(sleepAtCamp(state));
    case 'give-fish':
      return touch(giveSharedFish(state));
    case 'forest-choice':
      return touch(forestChoice(state, action.choice));
    case 'collect-tattoo':
      return touch(collectTattoo(state));
    case 'read-old-layer':
      if (state.currentScene === 'myp.scene.night' && !canReadOldLayer(state)) return openMural(state);
      return touch(readOldLayer(state));
    case 'depart':
      return touch(departEast(state));
    case 'select-review':
      return selectReview(state);
    case 'review-tap':
      return touch(reviewTap(state, action.wordId));
    case 'open-memory':
      return touch(openMemory(state));
    case 'advance-cutscene':
      return touch(advanceCutscene(state));
    case 'debug-scene':
      return touch(debugScene(state, action.scene));
    case 'debug-learn-next':
      return touch(debugLearnNext(state));
    case 'debug-evidence':
      return touch(debugEvidence(state, action.id));
    case 'debug-hotspots':
      return touch(debugHotspots(state, action.value));
    case 'debug-ending':
      return touch(debugForceEnding(state, action.id));
    case 'scene-act':
      return touch(sceneAct(state, action.wordId, action.part));
    case 'grab-fish':
      return touch(grabFish(state));
    case 'shore-stone':
      return touch(shoreStone(state));
    case 'open-finale':
      if (state.beats['myp.beat.depart'] !== true) return state;
      return touch({ ...state, overlay: 'finale' });
    case 'choose-ending':
      if (state.beats['myp.beat.depart'] !== true) return state;
      return touch(commitEnding(state, action.choice));
    default:
      return state;
  }
}

function beginPrologue(showGloss: boolean): SaveData {
  const fresh = newGameState();
  return {
    ...fresh,
    settings: { showGloss },
    screen: 'prologue',
    prologueStep: 0,
    currentScene: 'pro.scene.storm',
  };
}

function advancePrologue(state: SaveData): SaveData {
  if (state.screen !== 'prologue') return state;
  if (state.prologueStep >= 3) return enterShore(state);
  const prologueStep = state.prologueStep + 1;
  let next: SaveData = { ...state, prologueStep };
  if (prologueStep === 1) next = { ...next, currentScene: 'pro.scene.dark' };
  if (prologueStep === 2) {
    next = {
      ...next,
      currentScene: 'pro.scene.break',
      evidence: next.evidence.includes('myp.ev.a') ? next.evidence : [...next.evidence, 'myp.ev.a'],
      beats: { ...next.beats, 'pro.beat.storm': true },
      flags: { ...next.flags, 'pro.flag.saw-break': true },
    };
  }
  if (prologueStep === 3) next = { ...next, currentScene: 'pro.scene.tide' };
  return touch(next);
}

function enterShore(state: SaveData): SaveData {
  return touch({
    ...state,
    screen: 'island',
    currentScene: 'myp.scene.shore',
    overlay: 'none',
    selectedCellId: null,
    beats: { ...state.beats, 'pro.beat.storm': true, 'myp.beat.meet': true },
    flags: { ...state.flags, 'pro.flag.met-companion': true },
    companion: { level: 0, targetId: null, pawUsed: false },
  });
}

function openMural(state: SaveData): SaveData {
  const activeLayer = isLayerUnlocked(state.activeLayer, state.words, LEXEMES)
    ? state.activeLayer
    : 'concrete';
  return touch(
    revealLayer(
      {
        ...state,
        screen: 'mural',
        overlay: 'none',
        activeLayer,
        muralMode: 'learn',
        selectedCellId: null,
      },
      activeLayer,
    ),
  );
}

function closeScreen(state: SaveData): SaveData {
  if (state.screen === 'mural') {
    return touch({
      ...state,
      screen: 'island',
      currentScene: state.currentScene.startsWith('myp.scene.') ? state.currentScene : 'myp.scene.shore',
      muralMode: 'learn',
      overlay: 'none',
      selectedCellId: null,
    });
  }
  if (state.overlay !== 'none') return touch({ ...state, overlay: 'none' });
  return state;
}

function selectLayer(state: SaveData, layer: MuralLayer): SaveData {
  if (!isLayerUnlocked(layer, state.words, LEXEMES)) return state;
  const revealed = revealLayer(
    {
      ...state,
      activeLayer: layer,
      muralMode: 'learn',
      selectedCellId: null,
    },
    layer,
  );
  if (layer !== 'abstract') return touch(revealed);
  return touch({ ...revealed, beats: { ...revealed.beats, 'myp.beat.abstract-open': true } });
}

function selectReview(state: SaveData): SaveData {
  const anyLearned = Object.values(state.words).some((word) => isLearnedState(word.state));
  if (!anyLearned) return state;
  return touch({ ...state, muralMode: 'review', selectedCellId: null });
}

function selectCell(state: SaveData, wordId: string): SaveData {
  const lexeme = LEXEMES.find((item) => item.id === wordId);
  if (!lexeme || lexeme.layer !== state.activeLayer) return state;
  if (!isLayerUnlocked(state.activeLayer, state.words, LEXEMES)) return state;
  if (!requirementsMet(lexeme, state.words)) return state;
  if (isLearnedState(state.words[wordId]?.state)) return state;
  const word = state.words[wordId];
  if (!word) return state;
  return touch({
    ...state,
    selectedCellId: wordId,
    words: { ...state.words, [wordId]: transitionWord(word, 'reveal') },
  });
}

function matchObject(state: SaveData, wordId: string): SaveData {
  const selected = state.selectedCellId;
  if (!selected) {
    return mark(state, { feedback: { seq: state.feedback.seq + 1, kind: 'no' } });
  }
  const lexeme = LEXEMES.find((item) => item.id === selected);
  const word = state.words[selected];
  if (!lexeme || !word || isLearnedState(word.state)) return state;
  if (!requirementsMet(lexeme, state.words)) return state;
  if (wordId !== selected) {
    return mark(state, {
      words: { ...state.words, [selected]: transitionWord(word, 'miss') },
      stepCounter: state.stepCounter + 1,
      feedback: { seq: state.feedback.seq + 1, kind: 'no' },
    });
  }
  return mark(state, {
    words: {
      ...state.words,
      [selected]: {
        ...transitionWord(word, 'learn'),
        lastReviewStep: state.stepCounter + 1,
      },
    },
    selectedCellId: null,
    stepCounter: state.stepCounter + 1,
    companion: { level: 0, targetId: null, pawUsed: false },
    feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
  });
}

function requestHint(state: SaveData): SaveData {
  const cap = hintCap(state);
  if (state.companion.level >= cap) return state;
  const level = (state.companion.level + 1) as HintLevel;
  const targetId = hintTarget(state);
  return touch({
    ...state,
    companion: { level, targetId, pawUsed: level === 3 },
    hintStats: bumpHint(state, level, targetId),
  });
}

function pokeGourd(state: SaveData): SaveData {
  if (isLearnedState(state.words[WATER]?.state) && state.beats['myp.beat.water'] !== true) {
    return touch({ ...state, overlay: 'use-word', screen: 'island', currentScene: 'myp.scene.shore' });
  }
  return mark(state, { feedback: { seq: state.feedback.seq + 1, kind: 'no' } });
}

function useWord(state: SaveData, wordId: string): SaveData {
  if (wordId === WATER && isLearnedState(state.words[WATER]?.state)) {
    return mark(state, {
      beats: { ...state.beats, 'myp.beat.water': true },
      overlay: 'none',
      stepCounter: state.stepCounter + 1,
      companion: { level: 0, targetId: null, pawUsed: false },
      feedback: { seq: state.feedback.seq + 1, kind: 'ok' },
    });
  }
  const word = state.words[wordId];
  const words =
    word && isLearnedState(word.state)
      ? { ...state.words, [wordId]: transitionWord(word, 'miss') }
      : state.words;
  return mark(state, {
    words,
    stepCounter: state.stepCounter + 1,
    feedback: { seq: state.feedback.seq + 1, kind: 'no' },
  });
}

function revealLayer(state: SaveData, layer: MuralLayer): SaveData {
  let words = state.words;
  for (const lexeme of LEXEMES) {
    if (lexeme.layer !== layer) continue;
    const current = words[lexeme.id];
    if (!current) continue;
    const next = transitionWord(current, 'reveal');
    if (next !== current) words = { ...words, [lexeme.id]: next };
  }
  return { ...state, words };
}

function bumpHint(state: SaveData, level: HintLevel, targetId: string | null): SaveData['hintStats'] {
  if (!targetId || level === 0) return state.hintStats;
  const key = level === 1 ? 'look' : level === 2 ? 'walk' : 'paw';
  const prev = state.hintStats[targetId] ?? { look: 0, walk: 0, paw: 0 };
  return {
    ...state.hintStats,
    [targetId]: { ...prev, [key]: prev[key] + 1 },
  };
}

function commitEnding(state: SaveData, choice: EndingChoice): SaveData {
  const chosen = chooseEnding(state, choice);
  const ending = resolveEnding(chosen) ?? 'false-home';
  return {
    ...chosen,
    overlay: 'finale',
    flags: { ...chosen.flags, 'fin.flag.ending': ending },
  };
}

function touch(state: SaveData): SaveData {
  return { ...state, updatedAt: new Date().toISOString() };
}

function mark(state: SaveData, patch: Partial<SaveData>): SaveData {
  return touch({ ...state, ...patch });
}

export type { CompanionPose, HintAnchor, WordProgress };
