import { useEffect, useRef } from 'react';
import { playMeow } from '../audio/placeholder';
import { t, type MessageKey } from './i18n';
import { EnterVeil, PlateStack } from './Plate';

const LINES: MessageKey[] = ['prologue.0', 'prologue.1', 'prologue.2', 'prologue.3'];
const STILLS = ['art.pro.storm', 'art.pro.dark', 'art.pro.break', 'art.pro.tide'] as const;

export function PrologueScreen({ step, onAdvance }: { step: number; onAdvance: () => void }) {
  const meowed = useRef(false);
  useEffect(() => {
    if (step !== 1 || meowed.current) return;
    meowed.current = true;
    playMeow();
  }, [step]);

  const frame = Math.min(3, Math.max(0, step));
  const line = LINES[frame] ?? 'prologue.0';
  const still = STILLS[frame] ?? STILLS[0];
  return (
    <section className="prologue" data-testid="prologue" data-prologue-step={frame} data-still={still}>
      <PlateStack key={`plate-${still}`} plate={still} previous={null} />
      <EnterVeil />
      <p className="eyebrow">{t('scene.prologue')}</p>
      <div className="hud-caption" key={`line-${still}`} data-caption={line}>
        <p className="caption">{t(line)}</p>
        <button type="button" className="btn primary" onClick={onAdvance}>
          {frame >= 3 ? t('menu.ashore') : t('menu.next')}
        </button>
      </div>
    </section>
  );
}
