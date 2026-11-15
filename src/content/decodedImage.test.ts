import { afterEach, describe, expect, it, vi } from 'vitest';
import { IMAGE_TIMEOUT_MS, decodeImage } from './decodedImage';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('image load and decode', () => {
  it('applies critical-image priority and releases a stalled transfer at its shorter deadline', async () => {
    vi.useFakeTimers();
    const picture = { src: '', fetchPriority: '', onload: null, onerror: null, removeAttribute: vi.fn() };
    vi.stubGlobal('Image', class { constructor() { return picture; } });
    const pending = expect(decodeImage('/preview.webp', { priority: 'high', timeout: 8000 })).rejects.toThrow(/timed out/);
    expect(picture.fetchPriority).toBe('high');
    await vi.advanceTimersByTimeAsync(8000);
    await pending;
    expect(picture.removeAttribute).toHaveBeenCalledWith('src');
  });
  it('resolves after the bitmap has loaded and decoded', async () => {
    vi.stubGlobal(
      'Image',
      class {
        decode = vi.fn().mockResolvedValue(undefined);
        set src(_url: string) {
          queueMicrotask(() => this.onload?.());
        }
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
      },
    );
    await expect(decodeImage('https://example.test/idle.webp')).resolves.toBe('https://example.test/idle.webp');
  });

  it('fails on a stalled load instead of waiting forever', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'Image',
      class {
        set src(_url: string) {}
        onload: (() => void) | null = null;
        onerror: (() => void) | null = null;
      },
    );
    const pending = expect(decodeImage('https://example.test/stuck.webp')).rejects.toThrow(/timed out/i);
    await vi.advanceTimersByTimeAsync(IMAGE_TIMEOUT_MS);
    await pending;
  });
});
