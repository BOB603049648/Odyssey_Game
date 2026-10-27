import type { IslandScene } from './island';
import { inRadius, type Band, type Point } from './walk';

export type Spot = { id: string; x: number; y: number; r: number };

export type Gate = {
  from: IslandScene;
  to: IslandScene;
  x: number;
  y: number;
  r: number;
  arrival: Point;
};

const shoreBand: Band = { minX: 0.07, maxX: 0.94, minY: 0.5, maxY: 0.76 };
const campBand: Band = { minX: 0.07, maxX: 0.94, minY: 0.47, maxY: 0.77 };
const pathBand: Band = { minX: 0.07, maxX: 0.94, minY: 0.48, maxY: 0.76 };

export const BANDS: Record<IslandScene, Band> = {
  'myp.scene.shore': shoreBand,
  'myp.scene.camp': campBand,
  'myp.scene.fishery': pathBand,
  'myp.scene.rock': pathBand,
  'myp.scene.forest': pathBand,
  'myp.scene.night': pathBand,
};

export const SPAWNS: Record<IslandScene, Point> = {
  'myp.scene.shore': { x: 0.42, y: 0.62 },
  'myp.scene.camp': { x: 0.46, y: 0.64 },
  'myp.scene.fishery': { x: 0.4, y: 0.64 },
  'myp.scene.rock': { x: 0.48, y: 0.64 },
  'myp.scene.forest': { x: 0.42, y: 0.64 },
  'myp.scene.night': { x: 0.46, y: 0.64 },
};

export const GATES: readonly Gate[] = [
  { from: 'myp.scene.shore', to: 'myp.scene.camp', x: 0.9, y: 0.62, r: 0.055, arrival: { x: 0.28, y: 0.64 } },
  { from: 'myp.scene.shore', to: 'myp.scene.rock', x: 0.08, y: 0.74, r: 0.04, arrival: { x: 0.48, y: 0.56 } },
  { from: 'myp.scene.camp', to: 'myp.scene.shore', x: 0.12, y: 0.68, r: 0.05, arrival: { x: 0.78, y: 0.62 } },
  { from: 'myp.scene.camp', to: 'myp.scene.fishery', x: 0.88, y: 0.56, r: 0.048, arrival: { x: 0.24, y: 0.64 } },
  { from: 'myp.scene.camp', to: 'myp.scene.night', x: 0.52, y: 0.49, r: 0.046, arrival: { x: 0.7, y: 0.56 } },
  { from: 'myp.scene.fishery', to: 'myp.scene.camp', x: 0.12, y: 0.66, r: 0.048, arrival: { x: 0.74, y: 0.6 } },
  { from: 'myp.scene.fishery', to: 'myp.scene.forest', x: 0.88, y: 0.52, r: 0.046, arrival: { x: 0.26, y: 0.64 } },
  { from: 'myp.scene.rock', to: 'myp.scene.shore', x: 0.22, y: 0.74, r: 0.046, arrival: { x: 0.24, y: 0.66 } },
  { from: 'myp.scene.forest', to: 'myp.scene.fishery', x: 0.14, y: 0.62, r: 0.048, arrival: { x: 0.74, y: 0.58 } },
  { from: 'myp.scene.night', to: 'myp.scene.camp', x: 0.5, y: 0.74, r: 0.048, arrival: { x: 0.5, y: 0.6 } },
];

export const SPOTS: Record<IslandScene, readonly Spot[]> = {
  'myp.scene.shore': [
    { id: 'island-mural', x: 0.2, y: 0.56, r: 0.072 },
    { id: 'shore-stone', x: 0.17, y: 0.68, r: 0.05 },
    { id: 'shore-driftwood', x: 0.33, y: 0.71, r: 0.05 },
    { id: 'island-gourd', x: 0.58, y: 0.64, r: 0.068 },
    { id: 'shore-depart', x: 0.74, y: 0.54, r: 0.05 },
  ],
  'myp.scene.camp': [
    { id: 'camp-sleep', x: 0.4, y: 0.55, r: 0.06 },
    { id: 'act:myp.word.home', x: 0.3, y: 0.71, r: 0.04 },
    { id: 'act:myp.word.eat', x: 0.39, y: 0.71, r: 0.04 },
    { id: 'act:myp.word.drink', x: 0.48, y: 0.71, r: 0.04 },
    { id: 'act:myp.word.walk', x: 0.57, y: 0.71, r: 0.04 },
    { id: 'act:myp.word.take', x: 0.66, y: 0.71, r: 0.04 },
    { id: 'act:myp.word.me', x: 0.75, y: 0.71, r: 0.04 },
    { id: 'act:myp.word.you', x: 0.84, y: 0.71, r: 0.04 },
  ],
  'myp.scene.fishery': [
    { id: 'fishery-give', x: 0.7, y: 0.64, r: 0.06 },
    { id: 'fishery-grab', x: 0.3, y: 0.66, r: 0.055 },
    { id: 'act:myp.word.amount:more', x: 0.46, y: 0.56, r: 0.042 },
    { id: 'act:myp.word.amount:less', x: 0.56, y: 0.56, r: 0.042 },
    { id: 'act:myp.word.size:a', x: 0.22, y: 0.54, r: 0.042 },
    { id: 'act:myp.word.size:b', x: 0.34, y: 0.52, r: 0.04 },
  ],
  'myp.scene.rock': [
    { id: 'rock-mural', x: 0.32, y: 0.56, r: 0.065 },
    { id: 'rock-stamps', x: 0.66, y: 0.56, r: 0.06 },
    { id: 'rock-tattoo', x: 0.5, y: 0.66, r: 0.055 },
  ],
  'myp.scene.forest': [
    { id: 'forest-stop', x: 0.3, y: 0.66, r: 0.06 },
    { id: 'forest-step', x: 0.66, y: 0.66, r: 0.06 },
  ],
  'myp.scene.night': [
    { id: 'night-read', x: 0.36, y: 0.58, r: 0.062 },
    { id: 'night-memory', x: 0.64, y: 0.64, r: 0.058 },
  ],
};

export function gatesFrom(scene: IslandScene): readonly Gate[] {
  return GATES.filter((gate) => gate.from === scene);
}

export function gateAt(scene: IslandScene, pos: Point): Gate | null {
  let best: Gate | null = null;
  let bestDist = Infinity;
  for (const gate of gatesFrom(scene)) {
    const dist = Math.hypot(gate.x - pos.x, gate.y - pos.y);
    if (dist <= gate.r && dist < bestDist) {
      best = gate;
      bestDist = dist;
    }
  }
  return best;
}

export function nearestSpot(spots: readonly Spot[], pos: Point): Spot | null {
  let best: Spot | null = null;
  let bestDist = Infinity;
  for (const spot of spots) {
    if (!inRadius(pos, spot, spot.r)) continue;
    const dist = Math.hypot(spot.x - pos.x, spot.y - pos.y);
    if (dist < bestDist) {
      best = spot;
      bestDist = dist;
    }
  }
  return best;
}
