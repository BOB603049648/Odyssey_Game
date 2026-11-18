import {expect,it} from 'vitest';
import * as THREE from 'three';
import {TravelerBlend,type RegisteredFrame} from './TravelerBlend';

function frame(key:string,pose='walk',facing='right',sole=.96):RegisteredFrame{
  return {key,texture:new THREE.Texture(),crop:null,mirror:facing==='left',foot:{x:.5,y:sole},pose,facing,costume:[1,1,1]};
}
it.each([30,60,120])('finishes a walk transition in active time at %s Hz',hz=>{
  const blend=new TravelerBlend(),a=frame('a'),b=frame('b');blend.update(a,0,false);
  expect(blend.mix).toBe(1);blend.update(b,0,false);expect(blend.mix).toBe(0);
  for(let n=0;n<Math.ceil(.045*hz);n++)blend.update(b,1/hz,false);
  expect(blend.mix).toBe(1);a.texture.dispose();b.texture.dispose();
});
it('holds a turn through pause and a missing texture, then settles without replay',()=>{
  const blend=new TravelerBlend(),a=frame('a'),b=frame('b','walk','left');blend.update(a,0,false);blend.update(b,0,false);
  blend.update(b,.04,false);const partial=blend.mix;expect(partial).toBeGreaterThan(0);expect(partial).toBeLessThan(1);
  blend.update(null,20,true);expect(blend.mix).toBe(partial);expect(blend.current).toBe(b);
  blend.update(null,.07,false);expect(blend.mix).toBe(1);expect(blend.current).toBe(b);
  a.texture.dispose();b.texture.dispose();
});
it('keeps the same world foot and full pose bounds across different soles',()=>{
  const blend=new TravelerBlend(),a=frame('idle','idle','front',.999),b=frame('walk','walk','front',.95);
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial());
  mesh.customDepthMaterial=new THREE.MeshDepthMaterial();
  blend.update(a,0,false);blend.update(b,0,false);blend.sync(mesh);
  const pos=mesh.geometry.getAttribute('position'),uv=mesh.geometry.getAttribute('footUv');
  expect(pos.getY(0)+b.foot.y-.5).toBeCloseTo(a.foot.y,6);
  expect(pos.getY(2)+b.foot.y-.5).toBeCloseTo(b.foot.y-1,6);
  // Both frame samplers map foot-relative origin to their own sole.
  expect(uv.getY(0)).toBeCloseTo(a.foot.y,6);expect(uv.getY(2)).toBeCloseTo(b.foot.y-1,6);
  expect(mesh.material.map).toBe(b.texture);expect((mesh.customDepthMaterial as THREE.MeshDepthMaterial).map).toBe(b.texture);
  blend.update(b,.12,false);blend.sync(mesh);expect(pos.getY(0)).toBeCloseTo(.5);
  mesh.geometry.dispose();mesh.material.dispose();mesh.customDepthMaterial.dispose();a.texture.dispose();b.texture.dispose();
});
it('uses the same frame uniforms and coverage for visible color and shadow depth',()=>{
  const blend=new TravelerBlend(),a=frame('a');blend.update(a,0,false);
  const color=new THREE.MeshBasicMaterial(),depth=new THREE.MeshDepthMaterial();blend.attach(color);blend.attach(depth);
  const shader=()=>({uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>'});
  const visible=shader(),shadow=shader();color.onBeforeCompile(visible as never,{} as never);depth.onBeforeCompile(shadow as never,{} as never);
  expect(visible.fragmentShader).toBe(shadow.fragmentShader);
  expect(visible.uniforms).toEqual(shadow.uniforms);
  expect(visible.fragmentShader).toContain('outgoing.rgb*outgoing.a');
  expect(visible.fragmentShader).toContain('clamp(local,texel,1.-texel)');
  color.dispose();depth.dispose();a.texture.dispose();
});
it('keeps both source scales around the same foot while blending different atlas padding',()=>{
  const blend=new TravelerBlend(),a=frame('idle','idle','front',.93),b=frame('reach','reach','right',.98);
  a.scale=[.98,.98];b.scale=[1.23,.92];
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial());
  blend.update(a,0,false);blend.update(b,0,false);blend.sync(mesh);
  const uv=mesh.geometry.getAttribute('footUv');
  expect(uv.getX(0)).toBeCloseTo(-.5*1.23,6);
  expect(uv.getY(0)).toBeCloseTo(Math.max(.93*.98,.98*.92),6);
  const color=new THREE.MeshBasicMaterial();blend.attach(color);
  const shader={uniforms:{},vertexShader:'#include <begin_vertex>',fragmentShader:'#include <map_fragment>'};
  color.onBeforeCompile(shader as never,{} as never);
  expect(shader.fragmentShader).toContain('vFootUv/size+pivot');
  expect(shader.fragmentShader).toContain('pixel.rgb/max(pixel.a,.00001)');
  a.texture.dispose();b.texture.dispose();mesh.geometry.dispose();mesh.material.dispose();color.dispose();
});
it('finishes a turn even when the incoming walk clip advances before the turn ends',()=>{
  const blend=new TravelerBlend(),a=frame('right'),b=frame('left-1','walk','left'),c=frame('left-2','walk','left');
  blend.update(a,0,false);blend.update(b,0,false);blend.update(b,.07,false);
  const progress=blend.mix;blend.update(c,.016,false);
  expect(blend.mix).toBeGreaterThan(progress);expect(blend.current).toBe(c);
  blend.update(c,.03,false);expect(blend.mix).toBe(1);
  for(const f of [a,b,c])f.texture.dispose();
});
it('registers differently positioned torsos during a blend, including its shadow sampler',()=>{
  const blend=new TravelerBlend(),a=frame('back-6','walk','back'),b=frame('back-7','walk','back');
  a.foot.x=185.84/372;b.foot.x=137.81/372;
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial());
  blend.update(a,0,false);blend.update(b,0,false);blend.sync(mesh);
  const uv=mesh.geometry.getAttribute('footUv');
  expect(uv.getX(0)).toBeCloseTo(-a.foot.x,6);
  expect(uv.getX(1)).toBeCloseTo(1-b.foot.x,6);
  // Both image extents remain present while their torso pivots coincide.
  const positions=mesh.geometry.getAttribute('position');
  expect(positions.getX(0)+.5-b.foot.x).toBeCloseTo(uv.getX(0),6);
  mesh.geometry.dispose();mesh.material.dispose();a.texture.dispose();b.texture.dispose();
});
