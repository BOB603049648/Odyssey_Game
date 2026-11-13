import { lazy, Suspense, useState } from 'react';
import { primeAudio } from './audio/placeholder';
import { useGame } from './stores/gameStore';
import { Cutscenes } from './ui/Cutscenes';
import { IslandScreen } from './ui/IslandScreen';
import { MuralScreen } from './ui/MuralScreen';
import { PrologueScreen } from './ui/PrologueScreen';
import { TitleScreen } from './ui/TitleScreen';
import { t } from './ui/i18n';

const DevTools = import.meta.env.DEV ? lazy(() => import('./dev/DevTools').then((mod) => ({ default: mod.DevTools }))) : null;

export function App() {
  const save = useGame((state) => state.save);
  const saveFailed = useGame((state) => state.saveFailed);
  const dispatch = useGame((state) => state.dispatch);
  const [atTitle, setAtTitle] = useState(true);

  return (
    <>
      <main className="stage">
        {atTitle ? (
          <TitleScreen
            canContinue={save.screen !== 'title'}
            showGloss={save.settings.showGloss}
            onNew={() => {
              primeAudio();
              dispatch({ type: 'new-game' });
              setAtTitle(false);
            }}
            onContinue={() => {
              primeAudio();
              setAtTitle(false);
            }}
            onToggleGloss={(value) => dispatch({ type: 'set-show-gloss', value })}
          />
        ) : save.screen === 'prologue' ? (
          <PrologueScreen
            step={save.prologueStep}
            onAdvance={() => dispatch({ type: 'advance-prologue' })}
            onBack={() => dispatch({ type: 'previous-prologue' })}
            onSkip={() => dispatch({ type: 'skip-prologue' })}
          />
        ) : save.screen === 'mural' ? (
          <MuralScreen save={save} dispatch={dispatch} />
        ) : (
          <IslandScreen save={save} dispatch={dispatch} onTitle={() => setAtTitle(true)} />
        )}
        {atTitle ? null : <Cutscenes save={save} dispatch={dispatch} />}
      </main>
      {saveFailed ? (
        <p className="save-warning" role="status">
          {t('save.failed')}
        </p>
      ) : null}
      {DevTools ? (
        <Suspense fallback={null}>
          <DevTools save={save} dispatch={dispatch} />
        </Suspense>
      ) : null}
    </>
  );
}
