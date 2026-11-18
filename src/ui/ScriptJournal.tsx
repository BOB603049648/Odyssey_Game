import {NpcPortrait} from './NpcFigure';
import {npcForScene} from '../content/npcJourney';
import { useState } from 'react';
import { SCRIPT_GROUPS, SCRIPT_TRACES, SCRIPT_WORDS, type ScriptWord } from '../content/islandScript';
import { groupReady, scriptConfirmed, scriptGuess, scriptKey, traceStep, wordSeen } from '../core/islandScript';
import { isLearnedState } from '../core/words';
import type { SaveData } from '../core/schema';
import type { Action } from '../core/reduce';
import { GameDialog } from './GameDialog';
import { IslandGlyph } from './IslandGlyph';
import './scriptJournal.css';

const known=(s:SaveData,w:ScriptWord)=>isLearnedState(s.words[`dba.word.${w}`]?.state);
const meaning=(s:SaveData,w:ScriptWord)=>known(s,w)?SCRIPT_WORDS.find(x=>x[0]===w)![1]:scriptGuess(s,w);
function Phrase({words,save}:{words:ScriptWord[];save:SaveData}) {
  return <div className="script-phrase" aria-label="岛屿文字，从左至右">{words.map((w,i)=><span key={`${w}:${i}`} data-confirmed={known(save,w)}><IslandGlyph word={w}/><small>{meaning(save,w)||'·'}{!known(save,w)&&scriptGuess(save,w)?'?':''}</small></span>)}</div>;
}

/** Notebook sketches support the context; the signs themselves are abstract. */
function TraceSketch({group,step}:{group:string;step:number}) {
  const person=(x:number,flip=false)=><g transform={`translate(${x} 0) scale(${flip?-1:1} 1)`}><circle cx="0" cy="57" r="12"/><path d="M-4 70-15 118 19 118 5 70M-6 82-30 103M7 82 35 94M-8 118-13 146M12 118l13 28"/></g>;
  return <svg className="trace-sketch" viewBox="0 0 420 180" aria-hidden="true"><g fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path className="sketch-ground" d="M20 149q92-9 160 0t220-3M43 157h81m179 0h69"/>
    {group==='spring'?<>{person(120)}<path d="M252 136q24-16 60 0M240 140q40 22 85 0M260 130v-18q15-18 30 0v18M310 43q-10 30 0 52m8-42v38M252 38l35-12 60 12v60"/><g transform={step?'translate(-103 -45)':'translate(-28 0)'}><path d="M190 110q18 24 36 0Zm36 2 20-12"/></g></>:null}
    {group==='hearth'?<><path d="M72 137q38-25 82 0l-8 11H70Zm15-8 4-26 16-7 30 26M219 143l17-17m-6 16 18-16M225 123q-12-23 5-43-3 20 10 24 10-18 10-29 20 32-2 48Z"/>{person(310,true)}<path d="M42 43h335M56 43v104m305-104v104"/></>:null}
    {group==='table'?<>{person(90)}{person(330,true)}<path d="M133 103h155m-148 2v43m140-43v43M141 89q19 22 38 0m59 0q19 22 38 0"/><g transform={step?'translate(0 0)':'translate(-45 0)'}><path d="M186 76q22-18 44 0-22 18-44 0Zm44 0 10-10v20Z"/>{step?<path d="M208 65v23"/>:null}</g></>:null}
    {group==='witness'?<>{person(step?300:110,!!step)}{person(step?110:300,!step)}<path d="M162 113h92l-7 25h-88ZM182 105v-8h20v8M207 128h22"/><path d={step?'M280 45q-50-35-90-2m0 0 11-2-5-9':'M130 45q50-35 90-2m0 0-11-2 5-9'}/></>:null}
    {group==='bridge'?<>{person(100)}<path d="M35 147h112l23-10 18 18 22-22 19 17 20-15 32 12h99M145 140v28m135-28v28M148 94l47 15m40 0 48-15M148 76v64m135-64v64M192 140l15 14m10-19 12 18"/><path d="m55 61-20-10 5 16m-5-16 20 2"/>{step?<path d="M124 133q10-15 19 0l2 10h-24Zm0-5-3-10 8 5m11 0 8-5-3 10"/>:null}</>:null}
    {group==='night'?<>{person(92)}{person(325,true)}<path d="M158 145V62l49-23 50 23v83Zm12-2V80h74v63M204 80v63M190 108h30"/>{step?<><circle cx="158" cy="98" r="7"/><path d="M165 98h28m-5 0v8m-8-8v6M201 70l9 10-10 10-9-10Z"/></>:<path d="M125 135q20 20 40 0M271 135q20 20 40 0"/>}</>:null}
  </g></svg>;
}

export function ScriptObservation({save,dispatch}:{save:SaveData;dispatch:(a:Action)=>void}) {
  const trace=SCRIPT_TRACES.find(t=>t.id===save.flags['dba.script.current']);
  const [hint,setHint]=useState(false);
  if(!trace)return null;
  const npc=trace.npc?npcForScene(trace.scene):undefined;
  const step=traceStep(save,trace.id),last=step>=trace.moments.length-1;
  return <GameDialog title={trace.title} testId="script-observation" className="script-observation" onClose={()=>dispatch({type:'close-overlay'})}>
    <p className="script-eyebrow">{trace.npc?'途中交谈':'器物上的文字'} · 见闻 {step+1}/{trace.moments.length}</p>
    <div className="script-scene-study">{npc?<div className="script-speaker-portrait"><NpcPortrait npc={npc}/></div>:null}<TraceSketch group={trace.group} step={step}/></div>
    <div className="script-moments">{trace.moments.slice(0,step+1).map((m,i)=><section key={i}><p>{m.action}</p><Phrase words={m.words} save={save}/></section>)}</div>
    <div className="script-observation-actions">
      {!last?<button className="btn primary" onClick={()=>dispatch({type:'script-next'})}>{trace.npc?'继续看他的动作':'翻看另一面'}</button>:<button className="btn primary" onClick={()=>dispatch({type:'open-overlay',overlay:'journal'})}>记下我的猜测</button>}
      <button className="btn" onClick={()=>setHint(v=>!v)} aria-expanded={hint}>留意什么？</button>
    </div>
    {hint?<p className="script-hint">{trace.hint}</p>:null}
    <p className="script-footnote">见闻自动记入手记。字下的问号是你的暂译。</p>
  </GameDialog>;
}

export function ScriptJournal({save,dispatch}:{save:SaveData;dispatch:(a:Action)=>void}) {
  const [page,setPage]=useState(()=>SCRIPT_GROUPS.find(g=>g.scene===save.currentScene)?.id??'spring');
  const group=SCRIPT_GROUPS.find(g=>g.id===page)!;
  const traces=SCRIPT_TRACES.filter(t=>t.group===page),confirmed=scriptConfirmed(save,page),ready=groupReady(save,page);
  const filled=group.words.every(w=>known(save,w)||scriptGuess(save,w).trim());
  return <GameDialog title="旅人手记" testId="script-journal" className="script-journal" onClose={()=>dispatch({type:'close-overlay'})}>
    <nav className="script-tabs" aria-label="见闻地点">{SCRIPT_GROUPS.map((g,i)=><button key={g.id} type="button" aria-pressed={g.id===page} onClick={()=>setPage(g.id)}><span>{String(i+1).padStart(2,'0')}</span>{g.title}{scriptConfirmed(save,g.id)?' · 已印证':''}</button>)}</nav>
    <div className="script-spread"><section className="script-records"><p className="script-eyebrow">左页 · 亲眼所见</p><h3>{group.title}</h3>
      {traces.map(trace=>traceStep(save,trace.id)<0?<div className="script-unseen" key={trace.id}>还有一段见闻未曾记下</div>:<details key={trace.id} open><summary>{trace.title}{traceStep(save,trace.id)<trace.moments.length-1?' · 尚未看完':''}</summary>{trace.moments.slice(0,traceStep(save,trace.id)+1).map((m,i)=><div key={i}><p>{m.action}</p><Phrase words={m.words} save={save}/></div>)}</details>)}
    </section><section className="script-guesses"><p className="script-eyebrow">右页 · 暂定词义</p><p>比较不同情境中重复的字。用你自己的话记一个词；猜测不会立刻被判对错。</p>
      {group.words.map((w,i)=><div className="script-word" key={w}>{wordSeen(save,w)?<><IslandGlyph word={w}/><label><span>刻符 {String(SCRIPT_WORDS.findIndex(x=>x[0]===w)+1).padStart(2,'0')}{known(save,w)?' · 已印证':' · 暂译'}</span>{known(save,w)?<strong>{meaning(save,w)}</strong>:<input aria-label={`刻符 ${i+1} 的暂定词义`} value={scriptGuess(save,w)} placeholder="我的猜测…" maxLength={24} onChange={e=>dispatch({type:'script-guess',word:w,value:e.target.value})}/>}</label></>:<span className="script-unseen">这一页还留着空白</span>}</div>)}
      {!confirmed?<><button className="btn primary" disabled={!ready||!filled} onClick={()=>dispatch({type:'script-verify',group:page})}>将这一组与见闻对照</button><p className="script-footnote">{!ready?'先看完这一处的两件器物，并听完当地人的示范。':!filled?'为三个字都留下暂译，再一起核验。':'核验整组词义，不会指出哪个字有误。常见近义表达也可使用。'}</p></>:<p className="script-confirmed">{save.flags[scriptKey('legacy',page)]?'沿用旧旅程中已掌握的词义。新见闻仍可补记。':'这些词义在这一组见闻中成立了。试着把它们用在接下来的行动里。'}</p>}
      <p role="status" className="script-result">{save.flags[scriptKey('result',page)]==='revisit'?'这组暂译还不能解释所有见闻。回看动作发生前后，也可以尝试一个更贴近的近义词。':save.flags[scriptKey('result',page)]==='ok'?'墨迹落定。三枚字的含义已互相印证。':''}</p>
      {save.memories.includes('dba.mem.rain-night')?<button className="btn" onClick={()=>dispatch({type:'open-memory'})}>重看雨夜的回忆</button>:null}
      <details className="script-origin"><summary>关于这套文字</summary><p>岛屿文字、语序与生活习俗均为本作虚构，不是真实东巴文。理解从泉水共用、炉火留客、分食与守约等生活关系中生长；字形不直接画出答案。</p></details>
    </section></div>
  </GameDialog>;
}
