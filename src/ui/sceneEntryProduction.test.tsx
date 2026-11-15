import { useState } from 'react';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { IslandScene } from '../core/island';
import { cameraOffset } from '../core/walk';

vi.mock('./useAssetSrc', async () => {
  const urls = await import('../content/assetUrls');
  return { useAssetSrc: (id: string | null) => ({ src: id ? urls.travelerFrameUrl(id) || urls.trajAssetUrl(id) || urls.slotAssetUrl(id) || null : null, onError() {} }) };
});
let ready = true;
vi.mock('./firstScreenReady', () => ({ useFirstScreenReady: () => ({ status: ready ? 'ready' : 'loading', done: 1, total: 1, retry() {} }) }));
vi.mock('./soleClip', () => ({ clippedBootUrl: () => null, catContactUrl: () => null }));
vi.mock('./hemPunch', async () => ({ ...await vi.importActual('./hemPunch'), punchHemUrl: async (src: string) => src }));
vi.mock('./travelerArt', async () => {
  const urls = await import('../content/assetUrls');
  return { frameUrl: (file: string) => urls.travelerFrameUrl(file), loadFrame: async (file: string) => urls.travelerFrameUrl(file), forgetFrame: vi.fn() };
});
class TestPointerEvent extends MouseEvent {
  readonly pointerId: number;
  constructor(type: string, init: PointerEventInit) { super(type, init); this.pointerId = init.pointerId ?? 0; }
}
let clock = 0, seq = 0, raf = new Map<number, FrameRequestCallback>();
let WalkLayer: typeof import('./WalkLayer')['WalkLayer'];
let companionPost: typeof import('../core/companionPost')['companionPost'];
const exits = vi.fn();
beforeEach(async () => {
  vi.resetModules(); vi.stubEnv('MODE', 'production'); ready = true;
  vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout'] });
  clock = 0; seq = 0; raf = new Map(); exits.mockClear();
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  vi.spyOn(window, 'requestAnimationFrame').mockImplementation(fn => { raf.set(++seq, fn); return seq; });
  vi.spyOn(window, 'cancelAnimationFrame').mockImplementation(id => { raf.delete(id); });
  vi.stubGlobal('fetch', vi.fn(() => new Promise(() => {})));
  vi.stubGlobal('PointerEvent', TestPointerEvent);
  WalkLayer = (await import('./WalkLayer')).WalkLayer;
  companionPost = (await import('../core/companionPost')).companionPost;
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.restoreAllMocks(); vi.unstubAllGlobals(); vi.unstubAllEnvs(); });
async function frames(count = 1) {
  for (let i = 0; i < count; i++) {
    clock += 1000 / 60;
    await act(async () => { vi.advanceTimersByTime(1000 / 60); const jobs = [...raf.values()]; raf.clear(); jobs.forEach(fn => fn(clock)); });
  }
}
function Journey() {
  const [scene, setScene] = useState<IslandScene>('dba.scene.shore');
  return <WalkLayer scene={scene} drank={false} spots={[]} hint={{ level: 0, anchor: 'driftwood', wordId: null, pose: 'idle' }}
    paused={false} purr={false} knot="rest" remembered={{ x: .89, y: .74 }} taught
    catPost={companionPost(scene, {}, {}, { skipWelcome: true })}
    onRemember={() => {}} onExit={next => { exits(next); setScene(next); }} onInteract={() => {}} onAsk={() => {}} onEscape={() => {}} />;
}
const position = () => ({ x: Number(screen.getByTestId('traveler').dataset.x), y: Number(screen.getByTestId('traveler').dataset.y) });
async function cross() {
  for (let i = 0; i < 200 && screen.getByTestId('walk-stage').dataset.scene === 'dba.scene.shore'; i++) await frames();
  expect(exits).toHaveBeenCalledExactlyOnceWith('dba.scene.camp');
  expect(position()).toEqual({ x: .34, y: .84 });
}
describe('production scene entry hands control back to the player', () => {
  it('discards keyboard autorepeat across a gate, plants the camera immediately, and accepts a fresh press', async () => {
    render(<Journey />); await frames();
    fireEvent.keyDown(window, { key: 'd', code: 'KeyD' }); await cross();
    const camera = cameraOffset(position(), 1280, 720);
    expect(Number(screen.getByTestId('walk-stage').dataset.camX)).toBeCloseTo(camera.x, 0);
    expect(Number(screen.getByTestId('walk-stage').dataset.camY)).toBeCloseTo(camera.y, 0);
    for (let i = 0; i < 12; i++) {
      fireEvent.keyDown(window, { key: 'd', code: 'KeyD', repeat: true }); await frames(3);
      expect(position()).toEqual({ x: .34, y: .84 });
    }
    expect(screen.getByTestId('traveler').dataset.pose).toBe('idle');
    fireEvent.keyUp(window, { key: 'd', code: 'KeyD' });
    fireEvent.keyDown(window, { key: 'd', code: 'KeyD' }); await frames(6);
    expect(position().x).toBeGreaterThan(.344);
  });
  it('finishes a selected route at the arrival, without an automatic second walk', async () => {
    render(<Journey />); await frames();
    fireEvent.click(screen.getByTestId('exit-camp')); await cross(); await frames(100);
    expect(position()).toEqual({ x: .34, y: .84 });
    expect(screen.getByTestId('walk-stage').dataset.navTarget).toBe('');
    expect(screen.getByTestId('traveler').dataset.moving).toBe('no');
    expect(screen.getByTestId('traveler').dataset.facing).toBe('right');
  });
  it('retires the old touch capture at the gate; dragging the old finger cannot restart movement', async () => {
    render(<Journey />); await frames();
    const old = screen.getByTestId('walk-stick'); old.setPointerCapture = vi.fn();
    fireEvent.pointerDown(old, { pointerId: 1, clientX: 50, clientY: 50, button: 0 });
    fireEvent.pointerMove(old, { pointerId: 1, clientX: 92, clientY: 50 }); await cross();
    const stick = screen.getByTestId('walk-stick'); expect(stick).not.toBe(old);
    fireEvent.pointerMove(stick, { pointerId: 1, clientX: 95, clientY: 50 }); await frames(12);
    expect(position()).toEqual({ x: .34, y: .84 });
    expect(stick.querySelector('i')!.style.transform).toBe('translate(0px, 0px)');
    stick.setPointerCapture = vi.fn();
    fireEvent.pointerDown(stick, { pointerId: 2, clientX: 50, clientY: 50, button: 0 });
    fireEvent.pointerMove(stick, { pointerId: 2, clientX: 92, clientY: 50 }); await frames(6);
    expect(position().x).toBeGreaterThan(.344);
  });
  it('does not queue a key pressed during loading and accepts new input as soon as ready', async () => {
    ready = false; const view = render(<Journey />); await frames();
    fireEvent.keyDown(window, { key: 'd', code: 'KeyD' }); await frames(6);
    expect(position().x).toBe(.89);
    ready = true; view.rerender(<Journey />);
    fireEvent.keyDown(window, { key: 'd', code: 'KeyD', repeat: true }); await frames(12);
    expect(position().x).toBe(.89);
    fireEvent.keyUp(window, { key: 'd', code: 'KeyD' });
    fireEvent.keyDown(window, { key: 'd', code: 'KeyD' }); await cross();
  });
});
