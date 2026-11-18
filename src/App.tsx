import { useGameAudio } from './audio/useGameAudio';
import { useSceneDetails } from './audio/useSceneDetails';
import './ui/release.css';
import { lazy, Suspense, useEffect, useState } from 'react';
import { installAudioRecovery, primeAudio } from './audio/mixer';
import { AudioRecoveryNotice } from './ui/AudioControls';
import type { SoundId } from './audio/sounds';
import { useSoundscape } from './audio/useSoundscape';
import { usePagePresentation } from './ui/useCinematicClock';
import { useGame } from './stores/gameStore';
import { completionPending, Cutscenes } from './ui/Cutscenes';
import { PrologueScreen } from './ui/PrologueScreen';
import { TitleScreen } from './ui/TitleScreen';
import { ScreenLoader, ScreenLoadBoundary } from './ui/ScreenLoader';
import './ui/interface.css';
import { t } from './ui/i18n';

const DevTools = import.meta.env.DEV ? lazy(() => import('./dev/DevTools').then((mod) => ({ default: mod.DevTools }))) : null;
// The title/prologue are usable before downloading the island and reading UI.
const IslandScreen = lazy(() => import('./ui/IslandScreen').then(mod => ({ default: mod.IslandScreen })));
const MuralScreen = lazy(() => import('./ui/MuralScreen').then(mod => ({ default: mod.MuralScreen })));

export function App() {
  useEffect(installAudioRecovery, []);
  const save = useGame((state) => state.save);
  const saveGeneration = useGame(state => state.saveGeneration);
  const saveFailed = useGame((state) => state.saveFailed);
  const dispatch = useGame((state) => state.dispatch);
  const [atTitle, setAtTitle] = useState(true);
  // Rewatch is local presentation state. It never dispatches into the save.
  const [replayStep, setReplayStep] = useState<number | null>(null);
  const { visible } = usePagePresentation();
  const ambient: Record<string, SoundId> = {
    'dba.scene.shore': 'shore', 'dba.scene.camp': 'camp', 'dba.scene.yard': 'yard',
    'dba.scene.hall': 'hall', 'dba.scene.path': 'forest', 'dba.scene.night': 'night',
  };
  const soundscape = save.overlay === 'memory' ? 'memory' : ambient[save.currentScene] ?? null;
  const music = replayStep !== null ? null : atTitle ? 'theme-title' : completionPending(save) ? 'theme-resolve' : save.overlay === 'memory' ? 'theme-memory' : null;
  useSoundscape(music, visible, undefined, 0, atTitle);
  useGameAudio(save, !atTitle, visible, saveGeneration);
  useSceneDetails(!atTitle && save.screen === 'island' ? save.currentScene : null, visible && save.overlay === 'none' && !completionPending(save));
  const sound = useSoundscape(!atTitle && save.screen !== 'prologue' ? soundscape : null, visible);

  return (
    <>
      <main className="stage odyssey-ui">
        <ScreenLoadBoundary key={replayStep !== null ? 'rewatch' : atTitle ? 'title' : save.screen}>
        <Suspense fallback={<ScreenLoader />}>
        {replayStep !== null ? (
          <PrologueScreen step={replayStep}
            onAdvance={() => setReplayStep(value => value === null || value >= 3 ? null : value + 1)}
            onReplay={() => setReplayStep(0)} onSkip={() => setReplayStep(null)} skipLabel="prologue.returnTitle" />
        ) : atTitle ? (
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
            onReplay={() => { primeAudio(); setReplayStep(0); }}
            onToggleGloss={(value) => dispatch({ type: 'set-show-gloss', value })}
          />
        ) : save.screen === 'prologue' ? (
          <PrologueScreen
            step={save.prologueStep}
            onAdvance={() => dispatch({ type: 'advance-prologue' })}
            onReplay={() => dispatch({ type: 'replay-prologue' })}
            onSkip={() => dispatch({ type: 'skip-prologue' })}
          />
        ) : save.screen === 'mural' ? (
          <MuralScreen save={save} dispatch={dispatch} />
        ) : (
          <IslandScreen save={save} dispatch={dispatch} onTitle={() => setAtTitle(true)} />
        )}
        </Suspense>
        </ScreenLoadBoundary>
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
