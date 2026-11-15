import { sceneAssembly } from './catalog';

export const FIRST_SCREEN_SCENE = 'dba.scene.shore';
export const FIRST_SCREEN_TRAVELER = 'idle-front-01.png';
/** Opening companion landing on shore, not a walk/leap cycle. */
export const FIRST_SCREEN_TRAJ = 'land-companion';

export function firstScreenAssetIds(scene = FIRST_SCREEN_SCENE, companion = FIRST_SCREEN_TRAJ, painted = false): string[] {
  const kit = sceneAssembly(scene);
  const ids = painted && kit ? [`art.${scene.split('.').at(-1)}.landscape`] : (kit?.slots ?? [])
    .map((slot) => slot.asset)
    .filter((asset): asset is string => Boolean(asset));
  if (painted) {
    // Standing companion is required below; its pose sheet preloads in
    // WalkLayer and can fall back to that full figure if optional art fails.
    ids.push('action-reach-01.png');
    // Only the camp has a seated-rest action. Do not make its extra sheet a
    // prerequisite for entering or resuming in another scene.
    if (scene === 'dba.scene.camp') ids.push('settle-down-01.png');
    if (scene === 'dba.scene.shore') ids.push('art.shore.carried');
    if (scene === 'dba.scene.yard') ids.push('art.yard.shared');
  }
  // A complete scene includes its actors, even after a cold resume elsewhere.
  ids.push(FIRST_SCREEN_TRAVELER, 'stride-front-01.png', companion);
  return [...new Set(ids)];
}

export function isFirstScreenRequired(id: string, scene = FIRST_SCREEN_SCENE): boolean {
  return firstScreenAssetIds(scene).includes(id);
}
