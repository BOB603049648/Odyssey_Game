import {PAINTED_ACTORS,paintedTravelerFrame} from './paintedActors';
const atlasUrl=PAINTED_ACTORS.action;

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
  return ACTION_ATLAS_FILES.includes(file)?paintedTravelerFrame(file):null;
}
export function actionAtlasSource(src: string) {
  return src.startsWith(`${atlasUrl}#`) ? actionAtlasFrame(src.slice(atlasUrl.length + 1)) : null;
}
