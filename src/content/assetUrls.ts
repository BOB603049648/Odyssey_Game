import paintedShore from '../assets/art/painted/shore-scene.webp';
import companionStanding from '../assets/companion/nanaicha/nanaicha-hero.png';
import { WALK_ATLAS, WALK_ATLAS_FILES } from './travelerWalkAtlas';

/**
 * Compile-time URL map. Eager glob inlines hashed URLs in the app bundle
 * so the client does not fetch a tiny JS wrapper per image. This does not
 * download the bitmaps themselves.
 */
const slotModules = import.meta.glob<string>(['../assets/art/slots/*.{png,webp,jpg,jpeg}', '!../assets/art/slots/art.shore.ground.clean.jpg'], {
  eager: true,
  import: 'default',
});
// The repaired ground is reached through the canonical ground ID, never preloaded twice.
const repairedGroundModules = import.meta.glob<string>('../assets/art/slots/art.shore.ground.clean.jpg', {
  eager: true,
  import: 'default',
});
const travelerModules = import.meta.glob<string>('../assets/traveler/*.{png,webp}', {
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
const travelers = preferUrl(travelerModules);
for (const file of WALK_ATLAS_FILES) travelers.set(file, `${WALK_ATLAS.url}#${file}`);
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
