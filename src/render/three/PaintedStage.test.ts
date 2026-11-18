import {afterEach,expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {PaintedStage} from './PaintedStage';
import {HALL_STAGE_CONFIG} from './stageConfigs';
import {pickSpatialGround} from '../spatialRegistry';

afterEach(()=>{vi.restoreAllMocks();document.body.innerHTML='';});
function fixture(){
  document.body.innerHTML='<div class="walk-viewport"><div class="world-root"></div></div>';
  const root=document.querySelector<HTMLElement>('.world-root')!;
  const viewport=root.parentElement!;vi.spyOn(viewport,'getBoundingClientRect').mockReturnValue(new DOMRect(40,30,1440,900));
  const stage=new PaintedStage(root,HALL_STAGE_CONFIG);
  const original=new THREE.Texture(),clean=new THREE.Texture(),matte=new THREE.Texture();
  const source=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:original}));
  const p={scene:'dba.scene.hall',view:{w:1440,h:900},world:{w:1840,h:1035},cam:{x:117,y:100},paused:false,reduced:false,route:[] as {x:number;y:number}[],guide:false,
    traveler:{x:.48,y:.64,height:.22,current:{shown:'idle',support:null}},cat:{position:{x:.40,y:.65},foot:{x:.5,y:.96},height:.08,mirror:false,lift:0}};
  const update=()=>stage.update(p as never,original,clean,source,source,null,{x:0,y:0},.1,matte);
  return{stage,p,viewport,update,original,clean,matte,source,cleanup:()=>{stage.dispose();source.geometry.dispose();source.material.dispose();original.dispose();clean.dispose();matte.dispose();}};
}
it('uses the same authored RGBA image for prop color, contour and shadow',()=>{
  const f=fixture();f.update();
  const stand=f.stage.scene.getObjectByName('reading-stand') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
  expect(stand.material.map).toBe(f.matte);expect(stand.material.alphaMap).toBeNull();
  expect((stand.customDepthMaterial as THREE.MeshDepthMaterial).map).toBe(f.matte);
  expect((stand.customDepthMaterial as THREE.MeshDepthMaterial).alphaMap).toBeNull();
  expect(f.stage.scene.getObjectByName('inlaid-exit-arrows')).toBeDefined();f.cleanup();
});
it('grounds an NPC and its shadow, projects its click area, and hides it when absent',()=>{
  const f=fixture(),control=document.createElement('button');
  control.dataset.testid='npc:script';control.dataset.groundX='.79';control.dataset.groundY='.65';
  f.viewport.querySelector('.world-root')!.append(control);
  f.stage.update(f.p as never,f.original,f.clean,f.source,f.source,null,{x:0,y:0},.1,f.matte,undefined,{source:f.source,position:{x:.79,y:.65},foot:{x:.5,y:.977},height:.235});
  const npc=f.stage.scene.getObjectByName('village-npc') as THREE.Mesh;
  const shadow=f.stage.scene.getObjectByName('village-npc-contact') as THREE.Mesh;
  expect(npc.visible).toBe(true);expect(npc.castShadow).toBe(true);
  expect(shadow.position.y).toBeCloseTo(.012);expect(shadow.visible).toBe(true);
  expect(parseFloat(control.style.height)).toBeGreaterThan(44);expect(control.style.translate).not.toBe('');
  f.update();expect(npc.visible).toBe(false);expect(shadow.visible).toBe(false);f.cleanup();
});
it('lifts the companion above the floor while its contact shadow fades',()=>{
  const f=fixture();f.update();
  const companion=f.stage.scene.getObjectByName('companion')!;
  const shadow=f.stage.scene.getObjectByName('companion-contact') as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
  const before=companion.position.y,opacity=shadow.material.opacity;
  f.p.cat.lift=.7;f.update();
  expect(companion.position.y).toBeGreaterThan(before);expect(shadow.position.y).toBeCloseTo(.012);
  expect(shadow.material.opacity).toBeLessThan(opacity);f.cleanup();
});
it('keeps hall ray picking registered with the wider composition',()=>{
  const f=fixture();f.update();
  const screen=f.stage.projection.project(f.stage.projection.ground({x:.67,y:.596})!);
  const picked=pickSpatialGround(f.viewport,40+screen.x*1440,30+screen.y*900)!;
  expect(picked.x).toBeCloseTo(.67,8);expect(picked.y).toBeCloseTo(.596,8);f.cleanup();
});
it('places the selected route and requested walkable overlay on the actual floor',()=>{
  const f=fixture();f.p.route=[{x:.48,y:.64},{x:.60,y:.65},{x:.67,y:.596}];f.p.guide=true;f.update();
  const route=f.stage.scene.getObjectByName('ground-route') as THREE.Line<THREE.BufferGeometry>;
  expect(route.visible).toBe(true);expect(route.geometry.drawRange.count).toBe(3);
  const positions=route.geometry.getAttribute('position');
  for(let i=0;i<3;i++)expect(positions.getY(i)).toBeCloseTo(.025);
  expect(f.stage.scene.getObjectByName('walkable-ground-overlay')?.visible).toBe(true);
  f.p.route=[];f.p.guide=false;f.update();
  expect(route.visible).toBe(false);expect(f.stage.scene.getObjectByName('walkable-ground-overlay')?.visible).toBe(false);f.cleanup();
});
it('fits a prop click area and restores its original layout when spatial mode closes',async()=>{
  const f=fixture();
  const control=document.createElement('button');control.dataset.testid='hall-mural';control.dataset.groundX='.49';control.dataset.groundY='.57';
  Object.assign(control.style,{width:'200px',height:'100px',transform:'translate(-8px, -50%)'});
  f.viewport.querySelector('.world-root')!.append(control);f.update();
  expect(parseFloat(control.style.width)).toBeGreaterThanOrEqual(44);expect(parseFloat(control.style.height)).toBeGreaterThanOrEqual(44);
  expect(control.style.transform).toBe('translate(-50%, -100%)');
  f.stage.deactivate();
  expect(control.style.width).toBe('200px');expect(control.style.height).toBe('100px');expect(control.style.transform).toBe('translate(-8px, -50%)');f.cleanup();
});
