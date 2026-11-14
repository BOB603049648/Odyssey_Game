import { useEffect, useRef, useState } from 'react';
import { usePrologueSound } from '../audio/useSoundscape';
import { AudioToggle } from './AudioControls';
import { PrologueMotion } from './PrologueMotion';
import { PROLOGUE_DURATIONS, useCinematicClock, usePagePresentation } from './useCinematicClock';
import { firstScreenAssetIds } from '../content/firstScreen';
import { loadNamedAsset } from '../content/imageLoad';
import { t, type MessageKey } from './i18n';
import { PROLOGUE_ART, usePrologueFrame } from './usePrologueFrame';
import './prologue.css';

const LINES: MessageKey[] = ['prologue.0', 'prologue.1', 'prologue.2', 'prologue.3'];
const TITLES: MessageKey[] = ['prologue.title.storm', 'prologue.title.dark', 'prologue.title.break', 'prologue.title.tide'];
const ALTS: MessageKey[] = ['prologue.alt.storm', 'prologue.alt.dark', 'prologue.alt.break', 'prologue.alt.tide'];

export function PrologueScreen({ step, onAdvance, onBack, onSkip }: {
  step: number; onAdvance: () => void; onBack?: () => void; onSkip?: () => void;
}) {
  const requested = Math.min(3, Math.max(0, step));
  const stage = useRef<HTMLDivElement>(null);
  // Choose the composition that occupies more of the actual picture area.
  // Both are complete paintings; rotation never crops the rescue or the scroll.
  const [portrait, setPortrait] = useState(() => window.innerWidth / Math.max(1, window.innerHeight - 316) < 1.09);
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
  const [automatic, setAutomatic] = useState(false);
  const [take, setTake] = useState(0);
  const { visible, reduced } = usePagePresentation();
  const playing = !paused && visible && frame.ready;
  const clock = useCinematicClock(shown, take, playing);
  const sound = usePrologueSound(shown, take, playing, clock.time);
  // Ignore duplicate activation before React commits the new story step.
  const activated = useRef<number | null>(null);
  useEffect(() => { activated.current = null; }, [requested]);
  const advance = () => {
    if (!frame.ready || activated.current === requested) return;
    activated.current = requested;
    onAdvance();
  };
  useEffect(() => {
    if (automatic && playing && clock.time.current >= PROLOGUE_DURATIONS[shown]) advance();
  });
  useEffect(() => {
    if (requested !== 3) return;
    for (const id of firstScreenAssetIds('dba.scene.shore', 'land-companion', true)) {
      void loadNamedAsset(id).catch(() => null);
    }
  }, [requested]);
  useEffect(() => {
    function keydown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey) return;
      const target = event.target instanceof HTMLElement ? event.target : null;
      if (target?.closest('input, textarea, select, [contenteditable="true"]')) return;
      if (event.repeat && ['ArrowLeft', 'ArrowRight', 'Enter', ' '].includes(event.key)) {
        event.preventDefault(); return;
      }
      if (event.key === 'ArrowLeft' && requested > 0 && onBack) {
        event.preventDefault(); onBack();
      } else if (event.key === 'ArrowRight' ||
        (['Enter', ' '].includes(event.key) && !target?.closest('button, a, [role="button"]'))) {
        event.preventDefault(); advance();
      }
    }
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  });

  return (
    <section className="prologue cinematic-prologue" data-testid="prologue"
      data-prologue-step={requested} data-displayed-step={frame.current?.step ?? 'none'}
      data-playing={playing} data-auto={automatic} data-audio={sound.status}
      data-still={PROLOGUE_ART[requested]} data-frame-status={frame.status} data-mood={shown}
      aria-label={t('scene.prologue')}>
      <header className="prologue-header">
        <span className="prologue-chapter">{t('prologue.chapter')}</span>
        {onSkip && <button type="button" className="prologue-text-button" onClick={onSkip}>{t('prologue.skip')}</button>}
        <div className="prologue-transport" aria-label={t('prologue.playback')}>
          <button type="button" className="prologue-text-button" aria-pressed={paused} onClick={() => setPaused(value => !value)}>
            {t(paused ? 'prologue.play' : 'prologue.pause')}
          </button>
          <button type="button" className="prologue-text-button" aria-pressed={automatic} onClick={() => setAutomatic(value => !value)}>{t('prologue.auto')}</button>
          <button type="button" className="prologue-text-button" onClick={() => { setTake(value => value + 1); setPaused(false); }}>{t('prologue.replay')}</button>
          <AudioToggle compact />
        </div>
        {sound.status === 'failed' && <div className="prologue-audio-note" role="status">{t('audio.failed')} <button type="button" onClick={sound.retry}>{t('audio.retry')}</button></div>}
      </header>
      <div className="prologue-stage" ref={stage} aria-busy={!frame.ready}>
        {frame.current && <div className="prologue-ambience" aria-hidden="true"
          style={{ backgroundImage: `url("${frame.current.src}")` }} />}
        {frame.previous && <div className="prologue-shot prologue-shot-out" key={`old-${frame.previous.id}`} aria-hidden="true">
          <img src={frame.previous.src} alt="" draggable={false} onError={() => frame.imageFailed(frame.previous!.id)} />
        </div>}
        {frame.current && <div className="prologue-shot prologue-shot-in" key={frame.current.id}
          data-testid="still-frame" data-art-id={PROLOGUE_ART[frame.current.step]} data-composition={frame.current.id.endsWith('.portrait') ? 'portrait' : 'landscape'}>
          <PrologueMotion src={frame.current.src} step={shown} portrait={frame.current.id.endsWith('.portrait')}
            active={playing} reduced={reduced} time={clock.time} alt={t(ALTS[shown])}
            onError={() => frame.imageFailed(frame.current!.id)} />
        </div>}
        <span className="prologue-atmosphere" aria-hidden="true" />
        {!frame.ready && <div className="prologue-load" role="status">
          <p>{t(frame.status === 'error' ? 'prologue.load.error' : 'prologue.load.pending')}</p>
          {frame.status === 'error' && <button type="button" className="btn" onClick={frame.retry}>{t('prologue.retry')}</button>}
        </div>}
      </div>
      <footer className="prologue-footer">
        <div className="prologue-narration" aria-live="polite" aria-atomic="true" key={shown} data-caption={LINES[shown]}>
          <p className="prologue-act"><span aria-hidden="true">0{shown + 1}</span> {t(TITLES[shown])}</p>
          <p className="prologue-line">{t(LINES[shown])}</p>
          {shown === 3 && <p className="prologue-arrival">{t('prologue.arrival')}</p>}
        </div>
        <nav className="prologue-controls" aria-label={t('prologue.controls')}>
          <button type="button" className="prologue-text-button prologue-back" disabled={requested === 0 || !onBack} onClick={onBack}>
            <span aria-hidden="true">← </span>{t('prologue.back')}
          </button>
          <ol className="prologue-progress" aria-label={`${t('prologue.progress')} ${shown + 1} / 4`}>
            {PROLOGUE_ART.map((id, index) => <li key={id} aria-current={index === shown ? 'step' : undefined}
              data-past={index < shown}><i aria-hidden="true" style={{ transform: `scaleX(${index === shown ? Math.min(1, clock.elapsed / PROLOGUE_DURATIONS[shown]) : 0})` }} /><span className="sr-only">{t(TITLES[index])}</span></li>)}
          </ol>
          <button type="button" className="prologue-next" disabled={!frame.ready} onClick={advance}>
            {t(requested >= 3 ? 'menu.ashore' : 'menu.next')}<span aria-hidden="true"> →</span>
          </button>
        </nav>
        <p className="prologue-keys" aria-hidden="true">{t('prologue.keys')}</p>
      </footer>
    </section>
  );
}
