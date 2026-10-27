import { useEffect, useRef, useState } from 'react';
import { playPurr, playThunk } from '../audio/placeholder';
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
    if (feedback.kind === 'ok') {
      playPurr();
      setPurr(true);
      const timer = window.setTimeout(() => setPurr(false), 560);
      return () => window.clearTimeout(timer);
    }
    if (feedback.kind === 'no') {
      playThunk();
      setShake(true);
      const timer = window.setTimeout(() => setShake(false), 420);
      return () => window.clearTimeout(timer);
    }
    return undefined;
  }, [feedback.seq, feedback.kind]);

  return { shake, purr };
}
