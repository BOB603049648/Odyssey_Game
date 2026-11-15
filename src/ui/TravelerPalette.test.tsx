import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { travelerFrameUrl } from '../content/assetUrls';
import { FramePictureView, TravelerMark, type FramePresentation } from './Traveler';

afterEach(cleanup);
const picture = (file: string, pose: FramePresentation['blend']['pose'] = 'walk'): FramePresentation => ({
  shown: travelerFrameUrl(file)!, blend: { sheet: 'front', pose, frame: 0, facing: 'front' }, support: null, onError() {},
});

it('uses the bitmap actually displayed, not a pending motion request, to choose its palette', () => {
  const view = render(<FramePictureView picture={picture('idle-front-01.png')} layer="current" paletteId="test" />);
  const wrap = () => view.container.querySelector<HTMLElement>('.traveler-frame-wrap')!;
  expect(wrap().dataset.palette).toBe('reference');
  expect(wrap().style.filter).toBe('');
  view.rerender(<FramePictureView picture={picture('stride-front-01.png')} layer="current" paletteId="test" />);
  expect(wrap().dataset.palette).toBe('costume-match');
  expect(wrap().style.filter).toContain('#test');
  const node = wrap().querySelector('img');
  view.rerender(<FramePictureView picture={picture('stride-front-02.png')} layer="current" paletteId="test" />);
  expect(wrap().querySelector('img')).toBe(node);
});

it.each(['action-drink-01.png', 'settle-down-01.png'])('also matches %s on its outgoing layer without tinting the incoming idle', file => {
  const view = render(<>
    <FramePictureView picture={picture(file, 'drink')} layer="out" paletteId="test" />
    <FramePictureView picture={picture('idle-front-01.png', 'idle')} layer="current" paletteId="test" />
  </>);
  expect(view.container.querySelector<HTMLElement>('.out')!.style.filter).toContain('#test');
  expect(view.container.querySelector<HTMLElement>('[data-layer="current"]')!.parentElement!.style.filter).toBe('');
});

it('keeps a unique stable filter per traveler instead of rebuilding it on every frame', () => {
  const actors = (moving: boolean) => <>
    <TravelerMark x={.4} y={.7} facing="front" moving={moving} />
    <TravelerMark x={.5} y={.7} facing="left" moving={false} />
  </>;
  const view = render(actors(false));
  const filters = [...view.container.querySelectorAll('filter')];
  expect(filters).toHaveLength(2);
  expect(new Set(filters.map(node => node.id)).size).toBe(2);
  view.rerender(actors(true));
  expect([...view.container.querySelectorAll('filter')]).toEqual(filters);
});
