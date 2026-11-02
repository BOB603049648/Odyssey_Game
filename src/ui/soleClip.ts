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

/** Baked shore-cat contact is rgb(30, 22, 14) around the paw tip, not the cloak. */
export function keepCatContact(rgba: Uint8ClampedArray, width: number, height: number, tip: number): void {
  const y0 = Math.max(0, Math.floor((tip - 0.075) * height));
  const y1 = Math.min(height, Math.floor((tip + 0.16) * height));
  for (let i = 0; i < rgba.length; i += 4) {
    const y = Math.floor(i / 4 / width);
    const r = rgba[i];
    const g = rgba[i + 1];
    const b = rgba[i + 2];
    const a = rgba[i + 3];
    const contact =
      y >= y0 &&
      y < y1 &&
      a >= 200 &&
      Math.abs(r - 30) <= 6 &&
      Math.abs(g - 22) <= 6 &&
      Math.abs(b - 14) <= 6;
    if (!contact) rgba[i + 3] = 0;
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

/** Sprite copy whose alpha is zero outside the boot columns. The vertical mask still opens the hem. */
export function clippedBootUrl(img: HTMLImageElement): string | null {
  const key = img.currentSrc || img.src;
  const hit = bootCache.get(key);
  if (hit) return hit;
  const canvas = canvasOf(img);
  if (!canvas) return null;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return null;
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const cols = bootColumns(image.data, canvas.width, canvas.height);
  const data = image.data;
  for (let y = 0; y < canvas.height; y++) {
    const row = y * canvas.width * 4;
    for (let x = 0; x < canvas.width; x++) {
      if (!cols[x]) data[row + x * 4 + 3] = 0;
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
