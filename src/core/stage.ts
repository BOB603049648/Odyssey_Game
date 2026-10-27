import type { IslandScene } from './island';
import { inRadius, type Band, type Point } from './walk';

export type Spot = { id: string; x: number; y: number; r: number };

export type GateEdge = 'east' | 'west' | 'north' | 'south';

export type Gate = {
  from: IslandScene;
  to: IslandScene;
  x: number;
  y: number;
  r: number;
  arrival: Point;
  /** The whole band edge, so a traveler on any part of the path still crosses. */
  edge?: GateEdge;
};

const shoreBand: Band = { minX: 0.05, maxX: 0.96, minY: 0.4, maxY: 0.84 };
const campBand: Band = { minX: 0.05, maxX: 0.96, minY: 0.38, maxY: 0.84 };
const pathBand: Band = { minX: 0.05, maxX: 0.96, minY: 0.4, maxY: 0.84 };

export const BANDS: Record<IslandScene, Band> = {
  'dba.scene.shore': shoreBand,
  'dba.scene.camp': campBand,
  'dba.scene.yard': pathBand,
  'dba.scene.hall': pathBand,
  'dba.scene.path': pathBand,
  'dba.scene.night': pathBand,
};

export const SPAWNS: Record<IslandScene, Point> = {
  'dba.scene.shore': { x: 0.42, y: 0.62 },
  'dba.scene.camp': { x: 0.46, y: 0.64 },
  'dba.scene.yard': { x: 0.4, y: 0.64 },
  'dba.scene.hall': { x: 0.48, y: 0.64 },
  'dba.scene.path': { x: 0.42, y: 0.64 },
  'dba.scene.night': { x: 0.46, y: 0.64 },
};

export const GATES: readonly Gate[] = [
  { from: 'dba.scene.shore', to: 'dba.scene.camp', x: 0.9, y: 0.63, r: 0.04, edge: 'east', arrival: { x: 0.34, y: 0.64 } },
  { from: 'dba.scene.shore', to: 'dba.scene.hall', x: 0.11, y: 0.7, r: 0.04, edge: 'west', arrival: { x: 0.48, y: 0.6 } },
  { from: 'dba.scene.camp', to: 'dba.scene.shore', x: 0.11, y: 0.66, r: 0.04, edge: 'west', arrival: { x: 0.7, y: 0.62 } },
  { from: 'dba.scene.camp', to: 'dba.scene.yard', x: 0.9, y: 0.6, r: 0.04, edge: 'east', arrival: { x: 0.28, y: 0.64 } },
  { from: 'dba.scene.camp', to: 'dba.scene.night', x: 0.5, y: 0.42, r: 0.04, edge: 'north', arrival: { x: 0.55, y: 0.66 } },
  { from: 'dba.scene.yard', to: 'dba.scene.camp', x: 0.11, y: 0.64, r: 0.04, edge: 'west', arrival: { x: 0.72, y: 0.62 } },
  { from: 'dba.scene.yard', to: 'dba.scene.path', x: 0.9, y: 0.56, r: 0.04, edge: 'east', arrival: { x: 0.3, y: 0.64 } },
  { from: 'dba.scene.hall', to: 'dba.scene.shore', x: 0.5, y: 0.8, r: 0.04, edge: 'south', arrival: { x: 0.28, y: 0.62 } },
  { from: 'dba.scene.path', to: 'dba.scene.yard', x: 0.11, y: 0.64, r: 0.04, edge: 'west', arrival: { x: 0.72, y: 0.6 } },
  { from: 'dba.scene.night', to: 'dba.scene.camp', x: 0.5, y: 0.8, r: 0.04, edge: 'south', arrival: { x: 0.5, y: 0.62 } },
];

export const SPOTS: Record<IslandScene, readonly Spot[]> = {
  'dba.scene.shore': [
    { id: 'island-mural', x: 0.2, y: 0.56, r: 0.072 },
    { id: 'shore-stone', x: 0.17, y: 0.68, r: 0.05 },
    { id: 'shore-driftwood', x: 0.33, y: 0.71, r: 0.05 },
    { id: 'island-gourd', x: 0.58, y: 0.64, r: 0.068 },
    { id: 'shore-depart', x: 0.74, y: 0.54, r: 0.05 },
  ],
  'dba.scene.camp': [
    { id: 'camp-sleep', x: 0.4, y: 0.6, r: 0.055 },
    { id: 'act:dba.word.home', x: 0.3, y: 0.71, r: 0.04 },
    { id: 'act:dba.word.eat', x: 0.39, y: 0.71, r: 0.04 },
    { id: 'act:dba.word.drink', x: 0.48, y: 0.71, r: 0.04 },
    { id: 'act:dba.word.walk', x: 0.57, y: 0.71, r: 0.04 },
    { id: 'act:dba.word.take', x: 0.66, y: 0.71, r: 0.04 },
    { id: 'act:dba.word.me', x: 0.75, y: 0.71, r: 0.04 },
    { id: 'act:dba.word.you', x: 0.84, y: 0.71, r: 0.04 },
  ],
  'dba.scene.yard': [
    { id: 'yard-give', x: 0.7, y: 0.64, r: 0.06 },
    { id: 'yard-grab', x: 0.3, y: 0.66, r: 0.055 },
    { id: 'act:dba.word.amount:more', x: 0.46, y: 0.56, r: 0.042 },
    { id: 'act:dba.word.amount:less', x: 0.56, y: 0.56, r: 0.042 },
    { id: 'act:dba.word.size:a', x: 0.22, y: 0.54, r: 0.042 },
    { id: 'act:dba.word.size:b', x: 0.34, y: 0.52, r: 0.04 },
  ],
  'dba.scene.hall': [
    { id: 'hall-mural', x: 0.32, y: 0.56, r: 0.065 },
    { id: 'hall-stamps', x: 0.66, y: 0.56, r: 0.06 },
    { id: 'hall-tattoo', x: 0.5, y: 0.66, r: 0.055 },
  ],
  'dba.scene.path': [
    { id: 'path-stop', x: 0.3, y: 0.66, r: 0.06 },
    { id: 'path-step', x: 0.66, y: 0.66, r: 0.06 },
  ],
  'dba.scene.night': [
    { id: 'night-read', x: 0.36, y: 0.58, r: 0.062 },
    { id: 'night-embers', x: 0.58, y: 0.72, r: 0.038 },
    { id: 'night-memory', x: 0.64, y: 0.64, r: 0.058 },
  ],
};

export function gatesFrom(scene: IslandScene): readonly Gate[] {
  return GATES.filter((gate) => gate.from === scene);
}

export function crossed(gate: Gate, pos: Point): boolean {
  if (gate.edge === 'east') return pos.x >= gate.x;
  if (gate.edge === 'west') return pos.x <= gate.x;
  if (gate.edge === 'north') return pos.y <= gate.y;
  if (gate.edge === 'south') return pos.y >= gate.y;
  return Math.hypot(gate.x - pos.x, gate.y - pos.y) <= gate.r;
}

export function gateAt(scene: IslandScene, pos: Point): Gate | null {
  return gatesFrom(scene).find((gate) => crossed(gate, pos)) ?? null;
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
