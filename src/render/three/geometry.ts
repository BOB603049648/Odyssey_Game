/** Screen-authored coordinates stay stable while depth becomes explicit. */
import type { IslandScene } from '../../core/island';
export type Crop = { x: number; y: number; width: number; height: number; atlasWidth: number; atlasHeight: number };
export function cropUV(crop: Crop | null, mirrored = false) {
  const left = crop ? crop.x / crop.atlasWidth : 0;
  const right = crop ? (crop.x + crop.width) / crop.atlasWidth : 1;
  const bottom = crop ? 1 - (crop.y + crop.height) / crop.atlasHeight : 0;
  const top = crop ? 1 - crop.y / crop.atlasHeight : 1;
  return { left: mirrored ? right : left, right: mirrored ? left : right, bottom, top };
}
export function cameraWindow(cam: { x: number; y: number }, world: { w: number; h: number }, view: { w: number; h: number }) {
  return { left: cam.x / world.w, right: (cam.x + view.w) / world.w,
    top: 1 - cam.y / world.h, bottom: 1 - (cam.y + view.h) / world.h };
}
export type Occluder = { id: string; foot: number; points: readonly (readonly [number, number])[] };
/** Traced against the current 1672×941 shore painting, not legacy slots.
 * The original image is projected through these shapes; nothing is repainted.
 * Keep these fixed until clean separated foreground plates are delivered. */
export const SHORE_OCCLUDERS: readonly Occluder[] = [
  { id: 'driftwood', foot: .75, points: [[.277,.719],[.287,.698],[.298,.688],[.329,.698],[.358,.69],[.38,.706],[.412,.701],[.448,.694],[.46,.707],[.451,.727],[.46,.74],[.428,.749],[.366,.749],[.324,.739],[.29,.747]] },
  { id: 'waystone', foot: .714, points: [[.711,.708],[.733,.674],[.744,.599],[.754,.555],[.764,.53],[.778,.523],[.789,.548],[.792,.599],[.802,.644],[.806,.681],[.839,.704],[.819,.719],[.771,.721]] },
  { id: 'near-rocks', foot: .97, points: [[0,.881],[.045,.872],[.071,.876],[.09,.892],[.121,.888],[.149,.908],[.178,.93],[.239,.961],[.3,1],[0,1]] },
];
export const SCENE_OCCLUDERS: Partial<Record<IslandScene,readonly Occluder[]>> = {
  'dba.scene.shore':SHORE_OCCLUDERS,
  'dba.scene.hall':[
    {id:'left-pillar',foot:.96,points:[[0,0],[.055,0],[.049,.64],[.059,.68],[.044,.72],[.048,.81],[.015,.82],[0,.82]]},
    {id:'right-pillar',foot:.96,points:[[.955,0],[1,0],[1,.84],[.944,.81],[.941,.73],[.936,.70],[.95,.66]]},
    {id:'scroll-stand',foot:.585,points:[[.415,.54],[.433,.475],[.445,.438],[.459,.432],[.471,.445],[.533,.443],[.541,.431],[.554,.438],[.554,.465],[.564,.494],[.565,.565],[.555,.58],[.548,.578],[.547,.562],[.433,.565],[.428,.582],[.415,.581]]},
  ],
  'dba.scene.night':[
    {id:'writing-table-edge',foot:.755,points:[[.13,.633],[.15,.618],[.205,.613],[.234,.613],[.242,.588],[.249,.579],[.345,.576],[.354,.584],[.366,.619],[.405,.63],[.42,.645],[.418,.671],[.403,.686],[.337,.701],[.255,.70],[.196,.683],[.143,.671]]},
    {id:'near-left-rocks',foot:.995,points:[[0,.9],[.046,.871],[.082,.878],[.122,.892],[.151,.895],[.166,.911],[.21,.918],[.231,.95],[.27,1],[0,1]]},
  ],
};
