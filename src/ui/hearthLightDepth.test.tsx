import {cleanup,render,screen} from '@testing-library/react';
import {afterEach,beforeEach,describe,expect,it,vi} from 'vitest';
import {readFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
vi.mock('./useAssetSrc',async()=>{const u=await import('../content/assetUrls');return {useAssetSrc:(id:string|null)=>({src:id?(u.travelerFrameUrl(id)||u.trajAssetUrl(id)||u.slotAssetUrl(id)||null):null,onError:()=>{}})};});
vi.mock('./firstScreenReady',()=>({useFirstScreenReady:()=>({status:'ready',done:1,total:1,retry:()=>{}})}));
const css=readFileSync('src/styles.css','utf8');
function rule(selector:string){const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');const block=css.match(new RegExp(escaped+'\\s*\\{([^}]+)\\}'));if(!block)throw new Error('Missing CSS '+selector);return block[0];}
function z(selector:string){const value=rule(selector).match(/z-index:\s*(-?\d+)/);if(!value)throw new Error('Missing z '+selector);return Number(value[1]);}
// Contract over actual DOM ancestry + declared CSS z values, not a pixel renderer.
function paintKey(el:HTMLElement):number[]{
 const unit=el.closest<HTMLElement>('.depth-unit');
 if(unit){const base=[z('.walk-viewport[data-ground-depth="world"] .ground-depth-root'),Number(unit.style.zIndex)];return el.matches('.depth-hearth-emitter')?[...base,z('.walk-viewport[data-ground-depth="world"] .depth-hearth-emitter')]:base;}
 if(el.matches('.path-exit'))return [z('.path-exit')];
 return [z(el.closest('.pass-near')?'.plate-stack.pass-near':'.plate-stack.pass-back')];
}
function compare(a:number[],b:number[]){for(let i=0;i<Math.max(a.length,b.length);i++){const d=(a[i]??0)-(b[i]??0);if(d)return d;}return 0;}
async function mount(variant:'candidate'|'legacy'|'baseline'|'camp',hy=.64){
 history.replaceState({},'','/?shoreVisual='+(variant==='baseline'?'baseline':'candidate')+(variant==='legacy'?'&fixture=depth-gourd-bf&freeze=1&depth=legacy':''));
 const {WalkLayer}=await import('./WalkLayer');const {visibleSpots}=await import('./spotViews');const {newGameState}=await import('../core/save');const {companionPost}=await import('../core/companionPost');const scene=variant==='camp'?'dba.scene.camp':'dba.scene.shore';const hint={level:0 as const,anchor:'gourd' as const,wordId:null,pose:'idle' as const};
 return render(<WalkLayer scene={scene} drank={false} spots={visibleSpots(scene,newGameState(),hint)} hint={hint} paused purr={false} knot="rest" remembered={{x:.33,y:hy}} catPost={companionPost(scene,{})} presentationFrozen taught onRemember={()=>{}} onExit={()=>{}} onInteract={()=>{}} onAsk={()=>{}} onEscape={()=>{}}/>);
}
beforeEach(()=>{vi.stubEnv('VITE_VISUAL_SAMPLE','1');vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));});
afterEach(()=>{cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();history.replaceState({},'','/');});
describe('candidate hearth pool retains legacy prop light ownership',()=>{
 for(const mode of ['legacy','candidate'] as const)for(const hy of [.64,.68,.72])it(`${mode} stone/cue .68 vs human ${hy}: near shields, equal/back receives`,async()=>{
  await mount(mode,hy);const stone=screen.getByTestId('prop-art.shore.prop.east-gap'),cue=screen.getByTestId('cue-art.shore.prop.east-gap');const emitter=document.querySelector<HTMLElement>('.depth-hearth-emitter')??screen.getByTestId('exit-camp');
  expect(compare(paintKey(stone),paintKey(emitter))>0).toBe(.68>hy);expect(compare(paintKey(cue),paintKey(emitter))>0).toBe(.68>hy);
 });
 it('moves only the decorative pool into existing full-world human unit; keeps seven real siblings and its gate coordinates',async()=>{
  await mount('candidate');const emitter=document.querySelector<HTMLElement>('.depth-hearth-emitter');expect(emitter).not.toBeNull();const button=screen.getByTestId('exit-camp');const humanUnit=screen.getByTestId('traveler').closest('.depth-unit')!;
  expect(emitter!.parentElement).toBe(humanUnit);expect(screen.getByTestId('sole-soft').parentElement).toBe(humanUnit);expect(humanUnit.parentElement!.children).toHaveLength(7);expect(emitter!.style.left).toBe(button.style.left);expect(emitter!.style.top).toBe(button.style.top);expect(emitter!.classList.contains('near')).toBe(button.classList.contains('near'));expect(emitter!.getAttribute('aria-hidden')).toBe('true');expect(emitter!.tagName).toBe('SPAN');expect(emitter!.querySelector('button')).toBeNull();expect(button.parentElement).toBe(document.querySelector('.world-layer'));expect(button.getAttribute('type')).toBe('button');expect(z('.walk-viewport[data-ground-depth="world"] .depth-hearth-emitter')).toBeGreaterThan(z('.walk-viewport[data-ground-depth="world"] .depth-unit > .sole-soft'));
 });
 it.each(['legacy','baseline','camp'] as const)('%s has no extra pool and keeps legacy root boundary',async mode=>{
  await mount(mode);expect(document.querySelector('.depth-hearth-emitter')).toBeNull();expect(document.querySelector('.ground-depth-root')).toBeNull();if(mode!=='camp')expect(screen.getByTestId('exit-camp').dataset.hearth).toBe('yes');
 });
 it('suppresses only the D1 direct button pseudo, never whole exit; existing gradient/blur/near/UI CSS stays byte-identical',()=>{
  expect(rule('.walk-viewport[data-ground-depth="world"] .world-layer > .path-exit[data-hearth="yes"]::before')).toMatch(/content:\s*none/);expect(rule('.walk-viewport[data-ground-depth="world"] .depth-hearth-emitter')).toMatch(/pointer-events:\s*none/);
  const selectors=['.path-exit','.path-exit i','.path-exit span','.path-exit[data-hearth="yes"]::before','.path-exit[data-hearth="yes"] i','.path-exit.near i','.path-exit[data-hearth="yes"].near::before','.path-exit[data-hearth="yes"].near i'];expect(createHash('sha256').update(selectors.map(rule).join('\n')).digest('hex')).toBe('c35557d53ec98c7edfaa0a4d13e07b5a5b041bc1b3fcf4d3130b0f4da9757deb');
 });
});
