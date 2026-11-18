import type { IslandScene } from '../../core/island';
import { BANDS, BRIDGE_KNOTS, SPAWNS } from '../../core/stage';
import * as THREE from 'three';

const smooth=(a:number,b:number,x:number)=>{const t=Math.min(1,Math.max(0,(x-a)/(b-a)));return t*t*(3-2*t);};

/** Signed relief: distant scenery moves more slowly, the walkable stage stays
 * registered, and the outer foreground moves against it. This is authored
 * image relief, not a recovered metric depth map. */
export function sceneRelief(scene:IslandScene,x:number,y:number):number {
  const ground=BANDS[scene].minY;
  let depth=(1-smooth(ground-.25,ground-.035,y))*.7;
  if(scene==='dba.scene.shore'){
    depth=(1-smooth(.10,.61,y))*.95;
    // Gate, mural and spring belong to the interaction stage.
    depth*=smooth(.025,.30,x)*smooth(.49,.36,y)+smooth(.36,.49,y)*smooth(.26,.36,x);
  }else if(scene==='dba.scene.camp'){
    const house=smooth(.14,.24,x)*(1-smooth(.74,.83,x))*smooth(.25,.48,y);
    depth*=1-house*.86;
  }else if(scene==='dba.scene.yard'){
    depth*=.58;
  }else if(scene==='dba.scene.hall'){
    depth*=.58*smooth(.035,.095,x)*(1-smooth(.90,.96,x));
  }else if(scene==='dba.scene.path'){
    // The diagonal bridge and its signs stay in the same plane as the feet.
    const end=BRIDGE_KNOTS.findIndex(([at])=>at>=x);
    const a=BRIDGE_KNOTS[Math.max(0,end<0?BRIDGE_KNOTS.length-1:end-1)],b=BRIDGE_KNOTS[end<0?BRIDGE_KNOTS.length-1:end];
    const bridge=a[1]+(b[1]-a[1])*(b[0]===a[0]?0:(x-a[0])/(b[0]-a[0]));
    depth=(1-smooth(bridge-.20,bridge-.045,y))*.85;
  }else if(scene==='dba.scene.night'){
    const pavilion=smooth(.13,.24,x)*(1-smooth(.73,.84,x));
    depth*=1-pavilion*.78;
  }
  const foreground=smooth(Math.max(.91,BANDS[scene].maxY+.025),1,y)*.5;
  return Math.max(-.5,Math.min(1,depth-foreground))*smooth(0,.035,x)*(1-smooth(.965,1,x));
}

export function reliefTarget(scene:IslandScene,foot:{x:number;y:number},pointer:{x:number;y:number},enabled:boolean){
  if(!enabled)return {x:0,y:0};
  const spawn=SPAWNS[scene];
  return {x:Math.max(-.042,Math.min(.042,(foot.x-spawn.x)*.16+pointer.x*.007)),
    y:Math.max(-.014,Math.min(.014,(foot.y-spawn.y)*.055-pointer.y*.003))};
}

export function registerRelief(geometry:THREE.BufferGeometry,scene:IslandScene,localPlane:boolean){
  const points=geometry.getAttribute('position'),weights=new Float32Array(points.count);
  for(let i=0;i<points.count;i++){
    const x=points.getX(i)+(localPlane ? .5 : 0),y=1-(points.getY(i)+(localPlane ? .5 : 0));
    weights[i]=sceneRelief(scene,x,y);
  }
  const existing=geometry.getAttribute('imageRelief');
  if(existing?.count===weights.length){(existing.array as Float32Array).set(weights);existing.needsUpdate=true;}
  else geometry.setAttribute('imageRelief',new THREE.Float32BufferAttribute(weights,1));
}

/** Cutout triangles need comparable density to the painted mesh: a coarse
 * pillar triangle otherwise drifts away from the same curve underneath. */
export function refineReliefMask(geometry:THREE.BufferGeometry){
  type P=readonly [number,number];
  const source=geometry.index?geometry.toNonIndexed():geometry;
  const points=source.getAttribute('position'),positions:number[]=[],uv:number[]=[];
  const mid=(a:P,b:P):P=>[(a[0]+b[0])/2,(a[1]+b[1])/2];
  function triangle(a:P,b:P,c:P,level:number){
    const edge=Math.max(Math.hypot(a[0]-b[0],a[1]-b[1]),Math.hypot(a[0]-c[0],a[1]-c[1]),Math.hypot(c[0]-b[0],c[1]-b[1]));
    if(edge>.035&&level<5){
      const ab=mid(a,b),ac=mid(a,c),bc=mid(b,c);
      triangle(a,ab,ac,level+1);triangle(ab,b,bc,level+1);triangle(ac,bc,c,level+1);triangle(ab,bc,ac,level+1);
    }else for(const p of [a,b,c]){positions.push(p[0],p[1],0);uv.push(p[0],p[1]);}
  }
  for(let i=0;i<points.count;i+=3)triangle([points.getX(i),points.getY(i)],[points.getX(i+1),points.getY(i+1)],[points.getX(i+2),points.getY(i+2)],0);
  if(source!==geometry)source.dispose();
  geometry.setIndex(null);geometry.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  geometry.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));geometry.computeVertexNormals();
}

export function applyRelief(shader:Parameters<THREE.Material['onBeforeCompile']>[0],offset:THREE.IUniform<THREE.Vector2>){
  shader.uniforms.reliefOffset=offset;
  shader.vertexShader='attribute float imageRelief; uniform vec2 reliefOffset;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    transformed.xy+=reliefOffset*imageRelief;`);
}
