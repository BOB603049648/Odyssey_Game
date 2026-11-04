import { existsSync, statSync } from 'node:fs';
import { describe, expect, it, beforeEach } from 'vitest';
import { sceneAssembly } from './catalog';
import {
  LOAD_ATTEMPTS,
  LOAD_CONCURRENCY,
  loadGated,
  partitionSceneAssets,
  resetLoadGateForTests,
  setLoadRetryDelayForTests,
  slotLoadTier,
} from './loadGate';

beforeEach(() => {
  resetLoadGateForTests();
  setLoadRetryDelayForTests(() => 0);
});

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

describe('load gate', () => {
  it('runs at most LOAD_CONCURRENCY loads at once', async () => {
    const cache = new Map<string, string>();
    let active = 0;
    let max = 0;
    const releases: Array<() => void> = [];
    const jobs = Array.from({ length: LOAD_CONCURRENCY + 3 }, (_, index) =>
      loadGated(
        `shell-${index}`,
        'shell',
        () => {
          active += 1;
          max = Math.max(max, active);
          const gate = deferred<string>();
          releases.push(() => {
            active -= 1;
            gate.resolve(`url-${index}`);
          });
          return gate.promise;
        },
        cache,
      ),
    );
    await Promise.resolve();
    expect(active).toBe(LOAD_CONCURRENCY);
    expect(max).toBe(LOAD_CONCURRENCY);
    let finished = 0;
    while (finished < jobs.length) {
      expect(releases.length).toBeGreaterThan(0);
      expect(releases.length).toBeLessThanOrEqual(LOAD_CONCURRENCY);
      const wave = releases.splice(0, releases.length);
      finished += wave.length;
      for (const release of wave) release();
      for (let tick = 0; tick < 8 && releases.length === 0 && finished < jobs.length; tick += 1) {
        await Promise.resolve();
      }
    }
    const urls = await Promise.all(jobs);
    expect(urls).toEqual(jobs.map((_, index) => `url-${index}`));
    expect(max).toBe(LOAD_CONCURRENCY);
  });

  it('retries a failed fetch and keeps the url once a later attempt works', async () => {
    const cache = new Map<string, string>();
    let attempts = 0;
    const url = await loadGated(
      'mural',
      'shell',
      async () => {
        attempts += 1;
        if (attempts < LOAD_ATTEMPTS) throw new Error('network');
        return 'mural.webp';
      },
      cache,
    );
    expect(url).toBe('mural.webp');
    expect(attempts).toBe(LOAD_ATTEMPTS);
    expect(cache.get('mural')).toBe('mural.webp');
  });

  it('does not pin a failed load, so the next call can recover', async () => {
    const cache = new Map<string, string>();
    let attempts = 0;
    const first = await loadGated(
      'building',
      'shell',
      async () => {
        attempts += 1;
        throw new Error('offline');
      },
      cache,
    );
    expect(first).toBeNull();
    expect(attempts).toBe(LOAD_ATTEMPTS);
    expect(cache.has('building')).toBe(false);

    const second = await loadGated(
      'building',
      'shell',
      async () => {
        attempts += 1;
        return 'building.webp';
      },
      cache,
    );
    expect(second).toBe('building.webp');
    expect(attempts).toBe(LOAD_ATTEMPTS + 1);
  });

  it('shares one in-flight attempt across callers', async () => {
    const cache = new Map<string, string>();
    let calls = 0;
    const gate = deferred<string>();
    const run = () => {
      calls += 1;
      return gate.promise;
    };
    const a = loadGated('sky', 'shell', run, cache);
    const b = loadGated('sky', 'shell', run, cache);
    gate.resolve('sky.webp');
    expect(await a).toBe('sky.webp');
    expect(await b).toBe('sky.webp');
    expect(calls).toBe(1);
  });

  it('does not start props, traj, or idle while a shell load is in flight', async () => {
    const cache = new Map<string, string>();
    const started: string[] = [];
    const shell = deferred<string>();
    const shellJob = loadGated(
      'ground',
      'shell',
      () => {
        started.push('shell');
        return shell.promise;
      },
      cache,
    );
    const propJob = loadGated(
      'mural',
      'prop',
      async () => {
        started.push('prop');
        return 'mural';
      },
      cache,
    );
    const trajJob = loadGated(
      'land-shore-gourd',
      'traj',
      async () => {
        started.push('traj');
        return 'traj';
      },
      cache,
    );
    const idleJob = loadGated(
      'idle-front-01.png',
      'idle',
      async () => {
        started.push('idle');
        return 'idle';
      },
      cache,
      { defer: true },
    );
    await Promise.resolve();
    await Promise.resolve();
    expect(started).toEqual(['shell']);
    shell.resolve('ground.webp');
    expect(await shellJob).toBe('ground.webp');
    expect(await propJob).toBe('mural');
    expect(await trajJob).toBe('traj');
    expect(await idleJob).toBe('idle');
    expect(started).toEqual(['shell', 'prop', 'traj', 'idle']);
  });

  it('lets a newly requested shell asset start before a queued prop', async () => {
    const cache = new Map<string, string>();
    const started: string[] = [];
    const holdA = deferred<string>();
    const holdB = deferred<string>();
    const first = loadGated('prop-a', 'prop', () => {
      started.push('prop-a');
      return holdA.promise;
    }, cache);
    const second = loadGated('prop-b', 'prop', () => {
      started.push('prop-b');
      return holdB.promise;
    }, cache);
    await Promise.resolve();
    expect(started).toEqual(['prop-a', 'prop-b']);
    let queuedStarted = false;
    const queued = loadGated('prop-c', 'prop', async () => {
      queuedStarted = true;
      started.push('prop-c');
      return 'prop-c';
    }, cache);
    const shellHold = deferred<string>();
    const shell = loadGated('sky', 'shell', () => {
      started.push('sky');
      return shellHold.promise;
    }, cache);
    holdA.resolve('a');
    for (let tick = 0; tick < 10 && !started.includes('sky'); tick += 1) await Promise.resolve();
    expect(started).toEqual(['prop-a', 'prop-b', 'sky']);
    expect(queuedStarted).toBe(false);
    shellHold.resolve('sky');
    holdB.resolve('b');
    expect(await shell).toBe('sky');
    expect(await first).toBe('a');
    expect(await second).toBe('b');
    expect(await queued).toBe('prop-c');
    expect(started).toEqual(['prop-a', 'prop-b', 'sky', 'prop-c']);
  });
});

describe('shore first paint schedule', () => {
  it('loads sky, ground, building, and fog fg before shore props', () => {
    const kit = sceneAssembly('dba.scene.shore');
    expect(kit).not.toBeNull();
    const parts = partitionSceneAssets(kit!.slots.map((slot) => slot.asset));
    expect(parts.shell).toEqual([
      'art.shore.sky',
      'art.shore.ground',
      'art.shore.building',
      'art.shore.fg',
    ]);
    expect(parts.props).toEqual([
      'art.shore.prop.driftwood',
      'art.shore.prop.gourd',
      'art.shore.prop.break-shard',
      'art.shore.prop.mural-wall',
      'art.shore.prop.east-gap',
    ]);
    expect(slotLoadTier('art.shore.building')).toBe('shell');
    expect(slotLoadTier('art.shore.fg')).toBe('shell');
    expect(slotLoadTier('art.shore.prop.mural-wall')).toBe('prop');
    expect(slotLoadTier('art.shore.prop.driftwood.interact')).toBe('prop');
    expect(slotLoadTier(null)).toBeNull();
  });

  it('keeps the fog-shore heavy plates as webp well under 300KB', () => {
    const files = [
      'src/assets/art/slots/art.shore.prop.mural-wall.webp',
      'src/assets/art/slots/art.shore.building.webp',
      'src/assets/art/slots/art.shore.prop.east-gap.webp',
      'src/assets/art/slots/art.shore.prop.break-shard.webp',
      'src/assets/companion/nanaicha/traj/land-shore-gourd.webp',
      'src/assets/companion/nanaicha/traj/land-shore-driftwood.webp',
      'src/assets/companion/nanaicha/traj/land-shore-east-gap.webp',
    ];
    for (const file of files) {
      expect(existsSync(file), file).toBe(true);
      expect(existsSync(file.replace(/\.webp$/, '.png')), file).toBe(false);
      expect(statSync(file).size, file).toBeLessThan(300 * 1024);
    }
  });
});
