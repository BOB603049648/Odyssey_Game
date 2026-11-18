import {scriptActive,scriptCount} from '../core/islandScript';
import { useEffect, useId, useRef, useState } from 'react';
import { expeditionGoal } from '../core/expedition';
import { SURVIVAL_BEATS } from '../core/island';
import type { SaveData } from '../core/schema';
import type { Action } from '../core/reduce';
import { t } from './i18n';
import { gateLabel } from './spotViews';
import { isIslandScene } from '../core/island';
import {readingCount} from '../core/reading';
import { InterfaceIcon } from './InterfaceIcon';

export function AdventureHud({ save, dispatch, onTitle, learned }: {
  save: SaveData; dispatch: (action: Action) => void; onTitle: () => void; learned: number;
}) {
  const goal = expeditionGoal(save);
  const language=scriptActive(save);
  const scene = isIslandScene(save.currentScene) ? save.currentScene : 'dba.scene.shore';
  const progress = SURVIVAL_BEATS.filter(beat => save.beats[`dba.beat.${beat}`]).length;
  const [folded, setFolded] = useState(() => typeof window.matchMedia==='function' && window.matchMedia('(max-width: 640px), (max-height: 520px)').matches);
  const detailsId=useId();
  return <div className="adventure-hud" data-muted={save.overlay !== 'none' ? 'yes' : 'no'}>
    <div className="chapter-heading"><span className="chapter-number">I</span><div>
      <p>雾汀岛 · 留与归</p><h1>{gateLabel(scene)}</h1>
    </div></div>
    <nav className="adventure-menu" aria-label="旅途菜单">
      <button type="button" aria-label={t('menu.title')} title={t('menu.title')} onClick={onTitle}><InterfaceIcon name="home" /><span className="menu-label">{t('menu.title')}</span></button>
      {!language?<button type="button" aria-label={t('menu.lexicon')} onClick={() => dispatch({ type: 'open-overlay', overlay: 'lexicon' })}>
        <InterfaceIcon name="book" /><span className="menu-label">{t('menu.lexicon')}</span><span className="menu-count" aria-hidden="true">{learned}</span>
      </button>:null}
      <button type="button" aria-label={t('menu.casefile')} title={t('menu.casefile')} onClick={() => dispatch({ type: 'open-overlay', overlay: 'casefile' })}><InterfaceIcon name="case" /><span className="menu-label">{t('menu.casefile')}</span></button>
      <button type="button" aria-label={t('menu.settings')} title={t('menu.settings')} onClick={() => dispatch({ type: 'open-overlay', overlay: 'settings' })}><InterfaceIcon name="settings" /><span className="menu-label">{t('menu.settings')}</span></button>
    </nav>
    <div className="expedition-intent" data-testid="current-goal" data-folded={folded} key={goal.title}>
      <div className="intent-topline"><p className="intent-label"><InterfaceIcon name="compass" />此刻的旅程</p>
        <button type="button" className="intent-fold" aria-label={folded?'展开行程':'收起行程'} aria-expanded={!folded} aria-controls={detailsId} onClick={()=>setFolded(!folded)}><InterfaceIcon name="fold" /></button></div>
      <h2>{goal.title}</h2><p id={detailsId} className="intent-detail" hidden={folded}>{goal.detail}</p>
      <button type="button" className="reading-entry" data-testid="open-reading" onClick={()=>dispatch(language?{type:'open-overlay',overlay:'journal'}:{type:'open-reading'})}>
        <InterfaceIcon name="book" /><span>{language?'展开旅人手记':'展开残卷手记'}</span><small>{language?scriptCount(save):readingCount(save)} / 6 {language?'组':'叶'}</small><InterfaceIcon name="arrow" />
      </button>
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
