import points from './travelerSupportPoints.json';
import { travelerContactFile } from './hemPunch';
import { travelerContactSourceFile } from './travelerContactIdentity';
/** x is a measured shoe coordinate for provenance ONLY, never a whole-body anchor. */
export type TravelerSupport = Readonly<{file:string;x:number;y:number;width:number;height:number;bodyX?:number;scaleX?:number;scaleY?:number}>;
const byFile = new Map<string,TravelerSupport>(Object.entries(points).map(([file,point])=>[file,{file,...point}]));
export function supportForFile(file:string|undefined):TravelerSupport|null {
 return byFile.get(file?.replace(/\.webp$/i,'.png')??'')??null;
}
/** Raw and cleaned URLs share geometry; lastReady/outgoing retain their own identity. */
export function supportForSource(src:string):TravelerSupport|null {
 return supportForFile(travelerContactFile(src)??travelerContactSourceFile(src));
}
/** Explicit torso registration is separate from the alternating support shoe.
 * Legacy frames without a measured bodyX keep their authored horizontal axis. */
export function travelerFramePivot(s:TravelerSupport|null,mirrored:boolean,root={x:.5,y:1151/1152}) {
 const x=s?.bodyX===undefined?root.x:s.bodyX/s.width;
 return {x:mirrored?1-x:x,y:s?s.y/s.height:root.y};
}
export function supportTransform(s:TravelerSupport,mirrored:boolean,root:{x:number;y:number}):string {
 const pivot=travelerFramePivot(s,mirrored,root);
 const sx=s.scaleX??1,sy=s.scaleY??1;
 return `translate(${(root.x-pivot.x)*100*sx}%, ${(root.y-pivot.y)*100*sy}%) scale(${(mirrored?-1:1)*sx}, ${sy})`;
}
