import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const param = () => ({ value: 0, cancelScheduledValues: vi.fn(), setValueAtTime: vi.fn(), linearRampToValueAtTime: vi.fn() });
const node = () => ({ connect: vi.fn(), disconnect: vi.fn(), gain: param() });
let contexts: FakeContext[];
class FakeContext extends EventTarget {
  state = 'running'; currentTime = 10; destination = {};
  gains: ReturnType<typeof node>[] = [];
  sources: (ReturnType<typeof node> & { start: ReturnType<typeof vi.fn>; stop: ReturnType<typeof vi.fn>; onended?: () => void })[] = [];
  resume = vi.fn(() => { this.state = 'running'; this.dispatchEvent(new Event('statechange')); return Promise.resolve(); });
  decodeAudioData = vi.fn(() => Promise.resolve({ duration: 16 }));
  constructor() { super(); contexts.push(this); }
  createGain() { const gain = node(); this.gains.push(gain); return gain; }
  createDynamicsCompressor() { return { ...node(), threshold: param(), knee: param(), ratio: param(), attack: param(), release: param() }; }
  createBufferSource() { const source = { ...node(), playbackRate: param(), start: vi.fn(), stop: vi.fn() }; this.sources.push(source); return source; }
}
beforeEach(() => { vi.resetModules(); contexts = []; localStorage.clear(); vi.stubGlobal('AudioContext', FakeContext); });
afterEach(() => { vi.unstubAllGlobals(); vi.restoreAllMocks(); });

describe('shared sound mixer', () => {
  it('requests playback routing when Safari exposes an audio session', async () => {
    const audioSession = { type: 'auto' };
    vi.stubGlobal('navigator', { audioSession });
    const mixer = await import('./mixer');
    expect(await mixer.primeAudio()).toBe(true);
    expect(audioSession.type).toBe('playback');
  });
  it('recovers interrupted audio on return and on gameplay input without autoplaying the title', async () => {
    const mixer = await import('./mixer');
    const remove = mixer.installAudioRecovery();
    try {
      document.dispatchEvent(new MouseEvent('click')); window.dispatchEvent(new Event('pageshow'));
      expect(contexts).toHaveLength(0);
      await mixer.primeAudio(); const context = contexts[0];
      context.state = 'interrupted'; context.dispatchEvent(new Event('statechange'));
      expect(mixer.audioSnapshot().status).toBe('blocked');
      const hidden = vi.spyOn(document, 'hidden', 'get').mockReturnValue(true);
      document.dispatchEvent(new Event('visibilitychange'));
      expect(context.gains[0].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 10.08);
      expect(context.resume).not.toHaveBeenCalled();
      hidden.mockReturnValue(false); document.dispatchEvent(new Event('visibilitychange')); await Promise.resolve();
      expect(mixer.audioSnapshot().status).toBe('ready');
      expect(context.gains[0].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(.7, 10.08);
      context.state = 'suspended'; context.dispatchEvent(new Event('statechange'));
      document.dispatchEvent(new KeyboardEvent('keydown', { key: 'd' })); await Promise.resolve();
      expect(context.resume).toHaveBeenCalledTimes(2);
      mixer.setAudioPreferences({ muted: true }); context.state = 'suspended';
      document.dispatchEvent(new MouseEvent('click')); window.dispatchEvent(new Event('pageshow'));
      expect(context.resume).toHaveBeenCalledTimes(2);
      mixer.setAudioPreferences({ muted: false, volume: 0 });
      document.dispatchEvent(new MouseEvent('click')); expect(context.resume).toHaveBeenCalledTimes(2);
      remove(); mixer.setAudioPreferences({ volume: .7 });
      document.dispatchEvent(new MouseEvent('click')); expect(context.resume).toHaveBeenCalledTimes(2);
    } finally { remove(); }
  });
  it('migrates old preferences and controls music without muting environment or effects', async () => {
    localStorage.setItem('odyssey.audio.v1', JSON.stringify({muted:false,volume:.4}));
    const mixer=await import('./mixer'); await mixer.primeAudio();
    expect(mixer.audioSnapshot()).toMatchObject({volume:.4,music:.55,ambience:.8,effects:1});
    mixer.setAudioPreferences({music:0,effects:.5});
    expect(contexts[0].gains[1].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0,10.08);
    expect(contexts[0].gains[2].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(.8,10.08);
    expect(contexts[0].gains[3].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(.5,10.08);
    expect(JSON.parse(localStorage.getItem('odyssey.audio.v1')!)).toMatchObject({volume:.4,music:0,effects:.5});
  });
  it('remembers mute, avoids creating audio while muted, and clamps volume', async () => {
    localStorage.setItem('odyssey.audio.v1', JSON.stringify({ muted: true, volume: .4 }));
    const mixer = await import('./mixer');
    mixer.primeAudio(); expect(contexts).toHaveLength(0);
    mixer.setAudioPreferences({ muted: false, volume: 2 }); mixer.primeAudio();
    expect(contexts).toHaveLength(1);
    expect(mixer.audioSnapshot()).toMatchObject({ muted: false, volume: 1, status: 'ready' });
    mixer.setAudioPreferences({ muted: true });
    expect(contexts[0].gains[0].gain.linearRampToValueAtTime).toHaveBeenLastCalledWith(0, 10.08);
    expect(JSON.parse(localStorage.getItem('odyssey.audio.v1')!).muted).toBe(true);
  });
  it('handles unavailable devices, rejected autoplay and denied storage', async () => {
    vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => { throw new Error('denied'); });
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => { throw new Error('denied'); });
    const mixer = await import('./mixer');
    expect(() => mixer.setAudioPreferences({ volume: .3 })).not.toThrow();
    class BlockedContext extends FakeContext { state = 'suspended'; resume = vi.fn(() => Promise.reject(new Error('blocked'))); }
    vi.stubGlobal('AudioContext', BlockedContext);
    mixer.primeAudio(); await Promise.resolve(); await Promise.resolve();
    expect(mixer.audioSnapshot().status).toBe('blocked');
    expect(mixer.audibleGraph()).toBeNull();
  });
  it('degrades to silence when audio construction fails', async () => {
    vi.stubGlobal('AudioContext', class { constructor() { throw new Error('device missing'); } });
    const mixer = await import('./mixer');
    expect(() => mixer.primeAudio()).not.toThrow();
    expect(mixer.audioSnapshot().status).toBe('unavailable');
  });
});

describe('decoded sound ownership', () => {
  it('bounds decoded ambience memory while retaining recently used sounds', async () => {
    const mixer=await import('./mixer');await mixer.primeAudio();
    contexts[0].decodeAudioData.mockResolvedValue({duration:48,length:4*1024*1024,numberOfChannels:2} as never);
    const fetch=vi.fn().mockResolvedValue({ok:true,arrayBuffer:async()=>new ArrayBuffer(1)});vi.stubGlobal('fetch',fetch);
    const {loadSound}=await import('./sounds');
    await loadSound('shore');await loadSound('camp');await loadSound('camp');expect(fetch).toHaveBeenCalledTimes(2);
    await loadSound('shore');expect(fetch).toHaveBeenCalledTimes(3);
  });
  it('never starts a late decoded voice after its owner leaves', async () => {
    const mixer = await import('./mixer'); mixer.primeAudio();
    let resolve!: (value: unknown) => void;
    vi.stubGlobal('fetch', vi.fn(() => new Promise(done => { resolve = done; })));
    const { playSound } = await import('./sounds');
    let live = true;
    const pending = playSound('storm', { loop: true, valid: () => live });
    live = false;
    resolve({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) });
    expect(await pending).toBeNull();
    expect(contexts[0].sources).toHaveLength(0);
  });
  it('retries failures, resumes at the correct offset and releases nodes once', async () => {
    const mixer = await import('./mixer'); mixer.primeAudio();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValueOnce({ ok: false }).mockResolvedValue({ ok: true, arrayBuffer: async () => new ArrayBuffer(1) }));
    const { playSound } = await import('./sounds');
    expect(await playSound('shore')).toBeNull();
    const voice = await playSound('shore', { loop: true, offset: () => 18 });
    expect(contexts[0].sources[0].start).toHaveBeenCalledWith(10, 2);
    voice!.stop(); voice!.stop();
    expect(contexts[0].sources[0].stop).toHaveBeenCalledTimes(1);
    contexts[0].sources[0].onended!();
    expect(contexts[0].sources[0].disconnect).toHaveBeenCalledOnce();
    expect(contexts[0].gains.at(-1)!.disconnect).toHaveBeenCalledOnce();
  });
});
