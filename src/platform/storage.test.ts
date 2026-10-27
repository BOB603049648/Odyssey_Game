import { describe, expect, it } from 'vitest';
import { parseSave } from '../core/migrate';
import { newGameState } from '../core/save';
import { reduce } from '../core/reduce';
import { SAVE_KEY, createMemoryStorage, createWebStorage } from './storage';

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

  it('migrates a version 1 save onto restart-echo data', () => {
    const current = newGameState();
    const raw = {
      ...current,
      version: 1,
      ngCount: 2,
      words: {
        ...current.words,
        'myp.word.water': {
          ...current.words['myp.word.water'],
          state: 'ghost',
        },
      },
    };
    delete (raw as { muralMode?: string }).muralMode;
    const storage = createMemoryStorage();
    storage.backing.setItem(SAVE_KEY, JSON.stringify(raw));
    const loaded = storage.load();
    expect(parseSave(raw)?.version).toBe(2);
    expect(loaded?.version).toBe(2);
    expect(loaded?.muralMode).toBe('learn');
    expect(loaded?.words['myp.word.water']?.state).toBe('learned');
    expect(loaded && 'ngCount' in loaded).toBe(false);
  });

  it('keeps the last good save when a later write throws', () => {
    const backing = new Map<string, string>();
    let writes = 0;
    const storage = createWebStorage({
      getItem: (key) => backing.get(key) ?? null,
      setItem: (key, value) => {
        writes += 1;
        if (writes > 1) throw new Error('quota');
        backing.set(key, value);
      },
      removeItem: (key) => {
        backing.delete(key);
      },
    });
    storage.save(newGameState());
    expect(() => storage.save(reduce(newGameState(), { type: 'new-game' }))).not.toThrow();
    expect(storage.load()?.screen).toBe('title');
    expect(writes).toBe(2);
  });
});
