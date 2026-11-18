import * as THREE from 'three';

export type GroundPoint={x:number;y:number};
/** A shallow-perspective stage, viewed from above the beach. The previous
 * near-horizon 44° camera almost doubled a fixed-height figure across the sand.
 * Shared projection changes the floor, scenery, actors and hit areas together. */
export const STAGE_LENS={fov:32,height:18,distance:26,targetZ:-5} as const;
/** Authoring camera maps the original painting to a real X/Z floor. The live
 * camera can dolly independently; picking always unprojects through that view. */
export class ShoreProjection {
  readonly reference=new THREE.PerspectiveCamera(STAGE_LENS.fov,16/9,.1,320);
  readonly camera=new THREE.PerspectiveCamera(STAGE_LENS.fov,16/9,.1,320);
  private readonly ray=new THREE.Raycaster();
  private readonly floor=new THREE.Plane(new THREE.Vector3(0,1,0),0);
  private readonly offset=new THREE.Vector2();
  constructor(){
    this.reference.position.set(0,STAGE_LENS.height,STAGE_LENS.distance);this.reference.lookAt(0,0,STAGE_LENS.targetZ);this.reference.updateMatrixWorld();
    this.camera.copy(this.reference);this.camera.updateMatrixWorld();
  }
  ground(point:GroundPoint){
    this.ray.setFromCamera(new THREE.Vector2(point.x*2-1,1-point.y*2),this.reference);
    return this.ray.ray.intersectPlane(this.floor,new THREE.Vector3());
  }
  upright(point:GroundPoint,z:number){
    this.ray.setFromCamera(new THREE.Vector2(point.x*2-1,1-point.y*2),this.reference);
    return this.ray.ray.intersectPlane(new THREE.Plane(new THREE.Vector3(0,0,1),-z),new THREE.Vector3())!;
  }
  bodyHeight(spawn:GroundPoint,height:number){
    return this.upright({x:spawn.x,y:spawn.y-height},this.ground(spawn)!.z).y;
  }
  bodyDistance(from:GroundPoint,to:GroundPoint,spawn:GroundPoint,height:number){
    return this.ground(from)!.distanceTo(this.ground(to)!)/this.bodyHeight(spawn,height);
  }
  /** Local perspective derivative keeps world speed proportional to body size.
   * Navigation and collisions retain their original authored coordinates. */
  velocity(at:GroundPoint,wish:GroundPoint,spawn:GroundPoint,height:number,referenceHeight:number){
    const power=Math.hypot(wish.x*16/9,wish.y);if(power<1e-9)return wish;
    const epsilon=.001;
    const unitsPerSecond=this.ground(at)!.distanceTo(this.ground({x:at.x+wish.x*epsilon,y:at.y+wish.y*epsilon})!)/epsilon;
    const scale=power*this.bodyHeight(spawn,height)/referenceHeight/Math.max(1e-9,unitsPerSecond);
    return{x:wish.x*scale,y:wish.y*scale};
  }
  authored(world:THREE.Vector3){const p=world.clone().project(this.reference);return{x:(p.x+1)/2,y:(1-p.y)/2};}
  project(world:THREE.Vector3){const p=world.clone().project(this.camera);return{x:(p.x+1)/2,y:(1-p.y)/2};}
  pick(x:number,y:number){
    this.ray.setFromCamera(new THREE.Vector2(x*2-1,1-y*2),this.camera);
    const point=this.ray.ray.intersectPlane(this.floor,new THREE.Vector3());
    return point?this.authored(point):null;
  }
  update(foot:GroundPoint,pointer:GroundPoint,world:{w:number;h:number},view:{w:number;h:number},cam:GroundPoint,dt:number,paused:boolean,reduced:boolean){
    const focus=this.ground(foot)!;
    const origin=this.ground({x:.5,y:.72})!;
    const targetX=reduced?0:THREE.MathUtils.clamp(focus.x*.10+pointer.x*.4,-.85,.85);
    const targetZ=reduced?0:THREE.MathUtils.clamp((focus.z-origin.z)*.05,-.25,.25);
    if(reduced)this.offset.set(0,0);
    else if(!paused)this.offset.lerp(new THREE.Vector2(targetX,targetZ),1-Math.exp(-dt*3.2));
    this.camera.position.set(this.offset.x,STAGE_LENS.height,STAGE_LENS.distance+this.offset.y);
    // Translate a fixed lens; do not orbit the painting or make it breathe as
    // the player walks vertically. Different world depths supply the parallax.
    this.camera.lookAt(this.offset.x,0,STAGE_LENS.targetZ+this.offset.y);
    this.camera.setViewOffset(world.w,world.h,cam.x,cam.y,view.w,view.h);this.camera.updateMatrixWorld();
  }
}
