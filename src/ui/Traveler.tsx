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
      data-facing={facing}
      data-moving={moving ? 'yes' : 'no'}
      data-x={x}
      data-y={y}
      style={{ left: `${x * 100}%`, top: `${y * 100}%` }}
      aria-hidden="true"
    >
      <div className="traveler-bob">
        <svg viewBox="0 0 64 108">
          <ellipse className="traveler-shadow" cx="32" cy="102" rx="16" ry="4" />
          <path className="traveler-fill" d="M32 14c7 0 11 7 11 13s-4 11-11 11-11-5-11-11 4-13 11-13z" />
          <path className="traveler-fill" d="M20 44c-4 10-6 22-2 34l8 18h12l8-18c4-12 2-24-2-34-6 6-16 6-24 0z" />
          <path d="M24 78l-6 22M40 78l6 22" />
          <path d="M22 48c6-8 16-8 22 0" />
          <path className="traveler-fill" d="M40 46h10l-1 16H42z" />
        </svg>
      </div>
    </div>
  );
}
