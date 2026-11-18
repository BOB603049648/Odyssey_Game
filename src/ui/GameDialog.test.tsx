import { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameDialog } from './GameDialog';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
function Fixture() {
  const [open,setOpen]=useState(false);
  return <><button onClick={()=>setOpen(true)}>打开手记</button>{open?<GameDialog title="旅途手记" onClose={()=>setOpen(false)}><p>已经找到的线索。</p></GameDialog>:null}</>;
}
describe('shared dialog behavior',()=>{
  it('opens a native modal with focus at the heading and supplies an explicit close control',()=>{
    const open=vi.fn(function(this:HTMLDialogElement){this.setAttribute('open','');});
    const close=vi.fn(function(this:HTMLDialogElement){this.removeAttribute('open');});
    Object.defineProperty(HTMLDialogElement.prototype,'showModal',{configurable:true,value:open});
    Object.defineProperty(HTMLDialogElement.prototype,'close',{configurable:true,value:close});
    try {
      render(<Fixture/>);fireEvent.click(screen.getByRole('button',{name:'打开手记'}));
      expect(open).toHaveBeenCalledOnce();
      expect(document.activeElement).toBe(screen.getByRole('heading',{name:'旅途手记'}));
      fireEvent.click(screen.getByRole('button',{name:'关闭旅途手记'}));
      expect(close).toHaveBeenCalledOnce();expect(screen.queryByRole('dialog')).toBeNull();
    } finally { delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).showModal; delete (HTMLDialogElement.prototype as Partial<HTMLDialogElement>).close; }
  });
  it('restores the trigger in fallback environments and handles cancel without reaching gameplay',()=>{
    const key=vi.fn(),click=vi.fn();window.addEventListener('keydown',key);window.addEventListener('click',click);
    try {
      render(<Fixture/>);const trigger=screen.getByRole('button',{name:'打开手记'});trigger.focus();fireEvent.click(trigger);click.mockClear();
      const dialog=screen.getByRole('dialog',{name:'旅途手记'});
      fireEvent.keyDown(dialog,{key:'w'});fireEvent.click(screen.getByText('已经找到的线索。'));
      expect(key).not.toHaveBeenCalled();expect(click).not.toHaveBeenCalled();
      fireEvent(dialog,new Event('cancel',{bubbles:true,cancelable:true}));
      expect(screen.queryByRole('dialog')).toBeNull();expect(document.activeElement).toBe(trigger);
    } finally {window.removeEventListener('keydown',key);window.removeEventListener('click',click);}
  });
});
