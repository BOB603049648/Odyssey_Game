import type { IslandScene } from '../../core/island';
import {FIGURE_AMBIENT} from '../../content/sceneScale';

type RGB = readonly [number, number, number];
export type LightSource = { x:number; y:number; radius:number; power:number; glow:number; color:string; flicker?:boolean };
export type SceneLook = {
  name:string; exposure:number; bloom:number; threshold:number; saturation:number; vignette:number;
  shadows:RGB; highlights:RGB; ambient:RGB; figureAmbient:RGB; fog:number; fogColor:string;
  shaft:readonly [number,number,number,number]; shaftPower:number; shaftColor:string;
  lights:readonly LightSource[]; fire?:readonly [number,number];
};

/** Lighting anchors are authored against the current paintings, in top-left UVs.
 * These describe painted light sources, not inferred 3D surface normals. */
export const SCENE_LOOKS: Record<IslandScene, SceneLook> = {
  'dba.scene.shore': {
    figureAmbient:FIGURE_AMBIENT['dba.scene.shore'],
    name:'晨雾 · 水光', exposure:1.08, bloom:.24, threshold:.62, saturation:.96, vignette:.17,
    shadows:[.87,.99,1.06], highlights:[1.045,1.015,.955], ambient:[.95,.99,1.02],
    fog:.14, fogColor:'#b5cbc9', shaft:[.07,.08,.65,.77], shaftPower:.065, shaftColor:'#ffe1a9',
    lights:[{x:.06,y:.08,radius:.28,power:.12,glow:.16,color:'#ffd8a0'}],
  },
  'dba.scene.camp': {
    figureAmbient:FIGURE_AMBIENT['dba.scene.camp'],
    name:'棚火 · 暮色', exposure:1.0, bloom:.25, threshold:.64, saturation:.96, vignette:.17,
    shadows:[.88,.97,1.03], highlights:[1.045,1.0,.935], ambient:[1.0,.96,.89],
    fog:.035, fogColor:'#c4b5a0', shaft:[.23,.15,.62,.81], shaftPower:.05, shaftColor:'#ffda97',
    lights:[{x:.778,y:.628,radius:.19,power:.6,glow:.11,color:'#ffb65e',flicker:true},
      {x:.508,y:.51,radius:.10,power:.25,glow:.08,color:'#ffd08a'}], fire:[.778,.628],
  },
  'dba.scene.yard': {
    figureAmbient:FIGURE_AMBIENT['dba.scene.yard'],
    name:'前坪 · 斜阳', exposure:1.0, bloom:.15, threshold:.72, saturation:.96, vignette:.15,
    shadows:[.91,.99,1.02], highlights:[1.035,1.01,.965], ambient:[1.0,.98,.94],
    fog:.025, fogColor:'#b9c6ba', shaft:[.12,.08,.77,.83], shaftPower:.035, shaftColor:'#ffe4b4', lights:[],
  },
  'dba.scene.hall': {
    figureAmbient:FIGURE_AMBIENT['dba.scene.hall'],
    name:'经堂 · 窗隙光', exposure:1.0, bloom:.26, threshold:.55, saturation:.95, vignette:.24,
    shadows:[.84,.94,1.04], highlights:[1.06,1.01,.92], ambient:[.89,.91,.93],
    fog:.035, fogColor:'#c5b394', shaft:[.15,.20,.72,.75], shaftPower:.22, shaftColor:'#ffe3aa',
    lights:[{x:.23,y:.60,radius:.35,power:.35,glow:0,color:'#ffda9b'}],
  },
  'dba.scene.path': {
    figureAmbient:FIGURE_AMBIENT['dba.scene.path'],
    name:'雾径 · 冷岚', exposure:1.02, bloom:.17, threshold:.64, saturation:.92, vignette:.22,
    shadows:[.83,.98,1.09], highlights:[1.015,1.025,1.0], ambient:[.89,.97,1.03],
    fog:.24, fogColor:'#a6c4c9', shaft:[.7,.04,.35,.8], shaftPower:.045, shaftColor:'#d5e9ec', lights:[],
  },
  'dba.scene.night': {
    figureAmbient:FIGURE_AMBIENT['dba.scene.night'],
    name:'夜营 · 月色与余烬', exposure:.98, bloom:.30, threshold:.42, saturation:.96, vignette:.26,
    shadows:[.86,.96,1.07], highlights:[1.08,1.01,.92], ambient:[.83,.90,1.0],
    fog:.09, fogColor:'#769da9', shaft:[.88,.08,.39,.82], shaftPower:.045, shaftColor:'#afcfe9',
    lights:[{x:.617,y:.698,radius:.24,power:1.5,glow:.14,color:'#ffac59',flicker:true},
      {x:.215,y:.585,radius:.15,power:.75,glow:.07,color:'#ffc477',flicker:true}], fire:[.617,.698],
  },
};
