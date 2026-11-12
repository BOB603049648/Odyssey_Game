/** Delivered scene prop; not the broken 864x1152 Y0-specific trajectory. */
export const YARD_SCENE_CAT = {
  asset: 'art.yard.prop.nanaicha',
  width: 1280,
  height: 720,
  opaqueBounds: [465, 272, 816, 707],
} as const;

/** Existing CSS is a 3:4 box, contain, center bottom; do not enlarge it. */
export function yardSceneCatFoot(face: 'left' | 'right') {
  const [left, , right, bottom] = YARD_SCENE_CAT.opaqueBounds;
  const x = (left + right) / 2 / YARD_SCENE_CAT.width;
  const containedHeight = (3 / 4) / (YARD_SCENE_CAT.width / YARD_SCENE_CAT.height);
  return {
    x: face === 'left' ? 1 - x : x,
    y: 1 - (1 - bottom / YARD_SCENE_CAT.height) * containedHeight,
  };
}
