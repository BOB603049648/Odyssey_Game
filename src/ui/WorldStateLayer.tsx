import { useId, useRef, useState, type CSSProperties } from 'react';
import type { IslandScene } from '../core/island';
import type { WorldState } from '../core/worldState';
import shoreWithoutLadle from '../assets/art/states/shore-carried.webp';
import yardAfterSharing from '../assets/art/states/yard-shared.webp';
import { usePagePresentation } from './useCinematicClock';
import { useAssetSrc } from './useAssetSrc';
import { forgetSlotAsset, loadSlotAsset, resolveSlotAsset } from '../content/slotAssets';
import { decodeAssetUrl } from '../content/decodedImage';
import { notifyAssetUpdates } from '../content/assetUpdates';
import './worldState.css';

/** Full-size edited plates, registered to the same edges as the original art.
 * Only the marked part is exposed, so unchanged scenery is never doubled. */
export type WorldStatePatches = {
  shoreWithoutLadle?: string;
  yardAfterSharing?: string;
};
const DEFAULT_PATCHES: WorldStatePatches = { shoreWithoutLadle, yardAfterSharing };
const PATCH_ASSETS = new Map([[shoreWithoutLadle, 'art.shore.carried'], [yardAfterSharing, 'art.yard.shared']]);
const customPatches = new Map<string, string>();
/** Default plates share the first-screen cache and its explicit retry. Optional
 * supplied plates use the same mounted-consumer recovery lifecycle by URL. */
const PATCH_API = {
  resolve: (src: string | null): string | null => {
    if (!src) return null;
    const asset = PATCH_ASSETS.get(src);
    return asset ? resolveSlotAsset(asset) : customPatches.get(src) ?? null;
  },
  load: async (src: string | null): Promise<string | null> => {
    if (!src) return null;
    const asset = PATCH_ASSETS.get(src);
    if (asset) return loadSlotAsset(asset);
    const cached = customPatches.get(src); if (cached) return cached;
    const decoded = await decodeAssetUrl(src);
    customPatches.set(src, decoded); notifyAssetUpdates(); return decoded;
  },
  forget: (src: string) => {
    const asset = PATCH_ASSETS.get(src);
    if (asset) forgetSlotAsset(asset);
    else { customPatches.delete(src); notifyAssetUpdates(); }
  },
};
export type WorldPatchRegion = { x: number; y: number; width: number; height: number };
export const WORLD_PATCH_REGIONS = {
  shoreLadle: { x: .545, y: .565, width: .14, height: .145 },
  yardSource: { x: .215, y: .815, width: .105, height: .10 },
  yardShare: { x: .745, y: .805, width: .105, height: .10 },
} satisfies Record<string, WorldPatchRegion>;

function RegisteredPatch({ id, src, region, active }: {
  id: string; src: string; region: WorldPatchRegion; active: boolean;
}) {
  const { src: readySrc, onError } = useAssetSrc(src, PATCH_API);
  const [epoch, setEpoch] = useState(0);
  const [result, setResult] = useState<{ src: string; epoch: number; status: 'ready' | 'failed' } | null>(null);
  const image = useRef<HTMLImageElement | null>(null);
  const failed = useRef(new WeakSet<HTMLImageElement>());
  const status = result?.src === src && result.epoch === epoch && (readySrc || result.status === 'failed') ? result.status : 'loading';
  const frame: CSSProperties = {
    left: `${region.x * 100}%`, top: `${region.y * 100}%`,
    width: `${region.width * 100}%`, height: `${region.height * 100}%`,
    opacity: active && status === 'ready' ? 1 : 0,
  };
  const registration: CSSProperties = {
    left: `${-region.x / region.width * 100}%`, top: `${-region.y / region.height * 100}%`,
    width: `${100 / region.width}%`, height: `${100 / region.height}%`,
  };
  // Even an inactive patch loads on entering its scene. Taking an object then
  // needs no new request, and repeating/undoing a puzzle does not flash a plate.
  return <div className="world-state-patch" data-testid={`world-patch-${id}`} data-active={active ? 'yes' : 'no'} data-status={status} style={frame}>
    {readySrc ? <img key={`${src}:${epoch}`} ref={image} src={readySrc} alt="" draggable={false} style={registration}
      onLoad={event => {
        if (event.currentTarget === image.current && event.currentTarget.isConnected) setResult({ src, epoch, status: 'ready' });
      }} onError={event => {
        const node = event.currentTarget;
        if (node !== image.current || !node.isConnected || failed.current.has(node) || node.complete && node.naturalWidth > 0) return;
        failed.current.add(node);
        // A successful off-DOM retry does not fix the browser's failed native
        // image. Give the redecoded source a new node, including batched retry.
        setEpoch(value => value + 1); setResult({ src, epoch: epoch + 1, status: 'failed' }); onError();
      }} /> : null}
  </div>;
}

const DUST = [
  { x: 203, y: 211, delay: -2, duration: 15 }, { x: 260, y: 247, delay: -9, duration: 17 },
  { x: 317, y: 286, delay: -5, duration: 18 }, { x: 371, y: 322, delay: -13, duration: 16 },
  { x: 427, y: 352, delay: -7, duration: 20 }, { x: 472, y: 386, delay: -11, duration: 19 },
];

function Fire({ x, y, gradient, blur, night }: { x: number; y: number; gradient: string; blur: string; night: boolean }) {
  return <g transform={`translate(${x} ${y})`} data-testid="world-fire" data-night={night ? 'yes' : 'no'}>
    <ellipse className="world-fire-glow world-animated" rx={night ? 76 : 46} ry={night ? 29 : 23} fill={`url(#${gradient})`} />
    <g filter={`url(#${blur})`} className="world-fire-core">
      <path className="world-flame world-animated" d="M-9 3 Q-12-5-5-13 Q-4-5 0-18 Q6-8 9 3Z" fill="#ffc56d" />
      <path className="world-flame world-flame-second world-animated" d="M-4 3 Q-7-4-1-12 Q-1-6 3-8 Q7-2 4 3Z" fill="#ffe4ac" />
    </g>
    {night ? <g fill="#f2bc76" className="world-embers">
      <circle className="world-ember world-animated" cx="-9" cy="-9" r=".8" />
      <circle className="world-ember world-animated" cx="3" cy="-12" r=".7" style={{ animationDelay: '-1.7s' }} />
      <circle className="world-ember world-animated" cx="12" cy="-6" r=".6" style={{ animationDelay: '-3.2s' }} />
    </g> : null}
  </g>;
}

/** Local motion shares the painted scene's world coordinates and sits behind
 * actors. CSS owns animation time; React only responds to scene/state changes. */
export function WorldStateLayer({ scene, state, paused = false, patches = DEFAULT_PATCHES }: {
  scene: IslandScene; state: WorldState; paused?: boolean; patches?: WorldStatePatches;
}) {
  const { visible, reduced } = usePagePresentation();
  const running = visible && !reduced && !paused;
  const uid = useId().replace(/:/g, '');
  const gradient = `world-glow-${uid}`, blur = `world-blur-${uid}`;
  const carrying = state.water === 'carried' || state.water === 'filled';
  const taken = state.food.stage === 'taken' || state.food.stage === 'allocating' || state.food.stage === 'done';
  return <div className="world-state-layer" data-testid="world-state-layer" data-scene={scene}
    data-running={running ? 'yes' : 'no'} data-reduced={reduced ? 'yes' : 'no'}
    data-water={state.water} data-food={state.food.stage} data-rested={state.rested ? 'yes' : 'no'} aria-hidden="true">
    {scene === 'dba.scene.shore' && patches.shoreWithoutLadle ? <RegisteredPatch id="shore-ladle" src={patches.shoreWithoutLadle} region={WORLD_PATCH_REGIONS.shoreLadle} active={carrying} /> : null}
    {scene === 'dba.scene.yard' && patches.yardAfterSharing ? <>
      <RegisteredPatch id="yard-source" src={patches.yardAfterSharing} region={WORLD_PATCH_REGIONS.yardSource} active={taken} />
      <RegisteredPatch id="yard-share" src={patches.yardAfterSharing} region={WORLD_PATCH_REGIONS.yardShare} active={state.food.stage === 'done'} />
    </> : null}
    <svg className="world-local-atmosphere" viewBox="0 0 1280 720" preserveAspectRatio="none" focusable="false">
      <defs>
        <radialGradient id={gradient}><stop stopColor="#efaf54" stopOpacity=".42" /><stop offset=".45" stopColor="#dfa24d" stopOpacity=".15" /><stop offset="1" stopColor="#d7933d" stopOpacity="0" /></radialGradient>
        <filter id={blur} x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="1.1" /></filter>
      </defs>
      {scene === 'dba.scene.shore' ? <g data-testid="world-spring" fill="none" strokeLinecap="round">
        <path className="world-water-stream world-animated" d="M776 442 Q774 450 776 458 L775 469" />
        <path className="world-water-stream world-water-spill world-animated" d="M770 490 Q771 495 769 501" />
        <g transform="translate(776 474)">
          <ellipse className="world-water-ring world-animated" rx="23" ry="4" />
          <ellipse className="world-water-ring world-water-ring-second world-animated" rx="15" ry="2.6" />
        </g>
      </g> : null}
      {scene === 'dba.scene.camp' ? <Fire x={995} y={453} gradient={gradient} blur={blur} night={false} /> : null}
      {scene === 'dba.scene.night' ? <Fire x={792} y={505} gradient={gradient} blur={blur} night /> : null}
      {scene === 'dba.scene.hall' ? <g className="world-window-dust" data-testid="world-window-dust">
        {DUST.map((dust, i) => <circle key={i} className="world-dust-mote world-animated" cx={dust.x} cy={dust.y} r={i % 2 ? .9 : .65}
          style={{ animationDelay: `${dust.delay}s`, animationDuration: `${dust.duration}s` }} />)}
      </g> : null}
    </svg>
  </div>;
}
