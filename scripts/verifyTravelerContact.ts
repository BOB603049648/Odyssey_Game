import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { resolve } from 'node:path';
import ledger from '../src/ui/travelerContactIdentity.json';
const approved = ledger.assets as Record<string,string>;
const hash = (bytes: Uint8Array) => createHash('sha256').update(bytes).digest('hex');
export function verifyTravelerContactBytes(file: string, bytes: Uint8Array): void {
  if (!Object.prototype.hasOwnProperty.call(approved,file) || hash(bytes) !== approved[file]) {
    throw new Error(`Traveler contact asset identity mismatch: ${file}; review the source and mask before updating approval`);
  }
}
/** Mandatory Vite build hook: covers preferred WebP AND fallback PNG, not only test-selected format. */
export function verifyTravelerContactAssets(root = process.cwd()): void {
  const dir = resolve(root,'src/assets/traveler');
  for (const file of Object.keys(approved)) verifyTravelerContactBytes(file,readFileSync(resolve(dir,file)));
  const stems = new Set(Object.keys(approved).map(file=>file.replace(/\.(png|webp)$/,'')));
  for (const file of readdirSync(dir)) {
    if (/\.(png|webp)$/.test(file) && stems.has(file.replace(/\.(png|webp)$/, '')) && !Object.prototype.hasOwnProperty.call(approved,file)) {
      throw new Error(`Traveler contact unapproved asset identity: ${file}`);
    }
  }
  if (hash(readFileSync(resolve(root,'src/ui/travelerContactMasks.json'))) !== ledger.mask_sha256) {
    throw new Error('Traveler contact mask identity mismatch; review source/mask pair');
  }
}
