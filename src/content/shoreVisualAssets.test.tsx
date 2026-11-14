import { createHash } from 'node:crypto';
import { existsSync, readFileSync } from 'node:fs';
import { cleanup, render } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { slotAssetUrl, allSlotIds } from './assetUrls';
import { forgetSlotAsset, loadSlotAsset, preloadSceneAssets, resolveSlotAsset } from './slotAssets';
import * as decoded from './decodedImage';
import { sceneAssembly } from './catalog';
import { PlateStack } from '../ui/Plate';

const originalSearch = location.search;
afterEach(() => { cleanup(); vi.restoreAllMocks(); vi.unstubAllEnvs(); history.replaceState({}, '', '/' + originalSearch); forgetSlotAsset('art.shore.ground'); });
function variant(value: string, enabled = '1') { vi.stubEnv('VITE_VISUAL_SAMPLE', enabled); history.replaceState({}, '', `/?shoreVisual=${value}`); }

describe('shore candidate URL stays inside the existing decode pipeline', () => {
  it('opts in to the existing clean asset without exposing its own preload id', () => {
    variant('baseline'); const ground = slotAssetUrl('art.shore.ground'); const camp = slotAssetUrl('art.camp.ground');
    variant('candidate');
    expect(slotAssetUrl('art.shore.ground')).toBe(ground);
    expect(slotAssetUrl('art.shore.ground')).toContain('art.shore.ground.clean');
    expect(slotAssetUrl('art.shore.ground.jpg')).toBe(slotAssetUrl('art.shore.ground'));
    expect(slotAssetUrl('art.camp.ground')).toBe(camp);
    expect(allSlotIds()).not.toContain('art.shore.ground.clean');
    variant('candidate', ''); expect(slotAssetUrl('art.shore.ground')).toBe(ground);
    variant('invalid'); expect(slotAssetUrl('art.shore.ground')).toBe(ground);
  });
  it('uses exactly the existing file bytes, not generated or painted replacement texture', () => {
    const file = 'src/assets/art/slots/art.shore.ground.clean.jpg';
    expect(existsSync(file), 'clean existing ground has not been introduced yet').toBe(true);
    expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe('16dd72e05c1c1661b2dcc27326dc0cd5a05007532f9889ebd08b0c1d2e0d4bbc');
  });
  it('preload, resolve and rendered plate agree on candidate decoded URL', async () => {
    variant('candidate'); forgetSlotAsset('art.shore.ground');
    const decode = vi.spyOn(decoded, 'decodeAssetUrl');
    preloadSceneAssets(['art.shore.ground']);
    const ready = await loadSlotAsset('art.shore.ground');
    expect(ready).toContain('art.shore.ground.clean');
    expect(decode).toHaveBeenCalledWith(ready);
    expect(resolveSlotAsset('art.shore.ground')).toBe(ready);
    const view = render(<PlateStack plate="dba.scene.shore" previous={null} />);
    expect(view.container.querySelector('[data-slot="ground"] img')?.getAttribute('src')).toBe(ready);
  });
  it('ordinary preload requests the same repaired production ground', async () => {
    variant('baseline'); forgetSlotAsset('art.shore.ground');
    const decode = vi.spyOn(decoded, 'decodeAssetUrl');
    preloadSceneAssets(sceneAssembly('dba.scene.shore')!.slots.map(slot => slot.asset));
    await loadSlotAsset('art.shore.ground');
    expect(decode.mock.calls.some(([url]) => url.includes('ground.clean'))).toBe(true);
    expect(resolveSlotAsset('art.shore.ground')).toContain('ground.clean');
  });
});
