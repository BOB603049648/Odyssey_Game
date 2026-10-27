import { caseIsFull, type EndingId } from '../core/endings';
import type { Action } from '../core/reduce';
import type { SaveData } from '../core/schema';
import { CatMark, knotMark } from './companion/CatMark';
import { t, type MessageKey } from './i18n';

const ENDING_LABEL: Record<EndingId, MessageKey> = {
  'false-home': 'ending.false-home',
  'new-interpreter': 'ending.new-interpreter',
  'restart-echo': 'ending.restart-echo',
};

function endingId(save: SaveData): EndingId | null {
  const value = save.flags['fin.flag.ending'];
  if (value === 'false-home' || value === 'new-interpreter' || value === 'restart-echo') return value;
  return null;
}

export function Finale({ save, dispatch }: { save: SaveData; dispatch: (action: Action) => void }) {
  if (save.overlay !== 'finale') return null;
  const ending = endingId(save);
  const full = caseIsFull(save);
  const named = ending === 'new-interpreter' || ending === 'restart-echo';
  return (
    <section
      className="cutscene finale-plate"
      data-testid="finale-plate"
      data-ending={ending ?? 'open'}
      data-case={full ? 'full' : 'thin'}
    >
      <CatMark
        look={ending === 'false-home' ? 'look-back' : 'ahead'}
        state={ending === 'false-home' || ending === 'restart-echo' ? 'look' : 'idle'}
        figure={ending === 'new-interpreter' ? 'kitten' : 'adult'}
        knot={knotMark(save.evidence)}
      />
      {ending ? <p className="caption">{t(ENDING_LABEL[ending])}</p> : full ? null : <p className="caption">{t('ending.thin')}</p>}
      {named ? (
        <p className="caption" data-testid="ending-name">
          {t('ending.speakName')}
        </p>
      ) : null}
      {ending ? null : (
        <div className="choices">
          <button type="button" className="btn primary" data-testid="ending-deny" onClick={() => dispatch({ type: 'choose-ending', choice: 'deny' })}>
            {t('ending.home')}
          </button>
          {full ? (
            <>
              <button type="button" className="btn" data-testid="ending-stay" onClick={() => dispatch({ type: 'choose-ending', choice: 'stay' })}>
                {t('ending.stay')}
              </button>
              <button
                type="button"
                className="btn"
                data-testid="ending-restart"
                onClick={() => dispatch({ type: 'choose-ending', choice: 'restart' })}
              >
                {t('ending.restart')}
              </button>
            </>
          ) : null}
        </div>
      )}
      <button type="button" className="btn" onClick={() => dispatch({ type: 'close-overlay' })}>
        {t('menu.close')}
      </button>
    </section>
  );
}
