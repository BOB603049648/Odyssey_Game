import { cleanup, fireEvent, render, waitFor } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { companionPost } from '../core/companionPost';
import { newGameState } from '../core/save';
import { WalkLayer } from './WalkLayer';
import { visibleSpots } from './spotViews';

vi.mock('./firstScreenReady', () => ({ useFirstScreenReady: () => ({ status: 'ready', done: 1, total: 1, retry: () => {} }) }));
afterEach(cleanup);

async function setup() {
  const onInteract = vi.fn();
  const hint = { level: 0 as const, anchor: 'driftwood' as const, wordId: null, pose: 'idle' as const };
  const noop = () => {};
  const view = render(<><button type="button">词库</button><input aria-label="文字输入" />
    <WalkLayer scene="dba.scene.shore" drank={false} paused={false} purr={false} knot="rest"
      remembered={{ x: .33, y: .72 }} hint={hint} spots={visibleSpots('dba.scene.shore', newGameState(), hint)}
      catPost={companionPost('dba.scene.shore', {})} onRemember={noop} onExit={noop} onInteract={onInteract}
      onAsk={noop} onEscape={noop} taught />
  </>);
  await waitFor(() => expect(view.getByTestId('walk-stage').getAttribute('data-display')).toBe('ready'));
  return { ...view, onInteract };
}

it.each(['Enter', ' '])('leaves %s activation to the focused native button', async key => {
  const view = await setup();
  const button = view.getByRole('button', { name: '词库' });
  button.focus();
  expect(fireEvent.keyDown(button, { key })).toBe(true);
  expect(view.onInteract).not.toHaveBeenCalled();
});
it('still allows the explicit E shortcut after clicking a control', async () => {
  const view = await setup();
  const button = view.getByRole('button', { name: '词库' });
  button.focus();
  fireEvent.keyDown(button, { key: 'e' });
  expect(view.onInteract).toHaveBeenCalledWith('shore-driftwood');
});
it('does not turn text input into movement or interaction', async () => {
  const view = await setup();
  const input = view.getByRole('textbox');
  const before = view.getByTestId('traveler').getAttribute('data-x');
  input.focus();
  for (const key of ['e', 'd', 'ArrowRight', ' ']) expect(fireEvent.keyDown(input, { key })).toBe(true);
  expect(view.onInteract).not.toHaveBeenCalled();
  expect(view.getByTestId('traveler').getAttribute('data-x')).toBe(before);
});
