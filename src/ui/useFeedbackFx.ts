import { useEffect, useRef, useState } from 'react';
import type { SaveData } from '../core/schema';

export function useFeedbackFx(feedback: SaveData['feedback']): { shake: boolean; purr: boolean } {
  const [shake, setShake] = useState(false);
  const [purr, setPurr] = useState(false);
  const skip = useRef(true);

  useEffect(() => {
    if (skip.current) {
      skip.current = false;
      return;
    }
    // The previous timer is cancelled when feedback changes. Clear both effects
    // first so a quick wrong→right answer cannot leave the old effect latched.
    setShake(false);
    setPurr(false);
    if (feedback.kind === 'ok') {
      setPurr(true);
      const timer = window.setTimeout(() => setPurr(false), 560);
      return () => window.clearTimeout(timer);
    }
    if (feedback.kind === 'no') {
      setShake(true);
      const timer = window.setTimeout(() => setShake(false), 420);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [feedback.seq, feedback.kind]);

  return { shake, purr };
}
