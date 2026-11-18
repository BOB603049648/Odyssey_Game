import * as THREE from 'three';
import type { SceneLook } from './looks';

type Shader = Parameters<THREE.Material['onBeforeCompile']>[0];
export function createPaintLighting() {
  return { paintEnabled:{value:0},paintAmbient:{value:new THREE.Vector3(1,1,1)},
    paintLightA:{value:new THREE.Vector4()},paintLightB:{value:new THREE.Vector4()},
    paintColorA:{value:new THREE.Color()},paintColorB:{value:new THREE.Color()} };
}
export type PaintLighting = ReturnType<typeof createPaintLighting>;

/** Shared image-space light field for painted scenery, cutouts and sprites.
 * A flat illustration has no trustworthy normals: this is bounded relighting,
 * not a physically based reconstruction of the scene. */
export function applyPaintLighting(shader:Shader,uniforms:PaintLighting) {
  Object.assign(shader.uniforms,uniforms);
  shader.vertexShader='varying vec2 paintPosition;\n'+shader.vertexShader;
  shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
    vec2 lightXY=(modelMatrix*vec4(position,1.)).xy;paintPosition=vec2(lightXY.x,1.-lightXY.y);`);
  shader.fragmentShader=`varying vec2 paintPosition; uniform float paintEnabled;
    uniform vec3 paintAmbient,paintColorA,paintColorB;uniform vec4 paintLightA,paintLightB;
    float paintFalloff(vec4 lamp){vec2 d=(paintPosition-lamp.xy)*vec2(1.777778,1.);
      return lamp.w*exp(-dot(d,d)*2.5/max(.0001,lamp.z*lamp.z));}
    `+shader.fragmentShader;
  shader.fragmentShader=shader.fragmentShader.replace('#include <color_fragment>',`#include <color_fragment>
    vec3 illumination=paintAmbient+paintColorA*paintFalloff(paintLightA)+paintColorB*paintFalloff(paintLightB);
    diffuseColor.rgb*=mix(vec3(1.),illumination,paintEnabled);`);
}

export function updatePaintLighting(uniforms:PaintLighting,look:SceneLook,time:number,enabled:boolean) {
  uniforms.paintEnabled.value=enabled?1:0;uniforms.paintAmbient.value.set(...look.ambient);
  for(let i=0;i<2;i++){
    const source=look.lights[i],point=i===0?uniforms.paintLightA:uniforms.paintLightB,color=i===0?uniforms.paintColorA:uniforms.paintColorB;
    if(!source){point.value.set(0,0,1,0);continue;}
    point.value.set(source.x,source.y,source.radius,source.power*firePulse(time,!!source.flicker));
    color.value.set(source.color);
  }
}
export function firePulse(time:number,flicker:boolean){return flicker?1+Math.sin(time*3.7)*.06+Math.sin(time*7.9+1.3)*.035:1;}

const vertex='varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const airFragment=`varying vec2 vUv;uniform float time,fogStrength,shaftPower;uniform vec3 fogTint,shaftTint;uniform vec4 shaft;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
void main(){
  vec2 uv=vec2(vUv.x,1.-vUv.y);
  float n=noise(uv*vec2(6.,14.)+vec2(time*.018,time*.006));
  float veil=exp(-pow((uv.y-.47)/.12,2.))*.65+exp(-pow((uv.y-.91)/.06,2.))*.32;
  float fog=veil*smoothstep(.18,.8,n)*fogStrength;
  vec2 direction=normalize((shaft.zw-shaft.xy)*vec2(1.777778,1.));
  vec2 d=(uv-shaft.xy)*vec2(1.777778,1.);
  float along=dot(d,direction),across=dot(d,vec2(-direction.y,direction.x));
  float width=.045+max(along,0.)*.22;
  float cone=exp(-pow(across/width,2.)*2.)*smoothstep(0.,.12,along)*(1.-smoothstep(.65,1.2,along));
  float streak=.45+.55*pow(.5+.5*sin(across/max(.15,along)*85.+time*.04),2.);
  float rays=cone*streak*(.7+.3*n)*shaftPower;
  float alpha=clamp(fog+rays,0.,.4);
  gl_FragColor=vec4((fogTint*fog+shaftTint*rays)/max(.0001,fog+rays),alpha);
}`;
const glowFragment=`varying vec2 vUv;uniform vec3 tint;uniform float power;
void main(){vec2 p=(vUv-.5)*2.;float a=exp(-dot(p,p)*5.)*(1.-smoothstep(.7,1.,length(p)));
  gl_FragColor=vec4(tint*2.5,a*power);}`;
const moteVertex=`attribute float opacity;varying float alpha;uniform float pixelRatio;uniform float size;
void main(){alpha=opacity;gl_PointSize=size*pixelRatio;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`;
const moteFragment=`varying float alpha;uniform vec3 tint;
void main(){float d=length(gl_PointCoord-.5)*2.;if(d>=1.)discard;gl_FragColor=vec4(tint,pow(1.-d*d,2.)*alpha);}`;

/** Authored light shafts, soft light halos, dust and localized rising embers.
 * Scene-space layers share the gameplay camera and freeze with its clock. */
export class PaintedAtmosphere {
  private readonly group=new THREE.Group();
  private readonly air:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>;
  private readonly glows:THREE.Mesh<THREE.PlaneGeometry,THREE.ShaderMaterial>[]=[];
  private readonly dust:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;
  private readonly embers:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>;
  constructor(scene:THREE.Scene){
    this.air=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:airFragment,
      uniforms:{time:{value:0},fogStrength:{value:0},shaftPower:{value:0},fogTint:{value:new THREE.Color()},shaftTint:{value:new THREE.Color()},shaft:{value:new THREE.Vector4()}},
      transparent:true,depthWrite:false,toneMapped:false}));
    this.air.position.set(.5,.5,1.1);this.air.renderOrder=2800;this.group.add(this.air);
    for(let i=0;i<2;i++){
      const glow=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:glowFragment,
        uniforms:{tint:{value:new THREE.Color()},power:{value:0}},transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,toneMapped:false}));
      glow.renderOrder=2900;this.glows.push(glow);this.group.add(glow);
    }
    const motes=(count:number,size:number,tint:string)=>{
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(count*3),3));
      geometry.setAttribute('opacity',new THREE.Float32BufferAttribute(new Float32Array(count),1));
      const points=new THREE.Points(geometry,new THREE.ShaderMaterial({vertexShader:moteVertex,fragmentShader:moteFragment,
        uniforms:{pixelRatio:{value:1},size:{value:size},tint:{value:new THREE.Color(tint).multiplyScalar(1.6)}},
        transparent:true,depthWrite:false,toneMapped:false}));
      points.frustumCulled=false;points.renderOrder=2950;this.group.add(points);return points;
    };
    this.dust=motes(56,2.8,'#ffe4b8');this.embers=motes(24,3.6,'#ffb466');scene.add(this.group);
  }
  update(look:SceneLook,time:number,enabled:boolean,pixelRatio:number){
    this.group.visible=enabled;if(!enabled)return;
    const u=this.air.material.uniforms;
    u.time.value=time;u.fogStrength.value=look.fog;u.shaftPower.value=look.shaftPower;
    u.fogTint.value.set(look.fogColor);u.shaftTint.value.set(look.shaftColor);u.shaft.value.set(...look.shaft);
    this.glows.forEach((mesh,i)=>{
      const source=look.lights[i];mesh.visible=!!source&&source.glow>0;if(!source)return;
      mesh.position.set(source.x,1-source.y,1.15);mesh.scale.set(source.radius/1.777778,source.radius,1);
      mesh.material.uniforms.tint.value.set(source.color);mesh.material.uniforms.power.value=source.glow*firePulse(time,!!source.flicker);
    });
    const positions=this.dust.geometry.getAttribute('position'),alpha=this.dust.geometry.getAttribute('opacity');
    for(let i=0;i<positions.count;i++){
      const x=((i*73%101)/101+Math.sin(time*.13+i)*.012+1)%1,y=((i*47%97)/97-time*.004+10)%1;
      positions.setXYZ(i,x,1-y,.35+(i%3)*.24);
      alpha.setX(i,(.10+look.shaftPower*.9)*(.5+.5*Math.sin(i+time*.7)));
    }
    positions.needsUpdate=true;alpha.needsUpdate=true;this.dust.material.uniforms.pixelRatio.value=pixelRatio;
    this.embers.visible=!!look.fire;
    if(look.fire){
      const points=this.embers.geometry.getAttribute('position'),opacity=this.embers.geometry.getAttribute('opacity');
      for(let i=0;i<points.count;i++){
        const phase=(i/points.count+time*(.10+(i%3)*.015))%1;
        const x=look.fire[0]+Math.sin(i*4.1+time*.7)*(.002+phase*.018),y=look.fire[1]-phase*.17;
        points.setXYZ(i,x,1-y,1.18);opacity.setX(i,Math.sin(phase*Math.PI)*.7);
      }
      points.needsUpdate=true;opacity.needsUpdate=true;this.embers.material.uniforms.pixelRatio.value=pixelRatio;
    }
  }
  // Owned meshes/materials are disposed by the parent scene traversal.
}
