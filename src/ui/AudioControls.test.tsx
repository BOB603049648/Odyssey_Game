import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { AudioSettings, AudioToggle } from './AudioControls';
const mock = vi.hoisted(() => ({ audio: { muted: false, volume: .7, status: 'idle' }, listeners: new Set<() => void>(), prime: vi.fn(), test: vi.fn() }));
vi.mock('../audio/mixer', () => ({
  audioSnapshot: () => mock.audio,
  subscribeAudio: (listener: () => void) => { mock.listeners.add(listener); return () => mock.listeners.delete(listener); },
  setAudioPreferences: (value: object) => { mock.audio = { ...mock.audio, ...value }; mock.listeners.forEach(listener => listener()); },
  primeAudio: () => mock.prime(),
}));
vi.mock('../audio/placeholder', () => ({ playAudioTest: () => mock.test() }));
beforeEach(() => { mock.audio = { muted: false, volume: .7, status: 'idle' }; mock.prime.mockReset().mockResolvedValue(true); mock.test.mockReset(); });
afterEach(cleanup);
it.each(['idle', 'blocked', 'unavailable'])('offers activation/retry instead of muting an inaudible %s session', status => {
  mock.audio.status = status;
  const view = render(<AudioToggle />); const button = view.getByRole('button');
  expect(button.getAttribute('aria-pressed')).toBe('false'); expect(button.textContent).not.toContain('声音开');
  fireEvent.click(button); expect(mock.prime).toHaveBeenCalledOnce(); expect(mock.audio.muted).toBe(false);
});
it('restores audible volume from zero and unmutes when the player raises the slider', () => {
  mock.audio = { status: 'ready', muted: false, volume: 0 };
  const view = render(<AudioSettings />);
  fireEvent.click(view.getByRole('button', { name: '声音关' })); expect(mock.audio.volume).toBe(.7);
  fireEvent.click(view.getByRole('button', { name: '声音开' })); expect(mock.audio.muted).toBe(true);
  fireEvent.change(view.getByRole('slider'), { target: { value: '50' } });
  expect(mock.audio).toMatchObject({ muted: false, volume: .5 });
});
it('plays the output check only after the audio device resumes', async () => {
  let resume!: (ready: boolean) => void; mock.prime.mockImplementationOnce(() => new Promise(resolve => { resume = resolve; }));
  const view = render(<AudioSettings />);
  fireEvent.click(view.getByRole('button', { name: '试听声音' })); expect(mock.test).not.toHaveBeenCalled();
  await act(async () => resume(true)); expect(mock.test).toHaveBeenCalledOnce();
  mock.prime.mockResolvedValueOnce(false);
  await act(async () => fireEvent.click(view.getByRole('button', { name: '试听声音' })));
  expect(mock.test).toHaveBeenCalledOnce();
});
