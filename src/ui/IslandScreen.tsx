import { EVIDENCE, LEXEMES } from '../content/catalog';
import { hintPresentation } from '../core/hints';
import { ISLAND_SCENES, type IslandScene } from '../core/island';
import type { Action } from '../core/reduce';
import type { SaveData } from '../core/schema';
import { isLearnedState } from '../core/words';
import { Companion } from './Companion';
import { GlossSwitch } from './GlossSwitch';
import { Glyph } from './glyphs';
import { t, type MessageKey } from './i18n';
import { CampArt, FisheryArt, ForestArt, MemoryRain, NightArt, RockArt, ShoreArt } from './scenes';
import { useFeedbackFx } from './useFeedbackFx';
import { useIdleHint } from './useIdleHint';

const SCENE_TITLE: Record<IslandScene, MessageKey> = {
  'myp.scene.shore': 'scene.shore',
  'myp.scene.camp': 'scene.camp',
  'myp.scene.fishery': 'scene.fishery',
  'myp.scene.rock': 'scene.rock',
  'myp.scene.forest': 'scene.forest',
  'myp.scene.night': 'scene.night',
};

const NAV_LABEL: Record<IslandScene, MessageKey> = {
  'myp.scene.shore': 'nav.shore',
  'myp.scene.camp': 'nav.camp',
  'myp.scene.fishery': 'nav.fishery',
  'myp.scene.rock': 'nav.rock',
  'myp.scene.forest': 'nav.forest',
  'myp.scene.night': 'nav.night',
};

const BETRAY = 'myp.word.betray';

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
  const learned = LEXEMES.filter((lexeme) => isLearnedState(save.words[lexeme.id]?.state));
  const scene = isIslandSceneId(save.currentScene) ? save.currentScene : 'myp.scene.shore';
  const drank = save.beats['myp.beat.water'] === true;

  return (
    <section className={shake ? 'island shake' : 'island'}>
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
      <nav className="scene-nav" aria-label={t('scene.shore')}>
        {ISLAND_SCENES.map((id) => (
          <button
            key={id}
            type="button"
            className={scene === id ? 'btn on' : 'btn'}
            aria-current={scene === id ? 'page' : undefined}
            data-testid={`nav-${id.split('.').at(-1)}`}
            onClick={() => dispatch({ type: 'goto-scene', scene: id })}
          >
            {t(NAV_LABEL[id])}
          </button>
        ))}
      </nav>
      <div
        className="shore-wrap"
        data-testid={scene === 'myp.scene.shore' ? 'shore' : 'scene'}
        data-scene={scene}
        data-water-beat={drank ? 'done' : 'open'}
        data-sleep-beat={save.beats['myp.beat.sleep'] ? 'done' : 'open'}
        data-food-beat={save.beats['myp.beat.food'] ? 'done' : 'open'}
        data-danger-beat={save.beats['myp.beat.danger'] ? 'done' : 'open'}
        data-old-layer={save.beats['myp.beat.old-layer'] ? 'done' : 'open'}
        data-depart={save.beats['myp.beat.depart'] ? 'done' : 'open'}
        data-bone-cell={save.flags['myp.flag.bone-cell'] === true ? 'yes' : 'no'}
        data-hotspots={save.flags['dev.hotspots'] === true ? 'on' : 'off'}
      >
        <SceneArt scene={scene} drank={drank} />
        <SceneHotspots save={save} scene={scene} dispatch={dispatch} hint={hint} />
        {save.chart.includes('chart.nmn') ? (
          <button
            type="button"
            className="chart-corner"
            data-testid="chart-corner"
            aria-label={t('chart.mark')}
            onClick={() => dispatch({ type: 'open-memory' })}
          />
        ) : null}
        {save.memories.includes('myp.mem.rain-night') ? <MemoryRain /> : null}
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
        <Companion
          level={hint.level}
          anchor={hint.anchor}
          pose={hint.pose}
          purr={purr}
          onAsk={() => dispatch({ type: 'request-hint' })}
        />
      </div>
      <OverlaySheet save={save} dispatch={dispatch} learned={learned} hint={hint} />
    </section>
  );
}

function SceneArt({ scene, drank }: { scene: IslandScene; drank: boolean }) {
  if (scene === 'myp.scene.camp') return <CampArt />;
  if (scene === 'myp.scene.fishery') return <FisheryArt />;
  if (scene === 'myp.scene.rock') return <RockArt />;
  if (scene === 'myp.scene.forest') return <ForestArt />;
  if (scene === 'myp.scene.night') return <NightArt />;
  return <ShoreArt drank={drank} />;
}

function SceneHotspots({
  save,
  scene,
  dispatch,
  hint,
}: {
  save: SaveData;
  scene: IslandScene;
  dispatch: (action: Action) => void;
  hint: { level: number; anchor: string; wordId: string | null };
}) {
  if (scene === 'myp.scene.camp') {
    return (
      <>
        <button type="button" className={`hotspot sleep ${hintMark(hint, 'sleep')}`} data-testid="camp-sleep" onClick={() => dispatch({ type: 'sleep-at-camp' })}>
          {t('camp.sleep')}
        </button>
        <ActTray
          ids={['myp.word.eat', 'myp.word.drink', 'myp.word.walk', 'myp.word.take', 'myp.word.me', 'myp.word.you', 'myp.word.home']}
          dispatch={dispatch}
        />
      </>
    );
  }
  if (scene === 'myp.scene.fishery') {
    return (
      <>
        <button type="button" className={`hotspot give ${hintMark(hint, 'give')}`} data-testid="fishery-give" onClick={() => dispatch({ type: 'give-fish' })}>
          {t('fishery.give')}
        </button>
        <button type="button" className="hotspot grab" data-testid="fishery-grab" onClick={() => dispatch({ type: 'grab-fish' })}>
          {t('fishery.grab')}
        </button>
        <button type="button" className="hotspot pile more" data-testid="amount-more" aria-label={t('act.mark')} onClick={() => dispatch({ type: 'scene-act', wordId: 'myp.word.amount', part: 'more' })} />
        <button type="button" className="hotspot pile less" data-testid="amount-less" aria-label={t('act.mark')} onClick={() => dispatch({ type: 'scene-act', wordId: 'myp.word.amount', part: 'less' })} />
        <button type="button" className="hotspot fish-a" data-testid="size-a" aria-label={t('act.mark')} onClick={() => dispatch({ type: 'scene-act', wordId: 'myp.word.size', part: 'a' })}>
          <Glyph id="myp.word.fish" />
        </button>
        <button type="button" className="hotspot fish-b" data-testid="size-b" aria-label={t('act.mark')} onClick={() => dispatch({ type: 'scene-act', wordId: 'myp.word.size', part: 'b' })}>
          <Glyph id="myp.word.fish" />
        </button>
      </>
    );
  }
  if (scene === 'myp.scene.rock') {
    return (
      <>
        <button type="button" className="hotspot mural" data-testid="rock-mural" onClick={() => dispatch({ type: 'open-mural' })}>
          {t('island.mural')}
        </button>
        <button type="button" className="hotspot stamps" data-testid="rock-stamps" onClick={() => dispatch({ type: 'scene-act', wordId: 'myp.word.wait' })}>
          {t('rock.stamps')}
        </button>
        {isLearnedState(save.words[BETRAY]?.state) ? (
          <button type="button" className="hotspot tattoo" data-testid="rock-tattoo" onClick={() => dispatch({ type: 'collect-tattoo' })}>
            {t('mural.tattoo')}
          </button>
        ) : null}
      </>
    );
  }
  if (scene === 'myp.scene.forest') {
    return (
      <>
        <button type="button" className={`hotspot stop ${hintMark(hint, 'forest-stop')}`} data-testid="forest-stop" onClick={() => dispatch({ type: 'forest-choice', choice: 'stop' })}>
          {t('forest.stop')}
        </button>
        <button type="button" className="hotspot step" data-testid="forest-step" onClick={() => dispatch({ type: 'forest-choice', choice: 'step' })}>
          {t('forest.step')}
        </button>
      </>
    );
  }
  if (scene === 'myp.scene.night') {
    return (
      <>
        <button type="button" className={`hotspot read ${hintMark(hint, 'old-layer')}`} data-testid="night-read" onClick={() => dispatch({ type: 'read-old-layer' })}>
          {t('night.read')}
        </button>
        {save.memories.includes('myp.mem.rain-night') ? (
          <button type="button" className="hotspot memory" data-testid="night-memory" onClick={() => dispatch({ type: 'open-memory' })}>
            {t('menu.memory')}
          </button>
        ) : null}
      </>
    );
  }
  return (
    <>
      <button
        type="button"
        className={`hotspot mural ${hintMark(hint, 'mural-entrance')}`}
        data-testid="island-mural"
        onClick={() => dispatch({ type: 'open-mural' })}
      >
        {t('island.mural')}
      </button>
      <button
        type="button"
        className={`hotspot gourd ${hintMark(hint, 'gourd')}`}
        data-testid="island-gourd"
        aria-label={t('island.gourd')}
        onClick={() => dispatch({ type: 'poke-gourd' })}
      >
        <svg className="glyph pouch" viewBox="0 0 64 64" aria-hidden="true">
          <path d="M24 18h16c2 8 10 10 10 18 0 12-8 16-18 16S14 48 14 36c0-8 8-10 10-18z" />
        </svg>
      </button>
      <button type="button" className="hotspot stone" data-testid="shore-stone" onClick={() => dispatch({ type: 'shore-stone' })}>
        {t('shore.stone')}
      </button>
      <button type="button" className={`hotspot drift ${hintMark(hint, 'driftwood')}`} data-testid="shore-driftwood" onClick={() => dispatch({ type: 'sit-driftwood' })}>
        {t('shore.driftwood')}
      </button>
      <button type="button" className={`hotspot depart ${hintMark(hint, 'depart')}`} data-testid="shore-depart" onClick={() => dispatch({ type: 'depart' })}>
        {t('shore.depart')}
      </button>
    </>
  );
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
  if (save.overlay === 'none' || save.overlay === 'depart' || save.overlay === 'memory') return null;
  return (
    <div className="sheet" role="dialog" aria-label={sheetLabel(save.overlay)}>
      <button type="button" className="btn" onClick={() => dispatch({ type: 'close-overlay' })}>
        {t('menu.close')}
      </button>
      {save.overlay === 'settings' ? (
        <GlossSwitch
          checked={save.settings.showGloss}
          onChange={(value) => dispatch({ type: 'set-show-gloss', value })}
        />
      ) : null}
      {save.overlay === 'lexicon' ? <Lexicon save={save} words={learned} /> : null}
      {save.overlay === 'casefile' ? (
        <CaseFile save={save} onMemory={() => dispatch({ type: 'open-memory' })} />
      ) : null}
      {save.overlay === 'use-word' ? (
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
  const slots = EVIDENCE.filter((item) => item.island === 'myp');
  const held = slots.filter((item) => save.evidence.includes(item.id));
  const remembered = save.memories.includes('myp.mem.rain-night');
  if (held.length === 0 && !remembered) return <p>{t('casefile.empty')}</p>;
  return (
    <div className="casefile">
      {slots.map((item) => {
        const has = save.evidence.includes(item.id);
        const label = has ? t(item.labelKey as MessageKey) : t('casefile.emptySlot');
        return (
          <figure key={item.id} data-testid={`case-${item.id}`} data-held={has ? 'yes' : 'no'}>
            {has ? <BreakMark /> : <EmptyMark />}
            <figcaption>{label}</figcaption>
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

function ActTray({
  ids,
  dispatch,
}: {
  ids: string[];
  dispatch: (action: Action) => void;
}) {
  return (
    <div className="act-tray">
      {ids.map((id) => (
        <button
          key={id}
          type="button"
          data-testid={`act-${id}`}
          aria-label={t('act.mark')}
          onClick={() => dispatch({ type: 'scene-act', wordId: id })}
        >
          <Glyph id={id} />
        </button>
      ))}
    </div>
  );
}

function sheetLabel(overlay: SaveData['overlay']): string {
  if (overlay === 'lexicon') return t('menu.lexicon');
  if (overlay === 'settings') return t('settings.heading');
  if (overlay === 'casefile') return t('menu.casefile');
  return t('use.choose');
}

function isIslandSceneId(scene: string): scene is IslandScene {
  return (ISLAND_SCENES as readonly string[]).includes(scene);
}

export function hintMark(
  hint: { level: number; anchor: string; wordId: string | null },
  anchor: string,
  wordId?: string,
): string {
  if (hint.level < 2 || hint.anchor !== anchor) return '';
  if (wordId && hint.wordId !== wordId) return '';
  return hint.level >= 3 ? 'hint-near hint-paw' : 'hint-near';
}
