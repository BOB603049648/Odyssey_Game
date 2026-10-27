import hero from '../../assets/companion/nanaicha/nanaicha-hero.png';
import silhouette from '../../assets/companion/nanaicha/nanaicha-silhouette.png';
import kittenHero from '../../assets/companion/nanaicha/kitten/nanaicha-kitten-hero.png';
import kittenSilhouette from '../../assets/companion/nanaicha/kitten/nanaicha-kitten-silhouette.png';
import type { CompanionPose } from '../../core/hints';
import type { HintLevel } from '../../core/schema';

export type NanaichaState = 'idle' | 'look' | 'walk' | 'tap' | 'tilt' | 'carry' | 'guard';
export type NanaichaFigure = 'adult' | 'kitten';
export type KnotMark = 'rest' | 'glow';

const ROPE_KNOT = 'myp.ev.b';

export function knotMark(evidence: readonly string[]): KnotMark {
  return evidence.includes(ROPE_KNOT) ? 'glow' : 'rest';
}

export function nanaichaState(level: HintLevel | number, pose: CompanionPose | string): NanaichaState {
  if (pose === 'look-at') return 'tilt';
  if (pose === 'fetch') return 'carry';
  if (level >= 3 || pose === 'paw') return 'tap';
  if (level === 2 || pose === 'tail-point') return 'walk';
  if (level === 1) return 'look';
  if (pose === 'curl') return 'guard';
  if (pose === 'lead') return 'walk';
  if (pose === 'look-back') return 'look';
  return 'idle';
}

export function CatMark({
  look = 'ahead',
  state = 'idle',
  variant = 'hero',
  figure = 'adult',
  knot = 'rest',
}: {
  look?: string;
  state?: NanaichaState;
  variant?: 'hero' | 'silhouette';
  figure?: NanaichaFigure;
  knot?: KnotMark;
}) {
  const plate = figure === 'kitten'
    ? variant === 'silhouette' ? kittenSilhouette : kittenHero
    : variant === 'silhouette' ? silhouette : hero;
  return (
    <span className="nanaicha-look" data-look={look} data-figure={figure}>
      <span className="nanaicha-state" data-state={state}>
        <img
          className={variant === 'silhouette' ? 'nanaicha nanaicha-silhouette' : 'nanaicha nanaicha-hero'}
          src={plate}
          alt=""
          draggable={false}
        />
        {variant === 'hero' ? (
          <>
            {figure === 'adult' ? (
              <>
                <i className="cloak" data-cloak="worn" aria-hidden="true" />
                <i className="cloak-hood" data-hood="down" aria-hidden="true" />
              </>
            ) : null}
            <i className="collar-knot" data-knot={knot} aria-hidden="true" />
          </>
        ) : null}
      </span>
    </span>
  );
}
