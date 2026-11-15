import { describe, expect, it } from 'vitest';
import { reduce } from '../core/reduce';
import { newGameState } from '../core/save';
import { gameCues } from './gameCues';
const shore = () => reduce(reduce(newGameState(), { type:'new-game' }), { type:'skip-prologue' });
describe('meaningful game audio events', () => {
  it('does not celebrate a restored/continued save or replay prologue evidence', () => {
    const save=shore(); expect(gameCues(save,save)).toEqual([]);
    expect(gameCues(reduce(newGameState(),{type:'new-game'}),save)).toEqual([]);
  });
  it('separates selection, a new word and wrong answers from cat responses', () => {
    const mural=reduce(shore(),{type:'open-mural'});
    const selected=reduce(mural,{type:'select-cell',wordId:'dba.word.sun'});
    expect(gameCues(mural,selected).map(c=>c.id)).toEqual(['select']);
    const learned=reduce(selected,{type:'match-object',wordId:'dba.word.sun'});
    expect(gameCues(selected,learned).map(c=>c.id)).toEqual(['word-learn']);
    const wrong=reduce(selected,{type:'match-object',wordId:'dba.word.water'});
    expect(gameCues(selected,wrong).map(c=>c.id)).toEqual(['answer-wrong']);
    const island=shore();expect(gameCues(island,reduce(island,{type:'sit-driftwood'})).map(c=>c.id)).toContain('cat-purr');
  });
  it('acknowledges first survival completion once; repeats keep only physical action audio', () => {
    const save=shore(); save.words['dba.word.water'].state='learned';
    const held=reduce(save,{type:'puzzle-act',puzzle:'water',move:'take'});
    const filled=reduce(held,{type:'puzzle-act',puzzle:'water',move:'fill'});
    expect(gameCues(save,held).some(c=>c.id==='milestone')).toBe(false);
    expect(gameCues(held,filled).some(c=>c.id==='milestone')).toBe(false);
    const done=reduce(filled,{type:'puzzle-act',puzzle:'water',move:'drink'});
    expect(gameCues(filled,done)).toContainEqual({id:'milestone',delay:1100,level:.7});
    expect(gameCues(done,reduce(done,{type:'poke-gourd'}))).toEqual([]);
  });
  it('picks up an actual new evidence item and acknowledges requests for the cat', () => {
    const save=shore();save.evidence=[];
    const next=reduce(save,{type:'shore-stone'});
    expect(gameCues(save,next).map(c=>c.id)).toEqual(['pickup','paper']);
    expect(gameCues(next,reduce(next,{type:'shore-stone'}))).toEqual([]);
    expect(gameCues(save,reduce(save,{type:'request-hint'})).map(c=>c.id)).toContain('cat-call');
  });
  it('sounds food placement only when a portion actually moves between bowls', () => {
    let save=reduce(shore(),{type:'goto-scene',scene:'dba.scene.yard'});
    for(const move of ['inspect','take'] as const) save=reduce(save,{type:'puzzle-act',puzzle:'food',move});
    const blocked=reduce(save,{type:'puzzle-act',puzzle:'food',move:'move-to-self'});
    expect(gameCues(save,blocked).some(c=>c.id==='place')).toBe(false);
    const moved=reduce(save,{type:'puzzle-act',puzzle:'food',move:'move-to-companion'});
    expect(gameCues(save,moved)).toContainEqual({id:'place',level:.55});
    expect(gameCues(moved,moved)).toEqual([]);
    const returned=reduce(moved,{type:'puzzle-act',puzzle:'food',move:'move-to-self'});
    expect(gameCues(moved,returned)).toContainEqual({id:'place',level:.55});
    const done={...moved,beats:{...moved.beats,'dba.beat.food':true}};
    expect(gameCues(done,reduce(done,{type:'puzzle-act',puzzle:'food',move:'move-to-self'}))).toEqual([]);
  });
});
