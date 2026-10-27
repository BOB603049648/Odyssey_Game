import { create } from 'zustand';
import type { Action } from '../core/reduce';
import { reduce } from '../core/reduce';
import { newGameState } from '../core/save';
import type { SaveData } from '../core/schema';
import { webStorage } from '../platform/storage';

const storage = webStorage();

interface GameStore {
  save: SaveData;
  dispatch: (action: Action) => void;
  resetForTests: () => void;
}

export const useGame = create<GameStore>((set, get) => ({
  save: storage.load() ?? newGameState(),
  dispatch: (action) => {
    const next = reduce(get().save, action);
    storage.save(next);
    set({ save: next });
  },
  resetForTests: () => {
    set({ save: storage.load() ?? newGameState() });
  },
}));
