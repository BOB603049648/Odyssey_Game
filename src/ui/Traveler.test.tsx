import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { TravelerMark } from './Traveler';

describe('traveler art', () => {
  it('stands on the official front sprite with the silhouette underfoot', () => {
    render(<TravelerMark x={0.4} y={0.6} facing="left" moving={false} />);
    const mark = document.querySelector('[data-testid="traveler"]');
    const images = [...document.querySelectorAll<HTMLImageElement>('.traveler img')];
    expect(mark?.getAttribute('data-figure')).toBe('traveler');
    expect(mark?.getAttribute('data-facing')).toBe('left');
    expect(images.map((img) => img.getAttribute('src'))).toEqual([
      expect.stringMatching(/05-silhouette/),
      expect.stringMatching(/04-front/),
    ]);
  });
});
