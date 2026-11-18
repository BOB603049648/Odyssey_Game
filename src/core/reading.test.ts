import {describe,expect,it} from 'vitest';
import {READING_FOLIOS,type ReadingId} from '../content/readingJourney';
import {applyReading,hasRead,pendingReading,readingKey,READING_ACTIVE,readingCount} from './reading';
import {newGameState} from './save';
import {reduce} from './reduce';
import {parseSave} from './migrate';
import {canDepart,departureBlocker} from './island';
import {expeditionGoal} from './expedition';
import {GATES,SPOTS} from './stage';
import type {SaveData} from './schema';

const begin=():SaveData=>{const s=reduce(reduce(newGameState(),{type:'new-game'}),{type:'skip-prologue'});return {...s,flags:{...s.flags,'dba.script.active':false,[READING_ACTIVE]:true}};};
function solve(save:SaveData,id:ReadingId){
  const f=READING_FOLIOS.find(f=>f.id===id)!;
  let next=reduce(save,{type:'goto-scene',scene:f.scene});next=reduce(next,{type:'open-reading'});
  next=reduce(next,{type:'reading-submit',folio:id,answer:f.answer,evidence:[...f.proof]});
  expect(hasRead(next,id)).toBe(true);return reduce(next,{type:'close-overlay'});
}
describe('linked readings',()=>{
  it('requires both interpretation and supporting evidence, with useful separate feedback',()=>{
    const save=reduce(begin(),{type:'open-reading'}),f=READING_FOLIOS[0];
    const wrong=reduce(save,{type:'reading-submit',folio:f.id,answer:'store',evidence:[...f.proof]});
    expect(wrong.flags[`${readingKey(f.id)}.result`]).toBe('meaning');expect(hasRead(wrong,f.id)).toBe(false);
    const unsupported=reduce(wrong,{type:'reading-submit',folio:f.id,answer:f.answer,evidence:['blue','vessel']});
    expect(unsupported.flags[`${readingKey(f.id)}.result`]).toBe('evidence');expect(unsupported.words['dba.word.water'].state).toBe('unseen');
    const correct=reduce(unsupported,{type:'reading-submit',folio:f.id,answer:f.answer,evidence:[...f.proof]});
    expect(hasRead(correct,f.id)).toBe(true);expect(correct.words['dba.word.water'].state).toBe('learned');
    expect(correct.flags[`${readingKey(f.id)}.attempts`]).toBe(3);
    expect(applyReading(correct,{type:'reading-submit',folio:f.id,answer:f.answer,evidence:[...f.proof]})).toBe(correct);
  });
  it('rejects duplicate, unknown, excess and remote proof submissions without granting progress',()=>{
    const save=reduce(begin(),{type:'open-reading'}),f=READING_FOLIOS[0];
    for(const evidence of [['salt','salt'],['salt','unknown'],['salt'],['salt','running','blue']]){
      expect(applyReading(save,{type:'reading-submit',folio:f.id,answer:f.answer,evidence})).toBe(save);
    }
    expect(applyReading(save,{type:'reading-submit',folio:'script',answer:'phonetic',evidence:['sound','sequence']})).toBe(save);
    const remote={...save,currentScene:'dba.scene.hall'};
    expect(applyReading(remote,{type:'reading-submit',folio:'script',answer:'phonetic',evidence:['sound','sequence']})).toBe(remote);
    const closed={...save,overlay:'none' as const};expect(applyReading(closed,{type:'reading-hint',folio:'spring'})).toBe(closed);
  });
  it('keeps hints and read evidence through save/reload without unlocking a page',()=>{
    let save=reduce(begin(),{type:'open-reading'});
    for(let i=0;i<5;i++)save=reduce(save,{type:'reading-hint',folio:'spring'});
    const loaded=parseSave(JSON.parse(JSON.stringify(save)))!;
    expect(loaded.overlay).toBe('reading');expect(loaded.flags['dba.reading.spring.hint']).toBe(2);expect(readingCount(loaded)).toBe(0);
  });
  it('completes all six readings with actual survival and bridge actions, then departs after reload',()=>{
    let save=begin();expect(expeditionGoal(save).spot).toBe('island-mural');save=solve(save,'spring');
    expect(pendingReading(save)).toBeUndefined();expect(expeditionGoal(save).spot).toBe('island-gourd');
    for(const move of ['take','fill','drink'] as const)save=reduce(save,{type:'puzzle-act',puzzle:'water',move});
    expect(pendingReading(save)?.id).toBe('hearth');save=solve(save,'hearth');save=reduce(save,{type:'sleep-at-camp'});
    expect(pendingReading(save)?.id).toBe('table');save=solve(save,'table');
    for(const move of ['inspect','take','move-to-companion','move-to-companion','offer'] as const)save=reduce(save,{type:'puzzle-act',puzzle:'food',move});
    expect(pendingReading(save)?.id).toBe('script');save=solve(save,'script');save=solve(save,'bridge');
    for(const clue of ['boards','rope'] as const)save=reduce(save,{type:'bridge-act',move:'inspect',clue});
    save=reduce(save,{type:'bridge-act',move:'select',slot:'reason',wordId:'dba.word.danger'});
    save=reduce(save,{type:'bridge-act',move:'select',slot:'intent',wordId:'dba.word.wait'});
    save=reduce(save,{type:'bridge-act',move:'signal'});
    expect(save.beats['dba.beat.danger']).toBeUndefined();expect(expeditionGoal(save).spot).toBe('path-west');
    save=reduce(save,{type:'goto-scene',scene:'dba.scene.yard'});expect(save.beats['dba.beat.danger']).toBe(true);
    expect(pendingReading(save)?.id).toBe('palimpsest');expect(canDepart(save)).toBe(false);
    save=solve(save,'palimpsest');expect(save.evidence).toContain('dba.ev.main');expect(readingCount(save)).toBe(6);
    save=parseSave(JSON.parse(JSON.stringify(save)))!;expect(canDepart(save)).toBe(true);
    save=reduce(save,{type:'goto-scene',scene:'dba.scene.shore'});save=reduce(save,{type:'depart'});
    expect(save.overlay).toBe('depart');expect(save.memories).toContain('dba.mem.rain-night');
  });
  it('does not let practice-word completion bypass the readings on a new journey',()=>{
    const save=begin();for(const word of Object.values(save.words))word.state='learned';
    for(const beat of ['water','sleep','food','danger'])save.beats[`dba.beat.${beat}`]=true;
    expect(departureBlocker(save)).toBe('reading');
    const legacy={...save,flags:{}};expect(canDepart(legacy)).toBe(true);
    expect(canDepart({...save,beats:{'dba.beat.depart':true}})).toBe(true);
    const adopted=reduce(legacy,{type:'open-reading'});expect(adopted.flags[READING_ACTIVE]).toBe(true);expect(adopted.beats).toEqual(legacy.beats);
  });
  it('places every folio on reachable scenery and only recalls earlier pages',()=>{
    const reached=new Set(['dba.scene.shore']);for(let i=0;i<6;i++)for(const gate of GATES)if(reached.has(gate.from))reached.add(gate.to);
    READING_FOLIOS.forEach((f,i)=>{
      expect(reached.has(f.scene)).toBe(true);expect(SPOTS[f.scene].some(s=>s.id===f.spot)).toBe(true);
      expect(new Set(f.proof).size).toBe(2);expect(f.choices.filter(c=>c.id===f.answer)).toHaveLength(1);
      for(const id of f.proof)expect(f.evidence.some(e=>e.id===id)).toBe(true);
      for(const e of f.evidence)if(e.from)expect(READING_FOLIOS.findIndex(prior=>prior.id===e.from)).toBeLessThan(i);
    });
  });
});
