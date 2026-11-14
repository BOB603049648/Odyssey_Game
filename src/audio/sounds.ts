import { FOLEY_URLS } from './soundBank';
import yard from '../assets/audio/yard.mp3';
import camp from '../assets/audio/camp.mp3';
import forest from '../assets/audio/forest.mp3';
import hall from '../assets/audio/hall.mp3';
import night from '../assets/audio/night.mp3';
import storm from '../assets/audio/storm.mp3';
import rescue from '../assets/audio/rescue.mp3';
import memory from '../assets/audio/memory.mp3';
import shore from '../assets/audio/shore.mp3';
import catCall from '../assets/audio/cat-call.mp3';
import catPurr from '../assets/audio/cat-purr.mp3';
import glyphBreak from '../assets/audio/glyph-break.mp3';
import { audibleGraph, type AudioChannel } from './mixer';

export const SOUND_URLS = { ...FOLEY_URLS, yard, storm, rescue, memory, shore, camp, forest, hall, night, 'cat-call': catCall, 'cat-purr': catPurr, 'glyph-break': glyphBreak };
export type SoundId = keyof typeof SOUND_URLS;
export type SoundVoice = { stop: (fade?: number) => void; finished?: Promise<void> };
export function soundChannel(id: SoundId): AudioChannel {
  if (id.startsWith('theme-')) return 'music';
  return ['storm','rescue','memory','shore','camp','forest','hall','night','yard','bird-1','bird-2','bird-3','wood-creak'].includes(id) ? 'ambience' : 'effects';
}
const decoded = new Map<SoundId, AudioBuffer>();
const pending = new Map<SoundId, Promise<AudioBuffer | null>>();
const CACHE_BYTES = 48 * 1024 * 1024;
function retain(id: SoundId, buffer: AudioBuffer) {
  decoded.delete(id); decoded.set(id, buffer);
  let bytes = [...decoded.values()].reduce((sum, item) => sum + (item.length * item.numberOfChannels * 4 || 0), 0);
  // Playing sources retain their own buffers; old visited scenes need not all
  // remain decoded in memory on a phone. Small foley stays cheap to preload.
  for (const [key, item] of decoded) {
    if (bytes <= CACHE_BYTES || decoded.size === 1) break;
    decoded.delete(key); bytes -= item.length * item.numberOfChannels * 4 || 0;
  }
}

export function loadSound(id: SoundId): Promise<AudioBuffer | null> {
  const graph = audibleGraph();
  if (!graph) return Promise.resolve(null);
  const cached = decoded.get(id);
  if (cached) { retain(id, cached); return Promise.resolve(cached); }
  if (pending.has(id)) return pending.get(id)!;
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 12_000);
  const job = fetch(SOUND_URLS[id], { signal: abort.signal })
    .then(response => { if (!response.ok) throw new Error('audio unavailable'); return response.arrayBuffer(); })
    .then(bytes => graph.context.decodeAudioData(bytes))
    .then(buffer => { retain(id, buffer); return buffer; })
    .catch(() => null)
    .finally(() => { clearTimeout(timeout); pending.delete(id); });
  pending.set(id, job);
  return job;
}

/** Late decoding cannot revive a departed/paused scene. Every voice has an owner. */
export async function playSound(id: SoundId, options: {
  loop?: boolean; level?: number; offset?: () => number; valid?: () => boolean; pan?: number; rate?: number; channel?: AudioChannel;
} = {}): Promise<SoundVoice | null> {
  const buffer = await loadSound(id);
  const graph = audibleGraph();
  if (!buffer || !graph || options.valid?.() === false) return null;
  try {
    const { context, master } = graph;
    const source = context.createBufferSource();
    const gain = context.createGain();
    source.buffer = buffer;
    source.loop = options.loop ?? false;
    source.playbackRate.value = Math.max(.8, Math.min(1.2, options.rate ?? 1));
    source.connect(gain);
    const bus = graph.channels[options.channel ?? soundChannel(id)];
    const panner = context.createStereoPanner?.();
    if (panner) { panner.pan.value = Math.max(-.8, Math.min(.8, options.pan ?? 0)); gain.connect(panner); panner.connect(bus); }
    else gain.connect(bus ?? master);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(options.level ?? 1, now + (options.loop ? .45 : .015));
    let finish!: () => void;
    const finished = new Promise<void>(resolve => { finish = resolve; });
    source.onended = () => { source.disconnect(); gain.disconnect(); panner?.disconnect(); finish(); };
    source.start(now, Math.max(0, options.offset?.() ?? 0) % buffer.duration);
    let stopped = false;
    return { finished, stop(fade = .14) {
      if (stopped) return;
      stopped = true;
      const time = context.currentTime;
      gain.gain.cancelScheduledValues(time);
      gain.gain.setValueAtTime(gain.gain.value, time);
      gain.gain.linearRampToValueAtTime(0, time + fade);
      source.stop(time + fade + .01);
    } };
  } catch { return null; }
}
