import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useGame } from './gameStore';
import { newGameState } from '../core/save';
import { reduce } from '../core/reduce';
beforeEach(()=>{localStorage.clear();useGame.getState().resetForTests();});
afterEach(()=>vi.restoreAllMocks());
it('keeps current progress if an imported save cannot be persisted',()=>{
 const before=useGame.getState().save;
 const backup=reduce(newGameState(),{type:'new-game'});
 vi.spyOn(Storage.prototype,'setItem').mockImplementation(()=>{throw new Error('quota');});
 expect(useGame.getState().restore(backup)).toBe(false);
 expect(useGame.getState().save).toBe(before);
});
it('persists restored progress and discards a stale scene position',()=>{
 useGame.getState().setPlace({scene:'dba.scene.hall',x:.4,y:.7});
 const backup=reduce(newGameState(),{type:'new-game'});
 expect(useGame.getState().restore(backup)).toBe(true);
 expect(useGame.getState().place).toBeNull();
 useGame.getState().resetForTests();expect(useGame.getState().save).toEqual(backup);
});
