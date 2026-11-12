type ImageBox={left:number;top:number;width:number;height:number};
/** imageRect already includes display support transform; subtract only the containing origin. */
export function worldContactBox(image:ImageBox,origin:{left:number;top:number},feather:number) {
  const height=image.height+feather;
  return {left:image.left-origin.left,top:image.top-origin.top,width:image.width,height,fit:image.height/height};
}
