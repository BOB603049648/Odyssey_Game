import { StrictMode, Suspense, startTransition, useState } from 'react';
import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { createCatRecordRecovery, useCatRecordRecovery, type CatRecoveryBinding } from './useCatRecordRecovery';
import * as Updates from '../content/assetUpdates';
import * as CatImage from './catImage';
import type { RecoveryReceipt } from './useAssetSrc';

const stops: (() => void)[] = [];
afterEach(() => { cleanup(); stops.splice(0).forEach(stop => stop()); document.body.replaceChildren(); vi.restoreAllMocks(); });
function image(src = '/cat-a.png') { const node = document.createElement('img'); node.src = src; document.body.append(node); return node; }
function fixture(ready = true) {
  const cache = new Map<string, string>(ready ? [['a', '/cat-a.png']] : []);
  const api = { resolve: (id: string | null) => id ? cache.get(id) ?? null : null,
    load: vi.fn(async (id: string | null) => id ? cache.get(id) ?? null : null),
    forget: vi.fn((id: string) => { cache.delete(id); Updates.notifyAssetUpdates(); }) };
  const binding: CatRecoveryBinding = { scene: 'shore', kind: 'traj', id: 'a', originalURL: '/cat-a.png', api };
  const owner = createCatRecordRecovery();
  const stop = owner.connect(); stops.push(stop);
  const node = image();
  const key = JSON.stringify(['shore', 'traj', 'a', '/cat-a.png']);
  const lease = owner.attach(node, key, 0);
  owner.commit(binding);
  const invalidate = vi.fn((_id: string) => { api.forget('a'); return 'accepted' as const; });
  const receipt: RecoveryReceipt = { lease: Symbol('receipt'), id: 'a', loadIdentity: api.load, invalidate };
  return { owner, binding, api, cache, node, lease, receipt, invalidate, stop, key };
}
function nextNode(f: ReturnType<typeof fixture>) {
  f.node.remove(); f.owner.detach(f.lease);
  const node = image(); f.owner.attach(node, f.key, f.owner.getSnapshot().imageEpoch); f.owner.commit(f.binding); return node;
}
it('same semantic tuple and connection noops retain exactly the same immutable snapshot', () => {
  const f = fixture(); const original = f.owner.getSnapshot();
  f.owner.commit({ ...f.binding }); Updates.notifyAssetUpdates();
  expect(f.owner.getSnapshot()).toBe(original); expect(Object.isFrozen(original)).toBe(true);
  f.node.src = 'blob:normal-raw-to-blob'; f.owner.commit({ ...f.binding }); expect(f.owner.getSnapshot()).toBe(original);
});
it('stages the sole commit-ref error before an epoch exists and waits for a checked passive receipt', () => {
  const f = fixture(); f.owner.detach(f.lease); f.node.remove();
  const owner = createCatRecordRecovery(), node = image(); const lease = owner.attach(node, f.key, 0);
  owner.error(node); expect(owner.getSnapshot().recordEpoch).toBe(0); expect(f.invalidate).not.toHaveBeenCalled();
  stops.push(owner.connect()); owner.commit(f.binding); expect(owner.getSnapshot().phase).toBe('pendingConsumer');
  owner.lifecycle.connected(f.receipt); expect(f.invalidate).toHaveBeenCalledTimes(1); expect(f.api.forget).toHaveBeenCalledTimes(1);
  owner.error(node); expect(f.invalidate).toHaveBeenCalledTimes(1); expect(lease.record).toBe(owner.getSnapshot().recordEpoch);
  f.cache.set('a','/cat-a.png'); Updates.notifyAssetUpdates(); expect(owner.getSnapshot().imageEpoch).toBe(1);
});
it('wrong kind/id handshake and retired receipt do not clear the actual blob', () => {
  const f = fixture(); const forget = vi.spyOn(CatImage, 'forgetCatSrc'); f.owner.error(f.node);
  f.owner.lifecycle.connected({ ...f.receipt, id: 'other' }); expect(f.invalidate).not.toHaveBeenCalled();
  f.owner.lifecycle.connected({ ...f.receipt, invalidate: () => 'retired' }); expect(forget).not.toHaveBeenCalled();
  expect(f.owner.getSnapshot().phase).toBe('pendingConsumer'); f.owner.lifecycle.connected(f.receipt);
  expect(f.invalidate).toHaveBeenCalledTimes(1); expect(forget).toHaveBeenCalledExactlyOnceWith('/cat-a.png');
});
it('nested empty/ready is buffered until accepted invalidation and blob cleanup close', () => {
  const f = fixture(); const epochs: number[] = [], order: string[] = [];
  vi.spyOn(CatImage,'forgetCatSrc').mockImplementation(() => { order.push('blob'); epochs.push(f.owner.getSnapshot().imageEpoch); });
  const receipt = { ...f.receipt, invalidate: vi.fn(() => {
    order.push('invalidate'); f.cache.delete('a'); Updates.notifyAssetUpdates();
    f.cache.set('a','/cat-a.png'); Updates.notifyAssetUpdates(); epochs.push(f.owner.getSnapshot().imageEpoch); return 'accepted' as const;
  }) };
  f.owner.lifecycle.connected(receipt); f.owner.error(f.node);
  expect(order).toEqual(['invalidate','blob']); expect(epochs).toEqual([0,0]); expect(f.owner.getSnapshot().imageEpoch).toBe(1);
  Updates.notifyAssetUpdates(); expect(f.owner.getSnapshot().imageEpoch).toBe(1);
});
it('an already empty cache with no forget notification is still a valid per-cycle empty witness', () => {
  const f = fixture(false); f.owner.lifecycle.connected({ ...f.receipt, invalidate: vi.fn(() => 'accepted' as const) });
  f.owner.error(f.node); expect(f.owner.getSnapshot().phase).toBe('awaitingDecode');
  f.cache.set('a','/cat-a.png'); Updates.notifyAssetUpdates(); expect(f.owner.getSnapshot().imageEpoch).toBe(1);
});
it('disconnected owner reconnects before reconcile, preserves witnessed facts and never repeats accepted invalidation', () => {
  const f = fixture(); f.owner.lifecycle.connected(f.receipt); f.owner.error(f.node); f.stop();
  f.cache.set('a','/cat-a.png'); Updates.notifyAssetUpdates(); expect(f.owner.getSnapshot().imageEpoch).toBe(0);
  stops.push(f.owner.connect()); expect(f.owner.getSnapshot().imageEpoch).toBe(1);
  f.owner.lifecycle.connected({ ...f.receipt, lease: Symbol('strict-new') }); expect(f.invalidate).toHaveBeenCalledTimes(1);
});
it('unsubscribed snapshot callback cannot act after another observer connection is live', () => {
  const callbacks: (() => void)[] = []; const original = Updates.subscribeAssetUpdates;
  vi.spyOn(Updates,'subscribeAssetUpdates').mockImplementation(fn => { callbacks.push(fn); return original(fn); });
  const f = fixture(); f.owner.lifecycle.connected(f.receipt); f.owner.error(f.node); f.stop(); stops.push(f.owner.connect());
  f.cache.set('a','/cat-a.png'); callbacks[0](); expect(f.owner.getSnapshot().imageEpoch).toBe(0);
  callbacks[1](); expect(f.owner.getSnapshot().imageEpoch).toBe(1);
});
it('ready before any actual invalidation is not a recovery and unrelated notifications cannot create an epoch', () => {
  const f = fixture(); f.owner.error(f.node); Updates.notifyAssetUpdates();
  expect(f.owner.getSnapshot().imageEpoch).toBe(0); expect(f.owner.getSnapshot().phase).toBe('pendingConsumer');
  f.owner.lifecycle.connected(f.receipt); Updates.notifyAssetUpdates(); expect(f.owner.getSnapshot().imageEpoch).toBe(0);
});
it('new image before load accepts a second genuine failure while duplicate and prior-epoch errors are ignored', () => {
  const f = fixture(); f.owner.lifecycle.connected(f.receipt); f.owner.error(f.node); f.owner.error(f.node);
  expect(f.invalidate).toHaveBeenCalledTimes(1); f.cache.set('a','/cat-a.png'); Updates.notifyAssetUpdates();
  const fresh = nextNode(f); f.owner.error(f.node); expect(f.invalidate).toHaveBeenCalledTimes(1);
  f.owner.error(fresh); expect(f.invalidate).toHaveBeenCalledTimes(2); expect(f.owner.getSnapshot().failureSerial).toBe(2);
  f.cache.set('a','/cat-a.png'); Updates.notifyAssetUpdates(); expect(f.owner.getSnapshot().imageEpoch).toBe(2);
});
it('obsolete queued raw error unlocks without clearing a new blob and allows its actual failure', () => {
  const f = fixture(); f.owner.error(f.node); expect(f.owner.getSnapshot().phase).toBe('pendingConsumer');
  f.node.src = 'blob:replacement'; f.owner.lifecycle.connected(f.receipt);
  expect(f.invalidate).not.toHaveBeenCalled(); expect(f.owner.getSnapshot().phase).toBe('active');
  f.owner.error(f.node); expect(f.invalidate).toHaveBeenCalledTimes(1);
});
it('A to B to A never revives the old node token and same tuple commit is idempotent', () => {
  const f = fixture(); const r = f.owner.getSnapshot().recordEpoch; f.owner.detach(f.lease); f.node.remove();
  const b = { ...f.binding, scene: 'camp' }, node = image();
  f.owner.attach(node, JSON.stringify(['camp','traj','a','/cat-a.png']),0); f.owner.commit(b); expect(f.owner.getSnapshot().recordEpoch).toBe(r+1);
  node.remove(); const a = image(); f.owner.attach(a,f.key,0); f.owner.commit(f.binding);
  expect(f.owner.getSnapshot().recordEpoch).toBe(r+2); f.owner.lifecycle.connected(f.receipt); f.owner.error(f.node);
  expect(f.invalidate).not.toHaveBeenCalled(); f.owner.error(a); expect(f.invalidate).toHaveBeenCalledTimes(1);
});
it('a suspended speculative B render never binds B API or commits its tuple', async () => {
  const cache = new Map([['a','/cat-a.png'],['b','/cat-b.png']]);
  function apiFor(id:string) { return { resolve: (key:string|null) => key?cache.get(key)??null:null, load: vi.fn(async()=>cache.get(id)??null), forget: vi.fn((key:string)=>{cache.delete(key);Updates.notifyAssetUpdates();}) }; }
  const apiA=apiFor('a'),apiB=apiFor('b');const commits:string[]=[];let choose:(b:boolean)=>void=()=>{};
  const never = new Promise<void>(()=>{});
  function Figure({b}:{b:boolean}) {
    const record:CatRecoveryBinding={scene:'shore',kind:'traj',id:b?'b':'a',originalURL:b?'/cat-b.png':'/cat-a.png',api:b?apiB:apiA};
    const recovery=useCatRecordRecovery(record,()=>commits.push(record.id));
    if(b)throw never;
    return <img data-testid="actual" src={record.originalURL} ref={recovery.imageRef} onError={recovery.onError}/>;
  }
  function Parent(){const[b,set]=useState(false);choose=set;return <Suspense fallback={<span>waiting</span>}><Figure b={b}/></Suspense>;}
  const view=render(<Parent/>);await act(async()=>{await Promise.resolve();});
  act(()=>{startTransition(()=>choose(true));});expect(commits).not.toContain('b');
  act(()=>fireEvent.error(view.getByTestId('actual')));expect(apiA.forget).toHaveBeenCalledTimes(1);expect(apiB.forget).not.toHaveBeenCalled();expect(cache.get('b')).toBe('/cat-b.png');
});
it('Strict owner reconnect remains live with idempotent semantic binding', async () => {
  const cache=new Map([['a','/cat-a.png']]);const api={resolve:(id:string|null)=>id?cache.get(id)??null:null,load:vi.fn(async()=>null),forget:vi.fn((id:string)=>{cache.delete(id);Updates.notifyAssetUpdates();})};
  function Figure(){const r=useCatRecordRecovery({scene:'shore',kind:'traj',id:'a',originalURL:'/cat-a.png',api},()=>{});return <img data-testid="strict" src="/cat-a.png" ref={r.imageRef} onError={r.onError}/>;}
  const view=render(<StrictMode><Figure/></StrictMode>);await act(async()=>{await Promise.resolve();});
  act(()=>fireEvent.error(view.getByTestId('strict')));expect(api.forget).toHaveBeenCalledTimes(1);
});
it('same-record view reparent keeps error ownership without waiting for an unchanged layout effect', async () => {
  const cache=new Map([['a','/cat-a.png']]);const api={resolve:(id:string|null)=>id?cache.get(id)??null:null,load:vi.fn(async()=>null),forget:vi.fn((id:string)=>{cache.delete(id);Updates.notifyAssetUpdates();})};
  function Figure({reparent}:{reparent:boolean}) {
    const r=useCatRecordRecovery({scene:'shore',kind:'traj',id:'a',originalURL:'/cat-a.png',api},()=>{});
    const img=<img data-testid="reparent" src="/cat-a.png" ref={r.imageRef} onError={r.onError}/>;
    return reparent?<section>{img}</section>:<div>{img}</div>;
  }
  const view=render(<Figure reparent={false}/>);await act(async()=>{await Promise.resolve();});const old=view.getByTestId('reparent');
  view.rerender(<Figure reparent/>);expect(view.getByTestId('reparent')).not.toBe(old);
  act(()=>fireEvent.error(view.getByTestId('reparent')));expect(api.forget).toHaveBeenCalledTimes(1);
});
