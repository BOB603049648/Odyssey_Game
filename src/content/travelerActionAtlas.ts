import atlasUrl from '../assets/traveler/action-atlas.png';

/** Authored shoulder/elbow/wrist and seated poses. Keep the full transparent
 * source; cells share a body scale and a measured ground-contact baseline. */
export const ACTION_ATLAS = { url: atlasUrl, width: 1448, height: 1086, cell: 362 } as const;
export const ACTION_FILES = {
  reach: [1, 2, 3, 4].map(i => `action-reach-0${i}.png`),
  drink: [1, 2, 3, 4].map(i => `action-drink-0${i}.png`),
  lie: [1, 2, 3, 4].map(i => `action-rest-0${i}.png`),
};
export const ACTION_ATLAS_FILES = Object.values(ACTION_FILES).flat();
export function actionAtlasFrame(file: string) {
  const index = ACTION_ATLAS_FILES.indexOf(file);
  if (index < 0) return null;
  const row = Math.floor(index / 4), column = index % 4;
  const width = 271.5, height = 362;
  return { file, x: column * 362 + 181 - width / 2, y: row * 362,
    width, height, sole: row === 2 ? 335 : 356,
    atlasWidth: ACTION_ATLAS.width, atlasHeight: ACTION_ATLAS.height };
}
export function actionAtlasSource(src: string) {
  return src.startsWith(`${atlasUrl}#`) ? actionAtlasFrame(src.slice(atlasUrl.length + 1)) : null;
}
