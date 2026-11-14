import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MutableRefObject } from 'react';
import { audioSnapshot, subscribeAudio } from './mixer';
import { loadSound, playSound, type SoundId, type SoundVoice } from './sounds';

export const useAudio = () => useSyncExternalStore(subscribeAudio, audioSnapshot);
const SCAPES: SoundId[] = ['storm', 'rescue', 'memory', 'shore'];
export function useSoundscape(id: SoundId | null, running: boolean, time?: MutableRefObject<number>, resetKey = 0) {
  const audio = useAudio();
  const enabled = audio.status === 'ready' && !audio.muted && audio.volume > 0;
  const [status, setStatus] = useState<'silent' | 'loading' | 'playing' | 'failed'>('silent');
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  useEffect(() => {
    if (!id || !running || !enabled) { setStatus('silent'); return; }
    let live = true;
    let voice: SoundVoice | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function start() {
      setStatus('loading');
      voice = await playSound(id!, { loop: true, offset: () => time?.current ?? 0, valid: () => live });
      if (!live) { voice?.stop(0); return; }
      if (voice) {
        setStatus('playing');
        const index = SCAPES.indexOf(id!);
        const next = index >= 0 ? SCAPES[index + 1] : undefined;
        if (next) void loadSound(next);
      } else {
        setStatus('failed');
        timer = setTimeout(() => void start(), Math.min(30_000, 5_000 * 2 ** attempts++));
      }
    }
    void start();
    return () => { live = false; clearTimeout(timer); voice?.stop(); };
  }, [id, running, enabled, time, revision, resetKey]);
  return { status, retry };
}

export function usePrologueSound(step: number, take: number, running: boolean, time: MutableRefObject<number>) {
  const soundscape = useSoundscape(SCAPES[step], running, time, take);
  const audio = useAudio();
  const consumed = useRef('');
  useEffect(() => { consumed.current = ''; }, [step, take]);
  useEffect(() => {
    const cue: SoundId | null = step === 1 ? 'cat-call' : step === 2 ? 'glyph-break' : null;
    const key = `${step}:${take}`;
    if (!cue || !running || audio.status !== 'ready' || audio.muted || audio.volume === 0 || consumed.current === key) return;
    let live = true;
    let voice: SoundVoice | null = null;
    // The cue belongs to the reveal, not to a late network response or unmute.
    const timer = setTimeout(() => {
      consumed.current = key;
      if (time.current > 2.5) return;
      void playSound(cue, { level: cue === 'cat-call' ? 1.1 : .8, valid: () => live && time.current < 2.5 })
        .then(result => { voice = result; if (!live) voice?.stop(0); });
    }, Math.max(0, .85 - time.current) * 1000);
    return () => { live = false; clearTimeout(timer); voice?.stop(); };
  }, [step, take, running, audio.status, audio.muted, audio.volume > 0, time]);
  return soundscape;
}
