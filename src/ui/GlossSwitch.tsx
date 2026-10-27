import { t } from './i18n';

export function GlossSwitch({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <div className="setting">
      <button
        type="button"
        role="switch"
        aria-checked={checked}
        onClick={() => onChange(!checked)}
      >
        <span>{t('settings.showGloss')}</span>
        <span className={checked ? 'knob on' : 'knob'} />
      </button>
      <p>{t('settings.showGlossHelp')}</p>
    </div>
  );
}
