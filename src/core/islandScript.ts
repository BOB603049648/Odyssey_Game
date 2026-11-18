import { SCRIPT_GROUPS, SCRIPT_TRACES, SCRIPT_WORDS, type ScriptWord } from '../content/islandScript';
import type { SaveData } from './schema';
import { isLearnedState, transitionWord } from './words';

export const SCRIPT_ACTIVE = 'dba.script.active';
export const scriptActive = (s:SaveData) => s.flags[SCRIPT_ACTIVE] === true;
export const scriptKey = (kind:string,id:string) => `dba.script.${kind}.${id}`;
export const scriptConfirmed = (s:SaveData,id:string) => s.flags[scriptKey('confirmed',id)] === true;
export const scriptCount = (s:SaveData) => SCRIPT_GROUPS.filter(g=>scriptConfirmed(s,g.id)).length;
export const traceStep = (s:SaveData,id:string) => Number(s.flags[scriptKey('seen',id)] ?? -1);
export const wordSeen = (s:SaveData,id:ScriptWord) => isLearnedState(s.words[`dba.word.${id}`]?.state) || SCRIPT_TRACES.some(t=>t.moments.slice(0,traceStep(s,t.id)+1).some(m=>m.words.includes(id)));
export const scriptGuess = (s:SaveData,id:ScriptWord) => String(s.flags[scriptKey('guess',id)] ?? '');
export const groupReady = (s:SaveData,id:string) => SCRIPT_TRACES.filter(t=>t.group===id).every(t=>traceStep(s,t.id)===t.moments.length-1);
export function adoptScript(save:SaveData):SaveData {
  if(scriptActive(save)) return save;
  const flags:SaveData['flags']={...save.flags,[SCRIPT_ACTIVE]:true,'dba.reading.active':false};
  // Carry genuinely learned words forward, without inventing visits to new clues.
  for(const group of SCRIPT_GROUPS) if(group.words.every(w=>isLearnedState(save.words[`dba.word.${w}`]?.state))) {
    flags[scriptKey('confirmed',group.id)]=true; flags[scriptKey('legacy',group.id)]=true;
  }
  return {...save,flags,overlay:save.overlay==='reading'||save.overlay==='dialogue'?'journal':save.overlay};
}
export type ScriptAction = {type:'observe-script';id:string}|{type:'script-next'}|{type:'script-guess';word:ScriptWord;value:string}|{type:'script-verify';group:string};
const normalize=(s:string)=>s.normalize('NFKC').replace(/[\s，。！？、；：,.!?;:'"“”‘’]/g,'').trim();
export function applyScript(save:SaveData,action:ScriptAction):SaveData {
  if(!scriptActive(save)||save.screen!=='island')return save;
  if(action.type==='observe-script'||action.type==='script-next') {
    if(action.type==='observe-script'&&save.overlay!=='none')return save;
    if(action.type==='script-next'&&save.overlay!=='script')return save;
    const trace=SCRIPT_TRACES.find(t=>t.id===(action.type==='observe-script'?action.id:save.flags['dba.script.current']));
    if(!trace||trace.scene!==save.currentScene)return save;
    const step=action.type==='observe-script'?Math.max(0,traceStep(save,trace.id)):Math.min(trace.moments.length-1,traceStep(save,trace.id)+1);
    const words={...save.words};
    for(const w of trace.moments.slice(0,step+1).flatMap(m=>m.words)) {
      const id=`dba.word.${w}`;if(words[id]?.state==='unseen')words[id]=transitionWord(words[id],'reveal');
    }
    return {...save,words,overlay:'script',flags:{...save.flags,'dba.script.current':trace.id,[scriptKey('seen',trace.id)]:step}};
  }
  if(save.overlay!=='journal')return save;
  if(action.type==='script-guess') {
    if(!SCRIPT_WORDS.some(w=>w[0]===action.word)||!wordSeen(save,action.word)||isLearnedState(save.words[`dba.word.${action.word}`]?.state))return save;
    const group=SCRIPT_GROUPS.find(g=>(g.words as readonly string[]).includes(action.word))!;
    return {...save,words:{...save.words,[`dba.word.${action.word}`]:{...save.words[`dba.word.${action.word}`],state:action.value.trim()?'guessed':'seen'}},
      flags:{...save.flags,[scriptKey('guess',action.word)]:action.value.slice(0,24),[scriptKey('result',group.id)]:''}};
  }
  const group=SCRIPT_GROUPS.find(g=>g.id===action.group);
  if(!group||scriptConfirmed(save,group.id)||!groupReady(save,group.id))return save;
  const correct=group.words.every(id=>{
    if(isLearnedState(save.words[`dba.word.${id}`]?.state))return true;
    const entry=SCRIPT_WORDS.find(w=>w[0]===id)!;
    return [entry[1],...entry[2].split('|')].some(a=>normalize(a)===normalize(scriptGuess(save,id)));
  });
  const flags={...save.flags,[scriptKey('result',group.id)]:correct?'ok':'revisit'};
  if(!correct)return {...save,flags}; // Never reveal individual correctness or a score.
  flags[scriptKey('confirmed',group.id)]=true;
  const words={...save.words};
  for(const w of group.words){const id=`dba.word.${w}`;if(!isLearnedState(words[id].state))words[id]=transitionWord(words[id],'learn');}
  return {...save,flags,words,stepCounter:save.stepCounter+1,
    ...(group.id==='night'?{beats:{...save.beats,'dba.beat.old-layer':true},evidence:[...new Set([...save.evidence,'dba.ev.main'])]}:{})};
}

export function pendingScript(save:SaveData) {
  if(!scriptActive(save)||save.beats['dba.beat.depart'])return undefined;
  return SCRIPT_GROUPS.find(g=>!scriptConfirmed(save,g.id)&&(!g.after||save.beats[`dba.beat.${g.after}`]));
}
