import { getShoreVisualProfile } from '../dev/shoreVisualProfile';

/**
 * Compile-time URL map. Eager glob inlines hashed URLs in the app bundle
 * so the client does not fetch a tiny JS wrapper per image. This does not
 * download the bitmaps themselves.
 */
const slotModules = import.meta.glob<string>(['../assets/art/slots/*.{png,webp,jpg,jpeg}', '!../assets/art/slots/art.shore.ground.clean.jpg'], {
  eager: true,
  import: 'default',
});
// URL metadata only: excluded from allSlotIds, so baseline preload never requests it.
const sampleGroundModules = import.meta.glob<string>('../assets/art/slots/art.shore.ground.clean.jpg', {
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
const travelers = preferUrl(travelerModules);
const trajs = preferUrl(trajModules);

export function slotAssetUrl(id: string): string | undefined {
  if (stemOf(id) === 'art.shore.ground' && getShoreVisualProfile().variant === 'candidate') {
    return Object.values(sampleGroundModules)[0];
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
