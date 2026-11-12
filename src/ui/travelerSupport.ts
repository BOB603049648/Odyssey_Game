import points from './travelerSupportPoints.json';
import { travelerContactFile } from './hemPunch';
import { travelerContactSourceFile } from './travelerContactIdentity';
/** x is a measured shoe coordinate for provenance ONLY, never a whole-body anchor. */
export type TravelerSupport = Readonly<{file:string;x:number;y:number;width:number;height:number}>;
const byFile = new Map<string,TravelerSupport>(Object.entries(points).map(([file,point])=>[file,{file,...point}]));
export function supportForFile(file:string|undefined):TravelerSupport|null {
 return byFile.get(file?.replace(/\.webp$/i,'.png')??'')??null;
}
/** Raw and cleaned URLs share geometry; lastReady/outgoing retain their own identity. */
export function supportForSource(src:string):TravelerSupport|null {
 return supportForFile(travelerContactFile(src)??travelerContactSourceFile(src));
}
/** Vertical support baseline only. Keep the authored horizontal body axis and mirror.
 * Alternating support-shoe X is NOT torso/root registration. */
export function supportTransform(s:TravelerSupport,mirrored:boolean,root:{x:number;y:number}):string {
 return `translate(0%, ${(root.y-s.y/s.height)*100}%) scaleX(${mirrored?-1:1})`;
}
