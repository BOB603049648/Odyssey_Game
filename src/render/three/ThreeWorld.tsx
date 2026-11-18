import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import type { IslandScene } from '../../core/island';
import type { WorldState } from '../../core/worldState';
import { depthScale } from '../../core/world';
import { slotAssetUrl } from '../../content/assetUrls';
import { warmSceneImages } from '../../content/backgroundImages';
import { walkAtlasSource, WALK_ATLAS } from '../../content/travelerWalkAtlas';
import { actionAtlasSource } from '../../content/travelerActionAtlas';
import { settleAtlasSource, companionAtlasSource } from '../../content/characterPerformanceAtlas';
import type { TravelerPresentation } from '../../ui/Traveler';
import { cameraWindow, cropUV, SCENE_OCCLUDERS, type Crop } from './geometry';
import { SCENE_LOOKS } from './looks';
import { PainterlyPost } from './PainterlyPost';
import {SceneDissolve} from './SceneDissolve';
import {GATES} from '../../core/stage';
import { applyPaintLighting, createPaintLighting, PaintedAtmosphere, updatePaintLighting } from './lighting';
import { applyRelief, refineReliefMask, registerRelief, reliefTarget } from './depth';
import { PaintedStage } from './PaintedStage';
import { TravelerBlend } from './TravelerBlend';
import { travelerFramePivot } from '../../ui/travelerSupport';
import { stageConfig,type SpatialScene } from './stageConfigs';
import shoreClean from '../../assets/art/spatial/shore-clean.webp';
import hallClean from '../../assets/art/spatial/hall-clean.webp';
import { CUTOUT_ART, CUTOUT_CROPS, SHORE_DETAIL_ART } from './cutoutArt';
import { prepareSceneTexture, sceneSamples, usePaintedCutoutMap } from './textureQuality';
import {paintedTravelerSource} from '../../content/paintedActors';
import {figureIllumination} from './figureLighting';
import './three.css';
import {npcForScene} from '../../content/npcJourney';
import {npcFrame,NPC_ATLAS} from '../../content/npcAtlas';

type Point = { x: number; y: number };
type Size = { w: number; h: number };
export type ThreeWorldProps = {
  scene: IslandScene; view: Size; world: Size; cam: Point; paused: boolean; reduced: boolean;
  traveler: TravelerPresentation; state?: WorldState;
  route?:readonly Point[];guide?:boolean;
  cat: { src?: string; original?: string; foot: Point; position: Point; height: number; mirror: boolean; lift: number };
};
type ActorFrame = {src?:string;crop:Crop|null;position:Point;height:number;foot:Point;mirror:boolean;opacity?:number;lift?:number;pose?:string;facing?:string};
type Actor = { mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.MeshBasicMaterial>; shadow: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>; cast:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>; frame?: ActorFrame };
const vertex = 'varying vec2 vUv; void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}';
const alphaFragment = `varying vec2 vUv; uniform float opacity;
  void main(){float d=length((vUv-.5)*2.);float a=exp(-d*d*4.)*(1.-smoothstep(.7,1.,d));gl_FragColor=vec4(.10,.08,.05,a*opacity);}`;
const atmosphereFragment = `varying vec2 vUv; uniform float time; uniform float strength; uniform vec3 tint;
  float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
  float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1.,0.)),f.x),mix(hash(i+vec2(0.,1.)),hash(i+vec2(1.)),f.x),f.y);}
  void main(){float n=noise(vUv*vec2(7.,3.)+vec2(time*.014,0.));
    float bands=exp(-pow((vUv.y-.58)/.10,2.))*.65+exp(-pow((vUv.y-.10)/.06,2.))*.3;
    gl_FragColor=vec4(tint,strength*bands*smoothstep(.25,.8,n));}`;

function setUV(geometry: THREE.BufferGeometry, crop: Crop | null, mirror = false) {
  const { left, right, bottom, top } = cropUV(crop, mirror);
  const uv = geometry.getAttribute('uv');
  uv.setXY(0,left,top); uv.setXY(1,right,top); uv.setXY(2,left,bottom); uv.setXY(3,right,bottom); uv.needsUpdate = true;
}
function atlas(src: string): Crop | null {
  const painted=paintedTravelerSource(src);if(painted)return painted;
  const walk = walkAtlasSource(src);
  return walk ? { ...walk, atlasWidth: WALK_ATLAS.width, atlasHeight: WALK_ATLAS.height }
    : actionAtlasSource(src) ?? settleAtlasSource(src);
}

/** Optional view adapter. Existing simulation, save, audio and HTML controls
 * remain the owners. A failed WebGL context reveals the working DOM renderer. */
export function ThreeWorld(props: ThreeWorldProps) {
  const host = useRef<HTMLDivElement>(null);
  const [cinematic,setCinematic] = useState(() => new URLSearchParams(window.location.search).get('look') !== 'base');
  const latest = useRef({...props,cinematic}); latest.current = {...props,cinematic};
  const [status, setStatus] = useState('loading');
  useEffect(() => {
    const element = host.current!;
    const root = element.parentElement!;
    let live = true, failed = false, raf = 0, time = 0, previousTime = performance.now();
    let deactivateSpatial=()=>{};
    let renderer: THREE.WebGLRenderer;
    const activate = (ready: boolean) => {
      root.dataset.threeReady = String(ready);
      element.dataset.ready = String(ready);
    };
    const fail = () => { if (!live) return; failed = true; deactivateSpatial();activate(false);delete root.dataset.threeTransition; setStatus('fallback'); };
    try { renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true, powerPreference: 'low-power' }); }
    catch { fail(); return () => { live = false; delete root.dataset.threeReady; }; }
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.NoToneMapping;
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
    renderer.info.autoReset=false;
    element.appendChild(renderer.domElement);
    const lost = (event: Event) => { event.preventDefault(); fail(); };
    renderer.domElement.addEventListener('webglcontextlost', lost);
    const scene = new THREE.Scene();
    const reliefOffset={value:new THREE.Vector2()},reliefGoal=new THREE.Vector2(),pointer={x:0,y:0};
    const pointerMoved=(event:PointerEvent)=>{
      if(event.pointerType==='touch')return;
      const box=root.getBoundingClientRect();
      pointer.x=(event.clientX-box.left)/Math.max(1,box.width)-.5;
      pointer.y=(event.clientY-box.top)/Math.max(1,box.height)-.5;
    };
    const pointerLeft=()=>{pointer.x=0;pointer.y=0;};
    root.addEventListener('pointermove',pointerMoved);root.addEventListener('pointerleave',pointerLeft);
    const post = new PainterlyPost(renderer);
    const dissolve=new SceneDissolve(renderer);
    const spatialStages=new Map<SpatialScene,PaintedStage>();
    let activeSpatial:PaintedStage|null=null;
    deactivateSpatial=()=>{activeSpatial?.deactivate();activeSpatial=null;};
    const paintLighting = createPaintLighting();
    const atmosphere = new PaintedAtmosphere(scene);
    const camera = new THREE.OrthographicCamera(0,1,1,0,.1,30); camera.position.z = 10;
    const textures = new Map<string, THREE.Texture>();
    const pending = new Set<string>();
    const retries = new Map<string, number>();
    const loader = new THREE.TextureLoader();
    let cancelWarmup = () => {};
    const texture = (url: string | undefined, actor = false) => {
      if (!url) return null;
      const key = url.split('#')[0];
      const cached = textures.get(key); if (cached) return cached;
      if (!pending.has(key) && performance.now() >= (retries.get(key) ?? 0)) {
        pending.add(key);
        loader.load(key, value => {
          pending.delete(key);
          if (!live) { value.dispose(); return; }
          prepareSceneTexture(value,renderer.capabilities.getMaxAnisotropy(),actor,CUTOUT_CROPS.get(key));
          renderer.initTexture(value); textures.set(key,value);
        }, undefined, () => { pending.delete(key); retries.set(key,performance.now()+5000); });
      }
      return null;
    };
    texture(WALK_ATLAS.url,true);
    texture(NPC_ATLAS.url,true);
    function plane(z = 0, transparent = false) {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(1,1), new THREE.MeshBasicMaterial({ transparent, depthWrite: !transparent, toneMapped: false }));
      mesh.position.set(.5,.5,z); scene.add(mesh); return mesh;
    }
    const background = plane(-2);
    background.geometry.dispose();background.geometry=new THREE.PlaneGeometry(1,1,100,72);
    registerRelief(background.geometry,latest.current.scene,true);
    background.frustumCulled=false;
    // Image-space water motion and a restrained distant-focus pass. The
    // foreground and all interaction coordinates stay completely registered.
    const environmentUniforms = { clock: { value: 0 }, shore: { value: 0 } };
    background.material.onBeforeCompile = shader => {
      applyPaintLighting(shader,paintLighting);
      applyRelief(shader,reliefOffset);
      Object.assign(shader.uniforms, environmentUniforms);
      shader.fragmentShader = 'uniform float clock; uniform float shore;\n'+shader.fragmentShader;
      shader.fragmentShader = shader.fragmentShader.replace('#include <map_fragment>', `
        vec2 st=vMapUv;
        float lake=shore*smoothstep(.27,.34,st.x)*(1.-smoothstep(.93,1.,st.x))*smoothstep(.57,.63,st.y)*(1.-smoothstep(.69,.73,st.y));
        st.x+=sin(st.y*340.+clock*.75)*.00065*lake;
        st.y+=sin(st.x*47.+clock*.5)*.0002*lake;
        vec4 ink=texture2D(map,st);
        float distant=shore*smoothstep(.76,.94,st.y)*.46;
        vec4 soft=(texture2D(map,st+vec2(.0006,0.))+texture2D(map,st-vec2(.0006,0.))
          +texture2D(map,st+vec2(0.,.001))+texture2D(map,st-vec2(0.,.001)))*.25;
        diffuseColor*=mix(ink,soft,distant);
      `);
    };
    const patches = [plane(-1,true),plane(-1,true),plane(-1,true)];
    patches.forEach(mesh => {
      mesh.geometry.setAttribute('localUv',mesh.geometry.getAttribute('uv').clone());
      mesh.material.onBeforeCompile = shader => {
        applyPaintLighting(shader,paintLighting);
        shader.vertexShader='attribute vec2 localUv; varying vec2 patchUv;\n'+shader.vertexShader;
        shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\npatchUv=localUv;');
        shader.fragmentShader='varying vec2 patchUv;\n'+shader.fragmentShader;
        shader.fragmentShader=shader.fragmentShader.replace('#include <alphamap_fragment>',`#include <alphamap_fragment>
          diffuseColor.a*=smoothstep(0.,.07,patchUv.x)*(1.-smoothstep(.93,1.,patchUv.x))*smoothstep(0.,.10,patchUv.y)*(1.-smoothstep(.90,1.,patchUv.y));`);
      };
    });
    // Each actor owns its UVs, while identical frames share one GPU atlas.
    function actor(): Actor {
      const mesh = plane(.5,true); mesh.material.alphaTest = .02;
      mesh.material.onBeforeCompile=shader=>usePaintedCutoutMap(shader);
      const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({ vertexShader:vertex,fragmentShader:alphaFragment,uniforms:{opacity:{value:.3}},transparent:true,depthWrite:false }));
      const cast=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({color:'#1c2029',transparent:true,opacity:.18,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
      cast.frustumCulled=false;scene.add(shadow,cast);return {mesh,shadow,cast};
    }
    const traveler = actor(), cat = actor(), villager=actor();
    traveler.mesh.material.onBeforeCompile=()=>{};
    const travelerBlend=new TravelerBlend();
    travelerBlend.attach(traveler.mesh.material);
    const occluders: THREE.Mesh<THREE.ShapeGeometry,THREE.MeshBasicMaterial>[] = [];
    for (const [sceneId,specs] of Object.entries(SCENE_OCCLUDERS)) for (const spec of specs) {
      const shape = new THREE.Shape(spec.points.map(([x,y])=>new THREE.Vector2(x,1-y)));
      const geometry = new THREE.ShapeGeometry(shape);
      refineReliefMask(geometry);
      registerRelief(geometry,sceneId as IslandScene,false);
      const uv = geometry.getAttribute('uv'), pos = geometry.getAttribute('position');
      for(let i=0;i<uv.count;i++) uv.setXY(i,pos.getX(i),pos.getY(i));
      const mesh = new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({toneMapped:false}));
      mesh.material.onBeforeCompile=shader=>{applyPaintLighting(shader,paintLighting);applyRelief(shader,reliefOffset);};
      mesh.position.z=spec.foot; mesh.name=spec.id; mesh.userData.scene=sceneId; scene.add(mesh); occluders.push(mesh);
    }
    const fog = new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.ShaderMaterial({vertexShader:vertex,fragmentShader:atmosphereFragment,
      uniforms:{time:{value:0},strength:{value:.16},tint:{value:new THREE.Color('#a6b9b1')}},transparent:true,depthWrite:false}));
    fog.position.set(.5,.5,1.2); fog.renderOrder=3000; scene.add(fog);
    const dustGeo = new THREE.BufferGeometry();
    const seeds = Array.from({length:48},(_,i)=>({x:((i*73)%101)/101,y:((i*47)%97)/97,z:i%3*.2+.3}));
    dustGeo.setAttribute('position',new THREE.Float32BufferAttribute(seeds.flatMap(p=>[p.x,1-p.y,p.z]),3));
    const dust = new THREE.Points(dustGeo,new THREE.PointsMaterial({color:'#f2d3a4',size:.0018,sizeAttenuation:true,transparent:true,opacity:.22,depthWrite:false}));
    dust.renderOrder=2500; scene.add(dust);
    let renderedScene = '', reliefScene = '', lastSize = '', reported = false;
    let loadingScene='',loadingSince=0;
    function updateActor(a: Actor, input: ActorFrame) {
      const map=texture(input.src,true);
      // Keep a registered frame while a new action atlas loads. Switching the
      // whole scene back to the DOM for one actor would cause visible flicker.
      if(map) { a.frame=input; a.mesh.material.map=map; }
      if(!a.frame) return false;
      const frame=a.frame;
      a.mesh.material.color.copy(figureIllumination(SCENE_LOOKS[latest.current.scene],input.position,time));
      a.mesh.material.needsUpdate = a.mesh.material.userData.hasMap !== true;
      a.mesh.material.userData.hasMap=true;
      const h=frame.height*depthScale(input.position.y), w=h*.75/(16/9);
      setUV(a.mesh.geometry,frame.crop,frame.mirror);
      a.mesh.scale.set(w,h,1);
      a.mesh.position.set(input.position.x+(.5-frame.foot.x)*w,1-input.position.y+(frame.foot.y-.5)*h,input.position.y);
      a.mesh.renderOrder=100+input.position.y*1000;
      a.mesh.material.opacity=input.opacity??1;
      a.shadow.scale.set(w*.55,h*.12,1); a.shadow.position.set(input.position.x,1-input.position.y,input.position.y-.001);
      a.shadow.renderOrder=a.mesh.renderOrder-1; a.shadow.material.uniforms.opacity.value=.26*(1-(input.lift??0));
      a.cast.visible=latest.current.cinematic;
      if(a.cast.visible){
        const look=SCENE_LOOKS[latest.current.scene];
        const source=look.lights.find(light=>Math.hypot((light.x-input.position.x)*16/9,light.y-input.position.y)<light.radius)
          ??{x:look.shaft[0],y:look.shaft[1]};
        const dx=(input.position.x-source.x)*16/9,dy=input.position.y-source.y,dist=Math.max(.01,Math.hypot(dx,dy));
        const length=h*.48,castX=dx/dist*length/(16/9),castY=-dy/dist*length*.5;
        const positions=a.cast.geometry.getAttribute('position');
        for(let i=0;i<4;i++){
          const across=i%2===0?0:1,up=i<2?1:0,height=up-(1-frame.foot.y);
          positions.setXYZ(i,input.position.x+(across-frame.foot.x)*w*.72+castX*height,
            1-input.position.y+castY*height,input.position.y-.003);
        }
        positions.needsUpdate=true;setUV(a.cast.geometry,frame.crop,frame.mirror);
        a.cast.material.map=a.mesh.material.map;a.cast.material.opacity=.18*(input.opacity??1)*(1-(input.lift??0));
        a.cast.material.needsUpdate=a.cast.material.userData.hasMap!==true;a.cast.material.userData.hasMap=true;
        a.cast.renderOrder=a.mesh.renderOrder-2;
      }
      return true;
    }
    function updatePatch(index:number, id:string, region:{x:number;y:number;w:number;h:number}, active:boolean) {
      const mesh=patches[index]; const map=active?texture(slotAssetUrl(id)):null;
      mesh.visible=active&&!!map; if(!map) return !active;
      mesh.material.map=map; mesh.material.needsUpdate=mesh.material.userData.hasMap!==true;mesh.material.userData.hasMap=true;
      setUV(mesh.geometry,{x:region.x,y:region.y,width:region.w,height:region.h,atlasWidth:1,atlasHeight:1});
      mesh.position.set(region.x+region.w/2,1-region.y-region.h/2,-1);mesh.scale.set(region.w,region.h,1);
      return true;
    }
    function tick(now:number) {
      if(!live || failed) return;
      const p=latest.current;
      const look=SCENE_LOOKS[p.scene];
      const dt=Math.min(.05,Math.max(0,(now-previousTime)/1000));previousTime=now;
      if(reliefScene!==p.scene){
        registerRelief(background.geometry,p.scene,true);reliefOffset.value.set(0,0);reliefScene=p.scene;pointerLeft();
      }
      const target=reliefTarget(p.scene,p.traveler,pointer,p.cinematic&&!p.reduced);
      if(p.reduced||!p.cinematic)reliefOffset.value.set(0,0);
      else if(!p.paused&&!document.hidden)reliefOffset.value.lerp(reliefGoal.set(target.x,target.y),1-Math.exp(-dt*4));
      if(!p.paused&&!p.reduced&&!document.hidden)time+=dt;
      updatePaintLighting(paintLighting,look,time,p.cinematic);
      atmosphere.update(look,time,p.cinematic,renderer.getPixelRatio());
      const size=`${p.view.w}:${p.view.h}`;
      if(size!==lastSize){renderer.setSize(p.view.w,p.view.h);lastSize=size;}
      const bounds=cameraWindow(p.cam,p.world,p.view);
      Object.assign(camera,bounds);camera.updateProjectionMatrix();
      const map=texture(slotAssetUrl(`art.${p.scene.split('.').at(-1)}.landscape`));
      const config=p.cinematic?stageConfig(p.scene):undefined;
      const spatial=!!config;
      const clean=spatial?texture(p.scene==='dba.scene.hall'?hallClean:shoreClean):null;
      const matte=spatial?texture(p.scene==='dba.scene.hall'?CUTOUT_ART.hall:CUTOUT_ART.shore):null;
      const emptySpring=p.state?.water==='carried'||p.state?.water==='filled';
      const cutouts:Record<string,THREE.Texture|null>=Object.fromEntries(spatial&&p.scene==='dba.scene.shore'
        ?Object.entries(SHORE_DETAIL_ART).filter(([name])=>name==='spring-empty'?emptySpring:name==='spring'?!emptySpring:true).map(([name,url])=>[name,texture(url)]) : []);
      const cutoutsReady=Object.values(cutouts).every(Boolean);
      if(renderedScene!==p.scene){if(!dissolve.hasFrame)activate(false);reported=false;travelerBlend.reset();}
      const frame=p.traveler.current;
      const trReady=updateActor(traveler,{src:frame.shown,crop:atlas(frame.shown),position:{x:p.traveler.x,y:p.traveler.y},height:p.traveler.height,
        foot:travelerFramePivot(frame.support,frame.blend.facing==='left'),mirror:frame.blend.facing==='left',pose:frame.blend.pose,facing:frame.blend.facing});
      const readyFrame=traveler.frame;
      travelerBlend.update(readyFrame&&traveler.mesh.material.map?{
        key:`${readyFrame.src}:${readyFrame.facing}`,texture:traveler.mesh.material.map,crop:readyFrame.crop,
        foot:readyFrame.foot,mirror:readyFrame.mirror,pose:readyFrame.pose??'idle',facing:readyFrame.facing??'front',
        costume:paintedTravelerSource(readyFrame.src??'')?[1,1,1]:walkAtlasSource(readyFrame.src??'')?[.40,.46,.56]:atlas(readyFrame.src??'')?[.47,.53,.64]:[1,1,1],
        scale:(()=>{const cell=paintedTravelerSource(readyFrame.src??'');return cell?[cell.scale*(cell.width/cell.height)/.75,cell.scale] as const:[1,1] as const;})(),
      }:null,dt,p.paused||document.hidden);
      travelerBlend.sync(traveler.mesh);
      const catCell=companionAtlasSource(p.cat.original);
      const catReady=updateActor(cat,{src:p.cat.src,crop:catCell,
        position:p.cat.position,height:p.cat.height,foot:p.cat.foot,mirror:p.cat.mirror,lift:p.cat.lift});
      const patchReady = [
        updatePatch(0,'art.shore.carried',{x:.545,y:.565,w:.14,h:.145},p.scene==='dba.scene.shore'&&(p.state?.water==='carried'||p.state?.water==='filled')),
        updatePatch(1,'art.yard.shared',{x:.215,y:.815,w:.105,h:.10},p.scene==='dba.scene.yard'&&['taken','allocating','done'].includes(p.state?.food.stage??'')),
        updatePatch(2,'art.yard.shared',{x:.745,y:.805,w:.105,h:.10},p.scene==='dba.scene.yard'&&p.state?.food.stage==='done'),
      ].every(Boolean);
      const npc=npcForScene(p.scene);
      const npcReady=npc?updateActor(villager,{...npcFrame(npc),position:npc,mirror:false}):true;
      villager.mesh.visible=!!npc;villager.shadow.visible=!!npc;villager.cast.visible=!!npc&&p.cinematic;
      if(map&&trReady&&catReady&&npcReady&&patchReady&&(!spatial||(clean&&matte&&cutoutsReady))){
        loadingScene='';
        if(renderedScene!==p.scene){
          cancelWarmup();
          const adjacent=GATES.filter(g=>g.from===p.scene).flatMap(gate=>[
            slotAssetUrl(`art.${gate.to.split('.').at(-1)}.landscape`),
            ...(gate.to==='dba.scene.hall'?[hallClean,CUTOUT_ART.hall]:gate.to==='dba.scene.shore'?[shoreClean,CUTOUT_ART.shore,...Object.values(SHORE_DETAIL_ART)]:[]),
          ]);
          cancelWarmup=warmSceneImages(adjacent,()=>live&&latest.current.scene===p.scene,()=>latest.current.paused||pending.size>0);
        }
        background.material.map=map;background.material.needsUpdate=renderedScene!==p.scene;
        occluders.forEach(mesh=>{mesh.visible=p.scene===mesh.userData.scene;mesh.material.map=map;mesh.material.needsUpdate=renderedScene!==p.scene;});
        renderedScene=p.scene;
        environmentUniforms.clock.value=time;environmentUniforms.shore.value=p.scene==='dba.scene.shore'?1:0;
        fog.visible=!p.cinematic&&(p.scene==='dba.scene.shore'||p.scene==='dba.scene.path'||p.scene==='dba.scene.night');
        fog.material.uniforms.time.value=time;
        dust.material.opacity=p.scene==='dba.scene.hall'?.3:.12;
        dust.visible=!p.cinematic;
        const positions=dustGeo.getAttribute('position');
        seeds.forEach((seed,i)=>positions.setXYZ(i,(seed.x+Math.sin(time*.07+i)*.008+1)%1,1-(seed.y-time*.003+10)%1,seed.z));positions.needsUpdate=true;
        renderer.info.reset();
        dissolve.begin(`${p.scene}:${p.cinematic}`,dt,p.paused||document.hidden,p.reduced,!spatial&&!p.cinematic?sceneSamples(renderer.capabilities.maxSamples):0);
        if(config&&clean&&matte){
          let stage=spatialStages.get(config.scene);
          if(!stage){stage=new PaintedStage(root,config);spatialStages.set(config.scene,stage);}
          if(activeSpatial!==stage){deactivateSpatial();activeSpatial=stage;}
          renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;
          stage.update(p,map,clean,traveler.mesh,cat.mesh,patches[0].visible?patches[0].material.map:null,pointer,dt,matte,travelerBlend,npc?{source:villager.mesh,position:npc,...npcFrame(npc)}:undefined,cutouts);
          post.render(stage.scene,stage.projection.camera,look,time);
        }
        else if(p.cinematic){deactivateSpatial();renderer.shadowMap.enabled=false;post.render(scene,camera,look,time);}
        else {deactivateSpatial();renderer.shadowMap.enabled=false;renderer.render(scene,camera);}
        dissolve.finish();root.dataset.threeTransition=dissolve.progress<1?'dissolving':'stable';
        root.dataset.threeLook=p.cinematic?'cinematic':'base';
        activate(true);if(!reported){setStatus('ready');reported=true;}
        element.dataset.scene=p.scene;element.dataset.drawCalls=String(renderer.info.render.calls);element.dataset.textures=String(renderer.info.memory.textures);
        element.dataset.time=time.toFixed(3);
        element.dataset.look=p.cinematic?'cinematic':'base';element.dataset.profile=look.name;
        element.dataset.hdr=String(post.hdr);element.dataset.postPasses=p.cinematic?'5':'1';
        element.dataset.reliefX=reliefOffset.value.x.toFixed(5);element.dataset.reliefY=reliefOffset.value.y.toFixed(5);
        element.dataset.stage=spatial?'perspective-floor':'painted-relief';
        element.dataset.travelerBlend=travelerBlend.mix.toFixed(3);
      } else {
        deactivateSpatial();
        if(loadingScene!==p.scene){loadingScene=p.scene;loadingSince=now;}
        if(dissolve.hasFrame&&now-loadingSince<5000){dissolve.hold();activate(true);root.dataset.threeTransition='loading';}
        else{if(element.dataset.ready==='true')setStatus('fallback');activate(false);delete root.dataset.threeTransition;}
      }
      raf=requestAnimationFrame(tick);
    }
    raf=requestAnimationFrame(tick);
    return ()=>{
      live=false;cancelWarmup();cancelAnimationFrame(raf);activate(false);delete root.dataset.threeReady;delete root.dataset.threeLook;delete root.dataset.threeTransition;
      renderer.domElement.removeEventListener('webglcontextlost',lost);
      root.removeEventListener('pointermove',pointerMoved);root.removeEventListener('pointerleave',pointerLeft);
      scene.traverse(object=>{if(object instanceof THREE.Mesh||object instanceof THREE.Points){object.geometry.dispose();const mats=Array.isArray(object.material)?object.material:[object.material];mats.forEach(m=>m.dispose());}});
      spatialStages.forEach(stage=>stage.dispose());textures.forEach(t=>t.dispose());post.dispose();dissolve.dispose();renderer.dispose();renderer.domElement.remove();
    };
  },[]);
  return <>
    <div ref={host} className="three-world" data-testid="three-world" data-status={status} aria-hidden="true" />
    {status==='ready'?<button type="button" className="three-look-toggle" aria-label="切换画面模式" aria-pressed={cinematic}
      onClick={()=>setCinematic(value=>!value)} title="与基础画面对比">{cinematic?(stageConfig(props.scene)?'◈ 空间视角':'◈ 光影增强'):'◇ 基础画面'}<span>对比</span></button>:null}
  </>;
}
