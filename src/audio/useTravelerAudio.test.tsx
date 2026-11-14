import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import type { TravelerPresentation } from '../ui/Traveler';
import { groundMaterial, useTravelerAudio } from './useTravelerAudio';
const mock=vi.hoisted(()=>({play:vi.fn(),dispose:vi.fn(),audio:{status:'ready',muted:false,volume:.7,effects:1}}));
vi.mock('./useSoundscape',()=>({useAudio:()=>mock.audio}));
vi.mock('./sounds',()=>({loadSound:vi.fn()}));
vi.mock('./soundScope',()=>({soundScope:()=>({play:mock.play,dispose:mock.dispose})}));
function actor(frame:number,pose='walk',moving=true) { return {moving,x:.5,presentationFrozen:false,current:{shown:'loaded.png',blend:{pose,frame}}} as unknown as TravelerPresentation; }
beforeEach(()=>{vi.useFakeTimers();mock.play.mockClear();mock.dispose.mockClear();});
afterEach(()=>{cleanup();vi.useRealTimers();});
it('uses the material drawn under the player, including the wooden bridge',()=>{
 expect(groundMaterial('dba.scene.shore')).toBe('sand');expect(groundMaterial('dba.scene.yard')).toBe('stone');expect(groundMaterial('dba.scene.path')).toBe('wood');
});
it('sounds only actual contact frames, has no repeat timer, and retires on stop/pause',()=>{
 const view=renderHook(({p,paused})=>useTravelerAudio(p,'dba.scene.shore',paused,0),{initialProps:{p:actor(0),paused:false}});
 expect(mock.play.mock.calls[0][0]).toMatch(/^step-sand/);
 act(()=>vi.advanceTimersByTime(400));view.rerender({p:actor(0),paused:false});expect(mock.play).toHaveBeenCalledTimes(1);
 view.rerender({p:actor(1),paused:false});expect(mock.play).toHaveBeenCalledTimes(1);
 act(()=>vi.advanceTimersByTime(200));view.rerender({p:actor(2),paused:false});expect(mock.play.mock.calls[1][0]).toMatch(/^step-sand/);expect(mock.play.mock.calls[2][0]).toMatch(/^cloth-/);
 view.rerender({p:actor(2,'idle',false),paused:false});expect(mock.dispose).toHaveBeenCalled();
 const calls=mock.play.mock.calls.length;act(()=>vi.advanceTimersByTime(2000));expect(mock.play).toHaveBeenCalledTimes(calls);
 view.rerender({p:actor(0),paused:true});expect(mock.play).toHaveBeenCalledTimes(calls);
});
it('synchronizes water, swallowing and set-down with separate drink poses',()=>{
 const view=renderHook(({frame,seq})=>useTravelerAudio(actor(frame,'drink',false),'dba.scene.shore',false,seq),{initialProps:{frame:0,seq:1}});
 expect(mock.play.mock.calls[0][0]).toMatch(/^water-draw/);
 view.rerender({frame:1,seq:1});expect(mock.play).toHaveBeenCalledTimes(1);
 view.rerender({frame:2,seq:1});expect(mock.play.mock.calls[1][0]).toMatch(/^drink-/);
 view.rerender({frame:3,seq:1});expect(mock.play.mock.calls[2][0]).toBe('place');
 view.rerender({frame:3,seq:2});expect(mock.play).toHaveBeenCalledTimes(3);
 view.rerender({frame:0,seq:2});expect(mock.play.mock.calls[3][0]).toMatch(/^water-draw/);
});
it('does not play a successful pickup for a refused interaction',()=>{
 const view=renderHook(({frame})=>useTravelerAudio(actor(frame,'reach',false),'dba.scene.yard',false,2,{spot:'yard-grab',kind:'no'}),{initialProps:{frame:0}});view.rerender({frame:2});
 expect(mock.play.mock.calls[0][0]).toBe('cloth-1');
});
it('resumes future contacts after pause without replaying the held swallow',()=>{
 const view=renderHook(({frame,paused})=>useTravelerAudio(actor(frame,'drink',false),'dba.scene.shore',paused,3),{initialProps:{frame:0,paused:false}});
 view.rerender({frame:2,paused:false});expect(mock.play).toHaveBeenCalledTimes(2);
 view.rerender({frame:2,paused:true});view.rerender({frame:2,paused:false});expect(mock.play).toHaveBeenCalledTimes(2);
 view.rerender({frame:3,paused:false});expect(mock.play).toHaveBeenLastCalledWith('place',expect.anything());
});
it('fills at the spring but leaves food-table contact audio to its event owner',()=>{
 const view=renderHook(({frame,spot,seq})=>useTravelerAudio(actor(frame,'reach',false),'dba.scene.shore',false,seq,{spot,kind:'ok'}),{initialProps:{frame:0,spot:'water-spring',seq:1}});
 view.rerender({frame:2,spot:'water-spring',seq:1});expect(mock.play.mock.calls[0][0]).toMatch(/^water-draw-/);
 for(const spot of ['food-self','food-companion','food-inspect']) {
  view.rerender({frame:0,spot,seq:2});view.rerender({frame:2,spot,seq:2});
 }
 expect(mock.play).toHaveBeenCalledTimes(1);
});
