import { useEffect } from 'react';
import { playMeow } from '../audio/placeholder';
import { t, type MessageKey } from './i18n';
import { EnterVeil, PlateStack } from './Plate';
import { PrologueArt } from './scenes';
import { useCrossfade } from './useCrossfade';

const LINES: MessageKey[] = ['prologue.0', 'prologue.1', 'prologue.2', 'prologue.3'];

export function PrologueScreen({ step, onAdvance }: { step: number; onAdvance: () => void }) {
  useEffect(() => {
    if (step === 1) playMeow();
  }, [step]);

  const line = LINES[step] ?? 'prologue.0';
  const plates = useCrossfade(`prologue-${step}`);
  return (
    <section className="prologue" data-testid="prologue" data-prologue-step={step}>
      <PlateStack plate={plates.current} previous={plates.previous} />
      <EnterVeil />
      <p className="eyebrow">{t('scene.prologue')}</p>
      <PrologueArt step={step} />
      <div className="hud-caption" key={step}>
        <p className="caption">{t(line)}</p>
        <button type="button" className="btn primary" onClick={onAdvance}>
          {step >= 3 ? t('menu.ashore') : t('menu.next')}
        </button>
      </div>
    </section>
  );
}
