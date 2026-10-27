import type { HintAnchor } from '../core/hints';
import type { IslandScene } from '../core/island';
import type { SaveData } from '../core/schema';
import { SPOTS, type Spot } from '../core/stage';
import { isLearnedState } from '../core/words';
import { t, type MessageKey } from './i18n';
import { hintMark } from './hintMark';

const BETRAY = 'dba.word.betray';

export type SpotView = Spot & {
  className: string;
  testId: string;
  label: string;
  ariaLabel?: string;
  glyph?: string;
};

type ViewSpec = {
  className: string;
  testId: string;
  label: MessageKey;
  aria?: MessageKey;
  glyph?: string;
  hintAnchor?: string;
  hintWord?: string;
};

const VIEWS: Record<string, ViewSpec> = {
  'island-mural': { className: 'hotspot mural', testId: 'island-mural', label: 'island.mural', hintAnchor: 'mural-entrance' },
  'island-gourd': { className: 'hotspot gourd', testId: 'island-gourd', label: 'island.gourd', aria: 'island.gourd', hintAnchor: 'gourd' },
  'shore-stone': { className: 'hotspot stone', testId: 'shore-stone', label: 'shore.stone' },
  'shore-driftwood': { className: 'hotspot drift', testId: 'shore-driftwood', label: 'shore.driftwood', hintAnchor: 'driftwood' },
  'shore-depart': { className: 'hotspot depart', testId: 'shore-depart', label: 'shore.depart', hintAnchor: 'depart' },
  'camp-sleep': { className: 'hotspot sleep', testId: 'camp-sleep', label: 'camp.sleep', hintAnchor: 'sleep' },
  'yard-give': { className: 'hotspot give', testId: 'yard-give', label: 'yard.give', hintAnchor: 'give' },
  'yard-grab': { className: 'hotspot grab', testId: 'yard-grab', label: 'yard.grab' },
  'hall-mural': { className: 'hotspot mural', testId: 'hall-mural', label: 'island.mural', hintAnchor: 'mural-entrance' },
  'hall-stamps': { className: 'hotspot stamps', testId: 'hall-stamps', label: 'hall.stamps' },
  'hall-tattoo': { className: 'hotspot tattoo', testId: 'hall-tattoo', label: 'mural.tattoo' },
  'path-stop': { className: 'hotspot stop', testId: 'path-stop', label: 'path.stop', hintAnchor: 'path-stop' },
  'path-step': { className: 'hotspot step', testId: 'path-step', label: 'path.step' },
  'night-read': { className: 'hotspot read', testId: 'night-read', label: 'night.read', hintAnchor: 'old-layer' },
  'night-memory': { className: 'hotspot memory', testId: 'night-memory', label: 'menu.memory' },
  'act:dba.word.eat': { className: 'hotspot act', testId: 'act-dba.word.eat', label: 'act.mark', aria: 'act.mark', glyph: 'dba.word.eat' },
  'act:dba.word.drink': { className: 'hotspot act', testId: 'act-dba.word.drink', label: 'act.mark', aria: 'act.mark', glyph: 'dba.word.drink' },
  'act:dba.word.walk': { className: 'hotspot act', testId: 'act-dba.word.walk', label: 'act.mark', aria: 'act.mark', glyph: 'dba.word.walk' },
  'act:dba.word.take': { className: 'hotspot act', testId: 'act-dba.word.take', label: 'act.mark', aria: 'act.mark', glyph: 'dba.word.take' },
  'act:dba.word.me': { className: 'hotspot act', testId: 'act-dba.word.me', label: 'act.mark', aria: 'act.mark', glyph: 'dba.word.me' },
  'act:dba.word.you': { className: 'hotspot act', testId: 'act-dba.word.you', label: 'act.mark', aria: 'act.mark', glyph: 'dba.word.you' },
  'act:dba.word.home': { className: 'hotspot act', testId: 'act-dba.word.home', label: 'act.mark', aria: 'act.mark', glyph: 'dba.word.home' },
  'act:dba.word.amount:more': { className: 'hotspot pile more', testId: 'amount-more', label: 'act.mark', aria: 'act.mark' },
  'act:dba.word.amount:less': { className: 'hotspot pile less', testId: 'amount-less', label: 'act.mark', aria: 'act.mark' },
  'act:dba.word.size:a': { className: 'hotspot fish-a', testId: 'size-a', label: 'act.mark', aria: 'act.mark', glyph: 'dba.word.fish' },
  'act:dba.word.size:b': { className: 'hotspot fish-b', testId: 'size-b', label: 'act.mark', aria: 'act.mark', glyph: 'dba.word.fish' },
};

const GATE_LABEL: Record<IslandScene, MessageKey> = {
  'dba.scene.shore': 'nav.shore',
  'dba.scene.camp': 'nav.camp',
  'dba.scene.yard': 'nav.yard',
  'dba.scene.hall': 'nav.hall',
  'dba.scene.path': 'nav.path',
  'dba.scene.night': 'nav.night',
};

export function gateLabel(scene: IslandScene): string {
  return t(GATE_LABEL[scene]);
}

export function visibleSpots(
  scene: IslandScene,
  save: SaveData,
  hint: { level: number; anchor: string; wordId: string | null },
): SpotView[] {
  return SPOTS[scene]
    .filter((spot) => {
      if (spot.id === 'hall-tattoo') return isLearnedState(save.words[BETRAY]?.state);
      if (spot.id === 'night-memory') return save.memories.includes('dba.mem.rain-night');
      return true;
    })
    .map((spot) => {
      const spec = VIEWS[spot.id];
      if (!spec) throw new Error(`Missing spot view ${spot.id}`);
      return {
        ...spot,
        className: `${spec.className} ${hintMark(hint, spec.hintAnchor ?? spot.id, spec.hintWord)}`.trim(),
        testId: spec.testId,
        label: spec.glyph || spec.aria ? '' : t(spec.label),
        ariaLabel: spec.aria ? t(spec.aria) : undefined,
        glyph: spec.glyph,
      };
    });
}

export function hintSpotId(scene: IslandScene, anchor: HintAnchor): string | null {
  if (anchor === 'mural-entrance') return scene === 'dba.scene.hall' ? 'hall-mural' : 'island-mural';
  if (anchor === 'gourd') return 'island-gourd';
  if (anchor === 'driftwood') return 'shore-driftwood';
  if (anchor === 'sleep') return 'camp-sleep';
  if (anchor === 'give') return 'yard-give';
  if (anchor === 'path-stop') return 'path-stop';
  if (anchor === 'old-layer') return 'night-read';
  if (anchor === 'depart') return 'shore-depart';
  return null;
}
