import { afterEach, describe, expect, it, vi } from 'vitest';
import { IMAGE_TIMEOUT_MS, decodeImage } from './decodedImage';

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('image load and decode', () => {
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
