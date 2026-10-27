let context: AudioContext | null = null;

function audio(): AudioContext | null {
  const Ctx =
    window.AudioContext ??
    (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return null;
  if (!context) context = new Ctx();
  if (context.state === 'suspended') void context.resume();
  return context;
}

function tone(start: number, end: number, duration: number, gainValue: number, delay = 0): void {
  const ctx = audio();
  if (!ctx) return;
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(start, ctx.currentTime + delay);
  osc.frequency.exponentialRampToValueAtTime(Math.max(40, end), ctx.currentTime + delay + duration);
  gain.gain.setValueAtTime(0.0001, ctx.currentTime + delay);
  gain.gain.exponentialRampToValueAtTime(gainValue, ctx.currentTime + delay + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + duration);
  osc.connect(gain);
  gain.connect(ctx.destination);
  osc.start(ctx.currentTime + delay);
  osc.stop(ctx.currentTime + delay + duration + 0.02);
}

export function primeAudio(): void {
  audio();
}

export function playMeow(): void {
  tone(620, 340, 0.16, 0.05);
  tone(540, 240, 0.22, 0.04, 0.18);
}

export function playPurr(): void {
  tone(90, 70, 0.18, 0.03);
  tone(110, 80, 0.16, 0.02, 0.16);
}

export function playThunk(): void {
  tone(180, 70, 0.08, 0.03);
}
