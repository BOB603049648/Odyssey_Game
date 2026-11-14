export const FOLEY_NAMES = [
  'step-sand-1','step-sand-2','step-sand-3','step-sand-4','step-sand-5','step-sand-6',
  'step-stone-1','step-stone-2','step-stone-3','step-stone-4','step-stone-5','step-stone-6',
  'step-wood-1','step-wood-2','step-wood-3','step-wood-4',
  'cloth-1','cloth-2','cloth-3','drink-1','drink-2','drink-3','water-draw-1','water-draw-2',
  'sit','pickup','place','paper','bird-1','bird-2','bird-3','wood-creak',
  'theme-title','theme-memory','theme-resolve','select','answer-right','word-learn','milestone','answer-wrong',
] as const;
export type FoleyId = typeof FOLEY_NAMES[number];
const files = import.meta.glob<string>('../assets/audio/foley/*.mp3', { eager: true, import: 'default' });
export const FOLEY_URLS = Object.fromEntries(FOLEY_NAMES.map(name => [name, files[`../assets/audio/foley/${name}.mp3`]])) as Record<FoleyId, string>;
export const STEP_BANKS = {
  sand: ['step-sand-1','step-sand-2','step-sand-3','step-sand-4','step-sand-5','step-sand-6'],
  stone: ['step-stone-1','step-stone-2','step-stone-3','step-stone-4','step-stone-5','step-stone-6'],
  wood: ['step-wood-1','step-wood-2','step-wood-3','step-wood-4'],
} as const;
export const CLOTH = ['cloth-1','cloth-2','cloth-3'] as const;
export const DRINK = ['drink-1','drink-2','drink-3'] as const;
export const BIRDS = ['bird-1','bird-2','bird-3'] as const;
/** No immediately repeated variation, even with a deterministic random source. */
export function variation<T>(bank: readonly T[], previous?: T, random = Math.random): T {
  const choices = bank.filter(item => item !== previous);
  return (choices.length ? choices : bank)[Math.min((choices.length || bank.length)-1, Math.floor(random()*(choices.length || bank.length)))];
}
