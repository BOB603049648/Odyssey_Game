import { sceneAssembly } from './catalog';

export const FIRST_SCREEN_SCENE = 'dba.scene.shore';
export const FIRST_SCREEN_TRAVELER = 'idle-front-01.png';
/** Opening companion landing on shore, not a walk/leap cycle. */
export const FIRST_SCREEN_TRAJ = 'land-shore-driftwood';

export function firstScreenAssetIds(scene = FIRST_SCREEN_SCENE): string[] {
  const kit = sceneAssembly(scene);
  const ids = (kit?.slots ?? [])
    .map((slot) => slot.asset)
    .filter((asset): asset is string => Boolean(asset));
  if (scene === FIRST_SCREEN_SCENE) {
    ids.push(FIRST_SCREEN_TRAVELER, FIRST_SCREEN_TRAJ);
  }
  return ids;
}

export function isFirstScreenRequired(id: string, scene = FIRST_SCREEN_SCENE): boolean {
  return firstScreenAssetIds(scene).includes(id);
}
