import { cleanup,render,screen } from '@testing-library/react';
import { afterEach,expect,it,vi } from 'vitest';
import { WalkLayer } from './WalkLayer';
import { companionPost } from '../core/companionPost';
import { newGameState } from '../core/save';
import { visibleSpots } from './spotViews';
import type { IslandScene } from '../core/island';
afterEach(()=>{cleanup();vi.unstubAllEnvs();history.replaceState({},'','/');});
function show(scene:IslandScene,variant:string,flag='1'){
 vi.stubEnv('VITE_VISUAL_SAMPLE',flag);history.replaceState({},'','/?shoreVisual='+variant);const save=newGameState();const hint={level:0 as const,anchor:'driftwood' as const,wordId:null,pose:'idle' as const};
 render(<WalkLayer scene={scene} drank={false} spots={visibleSpots(scene,save,hint)} hint={hint} paused={true} purr={false} knot="rest" remembered={{x:.42,y:.62}} catPost={companionPost(scene,{})} onRemember={()=>{}} onExit={()=>{}} onInteract={()=>{}} onAsk={()=>{}} onEscape={()=>{}} />);
 return screen.getByTestId('traveler');
}
it('the shore routes the actual TravelerMark into optional contact cleanup',()=>{expect(show('dba.scene.shore','candidate').dataset.contactCleanup).toBe('yes');});
it('the old sample query cannot disable production contact cleanup',()=>{expect(show('dba.scene.shore','baseline').dataset.contactCleanup).toBe('yes');});
it('ordinary builds and other scenes receive the same contact cleanup',()=>{expect(show('dba.scene.shore','candidate','').dataset.contactCleanup).toBe('yes');cleanup();expect(show('dba.scene.camp','candidate').dataset.contactCleanup).toBe('yes');});
