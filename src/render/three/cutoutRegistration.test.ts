import { afterEach, expect, it } from 'vitest';
import * as THREE from 'three';
import { PaintedStage } from './PaintedStage';
import { SHORE_STAGE_CONFIG, HALL_STAGE_CONFIG } from './stageConfigs';
import { prepareSceneTexture } from './textureQuality';
import regions from '../../assets/art/spatial/refined/regions.json';

afterEach(()=>{document.body.innerHTML='';});
it('keeps a continuous gate and selects matching color/depth maps for both spring states',()=>{
  const viewport=document.createElement('div');viewport.className='walk-viewport';
  const root=document.createElement('div');viewport.append(root);document.body.append(viewport);
  const stage=new PaintedStage(root,SHORE_STAGE_CONFIG),original=new THREE.Texture(),plate=new THREE.Texture();
  const gate=new THREE.Texture(),spring=new THREE.Texture(),empty=new THREE.Texture();
  prepareSceneTexture(gate,4,false,regions.gate);prepareSceneTexture(spring,4,false,regions.spring);prepareSceneTexture(empty,4,false,regions['spring-empty']);
  const actor=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:original}));
  const p={scene:'dba.scene.shore',view:{w:1440,h:900},world:{w:1840,h:1035},cam:{x:0,y:0},paused:true,reduced:false,
    traveler:{x:.44,y:.72,height:.136,current:{shown:'idle',support:null}},cat:{position:{x:.38,y:.75},foot:{x:.5,y:.98},height:.08,mirror:false,lift:0}};
  const update=(carried:boolean)=>stage.update(p as never,original,original,actor,actor,carried?original:null,{x:0,y:0},0,plate,undefined,undefined,{gate,spring,'spring-empty':empty});
  const prop=(name:string)=>stage.scene.getObjectByName(name) as THREE.Mesh<THREE.BufferGeometry,THREE.MeshBasicMaterial>;
  update(false);
  expect(prop('gate')).toBeDefined();expect(prop('gate-roof')).toBeUndefined();
  expect(prop('gate').material.map).toBe(gate);expect(prop('gate').material.customProgramCacheKey()).toBe('registered-rgba-v1');
  expect(prop('spring').visible).toBe(true);expect(prop('spring-empty').visible).toBe(false);
  update(true);
  expect(prop('spring').visible).toBe(false);expect(prop('spring-empty').visible).toBe(true);
  expect(prop('spring-empty').material.map).toBe(empty);
  expect((prop('spring-empty').customDepthMaterial as THREE.MeshDepthMaterial).map).toBe(empty);
  expect(SHORE_STAGE_CONFIG.props.find(p=>p.id==='spring')!.foot).toEqual({x:.6,y:.7});
  stage.dispose();actor.geometry.dispose();actor.material.dispose();[original,plate,gate,spring,empty].forEach(t=>t.dispose());
});
it('keeps the hall frame intact while excluding the independent furniture from it',()=>{
  const frame=HALL_STAGE_CONFIG.props.find(p=>p.id==='hall-frame')!;
  expect(frame.points).toEqual([[0,0],[1,0],[1,1],[0,1]]);
  const [left,top]=frame.holes![0][0], [right,bottom]=frame.holes![0][2];
  for(const id of ['reading-stand','stamp-rail','wrist-knot']){
    const spec=HALL_STAGE_CONFIG.props.find(p=>p.id===id)!;
    for(const [x,y] of spec.points){expect(x).toBeGreaterThan(left);expect(x).toBeLessThan(right);expect(y).toBeGreaterThan(top);expect(y).toBeLessThan(bottom);}
  }
});
it('extends the foreground framing slightly through the floor so no bottom seam floats above it',()=>{
  for(const [config,name] of [[SHORE_STAGE_CONFIG,'front-rocks'],[HALL_STAGE_CONFIG,'hall-frame']] as const){
    const stage=new PaintedStage(document.createElement('div'),config);
    const mesh=stage.scene.getObjectByName(name) as THREE.Mesh<THREE.BufferGeometry>;
    mesh.geometry.computeBoundingBox();
    expect(mesh.geometry.boundingBox!.min.y).toBeLessThan(0);
    expect(mesh.geometry.boundingBox!.max.y).toBeGreaterThan(0);
    stage.dispose();
  }
});
