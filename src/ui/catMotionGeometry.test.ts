import {describe,expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {catMotionGeometry} from './catMotionGeometry';
import {slotAssetUrl,trajAssetUrl} from '../content/assetUrls';
import {companionFoot} from '../core/companionPost';
import {LAND_BY_BEAT} from '../core/companionTraj';
const pixels=(file:string)=>JSON.parse(execFileSync('python3',['-c',`from PIL import Image
import sys,json
im=Image.open(sys.argv[1]).convert('RGBA');print(json.dumps({'size':im.size,'bbox':im.getchannel('A').getbbox()}))`,file],{encoding:'utf8'})) as {size:number[],bbox:number[]};
describe('source-identity geometry, not desired beat metadata',()=>{
 it('does not normalize or borrow a special Y0 foot for an unknown raw/blob source',()=>{
  for(const desired of ['leap-01','leap-02','land-yard-give']){
   const g=catMotionGeometry('blob:unregistered','dba.scene.yard',desired,'left');expect(g.heightScale).toBe(1);expect(g.foot).toEqual(companionFoot('fallback'));
  }
 });
 it('matches standing and leap visible heights using the actual shipped sources',()=>{
  const def=pixels('src/assets/companion/nanaicha/nanaicha-hero.png');
  const standing=catMotionGeometry(slotAssetUrl('art.yard.prop.nanaicha')!,'dba.scene.yard','leap-01','right');
  const base=standing.heightScale*(def.bbox[3]-def.bbox[1])/def.size[1];
  for(const frame of ['leap-01','leap-02']){
   const p=pixels('src/assets/companion/nanaicha/traj/'+frame+'.png');
   for(const face of ['left','right'] as const){
    const g=catMotionGeometry(trajAssetUrl(frame)!,'dba.scene.yard',frame,face);
    expect(g.heightScale*(p.bbox[3]-p.bbox[1])/p.size[1]).toBeCloseTo(base,12);
    expect(g.foot).toEqual(companionFoot(frame));
   }
  }
 });
 it.each(Object.values(LAND_BY_BEAT))('retains actual %s geometry even when a different next frame is requested',frame=>{
  const g=catMotionGeometry(trajAssetUrl(frame)!,'dba.scene.camp','leap-01','right');expect(g.foot).toEqual({x:.5,y:1054/1152});expect(g.sole).toBe(1054/1152);expect(g.heightScale*.22).toBeCloseTo(.08,12);
 });
});
