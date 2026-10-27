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
import shoreGap from '../assets/art/slots/art.shore.prop.east-gap.png';
import yardFar from '../assets/art/slots/art.yard.far.jpg';
import yardGround from '../assets/art/slots/art.yard.ground.jpg';
import yardBuilding from '../assets/art/slots/art.yard.building.png';
import yardFg from '../assets/art/slots/art.yard.fg.png';
import yardGrain from '../assets/art/slots/art.yard.prop.grain-bags.png';
import yardFish from '../assets/art/slots/art.yard.prop.dried-fish.png';
import yardBoards from '../assets/art/slots/art.yard.prop.more-less-boards.png';
import campFar from '../assets/art/slots/art.camp.far.jpg';
import campGround from '../assets/art/slots/art.camp.ground.jpg';
import campBuilding from '../assets/art/slots/art.camp.building.png';
import campFg from '../assets/art/slots/art.camp.fg.png';
import campFire from '../assets/art/slots/art.camp.prop.fire.png';
import campMat from '../assets/art/slots/art.camp.prop.sleep-mat.png';
import campCurtain from '../assets/art/slots/art.camp.prop.north-curtain.png';
import campPaper from '../assets/art/slots/art.camp.prop.paper-bundles.png';
import campHome from '../assets/art/slots/art.camp.prop.act-home.png';
import campEat from '../assets/art/slots/art.camp.prop.act-eat.png';
import campDrink from '../assets/art/slots/art.camp.prop.act-drink.png';
import campWalk from '../assets/art/slots/art.camp.prop.act-walk.png';
import campTake from '../assets/art/slots/art.camp.prop.act-take.png';
import campMe from '../assets/art/slots/art.camp.prop.act-me.png';
import campYou from '../assets/art/slots/art.camp.prop.act-you.png';
import hallFar from '../assets/art/slots/art.hall.far.jpg';
import hallGround from '../assets/art/slots/art.hall.ground.jpg';
import hallBuilding from '../assets/art/slots/art.hall.building.png';
import hallFg from '../assets/art/slots/art.hall.fg.png';
import hallScroll from '../assets/art/slots/art.hall.prop.scroll-wall.png';
import hallStamps from '../assets/art/slots/art.hall.prop.stamp-rail.png';
import hallKnot from '../assets/art/slots/art.hall.prop.wrist-knot.png';

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
  'art.shore.prop.east-gap': shoreGap,
  'art.yard.far': yardFar,
  'art.yard.ground': yardGround,
  'art.yard.building': yardBuilding,
  'art.yard.fg': yardFg,
  'art.yard.prop.grain-bags': yardGrain,
  'art.yard.prop.dried-fish': yardFish,
  'art.yard.prop.more-less-boards': yardBoards,
  'art.camp.far': campFar,
  'art.camp.ground': campGround,
  'art.camp.building': campBuilding,
  'art.camp.fg': campFg,
  'art.camp.prop.fire': campFire,
  'art.camp.prop.sleep-mat': campMat,
  'art.camp.prop.north-curtain': campCurtain,
  'art.camp.prop.paper-bundles': campPaper,
  'art.camp.prop.act-home': campHome,
  'art.camp.prop.act-eat': campEat,
  'art.camp.prop.act-drink': campDrink,
  'art.camp.prop.act-walk': campWalk,
  'art.camp.prop.act-take': campTake,
  'art.camp.prop.act-me': campMe,
  'art.camp.prop.act-you': campYou,
  'art.hall.far': hallFar,
  'art.hall.ground': hallGround,
  'art.hall.building': hallBuilding,
  'art.hall.fg': hallFg,
  'art.hall.prop.scroll-wall': hallScroll,
  'art.hall.prop.stamp-rail': hallStamps,
  'art.hall.prop.wrist-knot': hallKnot,
};

export function resolveSlotAsset(asset: string | null): string | null {
  if (!asset) return null;
  return SLOT_ASSETS[asset] ?? null;
}
