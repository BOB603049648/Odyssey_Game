import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { facingFromMove, TravelerMark } from './Traveler';

describe('traveler art', () => {
  it('uses the front sprite by default and the front silhouette only then', () => {
    const view = render(<TravelerMark x={0.4} y={0.6} facing="front" moving={false} />);
    const mark = view.container.querySelector('[data-testid="traveler"]');
    const srcs = () =>
      [...view.container.querySelectorAll<HTMLImageElement>('.traveler img')].map((img) => img.getAttribute('src') ?? '');
    expect(mark?.getAttribute('data-figure')).toBe('traveler');
    expect(mark?.getAttribute('data-facing')).toBe('front');
    expect(srcs()).toEqual([expect.stringMatching(/05-silhouette/), expect.stringMatching(/04-front/)]);
  });

  it('uses the side profile for both directions and the back sprite when walking away', () => {
    const view = render(<TravelerMark x={0.4} y={0.6} facing="left" moving />);
    const read = () =>
      [...view.container.querySelectorAll<HTMLImageElement>('.traveler img')].map((img) => img.getAttribute('src') ?? '');
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-facing')).toBe('left');
    expect(read()).toEqual([expect.stringMatching(/02-side/)]);

    view.rerender(<TravelerMark x={0.4} y={0.6} facing="right" moving />);
    expect(read()).toEqual([expect.stringMatching(/02-side/)]);

    view.rerender(<TravelerMark x={0.4} y={0.6} facing="back" moving={false} />);
    expect(read()).toEqual([expect.stringMatching(/03-back/)]);
  });

  it('picks front, back, or the mirrored side from the move', () => {
    expect(facingFromMove(0, 0, 'front')).toBe('front');
    expect(facingFromMove(0, 1, 'back')).toBe('front');
    expect(facingFromMove(0, -1, 'front')).toBe('back');
    expect(facingFromMove(-1, 0, 'front')).toBe('left');
    expect(facingFromMove(1, 0.2, 'front')).toBe('right');
  });
});
