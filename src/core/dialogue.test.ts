import {describe,it,expect} from 'vitest';
import {reduce} from './reduce';
import {newGameState} from './save';
import {parseSave} from './migrate';
import {applyDialogue,activeNpc,dialogueLine,conversationNotes,conversationKey} from './dialogue';
import {NPC_VISITS,npcSpotId} from '../content/npcJourney';
import {READING_FOLIOS} from '../content/readingJourney';
import {readingKey} from './reading';
import {visibleSpots} from '../ui/spotViews';
import {SPAWNS,standsAt,interactionStandPoint} from './stage';
import {groundRoute,onGround} from './navigation';
const begin=()=>reduce(reduce(newGameState(),{type:'new-game'}),{type:'skip-prologue'});
describe('village conversations',()=>{
  it('rejects remote and modal conversation opens, and topic actions outside a conversation',()=>{
    const save=begin();expect(applyDialogue(save,{type:'talk-npc',id:'npc:script'})).toBe(save);
    expect(applyDialogue(save,{type:'npc-hint'})).toBe(save);
    const reading=reduce(save,{type:'open-reading'});expect(applyDialogue(reading,{type:'talk-npc',id:'npc:spring'})).toBe(reading);
  });
  it('keeps testimony and two hint levels through reload without solving or granting words',()=>{
    const before=begin();let save=reduce(before,{type:'talk-npc',id:'npc:spring'});
    expect(activeNpc(save)?.id).toBe('repairer');
    expect(conversationNotes(save)).toHaveLength(0);
    save=reduce(save,{type:'npc-topic',topic:'place'});expect(dialogueLine(save)).toContain('潮口');
    save=reduce(save,{type:'npc-topic',topic:'memory'});expect(conversationNotes(save)).toHaveLength(2);
    for(let i=0;i<5;i++)save=reduce(save,{type:'npc-hint'});
    save=parseSave(JSON.parse(JSON.stringify(save)))!;
    expect(save.flags[conversationKey('spring','hint')]).toBe(2);
    expect(dialogueLine(save)).toContain('外观相似');expect(save.words).toEqual(before.words);
    expect(save.beats).toEqual(before.beats);expect(save.evidence).toEqual(before.evidence);
    expect(save.flags[readingKey('spring')]).toBeUndefined();expect(save.flags['dba.reading.spring.answer']).toBeUndefined();
    save=reduce(save,{type:'close-overlay'});expect(activeNpc(save)).toBeUndefined();expect(conversationNotes(save)).toHaveLength(2);
  });
  it('protects later testimony from sequence skipping, including the saved notes',()=>{
    let save=reduce(begin(),{type:'goto-scene',scene:'dba.scene.night'});
    save=reduce(save,{type:'talk-npc',id:'npc:palimpsest'});
    for(const topic of ['place','memory'] as const){save=reduce(save,{type:'npc-topic',topic});expect(dialogueLine(save)).toContain('先到雾岸');}
    expect(conversationNotes(save)).toHaveLength(0);
    save=reduce(save,{type:'goto-scene',scene:'dba.scene.shore'});expect(activeNpc(save)).toBeUndefined();
  });
  it('changes advice after a reading and preserves existing survival progress',()=>{
    let save=begin();save.flags[readingKey('spring')]=true;save.beats['dba.beat.water']=true;
    save=reduce(save,{type:'talk-npc',id:'npc:spring'});expect(dialogueLine(save)).toContain('沿东侧小路');
    save=reduce(save,{type:'npc-hint'});expect(dialogueLine(save)).toContain('棚火');expect(save.beats['dba.beat.water']).toBe(true);
  });
  it('makes all six conversations reachable and keeps scene-specific testimony separate for returning characters',()=>{
    for(const npc of NPC_VISITS){
      const save={...begin(),currentScene:npc.scene};
      for(const f of READING_FOLIOS)save.flags[readingKey(f.id)]=true;
      const spot=visibleSpots(npc.scene,save,{level:0,anchor:'mural-entrance',wordId:null}).find(s=>s.id===npcSpotId(npc))!;
      expect(spot).toBeDefined();expect(onGround(npc.scene,npc)).toBe(true);
      const goal=interactionStandPoint(npc.scene,spot);
      expect(groundRoute(npc.scene,SPAWNS[npc.scene],goal).length).toBeGreaterThan(0);
      expect(standsAt(npc.scene,spot,goal)).toBe(true);
      const talk=reduce(reduce(save,{type:'talk-npc',id:npcSpotId(npc)}),{type:'npc-topic',topic:'memory'});
      expect(conversationNotes(talk)).toEqual([{folio:npc.folio,topic:'memory'}]);
    }
  });
});
