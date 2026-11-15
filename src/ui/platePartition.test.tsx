import { cleanup, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { sceneAssembly } from '../content/catalog';
import { slotAssetUrl } from '../content/assetUrls';
import { newGameState } from '../core/save';
import { hintPresentation } from '../core/hints';
import type { IslandScene } from '../core/island';
import { visibleSpots } from './spotViews';
import { PlateStack, type PlatePass } from './Plate';

const SCENES = ['shore','camp','yard','hall','path','night'].map(name=>`dba.scene.${name}` as IslandScene);
const PASSES: PlatePass[] = ['back','near','fg'];
function Stack({scene,y,active=null}:{scene:IslandScene;y:number;active:string[]|null}) {
 return <>{PASSES.map(pass=><PlateStack key={pass} plate={scene} previous={null} pass={pass} feetY={y} activeSpots={active}/>)}</>;
}
function hosts(root:HTMLElement,id:string) {return root.querySelectorAll<HTMLElement>(`[data-art-id="${id}"]`);}
beforeEach(()=>window.history.replaceState(null,'','/?loadtrace=1'));
afterEach(cleanup);

describe('actual PlateStack complete and exclusive scene partitions',()=>{
 it('assigns all 62 declared slots to exactly one pass at every authored foot boundary',()=>{
  const all=SCENES.flatMap(scene=>sceneAssembly(scene)!.slots);
  const values=[...new Set([0,.5,.95,1,...all.flatMap(slot=>slot.y===undefined?[]:[slot.y-1e-6,slot.y,slot.y+1e-6])])].sort((a,b)=>a-b);
  expect(all).toHaveLength(62);expect(new Set(all.map(slot=>slot.id)).size).toBe(all.length);expect(values.length).toBeGreaterThan(50);
  let contracts=0;
  for(const scene of SCENES){
   const view=render(<Stack scene={scene} y={values[0]} active={null}/>);
   for(const y of values){
    view.rerender(<Stack scene={scene} y={y} active={null}/>);
    for(const slot of sceneAssembly(scene)!.slots){
     const nodes=hosts(view.container,slot.id);
     expect(nodes,`${scene}/${slot.id} at feetY=${y}`).toHaveLength(1);
     if(slot.asset)expect(nodes[0].querySelector('img')?.getAttribute('src')).toBe(slotAssetUrl(slot.asset));
     contracts++;
    }
   }
   view.unmount();
  }
  expect(contracts).toBe(all.length * values.length);
 });

 it('does not mount the retired foreground curtain over the night scene',()=>{
  const view=render(<Stack scene="dba.scene.night" y={.74} active={null}/>);
  const node=hosts(view.container,'art.night.fg')[0];expect(node).toBeTruthy();expect(node.querySelector('img')).toBeNull();
 });
 it.each([-1e-6,0,1e-6])('keeps the retired doorway slot behind actors at delta=%s',delta=>{
  const slot=sceneAssembly('dba.scene.camp')!.slots.find(s=>s.id==='art.camp.prop.north-curtain')!;
  const view=render(<Stack scene="dba.scene.camp" y={slot.y!+delta} active={null}/>);
  expect(hosts(view.container,slot.id)[0].closest('.plate-stack')?.className).toContain('pass-back');
 });

 it('keeps every ordinary fg in fg at all configured foot boundaries',()=>{
  for(const scene of SCENES){const slots=sceneAssembly(scene)!.slots.filter(s=>s.slot==='fg'&&!['curtain','north-curtain'].includes(s.kind));
   for(const y of [0,.7,1]){const view=render(<Stack scene={scene} y={y} active={null}/>);
    for(const slot of slots){const nodes=hosts(view.container,slot.id);expect(nodes).toHaveLength(1);expect(nodes[0].closest('.plate-stack')?.className).toContain('pass-fg');}
    view.unmount();
   }
  }
 });

 it.each(['hall','night'])('preserves real stage-hidden props in %s',name=>{
  const scene=`dba.scene.${name}` as IslandScene;const save=newGameState();const target=name==='hall'?'hall-tattoo':'night-memory';
  const slot=sceneAssembly(scene)!.slots.find(s=>s.spot===target)!;
  const active=()=>visibleSpots(scene,save,hintPresentation(save)).map(s=>s.id);
  const view=render(<Stack scene={scene} y={.74} active={active()}/>);expect(hosts(view.container,slot.id)).toHaveLength(0);
  if(name==='hall')save.words['dba.word.betray'].state='learned';else save.memories.push('dba.mem.rain-night');
  view.unmount();
  const visible=render(<Stack scene={scene} y={.74} active={active()}/>);expect(hosts(visible.container,slot.id)).toHaveLength(1);
 });
});
