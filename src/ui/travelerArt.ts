import { travelerFrameUrl } from '../content/assetUrls';
import { notifyAssetUpdates } from '../content/assetUpdates';
import { recordLoadTrace } from '../content/loadTrace';
import { decodeAssetUrl } from '../content/decodedImage';
import { loadGated } from '../content/loadGate';
import { WALK_ATLAS, WALK_ATLAS_FILES, walkAtlasFrame } from '../content/travelerWalkAtlas';

const cache = new Map<string, string>();

export function frameUrl(file: string): string | undefined {
  return cache.get(file) ?? (file ? cache.get(file.replace(/\.(png|webp)$/i, '') + '.png') : undefined);
}

export function forgetFrame(file: string): void {
  recordLoadTrace({ event: 'forget', key: file });
  if (walkAtlasFrame(file)) {
    cache.delete('stride-atlas.png');
    for (const id of WALK_ATLAS_FILES) cache.delete(id);
    notifyAssetUpdates();
    return;
  }
  const key = cache.has(file) ? file : file.replace(/\.(png|webp)$/i, '') + '.png';
  if (!cache.has(file) && !cache.has(key)) return;
  cache.delete(file);
  cache.delete(key);
  notifyAssetUpdates();
}

export function hasFrame(file: string): boolean {
  return Boolean(travelerFrameUrl(file));
}

export function loadFrame(file: string): Promise<string> {
  const hit = cache.get(file);
  if (hit) return Promise.resolve(hit);
  const url = travelerFrameUrl(file);
  if (!url) return Promise.resolve('');
  if (walkAtlasFrame(file)) {
    // Decode the sheet once, then publish every cell together. Turning or taking
    // the first step cannot race twelve independent requests for the same image.
    return loadGated('traveler-walk-atlas', 'idle', () => decodeAssetUrl(WALK_ATLAS.url), cache,
      { defer: true, cacheKey: 'stride-atlas.png' }).then(next => {
      if (!next) return '';
      for (const id of WALK_ATLAS_FILES) cache.set(id, travelerFrameUrl(id)!);
      return cache.get(file)!;
    });
  }
  return loadGated(`frame:${file}`, 'idle', () => decodeAssetUrl(url), cache, { defer: true, cacheKey: file }).then(
    (next) => next ?? '',
  );
}

export function loadFrames(files: readonly string[]): Promise<string[]> {
  return Promise.all(files.map((name) => loadFrame(name)));
}

if (import.meta.env.MODE === 'test') {
  const modules = import.meta.glob<string>('../assets/traveler/*.{png,webp}', {
    eager: true,
    import: 'default',
  });
  const files = Object.keys(modules).map((path) => path.split('/').pop()!);
  await Promise.all([...files, ...WALK_ATLAS_FILES].map((file) => loadFrame(file)));
}
