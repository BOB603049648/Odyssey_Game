import { slotAssetUrl, trajAssetUrl } from '../content/assetUrls';
import { companionFoot, companionSole } from '../core/companionPost';
import { LAND_BY_BEAT } from '../core/companionTraj';
import { YARD_SCENE_CAT, yardSceneCatFoot } from '../core/yardCatFallback';

/** Source alpha bounds, not anatomical/support certification. No pixels are changed. */
const LEAP_OPAQUE_HEIGHT = 1144 - 315;
const DEFAULT_VISIBLE_HEIGHT = (707 - 272) * (3 / 4) / 1280;
const YARD_LEAP_SCALE = DEFAULT_VISIBLE_HEIGHT / (LEAP_OPAQUE_HEIGHT / 1152);
const frames = [...new Set([...Object.values(LAND_BY_BEAT), 'leap-01', 'leap-02'])];

/** originalUrl belongs to the bitmap actually rendered by the persistent owner (raw or blob). */
export function catMotionGeometry(originalUrl: string | undefined, scene: string, requestedFrame: string, face: 'left' | 'right') {
  const isYardDefault = !!originalUrl && originalUrl === slotAssetUrl(YARD_SCENE_CAT.asset);
  const frame = frames.find(id => originalUrl && trajAssetUrl(id) === originalUrl) ?? (originalUrl ? 'fallback' : requestedFrame);
  const foot = isYardDefault ? yardSceneCatFoot(face) : companionFoot(frame);
  return {
    foot,
    sole: isYardDefault ? foot.y : companionSole(frame),
    heightScale: scene === 'dba.scene.yard' && !isYardDefault && (frame === 'leap-01' || frame === 'leap-02') ? YARD_LEAP_SCALE : 1,
  };
}
