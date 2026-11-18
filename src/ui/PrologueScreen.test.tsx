import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import { PrologueScreen } from './PrologueScreen';
import { usePrologueFrame } from './usePrologueFrame';
import { filmClock } from './__fixtures__/filmClock';
import { newGameState } from '../core/save';
import { reduce } from '../core/reduce';

const art = vi.hoisted(() => ({ cache: new Map<string, string>(), load: vi.fn<(id: string) => Promise<string | null>>(), detail: vi.fn<(id: string) => Promise<string | null>>() }));
vi.mock('../content/prologueAssets', async importOriginal => ({
  ...await importOriginal<typeof import('../content/prologueAssets')>(),
  resolvePrologueImage: (id: string) => art.cache.get(id) ?? null,
  loadProloguePreview: (id: string) => art.load(id),
  loadPrologueDetail: (id: string) => art.detail(id),
  forgetPrologueImage: (id: string) => art.cache.delete(id),
}));
vi.mock('../content/imageLoad', () => ({ loadNamedAsset: () => Promise.resolve(null) }));
vi.mock('../audio/placeholder', () => ({ playMeow: vi.fn() }));
const ids = ['art.pro.storm', 'art.pro.dark', 'art.pro.break', 'art.pro.tide'];

beforeEach(() => {
  art.cache.clear();
  for (const id of ids) art.cache.set(id, `/${id}.webp`);
  art.load.mockReset().mockImplementation(id => Promise.resolve(art.cache.get(id) ?? null));
  art.detail.mockReset().mockResolvedValue(null);
});
afterEach(() => { cleanup(); vi.useRealTimers(); vi.unstubAllGlobals(); vi.restoreAllMocks(); });

function deferred() {
  let resolve!: (src: string | null) => void;
  const promise = new Promise<string | null>(done => { resolve = done; });
  return { promise, resolve };
}
function displayed() { return screen.getByTestId('prologue').dataset.displayedStep; }

describe('cinematic prologue recovery', () => {
  it('prepares remaining lightweight shots before detail and upgrades without remounting the scene', async () => {
    const detail = deferred();
    art.detail.mockReturnValue(detail.promise);
    render(<PrologueScreen step={0} onAdvance={() => {}} />);
    const shot = screen.getByTestId('still-frame');
    const caption = document.querySelector('[data-caption]');
    await act(async () => {});
    expect(art.load.mock.calls.map(([id]) => id)).toEqual(ids.slice(1));
    expect(art.detail).toHaveBeenCalledWith(ids[0]);
    await act(async () => detail.resolve('/full-storm.webp'));
    expect(screen.getByTestId('still-frame')).toBe(shot);
    expect(document.querySelector('[data-caption]')).toBe(caption);
    expect(shot.querySelector('img')?.src).toContain('/full-storm.webp');
    expect(screen.getByTestId('prologue').dataset.playing).toBe('true');
    expect(document.querySelector('.prologue-shot-out')).toBeNull();
  });
  it('ignores a late detail upgrade after navigating to another shot', async () => {
    const detail = deferred();
    art.detail.mockImplementation(id => id === ids[0] ? detail.promise : Promise.resolve(null));
    const view = renderHook(({ step }) => usePrologueFrame(step), { initialProps: { step: 0 } });
    await act(async () => {});
    view.rerender({ step: 1 });
    await act(async () => detail.resolve('/late-full-storm.webp'));
    expect(view.result.current.current?.id).toBe(ids[1]);
    expect(view.result.current.ready).toBe(true);
  });
  it('can display the original if the lightweight file is unavailable', async () => {
    art.cache.delete(ids[0]);
    art.load.mockResolvedValue(null);
    art.detail.mockImplementation(id => Promise.resolve(id === ids[0] ? '/full-storm.webp' : null));
    render(<PrologueScreen step={0} onAdvance={() => {}} />);
    await act(async () => {});
    expect(displayed()).toBe('0');
    expect(screen.queryByRole('status')).toBeNull();
  });
  it('retains the shot on rotation and ignores a late portrait after rotating back', async () => {
    const portrait = deferred();
    art.load.mockImplementation(id => id.endsWith('.portrait') ? portrait.promise : Promise.resolve(art.cache.get(id) ?? null));
    const view = renderHook(({ tall }) => usePrologueFrame(0, tall), { initialProps: { tall: false } });
    view.rerender({ tall: true });
    expect(view.result.current.current?.id).toBe(ids[0]);
    expect(view.result.current.ready).toBe(false);
    view.rerender({ tall: false });
    await act(async () => portrait.resolve('/portrait.webp'));
    expect(view.result.current.current?.id).toBe(ids[0]);
    expect(view.result.current.ready).toBe(true);
  });
  it('keeps the decoded preceding picture and caption until the next picture is ready', async () => {
    art.cache.delete(ids[1]);
    const next = deferred();
    art.load.mockImplementation(id => id === ids[1] ? next.promise : Promise.resolve(null));
    const view = render(<PrologueScreen step={0} onAdvance={() => {}} />);
    view.rerender(<PrologueScreen step={1} onAdvance={() => {}} />);
    expect(displayed()).toBe('0');
    expect(screen.getByTestId('still-frame').querySelector('img')?.src).toContain('storm');
    expect(screen.getByTestId('prologue').querySelector('[data-caption]')?.getAttribute('data-caption')).toBe('prologue.0');
    expect(screen.getByTestId('prologue').dataset.playing).toBe('false');
    await act(async () => next.resolve('/decoded-dark.webp'));
    expect(displayed()).toBe('1');
    expect(screen.queryByRole('status')).toBeNull();
  });

  it('ignores a late picture after going back', async () => {
    art.cache.delete(ids[1]);
    const next = deferred();
    art.load.mockImplementation(id => id === ids[1] ? next.promise : Promise.resolve(null));
    const view = render(<PrologueScreen step={0} onAdvance={() => {}} />);
    view.rerender(<PrologueScreen step={1} onAdvance={() => {}} />);
    view.rerender(<PrologueScreen step={0} onAdvance={() => {}} />);
    await act(async () => next.resolve('/late-dark.webp'));
    expect(displayed()).toBe('0');
    expect(screen.getByTestId('still-frame').querySelector('img')?.src).toContain('storm');
  });

  it('retries a failed frame without advancing or losing the prior picture', async () => {
    art.cache.delete(ids[1]);
    const view = render(<PrologueScreen step={0} onAdvance={() => {}} />);
    view.rerender(<PrologueScreen step={1} onAdvance={() => {}} />);
    await act(async () => {});
    expect(displayed()).toBe('0');
    expect(screen.getByRole('status').textContent).toContain('未能加载');
    art.load.mockResolvedValue('/recovered.webp');
    fireEvent.click(screen.getByRole('button', { name: '重新加载' }));
    await act(async () => {});
    expect(displayed()).toBe('1');
    expect(screen.getByTestId('still-frame').querySelector('img')?.src).toContain('recovered');
  });

  it('recovers a displayed image failure and stops retrying after unmount', async () => {
    vi.useFakeTimers();
    const view = render(<PrologueScreen step={0} onAdvance={() => {}} />);
    fireEvent.error(screen.getByTestId('still-frame').querySelector('img')!);
    expect(screen.getByRole('status').textContent).toContain('未能加载');
    art.load.mockResolvedValue('/restored.webp');
    await act(() => vi.advanceTimersByTimeAsync(5_000));
    expect(displayed()).toBe('0');
    expect(screen.queryByRole('status')).toBeNull();
    view.unmount();
    const calls = art.load.mock.calls.length;
    await act(() => vi.advanceTimersByTimeAsync(60_000));
    expect(art.load).toHaveBeenCalledTimes(calls);
  });

  it('retries automatically after connectivity returns', async () => {
    art.cache.delete(ids[0]);
    render(<PrologueScreen step={0} onAdvance={() => {}} />);
    await act(async () => {});
    expect(screen.getByRole('status').textContent).toContain('未能加载');
    art.load.mockResolvedValue('/online.webp');
    fireEvent(window, new Event('online'));
    await act(async () => {});
    expect(displayed()).toBe('0');
    expect(screen.queryByRole('status')).toBeNull();
  });
});

describe('continuous opening', () => {
  function Player() {
    const [save, setSave] = useState(() => reduce(newGameState(), { type: 'new-game' }));
    return save.screen === 'island' ? <output data-testid="landed">{JSON.stringify(save)}</output>
      : <PrologueScreen step={save.prologueStep}
        onAdvance={() => setSave(value => reduce(value, { type: 'advance-prologue' }))}
        onReplay={() => setSave(value => reduce(value, { type: 'replay-prologue' }))}
        onSkip={() => setSave(value => reduce(value, { type: 'skip-prologue' }))} />;
  }
  it('plays the whole opening without input and lands with the story evidence exactly once', async () => {
    const clock = filmClock();
    render(<Player />);
    expect(screen.queryByRole('button', { name: /下一幕|上一幕|走上潮线|连播/ })).toBeNull();
    expect(screen.queryByText('浪头吞没了船。')).toBeNull();
    await clock.advance(2);
    expect(screen.getByText('浪头吞没了船。')).toBeTruthy();
    expect(screen.queryByText('你攥住浮木，风声盖过了呼喊。')).toBeNull();
    await clock.advance(3);
    expect(screen.getByText('你攥住浮木，风声盖过了呼喊。')).toBeTruthy();
    await clock.advance(3);
    expect(displayed()).toBe('1');
    await clock.advance(8);
    expect(displayed()).toBe('2');
    await clock.advance(8);
    expect(displayed()).toBe('3');
    await clock.advance(8);
    const save = JSON.parse(screen.getByTestId('landed').textContent!);
    expect(save.currentScene).toBe('dba.scene.shore');
    expect(save.evidence).toEqual(['dba.ev.a']);
    expect(save.flags['pro.flag.met-companion']).toBe(true);
  });
  it('pauses picture, caption and story time, then resumes without skipping', async () => {
    const clock = filmClock(); render(<Player />);
    await clock.advance(2);
    fireEvent.keyDown(window, { key: ' ' });
    expect(screen.getByTestId('prologue').dataset.playing).toBe('false');
    const text = screen.getByText('浪头吞没了船。');
    const opacity = text.style.opacity;
    await clock.advance(30);
    expect(displayed()).toBe('0');
    expect(text.style.opacity).toBe(opacity);
    fireEvent.keyDown(window, { key: ' ', repeat: true });
    expect(screen.getByTestId('prologue').dataset.playing).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: '播放' }));
    await clock.advance(6);
    expect(displayed()).toBe('1');
  });
  it('keeps the outgoing animated layer mounted during a paused dissolve', async () => {
    const clock = filmClock(); render(<Player />);
    const first = screen.getByTestId('still-frame');
    await clock.advance(7.9);
    expect(first.className).toContain('prologue-shot-out');
    const current = screen.getByTestId('still-frame');
    const opacity = current.style.opacity;
    fireEvent.click(screen.getByRole('button', { name: '暂停' }));
    await clock.advance(5);
    expect(first.isConnected).toBe(true);
    expect(current.style.opacity).toBe(opacity);
    fireEvent.click(screen.getByRole('button', { name: '播放' }));
    await clock.advance(1.2);
    expect(first.isConnected).toBe(false);
    expect(current.style.opacity).toBe('1');
  });
  it('holds the old scene through slow decoding and gives the new scene its full duration', async () => {
    const clock = filmClock(); const next = deferred();
    art.cache.delete(ids[1]);
    art.load.mockImplementation(id => id === ids[1] ? next.promise : Promise.resolve(art.cache.get(id) ?? null));
    render(<Player />);
    await clock.advance(18);
    expect(displayed()).toBe('0');
    expect(screen.getByTestId('prologue').dataset.prologueStep).toBe('1');
    expect(screen.getByTestId('prologue').dataset.playing).toBe('false');
    await act(async () => next.resolve('/decoded-dark.webp'));
    await clock.advance(2);
    expect(displayed()).toBe('1');
    expect(screen.getByText('黑水里，传来一声猫叫。')).toBeTruthy();
    await clock.advance(6);
    expect(displayed()).toBe('2');
  });
  it('stops while the document is hidden and never counts a long suspended frame as story time', async () => {
    const clock = filmClock(); let hidden = false;
    vi.spyOn(document, 'hidden', 'get').mockImplementation(() => hidden);
    render(<Player />); await clock.advance(2);
    hidden = true; fireEvent(document, new Event('visibilitychange'));
    await clock.advance(40); expect(displayed()).toBe('0');
    hidden = false; fireEvent(document, new Event('visibilitychange'));
    await clock.tick(30_000); expect(displayed()).toBe('0');
    expect(screen.getByText('浪头吞没了船。')).toBeTruthy();
    await clock.advance(6); expect(displayed()).toBe('1');
  });
  it('restarts the whole film from the memory and retains earned evidence', async () => {
    const clock = filmClock(); render(<Player />);
    await clock.advance(17); expect(displayed()).toBe('2');
    fireEvent.click(screen.getByRole('button', { name: '从头重看' }));
    expect(displayed()).toBe('0');
    expect(screen.queryByText('浪头吞没了船。')).toBeNull();
    await clock.advance(2); expect(screen.getByText('浪头吞没了船。')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: '跳过序章' }));
    const save = JSON.parse(screen.getByTestId('landed').textContent!);
    expect(save.evidence).toEqual(['dba.ev.a']);
  });
  it('keeps native button activation and no longer binds page-navigation arrows', () => {
    render(<Player />);
    fireEvent.keyDown(window, { key: 'ArrowRight' }); expect(displayed()).toBe('0');
    const pause = screen.getByRole('button', { name: '暂停' }); pause.focus();
    fireEvent.keyDown(pause, { key: ' ' });
    expect(screen.getByTestId('prologue').dataset.playing).toBe('true');
    fireEvent.click(pause);
    expect(screen.getByTestId('prologue').dataset.playing).toBe('false');
    expect(fireEvent.keyDown(pause, { key: 'Enter', repeat: true })).toBe(false);
  });
  it('keeps automatic landing with reduced motion and prevents duplicate final advances', async () => {
    const clock = filmClock();
    vi.stubGlobal('matchMedia', () => ({ matches: true, addEventListener() {}, removeEventListener() {} }));
    const advance = vi.fn(); render(<PrologueScreen step={3} onAdvance={advance} />);
    expect(document.querySelector('.prologue-motion')?.getAttribute('data-motion')).toBe('reduced');
    await clock.advance(20);
    expect(advance).toHaveBeenCalledOnce();
  });
  it('still allows skipping when the first image cannot load', async () => {
    art.cache.clear(); const skip = vi.fn();
    render(<PrologueScreen step={0} onAdvance={() => {}} onSkip={skip} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: '跳过序章' }));
    expect(skip).toHaveBeenCalledOnce();
  });
});
