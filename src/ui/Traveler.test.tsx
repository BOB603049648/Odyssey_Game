import { fireEvent, render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { companionPost } from '../core/companionPost';
import { SPAWNS } from '../core/stage';
import { WALK_SPEED } from '../core/walk';
import {
  FRAME_BLEND_MS,
  TRAVELER_FRAME_COUNTS,
  TRAVELER_HEIGHT,
  TURN_BLEND_MS,
  WALK_CYCLE_HZ,
  WALK_STRIDE,
  blendDuration,
  clipFrames,
  facingFromMove,
  frameIndex,
  nextLocomotion,
  poseForSheet,
  sheetOf,
  stepCycle,
  stepCycleByDistance,
  stepGait,
  TravelerMark,
  type TravelerFacing,
} from './Traveler';
import { WalkLayer } from './WalkLayer';
import type { SpotView } from './spotViews';

describe('traveler art', () => {
  it('uses the front idle frame and the same contact shadow on every facing', () => {
    const view = render(<TravelerMark x={0.4} y={0.6} facing="front" moving={false} />);
    const mark = view.container.querySelector('[data-testid="traveler"]') as HTMLElement;
    const current = () => view.container.querySelector('[data-layer="current"]')?.getAttribute('src') ?? '';
    expect(mark?.getAttribute('data-figure')).toBe('traveler');
    expect(mark?.getAttribute('data-facing')).toBe('front');
    expect(current()).toMatch(/idle-front-01/);
    expect(view.container.querySelector('.traveler-shade')).toBeNull();
    expect(view.container.querySelector('[data-testid="contact-shadow"]')).toBeTruthy();
    for (const facing of ['back', 'left', 'right'] as const) {
      view.rerender(<TravelerMark x={0.4} y={0.6} facing={facing} moving={false} />);
      expect(view.container.querySelector('.traveler-shade')).toBeNull();
      expect(view.container.querySelector('[data-testid="contact-shadow"]')).toBeTruthy();
    }
  });

  it('sizes the figure as a fraction of the world and mirrors only the right-facing sheet', () => {
    const view = render(<TravelerMark x={0.4} y={0.6} facing="left" moving={false} />);
    const mark = view.container.querySelector('[data-testid="traveler"]') as HTMLElement;
    expect(TRAVELER_HEIGHT).toBeGreaterThan(0.12);
    expect(TRAVELER_HEIGHT).toBeLessThan(0.22);
    expect(mark.style.height).toBe(`${TRAVELER_HEIGHT * 100}%`);
    expect(mark.style.aspectRatio.replace(/\s/g, '')).toBe('3/4');
    expect(view.container.querySelector('[data-mirror="yes"]')).toBeNull();
    const shadow = view.container.querySelector('[data-testid="contact-shadow"]') as HTMLElement;
    expect(shadow.style.width.endsWith('%')).toBe(true);
    const narrow = shadow.style.width;
    view.rerender(<TravelerMark x={0.4} y={0.9} facing="right" moving />);
    const wider = view.container.querySelector('[data-testid="contact-shadow"]') as HTMLElement;
    expect(view.container.querySelector('[data-mirror="yes"]')).toBeTruthy();
    expect(parseFloat(wider.style.width)).toBeGreaterThan(parseFloat(narrow));
  });

  it('uses the side walk sheet for both directions and a real back idle', () => {
    const view = render(<TravelerMark x={0.4} y={0.6} facing="left" moving />);
    const current = () => view.container.querySelector('[data-layer="current"]')?.getAttribute('src') ?? '';
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-facing')).toBe('left');
    expect(current()).toMatch(/walk-side-01/);

    view.rerender(<TravelerMark x={0.4} y={0.6} facing="right" moving />);
    expect(current()).toMatch(/walk-side-01/);

    view.rerender(<TravelerMark x={0.4} y={0.6} facing="back" moving={false} />);
    expect(current()).toMatch(/idle-back-01/);
    expect(current()).not.toMatch(/walk-back/);
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
    expect(stepGait(1, 0, 0.2)).toBeGreaterThan(0.7);
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
    const idleBack = clipFrames('idle', 'back');
    expect(idleBack).toHaveLength(2);
    expect(new Set(idleBack).size).toBe(2);
    expect(idleBack.map((src) => src.match(/idle-back-0[12]/)?.[0])).toEqual(['idle-back-01', 'idle-back-02']);
    expect(idleBack.join(' ')).not.toMatch(/walk-back/);
    expect(clipFrames('interact', 'back')).toEqual([idleBack[0]]);
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
    expect(view.container.querySelector('[data-layer="current"]')?.getAttribute('src')).toMatch(/idle-back-01/);
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
        catPost={companionPost('dba.scene.shore', {}, {})}
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

  it('keeps the same contact shadow while facing changes and blends the turn', () => {
    const view = render(<TravelerMark x={0.4} y={0.6} facing="front" moving={false} />);
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-crossfade')).toBe('no');
    view.rerender(<TravelerMark x={0.4} y={0.6} facing="left" moving />);
    expect(view.container.querySelector('[data-testid="traveler"]')?.getAttribute('data-crossfade')).toBe('yes');
    expect(view.container.querySelector('[data-layer="out"]')).toBeTruthy();
    expect(view.container.querySelector('[data-layer="current"]')?.getAttribute('src')).toMatch(/walk-side-01/);
    expect(view.container.querySelector('.traveler-shade')).toBeNull();
  });

  it('advances the walk cycle from distance and blends frames inside a clip', () => {
    expect(WALK_CYCLE_HZ).toBeLessThan(1.8);
    expect(WALK_SPEED / WALK_STRIDE).toBeCloseTo(WALK_CYCLE_HZ, 5);
    expect(stepCycleByDistance(0.25, 0)).toBeCloseTo(0.25);
    const half = stepCycleByDistance(0, WALK_STRIDE / 2);
    expect(half).toBeCloseTo(0.5);
    expect(stepCycleByDistance(half, WALK_STRIDE / 2)).toBeCloseTo(0);
    const posed = { sheet: 'front' as const, pose: 'walk' as const, frame: 0, facing: 'front' as TravelerFacing };
    expect(blendDuration(posed, posed)).toBe(0);
    expect(blendDuration(posed, { ...posed, frame: 1 })).toBe(FRAME_BLEND_MS);
    expect(blendDuration(posed, { ...posed, sheet: 'side', facing: 'right' })).toBe(TURN_BLEND_MS);
    expect(TURN_BLEND_MS).toBeGreaterThan(FRAME_BLEND_MS);
  });
});
