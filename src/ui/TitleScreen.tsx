import { useState } from 'react';
import { useGame } from '../stores/gameStore';
import { RELEASE_VERSION, RELEASE_SCOPE } from '../release';
import { GameDialog } from './GameDialog';
import { SaveTools } from './SaveTools';
import { AudioSettings } from './AudioControls';
import { GlossSwitch } from './GlossSwitch';
import { t } from './i18n';
import { EnterVeil, PlateStack } from './Plate';

export function TitleScreen({
  canContinue,
  showGloss,
  onNew,
  onContinue,
  onToggleGloss,
}: {
  canContinue: boolean;
  showGloss: boolean;
  onNew: () => void;
  onContinue: () => void;
  onToggleGloss: (value: boolean) => void;
}) {
  const [confirmNew, setConfirmNew] = useState(false);
  const [manageSave, setManageSave] = useState(false);
  const save = useGame(state => state.save);
  return (
    <section className="title-screen">
      <PlateStack plate="keyart" previous={null} />
      <EnterVeil />
      <p className="eyebrow">{t('scene.prologue')}</p>
      <div className="title-block">
        <h1>{t('meta.title')}</h1>
        <p className="latin-title" aria-hidden="true">
          <span />
          Odyssey
          <span />
        </p>
        <p className="tagline">{t('meta.tagline')}</p>
        <div className="row">
          <button type="button" className="btn primary" onClick={() => canContinue ? setConfirmNew(true) : onNew()}>
            {t('menu.newGame')}
          </button>
          <button type="button" className="btn" onClick={onContinue} disabled={!canContinue}>
            {t('menu.continue')}
          </button>
        </div>
        <p className="release-label">v{RELEASE_VERSION} · {RELEASE_SCOPE}</p>
        <AudioSettings compact />
        <GlossSwitch checked={showGloss} onChange={onToggleGloss} />
        <button className="title-save-tools" type="button" onClick={() => setManageSave(true)}>存档与恢复</button>
      </div>
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
