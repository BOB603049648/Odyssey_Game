import { useId } from 'react';
import type { IslandScene } from '../core/island';
import { groundGuidePath } from '../core/navigation';
import type { Point } from '../core/walk';
import './wayfinding.css';

export type GroundGuideProps = {
  scene: IslandScene;
  /** Show the complete walkable surface. The selected route stays visible
   * after the route menu closes; pass [] to hide that separate cue. */
  visible: boolean;
  /** Normalized world coordinates: current feet, then the remaining groundRoute.
   * Keep every corner; smoothing would cut through the painted obstructions. */
  route: readonly Point[];
  /** Last refused ground click; the movement controller owns its lifetime. */
  blocked?: Point | null;
};

const pixel = (value: number, size: number) => Math.round(value * size * 100) / 100;

/** A world-space hint, never another hit target or a second navigation model. */
export function GroundGuide({ scene, visible, route, blocked = null }: GroundGuideProps) {
  const uid = useId().replace(/:/g, '');
  const refusal = blocked && Number.isFinite(blocked.x) && Number.isFinite(blocked.y) ? blocked : null;
  const points = route.every(point => Number.isFinite(point.x) && Number.isFinite(point.y)) ? route : [];
  const line = points.length > 1 ? points.map((point, i) =>
    `${i ? 'L' : 'M'}${pixel(point.x, 1280)} ${pixel(point.y, 720)}`).join(' ') : '';
  if (!visible && !line && !refusal) return null;
  const ground = groundGuidePath(scene);
  const destination = line ? points.at(-1) : null;
  const clip = `ground-guide-clip-${uid}`;
  const wash = `ground-guide-wash-${uid}`;

  return <svg className="ground-guide" data-testid="ground-guide" data-scene={scene} data-visible={visible ? 'yes' : 'no'}
    viewBox="0 0 1280 720" preserveAspectRatio="none" aria-hidden="true" focusable="false">
    <defs>
      <linearGradient id={wash} x1="0" y1="0" x2="0" y2="1" gradientUnits="objectBoundingBox">
        <stop stopColor="#e9d6a3" stopOpacity=".035" />
        <stop offset="1" stopColor="#dfc385" stopOpacity=".095" />
      </linearGradient>
      <clipPath id={clip}>
        <path d={ground} clipRule="evenodd" />
      </clipPath>
    </defs>
    {visible ? <path className="ground-guide-area" data-testid="ground-guide-area" d={ground}
      fill={`url(#${wash})`} fillRule="evenodd" vectorEffect="non-scaling-stroke" /> : null}
    {line ? <g className="ground-guide-plan" clipPath={`url(#${clip})`}>
      <path className="ground-guide-route-shadow" d={line} vectorEffect="non-scaling-stroke" />
      <path className="ground-guide-route" data-testid="ground-guide-route" d={line}
        vectorEffect="non-scaling-stroke" />
      {destination ? <g className="ground-guide-destination" data-testid="ground-guide-destination"
        transform={`translate(${pixel(destination.x, 1280)} ${pixel(destination.y, 720)})`}>
        <ellipse rx="8" ry="3.5" vectorEffect="non-scaling-stroke" />
        <ellipse className="ground-guide-destination-center" rx="1.8" ry="1" />
      </g> : null}
    </g> : null}
    {refusal ? <g className="ground-guide-blocked" data-testid="ground-guide-blocked"
      transform={`translate(${pixel(refusal.x, 1280)} ${pixel(refusal.y, 720)})`}>
      <ellipse rx="11" ry="6.5" vectorEffect="non-scaling-stroke" />
      <path d="M-3-2.5 3 2.5M3-2.5-3 2.5" vectorEffect="non-scaling-stroke" />
    </g> : null}
  </svg>;
}

export type NavigationNoticeKind = 'blocked' | 'exit' | 'travel';
export type NavigationNoticeProps = { message: string | null; kind: NavigationNoticeKind };

/** Keep the live region mounted while text comes and goes. Timing and priority
 * belong to the movement controller; this view never queues stale messages. */
export function NavigationNotice({ message, kind }: NavigationNoticeProps) {
  const text = message?.trim() || null;
  return <div className="navigation-notice" role="status" aria-live="polite" aria-atomic="true"
    data-testid="navigation-notice" data-kind={kind} data-visible={text ? 'yes' : 'no'}>
    {text ? <>
      <svg className="navigation-notice-mark" viewBox="0 0 20 20" aria-hidden="true" focusable="false">
        {kind === 'blocked' ? <path d="M4 10h12M10 4v12" /> :
          <path d={kind === 'exit' ? 'M3 10h13M11 5l5 5-5 5M4 4v12' : 'M3 10h13M11 5l5 5-5 5'} />}
      </svg>
      <span>{text}</span>
    </> : null}
  </div>;
}
