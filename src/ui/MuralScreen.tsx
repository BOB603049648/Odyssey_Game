import { LEXEMES } from '../content/catalog';
import { isLayerUnlocked, learnedCount, requirementsMet } from '../core/conditions';
import { hintPresentation } from '../core/hints';
import { reviewTarget } from '../core/island';
import type { Action } from '../core/reduce';
import type { MuralLayer, SaveData } from '../core/schema';
import { isLearnedState } from '../core/words';
import { Companion } from './Companion';
import { knotMark } from './companion/CatMark';
import { hintMark, OverlaySheet } from './IslandScreen';
import { Glyph } from './glyphs';
import { t } from './i18n';
import { EnterVeil, PlateStack } from './Plate';
import { useFeedbackFx } from './useFeedbackFx';
import { useIdleHint } from './useIdleHint';

const LAYERS: MuralLayer[] = ['concrete', 'action', 'relation', 'abstract'];
const BETRAY = 'dba.word.betray';

export function MuralScreen({
  save,
  dispatch,
}: {
  save: SaveData;
  dispatch: (action: Action) => void;
}) {
  const hint = hintPresentation(save);
  const { shake, purr } = useFeedbackFx(save.feedback);
  useIdleHint(save, dispatch);
  const reviewing = save.muralMode === 'review';
  const target = reviewTarget(save);
  const canReview = Object.values(save.words).some((word) => isLearnedState(word.state));
  const cells = LEXEMES.filter((lexeme) => lexeme.layer === save.activeLayer);
  const objects = [...cells].reverse().filter((lexeme) => {
    const progress = save.words[lexeme.id];
    return progress && !isLearnedState(progress.state) && requirementsMet(lexeme, save.words);
  });
  const learned = LEXEMES.filter((lexeme) => isLearnedState(save.words[lexeme.id]?.state));
  const complete = cells.every(lexeme => isLearnedState(save.words[lexeme.id]?.state));
  const nextLayer = LAYERS.find(layer => LAYERS.indexOf(layer) > LAYERS.indexOf(save.activeLayer) &&
    isLayerUnlocked(layer, save.words, LEXEMES));

  return (
    <section className={shake ? 'mural-screen shake' : 'mural-screen'}>
      <PlateStack plate="mural" previous={null} />
      <EnterVeil />
      <header className="bar">
        <div>
          <p className="eyebrow">{t('scene.mural')}</p>
        </div>
        <div className="row">
          {isLearnedState(save.words[BETRAY]?.state) ? (
            <button type="button" className="btn" data-testid="mural-tattoo" onClick={() => dispatch({ type: 'collect-tattoo' })}>
              {t('mural.tattoo')}
            </button>
          ) : null}
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
              aria-selected={!reviewing && save.activeLayer === layer}
              disabled={!open}
              className={!reviewing && save.activeLayer === layer ? 'band on' : 'band'}
              onClick={() => dispatch({ type: 'select-layer', layer })}
            >
              <span>{t('mural.band')} {index + 1}</span>
              <small>{open ? `${learnedCount(layer, save.words, LEXEMES)}/${LEXEMES.filter(l => l.layer === layer).length}` : t('mural.locked')}</small>
            </button>
          );
        })}
        <button
          type="button"
          role="tab"
          className={reviewing ? 'band review on' : 'band review'}
          aria-label={t('mural.review')}
          aria-selected={reviewing}
          disabled={!canReview}
          data-testid="mural-review"
          onClick={() => dispatch({ type: 'select-review' })}
        >
          <span>{t('mural.review')}</span>
        </button>
      </div>
      <div className="mural-guidance" data-testid="mural-guidance">
        <p role="status">{reviewing ? t('mural.reviewHelp') : complete
          ? t(nextLayer ? 'mural.complete' : 'mural.allComplete')
          : t(save.selectedCellId ? 'mural.selected' : 'mural.instructions')}</p>
        {!reviewing ? <p className="mural-progress">{t('mural.progress')} {learnedCount(save.activeLayer, save.words, LEXEMES)}/{cells.length}</p> : null}
        {!reviewing && complete ? <div className="row">
          {nextLayer ? <button type="button" className="btn primary" data-testid="mural-next-band"
            onClick={() => dispatch({ type: 'select-layer', layer: nextLayer })}>{t('mural.nextBand')}</button> : null}
          <button type="button" className="btn" onClick={() => dispatch({ type: 'close-screen' })}>{t('mural.return')}</button>
        </div> : null}
      </div>
      {reviewing ? (
        <div className="grid" data-testid="review-wall">
          {target ? (
            <button
              type="button"
              className={`cell ${hintMark(hint, 'mural-cell', target)}`}
              data-testid={`review-${target}`}
              onClick={() => dispatch({ type: 'review-tap', wordId: target })}
            >
              <Glyph id={target} />
              {save.settings.showGloss ? (
                <span className="gloss">{LEXEMES.find((lexeme) => lexeme.id === target)?.gloss}</span>
              ) : null}
            </button>
          ) : (
            <p>{t('mural.review.empty')}</p>
          )}
        </div>
      ) : (
        <>
          <div className="grid">
            {cells.map((lexeme) => {
              const known = isLearnedState(save.words[lexeme.id]?.state);
              const blurred = !requirementsMet(lexeme, save.words);
              const className = [
                'cell',
                known ? 'learned' : '',
                blurred ? 'blurred' : '',
                hintMark(hint, 'mural-cell', lexeme.id),
              ]
                .filter(Boolean)
                .join(' ');
              const gloss = save.settings.showGloss ? <span className="gloss">{lexeme.gloss}</span> : null;
              if (known || blurred) {
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
        </>
      )}
      <Companion
        level={hint.level}
        anchor={hint.anchor}
        pose={hint.pose}
        purr={purr}
        knot={knotMark(save.evidence)}
        onAsk={() => dispatch({ type: 'request-hint' })}
      />
      <OverlaySheet save={save} dispatch={dispatch} learned={learned} hint={hint} />
    </section>
  );
}
