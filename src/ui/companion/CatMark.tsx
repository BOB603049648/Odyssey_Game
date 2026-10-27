export function CatMark({ look = 'ahead' }: { look?: string }) {
  return (
    <svg className="cat" viewBox="0 0 220 150" data-look={look} aria-hidden="true">
      <path className="cat-body" d="M28 108c8-36 24-58 52-62 10-18 18-28 22-28 6 8 8 20 8 32 20-4 48 4 62 28 16 6 28 22 30 40-22 8-40 10-86 8-28 6-62 4-88-18z" />
      <path className="cat-spot" d="M70 78c8 2 10 10 4 14M108 86c10 0 12 10 4 12M146 80c8 4 6 12-2 12" />
      <path className="cat-ear" d="M78 48l10-24 16 22M118 42l8-22 18 24" />
      <path className="leaf" d="M132 28c10-8 18-6 16 4-8 2-14 0-16-4z" />
      <path className="rope" d="M86 78c16 10 36 10 52 0" />
      <circle className="knot" cx="112" cy="80" r="3" />
      <g className="eyes">
        <ellipse cx="92" cy="74" rx="4" ry="5" />
        <ellipse cx="124" cy="72" rx="4" ry="5" />
      </g>
      <path className="tail" d="M176 96c18-8 28-2 30 12" />
    </svg>
  );
}
