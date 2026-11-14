import { useEffect, useRef, useState } from 'react';
import type { IslandScene } from '../core/island';
import { SPOTS, plantOnGround } from '../core/stage';
import { groundDistance, type Point } from '../core/walk';

type Trace = { id: number; x: number; y: number; angle: number };
export function WorldFeedback({ scene, pos, moving, target, response, sequence }: {
  scene: IslandScene; pos: Point; moving: boolean; target: Point | null;
  response: { spot: string; kind: string } | null; sequence: number;
}) {
  const last = useRef({ scene, pos });
  const tick = useRef(0);
  const [traces, setTraces] = useState<Trace[]>([]);
  useEffect(() => {
    if (last.current.scene !== scene) {
      last.current = { scene, pos };
      setTraces([]);
      return;
    }
    if (!moving || groundDistance(pos, last.current.pos) < .018) return;
    const dx = (pos.x - last.current.pos.x) * 1280, dy = (pos.y - last.current.pos.y) * 720;
    const angle = Math.atan2(dy, dx) * 180 / Math.PI + 90;
    last.current = { scene, pos };
    const id = ++tick.current;
    setTraces(current => [...current.slice(-7), { id, x: pos.x * 1280 + (id % 2 ? 2 : -2), y: pos.y * 720, angle }]);
  }, [scene, pos.x, pos.y, moving]);
  const spot = response ? SPOTS[scene].find(spot => spot.id === response.spot) : null;
  const at = spot ? plantOnGround(scene, spot) : null;
  return <>
    <svg className="world-feedback" viewBox="0 0 1280 720" preserveAspectRatio="none" aria-hidden="true">
      {scene !== 'dba.scene.path' && scene !== 'dba.scene.hall' ? traces.map(trace =>
        <ellipse key={trace.id} className="footstep-trace" cx={trace.x} cy={trace.y} rx="1.7" ry="3.3" transform={`rotate(${trace.angle} ${trace.x} ${trace.y})`} />) : null}
      {target ? <g className="walk-destination" data-testid="walk-destination" transform={`translate(${target.x * 1280} ${target.y * 720})`}>
        <ellipse rx="10" ry="4" /><circle r="2" />
      </g> : null}
    </svg>
    {at && response ? <span key={`${sequence}:${response.spot}`} className="world-response" data-kind={response.kind}
      style={{ left: `${at.x * 100}%`, top: `${at.y * 100}%` }} aria-hidden="true" /> : null}
  </>;
}
