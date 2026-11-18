import {READING_FOLIOS,type ReadingId,type ReadingFolio,folioForScene} from '../content/readingJourney';
import type {SaveData} from './schema';
import {isLearnedState,transitionWord} from './words';

export const READING_ACTIVE='dba.reading.active';
export const readingKey=(id:ReadingId)=>`dba.reading.${id}`;
export const hasRead=(save:SaveData,id:ReadingId)=>save.flags[readingKey(id)]===true;
export const readingCount=(save:SaveData)=>READING_FOLIOS.filter(f=>hasRead(save,f.id)).length;
export function precedingFolio(save:SaveData,folio:ReadingFolio){
  return READING_FOLIOS.slice(0,READING_FOLIOS.indexOf(folio)).find(f=>!hasRead(save,f.id));
}
export type ReadingAction=
  |{type:'open-reading'}
  |{type:'reading-submit';folio:ReadingId;answer:string;evidence:string[]}
  |{type:'reading-hint';folio:ReadingId};
export function applyReading(save:SaveData,action:ReadingAction):SaveData{
  if(save.screen!=='island'||!READING_FOLIOS.some(f=>f.scene===save.currentScene))return save;
  if(action.type==='open-reading'){
    if(save.overlay!=='none'&&save.overlay!=='reading')return save;
    return{...save,overlay:'reading',flags:{...save.flags,[READING_ACTIVE]:true},feedback:{seq:save.feedback.seq,kind:'none'}};
  }
  const folio=folioForScene(save.currentScene);
  if(save.overlay!=='reading'||action.folio!==folio.id||precedingFolio(save,folio)||hasRead(save,folio.id))return save;
  if(action.type==='reading-hint'){
    const key=`${readingKey(folio.id)}.hint`,value=save.flags[key];
    return{...save,flags:{...save.flags,[key]:Math.min(2,(typeof value==='number'?value:0)+1)}};
  }
  const choice=folio.choices.find(c=>c.id===action.answer);
  if(!choice||action.evidence.length!==2||new Set(action.evidence).size!==2||action.evidence.some(id=>!folio.evidence.some(e=>e.id===id&&(!e.from||hasRead(save,e.from)))))return save;
  const correct=action.answer===folio.answer&&folio.proof.every(id=>action.evidence.includes(id));
  const key=readingKey(folio.id),attempts=save.flags[`${key}.attempts`];
  const flags={...save.flags,[READING_ACTIVE]:true,[`${key}.answer`]:action.answer,[`${key}.proof`]:JSON.stringify(action.evidence),
    [`${key}.attempts`]:(typeof attempts==='number'?attempts:0)+1,[`${key}.result`]:correct?'ok':action.answer!==folio.answer?'meaning':'evidence'};
  if(!correct)return{...save,flags,feedback:{seq:save.feedback.seq+1,kind:'no'}};
  const words={...save.words};
  for(const short of folio.words){const id=`dba.word.${short}`,word=words[id];if(word&&!isLearnedState(word.state))words[id]=transitionWord(word,'learn');}
  return{...save,flags:{...flags,[key]:true,...(folio.id==='palimpsest'&&save.inventory.includes('dba.item.token')?{'dba.flag.bone-cell':true}:{})},words,stepCounter:save.stepCounter+1,
    ...(folio.id==='palimpsest'?{evidence:save.evidence.includes('dba.ev.main')?save.evidence:[...save.evidence,'dba.ev.main'],beats:{...save.beats,'dba.beat.old-layer':true}}:{}),
    feedback:{seq:save.feedback.seq+1,kind:'ok'}};
}

/** New journeys use the linked readings; legacy completion stays complete.
 * Opening a folio also adopts the new route without discarding earlier actions. */
export function pendingReading(save:SaveData){
  if(!save.flags[READING_ACTIVE]||save.beats['dba.beat.depart'])return undefined;
  const next=READING_FOLIOS.find(f=>!hasRead(save,f.id));if(!next)return undefined;
  const before:Partial<Record<ReadingId,string>>={hearth:'water',table:'sleep',script:'food',bridge:'food',palimpsest:'danger'};
  const beat=before[next.id];return !beat||save.beats[`dba.beat.${beat}`]?next:undefined;
}
