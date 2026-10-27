import { saveDataSchema, type SaveData } from '../core/schema';

export const SAVE_KEY = 'odyssey.save.v1';

export interface StorageAdapter {
  load(): SaveData | null;
  save(data: SaveData): void;
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
      const raw = storage.getItem(SAVE_KEY);
      if (!raw) return null;
      try {
        const parsed = saveDataSchema.safeParse(JSON.parse(raw));
        return parsed.success ? parsed.data : null;
      } catch {
        return null;
      }
    },
    save(data) {
      storage.setItem(SAVE_KEY, JSON.stringify(data));
    },
    clear() {
      storage.removeItem(SAVE_KEY);
    },
  };
}

export function webStorage(): StorageAdapter {
  return createWebStorage(window.localStorage);
}
