import {afterEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {ShoreStage} from './ShoreStage';
import {pickSpatialGround} from '../spatialRegistry';

afterEach(()=>{vi.restoreAllMocks();document.body.innerHTML='';});

it('projects puzzle controls added after entry and restores ordinary picking on exit',async()=>{
  const context=new Proxy({},{get:()=>()=>{},set:()=>true});
  vi.spyOn(HTMLCanvasElement.prototype,'getContext').mockReturnValue(context as never);
  document.body.innerHTML='<div class="walk-viewport"><div class="world-root"></div></div>';
  const viewport=document.querySelector<HTMLElement>('.walk-viewport')!,root=document.querySelector<HTMLElement>('.world-root')!;
  vi.spyOn(viewport,'getBoundingClientRect').mockReturnValue(new DOMRect(100,50,1440,900));
  const stage=new ShoreStage(root),texture=new THREE.Texture();
  const source=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture}));
  const props={scene:'dba.scene.shore',view:{w:1440,h:900},world:{w:1840,h:1035},cam:{x:117,y:135},paused:false,reduced:false,
    traveler:{x:.44,y:.72,height:.136,current:{shown:'idle',support:null}},
    cat:{position:{x:.38,y:.75},foot:{x:.5,y:.98},height:.08,mirror:false,lift:0}};
  const update=()=>stage.update(props as never,texture,texture,source,source,null,{x:.2,y:0},.1);
  update();
  const control=document.createElement('button');control.dataset.groundX='.6';control.dataset.groundY='.7';root.append(control);
  await Promise.resolve();update();
  expect(control.style.translate).not.toBe('');
  const point=stage.projection.project(stage.projection.ground({x:.6,y:.7})!);
  const picked=pickSpatialGround(viewport,100+point.x*1440,50+point.y*900)!;
  expect(picked.x).toBeCloseTo(.6,8);expect(picked.y).toBeCloseTo(.7,8);
  stage.deactivate();
  expect(control.style.translate).toBe('');expect(pickSpatialGround(viewport,800,500)).toBeUndefined();
  stage.dispose();source.geometry.dispose();source.material.dispose();texture.dispose();
});
