import * as THREE from 'three';

/** Retain the last rendered scene through asset loading, then dissolve in the
 * incoming scene. No canvas readback, second tone map, or DOM-art flash. */
export class SceneDissolve{
  private front:THREE.WebGLRenderTarget;
  private back:THREE.WebGLRenderTarget;
  private readonly camera=new THREE.Camera();
  private readonly quad:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
  private readonly size=new THREE.Vector2();
  private key='';
  private elapsed=.7;
  private ready=false;
  private blending=false;
  constructor(private renderer:THREE.WebGLRenderer){
    const target=()=>{
      const t=new THREE.WebGLRenderTarget(1,1,{type:THREE.UnsignedByteType,depthBuffer:true,stencilBuffer:false,minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,generateMipmaps:false});
      t.texture.colorSpace=THREE.SRGBColorSpace;return t;
    };
    this.front=target();this.back=target();
    this.quad=new THREE.Mesh(new THREE.PlaneGeometry(2,2),new THREE.ShaderMaterial({
      vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}',
      fragmentShader:`varying vec2 vUv;uniform sampler2D incoming,previous;uniform float progress;
        void main(){gl_FragColor=mix(texture2D(previous,vUv),texture2D(incoming,vUv),progress);
        #include <colorspace_fragment>
        }`,
      uniforms:{incoming:{value:this.front.texture},previous:{value:this.back.texture},progress:{value:1}},
      depthTest:false,depthWrite:false,toneMapped:false,blending:THREE.NoBlending,
    }));this.quad.frustumCulled=false;
  }
  get hasFrame(){return this.ready;}
  get progress(){return this.quad.material.uniforms.progress.value as number;}
  begin(key:string,dt:number,paused:boolean,reduced:boolean,samples=0){
    this.renderer.getDrawingBufferSize(this.size);
    if(this.front.width!==this.size.x||this.front.height!==this.size.y){
      this.front.setSize(this.size.x,this.size.y);this.back.setSize(this.size.x,this.size.y);
      this.ready=false;this.blending=false;
    }
    if(key!==this.key){
      this.blending=this.ready&&!reduced;
      if(this.blending)[this.front,this.back]=[this.back,this.front];
      this.elapsed=0;this.key=key;
    }else if(!paused)this.elapsed+=Math.max(0,dt);
    if(reduced||this.elapsed>=.7)this.blending=false;
    const u=this.quad.material.uniforms;
    u.incoming.value=this.front.texture;u.previous.value=this.blending?this.back.texture:this.front.texture;
    u.progress.value=this.blending?THREE.MathUtils.smoothstep(this.elapsed/.7,0,1):1;
    // Base rendering draws directly into this target. Canvas antialiasing
    // cannot affect it. Post-processed scenes already resolve their own MSAA.
    if(this.front.samples!==samples){this.front.dispose();this.front.samples=samples;}
    this.renderer.setRenderTarget(this.front);
  }
  finish(){this.ready=true;this.present();}
  hold(){if(this.ready)this.present();}
  private present(){this.renderer.setRenderTarget(null);this.renderer.render(this.quad,this.camera);}
  dispose(){this.front.dispose();this.back.dispose();this.quad.geometry.dispose();this.quad.material.dispose();}
}
