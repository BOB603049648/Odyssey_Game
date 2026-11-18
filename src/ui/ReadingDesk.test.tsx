import {useReducer} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {ReadingDesk} from './ReadingDesk';
import {reduce} from '../core/reduce';
import {newGameState} from '../core/save';
import {READING_FOLIOS} from '../content/readingJourney';
import {readingKey} from '../core/reading';
import type {SaveData} from '../core/schema';
afterEach(cleanup);
function initial(){const s=reduce(reduce(newGameState(),{type:'new-game'}),{type:'skip-prologue'});return reduce({...s,flags:{...s.flags,'dba.script.active':false,'dba.reading.active':true}},{type:'open-reading'});}
function Play({initialSave=initial()}:{initialSave?:SaveData}){
  const [save,dispatch]=useReducer(reduce,initialSave);
  return save.overlay==='reading'?<ReadingDesk save={save} dispatch={dispatch}/>:<p>回到探索</p>;
}
it('requires one interpretation and two retractable clues, then preserves the solved reading',()=>{
  render(<Play/>);const submit=screen.getByRole('button',{name:'合上证据，试读此页'});
  expect(submit).toHaveProperty('disabled',true);
  fireEvent.click(screen.getByRole('radio',{name:/从流出的清泉取水/}));
  fireEvent.click(screen.getByRole('checkbox',{name:/潮口白痕/}));
  fireEvent.click(screen.getByRole('checkbox',{name:/水面的颜色/}));
  expect(screen.getByRole('checkbox',{name:/泉眼与细渠/})).toHaveProperty('disabled',true);
  fireEvent.click(submit);expect(screen.getByRole('status').textContent).toContain('所选旁证');
  fireEvent.click(screen.getByRole('checkbox',{name:/水面的颜色/}));
  fireEvent.click(screen.getByRole('checkbox',{name:/泉眼与细渠/}));fireEvent.click(submit);
  expect(screen.getByRole('status').textContent).toContain('保全来源');expect(screen.queryByRole('radio')).toBeNull();
  fireEvent.click(screen.getByRole('button',{name:'带着这条读法继续走'}));expect(screen.getByText('回到探索')).toBeTruthy();
});
it('does not expose future questions or evidence before visiting and reading their predecessors',()=>{
  render(<Play/>);fireEvent.click(screen.getByTestId('folio-palimpsest'));
  expect(screen.getByTestId('reading-locked').textContent).toContain('先到雾岸');
  expect(screen.queryByText('新层：彼自弃约，余无所负。')).toBeNull();expect(screen.queryByRole('radio')).toBeNull();
});
it('shows attested images with attribution and keeps original fiction explicitly identified',()=>{
  const save={...initial(),currentScene:'dba.scene.hall'};
  for(const f of READING_FOLIOS.slice(0,3))save.flags[readingKey(f.id)]=true;
  render(<Play initialSave={save}/>);
  expect(screen.getByRole('img',{name:/雪字例/})).toBeTruthy();expect(screen.getByRole('img',{name:/峭顶字例/})).toBeTruthy();
  expect(screen.getByText('旅人汉文笔记 · 游戏原创')).toBeTruthy();
  expect(screen.getByRole('link',{name:/莱顿大学图书馆/}).getAttribute('href')).toContain('/reading-a-naxi-manuscript');
});
it('offers stepped hints without filling an answer or submitting for the player',()=>{
  render(<Play/>);fireEvent.click(screen.getByRole('button',{name:'看一条读法提示'}));
  expect(screen.getByText(/先分清“源”与“流”/)).toBeTruthy();
  expect(screen.getAllByRole('radio').every(input=>!(input as HTMLInputElement).checked)).toBe(true);
  fireEvent.click(screen.getByRole('button',{name:'再提示一步'}));
  expect(screen.getByRole('button',{name:'提示已展开'})).toHaveProperty('disabled',true);
});
