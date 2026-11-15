import { useEffect, useRef, useState } from 'react';
import { LEXEMES } from '../content/catalog';
import type { SaveData } from '../core/schema';
import { isLearnedState } from '../core/words';
import { ConceptScene } from './ConceptScene';
import { Glyph } from './glyphs';
import { t } from './i18n';
import './learningJourney.css';

/** The notebook remembers the scene that gave a glyph meaning, without
 * exposing unlearned words or enabling translation behind the player's back. */
export function FieldLexicon({ save }: { save: SaveData }) {
  const learned = LEXEMES.filter(word => isLearnedState(save.words[word.id]?.state));
  const [selected, setSelected] = useState<string | null>(null);
  const memory = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (selected) memory.current?.scrollIntoView?.({ block: 'start' });
  }, [selected]);
  const word = learned.find(item => item.id === selected) ?? learned[0];
  if (!word) return <p>{t('lexicon.empty')}</p>;
  const mastered = save.words[word.id]?.state === 'mastered';
  return <section className="field-lexicon" data-testid="field-lexicon" aria-label="记下的刻痕">
    <p className="lexicon-help">选一枚刻符，回想它在画面里的意思。已记下 {learned.length} 枚。</p>
    <div ref={memory} className="lexicon-memory" data-testid="lexicon-memory" data-word={word.id}>
      <div className="lexicon-memory-heading"><Glyph id={word.id} />
        <div><strong>{save.settings.showGloss ? word.gloss : '画面中的意思'}</strong>
          <p aria-live="polite">{mastered ? '已熟悉 · 已在复用中独立认出' : '已记下 · 可在石壁的复用带再认一次'}</p></div>
      </div>
      <ConceptScene key={word.id} id={word.id} />
    </div>
    <div className="lexicon lexicon-symbols" role="group" aria-label="选择已学刻符">
      {learned.map((item, index) => <button key={item.id} type="button" className="lex-card"
        aria-label={save.settings.showGloss ? item.gloss : `记下的刻符 ${index + 1}`}
        aria-pressed={word.id === item.id} data-testid={`lexicon-${item.id}`}
        onClick={() => setSelected(item.id)}>
        <Glyph id={item.id} />
        {save.settings.showGloss ? <span className="gloss">{item.gloss}</span> : null}
        <span className="lexicon-status" aria-label={save.words[item.id]?.state === 'mastered' ? '已熟悉' : '已记下'}>
          {save.words[item.id]?.state === 'mastered' ? '◆' : '◇'}
        </span>
      </button>)}
    </div>
  </section>;
}
