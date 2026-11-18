import {expect,it,vi} from 'vitest';
import * as THREE from 'three';
import {SceneDissolve} from './SceneDissolve';
function fixture(){
  const size=new THREE.Vector2(1440,900);let target:THREE.WebGLRenderTarget|null=null;
  const renderer={getDrawingBufferSize:(v:THREE.Vector2)=>v.copy(size),setRenderTarget:vi.fn((t:THREE.WebGLRenderTarget|null)=>{target=t;}),render:vi.fn()};
  return{renderer,size,current:()=>target,transition:new SceneDissolve(renderer as never)};
}
it('holds the outgoing scene during loading and swaps buffers only when the next scene can render',()=>{
  const f=fixture(),t=f.transition;t.begin('shore',.016,false,false);const first=f.current();t.finish();expect(t.progress).toBe(1);
  t.hold();t.hold();expect(f.current()).toBeNull();expect(t.hasFrame).toBe(true);
  t.begin('hall',.016,false,false);expect(f.current()).not.toBe(first);expect(t.progress).toBe(0);t.finish();
  t.begin('hall',.35,false,false);expect(t.progress).toBeCloseTo(.5);t.finish();
  t.begin('hall',.35,false,false);expect(t.progress).toBe(1);t.finish();t.dispose();
});
it('freezes the dissolve on pause and avoids it for reduced motion and resized buffers',()=>{
  const f=fixture(),t=f.transition;t.begin('shore',0,false,false);t.finish();t.begin('hall',0,false,false);t.finish();
  t.begin('hall',10,true,false);expect(t.progress).toBe(0);t.finish();
  t.begin('hall',0,false,true);expect(t.progress).toBe(1);t.finish();
  t.begin('camp',0,false,false);t.finish();f.size.set(800,600);
  t.begin('camp',.1,false,false);expect(t.progress).toBe(1);expect(f.current()?.width).toBe(800);t.finish();t.dispose();
});
it('keeps multisampling in direct-render targets and avoids a redundant pass after postprocessing',()=>{
  const f=fixture();f.transition.begin('base',0,false,false,4);
  expect(f.current()?.samples).toBe(4);f.transition.finish();
  f.transition.begin('cinematic',0,false,false,0);
  expect(f.current()?.samples).toBe(0);f.transition.finish();f.transition.dispose();
});
