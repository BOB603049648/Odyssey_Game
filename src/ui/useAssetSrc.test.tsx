import { act, cleanup, render, renderHook, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { notifyAssetUpdates, useAssetSrc } from './useAssetSrc';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

function apiFor(cache: Map<string, string>, load: (id: string) => Promise<string | null>) {
  return {
    resolve: (id: string | null) => (id ? (cache.get(id) ?? null) : null),
    load: async (id: string | null) => (id ? load(id) : null),
    forget: (id: string) => {
      cache.delete(id);
    },
  };
}

describe('displayed scene art recovers after a later same-URL success', () => {
  it('updates a plate src when a first load failed and a later retry fills the cache', async () => {
    const cache = new Map<string, string>();
    let fail = true;
    const api = apiFor(cache, async (id) => {
      if (fail) return null;
      return cache.get(id) ?? null;
    });
    const { result } = renderHook(() => useAssetSrc('art.shore.building', api));
    await waitFor(() => expect(result.current.src).toBeNull());

    fail = false;
    cache.set('art.shore.building', 'https://example.test/art.shore.building.webp');
    await act(async () => {
      notifyAssetUpdates();
    });
    await waitFor(() => expect(result.current.src).toBe('https://example.test/art.shore.building.webp'));
  });

  it('updates a companion traj src the same way, not only traveler idle', async () => {
    const cache = new Map<string, string>();
    const api = apiFor(cache, async () => null);
    const { result } = renderHook(() => useAssetSrc('land-shore-driftwood', api));
    await waitFor(() => expect(result.current.src).toBeNull());
    cache.set('land-shore-driftwood', 'https://example.test/land-shore-driftwood.webp');
    await act(async () => {
      notifyAssetUpdates();
    });
    await waitFor(() => expect(result.current.src).toBe('https://example.test/land-shore-driftwood.webp'));
  });

  it('does not pin a displayed img after onerror: the same URL can be retried and shown again', async () => {
    const cache = new Map<string, string>([['art.shore.ground', 'https://example.test/art.shore.ground.jpg']]);
    const api = apiFor(cache, async (id) => cache.get(id) ?? null);
    function Probe() {
      const { src, onError } = useAssetSrc('art.shore.ground', api);
      return src ? <img alt="ground" src={src} onError={onError} /> : <span data-testid="empty" />;
    }
    const view = render(<Probe />);
    const img = await view.findByAltText('ground');
    await act(async () => {
      img.dispatchEvent(new Event('error'));
    });
    expect(cache.has('art.shore.ground')).toBe(false);
    await waitFor(() => expect(view.queryByAltText('ground')).toBeNull());

    cache.set('art.shore.ground', 'https://example.test/art.shore.ground.jpg');
    await act(async () => {
      notifyAssetUpdates();
    });
    expect((await view.findByAltText('ground')).getAttribute('src')).toBe('https://example.test/art.shore.ground.jpg');
  });
});
