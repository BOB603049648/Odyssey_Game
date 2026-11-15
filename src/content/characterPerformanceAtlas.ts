import travelerUrl from '../assets/traveler/settle-atlas.webp';
import companionUrl from '../assets/companion/nanaicha/performance-atlas.webp';

/** Fixed camera/cell scale. Only the measured ground-contact baseline varies;
 * neither seated nor curled bodies are enlarged to match standing bounds. */
export const SETTLE_ATLAS = { url: travelerUrl, width: 1536, height: 1024 } as const;
export const SETTLE_FILES = {
  lie: [1, 2, 3, 4].map(n => `settle-down-0${n}.png`),
  rise: [1, 2, 3, 4].map(n => `settle-up-0${n}.png`),
};
export const SETTLE_ATLAS_FILES = Object.values(SETTLE_FILES).flat();
export function settleAtlasFrame(file: string) {
  const index = SETTLE_ATLAS_FILES.indexOf(file);
  if (index < 0) return null;
  return { file, x: index % 4 * 384 + 12, y: Math.floor(index / 4) * 512,
    width: 360, height: 480, sole: [479, 479, 478, 477, 477, 473, 479, 479][index],
    atlasWidth: SETTLE_ATLAS.width, atlasHeight: SETTLE_ATLAS.height };
}
export function settleAtlasSource(src: string) {
  return src.startsWith(`${travelerUrl}#`) ? settleAtlasFrame(src.slice(travelerUrl.length + 1)) : null;
}

export const COMPANION_ATLAS = { url: companionUrl, width: 1536, height: 1024 } as const;
export const COMPANION_PERFORMANCE_IDS = ['observe-01', 'observe-02', 'point-01', 'point-02', 'settle-01', 'settle-02', 'curl-01', 'curl-02'].map(id => `pose-${id}`);
export function companionAtlasFrame(file: string) {
  const index = COMPANION_PERFORMANCE_IDS.indexOf(file);
  if (index < 0) return null;
  return { file, x: index % 4 * 384, y: Math.floor(index / 4) * 512,
    width: 384, height: 512, sole: index < 4 ? 493 : 453 };
}
export function companionAtlasSource(src: string | undefined) {
  return src?.startsWith(`${companionUrl}#`) ? companionAtlasFrame(src.slice(companionUrl.length + 1)) : null;
}
