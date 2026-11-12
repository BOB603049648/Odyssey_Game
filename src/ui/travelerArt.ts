import { travelerFrameUrl } from '../content/assetUrls';
import { notifyAssetUpdates } from '../content/assetUpdates';
import { recordLoadTrace } from '../content/loadTrace';
import { decodeAssetUrl } from '../content/decodedImage';
import { loadGated } from '../content/loadGate';

const cache = new Map<string, string>();

export function frameUrl(file: string): string | undefined {
  return cache.get(file) ?? (file ? cache.get(file.replace(/\.(png|webp)$/i, '') + '.png') : undefined);
}

export function forgetFrame(file: string): void {
  recordLoadTrace({ event: 'forget', key: file });
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
  await Promise.all(files.map((file) => loadFrame(file)));
}
