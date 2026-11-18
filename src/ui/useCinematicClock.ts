import { useEffect, useRef, useState } from 'react';

export { PROLOGUE_DURATIONS } from './prologueTimeline';
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
  const key = `${step}:${take}`;
  const [sample, setSample] = useState({ key, elapsed: 0 });
  useEffect(() => { time.current = 0; setSample({ key, elapsed: 0 }); }, [key]);
  useEffect(() => {
    if (!active) return;
    let frame = 0;
    let previous = performance.now();
    let published = previous;
    function tick(now: number) {
      time.current += Math.min(.1, Math.max(0, (now - previous) / 1000));
      previous = now;
      if (now - published >= 40) { setSample({ key, elapsed: time.current }); published = now; }
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [key, active]);
  return { time, elapsed: sample.key === key ? sample.elapsed : 0 };
}
