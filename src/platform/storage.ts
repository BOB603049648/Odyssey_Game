import { parseSave } from '../core/migrate';
import { saveDataSchema, type SaveData } from '../core/schema';

export const SAVE_KEY = 'odyssey.save.v1';

export interface StorageAdapter {
  load(): SaveData | null;
  save(data: SaveData): boolean;
  clear(): void;
}

interface KeyValue {
  getItem(key: string): string | null;
  setItem(key: string, value: string): void;
  removeItem(key: string): void;
}

export function createMemoryStorage(): StorageAdapter & { backing: KeyValue } {
  const backing = new Map<string, string>();
  const memory: KeyValue = {
    getItem: (key) => backing.get(key) ?? null,
    setItem: (key, value) => {
      backing.set(key, value);
    },
    removeItem: (key) => {
      backing.delete(key);
    },
  };
  return { ...createWebStorage(memory), backing: memory };
}

export function createWebStorage(storage: KeyValue): StorageAdapter {
  return {
    load() {
      try {
        const raw = storage.getItem(SAVE_KEY);
        if (!raw) return null;
        return parseSave(JSON.parse(raw));
      } catch {
        return null;
      }
    },
    save(data) {
      try {
        const parsed = saveDataSchema.safeParse(data);
        if (!parsed.success) return false;
        storage.setItem(SAVE_KEY, JSON.stringify(parsed.data));
        return true;
      } catch {
        return false;
      }
    },
    clear() {
      try {
        storage.removeItem(SAVE_KEY);
      } catch {
        // A denied storage operation must not crash the running game.
      }
    },
  };
}

export function webStorage(): StorageAdapter {
  // Even reading window.localStorage can throw in restricted browsers.
  // Resolve it inside the adapter's guarded operations, and retry next time.
  return createWebStorage({
    getItem: (key) => window.localStorage.getItem(key),
    setItem: (key, value) => window.localStorage.setItem(key, value),
    removeItem: (key) => window.localStorage.removeItem(key),
  });
}
