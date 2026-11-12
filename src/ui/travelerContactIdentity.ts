import ledger from './travelerContactIdentity.json';
// URLs only; Vite does not request these images. BuildStart verifies every approved
// byte hash before emitting these content-hashed imports. No fetch/crypto.subtle or
// cross-browser decoded-RGB comparison, including on insecure HTTP production.
const modules = import.meta.glob<string>('../assets/traveler/*.{png,webp}', { eager:true, import:'default' });
export function approvedTravelerContactSource(file: string, src: string): boolean {
  const stem = file.replace(/\.(png|webp)$/i,'');
  return Object.keys(ledger.assets).some(name => name.replace(/\.(png|webp)$/,'') === stem && modules[`../assets/traveler/${name}`] === src);
}

/** Exact reviewed raw source identity, not the desired animation frame. */
export function travelerContactSourceFile(src: string): string | undefined {
  const name = Object.keys(ledger.assets).find(name => modules[`../assets/traveler/${name}`] === src);
  return name?.replace(/\.webp$/i,'.png');
}
