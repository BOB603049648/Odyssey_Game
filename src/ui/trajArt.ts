import { loadGated } from '../content/loadGate';

const loaders = import.meta.glob<string>('../assets/companion/nanaicha/traj/*.{png,webp}', { import: 'default' });

const cache = new Map<string, string>();

function idOf(path: string): string {
  return path.split('/').pop()!.replace(/\.(png|webp)$/, '');
}

const byId = new Map<string, () => Promise<string>>();
for (const [path, loader] of Object.entries(loaders)) {
  const id = idOf(path);
  const current = byId.get(id);
  if (current && !path.endsWith('.webp')) continue;
  byId.set(id, loader as () => Promise<string>);
}

export function trajUrl(id: string): string | undefined {
  return cache.get(id);
}

export function loadTraj(id: string): Promise<string | null> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const loader = byId.get(id);
  if (!loader) return Promise.resolve(null);
  return loadGated(`traj:${id}`, 'traj', () => loader(), cache, { cacheKey: id });
}

if (import.meta.env.MODE === 'test') {
  await Promise.all([...byId.keys()].map((id) => loadTraj(id)));
}
