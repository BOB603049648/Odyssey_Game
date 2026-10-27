import { z } from 'zod';

export const islandIdSchema = z.enum(['dba', 'nmn', 'amh', 'iku', 'eus']);
export const layerSchema = z.enum([
  'concrete',
  'action',
  'relation',
  'abstract',
  'listening',
  'script',
  'compound',
  'structure',
  'finale',
]);
export const muralLayerSchema = z.enum(['concrete', 'action', 'relation', 'abstract']);
export const wordStateSchema = z.enum(['unseen', 'seen', 'guessed', 'learned', 'mastered']);
export const hintLevelSchema = z.union([z.literal(0), z.literal(1), z.literal(2), z.literal(3)]);

export const lexemeSchema = z.object({
  id: z.string(),
  island: islandIdSchema,
  layer: layerSchema,
  gloss: z.string().min(1),
  conceptId: z.string(),
  forms: z.object({
    native: z.string().optional(),
    translit: z.string().optional(),
    ipa: z.string().optional(),
  }),
  audio: z.array(z.string()),
  visual: z.string(),
  requires: z.array(z.string()),
  inLexicon: z.boolean(),
  verification: z.object({
    status: z.enum(['draft', 'sourced', 'reviewed', 'recorded']),
    sources: z.array(z.string()),
    reviewer: z.string().optional(),
    notes: z.string().optional(),
  }),
});

export const conceptSchema = z.object({
  id: z.string(),
  gloss: z.string(),
});

export const companionSchema = z.object({
  id: z.literal('companion.nainaicha'),
  name: z.literal('奈奈茶'),
  speaks: z.literal(false),
  teachesLanguage: z.literal(false),
  form: z.object({
    island: z.literal('dba'),
    skin: z.string(),
    scale: z.number(),
    markings: z.string(),
  }),
});

export const endingSchema = z.object({
  id: z.enum(['false-home', 'new-interpreter', 'restart-echo']),
  labelKey: z.string(),
  status: z.literal('stub'),
});

export const memorySchema = z.object({
  id: z.string(),
  triggerBeat: z.string(),
  frames: z.array(z.enum(['rain', 'kitten', 'cloak'])).min(1),
});

export const hintPlanSchema = z.object({
  id: z.string(),
  when: z.enum([
    'shore-driftwood',
    'shore-unlearned-water',
    'shore-water-ready',
    'use-word',
    'mural',
    'camp-sleep',
    'yard-give',
    'path-stop',
    'night-read',
    'shore-depart',
  ]),
  anchor: z.string(),
  target: z.string(),
  walk: z.boolean(),
  paw: z.boolean(),
});

export const evidenceSchema = z.object({
  id: z.string(),
  island: islandIdSchema,
  kind: z.enum(['main', 'side']),
  labelKey: z.string(),
  skippable: z.boolean(),
});

export const wordProgressSchema = z.object({
  id: z.string(),
  state: wordStateSchema,
  box: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal(4)]),
  correct: z.number().int().nonnegative(),
  wrong: z.number().int().nonnegative(),
  lastReviewStep: z.number().int().nonnegative().optional(),
});

export const settingsSchema = z.object({
  showGloss: z.boolean(),
});

export const companionStateSchema = z.object({
  level: hintLevelSchema,
  targetId: z.string().nullable(),
  pawUsed: z.boolean(),
});

export const saveDataSchema = z.object({
  version: z.literal(2),
  createdAt: z.string(),
  updatedAt: z.string(),
  currentScene: z.string(),
  screen: z.enum(['title', 'prologue', 'island', 'mural']),
  prologueStep: z.number().int().nonnegative(),
  overlay: z.enum(['none', 'lexicon', 'settings', 'casefile', 'use-word', 'depart', 'memory', 'chart']),
  cutsceneStep: z.number().int().nonnegative().default(0),
  activeLayer: muralLayerSchema,
  muralMode: z.enum(['learn', 'review']),
  selectedCellId: z.string().nullable(),
  beats: z.record(z.string(), z.boolean()),
  flags: z.record(z.string(), z.union([z.boolean(), z.number(), z.string()])),
  words: z.record(z.string(), wordProgressSchema),
  evidence: z.array(z.string()),
  inventory: z.array(z.string()),
  chart: z.array(z.string()),
  memories: z.array(z.string()),
  hintStats: z.record(
    z.string(),
    z.object({
      look: z.number().int().nonnegative(),
      walk: z.number().int().nonnegative(),
      paw: z.number().int().nonnegative(),
    }),
  ),
  companion: companionStateSchema,
  feedback: z.object({
    seq: z.number().int().nonnegative(),
    kind: z.enum(['none', 'ok', 'no']),
    /** Locale key for a diegetic line. Absent when the beat has nothing to say. */
    line: z.string().optional(),
  }),
  stepCounter: z.number().int().nonnegative(),
  settings: settingsSchema,
});

export type Lexeme = z.infer<typeof lexemeSchema>;
export type WordProgress = z.infer<typeof wordProgressSchema>;
export type WordState = z.infer<typeof wordStateSchema>;
export type SaveData = z.infer<typeof saveDataSchema>;
export type Settings = z.infer<typeof settingsSchema>;
export type MuralLayer = z.infer<typeof muralLayerSchema>;
export type HintLevel = z.infer<typeof hintLevelSchema>;
export type CompanionContent = z.infer<typeof companionSchema>;
export type EndingContent = z.infer<typeof endingSchema>;
export type EvidenceContent = z.infer<typeof evidenceSchema>;
export type MemoryContent = z.infer<typeof memorySchema>;
export type HintPlanContent = z.infer<typeof hintPlanSchema>;
export type Box = WordProgress['box'];

/** Walkable scenes are assembled from these slots. `far`/`sky` are the slowest parallax. */
export const sceneSlotNameSchema = z.enum(['sky', 'far', 'ground', 'building', 'props', 'fg']);

export const sceneSlotSchema = z.object({
  id: z.string().min(1),
  slot: sceneSlotNameSchema,
  kind: z.string().min(1),
  /** Null until the language-island artist delivers a slot file. */
  asset: z.string().nullable(),
  parallax: z.number(),
  spot: z.string().optional(),
  x: z.number().optional(),
  y: z.number().optional(),
  w: z.number().optional(),
  h: z.number().optional(),
});

export const sceneAssemblySchema = z.object({
  id: z.string(),
  grade: z.string(),
  /** Old full-bleed plate filename. Metadata only — never the rendered background. */
  legacyPlate: z.string().nullable(),
  slots: z.array(sceneSlotSchema).min(1),
});

export type SceneSlotName = z.infer<typeof sceneSlotNameSchema>;
export type SceneSlot = z.infer<typeof sceneSlotSchema>;
export type SceneAssembly = z.infer<typeof sceneAssemblySchema>;
