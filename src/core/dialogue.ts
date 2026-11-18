import {NPC_PEOPLE,npcForScene,type NpcTopic} from '../content/npcJourney';
import {folioForScene} from '../content/readingJourney';
import {hasRead,precedingFolio} from './reading';
import {expeditionGoal} from './expedition';
import type {SaveData} from './schema';

export const DIALOGUE_VISIT='dba.dialogue.visit';
export type DialogueAction={type:'talk-npc';id:string}|{type:'npc-topic';topic:NpcTopic}|{type:'npc-hint'};
export const conversationKey=(folio:string,part:string)=>`dba.dialogue.${folio}.${part}`;
export function activeNpc(save:SaveData){const npc=npcForScene(save.currentScene);return save.screen==='island'&&save.overlay==='dialogue'&&npc?.folio===save.flags[DIALOGUE_VISIT]?npc:undefined;}
export function applyDialogue(save:SaveData,action:DialogueAction):SaveData{
  const npc=npcForScene(save.currentScene);
  if(save.screen!=='island'||!npc)return save;
  if(action.type==='talk-npc'){
    if(save.overlay!=='none'||action.id!==`npc:${npc.folio}`)return save;
    return {...save,overlay:'dialogue',flags:{...save.flags,[DIALOGUE_VISIT]:npc.folio,[conversationKey(npc.folio,'topic')]:'arrival'}};
  }
  if(!activeNpc(save))return save;
  const topic=conversationKey(npc.folio,'topic');
  if(precedingFolio(save,folioForScene(save.currentScene)))return {...save,flags:{...save.flags,[topic]:'method'}};
  if(action.type==='npc-hint'){
    const key=conversationKey(npc.folio,'hint'),level=Number(save.flags[key]??0);
    return {...save,flags:{...save.flags,[key]:Math.min(2,level+1),[topic]:'method',[conversationKey(npc.folio,'heard.method')]:true}};
  }
  if(!['place','memory','method'].includes(action.topic))return save;
  return {...save,flags:{...save.flags,[topic]:action.topic,[conversationKey(npc.folio,`heard.${action.topic}`)]:true}};
}
export function dialogueLine(save:SaveData){
  const npc=activeNpc(save);if(!npc)return '';
  const topic=save.flags[conversationKey(npc.folio,'topic')];
  if(topic==='place')return npc.place;
  if(topic==='memory')return npc.memory;
  if(topic==='method'){
    const prior=precedingFolio(save,folioForScene(save.currentScene));
    if(prior)return `这页提到的旧事，你还缺一段。先到${prior.place}核读《${prior.title}》，再把前后两处记录放在一起；我的话补不了你没有看过的那一页。`;
    if(hasRead(save,npc.folio))return npc.after;
    const level=Number(save.flags[conversationKey(npc.folio,'hint')]??0);
    return npc.methods[Math.max(0,Math.min(1,level-1))];
  }
  return hasRead(save,npc.folio)?npc.after:npc.arrival;
}
export function dialogueNext(save:SaveData){return expeditionGoal(save);}
export function conversationNotes(save:SaveData){
  // Lazy scene-independent journal: only words actually requested appear here.
  return Object.entries(save.flags).filter(([key,value])=>value===true&&/^dba\.dialogue\.[^.]+\.heard\.(place|memory)$/.test(key)).map(([key])=>{
    const [, , folio, , topic]=key.split('.');return {folio,topic:topic as 'place'|'memory'};
  });
}
export {NPC_PEOPLE};
