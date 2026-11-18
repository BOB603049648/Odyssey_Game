import {reduce as currentReduce,type Action} from '../reduce';
import type {SaveData} from '../schema';
/** Compatibility fixture for the archived picture-practice / v10 reading route.
 * Production new games and imported saves use the observation route instead.
 * New route integration coverage lives in App and islandScript tests. */
export function reduce(save:SaveData,action:Action):SaveData {
  const next=currentReduce(save,action);
  return action.type==='new-game'?{...next,flags:{...next.flags,'dba.script.active':false,'dba.reading.active':true}}:next;
}
export type {Action};
