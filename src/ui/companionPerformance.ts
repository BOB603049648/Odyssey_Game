import { useEffect, useRef, useState } from 'react';
import type { CompanionPose } from '../core/hints';

export type CompanionPerformance = 'observe' | 'point' | 'rest';
export function companionPerformanceKind(pose: CompanionPose, level: number, resting: boolean, acknowledged: boolean): CompanionPerformance {
  if (resting || pose === 'curl') return 'rest';
  if (level > 0 || acknowledged || pose === 'paw' || pose === 'fetch') return 'point';
  return 'observe';
}
export function companionPerformanceFrame(kind: CompanionPerformance, elapsed: number, reduced = false): string {
  if (kind === 'rest') {
    if (reduced) return 'pose-curl-02';
    return elapsed < 300 ? 'pose-settle-01' : elapsed < 700 ? 'pose-settle-02' : elapsed < 1200 ? 'pose-curl-01' : 'pose-curl-02';
  }
  if (kind === 'point') {
    if (reduced) return 'pose-point-01';
    return elapsed < 200 ? 'pose-observe-02' : elapsed < 1000 ? 'pose-point-01' : elapsed < 1400 ? 'pose-point-02' : 'pose-observe-02';
  }
  return !reduced && elapsed % 7200 >= 5000 ? 'pose-observe-02' : 'pose-observe-01';
}
export function useCompanionPerformance(kind: CompanionPerformance, active: boolean, sequence: number, reduced: boolean) {
  const elapsed = useRef(0);
  const [frame, setFrame] = useState(() => companionPerformanceFrame(kind, 0, reduced));
  useEffect(() => { elapsed.current = 0; setFrame(companionPerformanceFrame(kind, 0, reduced)); }, [kind, sequence, reduced]);
  useEffect(() => {
    if (!active || reduced) return;
    let raf = 0, previous = performance.now();
    const tick = (now: number) => {
      elapsed.current += Math.max(0, now - previous); previous = now;
      setFrame(companionPerformanceFrame(kind, elapsed.current));
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [kind, active, reduced]);
  return frame;
}
