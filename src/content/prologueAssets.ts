import { slotAssetUrl } from './assetUrls';
import { decodeAssetUrl } from './decodedImage';
import { recordLoadTrace } from './loadTrace';

export const PROLOGUE_ART = ['art.pro.storm', 'art.pro.dark', 'art.pro.break', 'art.pro.tide'] as const;
export const prologueArtId = (step: number, portrait: boolean) => PROLOGUE_ART[step] + (portrait ? '.portrait' : '');
export const initialProloguePortrait = () => window.innerWidth / Math.max(1, window.innerHeight - 316) < 1.09;
const previews = import.meta.glob<string>('../assets/art/prologue-light/*.webp', { eager: true, import: 'default' });
const urls = new Map(Object.entries(previews).map(([path, url]) => {
  const [, scene, portrait] = /prologue-(\w+)(-portrait)?-preview\.webp$/.exec(path)!;
  return [`art.pro.${scene}${portrait ? '.portrait' : ''}`, url];
}));
type Quality = 'preview' | 'detail';
const cache = new Map<string, string>();
const pending = new Map<string, Promise<string | null>>();
const keyOf = (id: string, quality: Quality) => `prologue:${quality}:${id}`;

export function resolvePrologueImage(id: string): string | null {
  return cache.get(keyOf(id, 'detail')) ?? cache.get(keyOf(id, 'preview')) ?? null;
}

export function forgetPrologueImage(id: string, src: string): void {
  for (const quality of ['preview', 'detail'] as const) {
    const key = keyOf(id, quality);
    if (cache.get(key) === src) { cache.delete(key); recordLoadTrace({ event: 'forget', key }); }
  }
}

/** The small complete paintings must not queue behind island atlases or full
 * resolution upgrades. Only the current shot and one sequential warmup fetch
 * use this path; callers stop warmup when their screen/orientation changes. */
function load(id: string, quality: Quality, priority: 'high' | 'low'): Promise<string | null> {
  const key = keyOf(id, quality);
  const hit = cache.get(key);
  if (hit) return Promise.resolve(hit);
  if (pending.has(key)) return pending.get(key)!;
  const url = quality === 'preview' ? urls.get(id) : slotAssetUrl(id);
  if (!url) return Promise.resolve(null);
  recordLoadTrace({ event: 'start', key });
  const job = decodeAssetUrl(url, { priority, timeout: quality === 'preview' ? 8_000 : 12_000 })
    .then(src => { cache.set(key, src); recordLoadTrace({ event: 'ok', key }); return src; })
    .catch(error => {
      recordLoadTrace({ event: /timed out/i.test(String(error)) ? 'timeout' : 'fail', key });
      return null;
    }).finally(() => pending.delete(key));
  pending.set(key, job);
  return job;
}

export const loadProloguePreview = (id: string, priority: 'high' | 'low' = 'high') => {
  const hit = resolvePrologueImage(id);
  return hit ? Promise.resolve(hit) : load(id, 'preview', priority);
};
export const loadPrologueDetail = (id: string) => load(id, 'detail', 'low');
