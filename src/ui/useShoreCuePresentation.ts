import { useCallback, useEffect, useLayoutEffect, type RefObject } from 'react';

type Rect = Pick<DOMRectReadOnly, 'x' | 'y' | 'width' | 'height'>;
type CueState = 'far' | 'glance' | 'near';

/** Screen-space decoration only; never returns a target position or hitbox. */
function presentation(view: Rect, target: Rect, cue: Rect, previousScale: number, state: CueState, stick: Rect | null) {
  const small = view.width <= 960 || view.height <= 540;
  // Undo only our previous transform. Quantize floating measurement noise, not animation.
  const width = Number((cue.width / previousScale).toFixed(6));
  const height = Number((cue.height / previousScale).toFixed(6));
  const fraction = { far: .06, glance: .07, near: .08 }[state];
  const scale = small ? Math.min(1, Math.min(view.width, view.height) * fraction / width, target.width * .75 / width) : 1;
  const cx = cue.x + cue.width / 2;
  const cy = cue.y + cue.height / 2;
  const halfW = width * scale / 2;
  const halfH = height * scale / 2;
  const obscured = small && !!stick && stick.width > 0 && stick.height > 0 &&
    cx + halfW > stick.x - 8 && cx - halfW < stick.x + stick.width + 8 &&
    cy + halfH > stick.y - 8 && cy - halfH < stick.y + stick.height + 8;
  return { scale, small, obscured };
}

/** Existing scene-slot owns the cue and anchor. No new RAF, overlay, input or storage. */
export function useShoreCuePresentation(viewportRef: RefObject<HTMLDivElement>, enabled: boolean, revision: string) {
  const measure = useCallback(() => {
    const stage = viewportRef.current;
    if (!enabled || !stage) return;
    const view = stage.getBoundingClientRect();
    if (view.width <= 0 || view.height <= 0) return;
    if (stage.dataset.cuePresentation !== 'viewport') stage.dataset.cuePresentation = 'viewport';
    const stick = stage.querySelector<HTMLElement>('.walk-stick')?.getBoundingClientRect() ?? null;
    // Read every rect before writing decoration styles; source entity/target styles untouched.
    const changes = [...stage.querySelectorAll<HTMLElement>('[data-shore-visual="candidate"] .scene-slot > .prop-cue')].flatMap(el => {
      const target = el.parentElement!;
      const rect = el.getBoundingClientRect();
      const targetRect = target.getBoundingClientRect();
      if (rect.width <= 0 || rect.height <= 0 || targetRect.width <= 0) return [];
      const previousScale = Number(el.style.getPropertyValue('--cue-scale')) || 1;
      const raw = target.dataset.cue;
      const state: CueState = raw === 'near' || raw === 'glance' ? raw : 'far';
      return [{ el, ...presentation(view, targetRect, rect, previousScale, state, stick) }];
    });
    for (const { el, scale, small, obscured } of changes) {
      const value = String(scale);
      if (el.style.getPropertyValue('--cue-scale') !== value) el.style.setProperty('--cue-scale', value);
      if (el.dataset.cueSmall !== (small ? 'yes' : 'no')) el.dataset.cueSmall = small ? 'yes' : 'no';
      if (el.dataset.cueObscured !== (obscured ? 'yes' : 'no')) el.dataset.cueObscured = obscured ? 'yes' : 'no';
    }
  }, [enabled, viewportRef]);

  useLayoutEffect(() => { measure(); }, [measure, revision]);
  useEffect(() => {
    const stage = viewportRef.current;
    if (!enabled || !stage) return;
    let disposed = false;
    const resize = () => { if (!disposed) measure(); };
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(resize);
    observer?.observe(stage);
    const stick = stage.querySelector('.walk-stick');
    if (stick) observer?.observe(stick);
    window.addEventListener('resize', resize);
    return () => {
      disposed = true;
      observer?.disconnect();
      window.removeEventListener('resize', resize);
      delete stage.dataset.cuePresentation;
      for (const el of stage.querySelectorAll<HTMLElement>('.prop-cue')) {
        el.style.removeProperty('--cue-scale');
        delete el.dataset.cueSmall;
        delete el.dataset.cueObscured;
      }
    };
  }, [enabled, measure, viewportRef]);
}
