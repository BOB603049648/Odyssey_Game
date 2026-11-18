import { cleanup,fireEvent,render } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { GATES } from '../core/stage';
import { ScenicExit } from './ScenicExit';

afterEach(cleanup);
it('keeps the actual travel gate when its affordance is a scenic prop',()=>{
  const onTravel=vi.fn(),gate=GATES[0];
  const view=render(<ScenicExit gate={gate} near={false} selected={false} onTravel={onTravel}/>);
  const button=view.getByRole('button',{name:'棚火'});
  expect(button.dataset.kind).toBe('trail');
  expect(button.style.top).toBe('72%');
  fireEvent.click(button);
  expect(onTravel).toHaveBeenCalledExactlyOnceWith(gate);
});
it('uses a doorway and ground arrows for the matching routes',()=>{
  const view=render(<ScenicExit gate={GATES[1]} near selected={false} onTravel={()=>{}}/>);
  expect(view.getByRole('button').dataset.kind).toBe('door');
  view.rerender(<ScenicExit gate={GATES[4]} near selected onTravel={()=>{}}/>);
  expect(view.getByRole('button').dataset.kind).toBe('trail');
  expect(view.getByRole('button').classList.contains('selected')).toBe(true);
});
