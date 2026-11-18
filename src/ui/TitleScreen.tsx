import {scriptActive,scriptCount} from '../core/islandScript';
import { useEffect, useState } from 'react';
import { initialProloguePortrait, loadProloguePreview, prologueArtId } from '../content/prologueAssets';
import { useGame } from '../stores/gameStore';
import { RELEASE_SCOPE } from '../release';
import { GameDialog } from './GameDialog';
import { SaveTools } from './SaveTools';
import { AudioSettings, AudioToggle } from './AudioControls';
import { GlossSwitch } from './GlossSwitch';
import { t } from './i18n';
import { EnterVeil, PlateStack } from './Plate';
import { InterfaceIcon } from './InterfaceIcon';
import { folioForScene } from '../content/readingJourney';
import { readingCount } from '../core/reading';

export function TitleScreen({
  canContinue,
  showGloss,
  onNew,
  onContinue,
  onReplay,
  onToggleGloss,
}: {
  canContinue: boolean;
  showGloss: boolean;
  onNew: () => void;
  onContinue: () => void;
  onReplay?: () => void;
  onToggleGloss: (value: boolean) => void;
}) {
  const [confirmNew, setConfirmNew] = useState(false);
  const [manageSave, setManageSave] = useState(false);
  const [soundSettings, setSoundSettings] = useState(false);
  const save = useGame(state => state.save);
  const resumeLabel = save.flags['v01.completed'] ? '雾汀岛 · 旅程已完成'
    : save.screen==='prologue' ? `序章 · 第 ${save.prologueStep+1} 幕`
    : `${folioForScene(save.currentScene).place} · ${scriptActive(save)?'已印证':'已核读'} ${scriptActive(save)?scriptCount(save):readingCount(save)} / 6 ${scriptActive(save)?'组':'叶'}`;
  useEffect(() => {
    if (save.screen === 'title' || save.screen === 'prologue') {
      const step = save.screen === 'prologue' ? save.prologueStep : 0;
      void loadProloguePreview(prologueArtId(step, initialProloguePortrait()), 'low');
    }
  }, [save.screen, save.prologueStep]);
  return (
    <section className="title-screen">
      <PlateStack plate="keyart" previous={null} />
      <EnterVeil />
      <div className="title-masthead"><InterfaceIcon name="compass" /><span>山海之间 · 字有所归</span></div>
      <div className="title-block">
        <p className="title-chapter">第一章 <span /> 留与归</p>
        <h1>{t('meta.title')}</h1>
        <p className="latin-title" aria-hidden="true">
          <span />
          Odyssey
          <span />
        </p>
        <p className="tagline">{t('meta.tagline')}</p>
        {canContinue ? <p className="title-resume-note"><span className="save-beacon" />{resumeLabel}<span>旅程已留存</span></p>:<p className="title-resume-note">从潮声中醒来，循着文字，走向彼此。</p>}
        <div className="row title-actions">
          <button type="button" className={`btn ${canContinue?'':'primary'}`} onClick={() => canContinue ? setConfirmNew(true) : onNew()}>
            {t('menu.newGame')}<InterfaceIcon name="arrow" />
          </button>
          <button type="button" className={`btn ${canContinue?'primary':''}`} onClick={onContinue} disabled={!canContinue}>
            {t('menu.continue')}<InterfaceIcon name="arrow" />
          </button>
        </div>
        <div className="title-preferences"><AudioToggle compact />
          {onReplay && <button className="title-quiet-button" type="button" onClick={onReplay}>{t('prologue.watch')}</button>}
          <button className="title-quiet-button" type="button" onClick={()=>setSoundSettings(true)}><InterfaceIcon name="settings" />声音设置</button>
          <button className="title-quiet-button" type="button" onClick={() => setManageSave(true)}><InterfaceIcon name="case" />存档与恢复</button>
        </div>
        <GlossSwitch checked={showGloss} onChange={onToggleGloss} />
      </div>
      <footer className="title-colophon"><span>ODYSSEY <i /> {RELEASE_SCOPE}</span><span>一段关于文字、记忆与同行的旅程</span></footer>
      {soundSettings ? <GameDialog title="声音设置" onClose={()=>setSoundSettings(false)}><AudioSettings compact /></GameDialog> : null}
      {manageSave ? <GameDialog title="存档与恢复" onClose={() => setManageSave(false)}>
        <SaveTools save={save} /><div className="row"><button className="btn" onClick={() => setManageSave(false)}>完成</button></div>
      </GameDialog> : null}
      {confirmNew ? <GameDialog title="重新开始旅程？" onClose={() => setConfirmNew(false)}>
        <p>当前旅程将被替换。你可以取消，先在“存档与恢复”中备份。</p>
        <div className="row"><button className="btn" onClick={() => setConfirmNew(false)}>取消</button>
        <button className="btn primary" onClick={onNew}>确认重新开始</button></div>
      </GameDialog> : null}
    </section>
  );
}
