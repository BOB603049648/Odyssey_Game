import atlasUrl from '../assets/traveler/stride-eight-atlas.webp';

/** Eight authored poses per complete left/right cycle, front / right / back.
 * Cells retain their source geometry and alpha; RGB uses WebP quality 92.
 * Crop at presentation time, without resampling individual poses.
 * Registration uses the torso axis and the planted boot, never the coat's bounds.
 */
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
export const WALK_ATLAS = { url: atlasUrl, width: 3072, height: 1536, cellWidth: 384, cellHeight: 512 } as const;
export const WALK_ATLAS_FILES = ['front', 'side', 'back'].flatMap(sheet =>
  Array.from({ length: WALK_FRAME_COUNT }, (_, frame) => `stride-${sheet}-0${frame + 1}.png`));
const soles = [[475, 472, 472, 472, 476, 471, 471, 470],
  [477, 477, 476, 477, 477, 477, 477, 477], [480, 480, 480, 480, 481, 477, 481, 481]];

export function walkAtlasFrame(file: string) {
  const index = WALK_ATLAS_FILES.indexOf(file);
  if (index < 0) return null;
  const row = Math.floor(index / WALK_FRAME_COUNT), column = index % WALK_FRAME_COUNT;
  const width = 372, height = 496;
  return { file, x: column * WALK_ATLAS.cellWidth + 6,
    y: row * WALK_ATLAS.cellHeight, width, height, sole: soles[row][column] };
}

export function walkAtlasSource(src: string) {
  if (!src.startsWith(`${atlasUrl}#`)) return null;
  return walkAtlasFrame(src.slice(atlasUrl.length + 1));
}
