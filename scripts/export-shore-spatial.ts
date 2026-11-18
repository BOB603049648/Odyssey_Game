import {companionPost} from '../src/core/companionPost';
import {TravelerBlend} from '../src/render/three/TravelerBlend';
import {paintedTravelerFrame,PAINTED_ACTORS,paintedCatFrame} from '../src/content/paintedActors';
import {sceneTravelerHeight} from '../src/content/sceneScale';
import {catMotionGeometry} from '../src/ui/catMotionGeometry';
import {npcForScene} from '../src/content/npcJourney';
import {npcFrame} from '../src/content/npcAtlas';
import {figureIllumination} from '../src/render/three/figureLighting';
import {SCENE_LOOKS} from '../src/render/three/looks';
/** Export the actual Three.js stage geometry for offline structural inspection.
 * This is not a browser screenshot or a replacement for browser visual QA. */
import * as THREE from 'three';
import { mkdirSync,writeFileSync,readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { PaintedStage } from '../src/render/three/PaintedStage';
import { SHORE_STAGE_CONFIG,HALL_STAGE_CONFIG } from '../src/render/three/stageConfigs';
import { prepareSceneTexture } from '../src/render/three/textureQuality';
import { worldSize,cameraOffset,lookEast } from '../src/core/walk';

const output=resolve(process.argv[2]??'artifacts/three-v4');mkdirSync(output,{recursive:true});
const noop=()=>{};
const context=new Proxy({},{get:()=>noop,set:()=>true});
Object.assign(globalThis,{document:{createElement:()=>({width:512,height:160,getContext:()=>context})}});
const viewport={getBoundingClientRect:()=>({left:0,top:0,width:1440,height:900})};
const root={closest:()=>viewport,querySelectorAll:()=>[],dataset:{}};
const texture=(name:string)=>{const t=new THREE.Texture();t.name=resolve(name);return t;};
const sceneKey=process.argv[3]==='hall'?'hall':'shore';
const config=sceneKey==='hall'?HALL_STAGE_CONFIG:SHORE_STAGE_CONFIG;
const original=texture(`src/assets/art/painted/${sceneKey}-scene.webp`),clean=texture(`src/assets/art/spatial/${sceneKey}-clean.png`),matte=texture(`src/assets/art/spatial/refined/${sceneKey}-atlas.webp`);
const regions=JSON.parse(readFileSync('src/assets/art/spatial/refined/regions.json','utf8'));
prepareSceneTexture(matte,4,false,regions[`${sceneKey}-atlas`]);
const cutouts:Record<string,THREE.Texture>={};
if(sceneKey==='shore')for(const name of ['gate','mural','spring','spring-empty','waystone']){
  cutouts[name]=texture(`src/assets/art/spatial/refined/${name}.webp`);prepareSceneTexture(cutouts[name],4,false,regions[name]);
}
const traveler=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture('src/assets/art/actors/idle.webp')}));
const cat=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture('src/assets/art/actors/cat-performance.webp')}));
const villager=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({map:texture('src/assets/art/npc/villagers.webp')}));
function uv(mesh:typeof traveler,crop:{x:number;y:number;width:number;height:number;atlasWidth:number;atlasHeight:number}){
  const q=mesh.geometry.getAttribute('uv'),l=crop.x/crop.atlasWidth,r=(crop.x+crop.width)/crop.atlasWidth,t=1-crop.y/crop.atlasHeight,b=1-(crop.y+crop.height)/crop.atlasHeight;
  q.setXY(0,l,t);q.setXY(1,r,t);q.setXY(2,l,b);q.setXY(3,r,b);
}
const frame=paintedTravelerFrame('idle-front-01.png')!,catFrame=paintedCatFrame('pose-observe-01')!;
uv(traveler,frame);uv(cat,catFrame);
for(const variant of ['spawn','oblique']){
  const stage=new PaintedStage(root as unknown as HTMLElement,config);
  const foot=variant==='spawn'?config.spawn:{x:.72,y:sceneKey==='hall'?.78:.84};
  const view={w:1440,h:900},world=worldSize(view.w,view.h);
  const cam=lookEast(cameraOffset(foot,view.w,view.h),view.w,sceneKey==='shore',undefined,view.h);
  const catFoot=variant==='spawn'?companionPost(config.scene,{},{}):{x:foot.x-.06,y:foot.y+.025};
  const catGeometry=catMotionGeometry(`${PAINTED_ACTORS['cat-performance']}#pose-observe-01`,config.scene,'pose-observe-01','right');
  const props={scene:config.scene,view,world,cam,paused:false,reduced:false,
    traveler:{...foot,height:sceneTravelerHeight(config.scene),current:{shown:'idle-front',support:null}},
    cat:{position:catFoot,foot:catGeometry.foot,height:(sceneKey==='shore'?.168:.22)*catGeometry.heightScale,mirror:false,lift:0}};
  const look=SCENE_LOOKS[config.scene],npc=npcForScene(config.scene)!;
  traveler.material.color.copy(figureIllumination(look,foot,0));cat.material.color.copy(figureIllumination(look,catFoot,0));
  villager.material.color.copy(figureIllumination(look,npc,0));uv(villager,npcFrame(npc).crop);
  const motion=new TravelerBlend();motion.update({key:'idle',texture:traveler.material.map!,crop:frame,mirror:false,
    foot:{x:frame.bodyX/frame.width,y:frame.sole/frame.height},pose:'idle',facing:'front',costume:[1,1,1],scale:[frame.scale*(frame.width/frame.height)/.75,frame.scale]},0,false);
  stage.update(props as never,original,clean,traveler,cat,null,{x:variant==='spawn'?0:.5,y:0},10,matte,motion,{source:villager,position:npc,...npcFrame(npc)},cutouts);
  stage.scene.updateMatrixWorld(true);
  const meshes:unknown[]=[];
  stage.scene.traverse(object=>{
    if(!(object instanceof THREE.Mesh)||!object.visible)return;
    const geometry=object.geometry,p=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
    if(!p)return;
    const positions:number[]=[];
    for(let i=0;i<p.count;i++){
      const v=new THREE.Vector3(p.getX(i),p.getY(i),p.getZ(i)).applyMatrix4(object.matrixWorld);positions.push(v.x,v.y,v.z);
    }
    const material=Array.isArray(object.material)?object.material[0]:object.material;
    if(material instanceof THREE.ShaderMaterial)return; // Three-specific shafts are intentionally omitted.
    const mappedUV:number[]=[];
    if(uv)for(let i=0;i<uv.count;i++){const q=new THREE.Vector3(uv.getX(i),uv.getY(i),1);if(material.map)q.applyMatrix3(material.map.matrix);mappedUV.push(q.x,q.y);}
    meshes.push({name:object.name||`mesh-${meshes.length}`,positions,uv:uv?mappedUV:null,
      index:geometry.index?Array.from(geometry.index.array):Array.from({length:p.count},(_,i)=>i),
      texture:material.map?.name||null,color:material.map instanceof THREE.CanvasTexture?'947749':material.color?.getHexString()??'a48b60',tint:material.color?.toArray(),
      mask:material.alphaMap?.name||null,
      transparent:!!material.transparent||material.alphaTest>0,alphaTest:material.alphaTest??0,opacity:material.opacity,ground:object===stage.floor,castShadow:object.castShadow});
  });
  const camera=stage.projection.camera;
  const sun=stage.scene.children.find(child=>child instanceof THREE.DirectionalLight) as THREE.DirectionalLight;
  writeFileSync(resolve(output,`${sceneKey}-${variant}.json`),JSON.stringify({meshes,camera:{matrix:camera.matrixWorld.elements,projection:camera.projectionMatrix.elements},width:view.w,height:view.h,floorMirror:config.floorMirror,ambient:config.ambient,sunIntensity:config.sun[1],sunDirection:sun.target.position.clone().sub(sun.position).toArray()}));
  console.log(sceneKey,variant,meshes.length,'meshes');stage.dispose();
}
