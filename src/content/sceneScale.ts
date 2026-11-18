import type {IslandScene} from '../core/island';

/** Reference upright body occupies .88 of the sprite box. All figures share
 * this scene camera scale; individual atlas padding never defines stature. */
export const TRAVELER_BODY_FRACTION=.88;
export const SCENE_FIGURE_SCALE:Record<IslandScene,{height:number;reference:string}>={
  'dba.scene.shore':{height:.136,reference:'门楼净高、泉眼盆沿与近岸地面'},
  'dba.scene.camp':{height:.158,reference:'棚门、铺位与火塘坐面'},
  'dba.scene.yard':{height:.18,reference:'经堂门洞、台阶与分食器皿'},
  'dba.scene.hall':{height:.22,reference:'木柱、阅卷架与前景门槛'},
  'dba.scene.path':{height:.15,reference:'桥面、护栏与入口石阶'},
  'dba.scene.night':{height:.175,reference:'亭柱、石案与火塘'},
};
export function sceneTravelerHeight(scene:IslandScene){return SCENE_FIGURE_SCALE[scene].height;}
export const NPC_STATURE={repairer:.96,keeper:.91,fisher:.98,scribe:.92} as const;
/** The hooded companion reaches below the traveler's knee/thigh transition. */
export const COMPANION_STATURE=.40;
export function sceneBodyHeight(scene:IslandScene,relative=1){return sceneTravelerHeight(scene)*TRAVELER_BODY_FRACTION*relative;}

/** Neutral sprite illumination in linear RGB; shared by spatial and relief views. */
export const FIGURE_AMBIENT:Record<IslandScene,readonly[number,number,number]>={
  'dba.scene.shore':[.88,.94,.96],'dba.scene.camp':[.78,.74,.66],
  'dba.scene.yard':[.93,.90,.82],'dba.scene.hall':[.68,.64,.55],
  'dba.scene.path':[.72,.82,.87],'dba.scene.night':[.28,.37,.52],
};
export function sceneFigureFilter(scene:IslandScene){
  const rgb=FIGURE_AMBIENT[scene],brightness=Math.pow(rgb.reduce((a,b)=>a+b,0)/3,1/2.2);
  return `brightness(${brightness.toFixed(3)}) saturate(.96)`;
}
