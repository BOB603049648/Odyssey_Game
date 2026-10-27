import { LEXEMES } from '../content/catalog';
import { isLayerUnlocked, requirementsMet } from '../core/conditions';
import { hintPresentation } from '../core/hints';
import type { Action } from '../core/reduce';
import type { MuralLayer, SaveData } from '../core/schema';
import { isLearnedState } from '../core/words';
import { Companion } from './Companion';
import { hintMark } from './IslandScreen';
import { Glyph } from './glyphs';
import { t } from './i18n';
import { useFeedbackFx } from './useFeedbackFx';

const LAYERS: MuralLayer[] = ['concrete', 'action', 'relation', 'abstract'];

export function MuralScreen({
  save,
  dispatch,
}: {
  save: SaveData;
  dispatch: (action: Action) => void;
}) {
  const hint = hintPresentation(save);
  const { shake, purr } = useFeedbackFx(save.feedback);
  const cells = LEXEMES.filter((lexeme) => lexeme.layer === save.activeLayer);
  const objects = [...cells].reverse().filter((lexeme) => {
    const progress = save.words[lexeme.id];
    return progress && !isLearnedState(progress.state) && requirementsMet(lexeme, save.words);
  });

  return (
    <section className={shake ? 'mural shake' : 'mural'}>
      <header className="bar">
        <div>
          <p className="eyebrow">{t('scene.mural')}</p>
        </div>
        <div className="row">
          <button type="button" className="btn" onClick={() => dispatch({ type: 'close-screen' })}>
            {t('menu.back')}
          </button>
        </div>
      </header>
      <div className="bands" role="tablist">
        {LAYERS.map((layer, index) => {
          const open = isLayerUnlocked(layer, save.words, LEXEMES);
          return (
            <button
              key={layer}
              type="button"
              role="tab"
              aria-label={`${t('mural.band')} ${index + 1}`}
              aria-selected={save.activeLayer === layer}
              disabled={!open}
              className={save.activeLayer === layer ? 'band on' : 'band'}
              onClick={() => dispatch({ type: 'select-layer', layer })}
            >
              <span className="moss" />
            </button>
          );
        })}
      </div>
      <div className="grid">
        {cells.map((lexeme) => {
          const learned = isLearnedState(save.words[lexeme.id]?.state);
          const blurred = !requirementsMet(lexeme, save.words);
          const className = [
            'cell',
            learned ? 'learned' : '',
            blurred ? 'blurred' : '',
            hintMark(hint, 'mural-cell', lexeme.id),
          ]
            .filter(Boolean)
            .join(' ');
          const gloss = save.settings.showGloss ? <span className="gloss">{lexeme.gloss}</span> : null;
          if (learned || blurred) {
            return (
              <div key={lexeme.id} className={className} data-testid={`cell-${lexeme.id}`}>
                <Glyph id={lexeme.id} />
                {gloss}
              </div>
            );
          }
          return (
            <button
              key={lexeme.id}
              type="button"
              className={className}
              data-testid={`cell-${lexeme.id}`}
              aria-pressed={save.selectedCellId === lexeme.id}
              onClick={() => dispatch({ type: 'select-cell', wordId: lexeme.id })}
            >
              <Glyph id={lexeme.id} />
              {gloss}
            </button>
          );
        })}
      </div>
      <div className="tray">
        {objects.map((lexeme) => (
          <button
            key={lexeme.id}
            type="button"
            className={`object ${hintMark(hint, 'mural-object', lexeme.id)}`}
            data-testid={`object-${lexeme.id}`}
            onClick={() => dispatch({ type: 'match-object', wordId: lexeme.id })}
          >
            <Glyph id={lexeme.id} />
            {save.settings.showGloss ? <span className="gloss">{lexeme.gloss}</span> : null}
          </button>
        ))}
      </div>
      <Companion
        level={hint.level}
        anchor={hint.anchor}
        purr={purr}
        onAsk={() => dispatch({ type: 'request-hint' })}
      />
    </section>
  );
}
