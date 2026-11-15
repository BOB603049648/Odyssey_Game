import { create } from 'zustand';
import type { Point } from '../core/walk';
import type { Action } from '../core/reduce';
import { reduce } from '../core/reduce';
import { newGameState } from '../core/save';
import type { SaveData } from '../core/schema';
import { webStorage } from '../platform/storage';

const storage = webStorage();

export type Place = Point & { scene: string };

interface GameStore {
  save: SaveData;
  saveFailed: boolean;
  saveGeneration: number;
  place: Place | null;
  setPlace: (place: Place | null) => void;
  dispatch: (action: Action) => void;
  restore: (save: SaveData) => boolean;
  resetForTests: () => void;
}

export const useGame = create<GameStore>((set, get) => ({
  save: storage.load() ?? newGameState(),
  saveFailed: false,
  saveGeneration: 0,
  place: null,
  setPlace: (place) => set({ place }),
  dispatch: (action) => {
    const next = reduce(get().save, action);
    const saved = storage.save(next);
    set({ save: next, saveFailed: !saved, place: action.type === 'new-game' ? null : get().place });
  },
  restore: (save) => {
    if (!storage.save(save)) return false;
    set({ save, saveFailed: false, place: null, saveGeneration: get().saveGeneration + 1 });
    return true;
  },
  resetForTests: () => {
    set({ save: storage.load() ?? newGameState(), saveFailed: false, place: null, saveGeneration: get().saveGeneration + 1 });
  },
}));
