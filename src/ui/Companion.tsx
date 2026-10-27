import type { HintAnchor } from '../core/hints';
import type { HintLevel } from '../core/schema';
import { CatMark } from './scenes';
import { t } from './i18n';

export function Companion({
  level,
  anchor,
  purr,
  onAsk,
}: {
  level: HintLevel;
  anchor: HintAnchor;
  purr: boolean;
  onAsk: () => void;
}) {
  return (
    <button
      type="button"
      className={purr ? 'companion purr' : 'companion'}
      data-testid="companion"
      data-level={level}
      data-look={anchor}
      onClick={onAsk}
      aria-label={t('companion.ask')}
    >
      <CatMark look={anchor} />
    </button>
  );
}
