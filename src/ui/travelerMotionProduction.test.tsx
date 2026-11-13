import {act,cleanup,render} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
vi.mock('./useAssetSrc',async()=>{const u=await import('../content/assetUrls');return {useAssetSrc:(f:string|null)=>({src:f?u.travelerFrameUrl(f):null,onError:()=>{}})};});
vi.mock('./travelerArt',async()=>{const u=await import('../content/assetUrls');return {frameUrl:(f:string)=>u.travelerFrameUrl(f),loadFrame:async(f:string)=>u.travelerFrameUrl(f),forgetFrame:vi.fn()};});
const punches=new Map<string,(src:string)=>void>();
vi.mock('./hemPunch',async()=>({...await vi.importActual('./hemPunch'),punchHemUrl:(src:string)=>new Promise<string>(resolve=>{punches.set(src,resolve);})}));
let now=0,seq=0,raf=new Map<number,FrameRequestCallback>();let Traveler:typeof import('./Traveler')['TravelerMark'];
async function frame(){now+=1000/60;await act(async()=>{vi.advanceTimersByTime(1000/60);const q=[...raf.values()];raf.clear();q.forEach(cb=>cb(now));});}
beforeEach(async()=>{vi.resetModules();vi.useFakeTimers({toFake:['setTimeout','clearTimeout','Date']});vi.stubEnv('MODE','production');vi.stubEnv('VITE_VISUAL_SAMPLE','1');history.replaceState({},'','/?shoreVisual=candidate');now=0;seq=0;raf=new Map();punches.clear();vi.spyOn(performance,'now').mockImplementation(()=>now);vi.spyOn(window,'requestAnimationFrame').mockImplementation(cb=>{raf.set(++seq,cb);return seq;});vi.spyOn(window,'cancelAnimationFrame').mockImplementation(id=>raf.delete(id));Traveler=(await import('./Traveler')).TravelerMark;});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.useRealTimers();vi.unstubAllEnvs();});
describe('actual production Traveler RAF follows observed displacement',()=>{
 it.each([true,false])('stops walk promptly and advances decoded raw frames despite slow punch (contactCleanup=%s)',async contactCleanup=>{
  let x=.2;const v=render(<Traveler x={x} y={.7} facing="right" moving stride={1} contactCleanup={contactCleanup}/>);
  const walkingSources=new Set<string>();
  for(let n=0;n<100;n++){x+=.38/60;v.rerender(<Traveler x={x} y={.7} facing="right" moving stride={1} contactCleanup={contactCleanup}/>);await frame();const src=v.container.querySelector('[data-layer="current"]')?.getAttribute('src');if(src?.includes('stride-side-'))walkingSources.add(src);}
  expect(walkingSources.size).toBe(4);
  expect(v.getByTestId('traveler').dataset.pose).toBe('walk');const old=v.container.querySelector('[data-layer="current"]')!.getAttribute('src')!;expect(old).toMatch(/stride-side/);
  v.rerender(<Traveler x={x} y={.7} facing="right" moving={false} stride={0} contactCleanup={contactCleanup}/>);await frame();expect(v.getByTestId('traveler').dataset.pose).toBe('idle');
  expect(v.container.querySelector('[data-layer="current"]')!.getAttribute('src')).toMatch(/idle-side/);
  await act(async()=>{punches.get(old)?.('blob:late-walk');});expect(v.container.querySelector('[data-layer="current"]')!.getAttribute('src')).toMatch(/idle-side/);
  for(let n=0;n<20;n++)await frame();expect(v.container.querySelector('[data-layer="out"]')).toBeNull();
  v.unmount();expect(raf.size).toBe(0);
 });
 it('advances registered atlas cells on one image without legacy hem processing',async()=>{
  let x=.2;const v=render(<Traveler x={x} y={.7} facing="right" moving stride={1} contactCleanup/>);
  for(let n=0;n<35;n++){x+=.22/(60*16/9);v.rerender(<Traveler x={x} y={.7} facing="right" moving stride={1} contactCleanup/>);await frame();}
  const img=v.container.querySelector('[data-layer="current"]')!;const raw=img.getAttribute('src')!;expect(raw).toMatch(/stride-side/);
  expect(punches.has(raw)).toBe(false);expect(img.getAttribute('data-atlas')).toMatch(/stride-side/);
  const sources=new Set<string>();
  for(let n=0;n<60;n++){x+=.22/(60*16/9);v.rerender(<Traveler x={x} y={.7} facing="right" moving stride={1} contactCleanup/>);await frame();sources.add(img.getAttribute('src')!);}
  expect(v.container.querySelector('[data-layer="current"]')).toBe(img);expect(sources.size).toBe(4);
 });
 it('switches pose to idle on the first stationary tick even with gait inertia from a full walk',async()=>{
  let x=.2;const v=render(<Traveler x={x} y={.7} facing="front" moving stride={1}/>);
  for(let n=0;n<100;n++){x+=.003;v.rerender(<Traveler x={x} y={.7} facing="front" moving stride={1}/>);await frame();}
  expect(v.getByTestId('traveler').dataset.pose).toBe('walk');v.rerender(<Traveler x={x} y={.7} facing="front" moving={false} stride={0}/>);await frame();expect(v.getByTestId('traveler').dataset.pose).toBe('idle');
 });
 it('does not walk or advance walk frames on input power without displacement, including an in-place turn',async()=>{
  const v=render(<Traveler x={.4} y={.7} facing="left" moving stride={1}/>);for(let n=0;n<80;n++)await frame();expect(v.getByTestId('traveler').dataset.pose).toBe('idle');
  v.rerender(<Traveler x={.4} y={.7} facing="right" moving stride={1}/>);for(let n=0;n<20;n++)await frame();expect(v.getByTestId('traveler').dataset.pose).toBe('idle');expect(v.getByTestId('traveler').dataset.facing).toBe('right');
  let x=.4;for(let n=0;n<30;n++){x+=.38/60;v.rerender(<Traveler x={x} y={.7} facing="left" moving stride={1}/>);await frame();}expect(v.getByTestId('traveler').dataset.pose).toBe('walk');
 });
});
