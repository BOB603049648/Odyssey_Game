const loaders = import.meta.glob<string>('../assets/companion/nanaicha/traj/*.png', { import: 'default' });

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function idOf(path: string): string {
  return path.split('/').pop()!.replace(/\.png$/, '');
}

const byId = new Map<string, () => Promise<string>>();
for (const [path, loader] of Object.entries(loaders)) {
  byId.set(idOf(path), loader as () => Promise<string>);
}

export function trajUrl(id: string): string | undefined {
  return cache.get(id);
}

export function loadTraj(id: string): Promise<string | null> {
  const hit = cache.get(id);
  if (hit) return Promise.resolve(hit);
  const loader = byId.get(id);
  if (!loader) return Promise.resolve(null);
  let job = pending.get(id);
  if (!job) {
    job = loader().then((url) => {
      cache.set(id, url);
      return url;
    });
    pending.set(id, job);
  }
  return job;
}

const heroLoaders = import.meta.glob<string>('../assets/companion/nanaicha/nanaicha-hero.png', { import: 'default' });
const heroLoader = Object.values(heroLoaders)[0] as (() => Promise<string>) | undefined;
let heroCache: string | undefined;
let heroPending: Promise<string | null> | null = null;

/** Colored standing plate. Shore landings from #26 are near-black, so the shore cat uses this. */
export function heroUrl(): string | undefined {
  return heroCache;
}

export function loadHero(): Promise<string | null> {
  if (heroCache) return Promise.resolve(heroCache);
  if (!heroLoader) return Promise.resolve(null);
  heroPending ??= heroLoader().then((url) => {
    heroCache = url;
    return url;
  });
  return heroPending;
}

if (import.meta.env.MODE === 'test') {
  await Promise.all([...byId.keys()].map((id) => loadTraj(id)));
  await loadHero();
}
