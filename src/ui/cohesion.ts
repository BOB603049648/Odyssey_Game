import type { IslandScene } from '../core/island';
import type { SceneSlot } from '../core/schema';
import ellipseL from '../assets/art/cohesion/shadows/shadow.ellipse.l.png';
import ellipseM from '../assets/art/cohesion/shadows/shadow.ellipse.m.png';
import ellipseS from '../assets/art/cohesion/shadows/shadow.ellipse.s.png';
import ellipseXl from '../assets/art/cohesion/shadows/shadow.ellipse.xl.png';
import foundationBar from '../assets/art/cohesion/shadows/shadow.foundation.bar.png';
import gradeCamp from '../assets/art/cohesion/grades/grade.camp.png';
import gradeHall from '../assets/art/cohesion/grades/grade.hall.png';
import gradeNight from '../assets/art/cohesion/grades/grade.night.png';
import gradePath from '../assets/art/cohesion/grades/grade.path.png';
import gradeShore from '../assets/art/cohesion/grades/grade.shore.png';
import gradeYard from '../assets/art/cohesion/grades/grade.yard.png';
import stripCamp from '../assets/art/cohesion/strips/strip.camp.png';
import stripHall from '../assets/art/cohesion/strips/strip.hall.png';
import stripNight from '../assets/art/cohesion/strips/strip.night.png';
import stripPath from '../assets/art/cohesion/strips/strip.path.png';
import stripShore from '../assets/art/cohesion/strips/strip.shore.png';
import stripYard from '../assets/art/cohesion/strips/strip.yard.png';

/** Shared foot ellipses. Wider when the foot sits lower in the scene. */
export const FOOT_ELLIPSE = { s: ellipseS, m: ellipseM, l: ellipseL, xl: ellipseXl } as const;
export const FOUNDATION_SHADOW = foundationBar;
export type EllipseSize = keyof typeof FOOT_ELLIPSE;

/**
 * PNGs that already contain a contact shadow.
 * Contract `cohesion.baked_contact_shadow_props`, plus plates the pack left alone
 * because a soft contact was already in the art (fire, gourd, mats, boards, nanaicha, act cards).
 */
const PNG_CONTACT = new Set([
  'art.shore.prop.driftwood',
  'art.yard.prop.dried-fish',
  'art.camp.building',
  'art.hall.building',
  'art.hall.prop.scroll-wall',
  'art.hall.prop.stamp-rail',
  'art.path.prop.danger-board',
  'art.path.building',
  'art.night.prop.old-layer',
  'art.night.building',
  'art.shore.prop.gourd',
  'art.camp.prop.fire',
  'art.camp.prop.sleep-mat',
  'art.camp.prop.paper-bundles',
  'art.yard.prop.grain-bags',
  'art.yard.prop.more-less-boards',
  'art.hall.prop.wrist-knot',
]);

/** Not a footed sprite — an ellipse here would read as another sticker. */
const NO_FOOT = new Set(['light-slit', 'north-curtain', 'embers', 'empty', 'door-glow']);

export function hasPngContact(assetId: string | null | undefined): boolean {
  if (!assetId) return false;
  if (PNG_CONTACT.has(assetId)) return true;
  if (assetId.includes('.prop.act-') || assetId.includes('nanaicha')) return true;
  return false;
}

export function ellipseSizeFor(slot: Pick<SceneSlot, 'slot' | 'asset' | 'id' | 'w' | 'kind'>): EllipseSize | null {
  if (slot.slot !== 'props') return null;
  const id = slot.asset ?? slot.id;
  if (hasPngContact(id) || NO_FOOT.has(slot.kind)) return null;
  const w = slot.w ?? 0.16;
  if (w < 0.14) return 's';
  if (w < 0.24) return 'm';
  if (w < 0.34) return 'l';
  return 'xl';
}

/** Percent of the sprite box. Lower on screen (closer) is wider. */
export function ellipseWidthPct(y: number, base = 78): number {
  const depth = Math.min(1, Math.max(0, y));
  return base * (0.84 + depth * 0.32);
}

const GRADES: Record<IslandScene, string> = {
  'dba.scene.shore': gradeShore,
  'dba.scene.camp': gradeCamp,
  'dba.scene.yard': gradeYard,
  'dba.scene.hall': gradeHall,
  'dba.scene.path': gradePath,
  'dba.scene.night': gradeNight,
};

export function sceneGrade(scene: IslandScene): string {
  return GRADES[scene];
}

/** Contract `cohesion.scenes` — world-root multiply, not a per-sprite filter. */
export const SCENE_LOOK: Record<IslandScene, { ambient: string; shadowTint: string }> = {
  'dba.scene.shore': { ambient: '#B8CED4', shadowTint: '#3A4E55' },
  'dba.scene.camp': { ambient: '#D4B08A', shadowTint: '#4A3528' },
  'dba.scene.yard': { ambient: '#C9BCA8', shadowTint: '#3F3A32' },
  'dba.scene.hall': { ambient: '#9AA8AC', shadowTint: '#2E383C' },
  'dba.scene.path': { ambient: '#A8B4B8', shadowTint: '#353E42' },
  'dba.scene.night': { ambient: '#4A5568', shadowTint: '#1E2430' },
};

const STRIPS: Record<IslandScene, string> = {
  'dba.scene.shore': stripShore,
  'dba.scene.camp': stripCamp,
  'dba.scene.yard': stripYard,
  'dba.scene.hall': stripHall,
  'dba.scene.path': stripPath,
  'dba.scene.night': stripNight,
};

export function sceneLook(scene: IslandScene): { ambient: string; shadowTint: string } {
  return SCENE_LOOK[scene];
}

export function sceneStrip(scene: IslandScene): string {
  return STRIPS[scene];
}

/** Placed buildings without a baked foundation get the shared bar. */
export function foundationFor(slot: Pick<SceneSlot, 'slot' | 'asset' | 'id' | 'x'>): boolean {
  if (slot.slot !== 'building' || slot.x === undefined) return false;
  return !hasPngContact(slot.asset ?? slot.id);
}
