import { EVIDENCE, LEXEMES } from '../content/catalog';
import { hintPresentation } from '../core/hints';
import type { Action } from '../core/reduce';
import type { SaveData } from '../core/schema';
import { isLearnedState } from '../core/words';
import { Companion } from './Companion';
import { GlossSwitch } from './GlossSwitch';
import { Glyph } from './glyphs';
import { t, type MessageKey } from './i18n';
import { ShoreArt } from './scenes';
import { useFeedbackFx } from './useFeedbackFx';

export function IslandScreen({
  save,
  dispatch,
  onTitle,
}: {
  save: SaveData;
  dispatch: (action: Action) => void;
  onTitle: () => void;
}) {
  const hint = hintPresentation(save);
  const { shake, purr } = useFeedbackFx(save.feedback);
  const learned = LEXEMES.filter((lexeme) => isLearnedState(save.words[lexeme.id]?.state));
  const drank = save.beats['myp.beat.water'] === true;

  return (
    <section className={shake ? 'island shake' : 'island'}>
      <header className="bar">
        <div>
          <p className="eyebrow">{t('scene.shore')}</p>
          <p className="count" aria-label={`${learned.length}`}>
            {learned.length}/28
          </p>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={onTitle}>
            {t('menu.title')}
          </button>
          <button type="button" className="btn" onClick={() => dispatch({ type: 'open-overlay', overlay: 'lexicon' })}>
            {t('menu.lexicon')}
          </button>
          <button type="button" className="btn" onClick={() => dispatch({ type: 'open-overlay', overlay: 'casefile' })}>
            {t('menu.casefile')}
          </button>
          <button type="button" className="btn" onClick={() => dispatch({ type: 'open-overlay', overlay: 'settings' })}>
            {t('menu.settings')}
          </button>
        </div>
      </header>
      <div className="shore-wrap" data-testid="shore" data-water-beat={drank ? 'done' : 'open'}>
        <ShoreArt drank={drank} />
        <button
          type="button"
          className={`hotspot mural ${hintMark(hint, 'mural-entrance')}`}
          data-testid="island-mural"
          onClick={() => dispatch({ type: 'open-mural' })}
        >
          {t('island.mural')}
        </button>
        <button
          type="button"
          className={`hotspot gourd ${hintMark(hint, 'gourd')}`}
          data-testid="island-gourd"
          aria-label={t('island.gourd')}
          onClick={() => dispatch({ type: 'poke-gourd' })}
        >
          <svg className="glyph pouch" viewBox="0 0 64 64" aria-hidden="true">
            <path d="M24 18h16c2 8 10 10 10 18 0 12-8 16-18 16S14 48 14 36c0-8 8-10 10-18z" />
          </svg>
        </button>
        <Companion
          level={hint.level}
          anchor={hint.anchor}
          purr={purr}
          onAsk={() => dispatch({ type: 'request-hint' })}
        />
      </div>
      {save.overlay !== 'none' ? (
        <div className="sheet" role="dialog" aria-label={sheetLabel(save.overlay)}>
          <button type="button" className="btn" onClick={() => dispatch({ type: 'close-overlay' })}>
            {t('menu.close')}
          </button>
          {save.overlay === 'settings' ? (
            <GlossSwitch
              checked={save.settings.showGloss}
              onChange={(value) => dispatch({ type: 'set-show-gloss', value })}
            />
          ) : null}
          {save.overlay === 'lexicon' ? <Lexicon save={save} words={learned} /> : null}
          {save.overlay === 'casefile' ? <CaseFile save={save} /> : null}
          {save.overlay === 'use-word' ? (
            <div data-testid="use-word">
              <div className="choices">
                {learned.map((lexeme) => (
                  <button
                    key={lexeme.id}
                    type="button"
                    className={`choice ${hintMark(hint, 'use-word', lexeme.id)}`}
                    data-testid={`use-${lexeme.id}`}
                    onClick={() => dispatch({ type: 'use-word', wordId: lexeme.id })}
                  >
                    <Glyph id={lexeme.id} />
                    {save.settings.showGloss ? <span className="gloss">{lexeme.gloss}</span> : null}
                  </button>
                ))}
              </div>
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}

function Lexicon({
  save,
  words,
}: {
  save: SaveData;
  words: typeof LEXEMES;
}) {
  if (words.length === 0) return <p>{t('lexicon.empty')}</p>;
  return (
    <div className="lexicon">
      {words.map((lexeme) => (
        <article key={lexeme.id} className="lex-card">
          <Glyph id={lexeme.id} />
          {save.settings.showGloss ? <span className="gloss">{lexeme.gloss}</span> : null}
          <i className="draft" aria-label={t('lexicon.draft')} />
        </article>
      ))}
    </div>
  );
}

function CaseFile({ save }: { save: SaveData }) {
  if (save.evidence.length === 0) return <p>{t('casefile.empty')}</p>;
  return (
    <div className="casefile">
      {save.evidence.map((id) => {
        const item = EVIDENCE.find((entry) => entry.id === id);
        const label = item ? t(item.labelKey as MessageKey) : id;
        return (
          <figure key={id}>
            <BreakMark />
            <figcaption>{label}</figcaption>
          </figure>
        );
      })}
    </div>
  );
}

function BreakMark() {
  return (
    <svg className="glyph break" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M18 46 34 14l16 28" />
      <path d="M12 18c8 10 6 18 2 24M46 12c-4 14 2 22 10 26" />
    </svg>
  );
}

function sheetLabel(overlay: SaveData['overlay']): string {
  if (overlay === 'lexicon') return t('menu.lexicon');
  if (overlay === 'settings') return t('settings.heading');
  if (overlay === 'casefile') return t('menu.casefile');
  return t('use.choose');
}

export function hintMark(
  hint: { level: number; anchor: string; wordId: string | null },
  anchor: string,
  wordId?: string,
): string {
  if (hint.level < 2 || hint.anchor !== anchor) return '';
  if (wordId && hint.wordId !== wordId) return '';
  return hint.level >= 3 ? 'hint-near hint-paw' : 'hint-near';
}
