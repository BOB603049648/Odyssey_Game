/**
 * Shared fetch gate for scene plates, guide frames, and traveler frames.
 * Shell art (sky / ground / building / fg) runs before props, then trajectory,
 * then idle. A failed fetch is retried and never cached, so a later call can recover.
 */

export type LoadTier = 'shell' | 'prop' | 'traj' | 'idle';

export const LOAD_CONCURRENCY = 2;
export const LOAD_ATTEMPTS = 3;

const TIER_RANK: Record<LoadTier, number> = { shell: 0, prop: 1, traj: 2, idle: 3 };

type Job = {
  key: string;
  tier: LoadTier;
  run: () => Promise<string>;
  resolve: (url: string | null) => void;
  generation: number;
};

const queue: Job[] = [];
const inflight = new Map<string, Promise<string | null>>();
const activeByTier = new Map<LoadTier, number>();
let active = 0;
let generation = 0;
let delayFor = (attempt: number) => 80 * attempt;

export function slotLoadTier(asset: string | null | undefined): LoadTier | null {
  if (!asset) return null;
  if (asset.includes('.prop.')) return 'prop';
  return 'shell';
}

/** Shell ids keep their relative order, and so do props. Nulls are dropped. */
export function partitionSceneAssets(ids: readonly (string | null | undefined)[]): {
  shell: string[];
  props: string[];
} {
  const shell: string[] = [];
  const props: string[] = [];
  for (const id of ids) {
    const tier = slotLoadTier(id);
    if (!id || !tier) continue;
    if (tier === 'prop') props.push(id);
    else shell.push(id);
  }
  return { shell, props };
}

export function resetLoadGateForTests(): void {
  generation += 1;
  queue.length = 0;
  active = 0;
  activeByTier.clear();
  inflight.clear();
  delayFor = (attempt: number) => 80 * attempt;
}

export function setLoadRetryDelayForTests(fn: (attempt: number) => number): void {
  delayFor = fn;
}

function wait(ms: number): Promise<void> {
  if (ms <= 0) return Promise.resolve();
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

function higherTierActive(rank: number): boolean {
  for (const [tier, count] of activeByTier) {
    if (count > 0 && TIER_RANK[tier] < rank) return true;
  }
  return false;
}

function pickNext(): Job | undefined {
  let best = -1;
  let bestRank = Infinity;
  for (let index = 0; index < queue.length; index += 1) {
    const rank = TIER_RANK[queue[index].tier];
    if (rank < bestRank) {
      bestRank = rank;
      best = index;
    }
  }
  if (best < 0) return undefined;
  if (higherTierActive(bestRank)) return undefined;
  return queue.splice(best, 1)[0];
}

function pump(): void {
  while (active < LOAD_CONCURRENCY) {
    const next = pickNext();
    if (!next) return;
    active += 1;
    activeByTier.set(next.tier, (activeByTier.get(next.tier) ?? 0) + 1);
    void execute(next).finally(() => {
      if (next.generation !== generation) return;
      active -= 1;
      activeByTier.set(next.tier, (activeByTier.get(next.tier) ?? 1) - 1);
      pump();
    });
  }
}

async function execute(job: Job): Promise<void> {
  for (let attempt = 1; attempt <= LOAD_ATTEMPTS; attempt += 1) {
    if (job.generation !== generation) return;
    try {
      const url = await job.run();
      if (job.generation !== generation) return;
      job.resolve(url);
      return;
    } catch {
      if (job.generation !== generation) return;
      if (attempt >= LOAD_ATTEMPTS) {
        job.resolve(null);
        return;
      }
      await wait(delayFor(attempt));
    }
  }
}

export function loadGated(
  key: string,
  tier: LoadTier,
  run: () => Promise<string>,
  cache: Map<string, string>,
  options?: { defer?: boolean; cacheKey?: string },
): Promise<string | null> {
  const cacheKey = options?.cacheKey ?? key;
  const hit = cache.get(cacheKey);
  if (hit) return Promise.resolve(hit);
  const existing = inflight.get(key);
  if (existing) return existing;
  let resolve!: (url: string | null) => void;
  const result = new Promise<string | null>((settle) => {
    resolve = settle;
  }).then((url) => {
    if (url) cache.set(cacheKey, url);
    return url;
  });
  inflight.set(key, result);
  const job: Job = { key, tier, run, resolve, generation };
  const enqueue = () => {
    if (job.generation !== generation) return;
    queue.push(job);
    pump();
  };
  if (options?.defer) queueMicrotask(enqueue);
  else enqueue();
  void result.finally(() => {
    if (inflight.get(key) === result) inflight.delete(key);
  });
  return result;
}
