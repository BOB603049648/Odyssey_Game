import { cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { LEXEMES } from '../content/catalog';
import { CONCEPT_SCENES, ConceptScene } from './ConceptScene';
afterEach(cleanup);

it('covers every teachable concept with a distinct authored scene, not an answer glyph', () => {
  const mapped = LEXEMES.map(word => CONCEPT_SCENES[word.id.split('.').at(-1)!]);
  expect(mapped.every(Boolean)).toBe(true);
  expect(new Set(mapped.map(([src, index]) => `${src}:${index}`)).size).toBe(LEXEMES.length);
  const view = render(<ConceptScene id="dba.word.water" />);
  expect(view.container.querySelector('svg')).toBeNull();
  expect(view.container.querySelector('img')).toBeTruthy();
});

it('keeps the narrative clue usable if its painting fails to load', () => {
  const view = render(<ConceptScene id="dba.word.water" />);
  fireEvent.error(view.container.querySelector('img')!);
  expect(view.getByText(/清泉从石缝/)).toBeTruthy();
  expect(view.getByText(/画面暂未载入/)).toBeTruthy();
});
