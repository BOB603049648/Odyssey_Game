import { COMPANION, ENDINGS, EVIDENCE, HINT_PLANS, LEXEMES, MEMORIES } from './catalog';
import { HOTSPOT_IDS } from '../core/hints';
import zh from '../../content/locales/zh-CN.json';

const CJK = /[\u4e00-\u9fff]/;

export function checkContent(): string[] {
  const errors: string[] = [];
  const ids = new Set(LEXEMES.map((lexeme) => lexeme.id));
  const hotspots = new Set<string>(HOTSPOT_IDS);

  for (const lexeme of LEXEMES) {
    if (CJK.test(lexeme.id) || CJK.test(lexeme.visual) || CJK.test(JSON.stringify(lexeme.forms))) {
      errors.push(`${lexeme.id} carries mother-tongue text outside gloss`);
    }
    for (const requirement of lexeme.requires) {
      if (!ids.has(requirement)) errors.push(`${lexeme.id} requires missing ${requirement}`);
    }
  }

  const visiting = new Set<string>();
  const visited = new Set<string>();
  const visit = (id: string) => {
    if (visited.has(id) || visiting.has(id)) {
      if (visiting.has(id)) errors.push(`cycle at ${id}`);
      return;
    }
    visiting.add(id);
    const lexeme = LEXEMES.find((item) => item.id === id);
    for (const requirement of lexeme?.requires ?? []) visit(requirement);
    visiting.delete(id);
    visited.add(id);
  };
  for (const lexeme of LEXEMES) visit(lexeme.id);

  const inLexicon = LEXEMES.filter((lexeme) => lexeme.inLexicon);
  if (inLexicon.length !== 28) errors.push(`expected 28 lexicon words, saw ${inLexicon.length}`);
  const layerRank: Record<string, number> = { concrete: 0, action: 1, relation: 2, abstract: 3 };
  for (const lexeme of inLexicon) {
    for (const requirement of lexeme.requires) {
      const needed = LEXEMES.find((item) => item.id === requirement);
      if (!needed) continue;
      if ((layerRank[needed.layer] ?? 9) > (layerRank[lexeme.layer] ?? 9)) {
        errors.push(`${lexeme.id} depends on a later layer`);
      }
    }
  }
  const abstractRelated = inLexicon.filter((lexeme) => lexeme.layer === 'abstract' || lexeme.id === 'myp.word.danger');
  if (abstractRelated.length < 12) errors.push('fewer than 12 abstract-related cells');

  if (MEMORIES.length !== 1 || MEMORIES[0]?.id !== 'myp.mem.rain-night') {
    errors.push('first memory must be myp.mem.rain-night');
  }
  for (const memory of MEMORIES) {
    if (memory.triggerBeat !== 'myp.beat.depart') errors.push(`${memory.id} must trigger on depart`);
    if (CJK.test(JSON.stringify(memory))) errors.push(`${memory.id} has mother-tongue text`);
  }

  for (const plan of HINT_PLANS) {
    if (CJK.test(JSON.stringify(plan))) errors.push(`${plan.id} has mother-tongue text`);
    const known = ids.has(plan.target) || hotspots.has(plan.target);
    if (!known) errors.push(`${plan.id} points at missing ${plan.target}`);
  }

  if (COMPANION.speaks || COMPANION.teachesLanguage) errors.push('companion must stay silent and not teach');
  if (ENDINGS.map((ending) => ending.id).join(',') !== 'false-home,new-interpreter,restart-echo') {
    errors.push('ending ids drifted');
  }
  for (const item of EVIDENCE) {
    if (!(item.labelKey in zh)) errors.push(`missing label ${item.labelKey}`);
  }
  const prologue = Object.entries(zh)
    .filter(([key]) => key.startsWith('prologue.'))
    .map(([, value]) => value)
    .join('\n');
  if (prologue.includes('奈奈茶')) errors.push('prologue shows the guide name');
  return errors;
}
