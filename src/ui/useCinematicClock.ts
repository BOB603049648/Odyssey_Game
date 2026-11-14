import { useEffect, useRef, useState } from 'react';

export const PROLOGUE_DURATIONS = [9, 10, 9, 10] as const;
export function usePagePresentation() {
  const [visible, setVisible] = useState(() => !document.hidden);
  const [reduced, setReduced] = useState(() => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false);
  useEffect(() => {
    const visibility = () => setVisible(!document.hidden);
    const media = window.matchMedia?.('(prefers-reduced-motion: reduce)');
    const preference = () => setReduced(media?.matches ?? false);
    document.addEventListener('visibilitychange', visibility);
    media?.addEventListener?.('change', preference);
    return () => { document.removeEventListener('visibilitychange', visibility); media?.removeEventListener?.('change', preference); };
  }, []);
  return { visible, reduced };
}

/** Only active time counts. Pauses, hidden tabs and undecoded shots add no time. */
export function useCinematicClock(step: number, take: number, active: boolean) {
  const time = useRef(0);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => { time.current = 0; setElapsed(0); }, [step, take]);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let previous = performance.now();
    let published = previous;
    function tick(now: number) {
      time.current += Math.min(.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      if (now - published >= 80) { setElapsed(time.current); published = now; }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step, take, active]);
  return { time, elapsed };
}
