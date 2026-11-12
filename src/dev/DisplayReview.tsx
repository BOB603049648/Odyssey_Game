import { useEffect, useMemo, useRef, useState } from 'react';
import { LEXEMES, MEMORIES, sceneAssembly } from '../content/catalog';
import { slotAssetUrl } from '../content/assetUrls';
import { debugLearnNext } from '../core/debug';
import { hintPresentation } from '../core/hints';
import { companionPost } from '../core/companionPost';
import { newGameState } from '../core/save';
import { saveDataSchema } from '../core/schema';
import type { IslandScene } from '../core/island';
import { BANDS, plantOnGround, SPAWNS } from '../core/stage';
import { visibleSpots } from '../ui/spotViews';
import { WalkLayer } from '../ui/WalkLayer';
import { PlateStack } from '../ui/Plate';
import { sceneLook } from '../ui/cohesion';
import './displayReview.css';

const SCENES = ['shore','camp','yard','hall','path','night'] as const;
const STILLS = ['art.pro.storm','art.pro.dark','art.pro.break','art.pro.tide','art.mem.rain','art.mem.kitten','art.mem.cloak'] as const;
const VIEWS: readonly string[] = [...SCENES,...STILLS];
const CAMERAS = ['spawn','left','right','south'] as const;
const noop = () => {};
type Expected = { id: string; asset: string | null; hidden: boolean };
type Row = { id: string; url: string; size: string; status: string };

/** Pure snapshots only: no store, dispatch, storage, or change to story filters. */
export function makeDisplayPreset(name: string, phase: string, camera: string) {
  const key = SCENES.includes(name as typeof SCENES[number]) ? name : 'shore';
  const scene = `dba.scene.${key}` as IslandScene;
  let save = { ...newGameState('2026-11-11T07:40:00.000Z'), currentScene: scene, screen: 'island' as const };
  if (phase === 'visible' && key === 'hall') {
    for (let n = 0; n < LEXEMES.length && save.words['dba.word.betray']?.state !== 'learned'; n++) save = { ...debugLearnNext(save), currentScene: scene, screen: 'island' };
  }
  if (phase === 'visible' && key === 'night') {
    save = { ...save, memories: ['dba.mem.rain-night'], beats: { ...save.beats, [MEMORIES[0].triggerBeat]: true } };
  }
  saveDataSchema.parse(save);
  const hint = hintPresentation(save);
  const spots = visibleSpots(scene,save,hint);
  const active = new Set(spots.map(spot => spot.id));
  const expected: Expected[] = (sceneAssembly(scene)?.slots ?? []).map(slot => ({ id: slot.id, asset: slot.asset, hidden: Boolean(slot.spot && !active.has(slot.spot)) }));
  const band = BANDS[scene];
  const spawn = SPAWNS[scene];
  const focus = camera === 'left' ? { ...spawn,x:band.minX } : camera === 'right' ? { ...spawn,x:band.maxX } : camera === 'south' ? { ...spawn,y:band.maxY } : spawn;
  return { save, scene, hint, spots, expected, pos: plantOnGround(scene,focus), catPost: companionPost(scene,save.beats,save.flags) };
}

function readChoice(search: string) {
  const q = new URLSearchParams(search);
  return { view: VIEWS.includes(q.get('view') ?? '') ? q.get('view')! : 'shore', phase: q.get('phase') === 'initial' ? 'initial' : 'visible', camera: CAMERAS.includes(q.get('camera') as typeof CAMERAS[number]) ? q.get('camera')! : 'spawn' };
}

/** Display diagnostics, never a normal-play replacement. Only manual selection. */
export function DisplayReview({ search = window.location.search }: { search?: string } = {}) {
  const [choice,setChoice] = useState(() => readChoice(search));
  const [size,setSize] = useState('initial');
  const [rows,setRows] = useState<Row[]>([]);
  const host = useRef<HTMLElement>(null);
  const scan = useRef(noop);
  const isScene = SCENES.includes(choice.view as typeof SCENES[number]);
  const preset = useMemo(() => makeDisplayPreset(choice.view,choice.phase,choice.camera),[choice.view,choice.phase,choice.camera]);
  const expected = useMemo<Expected[]>(() => isScene ? preset.expected : [{id:choice.view,asset:choice.view,hidden:false}],[isScene,preset,choice.view]);
  const rendererKey = `${choice.view}/${choice.phase}/${choice.camera}/${size}`;
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    // WalkLayer initializes its real camera on mount. Paused follow cannot
    // update it after resize, so remount this display-only renderer on size change.
    const read = () => setSize(`${el.clientWidth || window.innerWidth}x${el.clientHeight || window.innerHeight}`);
    read();
    window.addEventListener('resize',read);
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(read);
    observer?.observe(el);
    return () => { window.removeEventListener('resize',read); observer?.disconnect(); };
  },[]);
  useEffect(() => {
    const el = host.current;
    if (!el) return;
    const read = () => {
      const viewport = el.querySelector('.walk-viewport') ?? el;
      const r = viewport.getBoundingClientRect();
      const bounds = r.width > 0 && r.height > 0 ? r : {left:0,top:0,right:window.innerWidth,bottom:window.innerHeight};
      const inspect = (id: string, img: HTMLImageElement | null): Row => {
        if (!img) return { id,url:'',size:'—',status:'等待加载／观察恢复' };
        const url = img.currentSrc || img.getAttribute('src') || '';
        const size = `${img.naturalWidth}×${img.naturalHeight}`;
        if (!img.naturalWidth || !img.naturalHeight) return { id,url,size,status:'等待浏览器尺寸／解码' };
        const rect = img.getBoundingClientRect();
        const outside = rect.right <= bounds.left || rect.left >= bounds.right || rect.bottom <= bounds.top || rect.top >= bounds.bottom;
        return {id,url,size,status:rect.width <= 0 || rect.height <= 0 ? '已载入·布局待测' : outside ? '已载入·视窗外（非缺图）' : '已载入·范围内（遮挡需实画）'};
      };
      const all = [...el.querySelectorAll<HTMLElement>('[data-art-id]')];
      const next = expected.map(item => {
        if (item.hidden) return {id:item.id,url:'',size:'—',status:'剧情条件隐藏（非缺图）'};
        if (!item.asset) return {id:item.id,url:'',size:'—',status:'程序背景／空层（无独立图片）'};
        const node = all.find(node => node.dataset.artId === item.id);
        if (!node) return {id:item.id,url:`预期 ${slotAssetUrl(item.asset) ?? item.asset}；实际未挂载`,size:'—',status:'未在DOM（需核渲染分层，非HTTP缺图）'};
        return inspect(item.id,node.querySelector('img'));
      });
      if (isScene) {
        next.push(inspect('actor:traveler',el.querySelector('img.traveler-figure')));
        const cat = el.querySelector<HTMLImageElement>('img.nanaicha-ground');
        next.push(cat ? inspect('actor:cat',cat) : {id:'actor:cat',url:'',size:'—',status:'SVG降级／等待源图；不等于专属帧已载入'});
      }
      setRows(previous => JSON.stringify(previous) === JSON.stringify(next) ? previous : next);
    };
    scan.current = read; read();
    const observer = new MutationObserver(read);
    observer.observe(el,{subtree:true,childList:true,attributes:true,attributeFilter:['src','data-placeholder']});
    return () => { scan.current = noop; observer.disconnect(); };
  },[rendererKey,expected,isScene]);
  const look = sceneLook(preset.scene);
  return <>
    <aside className="display-review-tools" aria-label="显示验收选择器">
      <label>场景或图片<select aria-label="场景或图片" value={choice.view} onChange={e => setChoice({...choice,view:e.target.value})}>{VIEWS.map(view => <option key={view} value={view}>{view}</option>)}</select></label>
      <label>阶段<select aria-label="阶段" value={choice.phase} disabled={!isScene} onChange={e => setChoice({...choice,phase:e.target.value})}><option value="visible">可见条件快照</option><option value="initial">初始条件</option></select></label>
      <label>固定机位<select aria-label="固定机位" value={choice.camera} disabled={!isScene} onChange={e => setChoice({...choice,camera:e.target.value})}>{CAMERAS.map(camera => <option key={camera} value={camera}>{camera}</option>)}</select></label>
      <details><summary>图片清单／边界说明（可收起）</summary>
        <p>仅冻结显示，交互关闭；不读写进度、不代表正常玩法已过。可见快照满足纹身／回忆条件，初始阶段有意隐藏不算缺图。机位沿合法走带重建旅人观察点，不挪道具。离屏不算缺图；范围内不保证无遮挡。清单自身会遮挡画面。</p>
        <button type="button" onClick={() => scan.current()}>刷新观测</button>
        <table data-testid="review-observation"><thead><tr><th>配置／实际源</th><th>浏览器尺寸</th><th>状态</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.id}<small>{row.url}</small></td><td>{row.size}</td><td>{row.status}</td></tr>)}</tbody></table>
      </details>
    </aside>
    <main ref={host} className="stage display-review-renderer" data-testid="display-review" data-frozen="yes" data-view={choice.view} data-phase={choice.phase} onLoadCapture={() => scan.current()} onErrorCapture={() => scan.current()}>
      <fieldset disabled className="display-review-input-guard" aria-label="仅显示，场景交互已禁用">
      {isScene ? <section className="island" style={{['--ambient' as string]:look.ambient}}><div className="shore-wrap" data-scene={preset.scene} data-water-beat={preset.save.beats['dba.beat.water']?'done':'open'} data-hotspots="off" style={{['--ambient' as string]:look.ambient}}>
        <WalkLayer key={rendererKey} scene={preset.scene} drank={preset.save.beats['dba.beat.water']===true} spots={preset.spots} hint={preset.hint} paused purr={false} knot="rest" remembered={preset.pos} catPost={preset.catPost} presentationFrozen taught={preset.save.flags['dba.flag.taught-approach']===true} onRemember={noop} onExit={noop} onInteract={noop} onAsk={noop} onEscape={noop}/>
      </div></section> : <section key={rendererKey} className={choice.view.startsWith('art.pro.')?'prologue':'cutscene'}><PlateStack plate={choice.view} previous={null}/></section>}
      </fieldset>
    </main>
  </>;
}
