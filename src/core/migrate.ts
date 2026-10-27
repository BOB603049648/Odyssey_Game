import { saveDataSchema, type SaveData, type WordState } from './schema';

const ID_SWAPS: ReadonlyArray<readonly [string, string]> = [
  ['myp.scene.fishery', 'dba.scene.yard'],
  ['myp.scene.rock', 'dba.scene.hall'],
  ['myp.scene.forest', 'dba.scene.path'],
  ['myp.item.bone', 'dba.item.token'],
  ['chart.nmn', 'chart.jgw'],
  ['fishery-give', 'yard-give'],
  ['fishery-grab', 'yard-grab'],
  ['rock-mural', 'hall-mural'],
  ['rock-stamps', 'hall-stamps'],
  ['rock-tattoo', 'hall-tattoo'],
  ['forest-stop', 'path-stop'],
  ['forest-step', 'path-step'],
  ['myp.', 'dba.'],
];

export function remapLegacyId(value: string): string {
  let next = value;
  for (const [from, to] of ID_SWAPS) {
    if (next.includes(from)) next = next.split(from).join(to);
  }
  return next;
}

function remapValue(value: unknown): unknown {
  if (typeof value === 'string') return remapLegacyId(value);
  if (Array.isArray(value)) return value.map(remapValue);
  if (!value || typeof value !== 'object') return value;
  const out: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value as Record<string, unknown>)) {
    out[remapLegacyId(key)] = remapValue(item);
  }
  return out;
}

export function parseSave(raw: unknown): SaveData | null {
  if (!raw || typeof raw !== 'object') return null;
  const record = raw as Record<string, unknown>;
  const versioned = record.version === 1 ? migrateFromV1(record) : record;
  const candidate = remapValue(versioned);
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
