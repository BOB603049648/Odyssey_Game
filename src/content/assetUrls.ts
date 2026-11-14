const paintedScenes = import.meta.glob<string>('../assets/art/painted/*-scene.webp', { eager: true, import: 'default' });
const sceneStates = import.meta.glob<string>('../assets/art/states/*.webp', { eager: true, import: 'default' });
import paintedShore from '../assets/art/painted/shore-scene.webp';
import prologueStorm from '../assets/art/painted/prologue-storm.webp';
import prologueDark from '../assets/art/painted/prologue-dark.webp';
import prologueBreak from '../assets/art/painted/prologue-break.webp';
import prologueTide from '../assets/art/painted/prologue-tide.webp';
import companionStanding from '../assets/companion/nanaicha/nanaicha-hero.png';
import { ACTION_ATLAS, ACTION_ATLAS_FILES } from './travelerActionAtlas';
import { WALK_ATLAS, WALK_ATLAS_FILES } from './travelerWalkAtlas';
import { COMPANION_ATLAS, COMPANION_PERFORMANCE_IDS, SETTLE_ATLAS, SETTLE_ATLAS_FILES } from './characterPerformanceAtlas';

/**
 * Compile-time URL map. Eager glob inlines hashed URLs in the app bundle
 * so the client does not fetch a tiny JS wrapper per image. This does not
 * download the bitmaps themselves.
 */
const prologuePortraits = import.meta.glob<string>('../assets/art/painted/prologue-*-portrait.webp', { eager: true, import: 'default' });
const slotModules = import.meta.glob<string>(['../assets/art/slots/*.{png,webp,jpg,jpeg}', '!../assets/art/slots/art.shore.ground.clean.jpg'], {
  eager: true,
  import: 'default',
});
// The repaired ground is reached through the canonical ground ID, never preloaded twice.
const repairedGroundModules = import.meta.glob<string>('../assets/art/slots/art.shore.ground.clean.jpg', {
  eager: true,
  import: 'default',
});
const travelerModules = import.meta.glob<string>(['../assets/traveler/*.{png,webp}', '!../assets/traveler/settle-atlas.png'], {
  eager: true,
  import: 'default',
});
const trajModules = import.meta.glob<string>('../assets/companion/nanaicha/traj/*.{png,webp}', {
  eager: true,
  import: 'default',
});

function fileName(path: string): string {
  return path.split('/').pop()!;
}

function stemOf(name: string): string {
  return name.replace(/\.(png|webp|jpe?g)$/i, '');
}

function preferUrl(mods: Record<string, string>): Map<string, string> {
  const byStem = new Map<string, { path: string; url: string }>();
  for (const [path, url] of Object.entries(mods)) {
    const name = fileName(path);
    const stem = stemOf(name);
    const current = byStem.get(stem);
    if (current && !path.endsWith('.webp')) continue;
    byStem.set(stem, { path, url });
  }
  const map = new Map<string, string>();
  for (const [stem, entry] of byStem) {
    map.set(stem, entry.url);
    map.set(fileName(entry.path), entry.url);
  }
  return map;
}

const slots = preferUrl(slotModules);
slots.set('art.shore.landscape', paintedShore);
for (const [path, url] of Object.entries(sceneStates)) {
  if (path.endsWith('/shore-carried.webp')) slots.set('art.shore.carried', url);
  if (path.endsWith('/yard-shared.webp')) slots.set('art.yard.shared', url);
}
for (const [path, url] of Object.entries(paintedScenes)) {
  const name = /([a-z]+)-scene\.webp$/.exec(path)?.[1];
  if (name) slots.set(`art.${name}.landscape`, url);
}
// Keep narrative/save IDs stable while replacing the opening's old mixed styles.
for (const [id, url] of Object.entries({
  'art.pro.storm': prologueStorm, 'art.pro.dark': prologueDark,
  'art.pro.break': prologueBreak, 'art.pro.tide': prologueTide,
})) slots.set(id, url);
for (const [path, url] of Object.entries(prologuePortraits)) {
  const scene = /prologue-(\w+)-portrait\.webp$/.exec(path)?.[1];
  if (scene) slots.set(`art.pro.${scene}.portrait`, url);
}
const travelers = preferUrl(travelerModules);
for (const file of WALK_ATLAS_FILES) travelers.set(file, `${WALK_ATLAS.url}#${file}`);
for (const file of ACTION_ATLAS_FILES) travelers.set(file, `${ACTION_ATLAS.url}#${file}`);
for (const file of SETTLE_ATLAS_FILES) travelers.set(file, `${SETTLE_ATLAS.url}#${file}`);
const trajs = preferUrl(trajModules);
// One complete, registered standing silhouette. The historical landings contain
// missing bodies, embedded scenery and incompatible padding; do not ship them as
// animation fallbacks. Leap frames retain their independently reviewed artwork.
trajs.set('land-companion', companionStanding);
for (const id of [...trajs.keys()].filter(id => id.startsWith('land-'))) {
  // Fragments keep each narrative record's recovery identity; the browser still
  // downloads only the same content-hashed image, without query-string copies.
  trajs.set(id, `${companionStanding}#${id}`);
}
for (const id of COMPANION_PERFORMANCE_IDS) trajs.set(id, `${COMPANION_ATLAS.url}#${id}`);
for (const id of ['art.shore.prop.nanaicha', 'art.camp.prop.nanaicha', 'art.yard.prop.nanaicha']) {
  slots.set(id, companionStanding);
}

export function isStandingCompanionUrl(url: string | undefined): boolean {
  return !!url && (url === companionStanding || url.startsWith(`${companionStanding}#`));
}

export function slotAssetUrl(id: string): string | undefined {
  if (stemOf(id) === 'art.shore.ground') {
    return Object.values(repairedGroundModules)[0];
  }
  return slots.get(id) ?? slots.get(stemOf(id));
}

export function travelerFrameUrl(file: string): string | undefined {
  return travelers.get(file) ?? travelers.get(stemOf(file));
}

export function trajAssetUrl(id: string): string | undefined {
  return trajs.get(id) ?? trajs.get(stemOf(id));
}

export function allSlotIds(): string[] {
  return [...new Set([...slots.keys()].filter((key) => !/\.(png|webp|jpe?g)$/i.test(key)))];
}
