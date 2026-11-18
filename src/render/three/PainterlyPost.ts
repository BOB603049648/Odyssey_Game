import * as THREE from 'three';
import { sceneSamples } from './textureQuality';
import type { SceneLook } from './looks';

const vertexShader = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const brightFragment = `varying vec2 vUv; uniform sampler2D source; uniform vec2 texel; uniform float threshold;
void main(){
  vec3 c=(texture2D(source,vUv+texel*vec2(-1.,-1.)).rgb+texture2D(source,vUv+texel*vec2(1.,-1.)).rgb
    +texture2D(source,vUv+texel*vec2(-1.,1.)).rgb+texture2D(source,vUv+texel*vec2(1.,1.)).rgb)*.25;
  float peak=max(c.r,max(c.g,c.b));
  gl_FragColor=vec4(c*smoothstep(threshold,threshold+.5,peak),1.);
}`;
const blurFragment = `varying vec2 vUv; uniform sampler2D source; uniform vec2 direction;
void main(){
  vec3 c=texture2D(source,vUv).rgb*.227027;
  c+=(texture2D(source,vUv+direction*1.384615).rgb+texture2D(source,vUv-direction*1.384615).rgb)*.316216;
  c+=(texture2D(source,vUv+direction*3.230769).rgb+texture2D(source,vUv-direction*3.230769).rgb)*.070270;
  gl_FragColor=vec4(c,1.);
}`;
const finishFragment = `varying vec2 vUv; uniform sampler2D source; uniform sampler2D bloomMap;
uniform float bloom; uniform float saturation; uniform float vignette; uniform float time;
uniform vec3 shadowTint; uniform vec3 highlightTint;
void main(){
  vec3 c=texture2D(source,vUv).rgb+texture2D(bloomMap,vUv).rgb*bloom;
  float lum=dot(c,vec3(.2126,.7152,.0722));
  c*=mix(shadowTint,highlightTint,smoothstep(.035,.62,lum));
  c=mix(vec3(dot(c,vec3(.2126,.7152,.0722))),c,saturation);
  vec2 p=(vUv-.5)*vec2(1.12,1.);
  c*=1.-vignette*smoothstep(.13,.52,dot(p,p));
  gl_FragColor=vec4(max(c,vec3(0.)),1.);
  #include <tonemapping_fragment>
  #include <colorspace_fragment>
  // One display-space grain/dither pass; never applied to HTML text.
  float grain=fract(sin(dot(gl_FragCoord.xy+floor(time*12.),vec2(12.9898,78.233)))*43758.5453)-.5;
  gl_FragColor.rgb+=grain*.003;
}`;

/** A bounded four-pass post pipeline: bright extraction, separable bloom,
 * then a single filmic/color/output transform. All intermediate RGB is linear. */
export class PainterlyPost {
  readonly hdr:boolean;
  private readonly sceneTarget:THREE.WebGLRenderTarget;
  private readonly ping:THREE.WebGLRenderTarget;
  private readonly pong:THREE.WebGLRenderTarget;
  private readonly camera=new THREE.Camera();
  private readonly quad:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
  private readonly bright:THREE.ShaderMaterial;
  private readonly blur:THREE.ShaderMaterial;
  private readonly finish:THREE.ShaderMaterial;
  private readonly size=new THREE.Vector2();
  private width=0; private height=0;

  constructor(private renderer:THREE.WebGLRenderer) {
    this.hdr=renderer.extensions.has('EXT_color_buffer_float');
    const type=this.hdr?THREE.HalfFloatType:THREE.UnsignedByteType;
    const target=(depthBuffer:boolean)=>new THREE.WebGLRenderTarget(1,1,{type,depthBuffer,stencilBuffer:false,
      minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false});
    this.sceneTarget=target(true);this.sceneTarget.samples=sceneSamples(renderer.capabilities.maxSamples);
    this.ping=target(false);this.pong=target(false);
    const material=(fragmentShader:string,uniforms:Record<string,THREE.IUniform>,toneMapped=false)=>new THREE.ShaderMaterial({
      vertexShader,fragmentShader,uniforms,toneMapped,depthTest:false,depthWrite:false,blending:THREE.NoBlending});
    this.bright=material(brightFragment,{source:{value:this.sceneTarget.texture},texel:{value:new THREE.Vector2()},threshold:{value:.6}});
    this.blur=material(blurFragment,{source:{value:null},direction:{value:new THREE.Vector2()}});
    this.finish=material(finishFragment,{source:{value:this.sceneTarget.texture},bloomMap:{value:this.ping.texture},
      bloom:{value:.2},saturation:{value:1},vignette:{value:.2},time:{value:0},
      shadowTint:{value:new THREE.Vector3(1,1,1)},highlightTint:{value:new THREE.Vector3(1,1,1)}},true);
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),this.finish);this.quad.frustumCulled=false;
  }

  render(scene:THREE.Scene,camera:THREE.Camera,look:SceneLook,time:number) {
    const renderer=this.renderer;
    renderer.getDrawingBufferSize(this.size);
    if(this.size.x!==this.width||this.size.y!==this.height){
      this.width=this.size.x;this.height=this.size.y;
      this.sceneTarget.setSize(this.width,this.height);
      this.ping.setSize(Math.max(1,Math.ceil(this.width/4)),Math.max(1,Math.ceil(this.height/4)));
      this.pong.setSize(this.ping.width,this.ping.height);
      this.bright.uniforms.texel.value.set(1/this.width,1/this.height);
    }
    const previousTone=renderer.toneMapping, previousExposure=renderer.toneMappingExposure;
    const previousTarget=renderer.getRenderTarget();
    try {
      renderer.toneMapping=THREE.NoToneMapping;
      renderer.setRenderTarget(this.sceneTarget);renderer.render(scene,camera);
      this.bright.uniforms.threshold.value=look.threshold;
      this.pass(this.bright,this.ping);
      this.blur.uniforms.source.value=this.ping.texture;this.blur.uniforms.direction.value.set(1.5/this.ping.width,0);
      this.pass(this.blur,this.pong);
      this.blur.uniforms.source.value=this.pong.texture;this.blur.uniforms.direction.value.set(0,1.5/this.pong.height);
      this.pass(this.blur,this.ping);
      const u=this.finish.uniforms;
      u.bloom.value=look.bloom;u.saturation.value=look.saturation;u.vignette.value=look.vignette;u.time.value=time;
      u.shadowTint.value.set(...look.shadows);u.highlightTint.value.set(...look.highlights);
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=look.exposure;
      this.pass(this.finish,previousTarget);
    } finally {
      renderer.setRenderTarget(previousTarget);renderer.toneMapping=previousTone;renderer.toneMappingExposure=previousExposure;
    }
  }
  private pass(material:THREE.ShaderMaterial,target:THREE.WebGLRenderTarget|null) {
    this.quad.material=material;this.renderer.setRenderTarget(target);this.renderer.render(this.quad,this.camera);
  }
  dispose(){
    [this.sceneTarget,this.ping,this.pong].forEach(target=>target.dispose());
    [this.bright,this.blur,this.finish].forEach(material=>material.dispose());this.quad.geometry.dispose();
  }
}
