import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { reduce } from './core/reduce';
import { newGameState } from './core/save';
import { SAVE_KEY } from './platform/storage';
import { useGame } from './stores/gameStore';
import { MuralScreen } from './ui/MuralScreen';

afterEach(() => {
  cleanup();
});

beforeEach(() => {
  localStorage.clear();
  useGame.getState().resetForTests();
});

describe('playable slice', () => {
  it('starts with teaching glosses off and can learn water, then use it', () => {
    render(<App />);
    expect(screen.getByRole('switch', { name: '显示教学义' }).getAttribute('aria-checked')).toBe('false');

    fireEvent.click(screen.getByRole('button', { name: '新游戏' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '走上潮线' }));
    fireEvent.click(screen.getByTestId('island-mural'));

    expect(screen.queryByText('太阳')).toBeNull();
    expect(screen.queryByText('水')).toBeNull();

    fireEvent.click(screen.getByTestId('cell-myp.word.water'));
    fireEvent.click(screen.getByTestId('object-myp.word.water'));
    fireEvent.click(screen.getByRole('button', { name: '返回' }));
    fireEvent.click(screen.getByTestId('island-gourd'));
    fireEvent.click(screen.getByTestId('use-myp.word.water'));

    expect(screen.getByTestId('shore').getAttribute('data-water-beat')).toBe('done');
    expect(useGame.getState().save.beats['myp.beat.water']).toBe(true);
    expect(useGame.getState().save.words['myp.word.water'].state).toBe('learned');
  });

  it('continues a saved prologue after reload', () => {
    const saved = reduce(reduce(newGameState(), { type: 'new-game' }), { type: 'advance-prologue' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(saved));
    useGame.getState().resetForTests();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    expect(screen.getByTestId('prologue').getAttribute('data-prologue-step')).toBe('1');
  });

  it('shows the Chinese gloss only after the player turns it on', () => {
    let save = reduce(newGameState(), { type: 'new-game' });
    for (let step = 0; step < 4; step += 1) save = reduce(save, { type: 'advance-prologue' });
    save = reduce(save, { type: 'open-mural' });
    const { rerender } = render(<MuralScreen save={save} dispatch={() => undefined} />);
    expect(screen.queryByText('水')).toBeNull();
    rerender(
      <MuralScreen
        save={reduce(save, { type: 'set-show-gloss', value: true })}
        dispatch={() => undefined}
      />,
    );
    expect(screen.getAllByText('水').length).toBeGreaterThan(0);
  });
});
