import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type MutableRefObject } from 'react';
import { audioSnapshot, subscribeAudio, initializeAudioPreferences } from './mixer';
import { loadSound, playSound, soundChannel, type SoundId, type SoundVoice } from './sounds';

export function useAudio(active = true) {
  const audio = useSyncExternalStore(subscribeAudio, audioSnapshot);
  useEffect(() => { if (active) initializeAudioPreferences(); }, [active]);
  return audio;
}
const SCAPES: SoundId[] = ['storm', 'rescue', 'memory', 'shore'];
export function useSoundscape(id: SoundId | null, running: boolean, time?: MutableRefObject<number>, resetKey = 0, loop = true, dissolve = 0) {
  const audio = useAudio();
  const enabled = audio.status === 'ready' && !audio.muted && audio.volume > 0 && (audio[id ? soundChannel(id) : 'ambience'] ?? 1) > 0;
  const [status, setStatus] = useState<'silent' | 'loading' | 'playing' | 'failed'>('silent');
  const [revision, setRevision] = useState(0);
  const retry = useCallback(() => setRevision(value => value + 1), []);
  const latest = useRef({ id, running, enabled, resetKey });
  latest.current = { id, running, enabled, resetKey };
  useEffect(() => {
    if (!id || !running || !enabled) { setStatus('silent'); return; }
    let live = true;
    let voice: SoundVoice | null = null;
    let timer: ReturnType<typeof setTimeout> | undefined;
    let attempts = 0;
    async function start() {
      setStatus('loading');
      voice = await playSound(id!, { loop, offset: () => time?.current ?? 0, valid: () => live, fadeIn: dissolve || undefined });
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
    return () => {
      live = false; clearTimeout(timer);
      const next = latest.current;
      // Only scene cuts overlap. Pause, mute, replay and unmount stop promptly.
      const cutting = next.id !== id && next.running && next.enabled && next.resetKey === resetKey;
      voice?.stop(cutting && dissolve ? dissolve : .14);
    };
  }, [id, running, enabled, time, revision, resetKey, loop, dissolve]);
  return { status, retry };
}

export function usePrologueSound(step: number, take: number, running: boolean, time: MutableRefObject<number>) {
  const soundscape = useSoundscape(SCAPES[step], running, time, take, true, 1.1);
  const audio = useAudio();
  const consumed = useRef('');
  useEffect(() => { consumed.current = ''; }, [step, take]);
  useEffect(() => {
    const cue: SoundId | null = step === 1 ? 'cat-call' : step === 2 ? 'glyph-break' : null;
    const key = `${step}:${take}`;
    if (!cue || !running || audio.status !== 'ready' || audio.muted || audio.volume === 0 || consumed.current === key) return;
    // Prepare only this reveal's cue; island interaction sounds wait until
    // landing. Starting at reveal time would spend its short window fetching.
    void loadSound(cue);
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
