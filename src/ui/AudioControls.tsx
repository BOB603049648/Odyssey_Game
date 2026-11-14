import { primeAudio, setAudioPreferences } from '../audio/mixer';
import { useAudio } from '../audio/useSoundscape';
import { t } from './i18n';

export function AudioToggle({ compact = false }: { compact?: boolean }) {
  const audio = useAudio();
  const blocked = audio.status === 'blocked';
  const label = audio.status === 'unavailable' ? t('audio.unavailable') : blocked ? t('audio.enable') : t(audio.muted ? 'audio.off' : 'audio.on');
  return <button type="button" className={compact ? 'prologue-text-button' : 'btn'}
    aria-label={label} aria-pressed={!audio.muted} disabled={audio.status === 'unavailable'}
    onClick={() => {
      if (blocked) { primeAudio(); return; }
      setAudioPreferences({ muted: !audio.muted });
      if (audio.muted) primeAudio();
    }}>
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
      <path d="M3 9h4l5-4v14l-5-4H3z" />
      {audio.muted ? <path d="m17 9 5 6m0-6-5 6" /> : <><path d="M16 8c2 2 2 6 0 8M19 5c4 4 4 10 0 14" /></>}
    </svg> {label}
  </button>;
}
export function AudioSettings() {
  const audio = useAudio();
  return <div className="audio-settings">
    <AudioToggle />
    <label>{t('audio.volume')}
      <input type="range" min="0" max="100" step="5" value={Math.round(audio.volume * 100)}
        aria-label={t('audio.volume')} onChange={event => { setAudioPreferences({ volume: Number(event.target.value) / 100 }); primeAudio(); }} />
      <output>{Math.round(audio.volume * 100)}%</output>
    </label>
  </div>;
}
