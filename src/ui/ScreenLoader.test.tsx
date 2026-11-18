import { lazy, Suspense } from 'react';
import { act, cleanup, render, screen } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { ScreenLoader, ScreenLoadBoundary } from './ScreenLoader';

afterEach(() => { cleanup(); vi.restoreAllMocks(); });
it('shows progress while a screen downloads, then opens the screen', async () => {
  let finish!: (module: { default: () => JSX.Element }) => void;
  const View = lazy(() => new Promise<{ default: () => JSX.Element }>(resolve => { finish = resolve; }));
  render(<ScreenLoadBoundary><Suspense fallback={<ScreenLoader />}><View /></Suspense></ScreenLoadBoundary>);
  expect(screen.getByRole('status').textContent).toContain('正在展开旅程');
  await act(async () => { finish({ default: () => <p>旅程已展开</p> }); });
  expect(screen.queryByRole('status')).toBeNull();
  expect(screen.getByText('旅程已展开')).toBeTruthy();
});

it('provides recovery when a screen chunk fails to download', async () => {
  vi.spyOn(console, 'error').mockImplementation(() => {});
  const View = lazy(async () => { throw new Error('Failed to fetch dynamically imported module'); });
  render(<ScreenLoadBoundary><Suspense fallback={<ScreenLoader />}><View /></Suspense></ScreenLoadBoundary>);
  expect(await screen.findByRole('button', { name: '重新加载' })).toBeTruthy();
  expect(screen.getByRole('status').textContent).toContain('未能载入');
});
