import { act, cleanup, fireEvent, render, renderHook } from '@testing-library/react';
import { useCallback, useState } from 'react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { reduce, type Action } from '../core/reduce';
import { newGameState } from '../core/save';
import { IDLE_HINT_MS, useIdleHint } from './useIdleHint';

function playable() { return reduce(reduce(newGameState(), { type: 'new-game' }), { type: 'skip-prologue' }); }
const advance = (ms: number) => act(() => vi.advanceTimersByTime(ms));
beforeEach(() => {
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'performance', 'Date'] });
  vi.spyOn(document, 'hasFocus').mockReturnValue(true);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); });

it('offers one passive glance, while manual requests can still reach stronger help', () => {
  function Play() {
    const [save, setSave] = useState(() => reduce(reduce(playable(), { type: 'open-mural' }),
      { type: 'select-cell', wordId: 'dba.word.water' }));
    const dispatch = useCallback((action: Action) => setSave(current => reduce(current, action)), []);
    useIdleHint(save, dispatch);
    return <button onClick={() => dispatch({ type: 'request-hint' })}>{save.companion.level}</button>;
  }
  const view = render(<Play />);
  advance(IDLE_HINT_MS); expect(view.getByRole('button').textContent).toBe('1');
  advance(IDLE_HINT_MS * 4); expect(view.getByRole('button').textContent).toBe('1');
  fireEvent.click(view.getByRole('button')); expect(view.getByRole('button').textContent).toBe('2');
  fireEvent.click(view.getByRole('button')); expect(view.getByRole('button').textContent).toBe('3');
});

it('counts real movement and held inputs as activity without needing a saved action', () => {
  const dispatch = vi.fn(), save = playable();
  const hook = renderHook(() => useIdleHint(save, dispatch));
  for (let i = 0; i < 5; i++) { advance(15000); act(() => hook.result.current()); }
  expect(dispatch).not.toHaveBeenCalled();
  fireEvent.keyDown(window, { key: 'w' }); advance(60000);
  expect(dispatch).not.toHaveBeenCalled();
  fireEvent.keyUp(window, { key: 'w' }); advance(IDLE_HINT_MS - 1);
  expect(dispatch).not.toHaveBeenCalled(); advance(1001);
  expect(dispatch).toHaveBeenCalledExactlyOnceWith({ type: 'request-hint' });
});

it('suspends assistance in hidden tabs, lost focus and local puzzle panels, then grants fresh idle time', () => {
  const dispatch = vi.fn(), save = playable();
  const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(false);
  const hook = renderHook(({ active }) => useIdleHint(save, dispatch, active), { initialProps: { active: true } });
  advance(19000); hidden.mockReturnValue(true); fireEvent(document, new Event('visibilitychange'));
  advance(60000); expect(dispatch).not.toHaveBeenCalled();
  hidden.mockReturnValue(false); fireEvent(document, new Event('visibilitychange')); advance(19000);
  fireEvent.blur(window); advance(60000); expect(dispatch).not.toHaveBeenCalled();
  fireEvent.focus(window); advance(19000);
  hook.rerender({ active: false }); advance(60000); expect(dispatch).not.toHaveBeenCalled();
  hook.rerender({ active: true }); advance(IDLE_HINT_MS - 1); expect(dispatch).not.toHaveBeenCalled();
  advance(1); expect(dispatch).toHaveBeenCalledOnce();
  hook.unmount(); advance(60000); expect(dispatch).toHaveBeenCalledOnce();
});

it('does not hint while a touch is held, and restarts after the touch is released', () => {
  const dispatch = vi.fn(); renderHook(() => useIdleHint(playable(), dispatch));
  fireEvent.pointerDown(document, { pointerId: 7 }); advance(60000);
  expect(dispatch).not.toHaveBeenCalled();
  fireEvent.pointerUp(window, { pointerId: 7 }); advance(19000); expect(dispatch).not.toHaveBeenCalled();
  advance(1000); expect(dispatch).toHaveBeenCalledOnce();
});
