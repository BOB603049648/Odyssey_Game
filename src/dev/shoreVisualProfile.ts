import { companionPost } from '../core/companionPost';
import { newGameState } from '../core/save';
import { plantOnGround, SHORE_MARKER } from '../core/stage';
import type { Point } from '../core/walk';

const DEPTH_FIXTURES = ['depth-gourd-bb','depth-gourd-bf','depth-gourd-fb','depth-gourd-ff','depth-east-gap-bb','depth-east-gap-bf','depth-east-gap-fb','depth-east-gap-ff','depth-driftwood-bb','depth-driftwood-bf','depth-driftwood-fb','depth-driftwood-ff'] as const;
export const SHORE_FIXTURES = ['shore-spawn', 'overlap-left', 'overlap-center', 'overlap-right', 'south', 'edge-left', 'edge-right', ...DEPTH_FIXTURES] as const;
export type ShoreFixtureName = typeof SHORE_FIXTURES[number];
export type ShoreVisualProfile = { variant: 'baseline' | 'candidate'; fixture: ShoreFixtureName | null; cat: 'S0' | 'S1' | 'S2' };
const baseline: ShoreVisualProfile = { variant: 'baseline', fixture: null, cat: 'S0' };

/** Presentation only: never serialized, never used to change game progress. */
export function readShoreVisualProfile({ enabled, hostname, search, deploymentOrigin, origin }: { enabled: boolean; hostname: string; search: string; deploymentOrigin?: string; origin?: string }): ShoreVisualProfile {
  // A release-specific compile flag is not an arbitrary-host allowlist.
  const deployed = deploymentOrigin === 'http://47.252.94.138' && origin === 'http://47.252.94.138';
  const local = enabled && ['localhost', '127.0.0.1', '[::1]'].includes(hostname);
  if (!deployed && !local) return { ...baseline };
  const query = new URLSearchParams(search);
  const variant = query.get('shoreVisual') ?? (deployed ? 'candidate' : null);
  if (variant !== 'baseline' && variant !== 'candidate') return { ...baseline };
  const name = query.get('fixture');
  const fixture = query.get('freeze') === '1' && SHORE_FIXTURES.includes(name as ShoreFixtureName) ? name as ShoreFixtureName : null;
  const cat = query.get('cat');
  return { variant, fixture, cat: cat === 'S1' || cat === 'S2' ? cat : 'S0' };
}

export function getShoreVisualProfile(): ShoreVisualProfile {
  return readShoreVisualProfile({
    enabled: import.meta.env.VITE_VISUAL_SAMPLE === '1',
    hostname: typeof window === 'undefined' ? '' : window.location.hostname,
    search: typeof window === 'undefined' ? '' : window.location.search,
    deploymentOrigin: import.meta.env.VITE_SHORE_DEPLOY_ORIGIN,
    origin: typeof window === 'undefined' ? '' : window.location.origin,
  });
}

const positions: Record<Exclude<ShoreFixtureName,typeof DEPTH_FIXTURES[number]>, Point> = {
  'shore-spawn': { x: .42, y: .62 },
  'overlap-left': { x: .18, y: .68 },
  'overlap-center': { x: .33, y: .74 },
  'overlap-right': { x: .58, y: .64 },
  south: { x: .62, y: .83 },
  'edge-left': { x: .06, y: .8 },
  'edge-right': { x: .95, y: .8 },
};

/** Twelve opt-in depth views: b/f denote human then cat behind/in front of authored prop. */
function depthPositions(name:ShoreFixtureName):{traveler:Point;cat:Point}|null {
  const match=/^depth-(gourd|east-gap|driftwood)-(bb|bf|fb|ff)$/.exec(name);
  if (!match) return null;
  const landmarks:Record<string,Point>={gourd:{x:.58,y:.66},'east-gap':{x:.74,y:.68},driftwood:{x:.33,y:.72}};
  const p=landmarks[match[1]];const side=match[2];
  // East marker's authored collision clamps feet north of .68 at x .66..82.
  // Probe its left overlap edge instead; never bypass or change the gameplay walk mask.
  const hx=match[1]==='east-gap'?SHORE_MARKER.minX-.03:p.x-.025;
  const cx=match[1]==='east-gap'?SHORE_MARKER.minX-.01:p.x+.025;
  return {traveler:{x:hx,y:p.y+(side[0]==='b'?-.02:.02)},cat:{x:cx,y:p.y+(side[1]==='b'?-.02:.02)}};
}

/** Pure deterministic fixture. No store import, storage access or story dispatch. */
export function makeShoreFixture(name: ShoreFixtureName, cat: ShoreVisualProfile['cat']) {
  const save = { ...newGameState('2026-11-11T07:40:00.000Z'), currentScene: 'dba.scene.shore' as const, screen: 'island' as const };
  const post = companionPost('dba.scene.shore', cat === 'S2' ? { 'dba.beat.water': true } : {}, cat === 'S0' ? {} : { 'dba.flag.driftwood': true });
  const overlapCat: Partial<Record<ShoreFixtureName, Point>> = {
    'overlap-left': { x: .18, y: .74 }, 'overlap-center': { x: .33, y: .69 }, 'overlap-right': { x: .58, y: .69 },
  };
  const depth=depthPositions(name);
  return { save, traveler: plantOnGround('dba.scene.shore', depth?.traveler ?? positions[name as keyof typeof positions]), catPost: { ...post, ...overlapCat[name], ...depth?.cat } };
}
