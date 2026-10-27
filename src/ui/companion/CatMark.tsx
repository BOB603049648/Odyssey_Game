import hero from '../../assets/companion/nanaicha/nanaicha-hero.png';
import silhouette from '../../assets/companion/nanaicha/nanaicha-silhouette.png';
import type { CompanionPose } from '../../core/hints';
import type { HintLevel } from '../../core/schema';

export type NanaichaState = 'idle' | 'look' | 'walk' | 'tap' | 'tilt' | 'carry' | 'guard';

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
}: {
  look?: string;
  state?: NanaichaState;
  variant?: 'hero' | 'silhouette';
}) {
  const drawn = variant === 'silhouette' ? silhouette : hero;
  return (
    <span className="nanaicha-look" data-look={look}>
      <span className="nanaicha-state" data-state={state}>
        <img
          className={variant === 'silhouette' ? 'nanaicha nanaicha-silhouette' : 'nanaicha nanaicha-hero'}
          src={drawn}
          alt=""
          draggable={false}
        />
        {variant === 'hero' ? <i className="collar-knot" data-knot="rest" aria-hidden="true" /> : null}
      </span>
    </span>
  );
}
