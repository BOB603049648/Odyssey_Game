import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it } from 'vitest';
import { groundGuidePath, groundRoute } from '../core/navigation';
import { GroundGuide, NavigationNotice } from './Wayfinding';

afterEach(cleanup);

it('retains every collision-route corner after the full ground guide is closed', () => {
  const scene = 'dba.scene.shore';
  const from = { x: .2, y: .72 };
  const route = [from, ...groundRoute(scene, from, { x: .5, y: .72 })];
  expect(route.length).toBeGreaterThan(2); // The driftwood blocks a direct line.
  const view = render(<GroundGuide scene={scene} visible={false} route={route} />);
  expect(view.queryByTestId('ground-guide-area')).toBeNull();
  const drawn = view.getByTestId('ground-guide-route');
  const coordinates = drawn.getAttribute('d')!.match(/-?\d+(?:\.\d+)?/g)!.map(Number);
  expect(coordinates).toEqual(route.flatMap(point => [
    Math.round(point.x * 128000) / 100, Math.round(point.y * 72000) / 100,
  ]));
  expect(drawn.getAttribute('d')).not.toMatch(/[CQST]/);
  expect(drawn.parentElement?.getAttribute('clip-path')).toMatch(/^url\(#ground-guide-clip-/);
  expect(view.getByTestId('ground-guide').getAttribute('aria-hidden')).toBe('true');
  view.rerender(<GroundGuide scene={scene} visible={false} route={[]} />);
  expect(view.queryByTestId('ground-guide')).toBeNull();
});

it('uses the same collision outline including holes, and replaces it on scene change', () => {
  const view = render(<GroundGuide scene="dba.scene.shore" visible route={[]} />);
  expect(view.getByTestId('ground-guide-area').getAttribute('d')).toBe(groundGuidePath('dba.scene.shore'));
  expect(view.getByTestId('ground-guide-area').getAttribute('fill-rule')).toBe('evenodd');
  view.rerender(<GroundGuide scene="dba.scene.path" visible route={[]} />);
  expect(view.getByTestId('ground-guide-area').getAttribute('d')).toBe(groundGuidePath('dba.scene.path'));
  expect(view.queryByTestId('ground-guide-route')).toBeNull();
  expect(view.queryByRole('button')).toBeNull();
});

it('marks a refused point independently without advertising it as a walkable destination', () => {
  const view = render(<GroundGuide scene="dba.scene.shore" visible={false} route={[]}
    blocked={{ x: .5, y: .3 }} />);
  expect(view.getByTestId('ground-guide-blocked').getAttribute('transform')).toBe('translate(640 216)');
  expect(view.queryByTestId('ground-guide-area')).toBeNull();
  expect(view.queryByTestId('ground-guide-destination')).toBeNull();
  view.rerender(<GroundGuide scene="dba.scene.shore" visible={false} route={[]} blocked={null} />);
  expect(view.queryByTestId('ground-guide')).toBeNull();
});

it('announces the current refusal or exit in one stable live region without stealing focus', () => {
  const view = render(<><button type="button">路线</button><NavigationNotice message={null} kind="exit" /></>);
  const region = view.getByRole('status');
  view.getByRole('button').focus();
  expect(region.textContent).toBe('');
  view.rerender(<><button type="button">路线</button><NavigationNotice message="前方通往棚火 · 走过路口进入" kind="exit" /></>);
  expect(view.getByRole('status')).toBe(region);
  expect(region.dataset.visible).toBe('yes');
  expect(region.textContent).toBe('前方通往棚火 · 走过路口进入');
  expect(region.getAttribute('aria-live')).toBe('polite');
  expect(document.activeElement).toBe(view.getByRole('button'));
  view.rerender(<><button type="button">路线</button><NavigationNotice message="前面是水，沿岸边走吧。" kind="blocked" /></>);
  expect(region.dataset.kind).toBe('blocked');
  expect(region.textContent).toBe('前面是水，沿岸边走吧。');
  view.rerender(<><button type="button">路线</button><NavigationNotice message={null} kind="blocked" /></>);
  expect(region.textContent).toBe('');
  expect(region.dataset.visible).toBe('no');
});
