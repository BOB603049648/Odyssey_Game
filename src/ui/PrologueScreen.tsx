import { useEffect } from 'react';
import { playMeow } from '../audio/placeholder';
import { t, type MessageKey } from './i18n';
import { CatMark } from './companion/CatMark';
import { EnterVeil, PlateStack } from './Plate';
import { useCrossfade } from './useCrossfade';

const LINES: MessageKey[] = ['prologue.0', 'prologue.1', 'prologue.2', 'prologue.3'];
const STILLS = ['art.pro.storm', 'art.pro.dark', 'art.pro.break', 'art.pro.tide'] as const;

export function PrologueScreen({ step, onAdvance }: { step: number; onAdvance: () => void }) {
  useEffect(() => {
    if (step === 1) playMeow();
  }, [step]);

  const line = LINES[step] ?? 'prologue.0';
  const plates = useCrossfade(STILLS[step] ?? STILLS[0]);
  return (
    <section className="prologue" data-testid="prologue" data-prologue-step={step}>
      <PlateStack plate={plates.current} previous={plates.previous} />
      <EnterVeil />
      <p className="eyebrow">{t('scene.prologue')}</p>
      {step === 3 ? <CatMark look="ahead" state="walk" /> : null}
      <div className="hud-caption" key={step}>
        <p className="caption">{t(line)}</p>
        <button type="button" className="btn primary" onClick={onAdvance}>
          {step >= 3 ? t('menu.ashore') : t('menu.next')}
        </button>
      </div>
    </section>
  );
}
