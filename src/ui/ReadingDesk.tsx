import {useState} from 'react';
import {CULTURE_SOURCES,READING_FOLIOS,folioForScene,type ReadingFolio} from '../content/readingJourney';
import {hasRead,precedingFolio,readingCount,readingKey} from '../core/reading';
import type {SaveData} from '../core/schema';
import type {Action} from '../core/reduce';
import {GameDialog} from './GameDialog';
import snow from '../assets/art/culture/snow.png';
import hilltop from '../assets/art/culture/hilltop.png';
import './reading.css';
import {NpcNotes} from './NpcDialogue';
import {NPC_PEOPLE,npcForScene} from '../content/npcJourney';
import {InterfaceIcon} from './InterfaceIcon';

export function ReadingDesk({save,dispatch}:{save:SaveData;dispatch:(action:Action)=>void}){
  const current=folioForScene(save.currentScene);
  const [selected,setSelected]=useState(current.id);
  const folio=READING_FOLIOS.find(f=>f.id===selected)!;
  return <GameDialog title="留与归 · 残卷手记" testId="reading-desk" onClose={()=>dispatch({type:'close-overlay'})}>
    <header className="reading-header"><div><p>沿水、火、食、经、桥、夜，找回一份被改写的路约。</p>
      <div className="folio-progress"><progress aria-label="残卷核读进度" max={6} value={readingCount(save)}/><span>{readingCount(save)} / 6 叶已核读</span></div></div>
      <button type="button" className="btn" onClick={()=>dispatch({type:'close-overlay'})}>收起手记</button></header>
    <nav className="folio-tabs" aria-label="六叶路约">{READING_FOLIOS.map((item,i)=><button type="button" key={item.id}
      aria-pressed={folio.id===item.id} data-state={hasRead(save,item.id)?'read':item.id===current.id?'here':'away'} onClick={()=>setSelected(item.id)} data-testid={`folio-${item.id}`}>
      <span>{String(i+1).padStart(2,'0')} · {item.place}</span><strong>{item.title}</strong><small>{hasRead(save,item.id)?<><InterfaceIcon name="check"/>已核读</>:item.id===current.id?'此处残页':'尚待前往'}</small>
    </button>)}</nav>
    <ReadingPage key={folio.id} folio={folio} save={save} dispatch={dispatch}/>
    <NpcNotes save={save}/>
    <footer className="reading-footer"><span>已核读 {readingCount(save)} / 6 叶</span><details><summary>文字与创作说明</summary>
      <p>路约残句、人物和涂改案均为游戏原创，以汉文呈现旅人的笔记，并非真实东巴经文译文。馆藏字例与文化注记分别标明出处。原有自绘刻符仅作虚构叙事记号。</p>
      <button type="button" className="btn" onClick={()=>{dispatch({type:'close-overlay'});dispatch({type:'open-mural'});}}>打开虚构刻符练习</button>
    </details></footer>
  </GameDialog>;
}
function savedProof(save:SaveData,key:string):string[]{
  try{const value=JSON.parse(String(save.flags[`${key}.proof`]??'[]'));return Array.isArray(value)?value.filter(v=>typeof v==='string'):[];}catch{return[];}
}
function ReadingPage({folio,save,dispatch}:{folio:ReadingFolio;save:SaveData;dispatch:(action:Action)=>void}){
  const key=readingKey(folio.id),done=hasRead(save,folio.id),prior=precedingFolio(save,folio),here=folio.scene===save.currentScene;
  const [answer,setAnswer]=useState(String(save.flags[`${key}.answer`]??''));
  const [proof,setProof]=useState<string[]>(()=>savedProof(save,key));
  const [edited,setEdited]=useState(false);
  const hint=Number(save.flags[`${key}.hint`]??0),result=edited?null:save.flags[`${key}.result`];
  const blocked=!!prior||!here;
  const chooseProof=(id:string)=>{setEdited(true);setProof(old=>old.includes(id)?old.filter(x=>x!==id):old.length<2?[...old,id]:old);};
  const choice=folio.choices.find(c=>c.id===answer);
  if(!done&&blocked)return <section className="reading-locked" data-testid="reading-locked">
    <p className="eyebrow">{folio.subtitle}</p><h3>{folio.title}</h3>
    <p>{prior?`这一页要与《${prior.title}》并读。先到${prior.place}核读前页，证据会自动收入手记。`:`残页留在${folio.place}。带着手记走到那里，再核对现场。`}</p>
    <p>手记保留已经核读的内容，不会把尚未找到的旁证提前填上。</p>
  </section>;
  return <article className="reading-page" data-testid={`reading-${folio.id}`}>
    <div className="reading-copy"><p className="eyebrow">{folio.subtitle}</p><h3>{folio.title}</h3>
      <p className="reading-provenance">旅人汉文笔记 · 游戏原创</p>
      <blockquote className="manuscript-lines">{folio.passage.map((line,i)=><p key={line}><span aria-hidden="true">{i+1}</span>{line}</p>)}</blockquote>
      {folio.variant?<figure className="manuscript-variant"><figcaption>{folio.variant.label}</figcaption><blockquote>{folio.variant.lines.map(line=><p key={line}>{line}</p>)}</blockquote><p className="variant-note">{folio.variant.note}</p></figure>:null}
      {folio.id==='script'?<figure className="attested-glyphs"><div><img src={snow} alt="莱顿展览所示的雪字例：三片下落的雪花"/><span>雪 · bbei</span></div>
        <div><img src={hilltop} alt="莱顿展览所示的峭顶字例，讲解指出其中鸡头形提示读音"/><span>峭顶 · aiq</span></div>
        <figcaption>馆藏讲解字例 · Leiden University Libraries, Or. 26.029。图片保持原样；读音写法沿用展览标注。</figcaption></figure>:null}
      <aside className="culture-note"><strong>读法手记</strong><p>{folio.culture}</p>
        <a href={CULTURE_SOURCES[folio.source].url} target="_blank" rel="noreferrer">{CULTURE_SOURCES[folio.source].label} ↗</a></aside>
    </div>
    <div className="reading-analysis">
      {done?<section className="reading-resolution" role="status"><p className="eyebrow">已核读 · 证据与解释相合</p>
        <h4>{folio.choices.find(c=>c.id===folio.answer)!.text}</h4><p>{folio.resolution}</p>
        <ul>{folio.proof.map(id=><li key={id}>{folio.evidence.find(e=>e.id===id)!.title}</li>)}</ul>
        <p className="reading-handoff">{folio.handoff}</p>
        <button type="button" className="btn primary" onClick={()=>dispatch({type:'close-overlay'})}>带着这条读法继续走</button>
      </section>:<form onSubmit={event=>{event.preventDefault();setEdited(false);dispatch({type:'reading-submit',folio:folio.id,answer,evidence:proof});}}>
        <p className="reading-proof-help">遇到矛盾时，可以收起手记，与此处的{NPC_PEOPLE[npcForScene(folio.scene)!.id].name}交谈，听取另一种经历。</p>
        <fieldset><legend><span className="reading-step">壹 · 释读</span>{folio.question}</legend><div className="reading-options">{folio.choices.map((item,i)=><label key={item.id} data-selected={answer===item.id}>
          <input type="radio" name={`reading-${folio.id}`} value={item.id} checked={answer===item.id} onChange={()=>{setAnswer(item.id);setEdited(true);}}/>
          <span className="reading-option-letter" aria-hidden="true">{'甲乙丙丁'[i]}</span><span>{item.text}</span>
        </label>)}</div></fieldset>
        <fieldset><legend><span className="reading-step">贰 · 旁证</span>选出两条共同支持释读的旁证</legend><p className="reading-proof-help" aria-live="polite">结论与证据都成立才记入手记。已选 {proof.length} / 2；再次点选可撤下。</p>
          <div className="reading-evidence">{folio.evidence.map(item=><label key={item.id} data-selected={proof.includes(item.id)}>
            <input type="checkbox" checked={proof.includes(item.id)} disabled={!proof.includes(item.id)&&proof.length===2} onChange={()=>chooseProof(item.id)}/>
            <span><strong>{item.title}</strong><small>{item.text}</small>{item.from?<em>带自前页的记录</em>:null}</span>
          </label>)}</div>
        </fieldset>
        <div className="reading-submit-block"><p className="reading-selection-status">{!answer?'先选定一种释读，再用两条旁证支持它。':proof.length<2?`还需选择 ${2-proof.length} 条旁证。`:'释读与两条旁证已备齐，可以试读。'}</p>
        <div className="reading-actions"><button type="submit" className="btn primary" disabled={!answer||proof.length!==2}>合上证据，试读此页<InterfaceIcon name="arrow"/></button>
          <button type="button" className="btn" disabled={hint>=2} onClick={()=>dispatch({type:'reading-hint',folio:folio.id})}>{hint===0?'看一条读法提示':hint===1?'再提示一步':'提示已展开'}</button></div>
        </div>
        {result==='meaning'?<p className="reading-response" role="status">{choice?.objection}</p>:result==='evidence'?<p className="reading-response" role="status">这个释读可以成立，但所选旁证还不能共同证明它。区分能支持结论的事实与仅仅有关联的细节。</p>:null}
        {hint>0?<aside className="reading-hints">{folio.hints.slice(0,hint).map(text=><p key={text}>{text}</p>)}</aside>:null}
      </form>}
    </div>
  </article>;
}

export function ReadingArchive({save}:{save:SaveData}){
  const read=READING_FOLIOS.filter(f=>hasRead(save,f.id));if(!read.length)return null;
  return <section className="reading-archive"><h3>一路带来的读法</h3><p>同一个“留”，从水源、火塘、分食走向承诺。</p>
    {read.map(f=><details key={f.id}><summary>{f.place} · {f.title}</summary><p>{f.resolution}</p><blockquote>{f.passage.join(' ')}</blockquote></details>)}
  </section>;
}
