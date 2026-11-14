import { useCallback, useEffect, useRef, useState } from 'react';

export type CharacterAction = 'reach' | 'drink' | 'rest';
export const ACTION_DURATION = { reach: 1200, drink: 1800, rest: 2550 } as const;
export const REST_LOWER_MS = 1250;
export const REST_HOLD_MS = 600;
export const REST_RISE_MS = 700;
export function actionPhase(kind: CharacterAction | null, elapsed: number) {
  if (!kind || elapsed >= ACTION_DURATION[kind]) return { pose: 'auto' as const, elapsed: 0 };
  if (kind === 'rest') return elapsed < REST_LOWER_MS + REST_HOLD_MS
    ? { pose: 'lie' as const, elapsed: Math.min(REST_LOWER_MS, elapsed) }
    : { pose: 'rise' as const, elapsed: elapsed - REST_LOWER_MS - REST_HOLD_MS };
  return { pose: kind, elapsed };
}

/** One active-time owner for both pose selection and displayed animation frames.
 * Restarting the RAF on resume excludes time spent in menus or background tabs. */
export function useCharacterAction(active: boolean, scene: string) {
  const current = useRef({ kind: null as CharacterAction | null, elapsed: 0, sequence: 0 });
  const [state, setState] = useState(current.current);
  const publish = useCallback(() => setState({ ...current.current }), []);
  const begin = useCallback((kind: CharacterAction) => {
    current.current = { kind, elapsed: 0, sequence: current.current.sequence + 1 }; publish();
  }, [publish]);
  const cancel = useCallback(() => {
    if (!current.current.kind) return;
    current.current = { ...current.current, kind: null, elapsed: 0 }; publish();
  }, [publish]);
  useEffect(() => { cancel(); }, [scene, cancel]);
  useEffect(() => {
    if (!active) return;
    let raf = 0, previous = performance.now();
    const tick = (now: number) => {
      const dt = Math.max(0, now - previous); previous = now;
      if (current.current.kind) {
        current.current.elapsed += dt;
        if (current.current.elapsed >= ACTION_DURATION[current.current.kind]) current.current.kind = null;
        publish();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [active, publish]);
  return { ...state, ...actionPhase(state.kind, state.elapsed), begin, cancel, current };
}
