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
    const done=reduce(save,{type:'use-word',wordId:'dba.word.water'});
    expect(gameCues(save,done)).toContainEqual({id:'milestone',delay:1100,level:.7});
    expect(gameCues(done,reduce(done,{type:'poke-gourd'}))).toEqual([]);
  });
  it('picks up an actual new evidence item and acknowledges requests for the cat', () => {
    const save=shore();save.evidence=[];
    const next=reduce(save,{type:'shore-stone'});
    expect(gameCues(save,next).map(c=>c.id)).toEqual(['pickup','paper']);
    expect(gameCues(next,reduce(next,{type:'shore-stone'}))).toEqual([]);
    expect(gameCues(save,reduce(save,{type:'request-hint'})).map(c=>c.id)).toContain('cat-call');
  });
});
