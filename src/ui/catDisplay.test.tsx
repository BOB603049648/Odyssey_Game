import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
const S1='land-shore-gourd', S2='land-shore-east-gap';
const props={level:0 as const,anchor:'gourd' as const,pose:'lead' as const,purr:false,onAsk:()=>{}};
let fetcher:ReturnType<typeof vi.fn>;let serial=0;
async function setup() {
 const {Companion}=await import('./Companion');const {trajAssetUrl}=await import('../content/assetUrls');
 return {Companion,raw:trajAssetUrl(S1)!,raw2:trajAssetUrl(S2)!};
}
async function settle(){await act(async()=>{await Promise.resolve();await Promise.resolve();await Promise.resolve();});}
beforeEach(()=>{vi.resetModules();fetcher=vi.fn(()=>new Promise(()=>{}));vi.stubGlobal('fetch',fetcher);
 Object.defineProperty(URL,'createObjectURL',{configurable:true,value:vi.fn(()=>`blob:http://localhost/cat-d0-${++serial}`)});
});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();});
describe('cat actual displayed identity, no bearing claim',()=>{
 it('desiredS2 with actualrawS1 still reports S1 legacy976, including native load event',async()=>{
  const {Companion,raw}=await setup();render(<Companion {...props} figure={raw} frame={S2} diagnostic/>);
  const img=document.querySelector<HTMLImageElement>('.nanaicha-ground')!;fireEvent.load(img);
  expect(img.getAttribute('data-displayed-frame')).toBe(S1);expect(img.getAttribute('data-legacy-sole-row')).toBe('976');
  expect(img.getAttribute('data-support-status')).toBe('legacy-declared');expect(img.getAttribute('src')).toBe(raw);
 });
 it('registers the successful existing raw→blob flow once and retainsS1 when desiredS2',async()=>{
  const {Companion,raw}=await setup();fetcher.mockResolvedValue({ok:true,blob:async()=>new Blob(['x'.repeat(64)])});
  render(<Companion {...props} figure={raw} frame={S2} diagnostic/>);await settle();
  const img=document.querySelector<HTMLImageElement>('.nanaicha-ground')!;expect(img.getAttribute('src')).toMatch(/^blob:/);
  expect(img.getAttribute('data-displayed-frame')).toBe(S1);expect(img.getAttribute('data-legacy-sole-row')).toBe('976');
  expect(fetcher).toHaveBeenCalledTimes(1);const {loadCatSrc}=await import('./catImage');
  await loadCatSrc(raw);expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('does not identify an unknown fallback by its desiredS2 or a matching basename',async()=>{
  const {Companion}=await setup();render(<Companion {...props} figure="/unreviewed/land-shore-gourd.webp" frame={S2} diagnostic/>);
  const img=document.querySelector<HTMLImageElement>('.nanaicha-ground')!;expect(img.getAttribute('data-support-status')).toBe('unknown');
  expect(img.getAttribute('data-displayed-frame')).toBe('unknown');expect(img.hasAttribute('data-legacy-sole-row')).toBe(false);
 });
 it('keeps ready raw cat visible while blob processing is pending then swaps successfully',async()=>{
  const {Companion,raw}=await setup();let resolve!:(value:unknown)=>void;
  fetcher.mockReturnValue(new Promise(r=>{resolve=r;}));render(<Companion {...props} figure={raw} frame={S2} diagnostic/>);
  const img=document.querySelector<HTMLImageElement>('.nanaicha-ground')!;expect(img.getAttribute('src')).toBe(raw);
  expect(img.getAttribute('data-displayed-frame')).toBe(S1);
  await act(async()=>{resolve({ok:true,blob:async()=>new Blob(['x'.repeat(64)])});});
  expect(document.querySelector<HTMLImageElement>('.nanaicha-ground')!).toBe(img);expect(img.getAttribute('src')).toMatch(/^blob:/);
  expect(img.getAttribute('data-displayed-frame')).toBe(S1);
 });
 it('fetch rejection keeps raw visible, is not failure-cached, and later caller recovers identity',async()=>{
  const {Companion,raw}=await setup();fetcher.mockRejectedValue(new Error('offline'));
  const v=render(<Companion {...props} figure={raw} frame={S2} diagnostic/>);await settle();
  expect(document.querySelector<HTMLImageElement>('.nanaicha-ground')!.getAttribute('src')).toBe(raw);expect(fetcher).toHaveBeenCalledTimes(2);
  const {loadCatSrc}=await import('./catImage');fetcher.mockResolvedValue({ok:true,blob:async()=>new Blob(['y'.repeat(64)])});
  const recovered=await loadCatSrc(raw);expect(recovered).toMatch(/^blob:/);expect(fetcher).toHaveBeenCalledTimes(3);
  v.unmount();render(<Companion {...props} figure={raw} frame={S2} diagnostic/>);await settle();
  const img=document.querySelector<HTMLImageElement>('.nanaicha-ground')!;expect(img.getAttribute('src')).toBe(recovered);
  expect(img.getAttribute('data-displayed-frame')).toBe(S1);expect(fetcher).toHaveBeenCalledTimes(3);
 });
 it('ignores late successful completion after unmount without another request',async()=>{
  const {Companion,raw}=await setup();let resolve!:(value:unknown)=>void;fetcher.mockReturnValue(new Promise(r=>{resolve=r;}));
  const v=render(<Companion {...props} figure={raw} frame={S2} diagnostic/>);const img=document.querySelector<HTMLImageElement>('.nanaicha-ground')!;v.unmount();
  await act(async()=>{resolve({ok:true,blob:async()=>new Blob(['z'.repeat(64)])});});
  expect(img.getAttribute('src')).toBe(raw);expect(img.isConnected).toBe(false);expect(fetcher).toHaveBeenCalledTimes(1);
 });
 it('does not publish support/bearing diagnostics when not explicitly enabled',async()=>{
  const {Companion,raw}=await setup();const v=render(<Companion {...props} figure={raw} frame={S2} diagnostic/>);
  expect(document.querySelector<HTMLImageElement>('.nanaicha-ground')!.getAttribute('data-support-status')).toBe('legacy-declared');
  v.rerender(<Companion {...props} figure={raw} frame={S2}/>);
  const img=document.querySelector<HTMLImageElement>('.nanaicha-ground')!;expect(img.hasAttribute('data-support-status')).toBe(false);expect(img.hasAttribute('data-legacy-sole-row')).toBe(false);
 });
});
