import { useEffect, useId, useRef, useState } from 'react';
import type { Gate } from '../core/stage';
import type { IslandScene } from '../core/island';
import { Glyph } from './glyphs';
import { t } from './i18n';
import { gateLabel, type SpotView } from './spotViews';

const ARROW = { east: '→', west: '←', north: '↑', south: '↓' };

/** Viewport controls stay reachable when a phone camera crops the world exits. */
export function StageControls({ scene, exits, nearby, onTravel, onInteract, guidePinned = false, onToggleGuide, onOpenChange }: {
  scene: IslandScene;
  exits: readonly Gate[];
  nearby: SpotView | null;
  onTravel: (gate: Gate) => void;
  onInteract: (spot: SpotView) => void;
  guidePinned?: boolean;
  onToggleGuide?: () => void;
  onOpenChange?: (open: boolean) => void;
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const toggle = useRef<HTMLButtonElement>(null);
  const routes = useRef<HTMLDivElement>(null);
  const openChanged = useRef(onOpenChange);
  openChanged.current = onOpenChange;
  useEffect(() => { openChanged.current?.(open); }, [open]);
  useEffect(() => () => openChanged.current?.(false), []);
  useEffect(() => setOpen(false), [scene]);
  useEffect(() => {
    if (!open) return;
    routes.current?.querySelector<HTMLButtonElement>('button[data-gate-edge]')?.focus({ preventScroll: true });
    const dismiss = (event: PointerEvent) => {
      if (!routes.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('pointerdown', dismiss);
    return () => document.removeEventListener('pointerdown', dismiss);
  }, [open]);

  return <div className="stage-controls">
    <div className="stage-interaction">
      {nearby ? <button className="stage-action" type="button" data-testid="nearby-action"
        onClick={() => onInteract(nearby)}>
        {nearby.glyph ? <Glyph id={nearby.glyph} /> : null}
        <span>{nearby.ariaLabel || nearby.label}</span><kbd>E</kbd>
      </button> : <p className="movement-help">
        <span className="keyboard-help">{t('controls.keyboard')}</span>
        <span>{t('controls.point')}</span>
      </p>}
    </div>
    <div className="stage-routes" ref={routes} onKeyDown={(event) => {
      if (event.key !== 'Escape' || !open) return;
      event.stopPropagation();
      setOpen(false);
      toggle.current?.focus({ preventScroll: true });
    }} onBlur={(event) => {
      if (!event.currentTarget.contains(event.relatedTarget)) setOpen(false);
    }}>
      {open ? <nav id={panelId} className="route-panel" aria-label={t('controls.destinations')}>
        <p>{t('controls.travelHelp')}</p>
        {onToggleGuide ? <>
          <p className="route-ground-help">浅金色地面可以行走，物件和海水留在范围外。</p>
          <button type="button" className="route-guide-toggle" data-testid="toggle-ground-guide"
            aria-pressed={guidePinned} onClick={onToggleGuide}>
            <span aria-hidden="true">{guidePinned ? '✓' : '◇'}</span>固定地面引导
          </button>
        </> : null}
        {exits.map(gate => <button key={gate.to} type="button" data-testid={`route-${gate.to.split('.').at(-1)}`}
          data-gate-x={gate.x} data-gate-y={gate.y} data-gate-radius={gate.r} data-gate-edge={gate.edge}
          onClick={() => { setOpen(false); toggle.current?.focus({ preventScroll: true }); onTravel(gate); }}>
          <span aria-hidden="true">{gate.edge ? ARROW[gate.edge] : '◇'}</span>{gateLabel(gate.to)}
        </button>)}
      </nav> : null}
      <button ref={toggle} className="route-toggle" type="button" aria-expanded={open}
        aria-controls={open ? panelId : undefined} onClick={() => setOpen(value => !value)}>
        <span aria-hidden="true">◇</span>{t('controls.routes')}
      </button>
    </div>
  </div>;
}
