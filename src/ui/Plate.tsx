import { type CSSProperties } from 'react';
import { sceneAssembly } from '../content/catalog';
import { forgetSlotAsset, loadSlotAsset, resolveSlotAsset } from '../content/slotAssets';
import { useAssetSrc } from './useAssetSrc';
import { isIslandScene, type IslandScene } from '../core/island';
import type { SceneAssembly, SceneSlot, SceneSlotName } from '../core/schema';
import { GROUND_SOUTH_HANG, shoreGroundMaskImage } from '../core/shoreGroundLayout';
import { BANDS } from '../core/stage';
import { shoreBuildingFoot } from '../core/shoreBuildingPlacement';
import type { Point } from '../core/walk';
import { buildingFoot, FOOT_PIVOT, parallaxBleed, worldToScreen } from '../core/world';
import { hasPngContact } from './cohesion';
import { isStillId, StillFrame } from './stillFrames';
import { SceneArt } from './SceneArt';

const SLOT_ORDER: readonly SceneSlotName[] = ['sky', 'far', 'ground', 'building', 'props', 'fg'];

const BACK_SLOTS: ReadonlySet<SceneSlotName> = new Set(['sky', 'far', 'ground', 'building', 'props']);

export type PlatePass = 'all' | 'back' | 'near' | 'fg';

function isCurtain(slot: SceneSlot): boolean {
  return slot.kind === 'curtain' || slot.kind === 'north-curtain';
}

/** East rock used to float on a center pivot. It now shares the prop foot, on the sand. */
function isPortal(_slot: SceneSlot): boolean {
  return false;
}

/** Closer than the traveler's feet: paint after the figure. Curtain hem is the cloth's foot. */
export function drawsInFront(slot: SceneSlot, feetY: number): boolean {
  if (slot.depthMode === 'wall-art' || isPortal(slot)) return false;
  if (slot.slot !== 'props' && !isCurtain(slot)) return false;
  return slot.y !== undefined && slot.y > feetY;
}

function includeSlot(slot: SceneSlot, pass: PlatePass, feetY: number): boolean {
  if (pass === 'all') return true;
  const inFront = drawsInFront(slot, feetY);
  if (pass === 'near') return inFront;
  if (pass === 'fg') return slot.slot === 'fg' && !isCurtain(slot);
  if (inFront || (slot.slot === 'fg' && !isCurtain(slot))) return false;
  return BACK_SLOTS.has(slot.slot) || isCurtain(slot);
}

export function groundDepthSlots(plate:string, painted = false):SceneSlot[] {
  if (painted && isIslandScene(plate)) return [];
  return isIslandScene(plate) ? (sceneAssembly(plate)?.slots??[]).filter(isGroundDepthSlot) : [];
}
function isGroundDepthSlot(slot:SceneSlot):boolean {
  return slot.slot==='props' && slot.depthMode!=='wall-art' && slot.x!==undefined && slot.y!==undefined;
}

export type SpotBeat = { spot: string; kind: 'ok' | 'no' };

export function PlateStack({
  plate,
  previous,
  cam = { x: 0, y: 0 },
  near = [],
  glance = [],
  activeSpots = null,
  showWalkMask = false,
  pass = 'all',
  feetY = 1,
  beat = null,
  depthScenes = [],
  painted = false,
}: {
  plate: string;
  previous: string | null;
  /** Only these candidate transition scenes move placed props into GroundDepth. */
  depthScenes?: readonly string[];
  /** Production painted environments; false retains the legacy art-review assembly. */
  painted?: boolean;
  cam?: Point;
  near?: readonly string[];
  /** Hotspots about two steps out: readable, not yet in the click radius. */
  glance?: readonly string[];
  activeSpots?: readonly string[] | null;
  showWalkMask?: boolean;
  pass?: PlatePass;
  /** Traveler foot in world Y. Subjects south of this draw in the near pass. */
  feetY?: number;
  /** The hotspot that just succeeded or refused. */
  beat?: SpotBeat | null;
}) {
  return (
    <div className={`plate-stack pass-${pass === 'all' ? 'back' : pass}`} aria-hidden="true">
      {previous ? (
        <PlateBody
          plate={previous}
          painted={painted}
          sharedGround={depthScenes.includes(previous)}
          leaving
          cam={cam}
          near={[]}
          glance={[]}
          activeSpots={null}
          showWalkMask={false}
          pass={pass}
          feetY={feetY}
          beat={null}
        />
      ) : null}
      <PlateBody
        plate={plate}
        painted={painted}
        sharedGround={depthScenes.includes(plate)}
        leaving={false}
        incoming={previous !== null}
        cam={cam}
        near={near}
        glance={glance}
        activeSpots={activeSpots}
        showWalkMask={showWalkMask}
        pass={pass}
        feetY={feetY}
        beat={beat}
      />
    </div>
  );
}

function PlateBody({
  plate,
  leaving,
  incoming = false,
  sharedGround = false,
  cam,
  near,
  glance,
  activeSpots,
  showWalkMask,
  pass,
  feetY,
  beat = null,
  painted = false,
}: {
  plate: string;
  leaving: boolean;
  incoming?: boolean;
  sharedGround?: boolean;
  cam: Point;
  near: readonly string[];
  glance: readonly string[];
  activeSpots: readonly string[] | null;
  showWalkMask: boolean;
  pass: PlatePass;
  feetY: number;
  beat?: SpotBeat | null;
  painted?: boolean;
}) {
  const className = leaving ? 'plate-fade out' : incoming ? 'plate-fade in' : 'plate-fade';
  if (painted && isIslandScene(plate)) return pass === 'all' || pass === 'back'
    ? <PaintedEnvironment scene={plate} className={className} near={near} glance={glance} activeSpots={activeSpots} beat={leaving ? null : beat} /> : null;
  if (plate === 'keyart') {
    return (
      <div className={className} data-ambient={plate}>
        <div className="plate-photo" data-plate="keyart" />
      </div>
    );
  }
  if (isStillId(plate)) {
    return (
      <div className={className} data-ambient={plate}>
        <StillFrame id={plate} />
      </div>
    );
  }
  if (isIslandScene(plate)) {
    const kit = sceneAssembly(plate);
    if (!kit) return null;
    return (
      <SlotAssembly
        kit={kit}
        sharedGround={sharedGround}
        className={className}
        cam={cam}
        near={near}
        glance={glance}
        activeSpots={activeSpots}
        showWalkMask={showWalkMask && !leaving}
        pass={pass}
        feetY={feetY}
        beat={leaving ? null : beat}
      />
    );
  }
  return (
    <div className={className} data-ambient={plate} data-placeholder="wash">
      <div className="plate-wash" data-plate={plate} />
    </div>
  );
}

function PaintedEnvironment({ scene, className, near, glance, activeSpots, beat }: {
  scene: IslandScene; className: string; near: readonly string[]; glance: readonly string[];
  activeSpots: readonly string[] | null; beat: SpotBeat | null;
}) {
  const { src, onError } = useSlotSrc(`art.${scene.split('.').at(-1)}.landscape`);
  return <div className={className} data-assembly="painted" data-ambient={scene} data-shore-visual="candidate">
    {src ? <img className="painted-environment" data-testid="painted-environment" src={src} alt="" draggable={false} onError={onError} /> : null}
    {(sceneAssembly(scene)?.slots ?? []).filter(slot => slot.slot === 'props' && slot.spot).map(slot => <SlotPiece key={slot.id}
      scene={scene} slot={{ ...slot, ...slot.playAt }} cam={{ x: 0, y: 0 }} painted
      lit={!!slot.spot && near.includes(slot.spot)} glanced={!!slot.spot && glance.includes(slot.spot)}
      hidden={!!slot.spot && activeSpots !== null && !activeSpots.includes(slot.spot)}
      showWalkMask={false} beat={beat} />)}
  </div>;
}

function SlotAssembly({
  kit,
  sharedGround = false,
  className,
  cam,
  near,
  glance,
  activeSpots,
  showWalkMask,
  pass,
  feetY,
  beat = null,
}: {
  kit: SceneAssembly;
  sharedGround?: boolean;
  className: string;
  cam: Point;
  near: readonly string[];
  glance: readonly string[];
  activeSpots: readonly string[] | null;
  showWalkMask: boolean;
  pass: PlatePass;
  feetY: number;
  beat?: SpotBeat | null;
}) {
  const scene = kit.id as IslandScene;
  const slots = [...kit.slots]
    .filter((slot) => includeSlot(slot, pass, feetY) && !(sharedGround && isGroundDepthSlot(slot)))
    .sort((a, b) => {
      if (pass === 'near') return (a.y ?? 0) - (b.y ?? 0);
      const order = SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot);
      if (order !== 0) return order;
      return (a.y ?? 0) - (b.y ?? 0);
    });
  return (
    <div
      className={className}
      data-assembly="slots"
      data-ambient={kit.id}
      data-legacy-plate={kit.legacyPlate ?? 'none'}
      data-grade={kit.grade}
      data-shore-visual={scene === 'dba.scene.shore' ? 'candidate' : undefined}
    >
      {slots.flatMap((slot) => {
        const piece = (
          <SlotPiece
            key={slot.id}
            scene={scene}
            slot={slot}
            cam={cam}
            lit={slot.spot ? near.includes(slot.spot) : false}
            glanced={slot.spot ? glance.includes(slot.spot) : false}
            hidden={slot.spot !== undefined && activeSpots !== null && !activeSpots.includes(slot.spot)}
            showWalkMask={showWalkMask}
            beat={beat}
          />
        );
        if (scene === 'dba.scene.shore' && slot.slot === 'ground' && pass !== 'near' && pass !== 'fg') {
          return [piece, <ShoreTread key="shore-tread" />];
        }
        return [piece];
      })}
      <div className="ambient ambient-flame" />
      <div className="ambient ambient-rain" />
      <div className="ambient ambient-dark" />
    </div>
  );
}

export function SlotPiece({
  scene,
  slot,
  cam,
  lit,
  glanced,
  hidden,
  showWalkMask,
  beat = null,
  painted = false,
}: {
  scene: IslandScene;
  slot: SceneSlot;
  cam: Point;
  lit: boolean;
  glanced: boolean;
  hidden: boolean;
  showWalkMask: boolean;
  beat?: SpotBeat | null;
  /** The environment already contains the object. Keep only its interaction cue. */
  painted?: boolean;
}) {
  const { src, onError } = useSlotSrc(painted ? null : slot.asset);
  if (hidden) return null;
  const placed = slot.x !== undefined && slot.y !== undefined;
  const scenic = slot.slot === 'building' && !placed;
  const testId = slot.slot === 'props' ? `prop-${slot.id}` : `slot-${slot.slot}`;
  const interactable = Boolean(slot.spot);
  const cue = interactable ? (lit ? 'near' : glanced ? 'glance' : 'far') : undefined;
  const footed = (slot.slot === 'props' || slot.slot === 'building') && !isPortal(slot);
  const shoreCandidate = scene === 'dba.scene.shore';
  return (
    <div
      className={lit ? `scene-slot ${placed ? 'placed' : 'full'} lit` : `scene-slot ${placed ? 'placed' : 'full'}`}
      data-slot={slot.slot}
      data-art-id={slot.id}
      data-kind={slot.kind}
      data-parallax={slotParallax(slot, shoreCandidate)}
      data-spot={slot.spot}
      data-interactable={interactable ? 'yes' : 'no'}
      data-cue={cue}
      data-placeholder={painted ? 'painted' : src ? 'art' : 'block'}
      data-anchor={footed ? 'foot' : isPortal(slot) ? 'portal' : undefined}
      data-coplanar={scenic || (placed && footed && slot.parallax === 1) ? 'yes' : undefined}
      data-shadow={slot.slot === 'props' ? (hasPngContact(slot.asset ?? slot.id) ? 'png' : 'none') : undefined}
      data-result={beat && slot.spot === beat.spot ? beat.kind : undefined}
      data-testid={testId}
      style={slotStyle(slot, cam, shoreCandidate)}
    >
      <div className="prop-body">
        {src && placed && slot.asset ? <SceneArt asset={slot.asset} src={src} onError={onError} /> : src ? (
          <img
            className={scene === 'dba.scene.shore' && slot.slot === 'ground' ? 'slot-asset shore-ground-plate' : 'slot-asset'}
            src={src}
            alt=""
            draggable={false}
            onError={onError}
            style={
              scene === 'dba.scene.shore' && slot.slot === 'ground'
                ? { WebkitMaskImage: shoreGroundMaskImage(), maskImage: shoreGroundMaskImage() }
                : undefined
            }
          />
        ) : null}
        {!src && slot.slot === 'ground' ? <GroundPlane scene={scene} kind={slot.kind} /> : null}
        {!painted && !src && slot.slot !== 'ground' && slot.kind !== 'empty' ? (
          <div className="slot-block" data-kind={slot.kind} data-placeholder="block" />
        ) : null}
        {interactable && !shoreCandidate ? <span className="prop-cue" data-testid={`cue-${slot.id}`} /> : null}
        {slot.slot === 'ground' && showWalkMask ? <WalkMask scene={scene} /> : null}
      </div>
      {interactable && shoreCandidate ? <span className="prop-cue" data-testid={`cue-${slot.id}`} /> : null}
    </div>
  );
}

const SLOT_SRC_API = {
  resolve: resolveSlotAsset,
  load: loadSlotAsset,
  forget: forgetSlotAsset,
};

function useSlotSrc(asset: string | null | undefined) {
  return useAssetSrc(asset, SLOT_SRC_API);
}

function ShoreTread() {
  const band = BANDS['dba.scene.shore'];
  return (
    <div
      className="shore-tread"
      data-testid="shore-tread"
      style={{
        left: `${band.minX * 100}%`,
        top: `${band.minY * 100}%`,
        width: `${(band.maxX - band.minX) * 100}%`,
        height: `${(band.maxY - band.minY) * 100}%`,
      }}
    >
      <div className="shore-tread-envelope" data-testid="shore-tread-envelope">
        <div className="shore-tread-content" data-testid="shore-tread-content">
          <span className="shore-fog-line" data-testid="shore-fog-line" />
          <span className="shore-sand-trace" data-testid="shore-sand-trace" />
          <span className="shore-stone-lip" data-testid="shore-stone-lip" />
        </div>
      </div>
    </div>
  );
}

function WalkMask({ scene }: { scene: IslandScene }) {
  const band = BANDS[scene];
  return (
    <div
      className="walkable-mask"
      data-testid="walkable-mask"
      style={{
        left: `${band.minX * 100}%`,
        top: `${band.minY * 100}%`,
        width: `${(band.maxX - band.minX) * 100}%`,
        height: `${(band.maxY - band.minY) * 100}%`,
      }}
    />
  );
}

function GroundPlane({ scene, kind }: { scene: IslandScene; kind: string }) {
  const band = BANDS[scene];
  const bandStyle: CSSProperties = {
    left: `${band.minX * 100}%`,
    top: `${band.minY * 100}%`,
    width: `${(band.maxX - band.minX) * 100}%`,
    height: `${(band.maxY - band.minY) * 100}%`,
  };
  return (
    <div className="ground-plane" data-ground={kind} data-placeholder="block">
      <div className="ground-forbid" />
      <div className="ground-walk" data-testid="ground-walk" style={bandStyle} />
    </div>
  );
}

function slotParallax(slot: SceneSlot, shoreCandidate: boolean): number {
  const placed = slot.x !== undefined && slot.y !== undefined;
  if (slot.slot === 'building' && !placed) return 1;
  if (shoreCandidate && placed && (slot.slot === 'building' || slot.slot === 'props')) return 1;
  return slot.parallax;
}

function slotStyle(slot: SceneSlot, cam: Point, shoreCandidate = false): CSSProperties {
  const placed = slot.x !== undefined && slot.y !== undefined;
  const parallax = slotParallax(slot, shoreCandidate);
  const dx = cam.x * (1 - parallax);
  const dy = cam.y * (1 - parallax);
  const shift = `translate3d(${dx}px, ${dy}px, 0)`;
  if (!placed || slot.x === undefined || slot.y === undefined) {
    const bleed = parallax === 1 ? 0 : parallaxBleed(parallax);
    if (slot.slot === 'ground' && slot.asset === 'art.shore.ground') {
      // Hang the textured floor past the south edge so a parked camera
      // does not reveal empty grade fog under the feet.
      return { transform: shift, top: '0px', right: '0px', bottom: `${-GROUND_SOUTH_HANG * 100}%`, left: '0px' };
    }
    return { transform: shift, inset: bleed === 0 ? '0px' : `${-bleed * 100}%` };
  }
  const foot = slot.slot === 'building'
    ? shoreCandidate
      ? shoreBuildingFoot({ x: slot.x, y: slot.y, h: slot.h, parallax: slot.parallax })
      : buildingFoot({ x: slot.x, y: slot.y, h: slot.h })
    : { x: slot.x, y: slot.y };
  const pivot = isPortal(slot) ? { x: 0.5, y: 0.5 } : slot.slot === 'props' || slot.slot === 'building' ? FOOT_PIVOT : { x: 0.5, y: 0.5 };
  return {
    ...worldToScreen(foot, pivot, shift),
    width: `${(slot.w ?? 0.12) * 100}%`,
    height: `${(slot.h ?? 0.1) * 100}%`,
  };
}

export function EnterVeil() {
  return <div className="enter-veil" aria-hidden="true" />;
}
