import { useEffect } from 'react';
import type { Action } from '../core/reduce';
import type { SaveData } from '../core/schema';

export const IDLE_HINT_MS = 20_000;

export function useIdleHint(save: SaveData, dispatch: (action: Action) => void): void {
  useEffect(() => {
    if (save.screen === 'title' || save.screen === 'prologue') return undefined;
    if (save.overlay === 'depart' || save.overlay === 'memory' || save.overlay === 'settings') return undefined;
    if (save.companion.level >= 3) return undefined;
    const timer = window.setTimeout(() => dispatch({ type: 'request-hint' }), IDLE_HINT_MS);
    return () => window.clearTimeout(timer);
  }, [dispatch, save.companion.level, save.overlay, save.screen, save.updatedAt]);
}
