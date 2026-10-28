/** Standing-pose hard lip. Rows below this stay, including the locked sole. */
export const HEM_Y0 = 995;
export const HEM_Y1 = 1091;
/** Sole contact. Never written by the hem punch. */
export const SOLE_Y0 = 1148;

/**
 * Drop opaque near-black pixels in the hem band.
 * Sole rows 1148–1151 are outside the loop.
 */
export function punchHemPixels(data: Uint8ClampedArray, width: number, height: number): void {
  if (height < SOLE_Y0 || width < 1) return;
  const y1 = Math.min(HEM_Y1, SOLE_Y0 - 1);
  for (let y = HEM_Y0; y <= y1; y += 1) {
    let row = y * width * 4;
    for (let x = 0; x < width; x += 1) {
      const r = data[row];
      const g = data[row + 1];
      const b = data[row + 2];
      const a = data[row + 3];
      if (a > 24 && r < 16 && g < 16 && b < 16) data[row + 3] = 0;
      row += 4;
    }
  }
}

const cache = new Map<string, Promise<string>>();

/** Browser-only. Leaves the source file, and the sole rows, untouched. */
export function punchHemUrl(src: string): Promise<string> {
  const hit = cache.get(src);
  if (hit) return hit;
  const job = drawPunched(src);
  cache.set(src, job);
  return job;
}

async function drawPunched(src: string): Promise<string> {
  if (typeof document === 'undefined') return src;
  const loaded = await loadImage(src);
  if (!loaded || loaded.naturalHeight !== 1152 || loaded.naturalWidth !== 864) return src;
  const canvas = document.createElement('canvas');
  canvas.width = loaded.naturalWidth;
  canvas.height = loaded.naturalHeight;
  const ctx = canvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return src;
  ctx.drawImage(loaded, 0, 0);
  let image: ImageData;
  try {
    image = ctx.getImageData(0, 0, canvas.width, canvas.height);
  } catch {
    return src;
  }
  const soleAt = SOLE_Y0 * canvas.width * 4;
  const soleBytes = image.data.slice(soleAt, canvas.height * canvas.width * 4);
  punchHemPixels(image.data, canvas.width, canvas.height);
  image.data.set(soleBytes, soleAt);
  ctx.putImageData(image, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((next) => resolve(next), 'image/png'));
  if (!blob) return src;
  return URL.createObjectURL(blob);
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
