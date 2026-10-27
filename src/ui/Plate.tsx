import type { CSSProperties } from 'react';
import { sceneAssembly } from '../content/catalog';
import { resolveSlotAsset } from '../content/slotAssets';
import { isIslandScene, type IslandScene } from '../core/island';
import type { SceneAssembly, SceneSlot, SceneSlotName } from '../core/schema';
import { BANDS } from '../core/stage';
import type { Point } from '../core/walk';
import { isStillId, StillFrame } from './stillFrames';

const SLOT_ORDER: readonly SceneSlotName[] = ['sky', 'far', 'ground', 'building', 'props', 'fg'];

const BACK_SLOTS: ReadonlySet<SceneSlotName> = new Set(['sky', 'far', 'ground', 'building', 'props']);

export function PlateStack({
  plate,
  previous,
  cam = { x: 0, y: 0 },
  near = [],
  activeSpots = null,
  showWalkMask = false,
  pass = 'all',
}: {
  plate: string;
  previous: string | null;
  cam?: Point;
  near?: readonly string[];
  activeSpots?: readonly string[] | null;
  showWalkMask?: boolean;
  pass?: 'all' | 'back' | 'fg';
}) {
  return (
    <div className={pass === 'fg' ? 'plate-stack pass-fg' : 'plate-stack pass-back'} aria-hidden="true">
      {previous ? (
        <PlateBody
          plate={previous}
          leaving
          cam={cam}
          near={[]}
          activeSpots={null}
          showWalkMask={false}
          pass={pass}
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
}: {
  plate: string;
  leaving: boolean;
  incoming?: boolean;
  cam: Point;
  near: readonly string[];
  activeSpots: readonly string[] | null;
  showWalkMask: boolean;
  pass: 'all' | 'back' | 'fg';
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
}: {
  kit: SceneAssembly;
  className: string;
  cam: Point;
  near: readonly string[];
  activeSpots: readonly string[] | null;
  showWalkMask: boolean;
  pass: 'all' | 'back' | 'fg';
}) {
  const scene = kit.id as IslandScene;
  const slots = [...kit.slots]
    .filter((slot) => (pass === 'fg' ? slot.slot === 'fg' : pass === 'back' ? BACK_SLOTS.has(slot.slot) : true))
    .sort((a, b) => SLOT_ORDER.indexOf(a.slot) - SLOT_ORDER.indexOf(b.slot));
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
        />
      ))}
      <div className="ambient ambient-water" />
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
}: {
  scene: IslandScene;
  slot: SceneSlot;
  cam: Point;
  lit: boolean;
  hidden: boolean;
  showWalkMask: boolean;
}) {
  if (hidden) return null;
  const placed = slot.x !== undefined && slot.y !== undefined;
  const testId = slot.slot === 'props' ? `prop-${slot.id}` : `slot-${slot.slot}`;
  const src = resolveSlotAsset(slot.asset);
  const interactable = Boolean(slot.spot);
  return (
    <div
      className={lit ? `scene-slot ${placed ? 'placed' : 'full'} lit` : `scene-slot ${placed ? 'placed' : 'full'}`}
      data-slot={slot.slot}
      data-art-id={slot.id}
      data-kind={slot.kind}
      data-parallax={slot.parallax}
      data-spot={slot.spot}
      data-interactable={interactable ? 'yes' : 'no'}
      data-cue={interactable ? (lit ? 'near' : 'far') : undefined}
      data-placeholder={src ? 'art' : 'block'}
      data-testid={testId}
      style={slotStyle(slot, cam, placed)}
    >
      <div className="prop-body">
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

function slotStyle(slot: SceneSlot, cam: Point, placed: boolean): CSSProperties {
  const dx = cam.x * (1 - slot.parallax);
  const dy = cam.y * (1 - slot.parallax);
  const shift = `translate3d(${dx}px, ${dy}px, 0)`;
  if (!placed || slot.x === undefined || slot.y === undefined) return { transform: shift };
  return {
    left: `${slot.x * 100}%`,
    top: `${slot.y * 100}%`,
    width: `${(slot.w ?? 0.12) * 100}%`,
    height: `${(slot.h ?? 0.1) * 100}%`,
    transform: `translate(-50%, -50%) ${shift}`,
  };
}

export function EnterVeil() {
  return <div className="enter-veil" aria-hidden="true" />;
}
