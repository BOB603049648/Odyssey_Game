import { t } from './i18n';
import type { FirstScreenStatus } from './firstScreenReady';

export function FirstScreenGate({
  state,
  done,
  total,
  onRetry,
}: {
  state: FirstScreenStatus;
  done: number;
  total: number;
  onRetry: () => void;
}) {
  if (state === 'ready') return null;
  if (state === 'failed') {
    return (
      <div className="scene-display" data-display="failed" role="alert">
        <p>{t('scene.loadFailed')}</p>
        <button type="button" className="btn" onClick={onRetry}>
          {t('scene.retry')}
        </button>
      </div>
    );
  }
  return (
    <div className="scene-display" data-display="loading" aria-busy="true">
      <p>
        {t('scene.loading')}
        {total > 0 ? ` ${done}/${total}` : ''}
      </p>
    </div>
  );
}
