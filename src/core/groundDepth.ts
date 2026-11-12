export type DepthItem = { id:string; footY:number; kind:'prop'|'traveler'|'cat' };
/** Continuous semantic ground Y, fixed code-point ID tie; never sprite bounds. */
export function sortGroundDepth<T extends DepthItem>(items:readonly T[]):T[] {
  for (const item of items) if (!Number.isFinite(item.footY)) throw new Error(`Nonfinite ground foot: ${item.id}`);
  return [...items].sort((a,b)=>a.footY-b.footY || (a.id<b.id?-1:a.id>b.id?1:0));
}
