import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { afterEach, expect, it } from 'vitest';
import { reduce } from '../core/reduce';
import { newGameState } from '../core/save';
import { MuralScreen } from './MuralScreen';
import { FieldLexicon } from './FieldLexicon';

afterEach(cleanup);

it('focuses a usable clue without answering it and offers a return before the band is complete', () => {
  function Play() {
    const [save, setSave] = useState(() => {
      const initial = newGameState(); initial.currentScene = 'dba.scene.hall'; initial.flags['dba.puzzle.water'] = 'carried';
      return reduce(initial, { type: 'open-mural' });
    });
    return <><output data-testid="screen">{save.screen}:{save.currentScene}</output><MuralScreen save={save} dispatch={action => setSave(current => reduce(current, action))} /></>;
  }
  const view = render(<Play />);
  fireEvent.click(screen.getByTestId('lesson-focus'));
  expect(screen.getByTestId('cell-dba.word.water').getAttribute('aria-pressed')).toBe('true');
  expect(screen.getByRole('tab', { name: '壁画带 1' }).textContent).toContain('0/6');
  expect(view.container.querySelector('.hint-paw')).toBeNull();
  const wrong = view.container.querySelector<HTMLButtonElement>('.story-tray button:not([data-testid="object-dba.word.water"])')!;
  fireEvent.click(wrong);
  expect(screen.getByTestId('lesson-journey').getAttribute('data-kind')).toBe('learn');
  fireEvent.click(screen.getByTestId('object-dba.word.water'));
  expect(screen.getByTestId('lesson-journey').getAttribute('data-kind')).toBe('explore');
  expect(screen.getByRole('tab', { name: '壁画带 1' }).textContent).toContain('1/6');
  expect(view.container.querySelector('.gloss')).toBeNull();
  fireEvent.click(screen.getByTestId('lesson-return'));
  expect(screen.getByTestId('screen').textContent).toBe('island:dba.scene.hall');
});

it('recalls learned scenes and mastery without showing unknown glyphs or forced translations', () => {
  const save = newGameState();
  save.words['dba.word.sun'].state = 'learned'; save.words['dba.word.water'].state = 'mastered';
  const view = render(<FieldLexicon save={save} />);
  expect(screen.queryByTestId('lexicon-dba.word.fire')).toBeNull();
  expect(screen.getByTestId('lexicon-memory').dataset.word).toBe('dba.word.sun');
  fireEvent.click(screen.getByTestId('lexicon-dba.word.water'));
  expect(screen.getByTestId('lexicon-memory').textContent).toContain('清泉从石缝流下');
  expect(screen.getByTestId('lexicon-memory').textContent).toContain('已熟悉');
  expect(view.container.querySelector('.gloss')).toBeNull();
  fireEvent.error(screen.getByTestId('lexicon-memory').querySelector('img')!);
  expect(screen.getByTestId('lexicon-memory').textContent).toContain('画面暂未载入');
  expect(screen.getByTestId('lexicon-memory').textContent).toContain('清泉从石缝流下');
  view.rerender(<FieldLexicon save={{ ...save, settings: { showGloss: true } }} />);
  expect(screen.getByRole('button', { name: '水' })).toBeTruthy();
  view.rerender(<FieldLexicon save={newGameState()} />);
  expect(screen.queryByTestId('lexicon-memory')).toBeNull();
});
