import { useEffect, useState, type CSSProperties } from 'react';
import { sceneAssembly } from '../content/catalog';
import { loadSlotAsset, resolveSlotAsset } from '../content/slotAssets';
import { isIslandScene, type IslandScene } from '../core/island';
import type { SceneAssembly, SceneSlot, SceneSlotName } from '../core/schema';
import { BANDS } from '../core/stage';
import type { Point } from '../core/walk';
import { buildingFoot, FOOT_PIVOT, parallaxBleed, worldToScreen } from '../core/world';
import { hasPngContact } from './cohesion';
import { isStillId, StillFrame } from './stillFrames';

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
  if (isPortal(slot)) return false;
  if (slot.slot !== 'props' && !isCurtain(slot)) return false;
  return slot.y !== undefined && slot.y > feetY;
}

function includeSlot(slot: SceneSlot, pass: PlatePass, feetY: number): boolean {
  if (pass === 'all') return true;
  const inFront = drawsInFront(slot, feetY);
  if (pass === 'near') return inFront;
  if (pass === 'fg') return slot.slot === 'fg' && !isCurtain(slot);
  if (inFront || slot.slot === 'fg') return false;
  return BACK_SLOTS.has(slot.slot) || isCurtain(slot);
}

export type SpotBeat = { spot: string; kind: 'ok' | 'no' };

export function PlateStack({
  plate,
  previous,
  cam = { x: 0, y: 0 },
  near = [],
  activeSpots = null,
  showWalkMask = false,
  pass = 'all',
  feetY = 1,
  beat = null,
}: {
  plate: string;
  previous: string | null;
  cam?: Point;
  near?: readonly string[];
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
          leaving
          cam={cam}
          near={[]}
          activeSpots={null}
          showWalkMask={false}
          pass={pass}
          feetY={feetY}
          beat={null}
        />
      ) : null}
      <PlateBody
        plate={plate}
        leaving={false}
        incoming={previous !== null}
        cam={cam}
        near={near}
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
  cam,
  near,
  activeSpots,
  showWalkMask,
  pass,
  feetY,
  beat = null,
}: {
  plate: string;
  leaving: boolean;
  incoming?: boolean;
  cam: Point;
  near: readonly string[];
  activeSpots: readonly string[] | null;
  showWalkMask: boolean;
  pass: PlatePass;
  feetY: number;
  beat?: SpotBeat | null;
}) {
  const className = leaving ? 'plate-fade out' : incoming ? 'plate-fade in' : 'plate-fade';
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
        className={className}
        cam={cam}
        near={near}
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

function SlotAssembly({
  kit,
  className,
  cam,
  near,
  activeSpots,
  showWalkMask,
  pass,
  feetY,
  beat = null,
}: {
  kit: SceneAssembly;
  className: string;
  cam: Point;
  near: readonly string[];
  activeSpots: readonly string[] | null;
  showWalkMask: boolean;
  pass: PlatePass;
  feetY: number;
  beat?: SpotBeat | null;
}) {
  const scene = kit.id as IslandScene;
  const slots = [...kit.slots]
    .filter((slot) => includeSlot(slot, pass, feetY))
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
    >
      {slots.map((slot) => (
        <SlotPiece
          key={slot.id}
          scene={scene}
          slot={slot}
          cam={cam}
          lit={slot.spot ? near.includes(slot.spot) : false}
          hidden={slot.spot !== undefined && activeSpots !== null && !activeSpots.includes(slot.spot)}
          showWalkMask={showWalkMask}
          beat={beat}
        />
      ))}
      <div className="ambient ambient-flame" />
      <div className="ambient ambient-rain" />
      <div className="ambient ambient-dark" />
    </div>
  );
}

function SlotPiece({
  scene,
  slot,
  cam,
  lit,
  hidden,
  showWalkMask,
  beat = null,
}: {
  scene: IslandScene;
  slot: SceneSlot;
  cam: Point;
  lit: boolean;
  hidden: boolean;
  showWalkMask: boolean;
  beat?: SpotBeat | null;
}) {
  if (hidden) return null;
  const placed = slot.x !== undefined && slot.y !== undefined;
  const scenic = slot.slot === 'building' && !placed;
  const testId = slot.slot === 'props' ? `prop-${slot.id}` : `slot-${slot.slot}`;
  const src = useSlotSrc(slot.asset);
  const interactable = Boolean(slot.spot);
  const footed = (slot.slot === 'props' || slot.slot === 'building') && !isPortal(slot);
  return (
    <div
      className={lit ? `scene-slot ${placed ? 'placed' : 'full'} lit` : `scene-slot ${placed ? 'placed' : 'full'}`}
      data-slot={slot.slot}
      data-art-id={slot.id}
      data-kind={slot.kind}
      data-parallax={scenic ? 1 : slot.parallax}
      data-spot={slot.spot}
      data-interactable={interactable ? 'yes' : 'no'}
      data-cue={interactable ? (lit ? 'near' : 'far') : undefined}
      data-placeholder={src ? 'art' : 'block'}
      data-anchor={footed ? 'foot' : isPortal(slot) ? 'portal' : undefined}
      data-coplanar={scenic ? 'yes' : undefined}
      data-shadow={slot.slot === 'props' ? (hasPngContact(slot.asset ?? slot.id) ? 'png' : 'none') : undefined}
      data-result={beat && slot.spot === beat.spot ? beat.kind : undefined}
      data-testid={testId}
      style={slotStyle(slot, cam)}
    >
      <div className="prop-body">
        {slot.kind === 'mural-wall' ? <span className="mural-bite" data-testid="mural-bite" /> : null}
        {src ? <img className="slot-asset" src={src} alt="" draggable={false} /> : null}
        {!src && slot.slot === 'ground' ? <GroundPlane scene={scene} kind={slot.kind} /> : null}
        {!src && slot.slot !== 'ground' && slot.kind !== 'empty' ? (
          <div className="slot-block" data-kind={slot.kind} data-placeholder="block" />
        ) : null}
        {interactable ? <span className="prop-cue" data-testid={`cue-${slot.id}`} /> : null}
        {slot.slot === 'ground' && showWalkMask ? <WalkMask scene={scene} /> : null}
      </div>
    </div>
  );
}

function useSlotSrc(asset: string | null | undefined): string | null {
  const [src, setSrc] = useState<string | null>(() => resolveSlotAsset(asset ?? null));
  useEffect(() => {
    let live = true;
    setSrc(resolveSlotAsset(asset ?? null));
    loadSlotAsset(asset ?? null).then((url) => {
      if (live) setSrc(url);
    });
    return () => {
      live = false;
    };
  }, [asset]);
  return src;
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

function slotStyle(slot: SceneSlot, cam: Point): CSSProperties {
  const placed = slot.x !== undefined && slot.y !== undefined;
  const scenic = slot.slot === 'building' && !placed;
  const parallax = scenic ? 1 : slot.parallax;
  const dx = cam.x * (1 - parallax);
  const dy = cam.y * (1 - parallax);
  const shift = `translate3d(${dx}px, ${dy}px, 0)`;
  if (!placed || slot.x === undefined || slot.y === undefined) {
    const bleed = parallax === 1 ? 0 : parallaxBleed(parallax);
    if (slot.slot === 'ground') {
      // Hang the textured floor past the south edge so a parked camera
      // does not reveal empty grade fog under the feet.
      return { transform: shift, top: '0px', right: '0px', bottom: '-22%', left: '0px' };
    }
    return { transform: shift, inset: bleed === 0 ? '0px' : `${-bleed * 100}%` };
  }
  const foot = slot.slot === 'building' ? buildingFoot({ x: slot.x, y: slot.y, h: slot.h }) : { x: slot.x, y: slot.y };
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
