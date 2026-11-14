import { useCallback, useEffect, useRef } from 'react';
import type { Action } from '../core/reduce';
import type { SaveData } from '../core/schema';
import { hintTarget } from '../core/hints';

export const IDLE_HINT_MS = 20_000;

/** Passive help offers one glance. Stronger help remains an explicit request.
 * Movement reports activity without saving or resetting a timer every frame. */
export function useIdleHint(save: SaveData, dispatch: (action: Action) => void, active = true): () => void {
  const lastActivity = useRef(0);
  const activity = useCallback(() => { lastActivity.current = performance.now(); }, []);
  const target = hintTarget(save);
  useEffect(() => {
    if (!active) return undefined;
    if (save.screen === 'title' || save.screen === 'prologue') return undefined;
    if (save.overlay !== 'none' && save.overlay !== 'use-word') return undefined;
    if (!target || save.companion.level >= 1) return undefined;
    let timer = 0;
    let focused = document.hasFocus();
    const pointers = new Set<number>();
    const keys = new Set<string>();
    const movementKeys = new Set(['w', 'a', 's', 'd', 'arrowup', 'arrowdown', 'arrowleft', 'arrowright']);
    const eligible = () => focused && !document.hidden;
    const check = () => {
      if (!eligible()) return;
      const remaining = IDLE_HINT_MS - (performance.now() - lastActivity.current);
      if (pointers.size || keys.size || remaining > 0) {
        timer = window.setTimeout(check, Math.max(100, remaining, pointers.size || keys.size ? 1000 : 0));
      } else dispatch({ type: 'request-hint' });
    };
    const restart = () => {
      window.clearTimeout(timer);
      activity();
      if (eligible()) timer = window.setTimeout(check, IDLE_HINT_MS);
    };
    const down = (event: PointerEvent) => { pointers.add(event.pointerId); activity(); };
    const up = (event: PointerEvent) => { pointers.delete(event.pointerId); activity(); };
    const keyDown = (event: KeyboardEvent) => {
      if (movementKeys.has(event.key.toLowerCase())) keys.add(event.key.toLowerCase());
      activity();
    };
    const keyUp = (event: KeyboardEvent) => { keys.delete(event.key.toLowerCase()); activity(); };
    const blur = () => { focused = false; pointers.clear(); keys.clear(); window.clearTimeout(timer); };
    const focus = () => { focused = true; restart(); };
    const visibility = () => { pointers.clear(); keys.clear(); restart(); };
    document.addEventListener('pointerdown', down, true);
    window.addEventListener('pointerup', up, true);
    window.addEventListener('pointercancel', up, true);
    window.addEventListener('keydown', keyDown, true);
    window.addEventListener('keyup', keyUp, true);
    document.addEventListener('wheel', activity, { passive: true });
    document.addEventListener('visibilitychange', visibility);
    window.addEventListener('blur', blur);
    window.addEventListener('focus', focus);
    restart();
    return () => {
      window.clearTimeout(timer);
      document.removeEventListener('pointerdown', down, true);
      window.removeEventListener('pointerup', up, true);
      window.removeEventListener('pointercancel', up, true);
      window.removeEventListener('keydown', keyDown, true);
      window.removeEventListener('keyup', keyUp, true);
      document.removeEventListener('wheel', activity);
      document.removeEventListener('visibilitychange', visibility);
      window.removeEventListener('blur', blur);
      window.removeEventListener('focus', focus);
    };
  }, [active, activity, dispatch, target, save.companion.level, save.overlay, save.screen, save.currentScene, save.updatedAt]);
  return activity;
}
