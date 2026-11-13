import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { act, cleanup, fireEvent, render, renderHook, screen } from '@testing-library/react';
import { useState } from 'react';
import { PrologueScreen } from './PrologueScreen';
import { usePrologueFrame } from './usePrologueFrame';

const art = vi.hoisted(() => ({ cache: new Map<string, string>(), load: vi.fn<(id: string) => Promise<string | null>>() }));
vi.mock('../content/slotAssets', () => ({
  resolveSlotAsset: (id: string) => art.cache.get(id) ?? null,
  loadSlotAsset: (id: string) => art.load(id),
  forgetSlotAsset: (id: string) => art.cache.delete(id),
}));
vi.mock('../content/imageLoad', () => ({ loadNamedAsset: () => Promise.resolve(null) }));
vi.mock('../audio/placeholder', () => ({ playMeow: vi.fn() }));
const ids = ['art.pro.storm', 'art.pro.dark', 'art.pro.break', 'art.pro.tide'];

beforeEach(() => {
  art.cache.clear();
  for (const id of ids) art.cache.set(id, `/${id}.webp`);
  art.load.mockReset().mockImplementation(id => Promise.resolve(art.cache.get(id) ?? null));
});
afterEach(() => { cleanup(); vi.useRealTimers(); });

function deferred() {
  let resolve!: (src: string | null) => void;
  const promise = new Promise<string | null>(done => { resolve = done; });
  return { promise, resolve };
}
function displayed() { return screen.getByTestId('prologue').dataset.displayedStep; }

describe('cinematic prologue recovery', () => {
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
    expect((screen.getByRole('button', { name: '下一幕' }) as HTMLButtonElement).disabled).toBe(true);
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

describe('prologue controls', () => {
  function Player() {
    const [step, setStep] = useState(0);
    return <PrologueScreen step={step} onAdvance={() => setStep(value => Math.min(3, value + 1))}
      onBack={() => setStep(value => Math.max(0, value - 1))} />;
  }
  it('supports keyboard navigation without repeat events skipping shots', () => {
    render(<Player />);
    fireEvent.keyDown(window, { key: 'ArrowRight' });
    expect(displayed()).toBe('1');
    fireEvent.keyDown(window, { key: 'ArrowRight', repeat: true });
    expect(displayed()).toBe('1');
    fireEvent.keyDown(window, { key: 'ArrowLeft' });
    expect(displayed()).toBe('0');
    fireEvent.keyDown(window, { key: ' ' });
    expect(displayed()).toBe('1');
  });
  it('leaves native button activation to the button and suppresses held-key repeats', () => {
    render(<Player />);
    const next = screen.getByRole('button', { name: '下一幕' });
    next.focus();
    fireEvent.keyDown(next, { key: 'Enter' });
    expect(displayed()).toBe('0');
    fireEvent.click(next, { detail: 1 });
    expect(displayed()).toBe('1');
    expect(fireEvent.keyDown(next, { key: 'Enter', repeat: true })).toBe(false);
    expect(displayed()).toBe('1');
    // Consecutive intentional taps can carry click detail=2 on touch devices.
    fireEvent.click(next, { detail: 2 });
    expect(displayed()).toBe('2');
  });
  it('still allows skipping when the first image cannot load', async () => {
    art.cache.clear();
    const skip = vi.fn();
    render(<PrologueScreen step={0} onAdvance={() => {}} onSkip={skip} />);
    await act(async () => {});
    fireEvent.click(screen.getByRole('button', { name: '跳过序章' }));
    expect(skip).toHaveBeenCalledOnce();
  });
});
