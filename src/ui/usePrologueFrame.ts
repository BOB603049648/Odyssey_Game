import { useEffect, useState } from 'react';
import { forgetSlotAsset, loadSlotAsset, resolveSlotAsset } from '../content/slotAssets';

export const PROLOGUE_ART = ['art.pro.storm', 'art.pro.dark', 'art.pro.break', 'art.pro.tide'] as const;
type Frame = { step: number; id: string; src: string };
const artId = (step: number, portrait: boolean) => PROLOGUE_ART[step] + (portrait ? '.portrait' : '');
type Frames = { current: Frame | null; previous: Frame | null };

/** Commit a cut only after decoding; retain the preceding shot during slow
 * transfers and ignore late completions after navigation or unmount. */
export function usePrologueFrame(step: number, portrait = false) {
  const id = artId(step, portrait);
  const [frames, setFrames] = useState<Frames>(() => {
    const src = resolveSlotAsset(id);
    return { current: src ? { step, id, src } : null, previous: null };
  });
  const [status, setStatus] = useState<'loading' | 'ready' | 'error'>(frames.current ? 'ready' : 'loading');
  const [request, setRequest] = useState({ revision: 0, delay: 0, id });

  useEffect(() => {
    let live = true;
    let pending = false;
    let failures = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    function commit(src: string) {
      setFrames(old => old.current?.id === id && old.current.src === src ? old
        : { current: { step, id, src }, previous: old.current });
      setStatus('ready');
      const next = step < 3 ? artId(step + 1, portrait) : null;
      if (next) void loadSlotAsset(next).catch(() => null);
    }
    async function attempt() {
      if (!live || pending) return;
      clearTimeout(timer);
      pending = true;
      setStatus('loading');
      const src = await loadSlotAsset(id).catch(() => null);
      pending = false;
      if (!live) return;
      if (src) commit(src);
      else {
        setStatus('error');
        timer = setTimeout(() => void attempt(), Math.min(30_000, 5_000 * 2 ** failures++));
      }
    }
    const cached = resolveSlotAsset(id);
    if (cached) commit(cached);
    else if (request.delay && request.id === id) {
      setStatus('error');
      timer = setTimeout(() => void attempt(), request.delay);
    } else void attempt();
    const online = () => { if (!resolveSlotAsset(id)) void attempt(); };
    window.addEventListener('online', online);
    return () => { live = false; clearTimeout(timer); window.removeEventListener('online', online); };
  }, [step, id, portrait, request]);

  useEffect(() => {
    if (!frames.previous) return;
    const timer = setTimeout(() => setFrames(old => ({ ...old, previous: null })), 700);
    return () => clearTimeout(timer);
  }, [frames.current, frames.previous]);

  function imageFailed(failedId: string) {
    forgetSlotAsset(failedId);
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
    ...frames, ready, status: ready ? 'ready' : status === 'error' ? 'error' : 'loading',
    retry: () => setRequest(old => ({ revision: old.revision + 1, delay: 0, id })), imageFailed,
  };
}
