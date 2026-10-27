import type { HintAnchor } from '../core/hints';
import type { IslandScene } from '../core/island';
import type { SaveData } from '../core/schema';
import { SPOTS, type Spot } from '../core/stage';
import { isLearnedState } from '../core/words';
import { t, type MessageKey } from './i18n';
import { hintMark } from './hintMark';

const BETRAY = 'myp.word.betray';

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
  'fishery-give': { className: 'hotspot give', testId: 'fishery-give', label: 'fishery.give', hintAnchor: 'give' },
  'fishery-grab': { className: 'hotspot grab', testId: 'fishery-grab', label: 'fishery.grab' },
  'rock-mural': { className: 'hotspot mural', testId: 'rock-mural', label: 'island.mural', hintAnchor: 'mural-entrance' },
  'rock-stamps': { className: 'hotspot stamps', testId: 'rock-stamps', label: 'rock.stamps' },
  'rock-tattoo': { className: 'hotspot tattoo', testId: 'rock-tattoo', label: 'mural.tattoo' },
  'forest-stop': { className: 'hotspot stop', testId: 'forest-stop', label: 'forest.stop', hintAnchor: 'forest-stop' },
  'forest-step': { className: 'hotspot step', testId: 'forest-step', label: 'forest.step' },
  'night-read': { className: 'hotspot read', testId: 'night-read', label: 'night.read', hintAnchor: 'old-layer' },
  'night-memory': { className: 'hotspot memory', testId: 'night-memory', label: 'menu.memory' },
  'act:myp.word.eat': { className: 'hotspot act', testId: 'act-myp.word.eat', label: 'act.mark', aria: 'act.mark', glyph: 'myp.word.eat' },
  'act:myp.word.drink': { className: 'hotspot act', testId: 'act-myp.word.drink', label: 'act.mark', aria: 'act.mark', glyph: 'myp.word.drink' },
  'act:myp.word.walk': { className: 'hotspot act', testId: 'act-myp.word.walk', label: 'act.mark', aria: 'act.mark', glyph: 'myp.word.walk' },
  'act:myp.word.take': { className: 'hotspot act', testId: 'act-myp.word.take', label: 'act.mark', aria: 'act.mark', glyph: 'myp.word.take' },
  'act:myp.word.me': { className: 'hotspot act', testId: 'act-myp.word.me', label: 'act.mark', aria: 'act.mark', glyph: 'myp.word.me' },
  'act:myp.word.you': { className: 'hotspot act', testId: 'act-myp.word.you', label: 'act.mark', aria: 'act.mark', glyph: 'myp.word.you' },
  'act:myp.word.home': { className: 'hotspot act', testId: 'act-myp.word.home', label: 'act.mark', aria: 'act.mark', glyph: 'myp.word.home' },
  'act:myp.word.amount:more': { className: 'hotspot pile more', testId: 'amount-more', label: 'act.mark', aria: 'act.mark' },
  'act:myp.word.amount:less': { className: 'hotspot pile less', testId: 'amount-less', label: 'act.mark', aria: 'act.mark' },
  'act:myp.word.size:a': { className: 'hotspot fish-a', testId: 'size-a', label: 'act.mark', aria: 'act.mark', glyph: 'myp.word.fish' },
  'act:myp.word.size:b': { className: 'hotspot fish-b', testId: 'size-b', label: 'act.mark', aria: 'act.mark', glyph: 'myp.word.fish' },
};

const GATE_LABEL: Record<IslandScene, MessageKey> = {
  'myp.scene.shore': 'nav.shore',
  'myp.scene.camp': 'nav.camp',
  'myp.scene.fishery': 'nav.fishery',
  'myp.scene.rock': 'nav.rock',
  'myp.scene.forest': 'nav.forest',
  'myp.scene.night': 'nav.night',
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
      if (spot.id === 'rock-tattoo') return isLearnedState(save.words[BETRAY]?.state);
      if (spot.id === 'night-memory') return save.memories.includes('myp.mem.rain-night');
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
  if (anchor === 'mural-entrance') return scene === 'myp.scene.rock' ? 'rock-mural' : 'island-mural';
  if (anchor === 'gourd') return 'island-gourd';
  if (anchor === 'driftwood') return 'shore-driftwood';
  if (anchor === 'sleep') return 'camp-sleep';
  if (anchor === 'give') return 'fishery-give';
  if (anchor === 'forest-stop') return 'forest-stop';
  if (anchor === 'old-layer') return 'night-read';
  if (anchor === 'depart') return 'shore-depart';
  return null;
}
