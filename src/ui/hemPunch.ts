import { approvedTravelerContactSource } from './travelerContactIdentity';
import { hasTravelerContactMask, trimTravelerMat } from './travelerContact';
import { decodeImage } from '../content/decodedImage';

/** Standing-pose hard lip. Rows below this stay, including the locked sole. */
export const HEM_Y0 = 995;
export const HEM_Y1 = 1091;
/** Legacy sole rows; an explicit reviewed contact mask may remove exterior matte here. */
export const SOLE_Y0 = 1148;

/**
 * Drop opaque near-black pixels in the hem band.
 * Legacy sole rows 1148–1151 are outside the loop. Optional masks edit only shoe-exterior alpha.
 */
export function punchHemPixels(data: Uint8ClampedArray, width: number, height: number, contactFile?: string): void {
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
  if (contactFile) trimTravelerMat(data, width, height, contactFile);
}

const cache = new Map<string, Promise<string>>();
const contactBitmaps = new Map<string, string>();

/** Metadata follows the actual shown bitmap, including FramePicture lastReady, not the next requested frame. */
export function travelerContactFile(src: string): string | undefined {
  return contactBitmaps.get(src);
}

type PunchFailure = { attempts: number; at: number; retryAt: number };
const failures = new Map<string, PunchFailure>();
function reviewedFile(src: string, file?: string): string | undefined {
  const normalized = file?.replace(/\.webp$/i,'.png');
  return normalized && hasTravelerContactMask(normalized) && approvedTravelerContactSource(normalized,src) ? normalized : undefined;
}
function retryError(retryAt: number): Error & { retryAt: number } {
  return Object.assign(new Error('Traveler contact processing temporarily unavailable'), { retryAt });
}
/** Explicit online wake resets only candidate failure budget, never the success cache.
 * Repeated online events cannot request an image more often than once per5s. */
export function wakeHemPunch(src: string, file: string): void {
  const approved = reviewedFile(src,file);
  if (!approved) return;
  const key = `${src}::contact:${approved}`, old = failures.get(key);
  if (old) failures.set(key,{ attempts:0, at:old.at, retryAt:old.at+5000 });
}
/** Legacy cache semantics are unchanged. Candidate caches only successful processed bitmaps.
 * At most initial+4 retries (5/10/20/30s); then wait for explicit online wake.
 * Reviewed URLs bound candidate success/metadata/failure maps to19 assets per page;
 * do not revoke URLs still held by current/outgoing/lastReady/sole. */
export function punchHemUrl(src: string, file?: string): Promise<string> {
  const contactFile = reviewedFile(src,file);
  const key = contactFile ? `${src}::contact:${contactFile}` : src;
  const hit = cache.get(key);
  if (hit) return hit;
  if (!contactFile) {
    const legacy = drawPunched(src);
    cache.set(key,legacy);
    return legacy;
  }
  const prior = failures.get(key);
  if (prior && Date.now() < prior.retryAt) return Promise.reject(retryError(prior.retryAt));
  const job = drawPunched(src,contactFile).then(next => {
    if (next === src) throw new Error('Contact processing degraded to source');
    failures.delete(key);
    return next;
  }).catch(() => {
    if (cache.get(key) === job) cache.delete(key);
    const attempts = (failures.get(key)?.attempts ?? 0)+1;
    const at = Date.now();
    const retryAt = attempts >= 5 ? Infinity : at + Math.min(30000,5000*2**(attempts-1));
    failures.set(key,{attempts,at,retryAt});
    throw retryError(retryAt);
  });
  cache.set(key,job);
  return job;
}

async function drawPunched(src: string, contactFile?: string): Promise<string> {
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
  punchHemPixels(image.data, canvas.width, canvas.height, contactFile);
  if (!contactFile) image.data.set(soleBytes, soleAt);
  ctx.putImageData(image, 0, 0);
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob((next) => resolve(next), 'image/png'));
  if (!blob) return src;
  const url = URL.createObjectURL(blob);
  // Canvas encoding creates a new bitmap request. Decoding the original frame
  // does not make this Blob ready: publishing it immediately could replace the
  // last visible idle while the browser is still decoding the processed image.
  // Keep the caller's lastReady frame until the replacement is paintable.
  try {
    await decodeImage(url);
  } catch {
    URL.revokeObjectURL(url);
    return src;
  }
  if (contactFile) contactBitmaps.set(url, contactFile);
  return url;
}

function loadImage(src: string): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => resolve(null);
    img.src = src;
  });
}
