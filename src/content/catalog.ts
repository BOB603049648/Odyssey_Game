import { z } from 'zod';
import companionJson from '../../content/shared/companion.json';
import conceptsJson from '../../content/shared/concepts.json';
import endingsJson from '../../content/shared/endings.json';
import evidenceJson from '../../content/shared/evidence.json';
import lexemesJson from '../../content/islands/myp/lexemes.json';
import {
  companionSchema,
  conceptSchema,
  endingSchema,
  evidenceSchema,
  lexemeSchema,
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

const conceptIds = new Set(CONCEPTS.map((concept) => concept.id));
for (const lexeme of LEXEMES) {
  if (lexeme.conceptId && !conceptIds.has(lexeme.conceptId)) {
    throw new Error(`Missing concept ${lexeme.conceptId} for ${lexeme.id}`);
  }
}
