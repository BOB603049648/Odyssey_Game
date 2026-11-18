import { useCallback, useEffect, useState } from 'react';
import { PROLOGUE_ART, prologueArtId, forgetPrologueImage, loadProloguePreview, loadPrologueDetail, resolvePrologueImage } from '../content/prologueAssets';

export { PROLOGUE_ART };
type Frame = { step: number; id: string; src: string };
type Frames = { current: Frame | null; previous: Frame | null };

/** Commit a cut only after decoding; retain the preceding shot during slow
 * transfers and ignore late completions after navigation or unmount. */
export function usePrologueFrame(step: number, portrait = false) {
  const id = prologueArtId(step, portrait);
  const [frames, setFrames] = useState<Frames>(() => {
    const src = resolvePrologueImage(id);
    return { current: src ? { step, id, src } : null, previous: null };
  });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(frames.current ? 'ready' : 'loading');
  const [request, setRequest] = useState({ revision: 0, delay: 0, id });

  useEffect(() => {
    let live = true;
    let pending = false;
    let failures = 0;
    let preparing = false;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function commit(src: string) {
      setFrames(old => old.current?.id === id && old.current.src === src ? old
        : { current: { step, id, src }, previous: old.current?.id === id ? old.previous : old.current });
      setStatus('ready');
      void improve();
    }
    async function improve() {
      if (preparing) return;
      preparing = true;
      // Prepare the whole remaining sequence before spending bandwidth on
      // detail. A quality upgrade keeps the shot identity, clock and sound.
      for (let next = step + 1; next < PROLOGUE_ART.length; next++) {
        if (!live) return;
        await loadProloguePreview(prologueArtId(next, portrait), 'low').catch(() => null);
      }
      if (!live) return;
      const detail = await loadPrologueDetail(id).catch(() => null);
      if (live && detail) commit(detail);
    }
    async function attempt() {
      if (!live || pending) return;
      clearTimeout(timer);
      pending = true;
      setStatus('loading');
      let src = await loadProloguePreview(id).catch(() => null);
      // A missing lightweight derivative can recover from the original. Show
      // the retry control immediately; don't hide a long retry chain.
      if (!src && live) {
        setStatus('error');
        src = await loadPrologueDetail(id).catch(() => null);
      }
      pending = false;
      if (!live) return;
      if (src) commit(src);
      else {
        setStatus('error');
        timer = setTimeout(() => void attempt(), Math.min(30_000, 5_000 * 2 ** failures++));
      }
    }
    const cached = resolvePrologueImage(id);
    if (cached) commit(cached);
    else if (request.delay && request.id === id) {
      setStatus('error');
      timer = setTimeout(() => void attempt(), request.delay);
    } else void attempt();
    const online = () => { if (!resolvePrologueImage(id)) void attempt(); };
    window.addEventListener('online', online);
    return () => { live = false; clearTimeout(timer); window.removeEventListener('online', online); };
  }, [step, id, portrait, request]);

  // The film clock owns the dissolve. A wall timer would remove its background
  // while paused, briefly exposing black beneath the translucent incoming shot.
  const finishDissolve = useCallback(() => setFrames(old => old.previous ? { ...old, previous: null } : old), []);

  function imageFailed(failedId: string, src: string) {
    forgetPrologueImage(failedId, src);
    const fallback = resolvePrologueImage(failedId);
    if (failedId === id && fallback) {
      setFrames(old => ({ ...old, current: { step, id, src: fallback } }));
      setStatus('ready');
      return;
    }
    setFrames(old => old.current?.id === failedId
      ? { current: old.previous, previous: null }
      : { ...old, previous: null });
    if (failedId === id) {
      setStatus('error');
      setRequest(old => ({ revision: old.revision + 1, delay: 5_000, id }));
    }
  }
  const ready = status === 'ready' && frames.current?.id === id;
  return {
    ...frames, ready, finishDissolve, status: ready ? 'ready' : status === 'error' ? 'error' : 'loading',
    retry: () => setRequest(old => ({ revision: old.revision + 1, delay: 0, id })), imageFailed,
  };
}
