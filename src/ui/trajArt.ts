import { trajAssetUrl } from '../content/assetUrls';
import { notifyAssetUpdates } from '../content/assetUpdates';
import { recordLoadTrace } from '../content/loadTrace';
import { decodeAssetUrl } from '../content/decodedImage';
import { loadGated } from '../content/loadGate';
import { COMPANION_ATLAS, COMPANION_PERFORMANCE_IDS, companionAtlasFrame } from '../content/characterPerformanceAtlas';
import {PAINTED_ACTORS} from '../content/paintedActors';

const cache = new Map<string, string>();

export function trajUrl(id: string): string | undefined {
  return cache.get(id);
}

export function forgetTraj(id: string): void {
  recordLoadTrace({ event: 'forget', key: id });
  if(id==='leap-01'||id==='leap-02'){
    cache.delete('companion-leap-atlas');cache.delete('leap-01');cache.delete('leap-02');notifyAssetUpdates();return;
  }
  if (companionAtlasFrame(id)) {
    cache.delete('companion-performance-atlas');
    for (const frame of COMPANION_PERFORMANCE_IDS) cache.delete(frame);
    notifyAssetUpdates(); return;
  }
  if (!cache.has(id)) return;
  cache.delete(id);
  notifyAssetUpdates();
}

export function hasTraj(id: string): boolean {
  return Boolean(trajAssetUrl(id));
}

export function loadTraj(id: string): Promise<string | null> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const url = trajAssetUrl(id);
  if (!url) return Promise.resolve(null);
  if(id==='leap-01'||id==='leap-02')return loadGated('companion-leap-atlas','traj',()=>decodeAssetUrl(PAINTED_ACTORS['cat-leap']),cache,
    {cacheKey:'companion-leap-atlas'}).then(next=>{
      if(!next)return null;
      for(const frame of ['leap-01','leap-02'])cache.set(frame,trajAssetUrl(frame)!);
      return cache.get(id)!;
    });
  // Optional expression art must not hold up required first-screen actor jobs.
  if (companionAtlasFrame(id)) return loadGated('companion-performance-atlas', 'idle', () => decodeAssetUrl(COMPANION_ATLAS.url), cache,
    { cacheKey: 'companion-performance-atlas' }).then(next => {
    if (!next) return null;
    for (const frame of COMPANION_PERFORMANCE_IDS) cache.set(frame, trajAssetUrl(frame)!);
    return cache.get(id)!;
  });
  return loadGated(`traj:${id}`, 'traj', () => decodeAssetUrl(url), cache, { cacheKey: id });
}

if (import.meta.env.MODE === 'test') {
  const modules = import.meta.glob<string>('../assets/companion/nanaicha/traj/*.{png,webp}', {
    eager: true,
    import: 'default',
  });
  const ids = [...new Set(['land-companion', ...Object.keys(modules).map((path) => path.split('/').pop()!.replace(/\.(png|webp)$/, ''))])];
  await Promise.all([...ids, ...COMPANION_PERFORMANCE_IDS].map((id) => loadTraj(id)));
}
