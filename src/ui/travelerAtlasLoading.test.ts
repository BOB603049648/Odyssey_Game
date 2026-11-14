import { afterEach, expect, it, vi } from 'vitest';
vi.mock('../content/decodedImage', () => ({ decodeAssetUrl: vi.fn() }));
afterEach(() => { vi.unstubAllEnvs(); vi.restoreAllMocks(); });

it('publishes twelve cells after one decoded sheet, and reloads the sheet after a display error', async () => {
  vi.resetModules();
  vi.stubEnv('MODE', 'production');
  const { decodeAssetUrl } = await import('../content/decodedImage');
  const { WALK_ATLAS, WALK_ATLAS_FILES } = await import('../content/travelerWalkAtlas');
  const { loadFrame, frameUrl, forgetFrame } = await import('./travelerArt');
  let finish!: (url: string) => void;
  vi.mocked(decodeAssetUrl).mockImplementation(() => new Promise(resolve => { finish = resolve; }));
  const loads = WALK_ATLAS_FILES.map(file => loadFrame(file));
  await Promise.resolve();
  expect(decodeAssetUrl).toHaveBeenCalledTimes(1);
  expect(WALK_ATLAS_FILES.every(file => frameUrl(file) === undefined)).toBe(true);
  finish(WALK_ATLAS.url);
  const urls = await Promise.all(loads);
  expect(new Set(urls).size).toBe(12);
  expect(WALK_ATLAS_FILES.every(file => frameUrl(file)?.startsWith(WALK_ATLAS.url))).toBe(true);
  forgetFrame(WALK_ATLAS_FILES[5]);
  expect(WALK_ATLAS_FILES.every(file => frameUrl(file) === undefined)).toBe(true);
  const retry = loadFrame(WALK_ATLAS_FILES[0]);
  await Promise.resolve();
  expect(decodeAssetUrl).toHaveBeenCalledTimes(2);
  finish(WALK_ATLAS.url);
  await retry;
  expect(WALK_ATLAS_FILES.every(file => frameUrl(file))).toBe(true);
});
