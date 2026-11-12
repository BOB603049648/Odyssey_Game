import {describe,expect,it} from 'vitest';
import {companionPost} from './companionPost';
import {nextGuide,trajClip,GUIDE_GAZE_MS} from './companionTraj';
import {stepWorld} from './worldLoop';
import {BANDS} from './stage';
const dt=1/60;
const routes=[
 ['S1→S2',companionPost('dba.scene.shore',{}, {},{skipWelcome:true}),companionPost('dba.scene.shore',{'dba.beat.water':true},{'dba.flag.driftwood':true})],
 ['C1→C2',companionPost('dba.scene.camp',{}),companionPost('dba.scene.camp',{'dba.beat.food':true})],
 ['Y0→Y1',companionPost('dba.scene.yard',{}),companionPost('dba.scene.yard',{'dba.beat.food':true})],
 ['short',{x:.4,y:.7},{x:.43,y:.7}],['long',{x:.1,y:.7},{x:.9,y:.7}],['reverse',{x:.9,y:.7},{x:.1,y:.7}],
] as const;
describe('guide display follows real physical travel, not a 480ms landing deadline',()=>{
 it.each(routes)('%s keeps leap pixels through every moving step, then lands at the real post',(_name,from,post)=>{
  let guide={phase:'gaze' as 'gaze'|'move'|'hold',elapsed:0,cat:{x:from.x,y:from.y},post};let steps=0;const clips=new Set<string>();
  for(let frame=0;frame<600;frame++){
   const next=stepWorld({walker:{pos:{x:.4,y:.7},velocity:{x:0,y:0},seek:null},intent:{move:null,seek:null},band:BANDS['dba.scene.shore'],dt,guide}).guide;
   const clip=trajClip(next.elapsed,{phase:next.phase,cat:next.cat,post});
   if(next.phase==='move'){expect(clip).not.toBe('land');clips.add(clip);steps++;}
   if(next.phase==='hold'){expect(next.cat).toEqual({x:post.x,y:post.y});expect(clip).toBe('land');break;}
   guide={...guide,...next};
  }
  expect(steps).toBeGreaterThan(0);expect([...clips]).toContain('leap-02');
 });
 it('gaze and zero-distance hold show a landing rather than an airborne frame',()=>{
  const p={x:.5,y:.7};for(const phase of ['gaze','hold'] as const)expect(trajClip(0,{phase,cat:p,post:p})).toBe('land');
 });
 it('dt=0 freezes an almost-arrived guide instead of snapping position or resetting its phase',()=>{
  const cat={x:.496,y:.7},post={x:.5,y:.7};const next=nextGuide({phase:'move',elapsed:730,cat,post,dt:0,retarget:false,sceneChanged:false});
  expect(next.cat).toEqual(cat);expect(next.phase).toBe('move');expect(next.elapsed).toBe(730);
 });
 it('does not start moving before leap resources decode; resumes without consuming the wait as animation time',()=>{
  const cat={x:.2,y:.7},post={x:.8,y:.7};const waiting={phase:'gaze' as const,elapsed:GUIDE_GAZE_MS,cat,post,dt,retarget:false,sceneChanged:false,ready:false};
  const held=nextGuide(waiting);expect(held.cat).toEqual(cat);expect(held.phase).toBe('gaze');expect(held.elapsed).toBe(GUIDE_GAZE_MS);
  const resumed=nextGuide({...waiting,...held,ready:true});expect(resumed.phase).toBe('move');expect(resumed.elapsed).toBeLessThan(50);expect(resumed.cat.x).toBeGreaterThan(cat.x);
 });
 it('worldLoop forwards readiness while the traveler remains independently movable',()=>{
  const guide={phase:'move' as const,elapsed:600,cat:{x:.3,y:.7},post:{x:.8,y:.7},ready:false};
  const next=stepWorld({walker:{pos:{x:.4,y:.7},velocity:{x:.2,y:0},seek:null},intent:{move:{x:1,y:0},seek:null},band:BANDS['dba.scene.shore'],dt,guide});
  expect(next.guide.cat).toEqual(guide.cat);expect(next.guide.elapsed).toBe(600);expect(next.walker.pos.x).toBeGreaterThan(.4);
 });
});
