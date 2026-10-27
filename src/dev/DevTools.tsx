import { useState } from 'react';
import { ENDINGS } from '../content/catalog';
import { ISLAND_SCENES } from '../core/island';
import type { Action } from '../core/reduce';
import type { EndingContent, SaveData } from '../core/schema';
import { t, type MessageKey } from '../ui/i18n';

export function DevTools({
  save,
  dispatch,
}: {
  save: SaveData;
  dispatch: (action: Action) => void;
}) {
  const [open, setOpen] = useState(false);
  const forced = save.flags['dev.forceEnding'];
  const forcedEnding = ENDINGS.find((ending) => ending.id === forced);
  return (
    <div className="debug-dock">
      <button type="button" className="btn" data-testid="debug-toggle" onClick={() => setOpen((value) => !value)}>
        调试
      </button>
      {open ? (
        <div className="debug-panel" data-testid="debug-panel">
          <div className="row">
            {ISLAND_SCENES.map((scene) => (
              <button
                key={scene}
                type="button"
                className="btn"
                data-testid={`debug-${scene.split('.').at(-1)}`}
                onClick={() => dispatch({ type: 'debug-scene', scene })}
              >
                {scene.split('.').at(-1)}
              </button>
            ))}
          </div>
          <div className="row">
            <button type="button" className="btn" data-testid="debug-learn" onClick={() => dispatch({ type: 'debug-learn-next' })}>
              学会下一词
            </button>
            <button type="button" className="btn" data-testid="debug-evidence" onClick={() => dispatch({ type: 'debug-evidence', id: 'myp.ev.main' })}>
              主证物
            </button>
            <button
              type="button"
              className="btn"
              data-testid="debug-hotspots"
              onClick={() => dispatch({ type: 'debug-hotspots', value: save.flags['dev.hotspots'] !== true })}
            >
              热区
            </button>
          </div>
          <div className="row">
            {ENDINGS.map((ending) => (
              <button
                key={ending.id}
                type="button"
                className="btn"
                data-testid={`debug-ending-${ending.id}`}
                onClick={() => dispatch({ type: 'debug-ending', id: ending.id as EndingContent['id'] })}
              >
                {t(ending.labelKey as MessageKey)}
              </button>
            ))}
          </div>
          {forcedEnding ? <p data-testid="debug-ending-label">{t(forcedEnding.labelKey as MessageKey)}</p> : null}
        </div>
      ) : null}
    </div>
  );
}
