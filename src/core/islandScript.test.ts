import {describe,expect,it} from 'vitest';
import {SCRIPT_GROUPS,SCRIPT_TRACES,SCRIPT_WORDS} from '../content/islandScript';
import {adoptScript,groupReady,scriptConfirmed,scriptCount,scriptGuess,scriptKey,traceStep,wordSeen} from './islandScript';
import {newGameState} from './save';
import {reduce,type Action} from './reduce';
import {saveDataSchema,type SaveData} from './schema';
import {canDepart} from './island';
import {puzzleState} from './puzzles';
import {BANDS,SPAWNS,interactionStandPoint,standsAt} from './stage';
import {stepWorld} from './worldLoop';
import {plantOnGround} from './stage';
import {visibleSpots} from '../ui/spotViews';
import {npcForScene,npcSpotId} from '../content/npcJourney';

const begin=()=>reduce(reduce(newGameState(),{type:'new-game'}),{type:'skip-prologue'});
const actions=(s:SaveData,...as:Action[])=>as.reduce(reduce,s);
function observe(s:SaveData,group:string){
  for(const trace of SCRIPT_TRACES.filter(t=>t.group===group)){
    s=actions(s,{type:'close-overlay'},{type:'goto-scene',scene:trace.scene},{type:'observe-script',id:trace.id});
    for(let i=1;i<trace.moments.length;i++)s=reduce(s,{type:'script-next'});
  }
  return reduce(s,{type:'open-overlay',overlay:'journal'});
}
function solve(s:SaveData,group:string){
  s=observe(s,group);
  for(const word of SCRIPT_GROUPS.find(g=>g.id===group)!.words)s=reduce(s,{type:'script-guess',word,value:SCRIPT_WORDS.find(w=>w[0]===word)![1]});
  s=reduce(s,{type:'script-verify',group});expect(scriptConfirmed(s,group)).toBe(true);
  return reduce(s,{type:'close-overlay'});
}
describe('observation and original island script',()=>{
  it('records only encountered moments; guards location, overlays and unseen guesses',()=>{
    let s=begin();
    expect(reduce(s,{type:'observe-script',id:'night-ledger'}).overlay).toBe('none');
    s=reduce(s,{type:'observe-script',id:'spring-stone'});
    expect(traceStep(s,'spring-stone')).toBe(0);expect(wordSeen(s,'water')).toBe(true);expect(wordSeen(s,'drink')).toBe(false);
    s=reduce(s,{type:'open-overlay',overlay:'journal'});
    s=reduce(s,{type:'script-guess',word:'trust',value:'信任'});expect(scriptGuess(s,'trust')).toBe('');
    s=reduce(s,{type:'script-verify',group:'spring'});expect(scriptConfirmed(s,'spring')).toBe(false);
    expect(groupReady(s,'spring')).toBe(false);expect(traceStep(reduce(s,{type:'script-next'}),'spring-stone')).toBe(0);
  });
  it('saves guesses, accepts common synonyms and verifies a whole group without per-word feedback',()=>{
    let s=observe(begin(),'spring');
    s=actions(s,{type:'script-guess',word:'water',value:'清水'},{type:'script-guess',word:'drink',value:'走'},{type:'script-guess',word:'take',value:'取用'},{type:'script-verify',group:'spring'});
    expect(s.flags[scriptKey('result','spring')]).toBe('revisit');expect(scriptCount(s)).toBe(0);
    expect(['water','drink','take'].map(w=>s.words[`dba.word.${w}`].state)).toEqual(['guessed','guessed','guessed']);
    s=saveDataSchema.parse(JSON.parse(JSON.stringify(s)));expect(scriptGuess(s,'take')).toBe('取用');
    s=actions(s,{type:'script-guess',word:'drink',value:' 喝水。'},{type:'script-verify',group:'spring'});
    expect(scriptCount(s)).toBe(1);expect(s.beats['dba.beat.water']).not.toBe(true);
    expect(reduce(s,{type:'script-guess',word:'water',value:'火'}).words).toEqual(s.words);
  });
  it('preserves completed legacy journeys without fabricating observations',()=>{
    const old=newGameState();old.beats['dba.beat.depart']=true;old.flags['v01.completed']=true;old.memories=['dba.mem.rain-night'];
    for(const word of ['water','drink','take'])old.words[`dba.word.${word}`].state='learned';
    const s=adoptScript(old);expect(canDepart(s)).toBe(true);expect(s.memories).toEqual(old.memories);
    expect(scriptConfirmed(s,'spring')).toBe(true);expect(traceStep(s,'spring-stone')).toBe(-1);expect(adoptScript(s)).toBe(s);
  });
  it('does not expose the old quizzes or bypass the notebook through picture practice',()=>{
    let s=begin();expect(reduce(s,{type:'open-reading'}).overlay).toBe('journal');expect(reduce(s,{type:'open-mural'}).screen).toBe('island');
    s=reduce(s,{type:'goto-scene',scene:'dba.scene.path'});
    s=actions(s,{type:'bridge-act',move:'inspect',clue:'boards'},{type:'bridge-act',move:'inspect',clue:'rope'},{type:'bridge-act',move:'decipher',wordId:'dba.word.wait'});
    expect(s.words['dba.word.wait'].state).toBe('unseen');
    const spots=visibleSpots('dba.scene.shore',begin(),{level:0,anchor:'mural-entrance',wordId:null});
    expect(spots.some(s=>s.id==='island-mural')).toBe(false);expect(spots.filter(s=>s.id.startsWith('trace:'))).toHaveLength(2);
  });
  it('completes the chapter through all six groups and actual survival actions',()=>{
    let s=solve(begin(),'spring');
    s=actions(s,{type:'poke-gourd'},{type:'puzzle-act',puzzle:'water',move:'fill'},{type:'poke-gourd'});expect(puzzleState(s).water).toBe('done');
    s=solve(s,'hearth');s=reduce(s,{type:'sleep-at-camp'});expect(s.beats['dba.beat.sleep']).toBe(true);
    s=solve(s,'table');
    s=actions(s,{type:'puzzle-act',puzzle:'food',move:'inspect'},{type:'puzzle-act',puzzle:'food',move:'take'},{type:'puzzle-act',puzzle:'food',move:'move-to-companion'},{type:'puzzle-act',puzzle:'food',move:'move-to-companion'},{type:'give-fish'});expect(s.beats['dba.beat.food']).toBe(true);
    s=solve(s,'witness');s=solve(s,'bridge');
    s=actions(s,{type:'bridge-act',move:'inspect',clue:'boards'},{type:'bridge-act',move:'inspect',clue:'rope'},{type:'bridge-act',move:'select',slot:'reason',wordId:'dba.word.danger'},{type:'bridge-act',move:'select',slot:'intent',wordId:'dba.word.wait'},{type:'bridge-act',move:'signal'});
    expect(s.beats['dba.beat.danger']).not.toBe(true);
    s=reduce(s,{type:'goto-scene',scene:'dba.scene.yard'});expect(s.beats['dba.beat.danger']).toBe(true);expect(canDepart(s)).toBe(false);
    s=solve(s,'night');expect(scriptCount(s)).toBe(6);expect(canDepart(s)).toBe(true);
    s=actions(s,{type:'goto-scene',scene:'dba.scene.shore'},{type:'depart'});expect(s.overlay).toBe('depart');expect(s.memories).toContain('dba.mem.rain-night');
    for(let i=0;i<7;i++)s=reduce(s,{type:'advance-cutscene'});expect(s.flags['v01.completed']).toBe(true);
  });
  it('reaches all 18 observations using collision-aware walking without changing the walk speed',()=>{
    for(const trace of SCRIPT_TRACES){
      const npc=npcForScene(trace.scene)!;
      const spot={...trace,id:trace.npc?npcSpotId(npc):`trace:${trace.id}`,r:trace.npc?npc.r:.04};
      const goal=interactionStandPoint(trace.scene,spot);
      let walker={pos:plantOnGround(trace.scene,SPAWNS[trace.scene]),velocity:{x:0,y:0},seek:goal as {x:number;y:number}|null};
      const guide={phase:'hold' as const,elapsed:0,cat:{x:.4,y:.7},post:{x:.4,y:.7}};
      for(let i=0;i<1800&&walker.seek;i++)walker=stepWorld({walker,intent:{move:null,seek:null},band:BANDS[trace.scene],scene:trace.scene,dt:1/60,guide}).walker;
      expect(standsAt(trace.scene,spot,walker.pos),trace.id).toBe(true);
    }
  });
});
