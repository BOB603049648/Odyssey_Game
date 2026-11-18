import {expect,it} from 'vitest';
import {ShoreProjection} from './ShoreProjection';
import {HALL_STAGE_CONFIG,SHORE_STAGE_CONFIG} from './stageConfigs';
import {WALK_SPEED,desiredVelocity,type Point} from '../../core/walk';
import {TRAVELER_HEIGHT,WALK_STRIDE} from '../../core/travelerMotion';
import {stepWorld} from '../../core/worldLoop';
import {BANDS,gateAt,interactionStandPoint,SPOTS} from '../../core/stage';

it.each([SHORE_STAGE_CONFIG,HALL_STAGE_CONFIG])('keeps gait speed equal for near/far and sideways/depth movement in $scene',config=>{
  const view=new ShoreProjection(),height=config.scene==='dba.scene.hall'?.22:TRAVELER_HEIGHT;
  for(const y of [.62,.75,.88])for(const direction of [{x:1,y:0},{x:0,y:-1},{x:0,y:1}]){
    const at={x:.6,y},wish=desiredVelocity(direction,null,at);
    const velocity=view.velocity(at,wish,config.spawn,height,TRAVELER_HEIGHT),dt=1/120;
    const next={x:at.x+velocity.x*dt,y:at.y+velocity.y*dt};
    const cycles=view.bodyDistance(at,next,config.spawn,height)/(WALK_STRIDE/TRAVELER_HEIGHT);
    expect(cycles/dt).toBeCloseTo(WALK_SPEED/WALK_STRIDE,1);
  }
});
it.each([30,60,120])('starts and stops with inertia while preserving the physical stride at %s Hz',hz=>{
  const view=new ShoreProjection(),spawn=HALL_STAGE_CONFIG.spawn;
  let walker={pos:{x:.35,y:.70},velocity:{x:0,y:0},seek:null as Point|null};
  const advance=(move:Point|null)=>{
    const result=stepWorld({walker,intent:{move,seek:null},band:BANDS['dba.scene.hall'],dt:1/hz,
      groundVelocity:(at,wish)=>view.velocity(at,wish,spawn,.22,TRAVELER_HEIGHT),
      guide:{phase:'hold',elapsed:0,cat:spawn,post:spawn}});walker=result.walker;return result;
  };
  const first=advance({x:1,y:0});expect(first.walker.velocity.x).toBeGreaterThan(0);
  for(let n=1;n<hz*.5;n++)advance({x:1,y:0});
  const atRelease={...walker.pos};advance(null);expect(walker.pos.x).toBeGreaterThan(atRelease.x);
  for(let n=0;n<hz;n++)advance(null);
  expect(walker.velocity).toEqual({x:0,y:0});const stopped={...walker.pos};advance(null);expect(walker.pos).toEqual(stopped);
});
it('still reaches the shore doorway with perspective-adjusted acceleration',()=>{
  const config=SHORE_STAGE_CONFIG,view=new ShoreProjection();
  let walker={pos:{...config.spawn},velocity:{x:0,y:0},seek:{x:.17,y:.62} as Point|null};
  for(let n=0;n<2400&&walker.seek;n++)walker=stepWorld({walker,scene:config.scene,intent:{move:null,seek:walker.seek},band:BANDS[config.scene],dt:1/60,
    groundVelocity:(at,wish)=>view.velocity(at,wish,config.spawn,TRAVELER_HEIGHT,TRAVELER_HEIGHT),
    guide:{phase:'hold',elapsed:0,cat:config.spawn,post:config.spawn}}).walker;
  expect(walker.seek).toBeNull();expect(gateAt(config.scene,walker.pos)?.to).toBe('dba.scene.hall');
});
it('reaches the reading side of hall furniture without walking through its footprint',()=>{
  const config=HALL_STAGE_CONFIG,view=new ShoreProjection();
  const target=interactionStandPoint(config.scene,SPOTS[config.scene].find(spot=>spot.id==='hall-stamps')!);
  let walker={pos:{...config.spawn},velocity:{x:0,y:0},seek:target as Point|null};
  for(let n=0;n<2400&&walker.seek;n++)walker=stepWorld({walker,scene:config.scene,intent:{move:null,seek:walker.seek},band:BANDS[config.scene],dt:1/60,
    groundVelocity:(at,wish)=>view.velocity(at,wish,config.spawn,.22,TRAVELER_HEIGHT),
    guide:{phase:'hold',elapsed:0,cat:config.spawn,post:config.spawn}}).walker;
  expect(walker.seek).toBeNull();expect(walker.pos).toEqual(target);
});
