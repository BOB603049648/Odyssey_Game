import {companionPost} from '../src/core/companionPost';
/** Read-only placement diagnostic; not a WebGL screenshot. */
import {writeFileSync} from 'node:fs';
import {SPAWNS} from '../src/core/stage';
import {depthScale} from '../src/core/world';
import {paintedTravelerFrame,paintedCatFrame,PAINTED_ACTORS} from '../src/content/paintedActors';
import {sceneTravelerHeight} from '../src/content/sceneScale';
import {npcForScene} from '../src/content/npcJourney';
import {npcFrame} from '../src/content/npcAtlas';
import {catMotionGeometry} from '../src/ui/catMotionGeometry';
import {figureIllumination} from '../src/render/three/figureLighting';
import {SCENE_LOOKS} from '../src/render/three/looks';
import type {IslandScene} from '../src/core/island';

const output=[];
for(const scene of Object.keys(SPAWNS) as IslandScene[]){
 const foot=SPAWNS[scene],frame=paintedTravelerFrame('idle-front-01.png')!,cat=paintedCatFrame('pose-observe-01')!;
 const catFoot=companionPost(scene,{},{}),catSize=catMotionGeometry(`${PAINTED_ACTORS['cat-performance']}#pose-observe-01`,scene,'pose-observe-01','right');
 const npc=npcForScene(scene)!,n=npcFrame(npc);
 const figures=[
  {file:'src/assets/art/actors/idle.webp',crop:frame,foot,pivot:{x:frame.bodyX/frame.width,y:frame.sole/frame.height},height:sceneTravelerHeight(scene)*frame.scale,aspect:frame.width/frame.height},
  {file:'src/assets/art/actors/cat-performance.webp',crop:cat,foot:catFoot,pivot:catSize.foot,height:(scene==='dba.scene.shore'?.168:.22)*catSize.heightScale,aspect:.75},
  {file:'src/assets/art/npc/villagers.webp',crop:n.crop,foot:npc,pivot:n.foot,height:n.height,aspect:.75},
 ].map(f=>({...f,height:f.height*depthScale(f.foot.y),tint:figureIllumination(SCENE_LOOKS[scene],f.foot,0).toArray()}));
 output.push({scene,figures});
}
writeFileSync('artifacts/three-v15/figure-review.json',JSON.stringify(output,null,2));
