import { useEffect } from 'react';
import { BIRDS, variation } from './soundBank';
import { useAudio } from './useSoundscape';
import { loadSound, type SoundId } from './sounds';
import { soundScope } from './soundScope';

export function useSceneDetails(scene: string | null, running: boolean) {
  const audio = useAudio();
  const enabled = running && audio.status === 'ready' && !audio.muted && audio.volume > 0 && (audio.ambience ?? 1) > 0;
  useEffect(() => {
    if (!scene || !enabled) return;
    const birds = scene === 'dba.scene.yard' || scene === 'dba.scene.path';
    const wood = scene === 'dba.scene.hall' || scene === 'dba.scene.camp';
    if (!birds && !wood) return;
    const bank: readonly SoundId[] = birds ? BIRDS : ['wood-creak'];
    for (const id of bank) void loadSound(id);
    const scope = soundScope(); let previous: SoundId | undefined;
    const cue = () => {
      const id = variation(bank,previous); previous=id;
      scope.play(id, { level: birds ? .32 : .28, pan: (Math.random()-.5)*1.2 });
      scope.after(9000+Math.random()*14000,cue);
    };
    scope.after(3500+Math.random()*3500,cue);
    return () => scope.dispose();
  }, [scene, enabled]);
}
