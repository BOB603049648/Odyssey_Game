import {expect,it} from 'vitest';
import {groundRoute,groundStep,onGround} from './navigation';
import {HALL_PROP_FOOTPRINTS,SPOTS,interactionStandPoint,standsAt} from './stage';

it('routes around reading furniture while keeping the northern aisle open',()=>{
  const from={x:.49,y:.68},goal={x:.49,y:.56};
  expect(onGround('dba.scene.hall',{x:.49,y:.575})).toBe(false);
  const route=groundRoute('dba.scene.hall',from,goal);
  expect(route.length).toBeGreaterThan(1);expect(route.at(-1)).toEqual(goal);
  let previous=from;
  for(const next of route){
    for(let i=0;i<=100;i++)expect(onGround('dba.scene.hall',{x:previous.x+(next.x-previous.x)*i/100,y:previous.y+(next.y-previous.y)*i/100})).toBe(true);
    previous=next;
  }
});
it('stops a northward keyboard step at the stand instead of crossing it',()=>{
  const next=groundStep('dba.scene.hall',{x:.49,y:.60},{x:.49,y:.57});
  expect(next.y).toBeGreaterThanOrEqual(.590-1e-9);expect(onGround('dba.scene.hall',next)).toBe(true);
});
it('approaches both inscriptions from their reachable front edges',()=>{
  for(const furniture of HALL_PROP_FOOTPRINTS){
    const spot=SPOTS['dba.scene.hall'].find(s=>s.id===furniture.id)!;
    const point=interactionStandPoint('dba.scene.hall',spot);
    expect(point.y).toBeGreaterThan(furniture.maxY);expect(onGround('dba.scene.hall',point)).toBe(true);
    expect(standsAt('dba.scene.hall',spot,point)).toBe(true);
    expect(groundRoute('dba.scene.hall',{x:.48,y:.64},point).at(-1)).toEqual(point);
  }
});
