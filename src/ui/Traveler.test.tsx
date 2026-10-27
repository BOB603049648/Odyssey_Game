import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { SPAWNS } from '../core/stage';
import {
  TRAVELER_FRAME_COUNTS,
  clipFrames,
  facingFromMove,
  frameIndex,
  nextLocomotion,
  poseForSheet,
  sheetOf,
  stepCycle,
  stepGait,
  TravelerMark,
} from './Traveler';
import { WalkLayer } from './WalkLayer';
import type { SpotView } from './spotViews';

describe('traveler art', () => {
  it('uses the front sprite by default and the front silhouette only then', () => {
    const view = render(<TravelerMark x={0.4} y={0.6} facing="front" moving={false} />);
    const mark = view.container.querySelector('[data-testid="traveler"]');
    const srcs = () =>
      [...view.container.querySelectorAll<HTMLImageElement>('.traveler img')].map((img) => img.getAttribute('src') ?? '');
    expect(mark?.getAttribute('data-figure')).toBe('traveler');
    expect(mark?.getAttribute('data-facing')).toBe('front');
    expect(srcs()).toEqual([expect.stringMatching(/05-silhouette/), expect.stringMatching(/idle-front-01/)]);
  });

  it('uses the side walk sheet for both directions and holds walk-back-01 while idle facing away', () => {
    const view = render(<TravelerMark x={0.4} y={0.6} facing="left" moving />);
    const read = () =>
      [...view.container.querySelectorAll<HTMLImageElement>('.traveler img')].map((img) => img.getAttribute('src') ?? '');
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-facing')).toBe('left');
    expect(read()).toEqual([expect.stringMatching(/walk-side-01/)]);

    view.rerender(<TravelerMark x={0.4} y={0.6} facing="right" moving />);
    expect(read()).toEqual([expect.stringMatching(/walk-side-01/)]);

    view.rerender(<TravelerMark x={0.4} y={0.6} facing="back" moving={false} />);
    expect(read()).toEqual([expect.stringMatching(/walk-back-01/)]);
  });

  it('picks front, back, or the mirrored side from the move', () => {
    expect(facingFromMove(0, 0, 'front')).toBe('front');
    expect(facingFromMove(0, 1, 'back')).toBe('front');
    expect(facingFromMove(0, -1, 'front')).toBe('back');
    expect(facingFromMove(-1, 0, 'front')).toBe('left');
    expect(facingFromMove(1, 0.2, 'front')).toBe('right');
  });

  it('eases gait with speed and keeps the walk phase when slowing', () => {
    const rising = stepGait(0, 1, 0.05);
    expect(rising).toBeGreaterThan(0);
    expect(rising).toBeLessThan(0.3);
    let gait = 0;
    for (let i = 0; i < 80; i += 1) gait = stepGait(gait, 1, 0.05);
    expect(gait).toBe(1);
    const falling = stepGait(1, 0, 0.05);
    expect(falling).toBeGreaterThan(0.7);
    expect(falling).toBeLessThan(1);
    expect(stepCycle(0.4, 0, 1)).toBeCloseTo(0.4);
    expect(stepCycle(0, 1, 0.2)).toBeGreaterThan(stepCycle(0, 0.25, 0.2));
    expect(nextLocomotion('idle', 0.1)).toBe('idle');
    expect(nextLocomotion('idle', 0.2)).toBe('walk');
    expect(nextLocomotion('walk', 0.1)).toBe('walk');
    expect(nextLocomotion('walk', 0.07)).toBe('idle');
    expect(frameIndex(0.0, 4)).toBe(0);
    expect(frameIndex(0.99, 4)).toBe(3);
    expect(sheetOf('left')).toBe('side');
    expect(sheetOf('right')).toBe('side');
    const walkFront = clipFrames('walk', 'front');
    expect(walkFront).toHaveLength(TRAVELER_FRAME_COUNTS.walk);
    expect(new Set(walkFront).size).toBe(4);
    expect(walkFront.map((src) => src.match(/walk-front-0[1-4]/)?.[0])).toEqual([
      'walk-front-01',
      'walk-front-02',
      'walk-front-03',
      'walk-front-04',
    ]);
    const idleSide = clipFrames('idle', 'side');
    expect(idleSide).toHaveLength(TRAVELER_FRAME_COUNTS.idle);
    expect(new Set(idleSide).size).toBe(2);
    const walkBack = clipFrames('walk', 'back');
    expect(walkBack[0]).toMatch(/walk-back-01/);
    expect(clipFrames('idle', 'back')).toEqual([walkBack[0], walkBack[0]]);
    expect(clipFrames('interact', 'back')).toEqual([walkBack[0]]);
    const reachFront = clipFrames('reach', 'front');
    expect(reachFront.map((src) => src.match(/reach-front-0[12]/)?.[0])).toEqual(['reach-front-01', 'reach-front-02']);
    expect(new Set(reachFront).size).toBe(2);
    expect(clipFrames('reach', 'side').map((src) => src.match(/reach-side-01/)?.[0])).toEqual(['reach-side-01']);
    expect(poseForSheet('reach', 'back')).toBe('idle');
    expect(clipFrames('reach', 'back')).toEqual(clipFrames('idle', 'back'));
  });

  it('reserves interact and plays reach, falling back to idle when that sheet is missing', () => {
    const view = render(<TravelerMark x={0.4} y={0.6} facing="front" moving={false} pose="interact" />);
    const mark = view.container.querySelector('[data-testid="traveler"]');
    expect(mark?.getAttribute('data-pose')).toBe('interact');
    expect(mark?.getAttribute('data-clip-frames')).toBe('1');
    expect(view.container.querySelector('[data-layer="current"]')?.getAttribute('src')).toMatch(/idle-front-01/);
    view.rerender(<TravelerMark x={0.4} y={0.6} facing="front" moving={false} pose="reach" />);
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-pose')).toBe('reach');
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-clip-frames')).toBe('2');
    expect(view.container.querySelector('[data-layer="current"]')?.getAttribute('src')).toMatch(/reach-front-01/);
    view.rerender(<TravelerMark x={0.4} y={0.6} facing="left" moving stride={0.4} pose="reach" />);
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-pose')).toBe('reach');
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-gait')).toBe('0.40');
    expect(view.container.querySelector('[data-layer="current"]')?.getAttribute('src')).toMatch(/reach-side-01/);
    view.rerender(<TravelerMark x={0.4} y={0.6} facing="back" moving={false} pose="reach" />);
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-pose')).toBe('idle');
    expect(view.container.querySelector('[data-layer="current"]')?.getAttribute('src')).toMatch(/walk-back-01/);
  });

  it('plays reach only when an interaction happens inside a hotspot', () => {
    const spawn = SPAWNS['dba.scene.shore'];
    const here: SpotView = {
      id: 'shore-driftwood',
      x: spawn.x,
      y: spawn.y,
      r: 0.05,
      className: 'hotspot drift',
      testId: 'shore-driftwood',
      label: '漂木',
    };
    const away: SpotView = { ...here, x: 0.9, y: 0.8, testId: 'shore-depart', id: 'shore-depart', label: '往东' };
    const layer = (spots: SpotView[], remembered: { x: number; y: number } | null) => (
      <WalkLayer
        scene="dba.scene.shore"
        drank={false}
        spots={spots}
        hint={{ level: 0, anchor: 'driftwood', wordId: null, pose: 'idle' }}
        paused={false}
        purr={false}
        knot="rest"
        remembered={remembered}
        onRemember={() => undefined}
        onExit={() => undefined}
        onInteract={() => undefined}
        onAsk={() => undefined}
        onEscape={() => undefined}
      />
    );
    const near = render(layer([here], null));
    const pose = () => near.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-pose');
    expect(pose()).toBe('idle');
    fireEvent.keyDown(window, { key: 'e' });
    expect(pose()).toBe('reach');
    expect(near.container.querySelector('[data-layer="current"]')?.getAttribute('src')).toMatch(/reach-front-01/);
    near.unmount();
    const far = render(layer([away], spawn));
    fireEvent.click(far.getByTestId('shore-depart'));
    expect(far.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-pose')).toBe('idle');
    far.unmount();
  });

  it('shows idle at rest and the walk clip once stride is up', () => {
    const view = render(<TravelerMark x={0.4} y={0.6} facing="front" moving={false} />);
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-pose')).toBe('idle');
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-clip-frames')).toBe('2');
    view.rerender(<TravelerMark x={0.4} y={0.6} facing="back" moving stride={1} />);
    const mark = view.container.querySelector('[data-testid="traveler"]');
    expect(mark?.getAttribute('data-pose')).toBe('walk');
    expect(mark?.getAttribute('data-clip-frames')).toBe('4');
    expect(mark?.getAttribute('data-gait')).toBe('1.00');
  });
});
