// Compatibility exports for existing interaction feedback. All sound shares the mixer.
import { audibleGraph } from './mixer';
import { playSound, type SoundId, type SoundVoice } from './sounds';
export { primeAudio } from './mixer';

function tone(start: number, end: number, duration: number, gainValue: number, delay = 0): void {
  const graph = audibleGraph();
  if (!graph) return;
  const ctx = graph.context;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(start, ctx.currentTime + delay);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, end), ctx.currentTime + delay + duration);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + delay + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(graph.master);
  osc.onended = () => { osc.disconnect(); gain.disconnect(); };
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.02);
}

function ownedCue(id: SoundId): () => void {
  let live = true;
  let voice: SoundVoice | null = null;
  const stop = () => { live = false; voice?.stop(); document.removeEventListener('visibilitychange', hidden); };
  const hidden = () => { if (document.hidden) stop(); };
  document.addEventListener('visibilitychange', hidden);
  void playSound(id, { valid: () => live }).then(result => { voice = result; if (!live) voice?.stop(0); });
  return stop;
}

export const playMeow = () => ownedCue('cat-call');
export const playPurr = () => ownedCue('cat-purr');

export function playThunk(): void {
  tone(180, 70, 0.08, 0.03);
}

/** A recognizable output check that also works if scene MP3 loading fails. */
export function playAudioTest(): void {
  tone(523, 523, .28, .22);
  tone(784, 784, .38, .22, .32);
}
