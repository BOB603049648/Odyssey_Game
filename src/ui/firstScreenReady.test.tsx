import { act, cleanup, renderHook, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const art = vi.hoisted(() => ({
  load: vi.fn(),
}));
vi.mock('../content/imageLoad', () => ({
  loadNamedAsset: (id: string) => art.load(id),
  resolveNamedAsset: () => null,
}));
import { useFirstScreenReady } from './firstScreenReady';

function deferred<T>() {
  let resolve!: (value: T) => void;
  let reject!: (reason?: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

beforeEach(() => {
  vi.clearAllMocks();
  art.load.mockResolvedValue('ok');
});
afterEach(() => cleanup());

describe('first-screen readiness', () => {
  it('requires the painted shore, exposes its failure, and recovers through retry', async () => {
    art.load.mockImplementation((id: string) => id === 'art.shore.landscape' ? Promise.resolve(null) : Promise.resolve('ok'));
    const { result } = renderHook(() => useFirstScreenReady('dba.scene.shore', 'land-companion', true));
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(art.load).not.toHaveBeenCalledWith('art.shore.ground');
    art.load.mockResolvedValue('recovered');
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
  it.each(['shore','camp','yard','hall','path','night'])('waits for both actors on a cold %s resume', async name => {
    const human = deferred<string>();
    const guide = deferred<string>();
    art.load.mockImplementation((id: string) => id === 'idle-front-01.png' ? human.promise : id === 'land-companion' ? guide.promise : Promise.resolve('ok'));
    const { result } = renderHook(() => useFirstScreenReady(`dba.scene.${name}`));
    await act(async () => { await Promise.resolve(); });
    expect(result.current.status).toBe('loading');
    await act(async () => human.resolve('human'));
    expect(result.current.status).toBe('loading');
    await act(async () => guide.resolve('guide'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('turns a rejected actor loader into a retryable failure', async () => {
    art.load.mockImplementation((id: string) => id === 'land-companion' ? Promise.reject(new Error('offline')) : Promise.resolve('ok'));
    const { result } = renderHook(() => useFirstScreenReady('dba.scene.camp'));
    await waitFor(() => expect(result.current.status).toBe('failed'));
    art.load.mockResolvedValue('recovered');
    await act(async () => result.current.retry());
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
  it('stays loading while a required first-screen image is delayed, then becomes ready', async () => {
    const ground = deferred<string>();
    art.load.mockImplementation((id: string) => (id === 'art.shore.ground' ? ground.promise : Promise.resolve('ok')));
    const { result } = renderHook(() => useFirstScreenReady('dba.scene.shore'));
    await act(async () => {
      await Promise.resolve();
    });
    expect(result.current.status).toBe('loading');
    expect(result.current.done).toBeLessThan(result.current.total);
    await act(async () => ground.resolve('ground'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('does not fail the scene when an optional animation frame is missing', async () => {
    art.load.mockImplementation((id: string) => {
      if (id === 'idle-front-02.png' || id === 'walk-front-01.png') return Promise.resolve(null);
      return Promise.resolve('ok');
    });
    const { result } = renderHook(() => useFirstScreenReady('dba.scene.shore'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('can retry after a required image exhausts its attempts, and ignores a late result after a scene switch', async () => {
    const late = deferred<string | null>();
    art.load.mockImplementation((id: string) => {
      if (id === 'art.shore.building') return Promise.resolve(null);
      return Promise.resolve('ok');
    });
    const { result, rerender } = renderHook(({ scene }) => useFirstScreenReady(scene), {
      initialProps: { scene: 'dba.scene.shore' },
    });
    await waitFor(() => expect(result.current.status).toBe('failed'));
    expect(typeof result.current.retry).toBe('function');

    art.load.mockImplementation((id: string) => {
      if (id === 'art.shore.building') return late.promise;
      return Promise.resolve('ok');
    });
    rerender({ scene: 'dba.scene.camp' });
    expect(result.current.status).toBe('loading');
    await act(async () => late.resolve('stale-shore-building'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });

  it('retries a required first-screen failure on the same scene', async () => {
    art.load.mockImplementation((id: string) => {
      if (id === 'art.shore.ground') return Promise.resolve(null);
      return Promise.resolve('ok');
    });
    const { result } = renderHook(() => useFirstScreenReady('dba.scene.shore'));
    await waitFor(() => expect(result.current.status).toBe('failed'));
    art.load.mockResolvedValue('ok');
    await act(async () => {
      result.current.retry();
    });
    await waitFor(() => expect(result.current.status).toBe('ready'));
  });
});
