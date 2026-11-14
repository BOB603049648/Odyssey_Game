import { useEffect, useRef } from 'react';
import type { SaveData } from '../core/schema';
import { useAudio } from './useSoundscape';
import { soundScope } from './soundScope';
import { gameCues } from './gameCues';
import { loadSound } from './sounds';

export function useGameAudio(save: SaveData, active: boolean, visible: boolean, generation = 0) {
  const audio = useAudio();
  const previous = useRef(save);
  const epoch = useRef(generation);
  const owner = useRef<ReturnType<typeof soundScope> | null>(null);
  const enabled = active && visible && audio.status === 'ready' && !audio.muted && audio.volume > 0;
  useEffect(() => {
    if (!enabled) return;
    const scope = soundScope(); owner.current = scope;
    for (const id of ['select','answer-right','answer-wrong','word-learn','milestone','pickup','paper','cat-call','cat-purr','wood-creak'] as const) void loadSound(id);
    return () => { scope.dispose(); owner.current = null; };
  }, [enabled]);
  useEffect(() => {
    const old = previous.current; previous.current = save;
    if (epoch.current !== generation) { epoch.current = generation; owner.current?.stop(); return; }
    const scope = owner.current;
    if (!enabled || !scope) return;
    // A new operation retires deferred accents from the preceding one.
    scope.stop();
    for (const cue of gameCues(old,save)) {
      const play = () => scope.play(cue.id, { level: cue.level, maxAge: 450 });
      if (cue.delay) scope.after(cue.delay,play); else play();
    }
  }, [save, enabled, generation]);
}
