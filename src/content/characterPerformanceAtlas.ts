import {PAINTED_ACTORS,paintedTravelerFrame,paintedCatFrame,paintedCatSource} from './paintedActors';
const travelerUrl=PAINTED_ACTORS.settle,companionUrl=PAINTED_ACTORS['cat-performance'];

/** Fixed camera/cell scale. Only the measured ground-contact baseline varies;
 * neither seated nor curled bodies are enlarged to match standing bounds. */
export const SETTLE_ATLAS = { url: travelerUrl, width: 1536, height: 1024 } as const;
export const SETTLE_FILES = {
  lie: [1, 2, 3, 4].map(n => `settle-down-0${n}.png`),
  rise: [1, 2, 3, 4].map(n => `settle-up-0${n}.png`),
};
export const SETTLE_ATLAS_FILES = Object.values(SETTLE_FILES).flat();
export function settleAtlasFrame(file: string) {
  return SETTLE_ATLAS_FILES.includes(file)?paintedTravelerFrame(file):null;
}
export function settleAtlasSource(src: string) {
  return src.startsWith(`${travelerUrl}#`) ? settleAtlasFrame(src.slice(travelerUrl.length + 1)) : null;
}

export const COMPANION_ATLAS = { url: companionUrl, width: 1536, height: 1024 } as const;
export const COMPANION_PERFORMANCE_IDS = ['observe-01', 'observe-02', 'point-01', 'point-02', 'settle-01', 'settle-02', 'curl-01', 'curl-02'].map(id => `pose-${id}`);
export function companionAtlasFrame(file: string) {
  return COMPANION_PERFORMANCE_IDS.includes(file)?paintedCatFrame(file):null;
}
export function companionAtlasSource(src: string | undefined) {
  return paintedCatSource(src);
}
