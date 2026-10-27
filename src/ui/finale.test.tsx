import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from '../App';
import { reduce } from '../core/reduce';
import { newGameState } from '../core/save';
import { SAVE_KEY } from '../platform/storage';
import { useGame } from '../stores/gameStore';
import { Finale } from './Finale';

const FULL_CASE = [
  'myp.ev.a',
  'myp.ev.b',
  'myp.ev.main',
  'nmn.ev.a',
  'nmn.ev.b',
  'nmn.ev.main',
  'amh.ev.a',
  'amh.ev.b',
  'amh.ev.main',
  'iku.ev.a',
  'iku.ev.main',
  'eus.ev.main',
];

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
  useGame.getState().resetForTests();
});

function departedSave() {
  let save = reduce(newGameState(), { type: 'new-game' });
  for (let step = 0; step < 4; step += 1) save = reduce(save, { type: 'advance-prologue' });
  for (let step = 0; step < 40 && save.beats['myp.beat.depart'] !== true; step += 1) {
    save = reduce(save, { type: 'debug-learn-next' });
  }
  save = reduce(save, { type: 'use-word', wordId: 'myp.word.water' });
  return reduce(save, { type: 'depart' });
}

describe('finale after island 1', () => {
  it('offers only the thin-case homecoming, then keeps that ending in the save', () => {
    localStorage.setItem(SAVE_KEY, JSON.stringify(departedSave()));
    useGame.getState().resetForTests();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '合上' }));

    fireEvent.click(screen.getByRole('button', { name: '案卷' }));
    fireEvent.click(screen.getByTestId('case-finale'));
    expect(screen.getByTestId('finale-plate').getAttribute('data-ending')).toBe('open');
    expect(screen.getByTestId('finale-plate').getAttribute('data-case')).toBe('thin');
    expect(screen.queryByTestId('ending-stay')).toBeNull();
    expect(screen.queryByTestId('ending-restart')).toBeNull();
    expect(screen.queryByText('奈奈茶')).toBeNull();

    fireEvent.click(screen.getByTestId('ending-deny'));
    expect(screen.getByTestId('finale-plate').getAttribute('data-ending')).toBe('false-home');
    expect(screen.queryByTestId('ending-name')).toBeNull();
    expect(screen.queryByText('奈奈茶')).toBeNull();

    const saved = JSON.parse(localStorage.getItem(SAVE_KEY) ?? '{}') as {
      beats?: Record<string, boolean>;
      flags?: Record<string, unknown>;
    };
    expect(saved.flags?.['fin.flag.ending']).toBe('false-home');
    expect(saved.beats?.['myp.beat.depart']).toBe(true);
  });

  it('offers stay and restart only after the case is full, and speaks the name on those endings', () => {
    const dispatch = vi.fn();
    const open = {
      ...newGameState(),
      overlay: 'finale' as const,
      evidence: FULL_CASE,
      beats: { 'myp.beat.depart': true },
    };
    const { rerender } = render(<Finale save={open} dispatch={dispatch} />);
    expect(screen.getByTestId('finale-plate').getAttribute('data-case')).toBe('full');
    expect(screen.queryByText('奈奈茶')).toBeNull();
    fireEvent.click(screen.getByTestId('ending-stay'));
    fireEvent.click(screen.getByTestId('ending-restart'));
    expect(dispatch).toHaveBeenNthCalledWith(1, { type: 'choose-ending', choice: 'stay' });
    expect(dispatch).toHaveBeenNthCalledWith(2, { type: 'choose-ending', choice: 'restart' });

    rerender(
      <Finale
        save={{
          ...open,
          flags: {
            'fin.flag.confronted': true,
            'fin.flag.admit': true,
            'fin.flag.choice': 'restart',
            'fin.flag.ending': 'restart-echo',
            'fin.flag.name-recalled': true,
            'fin.flag.recognition-lost': true,
          },
        }}
        dispatch={dispatch}
      />,
    );
    expect(screen.getByTestId('finale-plate').getAttribute('data-ending')).toBe('restart-echo');
    expect(screen.getByTestId('ending-name').textContent).toBe('奈奈茶');
  });
});
