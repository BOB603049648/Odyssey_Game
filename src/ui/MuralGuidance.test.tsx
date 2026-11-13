import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { cleanup } from '@testing-library/react';
import { useState } from 'react';
import { reduce } from '../core/reduce';
import { newGameState } from '../core/save';
import { MuralScreen } from './MuralScreen';
afterEach(cleanup);

function PlayWall() {
  const [save, setSave] = useState(() => reduce(newGameState(), { type: 'open-mural' }));
  return <MuralScreen save={save} dispatch={action => setSave(current => reduce(current, action))} />;
}

it('explains selection, shows completion, and lets the player continue to the newly opened band', () => {
  render(<PlayWall />);
  expect(screen.getByTestId('mural-guidance').textContent).toContain('先选上排');
  expect(screen.getByRole('tab', { name: '壁画带 2' }).textContent).toContain('未开放');
  for (const id of ['sun', 'moon', 'water', 'fire', 'fish', 'person']) {
    fireEvent.click(screen.getByTestId(`cell-dba.word.${id}`));
    expect(screen.getByTestId('mural-guidance').textContent).toContain('已选中');
    fireEvent.click(screen.getByTestId(`object-dba.word.${id}`));
  }
  expect(screen.getByRole('tab', { name: '壁画带 1' }).textContent).toContain('6/6');
  expect(screen.getByTestId('mural-guidance').textContent).toContain('这一带已记下');
  fireEvent.click(screen.getByTestId('mural-next-band'));
  expect(screen.getByRole('tab', { name: '壁画带 2' }).getAttribute('aria-selected')).toBe('true');
  expect(screen.getByTestId('object-dba.word.give')).toBeTruthy();
  expect(document.querySelector('.gloss')).toBeNull();
});
