import { LEXEMES } from '../content/catalog';
import { saveDataSchema, type SaveData, type WordProgress } from './schema';

export function initialWords(): Record<string, WordProgress> {
  return Object.fromEntries(
    LEXEMES.map((lexeme) => [
      lexeme.id,
      {
        id: lexeme.id,
        state: 'unseen' as const,
        box: 1 as const,
        correct: 0,
        wrong: 0,
      },
    ]),
  );
}

export function newGameState(now = new Date().toISOString()): SaveData {
  return saveDataSchema.parse({
    version: 2,
    createdAt: now,
    updatedAt: now,
    currentScene: 'pro.scene.title',
    screen: 'title',
    prologueStep: 0,
    overlay: 'none',
    cutsceneStep: 0,
    activeLayer: 'concrete',
    muralMode: 'learn',
    selectedCellId: null,
    beats: {},
    flags: {},
    words: initialWords(),
    evidence: [],
    inventory: [],
    chart: [],
    memories: [],
    hintStats: {},
    companion: { level: 0, targetId: null, pawUsed: false },
    feedback: { seq: 0, kind: 'none' },
    stepCounter: 0,
    settings: { showGloss: false },
  });
}
