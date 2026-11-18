import {NPC_PEOPLE,NPC_VISITS} from '../content/npcJourney';
import {activeNpc,conversationKey,conversationNotes,dialogueLine,dialogueNext} from '../core/dialogue';
import type {SaveData} from '../core/schema';
import type {Action} from '../core/reduce';
import {GameDialog} from './GameDialog';
import {NpcPortrait} from './NpcFigure';
import {READING_FOLIOS} from '../content/readingJourney';

export function NpcDialogue({save,dispatch}:{save:SaveData;dispatch:(action:Action)=>void}){
  const npc=activeNpc(save),close=()=>dispatch({type:'close-overlay'});
  if(!npc)return <GameDialog title="交谈已结束" onClose={close}><button className="btn" onClick={close}>回到路上</button></GameDialog>;
  const person=NPC_PEOPLE[npc.id],hint=Number(save.flags[conversationKey(npc.folio,'hint')]??0),topic=save.flags[conversationKey(npc.folio,'topic')];
  const next=dialogueNext(save);
  return <GameDialog title={`与${person.name}交谈`} testId="npc-dialogue" onClose={close}>
    <div className="npc-conversation">
      <div className="npc-speaker"><NpcPortrait npc={npc}/><p>{person.detail}</p><small>对话以汉文呈现 · 聚落人物为游戏虚构</small></div>
      <div className="npc-words"><p className="eyebrow">{READING_FOLIOS.find(f=>f.id===npc.folio)?.place} · {person.name}</p>
        <blockquote aria-live="polite" aria-atomic="true" data-testid="npc-line"><span className="dialogue-line-copy" key={`${topic??'arrival'}:${hint}`}>{dialogueLine(save)}</span></blockquote>
        <p className="npc-source">听来的话记为口述；释读仍需与实物、原文相互核对。</p>
        <div className="npc-topics" aria-label="选择话题">
          <button className="btn" aria-pressed={topic==='place'} onClick={()=>dispatch({type:'npc-topic',topic:'place'})}>这地方有什么值得留意？{save.flags[conversationKey(npc.folio,'heard.place')]===true?<small>已记下</small>:null}</button>
          <button className="btn" aria-pressed={topic==='memory'} onClick={()=>dispatch({type:'npc-topic',topic:'memory'})}>关于这页旧约，你记得什么？{save.flags[conversationKey(npc.folio,'heard.memory')]===true?<small>已记下</small>:null}</button>
          <button className="btn" aria-pressed={topic==='method'} onClick={()=>dispatch(hint<2?{type:'npc-hint'}:{type:'npc-topic',topic:'method'})}>{hint===0?'我该怎样核对？':hint===1?'再给我一个核对方向':'重听核对方法'}</button>
        </div>
        {topic==='method'?<p className="npc-next">旅程记录：{next.title} · {next.detail}</p>:null}
      </div>
    </div>
    <div className="npc-dialogue-actions"><button className="btn" onClick={()=>{close();dispatch({type:'open-reading'});}}>展开残卷，对照笔记</button><button className="btn primary" onClick={close}>先去看看</button></div>
  </GameDialog>;
}
export function NpcNotes({save}:{save:SaveData}){
  const notes=conversationNotes(save);if(!notes.length)return null;
  return <section className="npc-notes"><h3>途中口述</h3><p>这是听过的说法，不等同于已经证实的结论。</p>{notes.map(note=>{
    const npc=NPC_VISITS.find(n=>n.folio===note.folio);if(!npc)return null;
    return <details key={`${note.folio}:${note.topic}`}><summary>{NPC_PEOPLE[npc.id].name} · {READING_FOLIOS.find(f=>f.id===note.folio)?.place} · {note.topic==='place'?'眼前见闻':'旧事回忆'}</summary><p>{npc[note.topic]}</p></details>;
  })}</section>;
}
