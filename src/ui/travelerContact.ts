import coordinates from './travelerContactMasks.json';

type ContactMask = { cuts: number[][]; contact: number[][] };
const masks = coordinates as Record<string, ContactMask>;
function maskFor(file: string | undefined, width: number, height: number): ContactMask | undefined {
  const key = file?.replace(/\.webp$/i, '.png') ?? '';
  if (width !== 864 || height !== 1152 || !Object.prototype.hasOwnProperty.call(masks, key)) return undefined;
  return masks[key];
}

export function hasTravelerContactMask(file: string | undefined, width = 864, height = 1152): boolean {
  return Boolean(maskFor(file, width, height));
}

/** Reviewed shoe-EXTERIOR alpha coordinates; never classify/recolor leather at runtime. */
export function trimTravelerMat(data: Uint8ClampedArray, width: number, height: number, file: string | undefined): boolean {
  const mask = maskFor(file, width, height);
  if (!mask || data.length !== width * height * 4) return false;
  for (const [start, length, factor] of mask.cuts) {
    for (let pixel = start; pixel < start + length; pixel++) {
      const alpha = pixel * 4 + 3;
      data[alpha] = Math.floor(data[alpha] * factor / 255);
    }
  }
  return true;
}

/** Keep only that frame's inherited-color contact, never paint a sole copy over leather. */
export function keepTravelerContactOnly(data: Uint8ClampedArray, width: number, height: number, file: string | undefined): boolean {
  const mask = maskFor(file, width, height);
  if (!mask || data.length !== width * height * 4) return false;
  let cursor = 0;
  for (const [start, length] of mask.contact) {
    for (let pixel = cursor; pixel < start; pixel++) data[pixel * 4 + 3] = 0;
    cursor = start + length;
  }
  for (let pixel = cursor; pixel < width * height; pixel++) data[pixel * 4 + 3] = 0;
  return true;
}
