import storm from '../assets/audio/storm.mp3';
import rescue from '../assets/audio/rescue.mp3';
import memory from '../assets/audio/memory.mp3';
import shore from '../assets/audio/shore.mp3';
import catCall from '../assets/audio/cat-call.mp3';
import catPurr from '../assets/audio/cat-purr.mp3';
import glyphBreak from '../assets/audio/glyph-break.mp3';
import { audibleGraph } from './mixer';

export const SOUND_URLS = { storm, rescue, memory, shore, 'cat-call': catCall, 'cat-purr': catPurr, 'glyph-break': glyphBreak };
export type SoundId = keyof typeof SOUND_URLS;
export type SoundVoice = { stop: (fade?: number) => void };
const decoded = new Map<SoundId, AudioBuffer>();
const pending = new Map<SoundId, Promise<AudioBuffer | null>>();

export function loadSound(id: SoundId): Promise<AudioBuffer | null> {
  const graph = audibleGraph();
  if (!graph) return Promise.resolve(null);
  if (decoded.has(id)) return Promise.resolve(decoded.get(id)!);
  if (pending.has(id)) return pending.get(id)!;
  const abort = new AbortController();
  const timeout = setTimeout(() => abort.abort(), 12_000);
  const job = fetch(SOUND_URLS[id], { signal: abort.signal })
    .then(response => { if (!response.ok) throw new Error('audio unavailable'); return response.arrayBuffer(); })
    .then(bytes => graph.context.decodeAudioData(bytes))
    .then(buffer => { decoded.set(id, buffer); return buffer; })
    .catch(() => null)
    .finally(() => { clearTimeout(timeout); pending.delete(id); });
  pending.set(id, job);
  return job;
}

/** Late decoding cannot revive a departed/paused scene. Every voice has an owner. */
export async function playSound(id: SoundId, options: {
  loop?: boolean; level?: number; offset?: () => number; valid?: () => boolean;
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
    source.connect(gain); gain.connect(master);
    const now = context.currentTime;
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(options.level ?? 1, now + (options.loop ? .45 : .015));
    source.onended = () => { source.disconnect(); gain.disconnect(); };
    source.start(now, Math.max(0, options.offset?.() ?? 0) % buffer.duration);
    let stopped = false;
    return { stop(fade = .14) {
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
