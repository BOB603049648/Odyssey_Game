import { z } from 'zod';
import companionJson from '../../content/shared/companion.json';
import conceptsJson from '../../content/shared/concepts.json';
import endingsJson from '../../content/shared/endings.json';
import evidenceJson from '../../content/shared/evidence.json';
import memoriesJson from '../../content/shared/memories.json';
import hintsJson from '../../content/islands/dba/hints.json';
import lexemesJson from '../../content/islands/dba/lexemes.json';
import scenesJson from '../../content/islands/dba/scenes.json';
import {
  companionSchema,
  conceptSchema,
  endingSchema,
  evidenceSchema,
  hintPlanSchema,
  lexemeSchema,
  memorySchema,
  sceneAssemblySchema,
  type SceneAssembly,
} from '../core/schema';

function read<T>(schema: z.ZodType<T>, data: unknown, label: string): T {
  const parsed = schema.safeParse(data);
  if (!parsed.success) {
    throw new Error(`${label} invalid: ${parsed.error.message}`);
  }
  return parsed.data;
}

export const LEXEMES = read(z.array(lexemeSchema), lexemesJson, 'lexemes');
export const CONCEPTS = read(z.array(conceptSchema), conceptsJson, 'concepts');
export const COMPANION = read(companionSchema, companionJson, 'companion');
export const ENDINGS = read(z.array(endingSchema), endingsJson, 'endings');
export const EVIDENCE = read(z.array(evidenceSchema), evidenceJson, 'evidence');
export const MEMORIES = read(z.array(memorySchema), memoriesJson, 'memories');
export const HINT_PLANS = read(z.array(hintPlanSchema), hintsJson, 'hints');
export const SCENE_ASSEMBLIES = read(z.array(sceneAssemblySchema), scenesJson, 'scenes');

export function sceneAssembly(id: string): SceneAssembly | null {
  return SCENE_ASSEMBLIES.find((item) => item.id === id) ?? null;
}

const conceptIds = new Set(CONCEPTS.map((concept) => concept.id));
for (const lexeme of LEXEMES) {
  if (lexeme.conceptId && !conceptIds.has(lexeme.conceptId)) {
    throw new Error(`Missing concept ${lexeme.conceptId} for ${lexeme.id}`);
  }
}
