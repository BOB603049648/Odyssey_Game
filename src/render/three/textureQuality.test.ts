import { describe, expect, it } from 'vitest';
import * as THREE from 'three';
import { prepareSceneTexture, sceneSamples } from './textureQuality';
import regions from '../../assets/art/spatial/refined/regions.json';

describe('painted scenery texture sampling', () => {
  it.each(Object.entries(regions))('keeps %s registered after lossless transparent-padding removal', (_, crop) => {
    const map=new THREE.Texture();prepareSceneTexture(map,16,false,crop);
    const bottomLeft=new THREE.Vector3(crop.x/crop.atlasWidth,1-(crop.y+crop.height)/crop.atlasHeight,1).applyMatrix3(map.matrix);
    const topRight=new THREE.Vector3((crop.x+crop.width)/crop.atlasWidth,1-crop.y/crop.atlasHeight,1).applyMatrix3(map.matrix);
    expect(bottomLeft.x).toBeCloseTo(0,10);expect(bottomLeft.y).toBeCloseTo(0,10);
    expect(topRight.x).toBeCloseTo(1,10);expect(topRight.y).toBeCloseTo(1,10);
    expect(map.premultiplyAlpha).toBe(true);expect(map.colorSpace).toBe(THREE.NoColorSpace);
    expect(map.generateMipmaps).toBe(true);map.dispose();
  });
  it('filters receding scenery while keeping animation atlas cells isolated', () => {
    const scenery=new THREE.Texture(),actor=new THREE.Texture();
    prepareSceneTexture(scenery,16);prepareSceneTexture(actor,16,true);
    expect(scenery.minFilter).toBe(THREE.LinearMipmapLinearFilter);expect(scenery.anisotropy).toBe(4);
    expect(actor.minFilter).toBe(THREE.LinearFilter);expect(actor.generateMipmaps).toBe(false);
    expect(actor.colorSpace).toBe(THREE.NoColorSpace);expect(actor.premultiplyAlpha).toBe(true);
    scenery.dispose();actor.dispose();
  });
  it('selects supported bounded multisample tiers', () => {
    expect([0,1,2,3,4,8].map(sceneSamples)).toEqual([0,0,2,2,4,4]);
  });
});
