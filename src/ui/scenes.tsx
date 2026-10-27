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

export function CampArt() {
  return (
    <svg className="shore-art" viewBox="0 0 960 520" aria-hidden="true">
      <path className="canopy" d="M0 160c80-40 140-20 200 10 40-50 120-40 160 0 50-30 140-10 180 20v180H0z" />
      <path className="shelter" d="M180 250l160-70 170 74v120H180z" />
      <path className="flame" d="M430 300c16-28 12-40 26-56 4 20 16 22 16 8 14 20 8 46-16 56-20 8-36 0-26-8z" />
      <path d="M250 390h460M300 390v40M660 390v40" />
    </svg>
  );
}

export function FisheryArt() {
  return (
    <svg className="shore-art" viewBox="0 0 960 520" aria-hidden="true">
      <path className="water" d="M0 280c90 30 140-30 230 0s160 36 240-10 170-24 260 14 140 20 230-18v254H0z" />
      <path d="M220 250c40-16 70 8 90 28M300 236c30 20 20 48-8 58" />
      <path d="M620 240c28-20 70-8 86 18M680 220c20 24 6 50-18 54" />
      <path d="M430 210l40 70M470 210l-10 74" />
    </svg>
  );
}

export function RockArt() {
  return (
    <svg className="shore-art" viewBox="0 0 960 520" aria-hidden="true">
      <path className="rock" d="M80 120h800v300H80z" />
      <path d="M140 180h120v80H140zM300 180h120v80H300zM460 180h120v80H460z" />
      <path d="M160 320h200M180 360h160M620 300c20 20 40 20 60 0" />
    </svg>
  );
}

export function ForestArt() {
  return (
    <svg className="shore-art" viewBox="0 0 960 520" aria-hidden="true">
      <path className="canopy" d="M40 360 180 120l140 240zM280 380 460 80l180 300zM560 360 740 140l160 220z" />
      <path d="M700 250c30 10 40 40 10 60M760 230c20 16 16 40-6 48" />
    </svg>
  );
}

export function NightArt() {
  return (
    <svg className="shore-art" viewBox="0 0 960 520" aria-hidden="true">
      <path className="canopy" d="M0 200h960v220H0z" />
      <circle cx="760" cy="90" r="28" />
      <path className="rock" d="M160 250h420v150H160z" />
      <path d="M200 290h80M200 330h140M420 300h100" />
      <path className="flame" d="M700 340c12-20 10-32 20-42 2 14 12 16 12 6 10 14 6 32-8 38-12 6-26 2-24-2z" />
    </svg>
  );
}

export function MemoryRain() {
  return (
    <svg className="memory-rain" viewBox="0 0 220 120" data-testid="memory-rain" aria-hidden="true">
      <path d="M10 28h200M10 28v18M210 28v18" />
      <path d="M40 70c16-20 36-18 44 0 10-16 30-14 36 4 8 16-8 28-24 26-16 8-40 6-56-30z" />
      <path d="M70 62l6-14 8 12M108 58l4-12 10 14" />
      <path d="M24 20c8 16 6 8 14 20M80 8c6 14 4 8 12 18M150 16c8 12 4 10 12 16" />
    </svg>
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
