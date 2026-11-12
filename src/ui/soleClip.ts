import { travelerContactFile } from './hemPunch';
import { keepTravelerContactOnly } from './travelerContact';

/**
 * Horizontal boot footprint for `.sole-soft`.
 * The sheet's soft mat is already 2–3× the boot and the vertical mask dyes all of it.
 * Keep a column only when opaque leather at the hem sits near opaque leather in the shaft.
 */
export function bootColumns(rgba: Uint8ClampedArray, width: number, height: number): Uint8Array {
  const shaft = new Uint8Array(width);
  const hem = new Uint8Array(width);
  const y0 = Math.floor(height * 0.842);
  const y1 = Math.floor(height * 0.858);
  const z0 = Math.floor(height * 0.9);
  const z1 = Math.floor(height * 0.93);
  for (let y = y0; y < y1; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (rgba[row + x * 4 + 3] >= 240) shaft[x] = 1;
    }
  }
  for (let y = z0; y < z1; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      if (rgba[row + x * 4 + 3] >= 228) hem[x] = 1;
    }
  }
  const slack = 8;
  const keep = new Uint8Array(width);
  for (let x = 0; x < width; x++) {
    if (!hem[x]) continue;
    const from = Math.max(0, x - slack);
    const to = Math.min(width - 1, x + slack);
    for (let k = from; k <= to; k++) {
      if (shaft[k]) {
        keep[x] = 1;
        break;
      }
    }
  }
  const dil = new Uint8Array(width);
  for (let x = 0; x < width; x++) {
    if (!keep[x]) continue;
    if (x > 0) dil[x - 1] = 1;
    dil[x] = 1;
    if (x + 1 < width) dil[x + 1] = 1;
  }
  return dil;
}

function isCatContact(r: number, g: number, b: number, a: number): boolean {
  return a >= 200 && Math.abs(r - 30) <= 6 && Math.abs(g - 22) <= 6 && Math.abs(b - 14) <= 6;
}

/** Runs of columns whose count stays at or above `minCount`. Gaps of `gap` still join. */
function columnRuns(counts: Uint16Array, minCount: number, gap: number, minWidth: number): Array<[number, number]> {
  const runs: Array<[number, number]> = [];
  let start = -1;
  let prev = -1;
  for (let x = 0; x < counts.length; x++) {
    if (counts[x] < minCount) continue;
    if (start < 0) {
      start = x;
      prev = x;
      continue;
    }
    if (x > prev + gap) {
      if (prev - start + 1 >= minWidth) runs.push([start, prev]);
      start = x;
    }
    prev = x;
  }
  if (start >= 0 && prev - start + 1 >= minWidth) runs.push([start, prev]);
  return runs;
}

/**
 * Horizontal paw-tip footprint.
 * The baked rgb(30, 22, 14) slab is wider than the fur sitting on it.
 * Keep a paw-width slice of that slab, lined up with the widest paw-sized
 * fur run just above the slab. No paw fur: a centered paw-width core.
 * Returns null when there is no wide slab, so a few contact pixels stay.
 */
function pawFootprint(rgba: Uint8ClampedArray, width: number, y0: number, y1: number): Uint8Array | null {
  const contactCols = new Uint16Array(width);
  for (let y = y0; y < y1; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      const i = row + x * 4;
      if (isCatContact(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3])) contactCols[x] += 1;
    }
  }
  const puddles = columnRuns(contactCols, 10, 4, 40);
  if (puddles.length === 0) return null;
  let px0 = puddles[0][0];
  let px1 = puddles[0][1];
  for (const [a, b] of puddles) {
    if (b - a > px1 - px0) {
      px0 = a;
      px1 = b;
    }
  }
  const puddleW = px1 - px0 + 1;
  let top = y0;
  const need = Math.ceil(puddleW * 0.35);
  const searchFrom = Math.max(0, y0 - 140);
  for (let y = searchFrom; y < y1; y++) {
    let n = 0;
    const row = y * width * 4;
    for (let x = px0; x <= px1; x++) {
      const i = row + x * 4;
      if (isCatContact(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3])) n += 1;
    }
    if (n >= need) {
      top = y;
      break;
    }
  }
  const above = 48;
  const furCols = new Uint16Array(width);
  const fy0 = Math.max(0, top - above);
  for (let y = fy0; y < top; y++) {
    const row = y * width * 4;
    for (let x = 0; x < width; x++) {
      const i = row + x * 4;
      const a = rgba[i + 3];
      if (a >= 190 && !isCatContact(rgba[i], rgba[i + 1], rgba[i + 2], a)) furCols[x] += 1;
    }
  }
  let paw: [number, number] | null = null;
  for (const [a, b] of columnRuns(furCols, 6, 2, 24)) {
    const ww = b - a + 1;
    if (ww > 140) continue;
    if (b < px0 - 16 || a > px1 + 16) continue;
    if (!paw || ww > paw[1] - paw[0] + 1) paw = [a, b];
  }
  const mask = new Uint8Array(width);
  let left: number;
  let right: number;
  if (!paw) {
    const ww = Math.min(96, puddleW);
    left = px0 + Math.floor((puddleW - ww) / 2);
    right = left + ww - 1;
  } else {
    const [a, b] = paw;
    const ww = b - a + 1;
    const ov0 = Math.max(a, px0);
    const ov1 = Math.min(b, px1);
    if (ov1 < ov0) left = b < px0 ? px0 : Math.max(px0, px1 - ww + 1);
    else if (a < px0) left = ov0;
    else if (b > px1) left = ov1 - ww + 1;
    else left = a;
    left = Math.max(px0, Math.min(left, px1));
    right = Math.min(px1, left + ww - 1);
  }
  for (let x = left; x <= right; x++) mask[x] = 1;
  return mask;
}

/** Baked shore-cat contact is rgb(30, 22, 14) around the paw tip, not the cloak. */
export function keepCatContact(rgba: Uint8ClampedArray, width: number, height: number, tip: number): void {
  const y0 = Math.max(0, Math.floor((tip - 0.075) * height));
  const y1 = Math.min(height, Math.floor((tip + 0.16) * height));
  const foot = pawFootprint(rgba, width, y0, y1);
  for (let y = 0; y < height; y++) {
    const row = y * width * 4;
    const inBand = y >= y0 && y < y1;
    for (let x = 0; x < width; x++) {
      const i = row + x * 4;
      const keep =
        inBand &&
        (foot === null || foot[x] === 1) &&
        isCatContact(rgba[i], rgba[i + 1], rgba[i + 2], rgba[i + 3]);
      if (!keep) rgba[i + 3] = 0;
    }
  }
}

const bootCache = new Map<string, string>();
const catCache = new Map<string, string>();

function canvasOf(img: HTMLImageElement): HTMLCanvasElement | null {
  if (!img.naturalWidth || !img.naturalHeight) return null;
  const canvas = document.createElement('canvas');
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  ctx.drawImage(img, 0, 0);
  return canvas;
}

/** Reviewed bitmap: contact-only copy. Legacy/unsupported bitmap: original boot-column copy. */
export function clippedBootUrl(img: HTMLImageElement): string | null {
  const key = img.currentSrc || img.src;
  const hit = bootCache.get(key);
  if (hit) return hit;
  const canvas = canvasOf(img);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  if (!keepTravelerContactOnly(image.data, canvas.width, canvas.height, travelerContactFile(key))) {
    const cols = bootColumns(image.data, canvas.width, canvas.height);
    const data = image.data;
    for (let y = 0; y < canvas.height; y++) {
      const row = y * canvas.width * 4;
      for (let x = 0; x < canvas.width; x++) {
        if (!cols[x]) data[row + x * 4 + 3] = 0;
      }
    }
  }
  ctx.putImageData(image, 0, 0);
  const url = canvas.toDataURL('image/png');
  bootCache.set(key, url);
  return url;
}

/** Contact-only copy so the warm matrix sits above the grade without dyeing the cloak. */
export function catContactUrl(img: HTMLImageElement, tip: number): string | null {
  const key = `${img.currentSrc || img.src}@${tip.toFixed(4)}`;
  const hit = catCache.get(key);
  if (hit) return hit;
  const canvas = canvasOf(img);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  keepCatContact(image.data, canvas.width, canvas.height, tip);
  ctx.putImageData(image, 0, 0);
  const url = canvas.toDataURL('image/png');
  catCache.set(key, url);
  return url;
}
