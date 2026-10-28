import { useEffect, useState } from 'react';
import type { CompanionPose, HintAnchor } from '../core/hints';
import type { HintLevel } from '../core/schema';
import { loadCatSrc } from './catImage';
import { CatMark, nanaichaState, type KnotMark } from './companion/CatMark';
import { t } from './i18n';

export function Companion({
  level,
  anchor,
  pose,
  purr,
  knot = 'rest',
  onAsk,
  figure,
  frame,
}: {
  level: HintLevel;
  anchor: HintAnchor;
  pose: CompanionPose;
  purr: boolean;
  knot?: KnotMark;
  onAsk: () => void;
  /** Grounded scene plate or a trajectory frame. The anchor still moves. */
  figure?: string;
  frame?: string;
}) {
  const [src, setSrc] = useState(figure);
  useEffect(() => {
    if (!figure) {
      setSrc(undefined);
      return undefined;
    }
    let live = true;
    setSrc(figure);
    loadCatSrc(figure).then((next) => {
      if (live) setSrc(next);
    });
    return () => {
      live = false;
    };
  }, [figure]);
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
      data-knot={knot}
      data-frame={frame}
      onClick={onAsk}
      aria-label={t('companion.ask')}
    >
      <span className="companion-mirror">
        <span className="companion-sway">
          {figure ? (
            <span className="nanaicha-figure" style={{ ['--figure' as string]: `url("${src ?? figure}")` }}>
              <img className="nanaicha-ground" data-look={anchor} data-frame={frame} src={src ?? figure} alt="" draggable={false} />
              <span className="figure-grade grade-color" />
              <span className="figure-grade grade-soft" />
            </span>
          ) : (
            <CatMark look={anchor} state={nanaichaState(level, pose)} knot={knot} />
          )}
        </span>
      </span>
    </button>
  );
}
