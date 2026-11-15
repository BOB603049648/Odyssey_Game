import { LEARNING_LAYERS, learningJourney } from '../core/learningJourney';
import type { Action } from '../core/reduce';
import type { MuralLayer, SaveData } from '../core/schema';
import { Glyph } from './glyphs';
import './learningJourney.css';

export function LearningJourney({ save, dispatch }: { save: SaveData; dispatch: (action: Action) => void }) {
  const lesson = learningJourney(save);
  if (!lesson) return null;
  return <aside className="lesson-journey" data-testid="lesson-journey" data-kind={lesson.kind}>
    <div>
      <p className="lesson-label">{lesson.kind === 'explore' ? '可以回到旅途试一试了' : '带着眼前的问题读石壁'}</p>
      <p className="lesson-purpose" aria-live="polite">{lesson.goal.detail}</p>
      {lesson.kind === 'learn' && lesson.prerequisite ?
        <p className="lesson-note">先认出前面这些生活里的刻痕，后面的情景才会逐渐清晰。</p> : null}
    </div>
    {lesson.kind === 'explore' ? <button className="btn" type="button" data-testid="lesson-return"
      onClick={() => dispatch({ type: 'close-screen' })}>回到旅途 <span aria-hidden="true">↗</span></button>
      : <button className="lesson-focus" type="button" data-testid="lesson-focus" data-word={lesson.focus.id}
        aria-label={`查看壁画带 ${LEARNING_LAYERS.indexOf(lesson.focus.layer as MuralLayer) + 1} 的旅程线索`}
        onClick={() => {
          dispatch({ type: 'select-layer', layer: lesson.focus.layer as MuralLayer });
          dispatch({ type: 'select-cell', wordId: lesson.focus.id });
        }}>
        <Glyph id={lesson.focus.id} /><span>找这枚刻符<small>壁画带 {LEARNING_LAYERS.indexOf(lesson.focus.layer as MuralLayer) + 1}</small></span>
      </button>}
  </aside>;
}
