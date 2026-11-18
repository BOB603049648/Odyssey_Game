import {PAINTED_ACTORS,ACTOR_REGISTRATION,paintedTravelerFrame} from './paintedActors';
const atlasUrl=PAINTED_ACTORS.walk;

/** Eight painterly poses per complete cycle, front / right / back.
 * Original generated PNGs are preserved. Source-measured registration keeps
 * torso roots and soles stable; a uniform scale per facing preserves gait bob. */
export const WALK_FRAME_COUNT = 8;
export const WALK_CONTACT_FRAMES = [0, 4] as const;
/** At most one audible contact after a dropped display frame; never queue
 * missed steps or replay a held pose. Contacts belong to the displayed cycle. */
export function crossedWalkContact(previous: number, current: number): number | null {
  if (previous < 0) return WALK_CONTACT_FRAMES.some(frame => frame === current) ? current : null;
  const advanced = (current - previous + WALK_FRAME_COUNT) % WALK_FRAME_COUNT;
  let contact: number | null = null;
  for (let offset = 1; offset <= advanced; offset++) {
    const frame = (previous + offset) % WALK_FRAME_COUNT;
    if (WALK_CONTACT_FRAMES.some(value => value === frame)) contact = frame;
  }
  return contact;
}
export const WALK_ATLAS = { url: atlasUrl, width: ACTOR_REGISTRATION.walk.width, height: ACTOR_REGISTRATION.walk.height } as const;
export const WALK_ATLAS_FILES = ['front', 'side', 'back'].flatMap(sheet =>
  Array.from({ length: WALK_FRAME_COUNT }, (_, frame) => `stride-${sheet}-0${frame + 1}.png`));
export function walkAtlasFrame(file: string) {
  return WALK_ATLAS_FILES.includes(file)?paintedTravelerFrame(file):null;
}

export function walkAtlasSource(src: string) {
  if (!src.startsWith(`${atlasUrl}#`)) return null;
  return walkAtlasFrame(src.slice(atlasUrl.length + 1));
}
