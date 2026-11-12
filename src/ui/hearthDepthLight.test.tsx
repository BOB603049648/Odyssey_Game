import { cleanup,render,screen } from '@testing-library/react';
import { afterEach,beforeEach,describe,expect,it,vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { createHash } from 'node:crypto';
vi.mock('./useAssetSrc',async()=>{const u=await import('../content/assetUrls');return {useAssetSrc:(id:string|null)=>({src:id?(u.travelerFrameUrl(id)||u.trajAssetUrl(id)||u.slotAssetUrl(id)||null):null,onError:()=>{}})};});
vi.mock('./firstScreenReady',()=>({useFirstScreenReady:()=>({status:'ready',done:1,total:1,retry:()=>{}})}));
const css=readFileSync('src/styles.css','utf8');
function block(selector:string) {
 const escaped=selector.replace(/[.*+?^${}()|[\]\\]/g,'\\$&');
 const match=css.match(new RegExp(escaped+'\\s*\\{([^}]+)\\}'));
 if(!match)throw new Error('Missing CSS rule: '+selector);
 return match[0];
}
function z(selector:string) {const m=block(selector).match(/z-index:\s*(-?\d+)/);if(!m)throw new Error('Missing z-index: '+selector);return Number(m[1]);}
// CSS-derived relevant stacking ancestors, NOT a browser compositor/pixel test.
// At this world-layer boundary, root/pass z wins before any local rank.
function paintKey(node:HTMLElement):number[] {
 const unit=node.closest<HTMLElement>('[data-depth-id]');
 if(unit)return [z('.walk-viewport[data-ground-depth="world"] .ground-depth-root'),Number(unit.style.zIndex),...(node.matches('.depth-hearth-emitter')?[z('.walk-viewport[data-ground-depth="world"] .depth-hearth-emitter')]:[])];
 if(node.closest('.pass-near'))return [z('.plate-stack.pass-near')];
 if(node.closest('.pass-back'))return [z('.plate-stack.pass-back')];
 if(node.matches('.path-exit'))return [z('.path-exit')];
 throw new Error('Unexpected real DOM paint path');
}
function compare(a:HTMLElement,b:HTMLElement) {const x=paintKey(a),y=paintKey(b);for(let i=0;i<Math.max(x.length,y.length);i++){const d=(x[i]??0)-(y[i]??0);if(d)return d;}return 0;}
async function mount(hy=.64,mode:'candidate'|'legacy'|'baseline'|'camp'='candidate',paused=true,x=.33) {
 history.replaceState({},'','/?shoreVisual='+(mode==='baseline'?'baseline':'candidate')+(mode==='legacy'?'&fixture=shore-spawn&freeze=1&depth=legacy':''));
 const {WalkLayer}=await import('./WalkLayer');const {visibleSpots}=await import('./spotViews');const {newGameState}=await import('../core/save');const {companionPost}=await import('../core/companionPost');
 const scene=mode==='camp'?'dba.scene.camp':'dba.scene.shore';const hint={level:0 as const,anchor:'driftwood' as const,wordId:null,pose:'idle' as const};
 render(<WalkLayer scene={scene} drank={false} spots={visibleSpots(scene,newGameState(),hint)} hint={hint} paused={paused} purr={false} knot="rest" remembered={{x,y:hy}} catPost={companionPost(scene,{})} taught presentationFrozen onRemember={()=>{}} onExit={()=>{}} onInteract={()=>{}} onAsk={()=>{}} onEscape={()=>{}}/>);
}
beforeEach(()=>{vi.stubEnv('VITE_VISUAL_SAMPLE','1');vi.stubGlobal('fetch',vi.fn(()=>new Promise(()=>{})));});
afterEach(()=>{cleanup();vi.unstubAllGlobals();vi.unstubAllEnvs();history.replaceState({},'','/');});
describe('shore hearth pool keeps old prop-light ownership inside true D1 depth',()=>{
 for(const mode of ['legacy','candidate'] as const)for(const hy of [.64,.68,.72])it(`${mode} stone .68 vs human ${hy}: near shields pool, equality/back remains lit`,async()=>{
  await mount(hy,mode);const stone=screen.getByTestId('prop-art.shore.prop.east-gap');const cue=screen.getByTestId('cue-art.shore.prop.east-gap');const pool=document.querySelector<HTMLElement>('.depth-hearth-emitter')??screen.getByTestId('exit-camp');
  expect(compare(stone,pool)>0,JSON.stringify({stone:paintKey(stone),pool:paintKey(pool)})).toBe(.68>hy);expect(compare(cue,pool)>0).toBe(.68>hy);
 });
 it('keeps emitter at same gate anchor and near state, with exactly one unchanged interactive exit',async()=>{
  await mount(.72);const button=screen.getByTestId('exit-camp');const pool=document.querySelector<HTMLElement>('.depth-hearth-emitter');expect(pool).not.toBeNull();
  expect(pool!.style.left).toBe(button.style.left);expect(pool!.style.top).toBe(button.style.top);expect(pool!.classList.contains('near')).toBe(button.classList.contains('near'));expect(pool!.getAttribute('aria-hidden')).toBe('true');expect(screen.queryByTestId('hearth-name')).toBeNull();expect(pool!.tagName).toBe('SPAN');expect(pool!.tabIndex).toBe(-1);
  expect(screen.getAllByTestId('exit-camp')).toHaveLength(1);expect(button.tagName).toBe('BUTTON');expect(button.parentElement!.classList.contains('world-layer')).toBe(true);expect(button.getAttribute('aria-label')).toBeTruthy();
  const unit=pool!.closest('[data-depth-id]');expect(unit).toBe(screen.getByTestId('traveler').closest('[data-depth-id]'));expect(screen.getByTestId('sole-soft').parentElement).toBe(unit);expect(unit!.parentElement!.children).toHaveLength(7);
  expect(z('.walk-viewport[data-ground-depth="world"] .depth-hearth-emitter')).toBeGreaterThan(z('.walk-viewport[data-ground-depth="world"] .depth-unit > .sole-soft'));
 });
 it('near naming remains separate: entering the existing gate radius enables near light and name together',async()=>{
  const {gatesFrom}=await import('../core/stage');const {pathExitPoint}=await import('../core/walk');const gate=gatesFrom('dba.scene.shore').find(g=>g.to==='dba.scene.camp')!;const at=pathExitPoint(gate);await mount(at.y,'candidate',true,at.x);
  const pool=document.querySelector<HTMLElement>('.depth-hearth-emitter');expect(pool).not.toBeNull();expect(pool!.classList.contains('near')).toBe(true);expect(screen.getByTestId('exit-camp').classList.contains('near')).toBe(true);expect(screen.getByTestId('hearth-name')).toBeTruthy();
 });
 it.each(['legacy','baseline','camp'] as const)('does not add a candidate light or new root in %s',async mode=>{
  await mount(.64,mode);expect(document.querySelector('.depth-hearth-emitter')).toBeNull();expect(document.querySelector('.ground-depth-root')).toBeNull();
 });
 it('suppresses only candidate direct-button pool; warm field CSS/colors and hit geometry stay byte-identical',()=>{
  expect(block('.walk-viewport[data-ground-depth="world"] .world-layer > .path-exit[data-hearth="yes"]::before')).toMatch(/content:\s*none/);
  expect(block('.walk-viewport[data-ground-depth="world"] .depth-hearth-emitter')).toMatch(/pointer-events:\s*none/);
  const selectors=['.path-exit','.path-exit i','.path-exit span','.path-exit[data-hearth="yes"]::before','.path-exit[data-hearth="yes"] i','.path-exit.near i','.path-exit[data-hearth="yes"].near::before','.path-exit[data-hearth="yes"].near i'];
  expect(createHash('sha256').update(selectors.map(block).join('\n')).digest('hex')).toBe('c35557d53ec98c7edfaa0a4d13e07b5a5b041bc1b3fcf4d3130b0f4da9757deb');
 });
});
