import { audioSnapshot, subscribeAudio } from './mixer';
import { playSound, type SoundId, type SoundVoice } from './sounds';

/** A scene/action owns every timer and decoded voice, including pending loads. */
export function soundScope() {
  let closed = false;
  const voices = new Set<SoundVoice>();
  const timers = new Set<ReturnType<typeof setTimeout>>();
  const stop = () => { for (const voice of voices) voice.stop(.025); voices.clear(); for (const timer of timers) clearTimeout(timer); timers.clear(); };
  const audible = () => { const a = audioSnapshot(); return !closed && !document.hidden && !a.muted && a.volume > 0 && a.status === 'ready'; };
  let revision = 0;
  const changed = () => { if (!audible()) { revision++; stop(); } };
  const unsubscribe = subscribeAudio(changed);
  document.addEventListener('visibilitychange', changed);
  return {
    play(id: SoundId, options: Parameters<typeof playSound>[1] & { maxAge?: number } = {}) {
      if (!audible()) return;
      const at = performance.now(), generation = revision;
      void playSound(id, { ...options, valid: () => audible() && generation === revision && performance.now()-at < (options.maxAge ?? 350) && options.valid?.() !== false })
        .then(voice => { if (!voice) return; if (!audible() || generation !== revision) { voice.stop(0); return; } voices.add(voice); void voice.finished?.then(() => voices.delete(voice)); });
    },
    after(ms: number, action: () => void) {
      const timer = setTimeout(() => { timers.delete(timer); if (audible()) action(); }, ms); timers.add(timer);
    },
    stop() { revision++; stop(); },
    dispose() { closed = true; revision++; stop(); unsubscribe(); document.removeEventListener('visibilitychange', changed); },
  };
}
