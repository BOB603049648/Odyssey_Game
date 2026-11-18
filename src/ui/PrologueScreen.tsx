import { useEffect, useRef, useState } from 'react';
import { usePrologueSound } from '../audio/useSoundscape';
import { AudioToggle } from './AudioControls';
import { PrologueMotion } from './PrologueMotion';
import { useCinematicClock, usePagePresentation } from './useCinematicClock';
import { PROLOGUE_DISSOLVE, PROLOGUE_DURATIONS, prologueCaption } from './prologueTimeline';
import { firstScreenAssetIds } from '../content/firstScreen';
import { loadNamedAsset } from '../content/imageLoad';
import { initialProloguePortrait } from '../content/prologueAssets';
import { t, type MessageKey } from './i18n';
import { PROLOGUE_ART, usePrologueFrame } from './usePrologueFrame';
import './prologue.css';

const LINES: MessageKey[] = ['prologue.0', 'prologue.1', 'prologue.2', 'prologue.3'];
const ALTS: MessageKey[] = ['prologue.alt.storm', 'prologue.alt.dark', 'prologue.alt.break', 'prologue.alt.tide'];
const clamp = (value: number) => Math.max(0, Math.min(1, value));

export function PrologueScreen({ step, onAdvance, onReplay, onSkip, skipLabel = 'prologue.skip' }: {
  step: number; onAdvance: () => void; onReplay?: () => void; onSkip?: () => void; skipLabel?: MessageKey;
}) {
  const requested = Math.min(3, Math.max(0, step));
  const stage = useRef<HTMLDivElement>(null);
  // Each orientation has a complete painting. Do not crop away the rescue
  // to force a wide shot into a phone; use the authored tall composition.
  const [portrait, setPortrait] = useState(initialProloguePortrait);
  useEffect(() => {
    if (!stage.current || typeof ResizeObserver === 'undefined') return;
    const observer = new ResizeObserver(([entry]) => {
      if (entry.contentRect.height > 0) setPortrait(entry.contentRect.width / entry.contentRect.height < 1.09);
    });
    observer.observe(stage.current);
    return () => observer.disconnect();
  }, []);
  const frame = usePrologueFrame(requested, portrait);
  const shown = frame.current?.step ?? requested;
  const [paused, setPaused] = useState(false);
  const [take, setTake] = useState(0);
  const { visible, reduced } = usePagePresentation();
  const playing = !paused && visible && frame.ready;
  const clock = useCinematicClock(shown, take, playing);
  // Hold the old ambience with the old painting during decoding; don't insert
  // an audible stop/start between two ready shots.
  const sound = usePrologueSound(shown, take, !paused && visible && !!frame.current, clock.time);
  const caption = prologueCaption(shown, clock.elapsed);
  const activated = useRef<number | null>(null);
  useEffect(() => { activated.current = null; }, [requested, take]);
  useEffect(() => {
    if (!playing || clock.elapsed < PROLOGUE_DURATIONS[shown] || activated.current === requested) return;
    activated.current = requested;
    onAdvance();
  }, [playing, clock.elapsed, shown, requested, onAdvance]);
  useEffect(() => {
    if (frame.previous && (reduced || clock.elapsed >= PROLOGUE_DISSOLVE)) frame.finishDissolve();
  }, [frame.previous, frame.finishDissolve, reduced, clock.elapsed]);
  useEffect(() => {
    // Prepare landing while the memory plays, not after the last shot ends.
    if (requested < 2 || !frame.ready) return;
    for (const id of firstScreenAssetIds('dba.scene.shore', 'land-companion', true)) {
      void loadNamedAsset(id).catch(() => null);
    }
  }, [requested, frame.ready]);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.repeat && ['Enter', ' '].includes(event.key)) { event.preventDefault(); return; }
      if (event.key === ' ' && !target?.closest('button, a, [role="button"]')) {
        event.preventDefault(); setPaused(value => !value);
      }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, []);
  const replay = () => { setTake(value => value + 1); setPaused(false); onReplay?.(); };
  const opacity = reduced ? 1 : clamp(clock.elapsed / PROLOGUE_DISSOLVE);
  const ending = shown === 3 ? clamp((clock.elapsed - PROLOGUE_DURATIONS[3] + .7) / .7) : 0;

  return (
    <section className="prologue cinematic-prologue" data-testid="prologue"
      data-prologue-step={requested} data-displayed-step={frame.current?.step ?? 'none'}
      data-elapsed={clock.elapsed.toFixed(2)}
      data-playing={playing} data-paused={paused} data-auto="true" data-audio={sound.status}
      data-still={PROLOGUE_ART[requested]} data-frame-status={frame.status} data-mood={shown}
      aria-label={t('scene.prologue')}>
      <div className="prologue-stage" ref={stage} aria-busy={!frame.ready}>
        {[frame.previous, frame.current].map(shot => shot && <div key={shot.id}
          className={`prologue-shot ${shot === frame.current ? 'prologue-shot-in' : 'prologue-shot-out'}`}
          aria-hidden={shot !== frame.current || undefined}
          style={{ opacity: shot === frame.current ? opacity : 1 }}
          data-testid={shot === frame.current ? 'still-frame' : undefined}
          data-art-id={PROLOGUE_ART[shot.step]} data-composition={shot.id.endsWith('.portrait') ? 'portrait' : 'landscape'}>
          <PrologueMotion src={shot.src} step={shot.step} portrait={shot.id.endsWith('.portrait')}
            active={shot === frame.current && playing} reduced={reduced} time={clock.time} alt={shot === frame.current ? t(ALTS[shown]) : ''}
            onError={() => frame.imageFailed(shot.id, shot.src)} />
        </div>)}
        <span className="prologue-atmosphere" aria-hidden="true" />
        <span className="prologue-curtain" aria-hidden="true" style={{ opacity: ending }} />
        {!frame.ready && <div className="prologue-load" role="status">
          <p>{t(frame.status === 'error' ? 'prologue.load.error' : 'prologue.load.pending')}</p>
          {frame.status === 'error' && <button type="button" className="btn" onClick={frame.retry}>{t('prologue.retry')}</button>}
        </div>}
      </div>
      <header className="prologue-header">
        <span className="prologue-chapter" aria-hidden="true" style={{ opacity: shown === 0 ? clamp((4.5 - clock.elapsed) / 1.2) : 0 }}>{t('prologue.chapter')}</span>
        <div className="prologue-transport" role="group" aria-label={t('prologue.playback')}>
          <button type="button" className="prologue-text-button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
            <svg viewBox="0 0 20 20" aria-hidden="true">{paused ? <path d="m7 4 9 6-9 6Z" /> : <path d="M6 4v12M14 4v12" />}</svg>
            {t(paused ? 'prologue.play' : 'prologue.pause')}
          </button>
          {onReplay && <button type="button" className="prologue-text-button" onClick={replay}>{t('prologue.replay')}</button>}
          <AudioToggle compact />
          {onSkip && <button type="button" className="prologue-text-button prologue-skip" onClick={onSkip}>{t(skipLabel)}</button>}
        </div>
        {sound.status === 'failed' && <div className="prologue-audio-note" role="status">{t('audio.failed')} <button type="button" onClick={sound.retry}>{t('audio.retry')}</button></div>}
      </header>
      <div className="prologue-narration" data-caption={LINES[shown]} aria-live="polite" aria-atomic="true">
        {caption && <p className="prologue-line" key={`${shown}:${caption.index}`} style={{ opacity: reduced ? 1 : caption.opacity }}>{t(LINES[shown]).split('\n')[caption.index]}</p>}
      </div>
      {paused && <p className="prologue-paused">{t('prologue.paused')}</p>}
    </section>
  );
}
