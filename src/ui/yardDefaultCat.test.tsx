import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { execFileSync } from 'node:child_process';
let WalkLayer:typeof import('./WalkLayer')['WalkLayer'];
import { companionPost, companionFoot, companionSole } from '../core/companionPost';
import { companionFrameId } from '../core/companionTraj';
import { newGameState } from '../core/save';
import { hintPresentation } from '../core/hints';
import { visibleSpots } from './spotViews';
import { slotAssetUrl, trajAssetUrl } from '../content/assetUrls';
import type { IslandScene } from '../core/island';
const asset='art.yard.prop.nanaicha';const file='src/assets/art/slots/'+asset+'.png';
const expectedSHA='d43eed51370adb0f0e76195fbd4502f61db641a54e077f25c05bc5d3356aa36e';
const pixels=()=>JSON.parse(execFileSync('python3',['-c',`import json,sys
from PIL import Image
im=Image.open(sys.argv[1]).convert('RGBA');print(json.dumps({'size':im.size,'bbox':im.getchannel('A').getbbox()}))`,file],{encoding:'utf8'})) as {size:number[];bbox:number[]};
const hold=()=>{let resolve!:(r:Response)=>void;const promise=new Promise<Response>(r=>{resolve=r;});return {promise,resolve};};
const flush=()=>act(async()=>{for(let n=0;n<24;n++)await Promise.resolve();});
function layer(scene:IslandScene,post=companionPost(scene,{}),onAsk=()=>{}){
 const save=newGameState();const hint=hintPresentation(save);return <WalkLayer scene={scene} drank={false} spots={visibleSpots(scene,save,hint)} hint={hint} paused purr={false} knot="rest" remembered={null} catPost={post} presentationFrozen onRemember={()=>{}} onExit={()=>{}} onInteract={()=>{}} onAsk={onAsk} onEscape={()=>{}}/>;
}
beforeEach(async()=>{vi.resetModules();WalkLayer=(await import('./WalkLayer')).WalkLayer;window.history.replaceState(null,'','/?loadtrace=1');vi.stubGlobal('fetch',vi.fn(()=>new Promise<Response>(()=>{})));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.restoreAllMocks();});
function assertDefaultFoot(v:ReturnType<typeof render>){
 const anchor=v.getByTestId('companion-anchor');const left=anchor.getAttribute('data-face')==='left';const x=left?1-640.5/1280:640.5/1280;
 expect(parseFloat(anchor.style.getPropertyValue('--foot-x'))/100).toBeCloseTo(x,10);
 expect(parseFloat(anchor.style.getPropertyValue('--foot-y'))/100).toBeCloseTo(.9923828125,10);
 expect(parseFloat(anchor.style.getPropertyValue('--sole-y'))/100).toBeCloseTo(.9923828125,10);
 expect(anchor.style.height).toBe('22%');
 // A source-space opaque foot projected through real contain geometry must
 // land at box pivot; no leftover old .259 offset (~60px at width250).
 const sourceX=left?1-640.5/1280:640.5/1280;
 expect(Math.abs((sourceX-parseFloat(anchor.style.getPropertyValue('--foot-x'))/100)*250)).toBeLessThan(.001);
 expect(Math.abs(((1-(13/720)*((3/4)/(1280/720)))-parseFloat(anchor.style.getPropertyValue('--foot-y'))/100)*320)).toBeLessThan(.001);
}
describe('delivered full default yard cat as explicit temporary Y0 fallback',()=>{
 it('restores exact delivered PNG bytes and actual decoded whole-body bounds',()=>{
  expect(createHash('sha256').update(readFileSync(file)).digest('hex')).toBe(expectedSHA);
  expect(pixels()).toEqual({size:[1280,720],bbox:[465,272,816,707]});
 });
 it('Y0 keeps its beat/guide but selects real default pixels and their contain metadata, not .259',()=>{
  const post=companionPost('dba.scene.yard',{});expect(post.beat).toBe('Y0');const v=render(layer('dba.scene.yard',post));
  expect(v.container.querySelector('.nanaicha-ground')?.getAttribute('src')).toBe(slotAssetUrl(asset));
  const anchor=v.getByTestId('companion-anchor');expect(anchor.dataset.beat).toBe('Y0');expect(anchor.dataset.guide).toBe('hold');
  expect(anchor.dataset.fallbackFor).toBe('land-yard-give');expect(anchor.dataset.sprite).toBe('fallback');
  expect(companionFrameId('Y0','land')).toBe('land-yard-give');expect(post.targetId).toBe(companionPost('dba.scene.yard',{}).targetId);
  assertDefaultFoot(v);expect(vi.mocked(fetch).mock.calls.some(([url])=>String(url).includes('land-yard-give'))).toBe(false);
 });
 it('path existing fallback displays restored image with correct default foot and original dimensions',()=>{
  const v=render(layer('dba.scene.path'));expect(v.container.querySelector('.nanaicha-ground')?.getAttribute('src')).toBe(slotAssetUrl(asset));
  expect(v.container.querySelector('.nanaicha-ground')).not.toBeNull();expect(pixels().size).toEqual([1280,720]);assertDefaultFoot(v);
 });
 it('ready default stays visible through pending raw→blob and blob swap, with same DOM and foot',async()=>{
  const pending=hold();vi.stubGlobal('fetch',vi.fn(()=>pending.promise));const NativeURL=URL;vi.stubGlobal('URL',class extends NativeURL {static createObjectURL=vi.fn(()=> 'blob:yard-default-ready');});
  const ask=vi.fn();const v=render(layer('dba.scene.yard',undefined,ask));await flush();const img=v.container.querySelector('.nanaicha-ground')!;const anchor=v.getByTestId('companion-anchor');
  expect(img.getAttribute('src')).toBe(slotAssetUrl(asset));assertDefaultFoot(v);
  await act(async()=>{pending.resolve(new Response(Uint8Array.from(readFileSync(file)).buffer,{status:200,headers:{'Content-Type':'image/png'}}));});await flush();
  expect(v.container.querySelector('.nanaicha-ground')).toBe(img);expect(v.getByTestId('companion-anchor')).toBe(anchor);
  expect(img.getAttribute('src')).toBe('blob:yard-default-ready');assertDefaultFoot(v);
  fireEvent.click(v.getByTestId('companion'));expect(ask).toHaveBeenCalledTimes(1);
 });
 it.each([['dba.scene.shore','S0'],['dba.scene.shore','S1'],['dba.scene.shore','S2'],['dba.scene.camp','C1'],['dba.scene.camp','C2'],['dba.scene.camp','C3']] as const)('does not change %s selected landing, metadata, or geometry', (scene,beat)=>{
  const post={...companionPost(scene,{}),beat};const frame=companionFrameId(post.beat,'land');const v=render(layer(scene,post));const anchor=v.getByTestId('companion-anchor');
  expect(v.container.querySelector('.nanaicha-ground')?.getAttribute('src')).toBe(trajAssetUrl(frame));expect(anchor.dataset.sprite).toBe(frame);
  expect(parseFloat(anchor.style.getPropertyValue('--foot-x'))/100).toBeCloseTo(companionFoot(frame).x,10);
  expect(parseFloat(anchor.style.getPropertyValue('--foot-y'))/100).toBeCloseTo(companionFoot(frame).y,10);
  expect(parseFloat(anchor.style.getPropertyValue('--sole-y'))/100).toBeCloseTo(companionSole(frame),10);
  expect(anchor.dataset.fallbackFor).toBeUndefined();
 });
});
