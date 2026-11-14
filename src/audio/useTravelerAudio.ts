import { useEffect, useRef } from 'react';
import type { IslandScene } from '../core/island';
import type { TravelerPresentation } from '../ui/Traveler';
import { useAudio } from './useSoundscape';
import { loadSound } from './sounds';
import { CLOTH, DRINK, STEP_BANKS, variation, type FoleyId } from './soundBank';
import { soundScope } from './soundScope';

export function groundMaterial(scene: IslandScene): keyof typeof STEP_BANKS {
  if (scene === 'dba.scene.shore') return 'sand';
  if (scene === 'dba.scene.yard' || scene === 'dba.scene.night') return 'stone';
  // Camp porch, hall floor and the path's authored wooden bridge.
  return 'wood';
}

/** Follow the actually presented contact frames, not a second walking timer. */
export function useTravelerAudio(presentation: TravelerPresentation, scene: IslandScene, paused: boolean, actionSeq: number, response?: { spot: string; kind: string } | null) {
  const audio = useAudio(!presentation.presentationFrozen);
  const enabled = audio.status === 'ready' && !audio.muted && audio.volume > 0 && (audio.effects ?? 1) > 0 && !paused && !presentation.presentationFrozen;
  const { blend } = presentation.current;
  const live = useRef(presentation); live.current = presentation;
  const walking = presentation.moving && blend.pose === 'walk';
  const owner = useRef<ReturnType<typeof soundScope> | null>(null);
  const lastFrame = useRef(-1);
  const actionArmed = useRef(false);
  const contactIdentity = useRef('');
  const lastSound = useRef<FoleyId>();
  const lastCloth = useRef<FoleyId>();
  const lastAt = useRef(-Infinity);
  const material = groundMaterial(scene);
  const sequence = walking ? 0 : actionSeq;
  useEffect(() => {
    if (!enabled) return;
    // Small, scene-relevant samples only; failure never blocks movement.
    for (const id of [...STEP_BANKS[material], ...CLOTH, ...DRINK, 'water-draw-1','water-draw-2','sit','place','pickup'] as const) void loadSound(id);
  }, [material, enabled]);
  useEffect(() => {
    const identity = `${scene}:${walking}:${blend.pose}:${sequence}`;
    // A pause retires voices, not the contact history of this action. On resume
    // do not repeat the held contact, but allow later contacts (e.g. putting the
    // cup down after a paused swallow) without demanding a second frame zero.
    if (contactIdentity.current !== identity) {
      contactIdentity.current = identity;
      lastFrame.current = -1; actionArmed.current = walking;
    }
    if (!enabled) return;
    const scope = soundScope(); owner.current = scope;
    return () => { scope.dispose(); owner.current = null; };
  }, [scene, enabled, walking, blend.pose, sequence]);
  useEffect(() => {
    const scope = owner.current;
    if (!enabled || !scope || !presentation.current.shown || lastFrame.current === blend.frame) return;
    lastFrame.current = blend.frame;
    if (!walking) {
      // Repeated actions can briefly still show the previous clip's last frame.
      // Wait for the new clip to start before sounding its contacts.
      if (blend.frame === 0) actionArmed.current = true;
      if (!actionArmed.current) return;
    }
    const pan = Math.max(-.45, Math.min(.45, (presentation.x-.5)*.8));
    if (walking && (blend.frame === 0 || blend.frame === 2)) {
      const now = performance.now();
      if (now - lastAt.current < 150) return; // No backlog/burst under frame drops.
      lastAt.current = now;
      const id = variation<FoleyId>(STEP_BANKS[material], lastSound.current); lastSound.current = id;
      scope.play(id, { level: .8, pan, rate: .97+Math.random()*.06, maxAge: 180,
        valid: () => live.current.moving && live.current.current.blend.pose === 'walk' && live.current.current.blend.frame === blend.frame });
      if (blend.frame === 2) {
        const cloth = variation<FoleyId>(CLOTH, lastCloth.current); lastCloth.current = cloth;
        scope.play(cloth, { level: .22, pan, maxAge: 150 });
      }
    } else if (!walking && blend.pose === 'drink') {
      if (blend.frame === 0) scope.play(variation(['water-draw-1','water-draw-2'] as const), { level: .8, pan });
      if (blend.frame === 2) scope.play(variation(DRINK), { level: .9, pan });
      if (blend.frame === 3) scope.play('place', { level: .5, pan });
    } else if (!walking && blend.pose === 'lie' && blend.frame === 1) {
      scope.play('sit', { level: .75, pan });
    } else if (!walking && blend.pose === 'reach' && blend.frame === 2) {
      // These contacts happen visibly in the food-table overlay. Its event
      // owner provides sound there; closing it must not replay a delayed hand.
      if (response?.spot === 'food-self' || response?.spot === 'food-companion' || response?.spot === 'food-inspect') return;
      const id = response?.kind !== 'ok' ? 'cloth-1' : response.spot === 'water-spring'
        ? variation(['water-draw-1','water-draw-2'] as const)
        : response.spot === 'yard-give' || response.spot === 'act:dba.word.eat' ? 'place' : 'pickup';
      scope.play(id, { level: .55, pan });
    }
  }, [enabled, walking, blend.pose, blend.frame, presentation.current.shown, presentation.x, material, sequence, response?.spot, response?.kind]);
}
