import { cleanup, render } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { WalkLayer } from './WalkLayer';
import { newGameState } from '../core/save';
import { companionPost } from '../core/companionPost';
import { hintPresentation } from '../core/hints';
import { visibleSpots } from './spotViews';
afterEach(()=>{cleanup();vi.restoreAllMocks();});
it('repeated frozen render mounts remove the exact blur listener each time',()=>{
 const add=vi.spyOn(window,'addEventListener');const remove=vi.spyOn(window,'removeEventListener');const scene='dba.scene.shore';const save=newGameState();const hint=hintPresentation(save);const noop=()=>{};
 for(let i=0;i<3;i++){const view=render(<WalkLayer scene={scene} drank={false} spots={visibleSpots(scene,save,hint)} hint={hint} paused purr={false} knot="rest" presentationFrozen remembered={null} catPost={companionPost(scene,{})} onRemember={noop} onExit={noop} onInteract={noop} onAsk={noop} onEscape={noop}/>);view.unmount();}
 const installed=add.mock.calls.filter(([type])=>type==='blur');expect(installed).toHaveLength(3);for(const [,fn]of installed)expect(remove.mock.calls.some(([type,cb])=>type==='blur'&&cb===fn)).toBe(true);
});
