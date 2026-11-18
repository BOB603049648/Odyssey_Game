import type { Crop } from './geometry';
import regions from '../../assets/art/spatial/refined/regions.json';
import shore from '../../assets/art/spatial/refined/shore-atlas.webp';
import hall from '../../assets/art/spatial/refined/hall-atlas.webp';
import gate from '../../assets/art/spatial/refined/gate.webp';
import mural from '../../assets/art/spatial/refined/mural.webp';
import spring from '../../assets/art/spatial/refined/spring.webp';
import empty from '../../assets/art/spatial/refined/spring-empty.webp';
import waystone from '../../assets/art/spatial/refined/waystone.webp';

export const CUTOUT_ART = { shore, hall, gate, mural, spring, 'spring-empty': empty, waystone };
export const SHORE_DETAIL_ART = { gate, mural, spring, 'spring-empty': empty, waystone };
export const CUTOUT_CROPS = new Map<string, Crop>([
  [shore, regions['shore-atlas']], [hall, regions['hall-atlas']],
  [gate, regions.gate], [mural, regions.mural], [spring, regions.spring],
  [empty, regions['spring-empty']], [waystone, regions.waystone],
]);
