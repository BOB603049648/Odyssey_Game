import { useEffect, useRef, useState } from 'react';
import { EVIDENCE, LEXEMES } from '../content/catalog';
import { companionPost } from '../core/companionPost';
import { hintPresentation } from '../core/hints';
import { isIslandScene, type IslandScene } from '../core/island';
import type { Action } from '../core/reduce';
import type { SaveData } from '../core/schema';
import { isLearnedState } from '../core/words';
import { knotMark } from './companion/CatMark';
import { GlossSwitch } from './GlossSwitch';
import { Glyph } from './glyphs';
import { hintMark } from './hintMark';
import { t, type MessageKey } from './i18n';
import closeup from '../assets/art/slots/art.ev.main.closeup.jpg';
import { EnterVeil } from './Plate';
import { MemoryRain } from './scenes';
import { SPOTS } from '../core/stage';
import { visibleSpots } from './spotViews';
import { useGame } from '../stores/gameStore';
import { useFadePresence } from './useCrossfade';
import { useFeedbackFx } from './useFeedbackFx';
import { useIdleHint } from './useIdleHint';
import { sceneLook } from './cohesion';
import { WalkLayer } from './WalkLayer';

export { hintMark } from './hintMark';

/** Success rest. The body stays down at least this long, then stands. */
export const SLEEP_LIE_MS = 1200;
/** Short settle after the lie before the feet unlock. */
export const SLEEP_RISE_MS = 400;

const SCENE_TITLE: Record<IslandScene, MessageKey> = {
  'dba.scene.shore': 'scene.shore',
  'dba.scene.camp': 'scene.camp',
  'dba.scene.yard': 'scene.yard',
  'dba.scene.hall': 'scene.hall',
  'dba.scene.path': 'scene.path',
  'dba.scene.night': 'scene.night',
};

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
  useIdleHint(save, dispatch);
  const place = useGame((state) => state.place);
  const setPlace = useGame((state) => state.setPlace);
  const learned = LEXEMES.filter((lexeme) => isLearnedState(save.words[lexeme.id]?.state));
  const scene = isIslandScene(save.currentScene) ? save.currentScene : 'dba.scene.shore';
  const look = sceneLook(scene);
  const drank = save.beats['dba.beat.water'] === true;
  const remembered = place?.scene === scene ? { x: place.x, y: place.y } : null;
  const paused = save.overlay !== 'none';
  const [skipWelcome, setSkipWelcome] = useState(false);
  useEffect(() => {
    if (save.flags['dba.flag.driftwood'] === true) return undefined;
    const id = window.setTimeout(() => setSkipWelcome(true), 12000);
    return () => window.clearTimeout(id);
  }, [save.flags['dba.flag.driftwood']]);
  const catPost = companionPost(scene, save.beats, save.flags, { skipWelcome });
  const line = save.feedback.line;
  const sleepOk = scene === 'dba.scene.camp' && line === 'spot.sleep.ok';
  const [lieUntil, setLieUntil] = useState(0);
  useEffect(() => {
    if (!sleepOk) return undefined;
    const until = Date.now() + SLEEP_LIE_MS + SLEEP_RISE_MS;
    setLieUntil(until);
    const id = window.setTimeout(() => setLieUntil(0), until - Date.now());
    return () => window.clearTimeout(id);
  }, [sleepOk, save.feedback.seq]);
  const resting = scene === 'dba.scene.camp' && lieUntil > Date.now();
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

  return (
    <section className={shake ? 'island shake' : 'island'}>
      <EnterVeil />
      <div className="hud-actions row">
        <button type="button" className="btn" onClick={onTitle}>
          {t('menu.title')}
        </button>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'open-overlay', overlay: 'lexicon' })}>
          {t('menu.lexicon')}
        </button>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'open-overlay', overlay: 'casefile' })}>
          {t('menu.casefile')}
        </button>
        <button type="button" className="btn" onClick={() => dispatch({ type: 'open-overlay', overlay: 'settings' })}>
          {t('menu.settings')}
        </button>
      </div>
      <div
        className="shore-wrap"
        data-testid={scene === 'dba.scene.shore' ? 'shore' : 'scene'}
        data-scene={scene}
        style={{ ['--ambient' as string]: look.ambient }}
        data-water-beat={drank ? 'done' : 'open'}
        data-sleep-beat={save.beats['dba.beat.sleep'] ? 'done' : 'open'}
        data-food-beat={save.beats['dba.beat.food'] ? 'done' : 'open'}
        data-danger-beat={save.beats['dba.beat.danger'] ? 'done' : 'open'}
        data-old-layer={save.beats['dba.beat.old-layer'] ? 'done' : 'open'}
        data-depart={save.beats['dba.beat.depart'] ? 'done' : 'open'}
        data-bone-cell={save.flags['dba.flag.bone-cell'] === true ? 'yes' : 'no'}
        data-hotspots={save.flags['dev.hotspots'] === true ? 'on' : 'off'}
      >
        <WalkLayer
          scene={scene}
          drank={drank}
          spots={visibleSpots(scene, save, hint)}
          hint={hint}
          paused={paused}
          purr={purr}
          knot={knotMark(save.evidence)}
          remembered={remembered}
          onRemember={(nextScene, point) => setPlace({ scene: nextScene, x: point.x, y: point.y })}
          onExit={(next) => dispatch({ type: 'goto-scene', scene: next })}
          onInteract={(id) => interact(id, dispatch)}
          onAsk={() => dispatch({ type: 'request-hint' })}
          taught={save.flags['dba.flag.taught-approach'] === true}
          onTeach={() => dispatch({ type: 'teach-approach' })}
          showWalkMask={import.meta.env.DEV && save.flags['dev.walkable'] === true}
          catPost={catPost}
          resting={resting}
          onFar={(id) => dispatch({ type: 'spot-far', id })}
          beat={save.feedback.kind === 'none' || !save.feedback.spot ? null : { spot: save.feedback.spot, kind: save.feedback.kind }}
          flash={flashSpot && flashKind ? { kind: flashKind, seq: save.feedback.seq, x: flashSpot.x, y: flashSpot.y } : null}
          onEscape={() => {
            if (save.overlay === 'depart' || save.overlay === 'memory') return;
            if (save.overlay !== 'none') dispatch({ type: 'close-overlay' });
            else dispatch({ type: 'open-overlay', overlay: 'casefile' });
          }}
        />
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
        {spoken ? (
          <p key={scene} className="diegetic-line" data-testid="spot-line" data-line={line}>
            {spoken}
          </p>
        ) : null}
        <div className="hud-place">
          <p className="eyebrow">{t(SCENE_TITLE[scene])}</p>
          <p className="count" aria-label={`${learned.length}`}>
            {learned.length}/28
          </p>
        </div>
        <div className="hud-compass" aria-hidden="true">
          <span className="tick sw">SW</span>
          <span className="tick nw">NW</span>
          <span className="tick e">E</span>
          <i className="rose" />
        </div>
      </div>
      {save.overlay === 'chart' ? <ChartSealed onClose={() => dispatch({ type: 'close-overlay' })} /> : null}
      <OverlaySheet save={save} dispatch={dispatch} learned={learned} hint={hint} />
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
    <div className={`sheet ${presence.phase}`} role="dialog" aria-label={sheetLabel(overlay)}>
      <button type="button" className="btn" onClick={() => dispatch({ type: 'close-overlay' })}>
        {t('menu.close')}
      </button>
      {overlay === 'settings' ? (
        <GlossSwitch
          checked={save.settings.showGloss}
          onChange={(value) => dispatch({ type: 'set-show-gloss', value })}
        />
      ) : null}
      {overlay === 'lexicon' ? <Lexicon save={save} words={learned} /> : null}
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

function Lexicon({
  save,
  words,
}: {
  save: SaveData;
  words: typeof LEXEMES;
}) {
  if (words.length === 0) return <p>{t('lexicon.empty')}</p>;
  return (
    <div className="lexicon">
      {words.map((lexeme) => (
        <article key={lexeme.id} className="lex-card">
          <Glyph id={lexeme.id} />
          {save.settings.showGloss ? <span className="gloss">{lexeme.gloss}</span> : null}
          <i className="draft" aria-label={t('lexicon.draft')} />
        </article>
      ))}
    </div>
  );
}

function CaseFile({ save, onMemory }: { save: SaveData; onMemory: () => void }) {
  const slots = EVIDENCE.filter((item) => item.island === 'dba');
  const held = slots.filter((item) => save.evidence.includes(item.id));
  const remembered = save.memories.includes('dba.mem.rain-night');
  if (held.length === 0 && !remembered) return <p>{t('casefile.empty')}</p>;
  return (
    <div className="casefile">
      {slots.map((item) => {
        const has = save.evidence.includes(item.id);
        const label = has ? t(item.labelKey as MessageKey) : t('casefile.emptySlot');
        return (
          <figure key={item.id} data-testid={`case-${item.id}`} data-held={has ? 'yes' : 'no'}>
            {has && item.id === 'dba.ev.main' ? (
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
