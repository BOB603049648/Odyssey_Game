vi.mock('./firstScreenReady',()=>({useFirstScreenReady:()=>({status:'ready',done:1,total:1,retry:()=>{}})}));
import { readFileSync } from 'node:fs';
import { act, cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { WalkLayer } from './WalkLayer';
import { visibleSpots } from './spotViews';
import { companionPost } from '../core/companionPost';
import { newGameState } from '../core/save';
import { WORLD_SCALE } from '../core/walk';

// Synthetic measured DOMRects: jsdom has no layout. These are NOT browser screenshots.
let viewport = { x:0, y:0, width:390, height:844 };
let stick = { x:14, y:716, width:112, height:112 };
let center = { x:180, y:460 };
let targetWidth = 160;
let observerCallbacks: Array<() => void> = [];
const disconnects: ReturnType<typeof vi.fn>[] = [];
const css = readFileSync('src/styles.css','utf8');
function state(el: HTMLElement) { return el.closest<HTMLElement>('.scene-slot')?.dataset.cue ?? 'far'; }
function rect(x:number,y:number,width:number,height:number) { return new DOMRect(x,y,width,height); }
const hint = { level:0 as const, anchor:'driftwood' as const, wordId:null, pose:'idle' as const };
function mount(scene = 'dba.scene.shore' as const) {
 const save = newGameState(); const interact = vi.fn(); const remember = vi.fn();
 const props = { scene, drank:false, spots:visibleSpots(scene,save,hint), hint, paused:false, purr:false, knot:'rest' as const,
  remembered:{x:.33,y:.72}, catPost:companionPost(scene,{}), taught:true,
  onRemember:remember, onExit:vi.fn(), onInteract:interact, onAsk:vi.fn(), onEscape:vi.fn() };
 const view = render(<WalkLayer {...props}/>);
 return { ...view, interact, props };
}
function cues() { return [...document.querySelectorAll<HTMLElement>('[data-shore-visual="candidate"] .prop-cue')]; }
function cue() { return screen.getByTestId('cue-art.shore.prop.driftwood'); }
function refresh() { act(() => { window.dispatchEvent(new Event('resize')); }); }

beforeEach(() => {
 viewport={x:0,y:0,width:390,height:844};stick={x:14,y:716,width:112,height:112};center={x:180,y:460};targetWidth=160;
 observerCallbacks=[];disconnects.length=0;
 vi.stubEnv('VITE_VISUAL_SAMPLE','1');history.replaceState({},'', '/?shoreVisual=candidate');
 vi.stubGlobal('ResizeObserver',class { cb:()=>void; disconnect=vi.fn(); observe=vi.fn();
  constructor(cb:()=>void) { this.cb=cb;observerCallbacks.push(cb);disconnects.push(this.disconnect); }
 });
 vi.spyOn(HTMLElement.prototype,'getBoundingClientRect').mockImplementation(function(this:HTMLElement) {
  if(this.classList.contains('walk-viewport')) return rect(viewport.x,viewport.y,viewport.width,viewport.height);
  if(this.classList.contains('walk-stick')) return rect(stick.x,stick.y,stick.width,stick.height);
  if(this.classList.contains('scene-slot')) return rect(center.x-targetWidth/2,center.y-60,targetWidth,80);
  if(this.classList.contains('prop-cue')) {
   const s=state(this);const scale=Number(this.style.getPropertyValue('--cue-scale')||1);
   const w=({far:52,glance:64,near:72}[s]??52)*scale;
   const h=(s==='far'?16:18)*scale;
   return rect(center.x-w/2,center.y-h/2,w,h);
  }
  return rect(0,0,0,0);
 });
});
afterEach(() => { cleanup();vi.restoreAllMocks();vi.unstubAllGlobals();vi.unstubAllEnvs();history.replaceState({},'','/'); });

describe('candidate shore cue viewport presentation', () => {
 it.each([[390,844],[844,390]])('bounds all rings at measured %ix%i without moving centers or hitboxes', (w,h) => {
  viewport.width=w;viewport.height=h;stick={x:14,y:h-128,width:112,height:112};mount();
  expect(screen.getByTestId('walk-stage').dataset.cuePresentation).toBe('viewport');
  expect(cues().length).toBeGreaterThan(2);
  for(const el of cues()) {
   const fraction=({far:.06,glance:.07,near:.08}[state(el)]??.06);
   const scale=Number(el.style.getPropertyValue('--cue-scale'));
   expect(scale).toBeGreaterThan(0);expect(scale).toBeLessThan(1);
   const b=el.getBoundingClientRect();expect(b.width).toBeLessThanOrEqual(Math.min(w,h)*fraction+1e-7);
   expect(b.x+b.width/2).toBe(center.x);expect(b.y+b.height/2).toBe(center.y);
   expect(el.parentElement?.classList.contains('scene-slot')).toBe(true);
  }
  const button=screen.getByTestId('shore-driftwood');const slot=screen.getByTestId('prop-art.shore.prop.driftwood');
  const old={button:button.getAttribute('style'),slot:slot.getAttribute('style'),world:document.querySelector('.world-layer')?.getAttribute('style')};
  refresh();expect({button:button.getAttribute('style'),slot:slot.getAttribute('style'),world:document.querySelector('.world-layer')?.getAttribute('style')}).toEqual(old);
  expect(WORLD_SCALE).toBe(1.15);
 });
 it('keeps desktop sizes unchanged and ignores a zero-size hidden stick', () => {
  viewport={x:0,y:0,width:1920,height:1072};stick={x:0,y:0,width:0,height:0};mount();
  for(const el of cues()) { expect(el.style.getPropertyValue('--cue-scale')).toBe('1');expect(el.dataset.cueObscured).toBe('no'); }
 });
 it('caps against actual target width rather than expanding or shrinking the entity', () => {
  targetWidth=20;mount();expect(cue().getBoundingClientRect().width).toBeCloseTo(15,8);
  expect(screen.getByTestId('prop-art.shore.prop.driftwood').getBoundingClientRect().width).toBe(20);
 });
 it('uses the actual relocated joystick rectangle plus 8px, retaining the anchored marker', () => {
  viewport={x:40,y:80,width:844,height:390};stick={x:500,y:300,width:112,height:112};center={x:622,y:320};mount();
  expect(cue().dataset.cueObscured).toBe('yes');
  expect(cue().isConnected).toBe(true);expect(cue().getAttribute('aria-hidden')).not.toBe('false');
  expect(cue().parentElement?.getAttribute('aria-hidden')).not.toBe('false');
  const b=cue().getBoundingClientRect();expect(b.x+b.width/2).toBe(622);
  stick={...stick,x:14,y:600};refresh();expect(cue().dataset.cueObscured).toBe('no');
 });
 it('does not repeatedly shrink after resize, and updates orientation via observer', () => {
  const view=mount();const first=cue().style.getPropertyValue('--cue-scale');
  refresh();refresh();expect(cue().style.getPropertyValue('--cue-scale')).toBe(first);
  viewport={x:0,y:0,width:1920,height:1072};stick={x:0,y:0,width:0,height:0};
  act(() => { observerCallbacks.forEach(cb=>cb()); });expect(cue().style.getPropertyValue('--cue-scale')).toBe('1');
  const element=cue();view.unmount();expect(element.style.getPropertyValue('--cue-scale')).toBe('');
  expect(disconnects.some(d=>d.mock.calls.length>0)).toBe(true);refresh();
 });
 it('keeps production cues under old sample queries and cleans up on other scenes', () => {
  const view=mount();expect(cue().style.getPropertyValue('--cue-scale')).not.toBe('');
  history.replaceState({},'','/?shoreVisual=baseline');view.rerender(<WalkLayer {...view.props}/>);
  expect(screen.getByTestId('walk-stage').dataset.cuePresentation).toBe('viewport');
  expect(cue().style.getPropertyValue('--cue-scale')).not.toBe('');view.unmount();
  history.replaceState({},'','/?shoreVisual=candidate');const save=newGameState();
  render(<WalkLayer {...view.props} scene="dba.scene.camp" spots={visibleSpots('dba.scene.camp',save,hint)} catPost={companionPost('dba.scene.camp',{})}/>);
  expect(screen.getByTestId('walk-stage').dataset.cuePresentation).toBeUndefined();
 });
 it('retains original named focusable button, keyboard E and click route even when ring overlaps', () => {
  stick={x:14,y:262,width:112,height:112};center={x:108,y:280};const {interact}=mount();
  expect(cue().dataset.cueObscured).toBe('yes');const b=screen.getByTestId('shore-driftwood');
  expect(b.tagName).toBe('BUTTON');const name=b.getAttribute('aria-label')||b.textContent;
  expect(name?.trim()).toBeTruthy();expect(screen.getByRole('button',{name:name!})).toBe(b);expect(b.hasAttribute('disabled')).toBe(false);
  act(()=>b.focus());expect(document.activeElement).toBe(b);
  fireEvent.keyDown(window,{key:'e',code:'KeyE'});expect(interact).toHaveBeenCalledWith('shore-driftwood');interact.mockClear();
  fireEvent.click(b);expect(interact).toHaveBeenCalledWith('shore-driftwood');
 });
 it('remeasures after real keyboard movement changes the camera/foot revision', () => {
  stick={x:14,y:262,width:112,height:112};mount();expect(cue().dataset.cueObscured).toBe('no');
  const oldY=screen.getByTestId('traveler').dataset.y;center={x:108,y:280};
  fireEvent.keyDown(window,{key:'w',code:'KeyW'});
  expect(screen.getByTestId('traveler').dataset.y).not.toBe(oldY);
  expect(cue().dataset.cueObscured).toBe('yes');
 });
 it('ordinary builds also retain accessible viewport-sized cues', () => {
  vi.stubEnv('VITE_VISUAL_SAMPLE','');vi.stubEnv('VITE_SHORE_DEPLOY_ORIGIN','');mount();
  expect(cue().style.getPropertyValue('--cue-scale')).not.toBe('');expect(screen.getByTestId('walk-stage').dataset.cuePresentation).toBe('viewport');
 });
 it('CSS changes only decoration and outline, keeps reduced-motion, and does not hide all cues', () => {
  const rules=css.slice(css.indexOf('/* Candidate-only viewport cue presentation.'),css.indexOf('/* Production stage:'));
  expect(rules).toContain('scale(var(--cue-scale, 1))');expect(rules).toContain('[data-cue-obscured="yes"]::after');
  expect(rules).toMatch(/width:\s*calc\(4px \/ var\(--cue-scale, 1\)\)/);
  expect(rules).toMatch(/:focus-visible\s*\{[^}]*outline:\s*2px/s);
  expect(rules).not.toMatch(/(?:display:\s*none|visibility:\s*hidden|min-width|touch-action|z-index)/);
  const reduced=css.slice(css.lastIndexOf('@media (prefers-reduced-motion: reduce)'));
  expect(reduced).toContain('[data-shore-visual="candidate"] .scene-slot.lit > .prop-cue');expect(reduced).toMatch(/animation:\s*none/);
  expect(css).toMatch(/\.prop-cue\s*\{[^}]*pointer-events:\s*none/s);
 });
});
