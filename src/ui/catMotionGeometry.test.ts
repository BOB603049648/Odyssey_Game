import {describe,expect,it} from 'vitest';
import {catMotionGeometry} from './catMotionGeometry';
import {slotAssetUrl,trajAssetUrl} from '../content/assetUrls';
import {companionFoot} from '../core/companionPost';
import {ACTOR_REGISTRATION,paintedCatFrame} from '../content/paintedActors';
import {sceneBodyHeight,COMPANION_STATURE} from '../content/sceneScale';
import {STANDING_CAT_FOOT} from './catMotionGeometry';
import {LAND_BY_BEAT} from '../core/companionTraj';
describe('source-identity geometry, not desired beat metadata',()=>{
 it('does not normalize or borrow a special Y0 foot for an unknown raw/blob source',()=>{
  for(const desired of ['leap-01','leap-02','land-yard-give']){
   const g=catMotionGeometry('blob:unregistered','dba.scene.yard',desired,'left');expect(g.heightScale).toBe(1);expect(g.foot).toEqual(companionFoot('fallback'));
  }
 });
 it('matches standing and leap body scale using the displayed atlas registration',()=>{
  const standing=catMotionGeometry(slotAssetUrl('art.yard.prop.nanaicha'),'dba.scene.yard','leap-01','right');
  const base=standing.heightScale*ACTOR_REGISTRATION.cat.standingFraction;
  for(const id of ['leap-01','leap-02'])for(const face of ['left','right'] as const){
    const cell=paintedCatFrame(id)!,geometry=catMotionGeometry(trajAssetUrl(id),'dba.scene.yard','land-companion',face);
    expect(geometry.heightScale*cell.standingFraction).toBeCloseTo(base,10);
    expect(geometry.foot.y).toBe(cell.sole/cell.height);
  }
 });
 it.each(Object.values(LAND_BY_BEAT))('retains actual %s geometry even when a different next frame is requested',frame=>{
  const g=catMotionGeometry(trajAssetUrl(frame)!,'dba.scene.camp','leap-01','right');expect(g.foot).toEqual(STANDING_CAT_FOOT);expect(g.sole).toBe(STANDING_CAT_FOOT.y);expect(g.heightScale*.22*ACTOR_REGISTRATION.cat.standingFraction).toBeCloseTo(sceneBodyHeight('dba.scene.camp',COMPANION_STATURE),10);
 });
});
