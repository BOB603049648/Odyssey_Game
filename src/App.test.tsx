import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { App } from './App';
import { canDepart } from './core/island';
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

  it('opens the camp, the case slots, and the review band', () => {
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '新游戏' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    fireEvent.click(screen.getByRole('button', { name: '走上潮线' }));

    fireEvent.click(screen.getByRole('button', { name: '案卷' }));
    expect(screen.getByText('签署手势')).toBeTruthy();
    expect(screen.getByTestId('case-myp.ev.b').getAttribute('data-held')).toBe('no');
    expect(screen.getByTestId('case-myp.ev.main').getAttribute('data-held')).toBe('no');
    expect(screen.queryByText('奈奈茶')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: '合上' }));

    fireEvent.click(screen.getByRole('button', { name: '棚火' }));
    expect(screen.getByTestId('camp-sleep')).toBeTruthy();
    expect(screen.queryByTestId('island-gourd')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '潮线' }));
    fireEvent.click(screen.getByTestId('island-mural'));
    expect(screen.getByTestId('mural-review').hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByTestId('cell-myp.word.water'));
    fireEvent.click(screen.getByTestId('object-myp.word.water'));
    expect(screen.getByTestId('mural-review').hasAttribute('disabled')).toBe(false);
    fireEvent.click(screen.getByTestId('mural-review'));
    expect(screen.getByTestId('review-myp.word.water')).toBeTruthy();
    expect(screen.queryByText('水')).toBeNull();
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

  it('plays the silent memory after leaving and replays it from the map, night, and case', () => {
    let save = reduce(newGameState(), { type: 'new-game' });
    for (let step = 0; step < 4; step += 1) save = reduce(save, { type: 'advance-prologue' });
    for (let step = 0; step < 40 && !canDepart(save); step += 1) save = reduce(save, { type: 'debug-learn-next' });
    save = reduce(save, { type: 'use-word', wordId: 'myp.word.water' });
    save = reduce(save, { type: 'depart' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    useGame.getState().resetForTests();

    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    expect(screen.getByTestId('depart-plate').getAttribute('data-chart')).toBe('chart.nmn');
    expect(screen.getByTestId('companion').getAttribute('data-pose')).toBe('fetch');
    expect(screen.queryByText('奈奈茶')).toBeNull();

    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    expect(screen.getByTestId('memory-plate').getAttribute('data-frame')).toBe('rain');
    expect(screen.getByTestId('memory-art').textContent).toBe('');
    expect(screen.getByTestId('memory-plate').querySelector('.nanaicha-look')?.getAttribute('data-figure')).toBe('adult');
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    expect(screen.getByTestId('memory-plate').getAttribute('data-frame')).toBe('kitten');
    expect(screen.getByTestId('memory-plate').querySelector('.nanaicha-look')?.getAttribute('data-figure')).toBe('kitten');
    fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
    expect(screen.getByTestId('memory-plate').getAttribute('data-frame')).toBe('cloak');
    fireEvent.click(screen.getByRole('button', { name: '合上' }));
    expect(screen.queryByTestId('memory-plate')).toBeNull();

    const closeMemory = () => {
      fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
      fireEvent.click(screen.getByRole('button', { name: '下一幕' }));
      fireEvent.click(screen.getByRole('button', { name: '合上' }));
    };

    fireEvent.click(screen.getByRole('button', { name: '海图' }));
    expect(screen.getByTestId('memory-plate').getAttribute('data-frame')).toBe('rain');
    closeMemory();

    fireEvent.click(screen.getByRole('button', { name: '夜营' }));
    fireEvent.click(screen.getByRole('button', { name: '回忆' }));
    expect(screen.getByTestId('memory-plate')).toBeTruthy();
    closeMemory();

    fireEvent.click(screen.getByRole('button', { name: '案卷' }));
    fireEvent.click(screen.getByTestId('case-memory'));
    expect(screen.getByTestId('memory-plate').getAttribute('data-frame')).toBe('rain');
    expect(screen.queryByText('奈奈茶')).toBeNull();
  });

  it('keeps the collar dark until the rope-knot evidence is in the case', () => {
    let save = reduce(newGameState(), { type: 'new-game' });
    for (let step = 0; step < 4; step += 1) save = reduce(save, { type: 'advance-prologue' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    useGame.getState().resetForTests();
    const first = render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    expect(screen.getByTestId('companion').getAttribute('data-knot')).toBe('rest');
    first.unmount();

    save = reduce(save, { type: 'debug-evidence', id: 'myp.ev.b' });
    localStorage.setItem(SAVE_KEY, JSON.stringify(save));
    useGame.getState().resetForTests();
    render(<App />);
    fireEvent.click(screen.getByRole('button', { name: '继续' }));
    expect(screen.getByTestId('companion').getAttribute('data-knot')).toBe('glow');
    expect(screen.queryByText('奈奈茶')).toBeNull();
  });
});
