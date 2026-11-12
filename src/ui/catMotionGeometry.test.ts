import {describe,expect,it} from 'vitest';
import {execFileSync} from 'node:child_process';
import {catMotionGeometry} from './catMotionGeometry';
import {slotAssetUrl,trajAssetUrl} from '../content/assetUrls';
import {companionFoot,companionSole} from '../core/companionPost';
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
 it('matches actual PNG RGBA extent through contain and projects the same physical foot for raw/blob original identity and both mirrors',()=>{
  const def=pixels('src/assets/art/slots/art.yard.prop.nanaicha.png');const base=(def.bbox[3]-def.bbox[1])*.75/def.size[0];
  for(const frame of ['leap-01','leap-02']){const p=pixels('src/assets/companion/nanaicha/traj/'+frame+'.png');const body=(p.bbox[3]-p.bbox[1])/p.size[1];
   for(const face of ['left','right'] as const){const g=catMotionGeometry(trajAssetUrl(frame)!,'dba.scene.yard',frame,face);expect(g.heightScale*body).toBeCloseTo(base,12);expect((g.foot.y-1144/1152)*1000*g.heightScale).toBeCloseTo(0,12);expect(g.foot.x).toBe(.5);}
  }
  for(const face of ['left','right'] as const){const g=catMotionGeometry(slotAssetUrl('art.yard.prop.nanaicha')!,'dba.scene.yard','leap-01',face);expect(g.heightScale).toBe(1);expect(g.foot.y).toBeCloseTo(.9923828125,12);}
 });
 it.each(Object.values(LAND_BY_BEAT))('retains actual %s geometry even when a different next frame is requested',frame=>{
  const g=catMotionGeometry(trajAssetUrl(frame)!,'dba.scene.camp','leap-01','right');expect(g.foot).toEqual(companionFoot(frame));expect(g.sole).toBe(companionSole(frame));expect(g.heightScale).toBe(1);
 });
});
