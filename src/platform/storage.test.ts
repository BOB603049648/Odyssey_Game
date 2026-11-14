import { afterEach, describe, expect, it, vi } from 'vitest';
import { parseSave } from '../core/migrate';
import { newGameState } from '../core/save';
import { reduce } from '../core/reduce';
import { SAVE_KEY, createMemoryStorage, createWebStorage, webStorage } from './storage';

afterEach(() => vi.restoreAllMocks());

describe('save storage', () => {
  it('tolerates denied reads, writes, and removal', () => {
    const denied = () => { throw new DOMException('Blocked', 'SecurityError'); };
    const storage = createWebStorage({ getItem: denied, setItem: denied, removeItem: denied });
    expect(storage.load()).toBeNull();
    expect(storage.save(newGameState())).toBe(false);
    expect(() => storage.clear()).not.toThrow();
  });

  it('guards the localStorage getter and retries when access returns', () => {
    const real = window.localStorage;
    const getter = vi.spyOn(window, 'localStorage', 'get').mockImplementation(() => {
      throw new DOMException('Blocked', 'SecurityError');
    });
    const storage = webStorage();
    expect(storage.load()).toBeNull();
    expect(storage.save(newGameState())).toBe(false);
    getter.mockReturnValue(real);
    const saved = newGameState();
    expect(storage.save(saved)).toBe(true);
    expect(storage.load()).toEqual(saved);
    storage.clear();
  });

  it('keeps the last valid save after an invalid payload or quota failure', () => {
    const storage = createMemoryStorage();
    const saved = reduce(newGameState(), { type: 'new-game' });
    expect(storage.save(saved)).toBe(true);
    expect(storage.save({ ...saved, stepCounter: -1 })).toBe(false);
    expect(storage.load()).toEqual(saved);
    vi.spyOn(storage.backing, 'setItem').mockImplementation(() => {
      throw new DOMException('Full', 'QuotaExceededError');
    });
    expect(storage.save(reduce(saved, { type: 'advance-prologue' }))).toBe(false);
    expect(storage.load()).toEqual(saved);
  });

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
        'dba.word.water': {
          ...current.words['dba.word.water'],
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
    expect(loaded?.words['dba.word.water']?.state).toBe('learned');
    expect(loaded && 'ngCount' in loaded).toBe(false);
  });
});
