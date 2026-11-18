import {useReducer} from 'react';
import {cleanup,fireEvent,render,screen} from '@testing-library/react';
import {afterEach,expect,it} from 'vitest';
import {NpcDialogue,NpcNotes} from './NpcDialogue';
import {ReadingDesk} from './ReadingDesk';
import {newGameState} from '../core/save';
import {reduce} from '../core/__fixtures__/legacyReduce';
import {NPC_VISITS} from '../content/npcJourney';
import {READING_FOLIOS} from '../content/readingJourney';
import {readingKey} from '../core/reading';
import type {SaveData} from '../core/schema';
afterEach(cleanup);
const begin=()=>reduce(reduce(newGameState(),{type:'new-game'}),{type:'skip-prologue'});
function Play({initial=begin()}:{initial?:SaveData}){
 const [save,dispatch]=useReducer(reduce,reduce(initial,{type:'talk-npc',id:`npc:${NPC_VISITS.find(n=>n.scene===initial.currentScene)!.folio}`}));
 return <>{save.overlay==='dialogue'?<NpcDialogue save={save} dispatch={dispatch}/>:save.overlay==='reading'?<ReadingDesk save={save} dispatch={dispatch}/>:<p>继续探索</p>}{save.overlay==='none'?<NpcNotes save={save}/>:null}</>;
}
it('lets the player ask, seek a second clue, revisit it and carry attributed testimony into reading',()=>{
 render(<Play/>);expect(screen.getByRole('dialog',{name:'与巡路匠交谈'})).toBeTruthy();
 fireEvent.click(screen.getByRole('button',{name:'这地方有什么值得留意？'}));expect(screen.getByTestId('npc-line').textContent).toContain('白痕');
 fireEvent.click(screen.getByRole('button',{name:'我该怎样核对？'}));expect(screen.getByTestId('npc-line').textContent).toContain('谁失去');
 fireEvent.click(screen.getByRole('button',{name:'再给我一个核对方向'}));expect(screen.getByTestId('npc-line').textContent).toContain('外观相似');
 fireEvent.click(screen.getByRole('button',{name:'重听核对方法'}));expect(screen.getByTestId('npc-line').textContent).toContain('外观相似');
 fireEvent.click(screen.getByRole('button',{name:'展开残卷，对照笔记'}));
 expect(screen.getByText('途中口述')).toBeTruthy();expect(screen.getByText('渠上人家的旁记')).toBeTruthy();
 expect(screen.getAllByRole('radio').every(el=>!(el as HTMLInputElement).checked)).toBe(true);
});
it('closes on native dialog cancel and retains only conversations actually requested',()=>{
 render(<Play/>);fireEvent.click(screen.getByRole('button',{name:'关于这页旧约，你记得什么？'}));
 fireEvent(screen.getByRole('dialog'),new Event('cancel',{bubbles:true,cancelable:true}));
 expect(screen.getByText('继续探索')).toBeTruthy();expect(screen.getByText('巡路匠 · 雾岸 · 旧事回忆')).toBeTruthy();
 expect(screen.queryByText('巡路匠 · 雾岸 · 眼前见闻')).toBeNull();
});
it('presents old and added records together without making an NPC answer the food reading',()=>{
 const initial={...begin(),currentScene:'dba.scene.yard'};
 for(const f of READING_FOLIOS.slice(0,2))initial.flags[readingKey(f.id)]=true;
 render(<Play initial={initial}/>);fireEvent.click(screen.getByRole('button',{name:'展开残卷，对照笔记'}));
 expect(screen.getByText('来者受其半，归日补其数。')).toBeTruthy();expect(screen.getByText('背页仅存：同食者二。')).toBeTruthy();
 expect(screen.getAllByRole('radio')).toHaveLength(4);expect(screen.getByRole('button',{name:'合上证据，试读此页'})).toHaveProperty('disabled',true);
});
