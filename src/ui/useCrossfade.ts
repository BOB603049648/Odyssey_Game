import { useEffect, useRef, useState } from 'react';

const FADE_MS = 520;

export function useCrossfade(key: string, ms = FADE_MS) {
  const seen = useRef(key);
  const [current, setCurrent] = useState(key);
  const [previous, setPrevious] = useState<string | null>(null);

  useEffect(() => {
    if (key === seen.current) return;
    const outgoing = seen.current;
    seen.current = key;
    setPrevious(outgoing);
    setCurrent(key);
    const id = window.setTimeout(() => setPrevious(null), ms);
    return () => window.clearTimeout(id);
  }, [key, ms]);

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
