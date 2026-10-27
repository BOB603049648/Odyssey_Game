import { GlossSwitch } from './GlossSwitch';
import { CatMark } from './scenes';
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
      <CatMark />
      <p className="eyebrow">{t('scene.prologue')}</p>
      <h1>{t('meta.title')}</h1>
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
    </section>
  );
}
