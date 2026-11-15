import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WalkStick } from './WalkStick';

class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  constructor(type: string, init: PointerEventInit) { super(type, init); this.pointerId = init.pointerId ?? 0; }
}
beforeEach(() => vi.stubGlobal('PointerEvent', TestPointerEvent));
afterEach(() => { cleanup(); vi.unstubAllGlobals(); });

function setup() {
  const onVector = vi.fn();
  const view = render(<WalkStick onVector={onVector} />);
  const stick = view.getByTestId('walk-stick');
  stick.setPointerCapture = vi.fn();
  fireEvent.pointerDown(stick, { pointerId: 1, clientX: 50, clientY: 50, button: 0 });
  fireEvent.pointerMove(stick, { pointerId: 1, clientX: 92, clientY: 50 });
  expect(onVector).toHaveBeenLastCalledWith({ x: 1, y: 0 });
  return { ...view, stick, onVector };
}

describe('touch movement ownership', () => {
  it('ignores a second finger moving or lifting while the first finger owns the stick', () => {
    const { stick, onVector } = setup();
    onVector.mockClear();
    fireEvent.pointerDown(stick, { pointerId: 2, clientX: 20, clientY: 20, button: 0 });
    fireEvent.pointerMove(stick, { pointerId: 2, clientX: 20, clientY: 80 });
    fireEvent.pointerUp(stick, { pointerId: 2 });
    expect(onVector).not.toHaveBeenCalled();
    fireEvent.pointerUp(stick, { pointerId: 1 });
    expect(onVector).toHaveBeenLastCalledWith(null);
  });
  it.each(['pointerCancel', 'lostPointerCapture'] as const)('stops on %s and ignores later moves', event => {
    const { stick, onVector } = setup();
    fireEvent[event](stick, { pointerId: 1 });
    expect(onVector).toHaveBeenLastCalledWith(null);
    onVector.mockClear();
    fireEvent.pointerMove(stick, { pointerId: 1, clientX: 10, clientY: 10 });
    expect(onVector).not.toHaveBeenCalled();
  });
  it('stops when an overlay disables movement and refuses new input', () => {
    const { stick, onVector, rerender } = setup();
    rerender(<WalkStick onVector={onVector} disabled />);
    expect(onVector).toHaveBeenLastCalledWith(null);
    onVector.mockClear();
    fireEvent.pointerDown(stick, { pointerId: 2, clientX: 50, clientY: 50, button: 0 });
    fireEvent.pointerMove(stick, { pointerId: 2, clientX: 92, clientY: 50 });
    expect(onVector).not.toHaveBeenCalled();
  });
  it('clears the held vector on window blur', () => {
    const { onVector } = setup();
    fireEvent(window, new Event('blur'));
    expect(onVector).toHaveBeenLastCalledWith(null);
  });
});
