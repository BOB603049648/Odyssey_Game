import type { CompanionPose, HintAnchor } from '../core/hints';
import type { HintLevel } from '../core/schema';
import { CatMark, nanaichaState } from './companion/CatMark';
import { t } from './i18n';

export function Companion({
  level,
  anchor,
  pose,
  purr,
  onAsk,
}: {
  level: HintLevel;
  anchor: HintAnchor;
  pose: CompanionPose;
  purr: boolean;
  onAsk: () => void;
}) {
  return (
    <button
      type="button"
      className={purr ? 'companion purr' : 'companion'}
      data-testid="companion"
      data-companion="nanaicha"
      data-level={level}
      data-look={anchor}
      data-pose={pose}
      data-state={nanaichaState(level, pose)}
      data-knot="rest"
      onClick={onAsk}
      aria-label={t('companion.ask')}
    >
      <span className="companion-sway">
        <CatMark look={anchor} state={nanaichaState(level, pose)} />
      </span>
    </button>
  );
}
