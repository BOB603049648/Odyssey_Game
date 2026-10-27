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

export function PrologueArt({ step }: { step: number }) {
  if (step === 0) {
    return (
      <svg className="plate" viewBox="0 0 640 320" aria-hidden="true">
        <path className="wave" d="M0 190c40 20 60-10 100 0s60 30 100 10 70-30 110-10 60 40 110 20 80-20 120 0 70 30 100 10v100H0z" />
        <path className="wave" d="M0 230c50 16 70-16 120 0s80 24 120 0 70-20 120 4 90 20 140-4 80-10 140 8v82H0z" />
        <path d="M250 150l70-28 90 20-30 36-96 8z" />
        <path d="M300 122l18-36M360 132l10 28" />
      </svg>
    );
  }
  if (step === 1) {
    return (
      <svg className="plate dark" viewBox="0 0 640 320" aria-hidden="true">
        <path d="M300 210c20-70 40-90 70-90" />
        <path d="M360 120c18-8 28 8 18 20" />
        <path className="sound" d="M430 90c16-20 34-20 48 0M446 70c20-24 48-22 64 6" />
      </svg>
    );
  }
  if (step === 2) {
    return (
      <svg className="plate" viewBox="0 0 640 320" aria-hidden="true">
        <path d="M250 200l40-70 70 8 16 62-50 28z" />
        <path d="M300 150l28 18M330 142l10 36" />
        <path d="M150 120c20 40 8 80-20 100M470 80c-10 50 8 90 40 110" />
        <path className="hand" d="M120 70c30 10 40 30 36 48-16-4-28 6-24 20" />
      </svg>
    );
  }
  return (
    <div className="plate meet">
      <svg viewBox="0 0 640 120" aria-hidden="true">
        <path className="wave" d="M0 40c60 20 80-20 140 0s90 24 140-6 80-16 130 8 100 16 140-8 60-8 90 6v72H0z" />
      </svg>
      <CatMark />
    </div>
  );
}

export function ShoreArt({ drank }: { drank: boolean }) {
  return (
    <svg className="shore-art" viewBox="0 0 960 520" aria-hidden="true">
      <path className="canopy" d="M0 180c40-70 80-40 100-90 30 40 70 20 90-20 20 50 80 40 100 0 30 40 70 20 110-10-10 50 40 70 80 60 20-40 70-20 100 10v-80h380v210H0z" />
      <path className="rock" d="M70 250l120-40 90 24 20 90-150 36z" />
      <path d="M110 250l18 18M150 236l22 10M190 248l14 20" />
      <path className="water" d="M0 390c80 20 120-24 200 0s140 30 210-8 150-20 230 12 180 18 320-16v142H0z" />
      <path className="shelter" d="M690 250l90-48 86 52v90H690z" />
      <path className="flame" d="M760 300c10-16 8-24 16-34 2 12 10 14 10 6 8 12 6 28-8 34-12 4-22 0-18-6z" />
      <path d={drank ? 'M590 300c20-30 34-8 28 20M600 250c16 8 18 28 4 36' : 'M600 280c18-8 28 16 10 28M628 292c10 16-8 28-20 16'} />
      <circle cx="575" cy="236" r="14" />
      <path d="M575 250v36M558 268h28M560 330l15-44 18 44" />
    </svg>
  );
}
