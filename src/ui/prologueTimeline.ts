/** One continuous opening. Times are active seconds, shared by captions,
 * camera and story transitions; loading and background tabs add no time. */
export const PROLOGUE_DURATIONS = [7.6, 7.6, 8.4, 7.4] as const;
export const PROLOGUE_DISSOLVE = 1.1;
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function prologueCaption(step: number, elapsed: number) {
  const duration = PROLOGUE_DURATIONS[step];
  const windows = [[1.15, duration * .47], [duration * .51, duration - .65]];
  const index = windows.findIndex(([start, end]) => elapsed >= start && elapsed < end);
  if (index < 0) return null;
  const [start, end] = windows[index];
  return { index, opacity: Math.min(clamp((elapsed - start) / .35), clamp((end - elapsed) / .35)) };
}

/** Small directed moves inside the painting, with no exposed image edges.
 * Storm approaches the reaching hand; rescue approaches the cat; arrival
 * slowly opens the view. The painted subjects remain inside the frame. */
export function prologueCamera(step: number, elapsed: number, reduced = false) {
  if (reduced) return { scale: 1, x: 0, y: 0 };
  const progress = clamp(elapsed / PROLOGUE_DURATIONS[step]);
  const ease = progress * progress * (3 - 2 * progress);
  const scale = step === 3 ? 1.075 - ease * .06 : 1.035 + ease * .055;
  const x = step === 0 ? -.011 * ease + Math.sin(elapsed * .55) * .0018
    : step === 1 ? .013 * ease : step === 2 ? -.004 * ease : .004 * (1 - ease);
  const y = step < 2 ? -.006 * ease + Math.sin(elapsed * 1.2) * .0018
    : step === 2 ? -.012 * ease : -.004 * (1 - ease);
  return { scale, x, y };
}
