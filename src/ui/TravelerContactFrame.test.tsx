import { act,cleanup,render } from '@testing-library/react';
import { afterEach,beforeEach,expect,it,vi } from 'vitest';
const transport=vi.hoisted(()=>({loaded:'asset:idle-front-01.png',punch:vi.fn((src:string)=>Promise.resolve('punched:'+src))}));
vi.mock('./hemPunch',()=>({punchHemUrl:transport.punch,wakeHemPunch:vi.fn(),travelerContactFile:()=>undefined}));
vi.mock('./travelerArt',()=>({frameUrl:(file:string)=>'asset:'+file,loadFrame:(file:string)=>Promise.resolve('asset:'+file),forgetFrame:vi.fn()}));
vi.mock('./useAssetSrc',()=>({useAssetSrc:()=>({src:transport.loaded,onError:vi.fn()})}));
import { TravelerMark } from './Traveler';
beforeEach(()=>{vi.stubEnv('MODE','production');transport.loaded='asset:idle-front-01.png';transport.punch.mockReset().mockImplementation((src:string)=>Promise.resolve('punched:'+src));});
afterEach(()=>{cleanup();vi.useRealTimers();vi.unstubAllEnvs();});
it('production FramePicture passes opt-in contact frame to the real punch boundary',async()=>{
 render(<TravelerMark x={.42} y={.62} facing="front" moving={false} presentationFrozen contactCleanup />);await act(async()=>{});
 expect(transport.punch).toHaveBeenCalledWith('asset:idle-front-01.png','idle-front-01.png');
});
it('never pairs a transient previous useAssetSrc URL with the next frame mask; lastReady remains',async()=>{
 const props={x:.42,y:.62,moving:false,presentationFrozen:true,contactCleanup:true};
 const view=render(<TravelerMark {...props} facing="front" />);await act(async()=>{});transport.punch.mockClear();
 view.rerender(<TravelerMark {...props} facing="back" />);await act(async()=>{});
 expect(transport.punch).not.toHaveBeenCalled();expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('punched:asset:idle-front-01.png');
 transport.loaded='asset:idle-back-01.png';view.rerender(<TravelerMark {...props} facing="back" />);await act(async()=>{});
 expect(transport.punch).toHaveBeenCalledWith('asset:idle-back-01.png','idle-back-01.png');
});

it('candidate first-frame processing catches rejection, waits5s, then becomes ready',async()=>{
 vi.useFakeTimers();transport.punch.mockRejectedValueOnce(new Error('transient canvas'));
 const view=render(<TravelerMark x={.42} y={.62} facing="front" moving={false} presentationFrozen contactCleanup />);await act(async()=>{});
 expect(transport.punch).toHaveBeenCalledTimes(1);await act(async()=>{await vi.advanceTimersByTimeAsync(4999);});expect(transport.punch).toHaveBeenCalledTimes(1);
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});expect(transport.punch).toHaveBeenCalledTimes(2);expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('punched:asset:idle-front-01.png');
});
it('at most four automatic retries, then a real online wake can retry; no timer storm',async()=>{
 vi.useFakeTimers();transport.punch.mockRejectedValue(new Error('transient canvas'));
 render(<TravelerMark x={.42} y={.62} facing="front" moving={false} presentationFrozen contactCleanup />);await act(async()=>{});
 await act(async()=>{await vi.advanceTimersByTimeAsync(120000);});expect(transport.punch).toHaveBeenCalledTimes(5);
 transport.punch.mockResolvedValue('punched:recovered');await act(async()=>{window.dispatchEvent(new Event('online'));});expect(transport.punch).toHaveBeenCalledTimes(6);
});
it('unmount cancels recovery timer and ignores a late successful processing bitmap',async()=>{
 vi.useFakeTimers();let finish!:(s:string)=>void;transport.punch.mockImplementationOnce(()=>new Promise<string>(r=>{finish=r;}));
 const view=render(<TravelerMark x={.42} y={.62} facing="front" moving={false} presentationFrozen contactCleanup />);await act(async()=>{});view.unmount();
 await act(async()=>{finish('punched:late');await vi.advanceTimersByTimeAsync(120000);window.dispatchEvent(new Event('online'));});expect(transport.punch).toHaveBeenCalledTimes(1);expect(view.container.childElementCount).toBe(0);
});
it('a failed next-frame processing retains lastReady until its bounded retry succeeds',async()=>{
 vi.useFakeTimers();const props={x:.42,y:.62,moving:false,presentationFrozen:true,contactCleanup:true};const view=render(<TravelerMark {...props} facing="front" />);await act(async()=>{});
 transport.punch.mockRejectedValueOnce(new Error('temporary canvas'));transport.loaded='asset:idle-back-01.png';view.rerender(<TravelerMark {...props} facing="back" />);await act(async()=>{});
 expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('punched:asset:idle-front-01.png');await act(async()=>{await vi.advanceTimersByTimeAsync(5000);});expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('punched:asset:idle-back-01.png');
});

it('production first decoded original stays visible during slow processing, then swaps only on success',async()=>{
 vi.useFakeTimers();let finish!:(s:string)=>void;transport.punch.mockImplementationOnce(()=>new Promise<string>(r=>{finish=r;}));
 const view=render(<TravelerMark x={.42} y={.62} facing="front" moving={false} presentationFrozen contactCleanup />);await act(async()=>{});
 const originalNode=view.container.querySelector('.traveler-figure');expect(originalNode?.getAttribute('src')).toBe('asset:idle-front-01.png');
 await act(async()=>{await vi.advanceTimersByTimeAsync(3000);});expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('asset:idle-front-01.png');
 await act(async()=>{finish('blob:cleaned-front');});expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('blob:cleaned-front');expect(view.container.querySelector('.traveler-figure')).toBe(originalNode);
});
it('production first processing rejection never removes the decoded original through retry and success',async()=>{
 vi.useFakeTimers();transport.punch.mockRejectedValueOnce(new Error('temporary processing'));
 const view=render(<TravelerMark x={.42} y={.62} facing="front" moving={false} presentationFrozen contactCleanup />);await act(async()=>{});
 expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('asset:idle-front-01.png');
 await act(async()=>{await vi.advanceTimersByTimeAsync(4999);});expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('asset:idle-front-01.png');
 await act(async()=>{await vi.advanceTimersByTimeAsync(1);});expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('punched:asset:idle-front-01.png');
});
it('a decoded raw fallback is itself retainable lastReady across frame/URL lag without applying the next mask',async()=>{
 let front!:(s:string)=>void,back!:(s:string)=>void;transport.punch.mockImplementationOnce(()=>new Promise<string>(r=>{front=r;})).mockImplementationOnce(()=>new Promise<string>(r=>{back=r;}));
 const props={x:.42,y:.62,moving:false,presentationFrozen:true,contactCleanup:true};const view=render(<TravelerMark {...props} facing="front" />);await act(async()=>{});
 expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('asset:idle-front-01.png');
 view.rerender(<TravelerMark {...props} facing="back" />);await act(async()=>{});expect(transport.punch).toHaveBeenCalledTimes(1);expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('asset:idle-front-01.png');
 transport.loaded='asset:idle-back-01.png';view.rerender(<TravelerMark {...props} facing="back" />);await act(async()=>{});expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('asset:idle-front-01.png');
 await act(async()=>{front('blob:obsolete-front');});expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('asset:idle-front-01.png');
 await act(async()=>{back('blob:cleaned-back');});expect(view.container.querySelector('.traveler-figure')?.getAttribute('src')).toBe('blob:cleaned-back');
});
it('ordinary baseline retains its existing processed-only presentation contract',async()=>{
 transport.punch.mockImplementationOnce(()=>new Promise<string>(()=>{}));const view=render(<TravelerMark x={.42} y={.62} facing="front" moving={false} presentationFrozen />);await act(async()=>{});expect(view.container.querySelector('.traveler-figure')).toBeNull();
});
