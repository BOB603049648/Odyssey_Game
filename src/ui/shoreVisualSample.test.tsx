import { readFileSync } from 'node:fs';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { PlateStack } from './Plate';
import { WalkLayer } from './WalkLayer';
import { visibleSpots } from './spotViews';
import { companionPost } from '../core/companionPost';
import { newGameState } from '../core/save';
import { cameraOffset, lookEast, WORLD_SCALE } from '../core/walk';
import { SPAWNS } from '../core/stage';

const css = readFileSync('src/styles.css', 'utf8');
afterEach(() => { cleanup(); vi.unstubAllEnvs(); history.replaceState({}, '', '/'); });
function candidate(value = 'candidate', enabled = '1') { vi.stubEnv('VITE_VISUAL_SAMPLE', enabled); history.replaceState({}, '', `/?shoreVisual=${value}`); }
function building(scene: string, x: number, y: number) {
  const view = render(<PlateStack plate={scene} previous={null} cam={{ x, y }} />);
  const slot = view.container.querySelector<HTMLElement>('[data-slot="building"]')!;
  const result = { transform: slot.style.transform, left: slot.style.left, top: slot.style.top, width: slot.style.width, height: slot.style.height, parallax: slot.dataset.parallax };
  view.unmount(); return result;
}

describe('shore same-plane and separated cue', () => {
  it('keeps shore building planted relative to ground across camera positions', () => {
    candidate();
    for (const [x, y] of [[-120, -50], [0, 0], [120, 50]]) {
      const slot = building('dba.scene.shore', x, y);
      expect(slot.transform).toContain('translate3d(0px, 0px, 0)');
      expect(slot.parallax).toBe('1');
      const reference = lookEast(cameraOffset(SPAWNS['dba.scene.shore'], 1, 1), 1, true);
      expect(Number.parseFloat(slot.left) / 100).toBeCloseTo(.16 + .28 * reference.x / WORLD_SCALE, 12);
      expect(Number.parseFloat(slot.top) / 100).toBeCloseTo(.6 + .28 * reference.y / WORLD_SCALE, 12);
      expect(slot.width).toBe('48%'); expect(slot.height).toBe('36%');
    }
    expect(WORLD_SCALE).toBe(1.46);
  });
  it('does not change ordinary builds or other-scene projections', () => {
    candidate('baseline'); const shore = building('dba.scene.shore', 120, 50); const camp = building('dba.scene.camp', 120, 50);
    candidate(); expect(building('dba.scene.camp', 120, 50)).toEqual(camp);
    candidate('candidate', ''); expect(building('dba.scene.shore', 120, 50)).toEqual(shore);
  });
  it('moves only the candidate shore cue out of the entity body, preserving near/glance state', () => {
    candidate();
    const view = render(<PlateStack plate="dba.scene.shore" previous={null} near={['shore-driftwood']} glance={['island-gourd']} />);
    const prop = screen.getByTestId('prop-art.shore.prop.driftwood');
    expect(screen.getByTestId('cue-art.shore.prop.driftwood').parentElement).toBe(prop);
    expect(prop.dataset.cue).toBe('near');
    expect(screen.getByTestId('prop-art.shore.prop.gourd').dataset.cue).toBe('glance');
    expect(view.container.querySelector('[data-shore-visual="candidate"]')).not.toBeNull();
    const rule = css.match(/\[data-shore-visual="candidate"\]\s+\.scene-slot\.lit\[data-slot="props"\]\s*>\s*\.prop-body\s*\{([^}]+)\}/);
    expect(rule?.[1], 'only shore candidate body must stop moving').toMatch(/animation:\s*none/);
    expect(css).toMatch(/shore-cue-breathe/);
    view.unmount(); candidate('baseline');
    render(<PlateStack plate="dba.scene.shore" previous={null} />);
    expect(screen.getByTestId('cue-art.shore.prop.driftwood').parentElement?.className).toBe('prop-body');
  });
  it('honors reduced motion with selectors as specific as the new cue animation', () => {
    const reduced = css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
    expect(reduced).toContain('[data-shore-visual="candidate"] .scene-slot.lit > .prop-cue');
    expect(reduced).toContain('[data-shore-visual="candidate"] .scene-slot[data-cue="glance"] > .prop-cue');
    expect(reduced).toMatch(/animation:\s*none/);
  });
  it('retains the actual keyboard and click/touch-target interaction route', () => {
    candidate(); const save = newGameState(); const hint = { level: 0 as const, anchor: 'driftwood' as const, wordId: null, pose: 'idle' as const };
    const interact = vi.fn();
    render(<WalkLayer scene="dba.scene.shore" drank={false} spots={visibleSpots('dba.scene.shore', save, hint)} hint={hint}
      paused={false} purr={false} knot="rest" remembered={{ x:.33, y:.72 }} catPost={companionPost('dba.scene.shore', {})} taught={true}
      onRemember={() => {}} onExit={() => {}} onInteract={interact} onAsk={() => {}} onEscape={() => {}} />);
    fireEvent.keyDown(window, { key: 'e', code: 'KeyE' });
    expect(interact).toHaveBeenCalledWith('shore-driftwood'); interact.mockClear();
    fireEvent.click(screen.getByTestId('shore-driftwood'));
    expect(interact).toHaveBeenCalledWith('shore-driftwood');
    expect(css).toMatch(/\.prop-cue\s*\{[^}]*pointer-events:\s*none/s);
  });
});
