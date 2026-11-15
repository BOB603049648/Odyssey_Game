import { useEffect, useRef, useState } from 'react';
import { expeditionGoal } from '../core/expedition';
import { SURVIVAL_BEATS } from '../core/island';
import type { SaveData } from '../core/schema';
import type { Action } from '../core/reduce';
import { t } from './i18n';
import { gateLabel } from './spotViews';
import { isIslandScene } from '../core/island';

export function AdventureHud({ save, dispatch, onTitle, learned }: {
  save: SaveData; dispatch: (action: Action) => void; onTitle: () => void; learned: number;
}) {
  const goal = expeditionGoal(save);
  const scene = isIslandScene(save.currentScene) ? save.currentScene : 'dba.scene.shore';
  const progress = SURVIVAL_BEATS.filter(beat => save.beats[`dba.beat.${beat}`]).length;
  return <div className="adventure-hud" data-muted={save.overlay !== 'none' ? 'yes' : 'no'}>
    <div className="chapter-heading"><span className="chapter-number">I</span><div>
      <p>东巴岛 · 陌生的语言</p><h1>{gateLabel(scene)}</h1>
    </div></div>
    <nav className="adventure-menu" aria-label="旅途菜单">
      <button type="button" onClick={onTitle}>{t('menu.title')}</button>
      <button type="button" aria-label={t('menu.lexicon')} onClick={() => dispatch({ type: 'open-overlay', overlay: 'lexicon' })}>
        {t('menu.lexicon')}<span aria-hidden="true">{learned}</span>
      </button>
      <button type="button" onClick={() => dispatch({ type: 'open-overlay', overlay: 'casefile' })}>{t('menu.casefile')}</button>
      <button type="button" onClick={() => dispatch({ type: 'open-overlay', overlay: 'settings' })}>{t('menu.settings')}</button>
    </nav>
    <div className="expedition-intent" data-testid="current-goal" key={goal.title}>
      <p className="intent-label"><span aria-hidden="true">◇</span> 此刻的旅程</p>
      <h2>{goal.title}</h2><p>{goal.detail}</p>
      <button className="journey-status" data-testid="journey-status" type="button"
        onClick={() => dispatch({ type: 'open-overlay', overlay: 'casefile' })}>
        <span className="journey-marks" aria-hidden="true">{SURVIVAL_BEATS.map(beat => <i key={beat} data-done={save.beats[`dba.beat.${beat}`] ? 'yes' : 'no'} />)}</span>
        {save.beats['dba.beat.depart'] ? t('journey.finished') : `${t('journey.title')} ${progress}/4`}<span aria-hidden="true"> ↗</span>
      </button>
    </div>
  </div>;
}

/** A chapter event is acknowledged once, rather than leaving an old subtitle on screen forever. */
export function JourneyMoment({ save }: { save: SaveData }) {
  const previous = useRef(save.beats);
  const [moment, setMoment] = useState<typeof SURVIVAL_BEATS[number] | null>(null);
  useEffect(() => {
    const added = SURVIVAL_BEATS.find(beat => save.beats[`dba.beat.${beat}`] && !previous.current[`dba.beat.${beat}`]);
    previous.current = save.beats;
    if (!added) return;
    setMoment(added);
  }, [save.beats]);
  useEffect(() => {
    if (!moment) return;
    const timer = window.setTimeout(() => setMoment(null), 3600);
    return () => window.clearTimeout(timer);
  }, [moment]);
  if (!moment || save.overlay !== 'none') return null;
  return <div className="journey-moment" key={moment} role="status"><span>一段经历，留了下来</span><strong>{t(`journey.${moment}`)}</strong></div>;
}
