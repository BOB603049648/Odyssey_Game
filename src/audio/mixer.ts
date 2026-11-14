/** One application bus. Preferences survive new games without changing save data. */
export const AUDIO_KEY = 'odyssey.audio.v1';
export type AudioSnapshot = { muted: boolean; volume: number; status: 'idle' | 'ready' | 'blocked' | 'unavailable' };
function savedPreferences(): Pick<AudioSnapshot, 'muted' | 'volume'> {
  try {
    const value = JSON.parse(localStorage.getItem(AUDIO_KEY) ?? 'null');
    if (value && typeof value.muted === 'boolean' && Number.isFinite(value.volume)) {
      return { muted: value.muted, volume: Math.max(0, Math.min(1, value.volume)) };
    }
  } catch { /* Denied/corrupt storage must not prevent play. */ }
  return { muted: false, volume: .7 };
}
let snapshot: AudioSnapshot = { ...savedPreferences(), status: 'idle' };
let graph: { context: AudioContext; master: GainNode } | null = null;
const listeners = new Set<() => void>();
export const audioSnapshot = () => snapshot;
export const subscribeAudio = (listener: () => void) => { listeners.add(listener); return () => { listeners.delete(listener); }; };
function publish(value: Partial<AudioSnapshot>) {
  snapshot = { ...snapshot, ...value };
  for (const listener of listeners) listener();
}
function applyVolume() {
  if (!graph) return;
  const { context, master } = graph;
  const now = context.currentTime;
  const volume = snapshot.muted || document.hidden ? 0 : snapshot.volume;
  master.gain.cancelScheduledValues(now);
  master.gain.setValueAtTime(master.gain.value, now);
  master.gain.linearRampToValueAtTime(volume, now + .08);
}
export function setAudioPreferences(value: Partial<Pick<AudioSnapshot, 'muted' | 'volume'>>): void {
  const volume = value.volume === undefined || !Number.isFinite(value.volume) ? snapshot.volume : Math.max(0, Math.min(1, value.volume));
  publish({ ...value, volume });
  applyVolume();
  try { localStorage.setItem(AUDIO_KEY, JSON.stringify({ muted: snapshot.muted, volume })); } catch { /* Keep the session preference. */ }
}

/** Call from a user gesture. A blocked/unsupported audio device never throws into UI. */
export function primeAudio(): void {
  if (snapshot.muted || snapshot.volume === 0) return;
  try {
    if (!graph || graph.context.state === 'closed') {
      const Constructor = window.AudioContext ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Constructor) { publish({ status: 'unavailable' }); return; }
      const context = new Constructor();
      const master = context.createGain();
      const limiter = context.createDynamicsCompressor();
      limiter.threshold.value = -6;
      limiter.knee.value = 6;
      limiter.ratio.value = 8;
      limiter.attack.value = .003;
      limiter.release.value = .18;
      master.gain.value = 0;
      master.connect(limiter); limiter.connect(context.destination);
      graph = { context, master };
      context.addEventListener('statechange', () => {
        if (graph?.context !== context) return;
        publish({ status: context.state === 'running' ? 'ready' : 'blocked' });
        applyVolume();
      });
      document.addEventListener('visibilitychange', applyVolume);
    }
    applyVolume();
    const context = graph.context;
    if (context.state === 'running') publish({ status: 'ready' });
    else void context.resume().then(() => {
      if (graph?.context === context) { publish({ status: context.state === 'running' ? 'ready' : 'blocked' }); applyVolume(); }
    }).catch(() => { if (graph?.context === context) publish({ status: 'blocked' }); });
  } catch { publish({ status: 'unavailable' }); }
}
export function audibleGraph() {
  return graph && graph.context.state === 'running' && !snapshot.muted && snapshot.volume > 0 && !document.hidden ? graph : null;
}
