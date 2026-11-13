import { describe, expect, it } from 'vitest';
import { sceneAssembly } from './catalog';
import { FIRST_SCREEN_SCENE, firstScreenAssetIds, isFirstScreenRequired } from './firstScreen';
import { SLOT_ASSETS } from './slotAssets';

describe('first-screen asset contract', () => {
  it('is the shore plates plus idle and the shared walk atlas, skipping empty slots and old animation frames', () => {
    expect(FIRST_SCREEN_SCENE).toBe('dba.scene.shore');
    const ids = firstScreenAssetIds();
    const shore = sceneAssembly('dba.scene.shore')!;
    for (const slot of shore.slots) {
      if (slot.asset) expect(ids).toContain(slot.asset);
      else expect(ids).not.toContain(slot.id);
    }
    expect(ids).toContain('idle-front-01.png');
    expect(ids).toContain('stride-front-01.png');
    expect(ids).not.toContain('idle-front-02.png');
    expect(ids.some((id) => id.startsWith('walk-'))).toBe(false);
    expect(ids.some((id) => id.startsWith('art.camp') || id.startsWith('art.hall'))).toBe(false);
    expect(ids).not.toContain('art.shore.far');
  });

  it('every required first-screen plate exists on disk', () => {
    for (const id of firstScreenAssetIds()) {
      if (id === 'stride-front-01.png' || id === 'idle-front-01.png' || id === 'land-companion') continue;
      expect(SLOT_ASSETS[id], id).toBe(true);
    }
  });

  it('treats animation and other-scene frames as optional, not scene-blocking', () => {
    expect(isFirstScreenRequired('idle-front-02.png')).toBe(false);
    expect(isFirstScreenRequired('walk-front-01.png')).toBe(false);
    expect(isFirstScreenRequired('art.hall.building')).toBe(false);
    expect(isFirstScreenRequired('art.shore.ground')).toBe(true);
    expect(isFirstScreenRequired('idle-front-01.png')).toBe(true);
  });
});
