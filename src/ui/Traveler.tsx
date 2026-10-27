import front from '../assets/traveler/04-front.png';
import silhouette from '../assets/traveler/05-silhouette.png';

export function TravelerMark({
  x,
  y,
  facing,
  moving,
}: {
  x: number;
  y: number;
  facing: 'left' | 'right';
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
        <img className="traveler-shade" src={silhouette} alt="" draggable={false} />
        <img className="traveler-figure" src={front} alt="" draggable={false} />
      </div>
    </div>
  );
}
