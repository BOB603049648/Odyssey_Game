import * as THREE from 'three';
import type {SceneLook} from './looks';
import {firePulse} from './lighting';

/** The source drawings have neutral studio-like illumination. Give all three
 * character families the same environmental light at their ground position.
 * RGB changes only: no transparent bodies, per-frame filters or hard outlines. */
export function figureIllumination(look:SceneLook,foot:{x:number;y:number},time:number){
  const value=new THREE.Color().setRGB(...look.figureAmbient);
  for(const light of look.lights){
    const dx=(foot.x-light.x)*16/9,dy=foot.y-light.y;
    const power=light.power*Math.exp(-(dx*dx+dy*dy)*2.5/(light.radius*light.radius))*firePulse(time,!!light.flicker);
    value.add(new THREE.Color(light.color).multiplyScalar(Math.min(.65,power*.65)));
  }
  value.r=Math.min(1.12,value.r);value.g=Math.min(1.12,value.g);value.b=Math.min(1.12,value.b);
  return value;
}
