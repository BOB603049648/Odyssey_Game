import { act, cleanup, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { useAssetSrc, notifyAssetUpdates } from './useAssetSrc';
beforeEach(()=>{vi.useFakeTimers();});afterEach(()=>{cleanup();vi.useRealTimers();});
it('optional receipt is installed after initial attempt was invoked, retires synchronously, and preserves the public shape',async()=>{
 const cache=new Map<string,string>(); const calls:string[]=[];
 const api={resolve:(id:string|null)=>id?cache.get(id)??null:null,load:vi.fn(async(id:string|null)=>{calls.push('load');if(id)cache.set(id,'raw');return 'raw';}),forget:vi.fn((id:string)=>{cache.delete(id);notifyAssetUpdates();})};
 let receipt:any; const lifecycle={connected:vi.fn((r:any)=>{receipt=r;calls.push('connected');}),retired:vi.fn()};
 const view=renderHook(()=>useAssetSrc('frame',api,lifecycle));
 expect(Object.keys(view.result.current).sort()).toEqual(['onError','src']);expect(lifecycle.connected).toHaveBeenCalledTimes(1);
 // acquireRecovery invokes api.load in a microtask; connected is not delayed until it finishes.
 expect(receipt.id).toBe('frame');expect(receipt.loadIdentity).toBe(api.load);
 await act(async()=>{await Promise.resolve();await Promise.resolve();});expect(api.load).toHaveBeenCalledTimes(1);
 const old=receipt;view.unmount();expect(lifecycle.retired).toHaveBeenCalledWith(old.lease);expect(old.invalidate('late')).toBe('retired');expect(api.forget).not.toHaveBeenCalled();
});
it('same binding rerender and same-command receipt do not restart the original retry budget',async()=>{
 const cache=new Map([['frame','raw']]);const api={resolve:(id:string|null)=>id?cache.get(id)??null:null,load:vi.fn(async(id:string|null)=>{if(id)cache.set(id,'raw');notifyAssetUpdates();return 'raw';}),forget:vi.fn((id:string)=>{cache.delete(id);notifyAssetUpdates();})};
 let receipt:any;const lifecycle={connected:vi.fn((r:any)=>{receipt=r;}),retired:vi.fn()};
 const view=renderHook(()=>useAssetSrc('frame',api,lifecycle));expect(receipt).toBeDefined();
 act(()=>{expect(receipt.invalidate('r1:f1')).toBe('accepted');expect(receipt.invalidate('r1:f1')).toBe('accepted');});
 expect(api.forget).toHaveBeenCalledTimes(1);await act(async()=>{await vi.advanceTimersByTimeAsync(4000);});view.rerender();
 expect(lifecycle.connected).toHaveBeenCalledTimes(1);expect(api.load).not.toHaveBeenCalled();await act(async()=>{await vi.advanceTimersByTimeAsync(1000);});expect(api.load).toHaveBeenCalledTimes(1);
});

it('optional and default consumers share the unchanged 5/10/20/30 failed-batch schedule',async()=>{
 const api={resolve:()=>null,load:vi.fn(async()=>null)};
 const lifecycle={connected:vi.fn(),retired:vi.fn()};
 const view=renderHook(()=>{useAssetSrc('failed-frame',api,lifecycle);useAssetSrc('failed-frame',api);});
 await act(async()=>{await vi.advanceTimersByTimeAsync(0);});expect(api.load).toHaveBeenCalledTimes(1);
 for(let i=0;i<20;i++)window.dispatchEvent(new Event('online'));
 await act(async()=>{await vi.advanceTimersByTimeAsync(4999);});expect(api.load).toHaveBeenCalledTimes(1);
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});expect(api.load).toHaveBeenCalledTimes(2);
 await act(async()=>{await vi.advanceTimersByTimeAsync(9999);});expect(api.load).toHaveBeenCalledTimes(2);
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});expect(api.load).toHaveBeenCalledTimes(3);
 await act(async()=>{await vi.advanceTimersByTimeAsync(20000);});expect(api.load).toHaveBeenCalledTimes(4);
 await act(async()=>{await vi.advanceTimersByTimeAsync(30000);});expect(api.load).toHaveBeenCalledTimes(5);
 expect(lifecycle.connected).toHaveBeenCalledTimes(1);view.unmount();expect(vi.getTimerCount()).toBe(0);
});
