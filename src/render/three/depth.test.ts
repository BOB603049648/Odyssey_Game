import { describe,expect,it } from 'vitest';
import { BANDS, GATES, SPOTS, SPAWNS } from '../../core/stage';
import type { IslandScene } from '../../core/island';
import { reliefTarget,sceneRelief } from './depth';

describe('authored image relief keeps gameplay registered',()=>{
  it('holds every interactable prop and exit on the gameplay plane',()=>{
    for(const scene of Object.keys(SPOTS) as IslandScene[]){
      for(const point of [...SPOTS[scene],...GATES.filter(g=>g.from===scene)]){
        expect(sceneRelief(scene,point.x,point.y),`${scene} ${point.x},${point.y}`).toBeCloseTo(0,5);
      }
    }
  });
  it('moves distant mountains and the outer foreground in opposite directions',()=>{
    expect(sceneRelief('dba.scene.shore',.5,.18)).toBeGreaterThan(.5);
    expect(sceneRelief('dba.scene.shore',.5,.98)).toBeLessThan(-.2);
    for(const scene of Object.keys(BANDS) as IslandScene[]){
      expect(sceneRelief(scene,0,.3)).toBe(0);
      expect(sceneRelief(scene,1,.3)).toBe(0);
    }
  });
  it('bounds travel parallax and returns to neutral when motion is disabled',()=>{
    const target=reliefTarget('dba.scene.shore',{x:.9,y:.85},{x:.5,y:0},true);
    expect(target.x).toBe(.042);
    expect(reliefTarget('dba.scene.shore',{x:.9,y:.85},{x:.5,y:0},false)).toEqual({x:0,y:0});
    expect(reliefTarget('dba.scene.shore',SPAWNS['dba.scene.shore'],{x:0,y:0},true)).toEqual({x:0,y:0});
  });
});
