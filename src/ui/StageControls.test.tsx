import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { gatesFrom } from '../core/stage';
import { StageControls } from './StageControls';
import type { SpotView } from './spotViews';

afterEach(cleanup);
const exits = gatesFrom('dba.scene.shore');
const nearby: SpotView = { id: 'shore-driftwood', testId: 'shore-driftwood', className: 'hotspot', label: '漂木', x: .33, y: .72, r: .05 };
function setup() {
  const props = { scene: 'dba.scene.shore' as const, exits, nearby, onTravel: vi.fn(), onInteract: vi.fn() };
  return { ...render(<StageControls {...props} />), props };
}
it('exposes only this scene’s routes and delegates walking to the selected gate', () => {
  const view = setup();
  fireEvent.click(view.getByRole('button', { name: '路线' }));
  expect(view.getByRole('navigation', { name: '场景出口' })).toBeTruthy();
  expect(view.queryByTestId('route-night')).toBeNull();
  fireEvent.click(view.getByTestId('route-camp'));
  expect(view.props.onTravel).toHaveBeenCalledWith(exits.find(g => g.to === 'dba.scene.camp'));
  expect(view.queryByRole('navigation')).toBeNull();
});
it('Escape dismisses routes and returns focus without opening another game overlay', () => {
  const view = setup();
  const escape = vi.fn();
  window.addEventListener('keydown', escape);
  fireEvent.click(view.getByRole('button', { name: '路线' }));
  fireEvent.keyDown(view.getByTestId('route-camp'), { key: 'Escape' });
  expect(escape).not.toHaveBeenCalled();
  expect(document.activeElement).toBe(view.getByRole('button', { name: '路线' }));
  expect(view.queryByRole('navigation')).toBeNull();
  window.removeEventListener('keydown', escape);
});
it('dispatches the displayed nearby object and removes that action when out of reach', () => {
  const view = setup();
  fireEvent.click(view.getByTestId('nearby-action'));
  expect(view.props.onInteract).toHaveBeenCalledWith(nearby);
  view.rerender(<StageControls {...view.props} nearby={null} />);
  expect(view.queryByTestId('nearby-action')).toBeNull();
});
it('closes the route panel when the scene changes', () => {
  const view = setup();
  fireEvent.click(view.getByRole('button', { name: '路线' }));
  view.rerender(<StageControls {...view.props} scene="dba.scene.camp" exits={gatesFrom('dba.scene.camp')} />);
  expect(view.queryByRole('navigation')).toBeNull();
});
