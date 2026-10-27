import { MEMORIES } from '../content/catalog';
import type { Action } from '../core/reduce';
import type { SaveData } from '../core/schema';
import { t } from './i18n';
import { EnterVeil, PlateStack } from './Plate';
import { CatMark } from './companion/CatMark';
import { useCrossfade } from './useCrossfade';

const FRAMES = MEMORIES[0]?.frames ?? ['rain', 'kitten', 'cloak'];

export function Cutscenes({
  save,
  dispatch,
}: {
  save: SaveData;
  dispatch: (action: Action) => void;
}) {
  const frame = FRAMES[save.cutsceneStep] ?? 'rain';
  const plate =
    save.overlay === 'depart' ? 'keyart' : frame === 'kitten' ? 'prologue-1' : frame === 'cloak' ? 'prologue-2' : 'myp.scene.night';
  const plates = useCrossfade(plate);
  if (save.overlay === 'depart') {
    return (
      <section className="cutscene" data-testid="depart-plate" data-chart="chart.nmn">
        <PlateStack plate={plates.current} previous={plates.previous} />
        <EnterVeil />
        <div className="plate depart-art">
          <svg viewBox="0 0 640 320" aria-hidden="true">
            <path d="M40 220h560M80 220V150h180v70" />
            <path d="M420 80l140 40-30 90H430z" />
            <path d="M470 120h40M490 100v40" />
            <path d="M520 200l70-16" />
          </svg>
          <CatMark look="depart" state="carry" />
        </div>
        <button type="button" className="btn primary" onClick={() => dispatch({ type: 'advance-cutscene' })}>
          {t('menu.next')}
        </button>
      </section>
    );
  }
  if (save.overlay !== 'memory') return null;
  const last = save.cutsceneStep >= FRAMES.length - 1;
  return (
    <section className="cutscene" data-testid="memory-plate" data-frame={frame}>
      <PlateStack plate={plates.current} previous={plates.previous} />
      <EnterVeil />
      <MemoryFrame frame={frame} />
      <CatMark variant="silhouette" state="idle" />
      <button type="button" className="btn primary" onClick={() => dispatch({ type: 'advance-cutscene' })}>
        {last ? t('menu.close') : t('menu.next')}
      </button>
    </section>
  );
}

function MemoryFrame({ frame }: { frame: string }) {
  if (frame === 'kitten') {
    return (
      <svg className="plate memory-art" viewBox="0 0 640 320" data-testid="memory-art" aria-hidden="true">
        <path d="M40 70h560M70 70v40M570 70v40" />
        <path d="M250 190c18-28 48-26 58 2 14-20 40-16 48 8 8 22-12 36-32 32-22 10-58 6-74-42z" />
        <path d="M120 40c10 24 6 12 18 30M300 24c8 20 4 10 14 22" />
      </svg>
    );
  }
  if (frame === 'cloak') {
    return (
      <svg className="plate memory-art" viewBox="0 0 640 320" data-testid="memory-art" aria-hidden="true">
        <path d="M180 70c80 20 160 20 280 0l-20 180H220z" />
        <path d="M250 160c20-16 40-14 52 4 10-14 28-12 36 4" />
        <path d="M40 40c12 28 8 14 20 36" />
      </svg>
    );
  }
  return (
    <svg className="plate memory-art" viewBox="0 0 640 320" data-testid="memory-art" aria-hidden="true">
      <path d="M20 90h600M60 90v36M580 90v36" />
      <path d="M40 40c16 30 10 16 24 40M200 20c12 26 8 12 18 32M420 36c14 24 8 14 20 30" />
      <path className="wave" d="M0 230c80 20 120-20 200 0s140 24 220-8 140-10 220 12v86H0z" />
    </svg>
  );
}
