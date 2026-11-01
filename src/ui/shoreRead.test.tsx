import { readFileSync } from 'node:fs';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { sceneAssembly } from '../content/catalog';
import { companionPost } from '../core/companionPost';
import { newGameState } from '../core/save';
import { BANDS, SPAWNS, SPOTS } from '../core/stage';
import { GLANCE_REACH, KEY_STEP, WORLD_SCALE, distance, reachOf } from '../core/walk';
import { PlateStack } from './Plate';
import { visibleSpots } from './spotViews';
import { WalkLayer } from './WalkLayer';

/**
 * 雾岸可读性：可走带、两步外能认出的热区、路口暖点。
 * 不改 sole / WORLD_SCALE / shoreBand / #60 岸槽。
 */

afterEach(() => {
  cleanup();
});

const css = readFileSync('src/styles.css', 'utf8');

function rule(selector: string): string {
  let from = 0;
  while (from < css.length) {
    const start = css.indexOf(selector, from);
    if (start < 0) break;
    const followed = css.slice(start + selector.length).match(/^\s*\{/);
    if (followed) {
      const open = start + selector.length + followed[0].length - 1;
      const close = css.indexOf('}', open);
      return css.slice(start, close + 1);
    }
    from = start + selector.length;
  }
  throw new Error(`missing rule ${selector}`);
}

describe('shore readability', () => {
  it('names a touchable prop from about two steps outside its click radius', () => {
    expect(GLANCE_REACH).toBeCloseTo(KEY_STEP * 2);
    expect(reachOf(0.05, 0.05)).toBe('near');
    expect(reachOf(0.14, 0.05)).toBe('glance');
    expect(reachOf(0.05 + GLANCE_REACH, 0.05)).toBe('glance');
    expect(reachOf(0.05 + GLANCE_REACH + 0.01, 0.05)).toBe('far');

    const spawn = SPAWNS['dba.scene.shore'];
    const wood = SPOTS['dba.scene.shore'].find((spot) => spot.id === 'shore-driftwood')!;
    const east = SPOTS['dba.scene.shore'].find((spot) => spot.id === 'shore-depart')!;
    expect(reachOf(distance(spawn, wood), wood.r)).toBe('glance');
    expect(reachOf(distance(spawn, east), east.r)).toBe('far');
    expect(wood.r).toBe(0.05);
    expect(east.r).toBe(0.05);
  });

  it('lays a diegetic wet-sand tread between a north fog line and a south stone lip', () => {
    const { container } = render(<PlateStack plate="dba.scene.shore" previous={null} />);
    const tread = screen.getByTestId('shore-tread');
    const band = BANDS['dba.scene.shore'];
    expect(tread.className).toBe('shore-tread');
    expect(tread.style.top).toBe(`${band.minY * 100}%`);
    expect(tread.style.height).toBe(`${(band.maxY - band.minY) * 100}%`);
    expect(screen.getByTestId('shore-fog-line')).toBeTruthy();
    expect(screen.getByTestId('shore-sand-trace')).toBeTruthy();
    expect(screen.getByTestId('shore-stone-lip')).toBeTruthy();
    expect(container.querySelector('.walkable-mask')).toBeNull();
    expect(container.textContent).not.toContain('?');
    expect(container.querySelectorAll('.shore-tread')).toHaveLength(1);

    const fog = rule('.shore-fog-line');
    const sand = rule('.shore-sand-trace');
    const lip = rule('.shore-stone-lip');
    expect(fog).toMatch(/rgba\(8,\s*16,\s*20/);
    expect(sand).toMatch(/rgba\(236,\s*226,\s*200/);
    expect(lip).toMatch(/rgba\(8,\s*7,\s*6/);
    expect(`${fog}${sand}${lip}`).not.toMatch(/outline|dashed|#0ff|#00ffff|#ff00ff|content:\s*["']\?/);
    expect(sand).not.toMatch(/repeating-linear-gradient\(90deg/);

    const camp = render(<PlateStack plate="dba.scene.camp" previous={null} />);
    expect(camp.container.querySelector('[data-testid="shore-tread"]')).toBeNull();
  });

  it('marks shore props as touchable from a glance and strokes them only when near', () => {
    const { container } = render(
      <PlateStack
        plate="dba.scene.shore"
        previous={null}
        near={['shore-driftwood']}
        glance={['island-gourd', 'island-mural']}
      />,
    );
    expect(screen.getByTestId('prop-art.shore.prop.driftwood').getAttribute('data-cue')).toBe('near');
    expect(screen.getByTestId('prop-art.shore.prop.gourd').getAttribute('data-cue')).toBe('glance');
    expect(screen.getByTestId('prop-art.shore.prop.mural-wall').getAttribute('data-cue')).toBe('glance');
    expect(screen.getByTestId('prop-art.shore.prop.break-shard').getAttribute('data-cue')).toBe('far');
    expect(screen.getByTestId('prop-art.shore.prop.east-gap').getAttribute('data-cue')).toBe('far');
    for (const id of [
      'prop-art.shore.prop.driftwood',
      'prop-art.shore.prop.gourd',
      'prop-art.shore.prop.mural-wall',
      'prop-art.shore.prop.break-shard',
      'prop-art.shore.prop.east-gap',
    ]) {
      expect(screen.getByTestId(id).querySelector('.prop-cue')).toBeTruthy();
      expect(screen.getByTestId(id).textContent).not.toContain('?');
    }
    expect(container.textContent).not.toContain('?');

    const far = rule('.walk-viewport[data-scene="dba.scene.shore"] .scene-slot[data-cue="far"] .prop-cue');
    const glance = rule('.walk-viewport[data-scene="dba.scene.shore"] .scene-slot[data-cue="glance"] .prop-cue');
    const near = rule('.walk-viewport[data-scene="dba.scene.shore"] .world-layer .hotspot.near');
    expect(far).toMatch(/opacity:\s*0\.[6-9]/);
    expect(glance).toMatch(/opacity:\s*1/);
    expect(glance).toMatch(/box-shadow/);
    expect(near).toMatch(/border-color:\s*rgba\(214,\s*196,\s*154/);
    expect(near).toMatch(/color:\s*transparent/);
    expect(near).not.toMatch(/content:\s*["']\?/);
  });

  it('keeps path exits readable from far, and the near label bright', () => {
    const dot = rule('.path-exit i');
    const hearth = rule('.path-exit[data-hearth="yes"] i');
    const pool = rule('.path-exit[data-hearth="yes"]::before');
    const label = rule('.path-exit.near span');
    expect(dot).toMatch(/opacity:\s*0\.[6-9]/);
    expect(dot).not.toMatch(/opacity:\s*0\.16/);
    expect(hearth).toMatch(/opacity:\s*1/);
    expect(hearth).toMatch(/28px/);
    expect(pool).toMatch(/rgba\(255,\s*176,\s*72/);
    expect(pool).toMatch(/pointer-events:\s*none/);
    expect(label).toMatch(/opacity:\s*1/);
  });

  it('speaks the first driftwood approach once, louder than the ambient line', () => {
    const hint = rule('.approach-hint.once');
    expect(hint).toMatch(/font-size:\s*1\.2rem/);
    expect(hint).toMatch(/approach-once 1\.5s ease 1 both/);
    expect(hint).not.toMatch(/infinite/);
    expect(css).toMatch(/@keyframes approach-once \{/);
    expect(css).toMatch(/prefers-reduced-motion:\s*reduce\)[\s\S]*\.approach-hint/);
    const save = newGameState();
    const spots = visibleSpots('dba.scene.shore', save, { level: 0, anchor: 'driftwood', wordId: null });
    const here = spots.map((spot) => (spot.id === 'shore-driftwood' ? { ...spot, x: SPAWNS['dba.scene.shore'].x, y: SPAWNS['dba.scene.shore'].y, r: 0.2 } : spot));
    render(
      <WalkLayer
        scene="dba.scene.shore"
        drank={false}
        spots={here}
        hint={{ level: 0, anchor: 'driftwood', wordId: null, pose: 'idle' }}
        paused={false}
        purr={false}
        knot="rest"
        remembered={null}
        onRemember={() => undefined}
        onExit={() => undefined}
        onInteract={() => undefined}
        onAsk={() => undefined}
        onEscape={() => undefined}
        taught={false}
        catPost={companionPost('dba.scene.shore', {}, {})}
      />,
    );
    const line = screen.getByTestId('approach-hint');
    expect(line.textContent).toBe('近一点。手才能够到。');
    expect(line.className).toContain('once');
  });

  it('from the shore spawn, glance props and the far east stone use the existing hotspot marks', () => {
    const save = newGameState();
    const spots = visibleSpots('dba.scene.shore', save, { level: 0, anchor: 'driftwood', wordId: null });
    render(
      <WalkLayer
        scene="dba.scene.shore"
        drank={false}
        spots={spots}
        hint={{ level: 0, anchor: 'driftwood', wordId: null, pose: 'idle' }}
        paused={false}
        purr={false}
        knot="rest"
        remembered={null}
        onRemember={() => undefined}
        onExit={() => undefined}
        onInteract={() => undefined}
        onAsk={() => undefined}
        onEscape={() => undefined}
        taught
        catPost={companionPost('dba.scene.shore', {}, {})}
      />,
    );
    expect(screen.queryByTestId('approach-hint')).toBeNull();
    expect(screen.getByTestId('shore-driftwood').getAttribute('data-reach')).toBe('glance');
    expect(screen.getByTestId('island-gourd').getAttribute('data-reach')).toBe('glance');
    expect(screen.getByTestId('island-mural').getAttribute('data-reach')).toBe('glance');
    expect(screen.getByTestId('shore-stone').getAttribute('data-reach')).toBe('far');
    expect(screen.getByTestId('shore-depart').getAttribute('data-reach')).toBe('far');
    expect(screen.getByTestId('prop-art.shore.prop.driftwood').getAttribute('data-cue')).toBe('glance');
    expect(screen.getByTestId('prop-art.shore.prop.east-gap').getAttribute('data-cue')).toBe('far');
    expect(screen.getByTestId('exit-camp').getAttribute('data-hearth')).toBe('yes');
    expect(screen.getByTestId('exit-camp').className).not.toContain('near');
    expect(screen.getByTestId('exit-camp').querySelector('span')?.textContent).toBeTruthy();
    expect(screen.queryByText('?')).toBeNull();
  });

  it('does not move sole, scale, shore band, or the #60 shore boxes', () => {
    expect(WORLD_SCALE).toBe(1.46);
    expect(BANDS['dba.scene.shore']).toMatchObject({ minX: 0.05, maxX: 0.96, minY: 0.48, maxY: 0.84 });
    const kit = sceneAssembly('dba.scene.shore');
    const box = (id: string) => kit?.slots.find((slot) => slot.id === id);
    expect(box('art.shore.prop.driftwood')).toMatchObject({ x: 0.33, y: 0.72, w: 0.19, h: 0.14 });
    expect(box('art.shore.prop.gourd')).toMatchObject({ x: 0.58, y: 0.66, w: 0.15, h: 0.15 });
    expect(box('art.shore.prop.mural-wall')).toMatchObject({ x: 0.3, y: 0.56, w: 0.3, h: 0.18 });
    expect(box('art.shore.prop.east-gap')).toMatchObject({ x: 0.74, y: 0.68, w: 0.26, h: 0.23 });
    expect(box('art.shore.prop.break-shard')).toMatchObject({ x: 0.18, y: 0.7, w: 0.18, h: 0.14 });
    expect(css).toMatch(/\.sole-soft\s*\{[^}]*transparent 99%[^}]*#000 99\.7%/);
    expect(css).not.toContain('.fog-fringe');
    expect(css).not.toContain('.sole-stamp');
  });
});
