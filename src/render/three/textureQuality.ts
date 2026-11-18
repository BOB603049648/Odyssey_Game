import * as THREE from 'three';
import type { Crop } from './geometry';

export function sceneSamples(maxSamples: number) { return maxSamples >= 4 ? 4 : maxSamples >= 2 ? 2 : 0; }

/** Keep animation cells free of mip bleed. Painted scenery uses minification
 * filtering. Cutouts interpolate premultiplied encoded RGB, then unpremultiply
 * and decode in the material, so invisible padding cannot fringe the edge. */
export function prepareSceneTexture(texture: THREE.Texture, maxAnisotropy: number, actor = false, crop?: Crop) {
  const painted=!!crop||actor;
  texture.colorSpace = painted ? THREE.NoColorSpace : THREE.SRGBColorSpace;
  texture.premultiplyAlpha = painted;
  texture.userData.paintedCutout = painted;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = !actor;
  texture.minFilter = texture.generateMipmaps ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  texture.anisotropy = texture.generateMipmaps ? Math.max(1, Math.min(4, maxAnisotropy)) : 1;
  if (crop) {
    texture.repeat.set(crop.atlasWidth / crop.width, crop.atlasHeight / crop.height);
    texture.offset.set(-crop.x / crop.width, -(crop.atlasHeight - crop.y - crop.height) / crop.height);
  }
  texture.updateMatrix();
}

export function usePaintedCutoutMap(shader: Parameters<THREE.Material['onBeforeCompile']>[0]) {
  shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
    #ifdef USE_MAP
      vec4 cutout = texture2D(map, vMapUv);
      cutout.rgb = sRGBTransferEOTF(vec4(cutout.rgb / max(cutout.a, .00001), 1.)).rgb;
      diffuseColor *= cutout;
    #endif
  `);
}
