import { cleanup,fireEvent,render,screen } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { AdventureHud } from './AdventureHud';
import { newGameState } from '../core/save';
import { reduce } from '../core/reduce';

afterEach(()=>{cleanup();vi.unstubAllGlobals();});
function setup(){
  const save=reduce(reduce(newGameState(),{type:'new-game'}),{type:'skip-prologue'}),dispatch=vi.fn();
  render(<AdventureHud save={save} dispatch={dispatch} learned={0} onTitle={()=>{}}/>);
  return {save,dispatch};
}
it('folds lengthy guidance without hiding reading access or changing progress',()=>{
  const {dispatch}=setup();const fold=screen.getByRole('button',{name:'收起行程'});
  const detail=document.getElementById(fold.getAttribute('aria-controls')!)!;
  expect(detail.hidden).toBe(false);fireEvent.click(fold);expect(detail.hidden).toBe(true);
  expect(screen.getByRole('button',{name:'展开行程'}).getAttribute('aria-expanded')).toBe('false');
  expect(dispatch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByTestId('open-reading'));expect(dispatch).toHaveBeenCalledWith({type:'open-overlay',overlay:'journal'});
});
it('starts compact on narrow displays and keeps menu names available for assistive input',()=>{
  vi.stubGlobal('matchMedia',vi.fn(()=>({matches:true})));
  const {dispatch}=setup();expect(screen.getByRole('button',{name:'展开行程'})).toBeTruthy();
  fireEvent.click(screen.getByRole('button',{name:'手记'}));expect(dispatch).toHaveBeenCalledWith({type:'open-overlay',overlay:'casefile'});
  fireEvent.click(screen.getByRole('button',{name:'设置'}));expect(dispatch).toHaveBeenCalledWith({type:'open-overlay',overlay:'settings'});
});
