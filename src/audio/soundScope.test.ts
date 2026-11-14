import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { soundScope } from './soundScope';
const mock=vi.hoisted(()=>({audio:{status:'ready',muted:false,volume:.7},listeners:new Set<()=>void>(),play:vi.fn()}));
vi.mock('./mixer',()=>({audioSnapshot:()=>mock.audio,subscribeAudio:(fn:()=>void)=>{mock.listeners.add(fn);return()=>mock.listeners.delete(fn);}}));
vi.mock('./sounds',()=>({playSound:(...args:unknown[])=>mock.play(...args)}));
beforeEach(()=>{vi.useFakeTimers();mock.audio={status:'ready',muted:false,volume:.7};mock.play.mockReset().mockResolvedValue(null);});
afterEach(()=>{vi.useRealTimers();vi.restoreAllMocks();});
it('discards a delayed footstep after stop or scene departure and disconnects the pending voice',async()=>{
 let finish!:(v:{stop:ReturnType<typeof vi.fn>})=>void;mock.play.mockImplementation(()=>new Promise(r=>{finish=r;}));
 const owner=soundScope();owner.play('step-sand-1',{maxAge:180});const valid=mock.play.mock.calls[0][1].valid;
 expect(valid()).toBe(true);owner.dispose();expect(valid()).toBe(false);
 const stop=vi.fn();finish({stop});await Promise.resolve();expect(stop).toHaveBeenCalledWith(0);expect(mock.listeners.size).toBe(0);
});
it('does not play an old foot contact when decoding finishes too late',()=>{
 const owner=soundScope();owner.play('step-wood-1',{maxAge:180});const valid=mock.play.mock.calls[0][1].valid;
 vi.advanceTimersByTime(200);expect(valid()).toBe(false);owner.dispose();
});
it('mute/hidden cancels scheduled rewards and stops voices; unmute never replays them',async()=>{
 const stop=vi.fn();mock.play.mockResolvedValue({stop});const owner=soundScope();owner.play('drink-1');await Promise.resolve();
 owner.after(1100,()=>owner.play('milestone'));
 mock.audio.muted=true;mock.listeners.forEach(fn=>fn());expect(stop).toHaveBeenCalledOnce();
 mock.audio.muted=false;mock.listeners.forEach(fn=>fn());vi.advanceTimersByTime(1500);expect(mock.play).toHaveBeenCalledTimes(1);
 owner.after(1000,()=>owner.play('milestone'));
 vi.spyOn(document,'hidden','get').mockReturnValue(true);document.dispatchEvent(new Event('visibilitychange'));vi.advanceTimersByTime(1500);expect(mock.play).toHaveBeenCalledTimes(1);owner.dispose();
});
it('releases completed one-shot ownership instead of accumulating footstep nodes',async()=>{
 let finish!:()=>void;const stop=vi.fn();mock.play.mockResolvedValue({stop,finished:new Promise<void>(r=>{finish=r;})});
 const owner=soundScope();owner.play('step-stone-1');await Promise.resolve();finish();await Promise.resolve();owner.dispose();expect(stop).not.toHaveBeenCalled();
});
