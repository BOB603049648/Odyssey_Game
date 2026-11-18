import {describe,expect,it} from 'vitest';
import {SCENE_FIGURE_SCALE,sceneBodyHeight,COMPANION_STATURE,NPC_STATURE} from './sceneScale';
import {NPC_VISITS} from './npcJourney';
import {npcFrame,NPC_BODY_FRACTIONS} from './npcAtlas';
import {ACTOR_REGISTRATION,paintedTravelerFrame,PAINTED_IDLE_FILES} from './paintedActors';
import {WALK_ATLAS_FILES} from './travelerWalkAtlas';
import {catMotionGeometry} from '../ui/catMotionGeometry';
import {trajAssetUrl} from './assetUrls';

describe('one stature system across the island',()=>{
  it.each(Object.keys(SCENE_FIGURE_SCALE))('keeps the same cat/person ratio in %s',key=>{
    const scene=key as keyof typeof SCENE_FIGURE_SCALE,nominal=scene==='dba.scene.shore'?.168:.22;
    for(const id of ['land-companion','pose-observe-01','leap-01']){
      const geometry=catMotionGeometry(trajAssetUrl(id),scene,id,'right');
      const fraction=id==='land-companion'?ACTOR_REGISTRATION.cat.standingFraction:id.startsWith('leap')?ACTOR_REGISTRATION['cat-leap'].standingFraction:ACTOR_REGISTRATION['cat-performance'].standingFraction;
      expect(geometry.heightScale*nominal*fraction/sceneBodyHeight(scene)).toBeCloseTo(COMPANION_STATURE,6);
    }
  });
  it('gives each resident the same stature when met at a different location',()=>{
    for(const npc of NPC_VISITS){
      const frame=npcFrame(npc),coverage=NPC_BODY_FRACTIONS[frame.cell];
      expect(frame.height*coverage/sceneBodyHeight(npc.scene)).toBeCloseTo(NPC_STATURE[npc.id],8);
    }
  });
  it('keeps painted idle/walk stature within natural gait variation and sitting below standing',()=>{
    for(const file of [...PAINTED_IDLE_FILES,...WALK_ATLAS_FILES]){
      const f=paintedTravelerFrame(file)!;
      const h=(f.sole-f.top)/f.height*f.scale;
      expect(h).toBeGreaterThan(.85);expect(h).toBeLessThan(.91);
    }
    const frames=ACTOR_REGISTRATION.settle.frames;
    expect(frames[3].scale).toBe(frames[0].scale);
    expect((frames[3].sole-frames[3].top)/(frames[0].sole-frames[0].top)).toBeLessThan(.70);
  });
});
