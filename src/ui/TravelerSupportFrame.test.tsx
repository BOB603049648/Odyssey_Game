import{act,cleanup,render}from'@testing-library/react';
import{afterEach,beforeEach,expect,it,vi}from'vitest';
import{travelerFrameUrl}from'../content/assetUrls';
const state=vi.hoisted(()=>({loaded:null as string|null,files:new Map<string,string>(),punch:vi.fn<(src:string,file?:string)=>Promise<string>>()}));
vi.mock('./hemPunch',()=>({punchHemUrl:state.punch,wakeHemPunch:vi.fn(),travelerContactFile:(src:string)=>state.files.get(src)}));
vi.mock('./travelerArt',async()=>{const u=await vi.importActual<typeof import('../content/assetUrls')>('../content/assetUrls');return{frameUrl:(f:string)=>u.travelerFrameUrl(f),loadFrame:(f:string)=>Promise.resolve(u.travelerFrameUrl(f)),forgetFrame:vi.fn()};});
vi.mock('./useAssetSrc',()=>({useAssetSrc:()=>({src:state.loaded,onError:vi.fn()})}));
import{TravelerMark}from'./Traveler';
beforeEach(()=>{vi.stubEnv('MODE','production');state.loaded=travelerFrameUrl('idle-front-01.png')!;state.files.clear();state.punch.mockReset().mockImplementation(async(_src,file)=>{const b='blob:unit-'+file;state.files.set(b,file!);return b;});});
afterEach(()=>{cleanup();vi.unstubAllEnvs();});
const props={x:.42,y:.62,moving:false,presentationFrozen:true,contactCleanup:true};
const wrap=(c:HTMLElement)=>c.querySelector('.traveler-frame-wrap:not(.out)')as HTMLElement;
it('production raw and cleaned bitmap use identical support and unchanged world root/size',async()=>{
 let finish!:(s:string)=>void;state.punch.mockImplementationOnce(()=>new Promise<string>(r=>{finish=r;}));const v=render(<TravelerMark {...props} facing="front"/>);await act(async()=>{});
 expect(wrap(v.container).dataset.supportFrame).toBe('idle-front-01.png');expect(wrap(v.container).dataset.supportY).toBe('1086');const t=wrap(v.container).style.transform;expect(t).toContain('translate(');
 const root=v.container.querySelector('[data-testid="traveler"]')as HTMLElement;expect(parseFloat(root.style.height)).toBeCloseTo(13.6);expect(root.dataset.x).toBe('0.42');expect(root.style.getPropertyValue('--sole-y')).toBe(`${1151/1152*100}%`);
 await act(async()=>{state.files.set('blob:unit-front','idle-front-01.png');finish('blob:unit-front');});expect(wrap(v.container).style.transform).toBe(t);
});
it('held bitmap keeps its own support while desired frame/source changes',async()=>{
 state.punch.mockImplementation(()=>new Promise<string>(()=>{}));const v=render(<TravelerMark {...props} facing="front"/>);await act(async()=>{});const t=wrap(v.container).style.transform;
 v.rerender(<TravelerMark {...props} facing="back"/>);await act(async()=>{});expect(wrap(v.container).dataset.supportFrame).toBe('idle-front-01.png');expect(wrap(v.container).style.transform).toBe(t);
 state.loaded=travelerFrameUrl('idle-back-01.png')!;v.rerender(<TravelerMark {...props} facing="back"/>);await act(async()=>{});expect(wrap(v.container).dataset.supportFrame).toBe('idle-front-01.png');
});
it('left side mirrors actual support rather than guessing a shared pivot',async()=>{
 state.loaded=travelerFrameUrl('idle-side-01.png')!;state.punch.mockImplementation(()=>new Promise<string>(()=>{}));const v=render(<TravelerMark {...props} facing="left"/>);await act(async()=>{});expect(wrap(v.container).dataset.supportFrame).toBe('idle-side-01.png');expect(wrap(v.container).style.transform).toContain('scaleX(-1)');
});

it('spawn real1086 shoe edge has zero vertical residual while horizontal body axis stays unchanged',async()=>{
 state.punch.mockImplementation(()=>new Promise<string>(()=>{}));const v=render(<TravelerMark {...props} facing="front"/>);await act(async()=>{});
 const m=wrap(v.container).style.transform.match(/translate\(([-\d.]+)%, ([-\d.]+)%\)/);const dx=m?Number(m[1])/100:0,dy=m?Number(m[2])/100:0,h=1072*.136*1.46*.981,w=h*.75;
 expect((1086/1152+dy-1151/1152)*h).toBeCloseTo(0,7);expect(dx,'preserve the existing horizontal body registration').toBe(0);expect(w).toBeGreaterThan(0);
});
it('outgoing and current hold their own bitmap support during a real facing crossfade',async()=>{
 vi.stubGlobal('requestAnimationFrame',()=>0);vi.stubGlobal('cancelAnimationFrame',()=>{});
 try{const v=render(<TravelerMark {...props} presentationFrozen={false} facing="front"/>);await act(async()=>{});
 v.rerender(<TravelerMark {...props} presentationFrozen={false} facing="back"/>);await act(async()=>{});
 state.loaded=travelerFrameUrl('idle-back-01.png')!;v.rerender(<TravelerMark {...props} presentationFrozen={false} facing="back"/>);await act(async()=>{});
 expect(v.container.querySelector('.traveler-frame-wrap.out')?.getAttribute('data-support-frame')).toBe('idle-front-01.png');expect(wrap(v.container).dataset.supportFrame).toBe('idle-back-01.png');
 }finally{vi.unstubAllGlobals();}
});
