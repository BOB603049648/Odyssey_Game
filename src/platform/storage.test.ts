import { describe, expect, it } from 'vitest';
import { newGameState } from '../core/save';
import { reduce } from '../core/reduce';
import { SAVE_KEY, createMemoryStorage } from './storage';

describe('save storage', () => {
  it('persists progress and ignores a corrupt payload', () => {
    const storage = createMemoryStorage();
    const learned = reduce(reduce(newGameState(), { type: 'new-game' }), {
      type: 'set-show-gloss',
      value: false,
    });
    storage.save(learned);
    expect(storage.load()?.screen).toBe('prologue');

    storage.backing.setItem(SAVE_KEY, '{not json');
    expect(storage.load()).toBeNull();
  });
});
