import { ACTION_ATLAS, ACTION_ATLAS_FILES, actionAtlasFrame } from '../content/travelerActionAtlas';
import { travelerFrameUrl } from '../content/assetUrls';
import { notifyAssetUpdates } from '../content/assetUpdates';
import { recordLoadTrace } from '../content/loadTrace';
import { decodeAssetUrl } from '../content/decodedImage';
import { loadGated } from '../content/loadGate';
import { WALK_ATLAS, WALK_ATLAS_FILES, walkAtlasFrame } from '../content/travelerWalkAtlas';
import { SETTLE_ATLAS, SETTLE_ATLAS_FILES, settleAtlasFrame } from '../content/characterPerformanceAtlas';

const cache = new Map<string, string>();

export function frameUrl(file: string): string | undefined {
  return cache.get(file) ?? (file ? cache.get(file.replace(/\.(png|webp)$/i, '') + '.png') : undefined);
}

export function forgetFrame(file: string): void {
  recordLoadTrace({ event: 'forget', key: file });
  if (settleAtlasFrame(file)) {
    cache.delete('settle-atlas.png');
    for (const id of SETTLE_ATLAS_FILES) cache.delete(id);
    notifyAssetUpdates(); return;
  }
  if (walkAtlasFrame(file) || actionAtlasFrame(file)) {
    cache.delete(actionAtlasFrame(file) ? 'action-atlas.png' : 'stride-atlas.png');
    for (const id of actionAtlasFrame(file) ? ACTION_ATLAS_FILES : WALK_ATLAS_FILES) cache.delete(id);
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
  if (settleAtlasFrame(file)) {
    return loadGated('traveler-settle-atlas', 'idle', () => decodeAssetUrl(SETTLE_ATLAS.url), cache,
      { defer: true, cacheKey: 'settle-atlas.png' }).then(next => {
      if (!next) return '';
      for (const id of SETTLE_ATLAS_FILES) cache.set(id, travelerFrameUrl(id)!);
      return cache.get(file)!;
    });
  }
  if (walkAtlasFrame(file) || actionAtlasFrame(file)) {
    const action = Boolean(actionAtlasFrame(file));
    const atlas = action ? ACTION_ATLAS : WALK_ATLAS;
    // Decode the sheet once, then publish every cell together. Turning or taking
    // the first step cannot race twelve independent requests for the same image.
    return loadGated(action ? 'traveler-action-atlas' : 'traveler-walk-atlas', 'idle', () => decodeAssetUrl(atlas.url), cache,
      { defer: true, cacheKey: action ? 'action-atlas.png' : 'stride-atlas.png' }).then(next => {
      if (!next) return '';
      for (const id of action ? ACTION_ATLAS_FILES : WALK_ATLAS_FILES) cache.set(id, travelerFrameUrl(id)!);
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
  const modules = import.meta.glob<string>(['../assets/traveler/*.{png,webp}', '!../assets/traveler/settle-atlas.png'], {
    eager: true,
    import: 'default',
  });
  const files = Object.keys(modules).map((path) => path.split('/').pop()!);
  await Promise.all([...files, ...WALK_ATLAS_FILES, ...ACTION_ATLAS_FILES, ...SETTLE_ATLAS_FILES].map((file) => loadFrame(file)));
}
