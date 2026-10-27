import side from '../assets/traveler/02-side.png';
import back from '../assets/traveler/03-back.png';
import front from '../assets/traveler/04-front.png';
import silhouette from '../assets/traveler/05-silhouette.png';

export type TravelerFacing = 'front' | 'back' | 'left' | 'right';

/** 02-side is the 90° profile and faces screen-left. Right movement mirrors it. */
const FIGURE: Record<TravelerFacing, string> = {
  front,
  back,
  left: side,
  right: side,
};

export function facingFromMove(dx: number, dy: number, current: TravelerFacing): TravelerFacing {
  const ax = Math.abs(dx);
  const ay = Math.abs(dy);
  if (ax < 0.001 && ay < 0.001) return current;
  if (ax >= ay) return dx < 0 ? 'left' : 'right';
  return dy < 0 ? 'back' : 'front';
}

export function TravelerMark({
  x,
  y,
  facing,
  moving,
}: {
  x: number;
  y: number;
  facing: TravelerFacing;
  moving: boolean;
}) {
  return (
    <div
      className="traveler"
      data-testid="traveler"
      data-figure="traveler"
      data-facing={facing}
      data-moving={moving ? 'yes' : 'no'}
      data-x={x}
      data-y={y}
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      aria-hidden="true"
    >
      <div className="traveler-bob">
        {facing === 'front' ? <img className="traveler-shade" src={silhouette} alt="" draggable={false} /> : null}
        <img className="traveler-figure" src={FIGURE[facing]} alt="" draggable={false} />
      </div>
    </div>
  );
}
