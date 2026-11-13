/** Nearby meanings make a choice about the pictured event rather than its color. */
const CONTRASTS: Record<string, readonly string[]> = {
  sun: ['moon', 'fire'], moon: ['sun', 'fire'], water: ['drink', 'fish', 'fire'],
  fire: ['sun', 'water'], fish: ['water', 'person'], person: ['me', 'you'],
  eat: ['drink', 'hunger'], drink: ['eat', 'water'], sleep: ['wait', 'walk'],
  walk: ['sleep', 'wait'], give: ['share', 'take'], take: ['give', 'share'],
  me: ['you', 'person'], you: ['me', 'person'], size: ['amount', 'person'],
  amount: ['size', 'share'], danger: ['protect', 'trust'], hunger: ['eat', 'share'],
  share: ['give', 'take'], wait: ['miss', 'sleep'], promise: ['trust', 'lie'],
  trust: ['promise', 'lie'], protect: ['betray', 'danger'], betray: ['protect', 'trust'],
  lie: ['trust', 'betray'], miss: ['wait', 'home'], forgive: ['betray', 'protect'],
  home: ['miss', 'person'],
};

/** Only choose from the caller's available meanings; never reveal a locked word. */
export function meaningChoices(target: string, available: readonly string[], count: number): string[] {
  const pool = new Set(available);
  if (!pool.has(target)) return [];
  const preferred = (CONTRASTS[target.split('.').at(-1)!] ?? []).map(id => `dba.word.${id}`);
  const others = [...new Set([...preferred, ...available])].filter(id => id !== target && pool.has(id));
  const choices = [target, ...others.slice(0, Math.max(0, count - 1))];
  const offset = [...target].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % choices.length;
  return [...choices.slice(offset), ...choices.slice(0, offset)];
}
