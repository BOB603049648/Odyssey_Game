import {act,cleanup,render} from '@testing-library/react';
import {afterEach,describe,expect,it,vi} from 'vitest';
const pending=new Map<string,{resolve:(src:string)=>void,reject:(e:Error)=>void,promise:Promise<string>}>();
vi.mock('./catImage',()=>({loadCatSrc:(src:string)=>{let job=pending.get(src);if(!job){let resolve!:(src:string)=>void,reject!:(e:Error)=>void;const promise=new Promise<string>((r,j)=>{resolve=r;reject=j;});job={resolve,reject,promise};pending.set(src,job);}return job.promise;}}));
import {CompanionView,useCompanionPresentation} from './Companion';
const seen:string[]=[];
function Owner({figure}:{figure:string}){const p=useCompanionPresentation(figure);seen.push(p.src!);return <CompanionView presentation={p} figure={figure} frame="fallback" level={0} pose="idle" purr={false} anchor="give" onAsk={()=>{}}/>;}
afterEach(()=>{cleanup();pending.clear();seen.length=0;});
describe('persistent actual cat bitmap identity during loading',()=>{
 it('never commits a prior blob under the new decoded raw figure, even before its effect updates',async()=>{
  const v=render(<Owner figure="raw-A"/>);await act(async()=>pending.get('raw-A')!.resolve('blob:A'));expect(v.container.querySelector('img')?.getAttribute('src')).toBe('blob:A');
  seen.length=0;v.rerender(<Owner figure="raw-B"/>);expect(seen).not.toContain('blob:A');expect(v.container.querySelector('img')?.getAttribute('src')).toBe('raw-B');
  await act(async()=>pending.get('raw-B')!.resolve('blob:B'));expect(v.container.querySelector('img')?.getAttribute('src')).toBe('blob:B');
 });
 it('late superseded completion/rejection cannot replace the current raw or remove its body, and unmount ignores completion',async()=>{
  const v=render(<Owner figure="raw-A"/>);v.rerender(<Owner figure="raw-B"/>);await act(async()=>pending.get('raw-A')!.resolve('blob:late-A'));expect(v.container.querySelector('img')?.getAttribute('src')).toBe('raw-B');
  await act(async()=>pending.get('raw-B')!.reject(new Error('offline')));expect(v.container.querySelector('img')?.getAttribute('src')).toBe('raw-B');
  v.rerender(<Owner figure="raw-C"/>);v.unmount();const before=seen.length;await act(async()=>pending.get('raw-C')!.resolve('blob:late-unmounted'));expect(seen).toHaveLength(before);
 });
});
