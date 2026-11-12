import type { ReactNode } from 'react';
import { sortGroundDepth,type DepthItem } from '../core/groundDepth';
export type GroundDepthNode = DepthItem & { node:ReactNode; scene?:string; phase?:'stable'|'entering'|'leaving' };
/** Full-world siblings: rank changes neither parent, key, coordinate system nor animation state. */
export function GroundDepth({items}:{items:readonly GroundDepthNode[]}) {
  return <div className="ground-depth-root" data-testid="ground-depth-root">
    {sortGroundDepth(items).map((item,rank)=><div key={item.id} className="depth-unit" data-depth-id={item.id} data-depth-y={item.footY} data-depth-kind={item.kind} data-depth-scene={item.scene} data-phase={item.phase??'stable'} data-shore-visual={item.scene==='dba.scene.shore'?'candidate':undefined} data-ambient={item.scene} style={{zIndex:rank+1}}>{item.node}</div>)}
  </div>;
}
