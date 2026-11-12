import { trajAssetUrl } from '../content/assetUrls';
import { companionSole } from '../core/companionPost';

type FrameRecord = Readonly<{ frameId:string; originalUrl:string; sourceWidth:864; sourceHeight:1152; supportY:number; supportStatus:'legacy-declared' }>;
export type CatDisplay = FrameRecord & { shownUrl:string };
function normalized(url:string):string { try { return new URL(url, typeof document === 'undefined' ? 'http://localhost/' : document.baseURI).href; } catch { return url; } }
const originals = new Map<string,FrameRecord>();
for (const frameId of ['land-shore-driftwood','land-shore-gourd','land-shore-east-gap']) {
  const raw = trajAssetUrl(frameId);
  if (raw) { const originalUrl=normalized(raw); originals.set(originalUrl,{frameId,originalUrl,sourceWidth:864,sourceHeight:1152,supportY:companionSole(frameId),supportStatus:'legacy-declared'}); }
}
// Only the three approved raw URLs can register aliases. Existing successful catImage
// cache fetches once per raw URL, so at most three successful blob aliases/page; no new requests.
const aliases = new Map<string,FrameRecord>();
export function registerCatAlias(originalUrl:string,blobUrl:string):void {
  const record=originals.get(normalized(originalUrl));
  if (record && blobUrl.startsWith('blob:')) aliases.set(normalized(blobUrl),record);
}
export function lookupCatDisplay(shownUrl:string):CatDisplay|null {
  const url=normalized(shownUrl);const record=originals.get(url)??aliases.get(url);
  return record ? {...record,shownUrl:url} : null;
}
export function writeCatDisplayAttributes(img:HTMLImageElement,enabled:boolean):void {
  const keys=['displayedFrame','displayedSrc','supportStatus','legacySoleRow'] as const;
  if (!enabled) { for (const key of keys) delete img.dataset[key]; return; }
  const src=img.currentSrc||img.src;const display=lookupCatDisplay(src);
  const values={displayedFrame:display?.frameId??'unknown',displayedSrc:src,supportStatus:display?.supportStatus??'unknown',legacySoleRow:display?String(Math.round(display.supportY*display.sourceHeight)):undefined};
  for (const key of keys) { const value=values[key]; if(value===undefined) delete img.dataset[key]; else if(img.dataset[key]!==value) img.dataset[key]=value; }
}
/** Explicit fixture diagnostic only. Reads existing RAF rectangles; never changes placement. */
export function catDisplaySnapshot(img:HTMLImageElement,anchor:HTMLElement,world:DOMRect,vp:DOMRect) {
  const currentSrc=img.currentSrc||img.src;const display=lookupCatDisplay(currentSrc);const r=img.getBoundingClientRect();
  const x=parseFloat(anchor.style.left)/100;const y=parseFloat(anchor.style.top)/100;
  const figure=img.closest('.nanaicha-figure');const style=figure?getComputedStyle(figure):null;
  return {currentSrc,originalSrc:display?.originalUrl??null,actualFrame:display?.frameId??'unknown',desiredFrame:anchor.dataset.sprite??null,
    supportStatus:display?.supportStatus??'unknown',legacySoleRow:display?Math.round(display.supportY*display.sourceHeight):null,
    ready:img.complete&&img.naturalWidth>0,natural:{width:img.naturalWidth,height:img.naturalHeight},
    rect:{left:r.left,top:r.top,width:r.width,height:r.height},mirror:anchor.dataset.face??null,guide:anchor.dataset.guide??null,clip:anchor.dataset.traj??null,
    hop:{eligible:anchor.dataset.traveling==='yes'&&anchor.dataset.traj==='land',transform:style?.transform??null,animationName:style?.animationName??null},
    logicalFoot:{normalized:{x,y},viewport:{x:world.left+x*world.width-vp.left,y:world.top+y*world.height-vp.top}},
    legacySoleViewportY:display?r.top+display.supportY*r.height-vp.top:null};
}
