const loaders = import.meta.glob<string>('../assets/traveler/*.png', { import: 'default' });

const cache = new Map<string, string>();
const pending = new Map<string, Promise<string>>();

function fileOf(path: string): string {
  return path.split('/').pop()!;
}

const byFile = new Map<string, () => Promise<string>>();
for (const [path, loader] of Object.entries(loaders)) {
  byFile.set(fileOf(path), loader as () => Promise<string>);
}

export function frameUrl(file: string): string | undefined {
  return cache.get(file);
}

export function loadFrame(file: string): Promise<string> {
  const hit = cache.get(file);
  if (hit) return Promise.resolve(hit);
  const loader = byFile.get(file);
  if (!loader) return Promise.resolve('');
  let job = pending.get(file);
  if (!job) {
    job = loader().then((url) => {
      cache.set(file, url);
      return url;
    });
    pending.set(file, job);
  }
  return job;
}

export function loadFrames(files: readonly string[]): Promise<string[]> {
  return Promise.all(files.map((file) => loadFrame(file)));
}

if (import.meta.env.MODE === 'test') {
  await Promise.all([...byFile.keys()].map((file) => loadFrame(file)));
}
