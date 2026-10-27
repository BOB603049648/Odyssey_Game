import proStorm from '../assets/art/slots/art.pro.storm.jpg';
import proDark from '../assets/art/slots/art.pro.dark.jpg';
import proBreak from '../assets/art/slots/art.pro.break.jpg';
import proTide from '../assets/art/slots/art.pro.tide.jpg';
import shoreSky from '../assets/art/slots/art.shore.sky.jpg';
import shoreGround from '../assets/art/slots/art.shore.ground.jpg';
import shoreBuilding from '../assets/art/slots/art.shore.building.png';
import shoreFg from '../assets/art/slots/art.shore.fg.png';
import shoreDriftwood from '../assets/art/slots/art.shore.prop.driftwood.png';
import shoreGourd from '../assets/art/slots/art.shore.prop.gourd.png';
import shoreBreak from '../assets/art/slots/art.shore.prop.break-shard.png';
import shoreMural from '../assets/art/slots/art.shore.prop.mural-wall.png';

/** Delivered slot files. Missing ids stay null in scene JSON and render as blocks. */
export const SLOT_ASSETS: Record<string, string> = {
  'art.pro.storm': proStorm,
  'art.pro.dark': proDark,
  'art.pro.break': proBreak,
  'art.pro.tide': proTide,
  'art.shore.sky': shoreSky,
  'art.shore.ground': shoreGround,
  'art.shore.building': shoreBuilding,
  'art.shore.fg': shoreFg,
  'art.shore.prop.driftwood': shoreDriftwood,
  'art.shore.prop.gourd': shoreGourd,
  'art.shore.prop.break-shard': shoreBreak,
  'art.shore.prop.mural-wall': shoreMural,
};

export function resolveSlotAsset(asset: string | null): string | null {
  if (!asset) return null;
  return SLOT_ASSETS[asset] ?? null;
}
