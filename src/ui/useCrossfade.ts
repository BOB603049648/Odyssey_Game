import { useEffect, useState } from 'react';

const FADE_MS = 520;

export function useCrossfade(key: string, ms = FADE_MS) {
  const [current, setCurrent] = useState(key);
  const [previous, setPrevious] = useState<string | null>(null);
  if (key !== current) {
    setPrevious(current);
    setCurrent(key);
  }

  useEffect(() => {
    if (!previous) return undefined;
    const id = window.setTimeout(() => setPrevious(null), ms);
    return () => window.clearTimeout(id);
  }, [current, previous, ms]);

  return { current, previous };
}

export function useFadePresence(open: boolean, ms = 340) {
  const [mounted, setMounted] = useState(open);
  const [phase, setPhase] = useState<'in' | 'out'>(open ? 'in' : 'out');

  if (open && (!mounted || phase === 'out')) {
    setMounted(true);
    setPhase('in');
  }

  useEffect(() => {
    if (open || !mounted) return;
    setPhase('out');
    const id = window.setTimeout(() => setMounted(false), ms);
    return () => window.clearTimeout(id);
  }, [open, mounted, ms]);

  return { mounted, phase };
}
