import { saveDataSchema, type SaveData, type WordState } from './schema';

export function parseSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const candidate = record.version === 1 ? migrateFromV1(record) : record;
  const parsed = saveDataSchema.safeParse(candidate);
  return parsed.success ? parsed.data : null;
}

function migrateFromV1(raw: Record<string, unknown>): Record<string, unknown> {
  const words = raw.words;
  const nextWords: Record<string, unknown> = {};
  if (words && typeof words === 'object') {
    for (const [id, value] of Object.entries(words as Record<string, unknown>)) {
      if (!value || typeof value !== 'object') continue;
      const word = { ...(value as Record<string, unknown>) };
      if (word.state === 'ghost') word.state = 'learned' satisfies WordState;
      nextWords[id] = word;
    }
  }
  return {
    ...raw,
    version: 2,
    words: nextWords,
    muralMode: 'learn',
  };
}
