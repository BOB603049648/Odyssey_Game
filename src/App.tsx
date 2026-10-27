import { useState } from 'react';
import { primeAudio } from './audio/placeholder';
import { useGame } from './stores/gameStore';
import { t } from './ui/i18n';
import { IslandScreen } from './ui/IslandScreen';
import { MuralScreen } from './ui/MuralScreen';
import { PrologueScreen } from './ui/PrologueScreen';
import { TitleScreen } from './ui/TitleScreen';

export function App() {
  const save = useGame((state) => state.save);
  const dispatch = useGame((state) => state.dispatch);
  const [atTitle, setAtTitle] = useState(true);

  return (
    <>
      <div className="rotate-hint" role="note">
        {t('rotate.hint')}
      </div>
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
          />
        ) : save.screen === 'mural' ? (
          <MuralScreen save={save} dispatch={dispatch} />
        ) : (
          <IslandScreen save={save} dispatch={dispatch} onTitle={() => setAtTitle(true)} />
        )}
      </main>
    </>
  );
}
