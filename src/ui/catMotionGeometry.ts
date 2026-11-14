import { isStandingCompanionUrl, trajAssetUrl } from '../content/assetUrls';
import { companionFoot, companionSole } from '../core/companionPost';
import { companionAtlasSource } from '../content/characterPerformanceAtlas';

export const STANDING_CAT_FOOT = { x: .5, y: 1054 / 1152 } as const;
const STANDING_HEIGHT = .08;
const STANDING_OPAQUE_HEIGHT = 1076 - 44;
const LEAP_OPAQUE_HEIGHT = 1144 - 315;

/** Geometry belongs to the bitmap actually displayed, including a held frame.
 * Match visible body height across differently padded standing/leap canvases. */
export function catMotionGeometry(originalUrl: string | undefined, scene: string, _requestedFrame: string, _face: 'left' | 'right') {
  const nominalHeight = scene === 'dba.scene.shore' ? .168 : .22;
  const performance = companionAtlasSource(originalUrl);
  if (performance) return { foot: { x: .5, y: performance.sole / performance.height }, sole: performance.sole / performance.height, heightScale: STANDING_HEIGHT / nominalHeight };
  if (isStandingCompanionUrl(originalUrl)) {
    return { foot: STANDING_CAT_FOOT, sole: STANDING_CAT_FOOT.y, heightScale: STANDING_HEIGHT / nominalHeight };
  }
  const leap = ['leap-01','leap-02'].find(id => originalUrl && originalUrl === trajAssetUrl(id));
  if (leap) {
    return { foot: companionFoot(leap), sole: companionSole(leap), heightScale: STANDING_HEIGHT * STANDING_OPAQUE_HEIGHT / LEAP_OPAQUE_HEIGHT / nominalHeight };
  }
  return { foot: companionFoot('fallback'), sole: companionSole('fallback'), heightScale: 1 };
}
