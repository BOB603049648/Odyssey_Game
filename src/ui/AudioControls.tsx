import { primeAudio, setAudioPreferences } from '../audio/mixer';
import { playAudioTest } from '../audio/placeholder';
import { useAudio } from '../audio/useSoundscape';
import { t } from './i18n';

export function AudioToggle({ compact = false }: { compact?: boolean }) {
  const audio = useAudio();
  const off = audio.muted || audio.volume === 0;
  const ready = audio.status === 'ready' && !off;
  const label = off ? t('audio.off') : audio.status === 'ready' ? t('audio.on')
    : audio.status === 'unavailable' ? t('audio.retry') : t('audio.enable');
  return <button type="button" className={compact ? 'prologue-text-button' : 'btn'}
    aria-label={label} aria-pressed={ready} data-audio-status={audio.status}
    onClick={() => {
      if (ready) setAudioPreferences({ muted: true });
      else { setAudioPreferences({ muted: false, volume: audio.volume || .7 }); void primeAudio(); }
    }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 9h4l5-4v14l-5-4H3z" />
      {!ready ? <path d="m17 9 5 6m0-6-5 6" /> : <><path d="M16 8c2 2 2 6 0 8M19 5c4 4 4 10 0 14" /></>}
    </svg> {label}
  </button>;
}
export function AudioSettings() {
  const audio = useAudio();
  return <div className="audio-settings">
    <AudioToggle />
    <label>{t('audio.volume')}
      <input type="range" min="0" max="100" step="5" value={Math.round(audio.volume * 100)}
        aria-label={t('audio.volume')} onChange={event => { setAudioPreferences({ muted: false, volume: Number(event.target.value) / 100 }); void primeAudio(); }} />
      <output>{Math.round(audio.volume * 100)}%</output>
    </label>
    <button type="button" className="btn" onClick={() => {
      setAudioPreferences({ muted: false, volume: audio.volume || .7 });
      void primeAudio().then(ready => { if (ready) playAudioTest(); });
    }}>{t('audio.test')}</button>
    <p className="audio-help">{t('audio.testHelp')}</p>
  </div>;
}

export function AudioRecoveryNotice({ failed = false, retry }: { failed?: boolean; retry?: () => void }) {
  const audio = useAudio();
  if (audio.muted || audio.volume === 0) return null;
  const blocked = audio.status === 'blocked' || audio.status === 'unavailable';
  if (!blocked && !failed) return null;
  return <div className="audio-recovery-note" role="status">
    <span>{t(blocked ? 'audio.paused' : 'audio.failed')}</span>
    {blocked ? <AudioToggle compact /> : <button type="button" onClick={retry}>{t('audio.retry')}</button>}
  </div>;
}
