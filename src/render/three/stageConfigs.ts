import type {IslandScene} from '../../core/island';
import type {GroundPoint} from './ShoreProjection';
import {SHORE_STAGE_PROPS,type ShoreProp} from './shoreProps';

export type SpatialScene='dba.scene.shore'|'dba.scene.hall';
export type StageConfig={
  scene:SpatialScene;spawn:GroundPoint;cameraZoom:number;floorTop:number;floorMirror:readonly[number,number];
  backdrops:readonly(readonly[number,number,number])[];props:readonly ShoreProp[];
  fog:readonly[string,number,number];ambient:readonly[string,number];sun:readonly[string,number];
  sign:boolean;windowLight:boolean;
};
const hallProps:readonly ShoreProp[]=[
  {id:'hall-frame',source:{x:.5,y:.985},foot:{x:.5,y:.985},points:[[0,0],[1,0],[1,1],[0,1]],holes:[[[.37,.29],[.735,.29],[.735,.60],[.37,.60]]]},
  {id:'reading-stand',source:{x:.49,y:.575},foot:{x:.49,y:.575},rect:true,points:[[.409,.42],[.576,.42],[.576,.58],[.409,.58]]},
  {id:'stamp-rail',source:{x:.67,y:.573},foot:{x:.67,y:.573},rect:true,points:[[.611,.465],[.725,.465],[.725,.576],[.611,.576]]},
  {id:'wrist-knot',source:{x:.392,y:.56},foot:{x:.392,y:.56},rect:true,points:[[.379,.302],[.409,.302],[.409,.475],[.379,.475]]},
];
export const SHORE_STAGE_CONFIG:StageConfig={
  scene:'dba.scene.shore',spawn:{x:.44,y:.72},cameraZoom:1,floorTop:.50,floorMirror:[.10,.18],
  backdrops:[[-90,0,.63],[-32,.285,.61]],props:SHORE_STAGE_PROPS,
  fog:['#b7c7c5',26,110],ambient:['#e5edf0',2.7],sun:['#ffe3b0',1.5],sign:true,windowLight:false,
};
export const HALL_STAGE_CONFIG:StageConfig={
  scene:'dba.scene.hall',spawn:{x:.48,y:.64},cameraZoom:.88,floorTop:.50,floorMirror:[.12,.24],
  backdrops:[[-18,0,.54]],props:hallProps,
  fog:['#65533d',35,100],ambient:['#c6d1d0',2.2],sun:['#ffe1a4',.85],sign:false,windowLight:true,
};
export function stageConfig(scene:IslandScene):StageConfig|undefined{
  return scene==='dba.scene.shore'?SHORE_STAGE_CONFIG:scene==='dba.scene.hall'?HALL_STAGE_CONFIG:undefined;
}
