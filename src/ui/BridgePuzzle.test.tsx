import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it, vi } from 'vitest';
import { reduce } from '../core/reduce';
import { newGameState } from '../core/save';
import { bridgeState } from '../core/bridge';
import { BridgePuzzle } from './BridgePuzzle';

afterEach(cleanup);
function initial() {
  const save = reduce(reduce(reduce(newGameState(), { type: 'new-game' }), { type: 'skip-prologue' }), { type: 'goto-scene', scene: 'dba.scene.path' });
  for (const id of ['water', 'danger', 'sleep', 'give']) save.words[`dba.word.${id}`].state = 'learned';
  return save;
}
it('lets observation, a local reading, a revised phrase and an explicit signal form distinct operations', () => {
  function Play() {
    const [save, setSave] = useState(initial);
    return <><output data-testid="result">{bridgeState(save).stage}:{String(save.beats['dba.beat.danger'])}:{save.words['dba.word.wait'].state}</output>
      <BridgePuzzle save={save} dispatch={action => setSave(s => reduce(s, action))} onClose={() => {}} /></>;
  }
  render(<Play />);
  expect(screen.queryByTestId('bridge-word-danger')).toBeNull();
  fireEvent.click(screen.getByTestId('bridge-inspect-boards'));
  expect(screen.queryByTestId('bridge-read-wait')).toBeNull();
  fireEvent.click(screen.getByTestId('bridge-inspect-rope'));
  expect(screen.queryByTestId('bridge-word-protect')).toBeNull();
  fireEvent.click(screen.getByTestId('bridge-read-sleep'));
  expect(screen.getByTestId('result').textContent).toBe('planning:undefined:guessed');
  screen.getByTestId('bridge-read-wait').focus();
  fireEvent.click(screen.getByTestId('bridge-read-wait'));
  expect(screen.getByTestId('result').textContent).toBe('planning:undefined:learned');
  expect(document.activeElement).toBe(screen.getByTestId('bridge-slot-reason'));
  fireEvent.click(screen.getByTestId('bridge-word-water'));
  fireEvent.click(screen.getByTestId('bridge-word-give'));
  fireEvent.click(screen.getByTestId('bridge-signal'));
  expect(screen.getByTestId('bridge-feedback').textContent).toContain('脚下的路出了什么问题');
  fireEvent.click(screen.getByTestId('bridge-slot-reason'));
  fireEvent.click(screen.getByTestId('bridge-word-danger'));
  fireEvent.click(screen.getByTestId('bridge-signal'));
  expect(screen.getByTestId('bridge-feedback').textContent).toContain('还没有让它安心');
  fireEvent.click(screen.getByRole('button', { name: '清空这一格' }));
  expect(screen.getByTestId('bridge-signal').hasAttribute('disabled')).toBe(true);
  fireEvent.click(screen.getByTestId('bridge-word-wait'));
  expect(screen.getByTestId('result').textContent).toBe('planning:undefined:learned');
  fireEvent.click(screen.getByTestId('bridge-signal'));
  expect(screen.getByTestId('result').textContent).toBe('agreed:undefined:learned');
});
it('keeps observations operable after an art failure and retries without losing the puzzle', () => {
  const dispatch = vi.fn(), close = vi.fn();
  const view = render(<BridgePuzzle save={initial()} dispatch={dispatch} onClose={close} />);
  const picture = view.container.querySelector('.bridge-closeup > img')!;
  fireEvent.error(picture);
  expect(screen.getByText(/近景暂未载入/)).toBeTruthy();
  fireEvent.click(screen.getByTestId('bridge-inspect-boards'));
  expect(dispatch).toHaveBeenCalledWith({ type: 'bridge-act', move: 'inspect', clue: 'boards' });
  fireEvent.click(screen.getByRole('button', { name: '重新载入画面' }));
  expect(view.container.querySelector('.bridge-closeup > img')).not.toBe(picture);
  fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' });
  expect(close).toHaveBeenCalledOnce();
});
it('keeps old completed journeys readable without asking players to solve the new sequence again', () => {
  const save = initial(); save.beats['dba.beat.danger'] = true;
  render(<BridgePuzzle save={save} dispatch={vi.fn()} onClose={() => {}} />);
  expect(screen.getByText('你们一起回到了稳固的地面')).toBeTruthy();
  expect(screen.queryByTestId('bridge-read-wait')).toBeNull();
  expect(screen.queryByTestId('bridge-signal')).toBeNull();
});
