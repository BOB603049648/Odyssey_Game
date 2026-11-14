import { useState } from 'react';
import { LEXEMES } from '../content/catalog';
import { isLayerUnlocked, learnedCount, requirementsMet } from '../core/conditions';
import { hintPresentation } from '../core/hints';
import { reviewChoices, reviewTarget } from '../core/island';
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
import { ConceptScene } from './ConceptScene';
import { meaningChoices } from '../core/conceptChoices';
import { LearningJourney } from './LearningJourney';

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
  const choices = reviewChoices(save);
  const [attempt, setAttempt] = useState<{ target: string; answer: string } | null>(null);
  const canReview = Object.values(save.words).filter((word) => isLearnedState(word.state)).length >= 2;
  const cells = LEXEMES.filter((lexeme) => lexeme.layer === save.activeLayer);
  const objects = [...cells].reverse().filter((lexeme) => {
    const progress = save.words[lexeme.id];
    return progress && !isLearnedState(progress.state) && requirementsMet(lexeme, save.words);
  });
  const question = objects.find(lexeme => lexeme.id === save.selectedCellId) ?? objects.at(-1);
  const learned = LEXEMES.filter((lexeme) => isLearnedState(save.words[lexeme.id]?.state));
  const available = [...cells.filter(lexeme => requirementsMet(lexeme, save.words)), ...learned];
  const orderedScenes = question ? meaningChoices(question.id, available.map(lexeme => lexeme.id), 3)
    .map(id => LEXEMES.find(lexeme => lexeme.id === id)!) : [];
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
          <h1 className="mural-title">石壁上的生活</h1>
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
      {!reviewing ? <LearningJourney save={save} dispatch={dispatch} /> : null}
      <div className="mural-guidance" data-testid="mural-guidance">
        <p role="status">{reviewing ? (save.feedback.kind === 'no' ? t('mural.reviewMiss') : t('mural.reviewHelp')) : complete
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
        <div className="review-exercise" data-testid="review-wall">
          {target && choices.length > 1 ? <>
            <div className="review-question"><ConceptScene key={target} id={target} /></div>
            <div className="review-answers">{choices.map(id => <button key={id} type="button"
              className={`cell ${hintMark(hint, 'mural-cell', id)}${attempt?.target === target && attempt.answer === id && save.feedback.kind === 'no' ? ' incorrect' : ''}`}
              data-testid={`review-${id}`} aria-label={`刻符 ${choices.indexOf(id) + 1}`}
              onClick={() => { setAttempt({ target, answer: id }); dispatch({ type: 'review-tap', wordId: id }); }}>
              <Glyph id={id} />
              {save.settings.showGloss ? <span className="gloss">{LEXEMES.find(lexeme => lexeme.id === id)?.gloss}</span> : null}
            </button>)}</div>
          </> : <p>{t(target ? 'mural.reviewNeedMore' : 'mural.review.empty')}</p>}
        </div>
      ) : (
        <>
          <div className="grid glyph-wall">
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
          <div className="tray story-tray">
            {orderedScenes.map((lexeme) => (
              <button
                key={lexeme.id}
                type="button"
                className={`object ${hintMark(hint, 'mural-object', lexeme.id)}`}
                disabled={!save.selectedCellId}
                data-testid={`object-${lexeme.id}`}
                onClick={() => dispatch({ type: 'match-object', wordId: lexeme.id })}
              >
                <ConceptScene id={lexeme.id} />
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
