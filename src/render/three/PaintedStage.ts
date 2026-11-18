import * as THREE from 'three';
import type { ThreeWorldProps } from './ThreeWorld';
import { ShoreProjection,type GroundPoint } from './ShoreProjection';
import { SHORE_STAGE_CONFIG,type StageConfig } from './stageConfigs';
import { registerSpatialView } from '../spatialRegistry';
import type { TravelerBlend } from './TravelerBlend';
import {BANDS} from '../../core/stage';
import {onGround} from '../../core/navigation';
import { TRAVELER_HEIGHT } from '../../core/travelerMotion';
import { travelerFramePivot } from '../../ui/travelerSupport';
import { usePaintedCutoutMap } from './textureQuality';

type Sprite=THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>;

/** Reconstructed 2.5D stage: a horizontal receiving floor, independent upright
 * cutouts, a real open doorway, a solid direction sign and billboard actors.
 * Every point is projected/picked through the same perspective camera. */
export class PaintedStage {
  readonly scene=new THREE.Scene();
  readonly projection=new ShoreProjection();
  readonly floor:THREE.Mesh<THREE.BufferGeometry,THREE.MeshStandardMaterial>;
  private readonly props:THREE.Mesh<THREE.ShapeGeometry,THREE.MeshBasicMaterial>[]=[];
  private readonly backdrops:THREE.Mesh<THREE.PlaneGeometry,THREE.MeshBasicMaterial>[]=[];
  private readonly traveler:Sprite;
  private readonly cat:Sprite;
  private readonly villager:Sprite;
  private travelerBlend:TravelerBlend|undefined;
  private readonly shadows:THREE.Mesh[]=[];
  private unregister:(()=>void)|undefined;
  private controls:HTMLElement[]=[];
  private controlsDirty=true;
  private controlStyles=new Map<HTMLElement,{translate:string;transform:string;width:string;height:string}>();
  private observer:MutationObserver|undefined;
  private active=false;
  private readonly sunlight:THREE.DirectionalLight;
  private dust:THREE.Points<THREE.BufferGeometry,THREE.ShaderMaterial>|undefined;
  private dustSeeds:THREE.Vector3[]=[];
  private time=0;
  private exitMark:THREE.Mesh<THREE.ShapeGeometry,THREE.MeshBasicMaterial>|undefined;
  private walkGuide:THREE.Mesh|undefined;
  private readonly routeLine:THREE.Line<THREE.BufferGeometry,THREE.LineDashedMaterial>;
  private readonly destination:THREE.Mesh<THREE.RingGeometry,THREE.MeshBasicMaterial>;

  constructor(private root:HTMLElement,readonly config:StageConfig=SHORE_STAGE_CONFIG){
    this.projection.camera.zoom=config.cameraZoom;
    this.scene.background=new THREE.Color(config.fog[0]);
    this.scene.fog=new THREE.Fog(...config.fog);
    this.floor=new THREE.Mesh(this.groundGeometry(),new THREE.MeshStandardMaterial({roughness:1,metalness:0,toneMapped:false}));
    // Camera dolly can reveal ground outside the original bottom edge. Mirror
    // a sand-only strip there instead of stretching the last bitmap row.
    this.floor.material.onBeforeCompile=shader=>{
      const [edge,span]=config.floorMirror;
      shader.fragmentShader=shader.fragmentShader.replace('#include <map_fragment>',`
        vec2 groundUv=vMapUv;
        if(groundUv.y<${edge.toFixed(3)}){float t=(${edge.toFixed(3)}-groundUv.y)/${span.toFixed(3)};groundUv.y=${edge.toFixed(3)}+(1.-abs(mod(t,2.)-1.))*${span.toFixed(3)};}
        diffuseColor*=texture2D(map,groundUv);`);
    };
    this.floor.receiveShadow=true;this.scene.add(this.floor);
    const routeGeometry=new THREE.BufferGeometry();
    routeGeometry.setAttribute('position',new THREE.Float32BufferAttribute(new Float32Array(128*3),3));
    routeGeometry.setAttribute('lineDistance',new THREE.Float32BufferAttribute(new Float32Array(128),1));
    this.routeLine=new THREE.Line(routeGeometry,new THREE.LineDashedMaterial({color:'#e3cf9c',dashSize:.10,gapSize:.17,transparent:true,opacity:.48,depthWrite:false,toneMapped:false}));
    this.routeLine.frustumCulled=false;this.routeLine.name='ground-route';this.scene.add(this.routeLine);
    this.destination=new THREE.Mesh(new THREE.RingGeometry(.10,.13,32),new THREE.MeshBasicMaterial({color:'#e3cf9c',transparent:true,opacity:.42,depthWrite:false,toneMapped:false}));
    this.destination.rotation.x=-Math.PI/2;this.destination.name='route-destination';this.scene.add(this.destination);
    for(const [z,top,bottom] of config.backdrops){
      const mesh=new THREE.Mesh(this.rectGeometry(top,bottom,z),new THREE.MeshBasicMaterial({toneMapped:false,fog:false}));
      this.backdrops.push(mesh);this.scene.add(mesh);
    }
    for(const spec of config.props){
      const isolated=spec.rect;
      let points=spec.points;
      if(isolated){
        const xs=points.map(p=>p[0]),ys=points.map(p=>p[1]);
        const left=Math.max(0,Math.min(...xs)-.004),right=Math.min(1,Math.max(...xs)+.004),top=Math.max(0,Math.min(...ys)-.004),bottom=Math.min(1,Math.max(...ys)+.004);
        points=[[left,top],[right,top],[right,bottom],[left,bottom]];
      }
      const shape=new THREE.Shape(points.map(([x,y])=>new THREE.Vector2(x,1-y)));
      for(const hole of spec.holes??[])shape.holes.push(new THREE.Path(hole.map(([x,y])=>new THREE.Vector2(x,1-y))));
      const geometry=new THREE.ShapeGeometry(shape),positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
      const source=this.projection.ground(spec.source)!,target=this.projection.ground(spec.foot)!;
      for(let i=0;i<positions.count;i++){
        const x=positions.getX(i),y=1-positions.getY(i);uv.setXY(i,x,1-y);
        const world=this.projection.upright({x,y},source.z).sub(source).multiplyScalar(spec.scale??1).add(target);
        positions.setXYZ(i,world.x,world.y,world.z);
      }
      geometry.computeVertexNormals();geometry.computeBoundingSphere();
      const material=new THREE.MeshBasicMaterial({side:THREE.DoubleSide,toneMapped:false,alphaTest:.4,alphaToCoverage:true});
      material.onBeforeCompile=shader=>{if(material.map?.userData.paintedCutout)usePaintedCutoutMap(shader);};
      material.customProgramCacheKey=()=>material.map?.userData.paintedCutout?'registered-rgba-v1':'original-rgb-v1';
      const mesh=new THREE.Mesh(geometry,material);
      mesh.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,alphaTest:.4,side:THREE.DoubleSide});
      mesh.name=spec.id;mesh.castShadow=true;mesh.userData.prop=spec.id;
      this.props.push(mesh);this.scene.add(mesh);
    }
    this.scene.add(new THREE.AmbientLight(...config.ambient));
    this.sunlight=new THREE.DirectionalLight(...config.sun);
    this.sunlight.position.set(-12,18,8);this.sunlight.castShadow=true;
    this.sunlight.shadow.mapSize.set(1024,1024);
    Object.assign(this.sunlight.shadow.camera,{left:-18,right:18,top:18,bottom:-18,near:.5,far:80});
    this.sunlight.shadow.bias=-.00025;this.sunlight.shadow.normalBias=.025;
    this.sunlight.shadow.intensity=.35;
    this.sunlight.target.position.set(0,0,-4);this.scene.add(this.sunlight,this.sunlight.target);
    this.traveler=this.sprite('traveler');this.cat=this.sprite('companion');
    this.villager=this.sprite('village-npc');this.villager.visible=false;
    this.traveler.customDepthMaterial=new THREE.MeshDepthMaterial({depthPacking:THREE.RGBADepthPacking,alphaTest:.03});
    if(config.scene==='dba.scene.shore')this.buildGateSupports();
    if(config.windowLight){this.buildWindowLight();this.buildFloorExit();}
  }

  private groundGeometry(){
    const geometry=new THREE.PlaneGeometry(1,1,72,48),positions=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
    for(let i=0;i<positions.count;i++){
      const x=uv.getX(i)*1.8-.4,y=this.config.floorTop+(1-uv.getY(i))*1.7;
      const world=this.projection.ground({x,y})!;
      positions.setXYZ(i,world.x,0,world.z);uv.setXY(i,x,1-y);
    }
    // PlaneGeometry originally faces +Z; the reference projection maps its
    // winding to the floor's upward normal.
    geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
  }
  private rectGeometry(top:number,bottom:number,z:number){
    const geometry=new THREE.PlaneGeometry(1,1),pos=geometry.getAttribute('position'),uv=geometry.getAttribute('uv');
    for(let i=0;i<pos.count;i++){
      const x=i%2===0?-.15:1.15,y=i<2?top:bottom;
      const world=this.projection.upright({x,y},z);pos.setXYZ(i,world.x,world.y,world.z);uv.setXY(i,x,1-y);
    }
    geometry.computeVertexNormals();geometry.computeBoundingSphere();return geometry;
  }
  private sprite(name:string):Sprite{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({transparent:true,alphaTest:.03,depthWrite:true,toneMapped:false}));
    if(name!=='traveler')mesh.material.onBeforeCompile=shader=>usePaintedCutoutMap(shader);
    mesh.name=name;mesh.castShadow=true;mesh.frustumCulled=false;this.scene.add(mesh);
    const shadow=new THREE.Mesh(new THREE.CircleGeometry(1,24),new THREE.MeshBasicMaterial({color:'#182b2d',transparent:true,opacity:.13,depthWrite:false,toneMapped:false}));
    shadow.name=`${name}-contact`;shadow.rotation.x=-Math.PI/2;shadow.scale.set(.34,.16,1);this.shadows.push(shadow);this.scene.add(shadow);return mesh;
  }
  private buildGateSupports(){
    const wood=new THREE.MeshStandardMaterial({color:'#73583b',roughness:1});
    const stone=new THREE.MeshStandardMaterial({color:'#7b7e6d',roughness:1});
    const source=this.projection.ground({x:.177,y:.559})!,target=this.projection.ground({x:.17,y:.62})!;
    for(const [left,right,top] of [[.112,.141,.348],[.221,.246,.352]]){
      const a=this.projection.upright({x:left,y:top},source.z).sub(source).multiplyScalar(.67).add(target);
      const b=this.projection.upright({x:right,y:.559},source.z).sub(source).multiplyScalar(.67).add(target);
      const center=a.clone().add(b).multiplyScalar(.5),width=Math.abs(a.x-b.x),height=a.y;
      const support=new THREE.Mesh(new THREE.BoxGeometry(width,height,.18),wood);
      support.position.set(center.x,height/2,center.z-.095);support.castShadow=true;support.receiveShadow=true;
      const foot=new THREE.Mesh(new THREE.BoxGeometry(width*1.25,.07,.32),stone);
      foot.position.set(center.x,.035,center.z-.06);foot.castShadow=true;foot.receiveShadow=true;
      this.scene.add(support,foot);
    }
  }
  private buildWindowLight(){
    const source=this.projection.upright({x:.15,y:.22},-18),target=this.projection.ground({x:.38,y:.69})!;
    this.sunlight.position.copy(source);this.sunlight.target.position.copy(target);
    const fill=new THREE.SpotLight('#ffdea4',480,55,.4,.8,2);
    fill.position.copy(source);fill.target.position.copy(target);this.scene.add(fill,fill.target);
    for(let i=0;i<3;i++){
      const from=source.clone().add(new THREE.Vector3(i*.6,0,0)),to=target.clone().add(new THREE.Vector3(i*.7-.5,0,i*.12));
      const length=from.distanceTo(to);
      const beam=new THREE.Mesh(new THREE.CylinderGeometry(.05,.5,length,16,1,true),new THREE.ShaderMaterial({
        vertexShader:`varying vec2 vUv;varying vec3 n,v;void main(){vUv=uv;vec4 p=modelViewMatrix*vec4(position,1.);n=normalize(normalMatrix*normal);v=normalize(-p.xyz);gl_Position=projectionMatrix*p;}`,
        fragmentShader:`varying vec2 vUv;varying vec3 n,v;void main(){float edge=pow(abs(dot(normalize(n),normalize(v))),2.);float a=edge*sin(vUv.y*3.14159)*.025;gl_FragColor=vec4(1.,.74,.40,a);}`,
        transparent:true,depthWrite:false,side:THREE.DoubleSide,toneMapped:false}));
      beam.position.copy(from).add(to).multiplyScalar(.5);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),from.clone().sub(to).normalize());
      beam.renderOrder=20;this.scene.add(beam);
    }
    const geo=new THREE.BufferGeometry();
    this.dustSeeds=Array.from({length:48},(_,i)=>source.clone().lerp(target,.15+(i*17%71)/100).add(new THREE.Vector3(Math.sin(i*4.1)*.9,Math.sin(i*3.7)*.7,Math.cos(i*2.9)*.7)));
    geo.setAttribute('position',new THREE.Float32BufferAttribute(this.dustSeeds.flatMap(p=>[p.x,p.y,p.z]),3));
    this.dust=new THREE.Points(geo,new THREE.ShaderMaterial({
      uniforms:{pixelRatio:{value:typeof window==='undefined'?1:Math.min(window.devicePixelRatio||1,1.5)}},
      vertexShader:`uniform float pixelRatio;void main(){vec4 p=modelViewMatrix*vec4(position,1.);gl_PointSize=clamp(36./max(1.,-p.z),1.2,3.)*pixelRatio;gl_Position=projectionMatrix*p;}`,
      fragmentShader:`void main(){float r=length(gl_PointCoord-.5)*2.;if(r>1.)discard;gl_FragColor=vec4(1.,.85,.57,(1.-r*r)*.32);}`,
      transparent:true,depthWrite:false,toneMapped:false}));
    this.dust.renderOrder=22;this.scene.add(this.dust);
  }
  private buildFloorExit(){
    const shape=new THREE.Shape();
    for(const offset of [-.18,.18]){
      shape.moveTo(-.48,.20+offset);shape.lineTo(0,-.08+offset);shape.lineTo(.48,.20+offset);
      shape.lineTo(.34,.02+offset);shape.lineTo(0,-.23+offset);shape.lineTo(-.34,.02+offset);shape.closePath();
    }
    this.exitMark=new THREE.Mesh(new THREE.ShapeGeometry(shape),new THREE.MeshBasicMaterial({color:'#d9c28f',transparent:true,opacity:.26,depthWrite:false,toneMapped:false}));
    this.exitMark.rotation.x=-Math.PI/2;this.exitMark.position.copy(this.projection.ground({x:.5,y:.8})!);this.exitMark.position.y=.018;
    this.exitMark.name='inlaid-exit-arrows';this.scene.add(this.exitMark);
  }
  private updateGroundGuide(p:ThreeWorldProps){
    const route=p.route??[];
    this.routeLine.visible=route.length>1;this.destination.visible=route.length>1;
    if(route.length>1){
      const positions=this.routeLine.geometry.getAttribute('position'),distances=this.routeLine.geometry.getAttribute('lineDistance');
      let distance=0,previous:THREE.Vector3|undefined;
      const count=Math.min(128,route.length);
      for(let i=0;i<count;i++){
        const point=this.projection.ground(route[i])!;point.y=.025;
        if(previous)distance+=point.distanceTo(previous);
        positions.setXYZ(i,point.x,point.y,point.z);distances.setX(i,distance);previous=point;
      }
      positions.needsUpdate=true;distances.needsUpdate=true;this.routeLine.geometry.setDrawRange(0,count);
      this.destination.position.copy(previous!);this.destination.position.y=.026;
    }
    if(p.guide&&!this.walkGuide){
      const band=BANDS[this.config.scene],vertices:number[]=[];
      const nx=96,ny=42;
      for(let x=0;x<nx;x++)for(let y=0;y<ny;y++){
        const left=band.minX+(band.maxX-band.minX)*x/nx,right=band.minX+(band.maxX-band.minX)*(x+1)/nx;
        const top=band.minY+(band.maxY-band.minY)*y/ny,bottom=band.minY+(band.maxY-band.minY)*(y+1)/ny;
        const corners=[{x:left,y:top},{x:right,y:top},{x:left,y:bottom},{x:right,y:bottom}];
        if(!corners.every(point=>onGround(this.config.scene,point)))continue;
        const world=corners.map(point=>this.projection.ground(point)!);
        for(const i of [0,2,1,1,2,3])vertices.push(world[i].x,.018,world[i].z);
      }
      const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(vertices,3));
      this.walkGuide=new THREE.Mesh(geometry,new THREE.MeshBasicMaterial({color:'#edd49a',transparent:true,opacity:.065,depthWrite:false,toneMapped:false,side:THREE.DoubleSide}));
      this.walkGuide.name='walkable-ground-overlay';this.scene.add(this.walkGuide);
    }
    if(this.walkGuide)this.walkGuide.visible=!!p.guide;
  }
  private controlBounds(control:HTMLElement){
    const id=control.dataset.testid;
    if(id?.startsWith('npc:')&&this.villager.visible)return new THREE.Box3().setFromObject(this.villager);
    const names:Record<string,readonly string[]>={
      'trace:spring-stone':['mural'],'trace:spring-cup':['small-stone'],'trace:witness-lines':['reading-stand'],'trace:witness-seal':['stamp-rail'],
      'island-mural':['mural'],'shore-stone':['small-stone'],'shore-driftwood':['driftwood'],
      'island-gourd':['spring','spring-empty'],'water-spring':['spring','spring-empty'],'shore-depart':['waystone'],
      'hall-mural':['reading-stand'],'hall-stamps':['stamp-rail'],'hall-tattoo':['wrist-knot'],
      'exit-hall':['gate'],
    };
    if(id==='exit-shore'&&this.exitMark)return new THREE.Box3().setFromObject(this.exitMark);
    const wanted=id?names[id]:undefined;if(!wanted)return null;
    const box=new THREE.Box3();
    for(const mesh of this.props)if(mesh.visible&&wanted.includes(mesh.name))box.union(new THREE.Box3().setFromObject(mesh));
    return box.isEmpty()?null:box;
  }
  private placeSprite(mesh:Sprite,source:Sprite,foot:GroundPoint,pivot:GroundPoint,height:number,lift=0){
    const world=this.projection.ground(foot)!;
    const h=this.projection.bodyHeight(this.config.spawn,height);
    const w=h*.75;
    mesh.material.map=source.material.map;mesh.material.needsUpdate=mesh.material.userData.hasMap!==true;mesh.material.userData.hasMap=true;
    mesh.material.color.copy(source.material.color);
    const uv=mesh.geometry.getAttribute('uv'),sourceUV=source.geometry.getAttribute('uv');
    for(let i=0;i<uv.count;i++)uv.setXY(i,sourceUV.getX(i),sourceUV.getY(i));uv.needsUpdate=true;
    const yaw=Math.atan2(this.projection.camera.position.x-world.x,this.projection.camera.position.z-world.z);
    mesh.rotation.y=yaw;mesh.scale.set(w,h,1);
    mesh.position.copy(world).add(new THREE.Vector3(Math.cos(yaw)*(.5-pivot.x)*w,(pivot.y-.5)*h+lift*.22,-Math.sin(yaw)*(.5-pivot.x)*w));
    const shadow=this.shadows.find(item=>item.name===`${mesh.name}-contact`)!;shadow.position.set(world.x,.012,world.z);
    shadow.scale.set(w*.36*(1+lift*.25),w*.18*(1+lift*.25),1);
    (shadow.material as THREE.MeshBasicMaterial).opacity=.13*(1-lift*.75);
  }

  update(p:ThreeWorldProps,original:THREE.Texture,clean:THREE.Texture,traveler:Sprite,cat:Sprite,water:THREE.Texture|null,pointer:GroundPoint,dt:number,matte?:THREE.Texture|null,motion?:TravelerBlend,npc?:{source:Sprite;position:GroundPoint;foot:GroundPoint;height:number},cutouts:Readonly<Record<string,THREE.Texture|null>>={}){
    if(!p.paused&&!p.reduced&&!document.hidden)this.time+=Math.min(.05,dt);
    if(this.dust){
      const positions=this.dust.geometry.getAttribute('position');
      this.dustSeeds.forEach((point,i)=>positions.setXYZ(i,point.x+Math.sin(this.time*.13+i)*.09,point.y+Math.sin(this.time*.17+i*.7)*.08,point.z));positions.needsUpdate=true;
    }
    if(this.exitMark)this.exitMark.material.opacity=Math.hypot(p.traveler.x-.5,p.traveler.y-.8)<.13 ? .58 : .26;
    this.projection.update(p.traveler,pointer,p.world,p.view,p.cam,dt,p.paused||document.hidden,p.reduced);
    this.updateGroundGuide(p);
    this.floor.material.map=clean;this.floor.material.needsUpdate=this.floor.material.userData.hasMap!==true;this.floor.material.userData.hasMap=true;
    for(const mesh of this.backdrops){mesh.material.map=clean;mesh.material.needsUpdate=mesh.material.userData.hasMap!==true;mesh.material.userData.hasMap=true;}
    for(const mesh of this.props){
      if(mesh.name==='spring')mesh.visible=!water;
      if(mesh.name==='spring-empty')mesh.visible=!!water;
      // Color, silhouette and shadow share the same authored RGBA image.
      // Never combine a generated contour with a different painting's RGB.
      const map=cutouts[mesh.name]??matte??original;
      if(mesh.material.map!==map){
        mesh.material.map=map;
        mesh.material.needsUpdate=true;
      }
      const depth=mesh.customDepthMaterial as THREE.MeshDepthMaterial;
      if(depth.map!==map){depth.map=map;depth.needsUpdate=true;}

    }
    const frame=p.traveler.current;
    const pivot=motion?.current?.foot??travelerFramePivot(frame.support,frame.blend?.facing==='left');
    this.placeSprite(this.traveler,traveler,p.traveler,pivot,p.traveler.height);
    this.placeSprite(this.cat,cat,p.cat.position,p.cat.foot,p.cat.height,p.cat.lift);
    this.villager.visible=!!npc;
    this.shadows.find(item=>item.name==='village-npc-contact')!.visible=!!npc;
    if(npc)this.placeSprite(this.villager,npc.source,npc.position,npc.foot,npc.height);
    if(motion){
      if(!this.travelerBlend){
        this.travelerBlend=motion;motion.attach(this.traveler.material);motion.attach(this.traveler.customDepthMaterial!);
      }
      motion.sync(this.traveler);
    }
    if(!this.active){
      const viewport=this.root.closest<HTMLElement>('.walk-viewport')!;
      this.unregister=registerSpatialView(viewport,{pick:(x,y)=>{
        const box=viewport.getBoundingClientRect();return this.projection.pick((x-box.left)/box.width,(y-box.top)/box.height);
      },bodyDistance:(from,to,height)=>this.projection.bodyDistance(from,to,this.config.spawn,height),
        velocity:(at,wish,height)=>this.projection.velocity(at,wish,this.config.spawn,height,TRAVELER_HEIGHT)});
      this.controlsDirty=true;
      if(typeof MutationObserver!=='undefined'){
        this.observer=new MutationObserver(()=>{this.controlsDirty=true;});
        this.observer.observe(this.root,{childList:true,subtree:true});
      }
      this.active=true;
    }
    if(this.controlsDirty){
      this.controls=Array.from(this.root.querySelectorAll<HTMLElement>('[data-ground-x][data-ground-y]'));
      this.controlsDirty=false;
    }
    for(const control of this.controls){
      const point={x:Number(control.dataset.groundX),y:Number(control.dataset.groundY)};
      const ground=this.projection.ground(point);if(!ground)continue;
      if(!this.controlStyles.has(control))this.controlStyles.set(control,{translate:control.style.translate,transform:control.style.transform,width:control.style.width,height:control.style.height});
      const box=this.controlBounds(control);
      if(box){
        const corners:GroundPoint[]=[];
        for(const x of [box.min.x,box.max.x])for(const y of [box.min.y,box.max.y])for(const z of [box.min.z,box.max.z])corners.push(this.projection.project(new THREE.Vector3(x,y,z)));
        const left=Math.min(...corners.map(p=>p.x))*p.view.w,right=Math.max(...corners.map(p=>p.x))*p.view.w;
        const top=Math.min(...corners.map(p=>p.y))*p.view.h,bottom=Math.max(...corners.map(p=>p.y))*p.view.h;
        control.style.width=`${Math.max(44,right-left)}px`;control.style.height=`${Math.max(44,bottom-top)}px`;
        control.style.transform='translate(-50%, -100%)';
        control.style.translate=`${(left+right)/2-(point.x*p.world.w-p.cam.x)}px ${bottom-(point.y*p.world.h-p.cam.y)}px`;
      }else{
        const shown=this.projection.project(ground);
        control.style.translate=`${shown.x*p.view.w-(point.x*p.world.w-p.cam.x)}px ${shown.y*p.view.h-(point.y*p.world.h-p.cam.y)}px`;
      }
    }
    this.root.dataset.threeStage='spatial';
  }
  deactivate(){
    if(!this.active)return;this.unregister?.();this.unregister=undefined;
    this.observer?.disconnect();this.observer=undefined;
    for(const [control,style] of this.controlStyles)Object.assign(control.style,style);
    this.controlStyles.clear();
    this.controls=[];this.active=false;delete this.root.dataset.threeStage;
  }
  dispose(){
    this.deactivate();
    this.scene.traverse(object=>{
      if(object instanceof THREE.Mesh||object instanceof THREE.Points||object instanceof THREE.Line){
        object.geometry.dispose();const materials=Array.isArray(object.material)?object.material:[object.material];
        for(const material of materials){if(material.map instanceof THREE.CanvasTexture)material.map.dispose();material.dispose();}
        if(object instanceof THREE.Mesh)object.customDepthMaterial?.dispose();
      }
    });
    this.sunlight.shadow.map?.dispose();
  }
}
