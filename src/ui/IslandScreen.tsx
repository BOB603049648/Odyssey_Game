import { SaveTools } from './SaveTools';
import { completionPending } from './Cutscenes';
import { AudioSettings } from './AudioControls';
import { useCallback, useEffect, useRef, useState } from 'react';
import { EVIDENCE, LEXEMES } from '../content/catalog';
import { companionPost } from '../core/companionPost';
import { hintPresentation } from '../core/hints';
import { departureBlocker, isIslandScene, SURVIVAL_BEATS } from '../core/island';
import type { Action } from '../core/reduce';
import type { SaveData } from '../core/schema';
import { isLearnedState } from '../core/words';
import { knotMark } from './companion/CatMark';
import { GlossSwitch } from './GlossSwitch';
import { Glyph } from './glyphs';
import { hintMark } from './hintMark';
import { t, type MessageKey } from './i18n';
import { loadSlotAsset, resolveSlotAsset } from '../content/slotAssets';
import { EnterVeil } from './Plate';
import { MemoryRain } from './scenes';
import { SPOTS } from '../core/stage';
import { visibleSpots } from './spotViews';
import { useGame } from '../stores/gameStore';
import { useFadePresence } from './useCrossfade';
import { useFeedbackFx } from './useFeedbackFx';
import { useIdleHint } from './useIdleHint';
import { sceneLook } from './cohesion';
import { WalkLayer, type NavigationStatus } from './WalkLayer';
import { NavigationNotice } from './Wayfinding';
import { AdventureHud, JourneyMoment } from './AdventureHud';
import { puzzleState } from '../core/puzzles';
import { worldState } from '../core/worldState';
import { FoodTable } from './FoodTable';
import { FieldLexicon } from './FieldLexicon';
import { BRIDGE, bridgeState } from '../core/bridge';
import { BridgePuzzle } from './BridgePuzzle';
import './adventure.css';

export { hintMark } from './hintMark';

export function IslandScreen({
  save,
  dispatch,
  onTitle,
}: {
  save: SaveData;
  dispatch: (action: Action) => void;
  onTitle: () => void;
}) {
  const hint = hintPresentation(save);
  const { shake, purr } = useFeedbackFx(save.feedback);
  const place = useGame((state) => state.place);
  const setPlace = useGame((state) => state.setPlace);
  const learned = LEXEMES.filter((lexeme) => isLearnedState(save.words[lexeme.id]?.state));
  const scene = isIslandScene(save.currentScene) ? save.currentScene : 'dba.scene.shore';
  const look = sceneLook(scene);
  const drank = save.beats['dba.beat.water'] === true;
  const puzzles = puzzleState(save);
  const [foodTableOpen, setFoodTableOpen] = useState(false);
  const [bridgeOpen, setBridgeOpen] = useState(false);
  const bridge = bridgeState(save);
  const bridgeVisible = bridgeOpen && scene === 'dba.scene.path' && save.overlay === 'none';
  const [navigation, setNavigation] = useState<NavigationStatus | null>(null);
  const foodTableVisible = foodTableOpen && scene === 'dba.scene.yard' && save.overlay === 'none';
  const remembered = place?.scene === scene ? { x: place.x, y: place.y } : null;
  const paused = save.overlay !== 'none' || completionPending(save) || foodTableVisible || bridgeVisible;
  const [readyScene, setReadyScene] = useState<string | null>(null);
  const onReady = useCallback((scene: string, ready: boolean) => setReadyScene(ready ? scene : null), []);
  const onActivity = useIdleHint(save, dispatch, !paused && readyScene === scene);
  useEffect(() => { setFoodTableOpen(false); setBridgeOpen(false); }, [scene, save.createdAt]);
  useEffect(() => { if (bridge.stage === 'agreed') setBridgeOpen(false); }, [bridge.stage]);
  const [skipWelcome, setSkipWelcome] = useState(false);
  useEffect(() => {
    if (save.flags['dba.flag.driftwood'] === true) return undefined;
    const id = window.setTimeout(() => setSkipWelcome(true), 12000);
    return () => window.clearTimeout(id);
  }, [save.flags['dba.flag.driftwood']]);
  const catPost = companionPost(scene, save.beats, { ...save.flags, [BRIDGE.agreed]: bridge.stage === 'agreed' }, { skipWelcome });
  const line = save.feedback.line;
  const [approachHint, setApproachHint] = useState(false);
  const spoken = line?.startsWith('spot.') ? t(line as MessageKey) : null;
  const flashKind = line === 'spot.driftwood.ok' || line === 'spot.driftwood.again'
    ? 'driftwood'
    : line === 'spot.sleep.ok'
      ? 'sleep'
      : line === 'spot.give.ok'
        ? 'give'
        : null;
  const flashScene = flashKind === 'driftwood' ? 'dba.scene.shore' : flashKind === 'sleep' ? 'dba.scene.camp' : flashKind === 'give' ? 'dba.scene.yard' : null;
  const flashSpot = flashScene && flashScene === scene
    ? SPOTS[flashScene].find((spot) => spot.id === (flashKind === 'driftwood' ? 'shore-driftwood' : flashKind === 'sleep' ? 'camp-sleep' : 'yard-give'))
    : null;
  const onInteract = (id: string) => {
    if (id === 'path-stop' || id === 'path-step') {
      dispatch({ type: 'forest-choice', choice: id === 'path-step' ? 'step' : 'stop' });
      setBridgeOpen(true); return;
    }
    if (id === 'water-spring' || id === 'water-sea') {
      dispatch({ type: 'puzzle-act', puzzle: 'water', move: id === 'water-spring' ? 'fill' : 'try-sea' }); return;
    }
    if (id === 'yard-grab') {
      if (puzzles.food.stage === 'unseen') dispatch({ type: 'puzzle-act', puzzle: 'food', move: 'inspect' });
      else if (puzzles.food.stage === 'inspected') dispatch({ type: 'puzzle-act', puzzle: 'food', move: 'take' });
      else if (puzzles.food.stage !== 'done') setFoodTableOpen(true);
      else dispatch({ type: 'puzzle-act', puzzle: 'food', move: 'inspect' });
      return;
    }
    if ((id === 'act:dba.word.amount:more' || id === 'act:dba.word.amount:less') &&
        (puzzles.food.stage === 'taken' || puzzles.food.stage === 'allocating')) { setFoodTableOpen(true); return; }
    interact(id, dispatch);
  };

  return (
    <section className={`island adventure-island${shake ? ' shake' : ''}`} style={{ ['--ambient' as string]: look.ambient }}>
      <EnterVeil />
      <AdventureHud save={save} dispatch={dispatch} onTitle={onTitle} learned={learned.length} />
      <div
        className="shore-wrap"
        data-testid={scene === 'dba.scene.shore' ? 'shore' : 'scene'}
        data-scene={scene}
        style={{ ['--ambient' as string]: look.ambient }}
        data-water-beat={drank ? 'done' : 'open'}
        data-sleep-beat={save.beats['dba.beat.sleep'] ? 'done' : 'open'}
        data-food-beat={save.beats['dba.beat.food'] ? 'done' : 'open'}
        data-danger-beat={save.beats['dba.beat.danger'] ? 'done' : 'open'}
        data-bridge-stage={bridge.stage}
        data-old-layer={save.beats['dba.beat.old-layer'] ? 'done' : 'open'}
        data-depart={save.beats['dba.beat.depart'] ? 'done' : 'open'}
        data-bone-cell={save.flags['dba.flag.bone-cell'] === true ? 'yes' : 'no'}
        data-hotspots={save.flags['dev.hotspots'] === true ? 'on' : 'off'}
      >
        <WalkLayer
          scene={scene}
          drank={drank}
          worldState={worldState(save)}
          spots={visibleSpots(scene, save, hint)}
          hint={hint}
          paused={paused}
          purr={purr}
          knot={knotMark(save.evidence)}
          remembered={remembered}
          onRemember={(nextScene, point) => setPlace({ scene: nextScene, x: point.x, y: point.y })}
          onExit={(next) => dispatch({ type: 'goto-scene', scene: next })}
          onInteract={onInteract}
          onAsk={() => dispatch({ type: 'request-hint' })}
          taught={save.flags['dba.flag.taught-approach'] === true}
          onTeach={() => dispatch({ type: 'teach-approach' })}
          showWalkMask={import.meta.env.DEV && save.flags['dev.walkable'] === true}
          catPost={catPost}
          onFar={(id) => dispatch({ type: 'spot-far', id })}
          onApproachHint={setApproachHint}
          onNavigationNotice={setNavigation}
          onActivity={onActivity}
          onReady={onReady}
          beat={save.feedback.kind === 'none' || !save.feedback.spot ? null : { spot: save.feedback.spot, kind: save.feedback.kind }}
          interactionSeq={save.feedback.seq}
          flash={flashSpot && flashKind ? { kind: flashKind, seq: save.feedback.seq, x: flashSpot.x, y: flashSpot.y } : null}
          onEscape={() => {
            if (bridgeVisible) { setBridgeOpen(false); return; }
            if (foodTableVisible) { setFoodTableOpen(false); return; }
            if (save.overlay === 'depart' || save.overlay === 'memory') return;
            if (save.overlay !== 'none') dispatch({ type: 'close-overlay' });
            else dispatch({ type: 'open-overlay', overlay: 'casefile' });
          }}
        />
        {scene === 'dba.scene.shore' && (puzzles.water === 'carried' || puzzles.water === 'filled') && !paused ?
          <p className="held-vessel" data-testid="held-vessel" data-filled={puzzles.water === 'filled' ? 'yes' : 'no'}>
            {puzzles.water === 'filled' ? '手中是接好的清泉' : '手中是空瓢 · 找一处可以饮用的水'}
          </p> : null}
        {save.chart.includes('chart.jgw') ? (
          <button
            type="button"
            className="chart-corner"
            data-testid="chart-corner"
            aria-label={t('chart.mark')}
            onClick={() => dispatch({ type: 'open-overlay', overlay: 'chart' })}
          />
        ) : null}
        {save.memories.includes('dba.mem.rain-night') ? <MemoryRain /> : null}
      </div>
      {save.overlay === 'chart' ? <ChartSealed onClose={() => dispatch({ type: 'close-overlay' })} /> : null}
      <OverlaySheet save={save} dispatch={dispatch} learned={learned} hint={hint} />
      {foodTableVisible ? <FoodTable food={puzzles.food} dispatch={dispatch} onClose={() => setFoodTableOpen(false)} /> : null}
      {bridgeVisible ? <BridgePuzzle save={save} dispatch={dispatch} onClose={() => setBridgeOpen(false)} /> : null}
      <JourneyMoment save={save} />
      <div className="stage-feedback-stack">
      <NavigationNotice message={!paused && navigation?.scene === scene ? navigation.message : null} kind={navigation?.kind ?? 'exit'} />
      {save.overlay === 'none' && spoken && !(approachHint && line === 'spot.driftwood.far') ? (
        <p key={scene} className="diegetic-line" data-testid="spot-line" data-line={line}>
          {spoken}
        </p>
      ) : null}
      </div>
    </section>
  );
}

function ChartSealed({ onClose }: { onClose: () => void }) {
  return (
    <section className="chart-sealed" data-testid="chart-sealed" data-chart="chart.jgw" role="dialog" aria-label={t('chart.sealed.title')}>
      <p className="eyebrow">{t('chart.sealed.title')}</p>
      <p>{t('chart.sealed')}</p>
      <button type="button" className="btn primary" onClick={onClose}>
        {t('menu.close')}
      </button>
    </section>
  );
}

function interact(id: string, dispatch: (action: Action) => void) {
  if (id === 'island-mural' || id === 'hall-mural') {
    dispatch({ type: 'open-mural' });
    return;
  }
  if (id === 'island-gourd') return dispatch({ type: 'poke-gourd' });
  if (id === 'shore-stone') return dispatch({ type: 'shore-stone' });
  if (id === 'shore-driftwood') return dispatch({ type: 'sit-driftwood' });
  if (id === 'shore-depart') return dispatch({ type: 'depart' });
  if (id === 'camp-sleep') return dispatch({ type: 'sleep-at-camp' });
  if (id === 'yard-give') return dispatch({ type: 'give-fish' });
  if (id === 'yard-grab') return dispatch({ type: 'grab-fish' });
  if (id === 'hall-stamps') return dispatch({ type: 'scene-act', wordId: 'dba.word.wait' });
  if (id === 'hall-tattoo') return dispatch({ type: 'collect-tattoo' });
  if (id === 'path-stop') return dispatch({ type: 'forest-choice', choice: 'stop' });
  if (id === 'path-step') return dispatch({ type: 'forest-choice', choice: 'step' });
  if (id === 'night-read') return dispatch({ type: 'read-old-layer' });
  if (id === 'night-ember') return dispatch({ type: 'inspect-embers' });
  if (id === 'night-memory') return dispatch({ type: 'open-memory' });
  if (!id.startsWith('act:')) return;
  const [wordId, part] = id.slice(4).split(':');
  dispatch({
    type: 'scene-act',
    wordId,
    part: part as 'a' | 'b' | 'more' | 'less' | undefined,
  });
}

export function OverlaySheet({
  save,
  dispatch,
  learned,
  hint,
}: {
  save: SaveData;
  dispatch: (action: Action) => void;
  learned: typeof LEXEMES;
  hint: { level: number; anchor: string; wordId: string | null };
}) {
  const open =
    save.overlay !== 'none' &&
    save.overlay !== 'depart' &&
    save.overlay !== 'memory' &&
    save.overlay !== 'chart';
  const presence = useFadePresence(open);
  const held = useRef(save.overlay);
  if (open) held.current = save.overlay;
  const overlay = held.current;
  if (!presence.mounted || overlay === 'none' || overlay === 'depart' || overlay === 'memory') return null;
  return (
    <div className={`sheet ${presence.phase}`} data-overlay={overlay} role="dialog" aria-label={sheetLabel(overlay)}>
      <button type="button" className="btn" onClick={() => dispatch({ type: 'close-overlay' })}>
        {t('menu.close')}
      </button>
      {overlay === 'settings' ? (
        <><AudioSettings /><GlossSwitch
          checked={save.settings.showGloss}
          onChange={(value) => dispatch({ type: 'set-show-gloss', value })}
        /><div className="control-guide"><h3>如何游玩</h3>
          <p>点击地面移动，或使用 WASD / 方向键；手机使用左下摇杆。</p>
          <p>走近物品后，再点一次或按 E 互动；右下角也会显示可用操作。</p>
          <p>观察壁画、辨认图意，把学会的字用在饮水、觅食、休息和避险中。</p>
          <p>卡住时点奈奈茶寻求提示。此刻的旅程会指引下一步。</p>
        </div><SaveTools save={save} /></>
      ) : null}
      {overlay === 'lexicon' ? <FieldLexicon save={save} /> : null}
      {overlay === 'casefile' ? (
        <CaseFile save={save} onMemory={() => dispatch({ type: 'open-memory' })} />
      ) : null}
      {overlay === 'use-word' ? (
        <div data-testid="use-word">
          <div className="choices">
            {learned.map((lexeme) => (
              <button
                key={lexeme.id}
                type="button"
                className={`choice ${hintMark(hint, 'use-word', lexeme.id)}`}
                data-testid={`use-${lexeme.id}`}
                onClick={() => dispatch({ type: 'use-word', wordId: lexeme.id })}
              >
                <Glyph id={lexeme.id} />
                {save.settings.showGloss ? <span className="gloss">{lexeme.gloss}</span> : null}
              </button>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CaseFile({ save, onMemory }: { save: SaveData; onMemory: () => void }) {
  const [closeup, setCloseup] = useState(() => resolveSlotAsset('art.ev.main.closeup'));
  useEffect(() => {
    let live = true;
    loadSlotAsset('art.ev.main.closeup').then((url) => {
      if (live) setCloseup(url);
    });
    return () => {
      live = false;
    };
  }, []);
  const slots = EVIDENCE.filter((item) => item.island === 'dba');
  const held = slots.filter((item) => save.evidence.includes(item.id));
  const remembered = save.memories.includes('dba.mem.rain-night');
  return (
    <div className="casefile">
      <JourneyChecklist save={save} />
      {held.length === 0 && !remembered ? <p>{t('casefile.empty')}</p> : null}
      {slots.map((item) => {
        const has = save.evidence.includes(item.id);
        const label = has ? t(item.labelKey as MessageKey) : t('casefile.emptySlot');
        return (
          <figure key={item.id} data-testid={`case-${item.id}`} data-held={has ? 'yes' : 'no'}>
            {has && item.id === 'dba.ev.main' && closeup ? (
              <img className="evidence-closeup" data-testid="evidence-closeup" src={closeup} alt="" draggable={false} />
            ) : has ? (
              <BreakMark />
            ) : (
              <EmptyMark />
            )}
            <figcaption>
              {label}
              {has && item.id === 'dba.ev.main' ? (
                <>
                  <p>{t('night.old.0')}</p>
                  <p>{t('night.old.1')}</p>
                </>
              ) : null}
              {has && item.id === 'dba.ev.a' ? <p>{t('evidence.dba.ev.a.note')}</p> : null}
              {has && item.id === 'dba.ev.b' ? <p>{t('evidence.dba.ev.b.note')}</p> : null}
              {has && item.id === 'dba.ev.main' ? <p>{t('evidence.dba.ev.main.note')}</p> : null}
            </figcaption>
          </figure>
        );
      })}
      {remembered ? (
        <button type="button" className="btn" data-testid="case-memory" onClick={onMemory}>
          {t('menu.memory')}
        </button>
      ) : null}
    </div>
  );
}

function JourneyChecklist({ save }: { save: SaveData }) {
  const completed = save.beats['dba.beat.depart'] === true;
  const blocker = departureBlocker(save);
  return <section className="journey-checklist" data-testid="journey-checklist" aria-label={t('journey.title')}>
    <h2>{t('journey.title')}</h2>
    {completed ? <p>{t('journey.finishedHelp')}</p> : <>
      <ol>{SURVIVAL_BEATS.map(beat => <li key={beat} data-complete={save.beats[`dba.beat.${beat}`] ? 'yes' : 'no'}>
        <span aria-hidden="true">{save.beats[`dba.beat.${beat}`] ? '✓' : '○'}</span>
        {t(`journey.${beat}`)}
        <span className="journey-state">{t(save.beats[`dba.beat.${beat}`] ? 'journey.done' : 'journey.pending')}</span>
      </li>)}</ol>
      <p>{blocker ? t(`spot.depart.${blocker}`) : t('journey.ready')}</p>
    </>}
    <p className="journey-optional">{t('journey.optional')}</p>
  </section>;
}

function BreakMark() {
  return (
    <svg className="glyph break" viewBox="0 0 64 64" aria-hidden="true">
      <path d="M18 46 34 14l16 28" />
      <path d="M12 18c8 10 6 18 2 24M46 12c-4 14 2 22 10 26" />
    </svg>
  );
}

function EmptyMark() {
  return (
    <svg className="glyph break" viewBox="0 0 64 64" aria-hidden="true">
      <rect x="16" y="16" width="32" height="32" />
    </svg>
  );
}

function sheetLabel(overlay: SaveData['overlay']): string {
  if (overlay === 'lexicon') return t('menu.lexicon');
  if (overlay === 'settings') return t('settings.heading');
  if (overlay === 'casefile') return t('menu.casefile');
  return t('use.choose');
}
