import atlasUrl from '../assets/traveler/stride-atlas.png';

/** Generated contact / passing / opposite contact / passing, front / right / back.
 * Keep the complete source atlas; crop at presentation time, without resampling.
 * Registration uses the torso axis and the planted boot, never the coat's bounds.
 */
export const WALK_ATLAS = { url: atlasUrl, width: 1448, height: 1086, cell: 362 } as const;
export const WALK_ATLAS_FILES = ['front', 'side', 'back'].flatMap(sheet =>
  [1, 2, 3, 4].map(frame => `stride-${sheet}-0${frame}.png`));
const soles = [[342, 342, 342, 337], [335, 335, 335, 335], [337, 332, 337, 333]];

export function walkAtlasFrame(file: string) {
  const index = WALK_ATLAS_FILES.indexOf(file);
  if (index < 0) return null;
  const row = Math.floor(index / 4), column = index % 4;
  const width = 249, height = 332;
  return { file, x: column * 362 + 182 - width / 2,
    y: row * 362 + soles[row][column] - height, width, height };
}

export function walkAtlasSource(src: string) {
  if (!src.startsWith(`${atlasUrl}#`)) return null;
  return walkAtlasFrame(src.slice(atlasUrl.length + 1));
}
