import { GlossSwitch } from './GlossSwitch';
import { t } from './i18n';

export function TitleScreen({
  canContinue,
  showGloss,
  onNew,
  onContinue,
  onToggleGloss,
}: {
  canContinue: boolean;
  showGloss: boolean;
  onNew: () => void;
  onContinue: () => void;
  onToggleGloss: (value: boolean) => void;
}) {
  return (
    <section className="title-screen">
      <p className="eyebrow">{t('scene.prologue')}</p>
      <div className="title-block">
        <h1>{t('meta.title')}</h1>
        <p className="latin-title" aria-hidden="true">
          <span />
          Odyssey
          <span />
        </p>
        <p className="tagline">{t('meta.tagline')}</p>
        <div className="row">
          <button type="button" className="btn primary" onClick={onNew}>
            {t('menu.newGame')}
          </button>
          <button type="button" className="btn" onClick={onContinue} disabled={!canContinue}>
            {t('menu.continue')}
          </button>
        </div>
        <GlossSwitch checked={showGloss} onChange={onToggleGloss} />
      </div>
    </section>
  );
}
