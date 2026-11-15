import { useEffect, useRef, useState } from 'react';
import type { Point } from '../core/walk';

const REACH = 42;

export function WalkStick({ onVector, disabled = false }: { onVector: (vector: Point | null) => void; disabled?: boolean }) {
  const origin = useRef<Point | null>(null);
  const pointer = useRef<number | null>(null);
  const notify = useRef(onVector);
  notify.current = onVector;
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
    if (pointer.current === null) return;
    pointer.current = null;
    origin.current = null;
    setNub({ x: 0, y: 0 });
    notify.current(null);
  }

  useEffect(() => {
    if (disabled) end();
  }, [disabled]);
  useEffect(() => {
    window.addEventListener('blur', end);
    return () => { window.removeEventListener('blur', end); if (pointer.current !== null) notify.current(null); };
  }, []);

  return (
    <div
      className="walk-stick"
      data-testid="walk-stick"
      aria-label="走动"
      aria-disabled={disabled}
      onPointerDown={(event) => {
        if (disabled || event.button !== 0 || pointer.current !== null) return;
        event.stopPropagation();
        pointer.current = event.pointerId;
        origin.current = { x: event.clientX, y: event.clientY };
        event.currentTarget.setPointerCapture(event.pointerId);
        setVector(event.clientX, event.clientY);
      }}
      onPointerMove={(event) => {
        if (disabled || pointer.current !== event.pointerId) return;
        setVector(event.clientX, event.clientY);
      }}
      onPointerUp={(event) => { if (pointer.current === event.pointerId) end(); }}
      onPointerCancel={(event) => { if (pointer.current === event.pointerId) end(); }}
      onLostPointerCapture={(event) => { if (pointer.current === event.pointerId) end(); }}
    >
      <i style={{ transform: `translate(${nub.x}px, ${nub.y}px)` }} />
    </div>
  );
}
