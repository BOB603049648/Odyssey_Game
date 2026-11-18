import * as THREE from 'three';
import { cropUV, type Crop } from './geometry';

export type RegisteredFrame = {
  key:string; texture:THREE.Texture; crop:Crop|null; mirror:boolean;
  foot:{x:number;y:number}; pose:string; facing:string; costume:readonly [number,number,number];
  scale?:readonly[number,number];
};
type Shader=Parameters<THREE.Material['onBeforeCompile']>[0];

/** One foot-registered silhouette, sampled from two poses. Color is blended in
 * premultiplied alpha, so a transition does not paint two full-opacity bodies.
 * The clock belongs to the renderer, including pause/background suspension. */
export class TravelerBlend {
  current:RegisteredFrame|undefined;
  private previous:RegisteredFrame|undefined;
  private elapsed=0;
  private duration=0;
  private uniforms={
    oldFrame:{value:null as THREE.Texture|null}, frameMix:{value:1},
    frameRect:{value:new THREE.Vector4()}, oldRect:{value:new THREE.Vector4()},
    framePivot:{value:new THREE.Vector2()}, oldPivot:{value:new THREE.Vector2()},
    frameScale:{value:new THREE.Vector2(1,1)}, oldScale:{value:new THREE.Vector2(1,1)},
    frameTexel:{value:new THREE.Vector2()}, oldTexel:{value:new THREE.Vector2()},
    frameCostume:{value:new THREE.Vector3(1,1,1)}, oldCostume:{value:new THREE.Vector3(1,1,1)},
  };
  get mix(){return this.uniforms.frameMix.value;}
  reset(){this.current=undefined;this.previous=undefined;this.elapsed=0;this.duration=0;}
  update(frame:RegisteredFrame|null,dt:number,paused:boolean){
    if(paused&&this.current)return;
    if(frame&&frame.key!==this.current?.key){
      const continuingTurn=this.mix<1&&this.duration>.045&&frame.pose===this.current?.pose&&frame.facing===this.current?.facing;
      if(continuingTurn)this.elapsed+=Math.max(0,dt);
      else{
        this.previous=this.current??frame;
        this.duration=this.current ? (frame.pose!==this.current.pose||frame.facing!==this.current.facing ? .11 : .045) : 0;
        this.elapsed=0;
      }
      this.current=frame;
    }else this.elapsed+=Math.max(0,dt);
    if(!this.current)return;
    this.uniforms.frameMix.value=this.duration ? THREE.MathUtils.smoothstep(this.elapsed/this.duration,0,1) : 1;
    if(this.mix===1)this.previous=this.current;
    this.setFrame(this.current,false);this.setFrame(this.previous!,true);
  }
  private setFrame(frame:RegisteredFrame,old:boolean){
    const u=this.uniforms,rect=cropUV(frame.crop,frame.mirror);
    (old?u.oldRect:u.frameRect).value.set(rect.left,rect.bottom,rect.right-rect.left,rect.top-rect.bottom);
    (old?u.oldPivot:u.framePivot).value.set(frame.foot.x,1-frame.foot.y);
    (old?u.oldScale:u.frameScale).value.set(...(frame.scale??[1,1]));
    (old?u.oldCostume:u.frameCostume).value.set(...frame.costume);
    const image=frame.texture.image as {width?:number;height?:number}|undefined;
    (old?u.oldTexel:u.frameTexel).value.set(.5/(frame.crop?.width??image?.width??1024),.5/(frame.crop?.height??image?.height??1024));
    if(old)u.oldFrame.value=frame.texture;
  }
  /** Preserve other lighting hooks; the same coverage also drives shadow depth. */
  attach(material:THREE.Material){
    const before=material.onBeforeCompile.bind(material);
    material.onBeforeCompile=(shader,renderer)=>{before(shader,renderer);this.shader(shader);};
    material.customProgramCacheKey=()=> 'registered-traveler-blend-v1';material.needsUpdate=true;
  }
  private shader(shader:Shader){
    Object.assign(shader.uniforms,this.uniforms);
    shader.vertexShader='attribute vec2 footUv; varying vec2 vFootUv;\n'+shader.vertexShader;
    shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\nvFootUv=footUv;');
    shader.fragmentShader=`
      varying vec2 vFootUv;
      uniform sampler2D oldFrame;
      uniform float frameMix;
      uniform vec4 frameRect,oldRect;
      uniform vec2 framePivot,oldPivot,frameTexel,oldTexel,frameScale,oldScale;
      uniform vec3 frameCostume,oldCostume;
      vec4 registeredSample(sampler2D bitmap,vec4 rect,vec2 pivot,vec2 texel,vec3 costume,vec2 size){
        vec2 local=vFootUv/size+pivot;
        float coverage=step(0.,local.x)*step(local.x,1.)*step(0.,local.y)*step(local.y,1.);
        vec4 pixel=texture2D(bitmap,rect.xy+clamp(local,texel,1.-texel)*rect.zw);
        pixel.rgb=sRGBTransferEOTF(vec4(pixel.rgb/max(pixel.a,.00001),1.)).rgb;
        vec3 srgb=mix(pixel.rgb*12.92,1.055*pow(max(pixel.rgb,vec3(0.)),vec3(1./2.4))-.055,step(vec3(.0031308),pixel.rgb));
        float cloth=clamp(-32.*srgb.r+40.*srgb.b+.2,0.,1.)*clamp(2.-dot(srgb,vec3(.54213,1.82376,.18411)),0.,1.);
        srgb=mix(srgb,srgb*costume,cloth);
        pixel.rgb=mix(srgb/12.92,pow((srgb+.055)/1.055,vec3(2.4)),step(vec3(.04045),srgb));
        pixel.a*=coverage;return pixel;
      }
    `+shader.fragmentShader;
    shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
      #ifdef USE_MAP
        vec4 incoming=registeredSample(map,frameRect,framePivot,frameTexel,frameCostume,frameScale);
        vec4 outgoing=registeredSample(oldFrame,oldRect,oldPivot,oldTexel,oldCostume,oldScale);
        float coverage=mix(outgoing.a,incoming.a,frameMix);
        vec3 color=mix(outgoing.rgb*outgoing.a,incoming.rgb*incoming.a,frameMix)/max(coverage,.00001);
        diffuseColor*=vec4(color,coverage);
      #endif`);
  }
  sync(mesh:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>){
    const current=this.current,old=this.previous;if(!current||!old)return;
    if(!mesh.material.map){mesh.material.needsUpdate=true;}
    mesh.material.map=current.texture;
    if(mesh.customDepthMaterial instanceof THREE.MeshDepthMaterial){
      if(!mesh.customDepthMaterial.map)mesh.customDepthMaterial.needsUpdate=true;
      mesh.customDepthMaterial.map=current.texture;
    }
    // Union of both registered image rectangles: an idle's transparent padding
    // must not clip the next walk pose, or pull its planted foot up/down.
    const a=current.scale??[1,1],b=old.scale??[1,1];
    const left=Math.min(-current.foot.x*a[0],-old.foot.x*b[0]),right=Math.max((1-current.foot.x)*a[0],(1-old.foot.x)*b[0]);
    const bottom=Math.min((current.foot.y-1)*a[1],(old.foot.y-1)*b[1]),top=Math.max(current.foot.y*a[1],old.foot.y*b[1]);
    const positions=mesh.geometry.getAttribute('position');
    if(!mesh.geometry.hasAttribute('footUv'))mesh.geometry.setAttribute('footUv',new THREE.Float32BufferAttribute(new Float32Array(8),2));
    const footUv=mesh.geometry.getAttribute('footUv');
    for(let i=0;i<4;i++){
      const x=i%2===0?left:right,y=i<2?top:bottom;
      footUv.setXY(i,x,y);positions.setXYZ(i,x-(.5-current.foot.x),y-(current.foot.y-.5),0);
    }
    footUv.needsUpdate=true;positions.needsUpdate=true;
    mesh.userData.frameMix=this.mix;
  }
}
