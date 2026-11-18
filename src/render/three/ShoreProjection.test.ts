import { describe,expect,it } from 'vitest';
import * as THREE from 'three';
import { ShoreProjection } from './ShoreProjection';
import { GATES,gateApproach,gateCrossing } from '../../core/stage';
import { groundRoute,groundStep } from '../../core/navigation';

describe('perspective shore coordinates',()=>{
  it('projects authored floor points back to their painting coordinates',()=>{
    const view=new ShoreProjection();
    for(const point of [{x:.17,y:.62},{x:.44,y:.72},{x:.6,y:.7},{x:.9,y:.74},{x:.3,y:.87}]){
      const world=view.ground(point)!;
      expect(world.y).toBeCloseTo(0,9);
      expect(view.authored(world).x).toBeCloseTo(point.x,9);
      expect(view.authored(world).y).toBeCloseTo(point.y,9);
    }
  });
  it('ray-picks the same floor after dolly and viewport cropping',()=>{
    const view=new ShoreProjection();
    view.update({x:.8,y:.82},{x:.3,y:0},{w:1656,h:931.5},{w:1440,h:900},{x:160,y:30},1,false,false);
    for(const point of [{x:.17,y:.62},{x:.44,y:.72},{x:.6,y:.7}]){
      const screen=view.project(view.ground(point)!);
      const picked=view.pick(screen.x,screen.y)!;
      expect(picked.x).toBeCloseTo(point.x,8);expect(picked.y).toBeCloseTo(point.y,8);
    }
  });
  it('keeps a fixed-height actor within the shallow perspective of the beach',()=>{
    const view=new ShoreProjection();
    const projectedHeight=(y:number)=>{
      const foot=view.ground({x:.5,y})!;
      return view.project(foot).y-view.project(foot.clone().add(new THREE.Vector3(0,1.4,0))).y;
    };
    const ratio=projectedHeight(.88)/projectedHeight(.62);
    expect(ratio).toBeGreaterThan(1.05);
    expect(ratio).toBeLessThan(1.25);
    // The higher camera can intersect the floor beyond the painted horizon;
    // navigation still rejects places outside the authored walkable ground.
    expect(view.pick(.5,0)!.y).toBeCloseTo(0,7);
  });
  it('moves actual scenery depths at different rates without orbiting the painting',()=>{
    const view=new ShoreProjection(),angle=view.camera.quaternion.clone();
    const points=[view.upright({x:.5,y:.2},-90),view.ground({x:.5,y:.72})!,view.ground({x:.5,y:.985})!];
    const before=points.map(p=>view.project(p));
    view.update({x:.9,y:.72},{x:.3,y:0},{w:1600,h:900},{w:1600,h:900},{x:0,y:0},2,false,false);
    const travel=points.map((p,i)=>Math.abs(view.project(p).x-before[i].x));
    expect(travel[0]).toBeLessThan(travel[1]);expect(travel[1]).toBeLessThan(travel[2]);
    expect(travel[1]).toBeGreaterThan(.01);
    expect(view.camera.quaternion.angleTo(angle)).toBeLessThan(1e-7);
  });
  it('crosses the hall doorway along the new northward threshold',()=>{
    const gate=GATES.find(g=>g.from==='dba.scene.shore'&&g.to==='dba.scene.hall')!;
    const approach=gateApproach(gate);
    const route=groundRoute(gate.from,{x:.44,y:.72},approach);
    expect(route.at(-1)).toEqual(approach);
    const from={x:gate.x,y:gate.y+.005},to=groundStep(gate.from,from,{x:gate.x,y:gate.y-.005});
    expect(gateCrossing(gate.from,from,to)).toBe(gate);
  });
});
