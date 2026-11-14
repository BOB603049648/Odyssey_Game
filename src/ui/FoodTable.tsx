import { useEffect, useRef, useState } from 'react';
import type { FoodState, PuzzleAction } from '../core/puzzles';
import table from '../assets/art/states/food-table.webp';
import portion from '../assets/art/states/food-portion.webp';
import './puzzles.css';

/** A physical arrangement, backed by the same saved state as the courtyard. */
export function FoodTable({ food, dispatch, onClose }: {
  food: FoodState; dispatch: (action: PuzzleAction) => void; onClose: () => void;
}) {
  const panel = useRef<HTMLElement>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const previous = document.activeElement as HTMLElement | null;
    panel.current?.querySelector<HTMLButtonElement>('button:not(:disabled)')?.focus({ preventScroll: true });
    return () => { if (previous?.isConnected) previous.focus({ preventScroll: true }); };
  }, []);
  const move = (toSelf: boolean) => dispatch({ type: 'puzzle-act', puzzle: 'food', move: toSelf ? 'move-to-self' : 'move-to-companion' });
  return <div className="puzzle-backdrop" onPointerDown={event => event.stopPropagation()}>
    <section ref={panel} className="food-table-dialog" role="dialog" aria-modal="true" aria-label="分一份晚餐" data-testid="food-table"
      onKeyDown={event => {
        event.stopPropagation();
        if (event.key === 'Escape') { event.preventDefault(); onClose(); }
        if (event.key !== 'Tab') return;
        const buttons = Array.from(panel.current?.querySelectorAll<HTMLButtonElement>('button:not(:disabled)') ?? []);
        const first = buttons[0], last = buttons.at(-1);
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last?.focus(); }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first?.focus(); }
      }}>
      <header><p className="eyebrow">前坪 · 同行者的晚餐</p><h2>分一份晚餐</h2>
        <p>点一只碗，把一份食物移过去。也可以移回来。</p></header>
      <div className={`food-table-surface${failed ? ' food-art-failed' : ''}`}>
        <img key={`board-${attempt}`} className="food-table-art" src={table} alt="两只并排的陶碗，左边是自己的，右边留给同行者。" draggable={false} onError={() => setFailed(true)} />
        <div className="food-portions" aria-hidden="true">
          {[0,1,2,3].map(id => {
            const own = id < food.self;
            const index = own ? id : id - food.self;
            return <img key={`${attempt}-${id}`} src={portion} className="food-portion" alt="" draggable={false}
              onError={() => setFailed(true)} style={{ left: `${(own ? 22 : 64) + (index % 2) * 12}%`, top: `${43 + Math.floor(index / 2) * 12}%` }} />;
          })}
        </div>
        <button type="button" className="food-bowl food-bowl-self" data-testid="food-self-bowl" data-count={food.self}
          aria-label="移一份给自己" disabled={food.companion === 0 || food.stage === 'done'} onClick={() => move(true)}>
          <span>自己 · {food.self} 份</span></button>
        <button type="button" className="food-bowl food-bowl-companion" data-testid="food-companion-bowl" data-count={food.companion}
          aria-label="移一份给同行者" disabled={food.self === 0 || food.stage === 'done'} onClick={() => move(false)}>
          <span>同行者 · {food.companion} 份</span></button>
      </div>
      {failed ? <p className="food-image-error" role="status">餐具画面暂未载入，仍可按碗上的份数分配。
        <button type="button" onClick={() => { setFailed(false); setAttempt(value => value + 1); }}>重新载入画面</button></p> : null}
      <footer><p aria-live="polite">自己 {food.self} 份，同行者 {food.companion} 份。{food.self === 2 ? '两份晚餐准备好了，可以带到右侧的碗边。' : '篮中的食物都在这里，想一想怎样让两个人都吃到。'}</p>
        <button type="button" className="btn primary" onClick={onClose}>回到前坪</button></footer>
    </section>
  </div>;
}
