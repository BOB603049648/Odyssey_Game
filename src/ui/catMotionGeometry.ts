import { isStandingCompanionUrl } from '../content/assetUrls';
import { companionFoot, companionSole } from '../core/companionPost';
import { companionAtlasSource } from '../content/characterPerformanceAtlas';
import {ACTOR_REGISTRATION} from '../content/paintedActors';
import {sceneBodyHeight,COMPANION_STATURE,SCENE_FIGURE_SCALE} from '../content/sceneScale';
import type {IslandScene} from '../core/island';

const standing=ACTOR_REGISTRATION.cat.frames[0];
export const STANDING_CAT_FOOT = {x:.5,y:standing.sole/standing.height};
/** Actual displayed source owns the pivot. Scene scale is shared with people;
 * shorter resting poses retain the standing camera scale instead of inflating. */
export function catMotionGeometry(originalUrl:string|undefined,scene:string,_requestedFrame:string,_face:'left'|'right'){
  const nominalHeight=scene==='dba.scene.shore'?.168:.22;
  const knownScene=scene in SCENE_FIGURE_SCALE?scene as IslandScene:'dba.scene.shore';
  const visibleHeight=sceneBodyHeight(knownScene,COMPANION_STATURE);
  const frame=companionAtlasSource(originalUrl);
  if(frame){
    const foot={x:.5,y:frame.sole/frame.height};
    return {foot,sole:foot.y,heightScale:visibleHeight/frame.standingFraction/nominalHeight};
  }
  if(isStandingCompanionUrl(originalUrl))return {foot:STANDING_CAT_FOOT,sole:STANDING_CAT_FOOT.y,heightScale:visibleHeight/ACTOR_REGISTRATION.cat.standingFraction/nominalHeight};
  return {foot:companionFoot('fallback'),sole:companionSole('fallback'),heightScale:1};
}
