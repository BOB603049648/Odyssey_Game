import './ui/release.css';
import { lazy, Suspense, useEffect, useState } from 'react';
import { installAudioRecovery, primeAudio } from './audio/mixer';
import { AudioRecoveryNotice } from './ui/AudioControls';
import type { SoundId } from './audio/sounds';
import { useSoundscape } from './audio/useSoundscape';
import { usePagePresentation } from './ui/useCinematicClock';
import { useGame } from './stores/gameStore';
import { Cutscenes } from './ui/Cutscenes';
import { IslandScreen } from './ui/IslandScreen';
import { MuralScreen } from './ui/MuralScreen';
import { PrologueScreen } from './ui/PrologueScreen';
import { TitleScreen } from './ui/TitleScreen';
import { t } from './ui/i18n';

const DevTools = import.meta.env.DEV ? lazy(() => import('./dev/DevTools').then((mod) => ({ default: mod.DevTools }))) : null;

export function App() {
  useEffect(installAudioRecovery, []);
  const save = useGame((state) => state.save);
  const saveFailed = useGame((state) => state.saveFailed);
  const dispatch = useGame((state) => state.dispatch);
  const [atTitle, setAtTitle] = useState(true);
  const { visible } = usePagePresentation();
  const ambient: Record<string, SoundId> = {
    'dba.scene.shore': 'shore', 'dba.scene.camp': 'camp', 'dba.scene.yard': 'shore',
    'dba.scene.hall': 'hall', 'dba.scene.path': 'forest', 'dba.scene.night': 'night',
  };
  const soundscape = save.overlay === 'memory' ? 'memory' : ambient[save.currentScene] ?? null;
  const sound = useSoundscape(!atTitle && save.screen !== 'prologue' ? soundscape : null, visible);

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
        {atTitle ? null : <Cutscenes save={save} dispatch={dispatch} onTitle={() => setAtTitle(true)} />}
      </main>
      {!atTitle && save.screen !== 'prologue' && <AudioRecoveryNotice failed={sound.status === 'failed'} retry={sound.retry} />}
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
