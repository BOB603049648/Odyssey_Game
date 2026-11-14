import { useEffect, useRef, useState } from 'react';
import { BRIDGE_WORDS, bridgeState, type BridgeAction } from '../core/bridge';
import type { SaveData } from '../core/schema';
import { isLearnedState } from '../core/words';
import { LEXEMES } from '../content/catalog';
import { ConceptScene } from './ConceptScene';
import { Glyph } from './glyphs';
import { t, type MessageKey } from './i18n';
import closeup from '../assets/art/states/bridge-inspection.webp';
import './puzzles.css';
import './bridge.css';

export function BridgePuzzle({ save, dispatch, onClose }: {
  save: SaveData; dispatch: (action: BridgeAction) => void; onClose: () => void;
}) {
  const bridge = bridgeState(save);
  const panel = useRef<HTMLElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const [slot, setSlot] = useState<'reason' | 'intent'>('reason');
  const [recall, setRecall] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const known = (id: string) => isLearnedState(save.words[`dba.word.${id}`]?.state);
  const finished = bridge.stage === 'agreed' || bridge.stage === 'done';
  const observed = bridge.boards && bridge.rope;
  const bank = BRIDGE_WORDS.filter(id => isLearnedState(save.words[id]?.state));
  const feedback = save.feedback.line?.startsWith('spot.bridge.') || save.feedback.line === 'spot.path.step'
    ? t(save.feedback.line as MessageKey) : null;
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  useEffect(() => {
    // A correct reading removes its focused answer. Keep keyboard users inside
    // the dialog when lesson, retry, or agreement controls disappear.
    if (panel.current && !panel.current.contains(document.activeElement)) {
      const target = panel.current.querySelector<HTMLButtonElement>('[data-testid="bridge-slot-reason"]')
        ?? panel.current.querySelector<HTMLButtonElement>('button');
      target?.focus({ preventScroll: true });
    }
  }, [save.words['dba.word.wait']?.state, bridge.stage, failed]);
  return <div className="puzzle-backdrop" onPointerDown={event => event.stopPropagation()}>
    <section ref={panel} className="bridge-dialog" role="dialog" aria-modal="true" aria-label="雾径上的约定"
      data-testid="bridge-puzzle" data-stage={bridge.stage} onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key !== 'Tab') return;
        const buttons = Array.from(panel.current?.querySelectorAll<HTMLElement>('button:not(:disabled), summary') ?? []);
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <header className="bridge-header"><div><p className="eyebrow">雾径 · 风从桥下穿过</p><h2>脚下的路，还可靠吗？</h2></div>
        <button type="button" className="btn" onClick={onClose}>回到雾径</button></header>
      <div className="bridge-layout">
        <div className="bridge-observation">
          <div className={`bridge-closeup${failed ? ' art-failed' : ''}`}>
            <img key={attempt} src={closeup} alt="桥边近景：左侧是稳固石台，前方桥板开裂，右侧扶绳已经磨断。" draggable={false}
              onError={() => setFailed(true)} />
            <button type="button" className="bridge-clue bridge-boards" data-testid="bridge-inspect-boards" aria-pressed={bridge.boards}
              onClick={() => dispatch({ type: 'bridge-act', move: 'inspect', clue: 'boards' })}>桥板 <span aria-hidden="true">{bridge.boards ? '✓' : '＋'}</span></button>
            <button type="button" className="bridge-clue bridge-rope" data-testid="bridge-inspect-rope" aria-pressed={bridge.rope}
              onClick={() => dispatch({ type: 'bridge-act', move: 'inspect', clue: 'rope' })}>绳结 <span aria-hidden="true">{bridge.rope ? '✓' : '＋'}</span></button>
            <button type="button" className="bridge-carving" aria-label="查看木牌上的刻痕" onClick={() => controls.current?.scrollIntoView?.({ block: 'nearest' })}>
              <Glyph id="dba.word.wait" /></button>
          </div>
          {failed ? <p className="bridge-image-error" role="status">近景暂未载入，仍可点「桥板」「绳结」观察。
            <button type="button" onClick={() => { setFailed(false); setAttempt(n => n + 1); }}>重新载入画面</button></p> : null}
          <div className="bridge-notes" aria-live="polite">
            {!observed ? <p>看看脚下的木板，再看看扶绳。向导留在木牌旁，没有继续向前。</p> : null}
            {bridge.boards ? <p><span>桥板</span> 裂口一直延伸到下面的支架，踩上去会继续下沉。</p> : null}
            {bridge.rope ? <p><span>绳结</span> 护栏的纤维已经磨断，不能靠它承住重量。</p> : null}
          </div>
        </div>
        <div ref={controls} className="bridge-controls">
          {finished ? <div className="bridge-result"><h3>{bridge.stage === 'done' ? '你们一起回到了稳固的地面' : '向导明白了你的决定'}</h3>
            <p>{bridge.stage === 'done' ? '旧桥依然破损。这一次，刻痕让你们避免了冒险。' : '它已转向来路。收起近景，沿左侧路口回到前坪，这段经历才算完成。'}</p></div>
            : !observed ? <div className="bridge-invitation"><h3>先看清，再决定</h3><p>点近景中的两处细节。刻痕需要有眼前的事实作依据。</p></div>
            : !known('danger') ? <div className="bridge-invitation"><h3>这些痕迹意味着什么？</h3><p>你还没有认出表示险兆的刻痕。可以先从左侧路口离开，回石壁看看第三带；观察记录会留下。</p></div>
            : <>
              {!known('wait') ? <details className="bridge-reading" open={!known('protect')}>
                <summary>木牌旁，还有一枚不熟悉的刻痕</summary>
                <div className="bridge-reading-question"><Glyph id="dba.word.wait" /><p>向导在路口坐住，望着你，没有入睡，也没有走远。哪幅情景和它此刻的意思相同？</p></div>
                <div className="bridge-reading-options">{['sleep', 'wait', 'walk'].map(id => <button key={id} type="button"
                  data-testid={`bridge-read-${id}`} aria-label={`观察情景 ${['sleep', 'wait', 'walk'].indexOf(id) + 1}`}
                  onClick={() => dispatch({ type: 'bridge-act', move: 'decipher', wordId: `dba.word.${id}` })}>
                  <ConceptScene id={`dba.word.${id}`} /></button>)}</div>
              </details> : null}
              <h3>用刻痕告诉它你的决定</h3><p className="bridge-instruction">先选一句的位置，再放入刻符。可以换、可以清空；想好后才示意。</p>
              <div className="bridge-phrase">{(['reason', 'intent'] as const).map(id => <button key={id} type="button"
                className="bridge-slot" data-testid={`bridge-slot-${id}`} aria-pressed={slot === id}
                aria-label={id === 'reason' ? '选择眼前的状况' : '选择接下来的打算'} onClick={() => setSlot(id)}>
                <span>{id === 'reason' ? '眼前的状况' : '接下来的打算'}</span>{bridge[id] ? <Glyph id={bridge[id]} /> : <i aria-hidden="true">＋</i>}
              </button>)}</div>
              <div className="bridge-word-bank" role="group" aria-label="可用的已学刻符">{bank.map((id, index) => <button key={id} type="button"
                data-testid={`bridge-word-${id.split('.').at(-1)}`} aria-label={save.settings.showGloss ? LEXEMES.find(word => word.id === id)?.gloss : `已学刻符 ${index + 1}`}
                onClick={() => { dispatch({ type: 'bridge-act', move: 'select', slot, wordId: id }); setRecall(id); if (slot === 'reason') setSlot('intent'); }}>
                <Glyph id={id} />{save.settings.showGloss ? <small>{LEXEMES.find(word => word.id === id)?.gloss}</small> : null}</button>)}</div>
              <div className="bridge-compose-tools"><button type="button" className="btn" disabled={!bridge[slot]}
                onClick={() => dispatch({ type: 'bridge-act', move: 'select', slot, wordId: null })}>清空这一格</button>
                {recall ? <details className="bridge-recall"><summary>回想刚选的刻符</summary><ConceptScene key={recall} id={recall} /></details> : null}</div>
              <button type="button" className="btn primary bridge-signal" data-testid="bridge-signal" disabled={!bridge.reason || !bridge.intent}
                onClick={() => dispatch({ type: 'bridge-act', move: 'signal' })}>向同行者示意</button>
            </>}
          {feedback ? <p className="bridge-feedback" data-testid="bridge-feedback" data-kind={save.feedback.kind} role="status">{feedback}</p> : null}
        </div>
      </div>
    </section>
  </div>;
}
