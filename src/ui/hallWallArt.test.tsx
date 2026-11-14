import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { readFileSync } from 'node:fs';
import { sceneAssembly } from '../content/catalog';
import { slotAssetUrl } from '../content/assetUrls';
import { sceneSlotSchema } from '../core/schema';
import { newGameState } from '../core/save';
import { hintPresentation } from '../core/hints';
import { companionPost } from '../core/companionPost';
import { visibleSpots } from './spotViews';
import { drawsInFront, groundDepthSlots, PlateStack, type PlatePass } from './Plate';
import { WalkLayer } from './WalkLayer';
const scene='dba.scene.hall' as const;
const id='art.hall.prop.wrist-knot';
const slot=()=>sceneAssembly(scene)!.slots.find(s=>s.id===id)!;
const passes:PlatePass[]=['back','near','fg'];
const flush=()=>act(async()=>{for(let n=0;n<24;n++)await Promise.resolve();});
let css:HTMLStyleElement;
beforeEach(()=>{window.history.replaceState(null,'','/?loadtrace=1');css=document.createElement('style');css.textContent=readFileSync('src/styles.css','utf8');document.head.append(css);});
afterEach(()=>{cleanup();css.remove();});
function layered(y:number){return <>{passes.map(pass=><PlateStack key={pass} plate={scene} previous={null} pass={pass} feetY={y}/>)}</>;}
function game(learned:boolean,y=.64,onInteract=(id:string)=>{void id;},x=.5){
 const save=newGameState();if(learned)save.words['dba.word.betray'].state='learned';const hint=hintPresentation(save);
 return <WalkLayer scene={scene} drank={false} spots={visibleSpots(scene,save,hint)} hint={hint} paused={false} purr={false} knot="rest" remembered={{x,y}} catPost={companionPost(scene,{})} onRemember={()=>{}} onExit={()=>{}} onInteract={onInteract} onAsk={()=>{}} onEscape={()=>{}}/>;
}
describe('hall wrist mural is wall art, not an occluding grounded hand',()=>{
 it.each([.42,.439999,.44,.440001,.64])('renders one actual wrist bitmap in back at feetY=%s',y=>{
  const v=render(layered(y));const nodes=v.container.querySelectorAll(`[data-art-id="${id}"]`);
  expect(nodes).toHaveLength(1);const node=nodes[0] as HTMLElement;
  expect(node.closest('.plate-stack')?.className).toContain('pass-back');
  expect(node.querySelector('img')?.getAttribute('src')).toBe(slotAssetUrl(slot().asset!));
  expect(slot()).toMatchObject({slot:'props',x:.38,y:.44,w:.035,h:.06,parallax:1,spot:'hall-tattoo'});
  expect(node.style.left).toBe('38%');expect(node.style.top).toBe('44%');expect(node.style.width).toBe('3.5000000000000004%');expect(node.style.height).toBe('6%');
 });
 it('live Hall paints the token in the unified environment below the traveler',async()=>{
  const v=render(game(true));await flush();const art=v.getByTestId(`prop-${id}`);const traveler=v.getByTestId('traveler');
  const plate=art.closest('.plate-stack')!;
  expect(plate.parentElement).toBe(traveler.closest('.ground-depth-root')!.parentElement);
  expect(art.querySelector('img')).toBeNull();
  expect(v.getByTestId('painted-environment').getAttribute('src')).toBe(slotAssetUrl('art.hall.landscape'));
  expect(art.getAttribute('data-placeholder')).toBe('painted');
  expect(Number(getComputedStyle(plate).zIndex)).toBeLessThan(Number(getComputedStyle(traveler.closest('.ground-depth-root')!).zIndex));
  expect(v.container.querySelector(`.pass-near [data-art-id="${id}"]`)).toBeNull();
 });
 it('keeps learned-betray hidden gate and the real hotspot click and E action',async()=>{
  const hidden=render(game(false));await flush();expect(hidden.container.querySelector(`[data-art-id="${id}"]`)).toBeNull();expect(hidden.queryByTestId('hall-tattoo')).toBeNull();hidden.unmount();
  const heard=vi.fn();const v=render(game(true,.44,heard,.4));await flush();const hot=v.getByTestId('hall-tattoo');
  expect(hot.style.left).toBe('39.2%');expect(hot.style.top).toBe('56.00000000000001%');
  expect(v.getByTestId(`prop-${id}`).getAttribute('data-placeholder')).toBe('painted');
  fireEvent.click(hot);expect(heard).toHaveBeenLastCalledWith('hall-tattoo');
  fireEvent.keyDown(window,{key:'e'});expect(heard).toHaveBeenCalledTimes(2);
 });
 it('persists explicit wall-art semantics through schema and excludes it from ground-depth sorting',()=>{
  expect(sceneSlotSchema.parse(slot())).toMatchObject({depthMode:'wall-art'});
  expect(groundDepthSlots(scene).some(s=>s.id===id)).toBe(false);
  const explicit=sceneSlotSchema.parse({...slot(),id:'unrelated-wall-art',kind:'other-detail',depthMode:'wall-art'});
  expect(drawsInFront(explicit,0)).toBe(false);
 });
 it('retains strict greater-than sorting for every other normal prop',()=>{
  for(const name of ['shore','camp','yard','hall','path','night']){
   const kit=sceneAssembly(`dba.scene.${name}`)!;
   for(const s of kit.slots.filter(s=>s.slot==='props' && s.depthMode!=='wall-art' && s.y!==undefined)){
    expect(drawsInFront(s,s.y!-1e-6),s.id).toBe(true);
    expect(drawsInFront(s,s.y!),s.id).toBe(false);expect(drawsInFront(s,s.y!+1e-6),s.id).toBe(false);
   }
  }
 });
});
