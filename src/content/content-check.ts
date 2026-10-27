import { COMPANION, ENDINGS, EVIDENCE, HINT_PLANS, LEXEMES, MEMORIES, SCENE_ASSEMBLIES } from './catalog';
import { SLOT_ASSETS } from './slotAssets';
import { HOTSPOT_IDS } from '../core/hints';
import { ISLAND_SCENES } from '../core/island';
import { SPOTS } from '../core/stage';
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
  const abstractRelated = inLexicon.filter((lexeme) => lexeme.layer === 'abstract' || lexeme.id === 'dba.word.danger');
  if (abstractRelated.length < 12) errors.push('fewer than 12 abstract-related cells');

  if (MEMORIES.length !== 1 || MEMORIES[0]?.id !== 'dba.mem.rain-night') {
    errors.push('first memory must be dba.mem.rain-night');
  }
  for (const memory of MEMORIES) {
    if (memory.triggerBeat !== 'dba.beat.depart') errors.push(`${memory.id} must trigger on depart`);
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
  if (prologue.includes('裂开的石头') || prologue.includes('皮拉罕')) errors.push('prologue still uses the old island image');
  if (zh['evidence.dba.ev.main'] !== '抹画的长卷') errors.push('main evidence label drifted');
  const markings = COMPANION.form.markings;
  if (/雨林|宽叶|豹纹|神兽/.test(markings)) errors.push('companion markings still describe the rainforest form');
  if (!markings.includes('帽兜') || !markings.includes('扁结')) errors.push('companion markings missing hood or knot');

  const byId = new Map(SCENE_ASSEMBLIES.map((scene) => [scene.id, scene]));
  const shoreDelivered = [
    'art.shore.sky',
    'art.shore.ground',
    'art.shore.building',
    'art.shore.fg',
    'art.shore.prop.driftwood',
    'art.shore.prop.gourd',
    'art.shore.prop.break-shard',
    'art.shore.prop.mural-wall',
  ];
  for (const sceneId of ISLAND_SCENES) {
    const kit = byId.get(sceneId);
    if (!kit) {
      errors.push(`missing scene assembly ${sceneId}`);
      continue;
    }
    const names = new Set(kit.slots.map((slot) => slot.slot));
    for (const slot of ['sky', 'far', 'ground', 'building', 'props', 'fg'] as const) {
      if (!names.has(slot)) errors.push(`${sceneId} missing ${slot} slot`);
    }
    if (!kit.slots.some((slot) => slot.parallax < 1) || !kit.slots.some((slot) => slot.parallax > 1)) {
      errors.push(`${sceneId} parallax does not separate far and foreground`);
    }
    for (const slot of kit.slots) {
      if (slot.slot === 'ground' && slot.parallax !== 1) errors.push(`${slot.id} ground must stay with the feet`);
      if (slot.slot === 'props' && slot.parallax !== 1) errors.push(`${slot.id} prop must stay on its hotspot`);
      if (slot.asset && !(slot.asset in SLOT_ASSETS)) errors.push(`${slot.id} asset ${slot.asset} is not in the slot manifest`);
      if (!slot.asset && slot.id.startsWith('art.shore.') && shoreDelivered.includes(slot.id)) {
        errors.push(`${slot.id} is missing its delivered file`);
      }
      if (slot.asset && sceneId !== 'dba.scene.shore') errors.push(`${sceneId} should stay on placeholders until art arrives`);
    }
    const kinds = kit.slots.map((slot) => slot.kind);
    const slotIds = kit.slots.map((slot) => slot.id);
    if (sceneId === 'dba.scene.yard' && (!kinds.includes('grain-bags') || !kinds.includes('dried-fish'))) {
      errors.push('yard must show grain bags and dried fish');
    }
    if (kinds.some((kind) => kind === 'question' || kind.includes('?'))) {
      errors.push(`${sceneId} uses a question-mark sticker as a prop`);
    }
    for (const spot of SPOTS[sceneId]) {
      const anchors = kit.slots.filter((slot) => slot.slot === 'props' && slot.spot === spot.id);
      if (anchors.length === 0) errors.push(`${sceneId} spot ${spot.id} is not anchored to a prop`);
    }
    if (sceneId === 'dba.scene.shore') {
      for (const id of [
        'art.shore.prop.driftwood',
        'art.shore.prop.gourd',
        'art.shore.prop.break-shard',
        'art.shore.prop.mural-wall',
        'art.shore.prop.east-gap',
      ]) {
        const slot = kit.slots.find((item) => item.id === id);
        if (!slot || slot.slot !== 'props') errors.push(`${id} must be its own props anchor`);
      }
    }
    if (sceneId === 'dba.scene.camp') {
      for (const id of [
        'art.camp.prop.fire',
        'art.camp.prop.sleep-mat',
        'art.camp.prop.north-curtain',
        'art.camp.prop.act-home',
        'art.camp.prop.act-eat',
        'art.camp.prop.act-drink',
        'art.camp.prop.act-walk',
        'art.camp.prop.act-take',
        'art.camp.prop.act-me',
        'art.camp.prop.act-you',
      ]) {
        if (!slotIds.includes(id)) errors.push(`camp missing prop ${id}`);
      }
      const sleepAnchors = kit.slots.filter((slot) => slot.spot === 'camp-sleep').map((slot) => slot.id);
      if (!sleepAnchors.includes('art.camp.prop.fire') || !sleepAnchors.includes('art.camp.prop.sleep-mat')) {
        errors.push('camp-sleep needs both the fire and a sleep mat');
      }
      const curtain = kit.slots.find((slot) => slot.id === 'art.camp.prop.north-curtain');
      if (!curtain || curtain.slot !== 'props' || curtain.kind === 'lock') errors.push('north curtain must stay an open props slit');
    }
    if (sceneId === 'dba.scene.yard') {
      for (const id of ['art.yard.prop.grain-bags', 'art.yard.prop.dried-fish', 'art.yard.prop.more-less-boards']) {
        if (!slotIds.some((slotId) => slotId === id || slotId.startsWith(`${id}.`))) {
          errors.push(`yard missing prop family ${id}`);
        }
      }
    }
  }
  return errors;
}
