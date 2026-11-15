import { act, cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { newGameState } from '../core/save';
import { worldState } from '../core/worldState';
import { WorldStateLayer } from './WorldStateLayer';
import { loadSlotAsset, resolveSlotAsset } from '../content/slotAssets';

beforeEach(() => { vi.spyOn(document, 'hidden', 'get').mockReturnValue(false); });
afterEach(() => { cleanup(); vi.restoreAllMocks(); });

it('preloads the registered ladle patch and shows it only while carried or full', async () => {
  const state = worldState(newGameState());
  const patches = { shoreWithoutLadle: '/shore-without-ladle.webp' };
  const view = render(<WorldStateLayer scene="dba.scene.shore" state={state} patches={patches} />);
  const patch = screen.getByTestId('world-patch-shore-ladle');
  expect(patch.dataset.active).toBe('no');
  await waitFor(() => expect(patch.querySelector('img')).not.toBeNull());
  const image = patch.querySelector('img')!;
  fireEvent.load(image);
  view.rerender(<WorldStateLayer scene="dba.scene.shore" state={{ ...state, water: 'carried' }} patches={patches} />);
  expect(patch.dataset.status).toBe('ready');
  expect(patch.style.opacity).toBe('1');
  view.rerender(<WorldStateLayer scene="dba.scene.shore" state={{ ...state, water: 'done' }} patches={patches} />);
  expect(patch.style.opacity).toBe('0');
  expect(patch.querySelector('img')).toBe(image);
});

it('replaces a failed native patch after the first-screen cache retries the same URL, without replaying the puzzle', async () => {
  const state = { ...worldState(newGameState()), water: 'carried' as const };
  render(<WorldStateLayer scene="dba.scene.shore" state={state} />);
  const patch = screen.getByTestId('world-patch-shore-ladle');
  await waitFor(() => expect(patch.querySelector('img')).not.toBeNull());
  const old = patch.querySelector('img')!;
  fireEvent.error(old);
  expect(patch.dataset.status).toBe('failed'); expect(patch.style.opacity).toBe('0');
  expect(resolveSlotAsset('art.shore.carried')).toBeNull();
  // This is the same loader used by FirstScreenGate's retry button.
  await act(async () => { await loadSlotAsset('art.shore.carried'); });
  const recovered = patch.querySelector('img')!;
  expect(recovered).not.toBeNull(); expect(recovered).not.toBe(old);
  fireEvent.load(recovered);
  expect(patch.dataset.status).toBe('ready'); expect(patch.style.opacity).toBe('1');
  expect(screen.getByTestId('world-state-layer').dataset.water).toBe('carried');
  fireEvent.error(old);
  expect(patch.dataset.status).toBe('ready'); expect(resolveSlotAsset('art.shore.carried')).toBeTruthy();
});

it('recovers both registered yard regions through their shared plate cache after one native image fails', async () => {
  const state = { ...worldState(newGameState()), food: { stage: 'done' as const, self: 2, companion: 2 } };
  render(<WorldStateLayer scene="dba.scene.yard" state={state} />);
  const source = screen.getByTestId('world-patch-yard-source'), share = screen.getByTestId('world-patch-yard-share');
  await waitFor(() => expect(source.querySelector('img')).not.toBeNull());
  const oldSource = source.querySelector('img')!, oldShare = share.querySelector('img')!;
  fireEvent.load(oldSource); fireEvent.load(oldShare); fireEvent.error(oldSource);
  expect(resolveSlotAsset('art.yard.shared')).toBeNull();
  await act(async () => { await loadSlotAsset('art.yard.shared'); });
  expect(source.querySelector('img')).not.toBe(oldSource); expect(share.querySelector('img')).not.toBe(oldShare);
  fireEvent.load(source.querySelector('img')!); fireEvent.load(share.querySelector('img')!);
  expect(source.style.opacity).toBe('1'); expect(share.style.opacity).toBe('1');
});

it('keeps the source empty before serving and reveals the partner portion only on completion', () => {
  const state = worldState(newGameState());
  const patches = { yardAfterSharing: '/yard-shared.webp' };
  const view = render(<WorldStateLayer scene="dba.scene.yard" state={{ ...state, food: { stage: 'taken', self: 4, companion: 0 } }} patches={patches} />);
  expect(screen.getByTestId('world-patch-yard-source').dataset.active).toBe('yes');
  expect(screen.getByTestId('world-patch-yard-share').dataset.active).toBe('no');
  view.rerender(<WorldStateLayer scene="dba.scene.yard" state={{ ...state, food: { stage: 'done', self: 2, companion: 2 } }} patches={patches} />);
  expect(screen.getByTestId('world-patch-yard-source').dataset.active).toBe('yes');
  expect(screen.getByTestId('world-patch-yard-share').dataset.active).toBe('yes');
});

it('freezes background and menu motion without clearing persistent scene changes', () => {
  const state = { ...worldState(newGameState()), water: 'filled' as const };
  const view = render(<WorldStateLayer scene="dba.scene.shore" state={state} />);
  const layer = screen.getByTestId('world-state-layer');
  expect(layer.dataset.running).toBe('yes');
  view.rerender(<WorldStateLayer scene="dba.scene.shore" state={state} paused />);
  expect(layer.dataset.running).toBe('no');
  expect(layer.dataset.water).toBe('filled');
  view.rerender(<WorldStateLayer scene="dba.scene.shore" state={state} />);
  vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
  act(() => document.dispatchEvent(new Event('visibilitychange')));
  expect(layer.dataset.running).toBe('no');
  expect(screen.getByTestId('world-spring')).toBeTruthy();
});

it('shows a static scene when reduced motion is requested', () => {
  vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener: vi.fn(), removeEventListener: vi.fn() }));
  try {
    render(<WorldStateLayer scene="dba.scene.night" state={worldState(newGameState())} />);
    expect(screen.getByTestId('world-state-layer').dataset.running).toBe('no');
    expect(screen.getByTestId('world-fire')).toBeTruthy();
  } finally { vi.unstubAllGlobals(); }
});
