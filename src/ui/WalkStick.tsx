import { useRef, useState } from 'react';
import type { Point } from '../core/walk';

const REACH = 42;

export function WalkStick({ onVector }: { onVector: (vector: Point | null) => void }) {
  const origin = useRef<Point | null>(null);
  const [nub, setNub] = useState<Point>({ x: 0, y: 0 });

  function setVector(clientX: number, clientY: number) {
    const from = origin.current;
    if (!from) return;
    const dx = clientX - from.x;
    const dy = clientY - from.y;
    const len = Math.hypot(dx, dy);
    if (len < 8) {
      setNub({ x: 0, y: 0 });
      onVector(null);
      return;
    }
    const scale = Math.min(1, len / REACH);
    setNub({ x: (dx / len) * REACH * scale, y: (dy / len) * REACH * scale });
    onVector({ x: (dx / len) * scale, y: (dy / len) * scale });
  }

  function end() {
    origin.current = null;
    setNub({ x: 0, y: 0 });
    onVector(null);
  }

  return (
    <div
      className="walk-stick"
      data-testid="walk-stick"
      aria-label="走动"
      onPointerDown={(event) => {
        if (event.button !== 0) return;
        event.stopPropagation();
        origin.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
        setVector(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (!origin.current) return;
        setVector(event.clientX, event.clientY);
      }}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <i style={{ transform: `translate(${nub.x}px, ${nub.y}px)` }} />
    </div>
  );
}
