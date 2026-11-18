import {useReducer} from 'react';
import {afterEach,expect,it} from 'vitest';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {ScriptJournal,ScriptObservation} from './ScriptJournal';
import {reduce} from '../core/reduce';
import {newGameState} from '../core/save';
import type {SaveData} from '../core/schema';
import {SCRIPT_TRACES} from '../content/islandScript';
afterEach(cleanup);
const start=()=>reduce(reduce(newGameState(),{type:'new-game'}),{type:'skip-prologue'});
function Play({initial}:{initial:SaveData}){const [s,d]=useReducer(reduce,initial);return s.overlay==='journal'?<ScriptJournal save={s} dispatch={d}/>:s.overlay==='script'?<ScriptObservation save={s} dispatch={d}/>:<p>继续探索</p>;}
it('does not reveal unseen glyphs, translations or future observations',()=>{
  render(<Play initial={reduce(start(),{type:'open-overlay',overlay:'journal'})}/>);
  expect(screen.queryByRole('textbox')).toBeNull();expect(screen.queryByRole('img')).toBeNull();
  expect(screen.queryByText('水')).toBeNull();expect(screen.queryByText('泉沿的刻痕')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:/未熄的约定/}));expect(screen.queryByText('灾年的薄册')).toBeNull();
});
it('records successive contexts and gives a free-text notebook without answer choices',()=>{
  render(<Play initial={reduce(start(),{type:'observe-script',id:'spring-stone'})}/>);
  expect(screen.getByTestId('script-observation')).toBeTruthy();expect(screen.queryByRole('radio')).toBeNull();
  expect(screen.queryByText(/旅人先俯身/)).toBeNull();fireEvent.click(screen.getByRole('button',{name:'翻看另一面'}));
  expect(screen.getByText(/旅人先俯身/)).toBeTruthy();fireEvent.click(screen.getByRole('button',{name:'记下我的猜测'}));
  const input=screen.getByRole('textbox',{name:'刻符 1 的暂定词义'});fireEvent.change(input,{target:{value:'泉水'}});expect(input).toHaveProperty('value','泉水');
  expect(screen.getByRole('button',{name:'将这一组与见闻对照'})).toHaveProperty('disabled',true);
  fireEvent.click(screen.getByRole('button',{name:'关闭旅人手记'}));expect(screen.getByText('继续探索')).toBeTruthy();
});
it('keeps every guess editable after a wrong group, then confirms together',()=>{
  let s=start();for(const t of SCRIPT_TRACES.filter(t=>t.group==='spring')){s=reduce(s,{type:'close-overlay'});s=reduce(s,{type:'observe-script',id:t.id});s=reduce(s,{type:'script-next'});}
  render(<Play initial={reduce(s,{type:'open-overlay',overlay:'journal'})}/>);
  ['水','睡','拿'].forEach((value,i)=>fireEvent.change(screen.getByRole('textbox',{name:`刻符 ${i+1} 的暂定词义`}),{target:{value}}));
  fireEvent.click(screen.getByRole('button',{name:'将这一组与见闻对照'}));expect(screen.getByRole('status').textContent).toContain('不能解释所有见闻');expect(screen.getAllByRole('textbox')).toHaveLength(3);
  fireEvent.change(screen.getByRole('textbox',{name:'刻符 2 的暂定词义'}),{target:{value:'饮水'}});fireEvent.click(screen.getByRole('button',{name:'将这一组与见闻对照'}));expect(screen.queryByRole('textbox')).toBeNull();expect(screen.getByRole('status').textContent).toContain('墨迹落定');
});
