import { beforeEach, describe, expect, it, vi } from 'vitest';
import { readdirSync, statSync } from 'node:fs';
const decode = vi.hoisted(() => vi.fn<(url: string, options?: unknown) => Promise<string>>());
vi.mock('./decodedImage', () => ({ decodeAssetUrl: decode }));
vi.mock('./assetUrls', () => ({ slotAssetUrl: (id: string) => `/full/${id}.webp` }));
beforeEach(() => { vi.resetModules(); decode.mockReset().mockImplementation(url => Promise.resolve(url)); });

describe('prologue transfer policy', () => {
  it('shares a pending preview and does not wait for another shot or a full-size download', async () => {
    let finish!: (url: string) => void;
    decode.mockImplementationOnce(() => new Promise(resolve => { finish = resolve; }));
    const art = await import('./prologueAssets');
    const first = art.loadProloguePreview('art.pro.storm');
    expect(art.loadProloguePreview('art.pro.storm', 'low')).toBe(first);
    await expect(art.loadProloguePreview('art.pro.dark')).resolves.toContain('prologue-dark');
    expect(decode).toHaveBeenCalledTimes(2);
    expect(decode.mock.calls[0][1]).toEqual({ priority: 'high', timeout: 8_000 });
    finish('/storm.webp');
    await first;
  });
  it('keeps a decoded preview when detail fails, and can recover detail later', async () => {
    const art = await import('./prologueAssets');
    const preview = await art.loadProloguePreview('art.pro.dark');
    decode.mockRejectedValueOnce(new Error('offline'));
    expect(await art.loadPrologueDetail('art.pro.dark')).toBeNull();
    expect(art.resolvePrologueImage('art.pro.dark')).toBe(preview);
    const detail = await art.loadPrologueDetail('art.pro.dark');
    expect(art.resolvePrologueImage('art.pro.dark')).toBe(detail);
    art.forgetPrologueImage('art.pro.dark', detail!);
    expect(art.resolvePrologueImage('art.pro.dark')).toBe(preview);
  });
  it('does not cache a failed preview or affect a different composition', async () => {
    const art = await import('./prologueAssets');
    decode.mockRejectedValueOnce(new Error('missing'));
    expect(await art.loadProloguePreview('art.pro.storm')).toBeNull();
    expect(art.resolvePrologueImage('art.pro.storm')).toBeNull();
    await expect(art.loadProloguePreview('art.pro.storm')).resolves.toContain('prologue-storm');
    expect(art.resolvePrologueImage('art.pro.storm.portrait')).toBeNull();
  });
  it('keeps every complete-composition preview below 70 KB and one orientation below 240 KB', () => {
    const directory = 'src/assets/art/prologue-light';
    const files = readdirSync(directory).filter(name => name.endsWith('.webp'));
    expect(files).toHaveLength(8);
    for (const portrait of [true, false]) {
      const sizes = files.filter(name => name.includes('-portrait') === portrait).map(name => statSync(`${directory}/${name}`).size);
      expect(sizes).toHaveLength(4);
      expect(Math.max(...sizes)).toBeLessThan(70_000);
      expect(sizes.reduce((total, size) => total + size, 0)).toBeLessThan(240_000);
    }
  });
});
