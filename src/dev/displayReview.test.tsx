import { act, cleanup, fireEvent, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { resolve, dirname, extname } from 'node:path';
import ts from 'typescript';
import type { ComponentType } from 'react';
import { slotAssetUrl } from '../content/assetUrls';
import * as decoded from '../content/decodedImage';
import { forgetSlotAsset } from '../content/slotAssets';
import { cameraOffset, lookEast, WORLD_SCALE } from '../core/walk';
import { saveDataSchema } from '../core/schema';

const ROOT = process.cwd();
const SCENES = ['shore','camp','yard','hall','path','night'];
const STILLS = ['art.pro.storm','art.pro.dark','art.pro.break','art.pro.tide','art.mem.rain','art.mem.kitten','art.mem.cloak'];
async function moduleUnderTest() {
  expect(existsSync(resolve(ROOT, 'src/dev/DisplayReview.tsx')), 'display-only entrance is not implemented').toBe(true);
  const path = './DisplayReview';
  return await import(path) as {
    DisplayReview: ComponentType<{ search?: string }>;
    makeDisplayPreset: (scene: string, phase: string, camera: string) => { save: import('../core/schema').SaveData; pos: {x:number;y:number}; expected: {id:string;asset:string|null;hidden:boolean}[] };
  };
}
const flush = () => act(async () => { for (let n = 0; n < 24; n++) await Promise.resolve(); });
let accesses: string[];
let restoreStorage: (() => void)[];
beforeEach(() => {
  accesses = []; restoreStorage = [];
  for (const key of ['localStorage','sessionStorage','indexedDB'] as const) {
    const descriptor = Object.getOwnPropertyDescriptor(window, key);
    const value = key === 'indexedDB' ? undefined : window[key];
    Object.defineProperty(window, key, { configurable: true, get: () => { accesses.push(key); return value; } });
    restoreStorage.push(() => { if (descriptor) Object.defineProperty(window,key,descriptor); else delete (window as unknown as Record<string,unknown>)[key]; });
  }
  for (const name of ['getItem','setItem','removeItem','clear','key'] as const) {
    vi.spyOn(Storage.prototype, name).mockImplementation((..._args: unknown[]) => { accesses.push(`Storage.${name}`); return null; });
  }
});
afterEach(() => { cleanup(); restoreStorage.forEach(fn => fn()); vi.restoreAllMocks(); vi.unstubAllEnvs(); vi.unstubAllGlobals(); });

// Read real file headers: jsdom has no native bitmap decoder. The DOM load below
// supplies these real dimensions; it is not a browser/image-quality assertion.
function dimensions(src: string): [number, number] {
  const p = resolve(ROOT, src.replace(/^\//,'').split('?')[0]);
  const b = readFileSync(p);
  if (b.toString('ascii',1,4) === 'PNG') return [b.readUInt32BE(16), b.readUInt32BE(20)];
  const kind = b.toString('ascii',12,16);
  if (kind === 'VP8X') return [1+b.readUIntLE(24,3),1+b.readUIntLE(27,3)];
  if (kind === 'VP8 ') return [b.readUInt16LE(26)&0x3fff,b.readUInt16LE(28)&0x3fff];
  if (kind === 'VP8L') { const n=b.readUInt32LE(21); return [1+(n&0x3fff),1+((n>>>14)&0x3fff)]; }
  if (b[0] === 0xff && b[1] === 0xd8) {
    for (let offset=2; offset+9<b.length;) {
      if (b[offset] !== 0xff) { offset++; continue; }
      const marker=b[offset+1];
      if ([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)) return [b.readUInt16BE(offset+7),b.readUInt16BE(offset+5)];
      if (marker===0xd8||marker===0xd9) { offset+=2; continue; }
      offset+=2+b.readUInt16BE(offset+2);
    }
  }
  throw new Error(`Unsupported fixture header ${src}`);
}
function loadImage(img: HTMLImageElement, outside = false) {
  const [w,h] = dimensions(img.getAttribute('src')!);
  Object.defineProperty(img,'naturalWidth',{configurable:true,value:w});
  Object.defineProperty(img,'naturalHeight',{configurable:true,value:h});
  vi.spyOn(img,'getBoundingClientRect').mockReturnValue({x:outside?-5000:10,y:10,left:outside?-5000:10,top:10,right:outside?-4900:110,bottom:110,width:100,height:100,toJSON(){return {};}});
  fireEvent.load(img);
  return [w,h];
}

describe('storage-free display-only entrance', () => {
  it('has a separate HTML and dedicated config, with a real dependency graph excluding persistent entry/store', async () => {
    for (const name of ['display-review.html','vite.display-review.config.ts','src/dev/displayReviewMain.tsx']) expect(existsSync(resolve(ROOT,name)),name).toBe(true);
    const visited = new Set<string>();
    function visit(file: string) {
      if (visited.has(file)) return; visited.add(file);
      const ast = ts.createSourceFile(file,readFileSync(file,'utf8'),ts.ScriptTarget.Latest,true);
      const add = (name:string) => {
        if (!name.startsWith('.')) return;
        const base=resolve(dirname(file),name);
        const target=[base,`${base}.ts`,`${base}.tsx`].find(p=>existsSync(p)&&['.ts','.tsx'].includes(extname(p)));
        if (target) visit(target);
      };
      function walk(node: ts.Node) {
        if (ts.isImportDeclaration(node) && !node.importClause?.isTypeOnly && ts.isStringLiteral(node.moduleSpecifier)) add(node.moduleSpecifier.text);
        if (ts.isExportDeclaration(node) && !node.isTypeOnly && node.moduleSpecifier && ts.isStringLiteral(node.moduleSpecifier)) add(node.moduleSpecifier.text);
        if (ts.isCallExpression(node)&&node.expression.kind===ts.SyntaxKind.ImportKeyword&&node.arguments[0]&&ts.isStringLiteral(node.arguments[0])) add(node.arguments[0].text);
        ts.forEachChild(node,walk);
      }
      walk(ast);
    }
    visit(resolve(ROOT,'src/dev/displayReviewMain.tsx'));
    expect([...visited].filter(p=>/\/(App|IslandScreen)\.tsx$|\/stores\/|\/platform\/storage\.ts$/.test(p))).toEqual([]);
    expect([...visited].some(p=>p.endsWith('/ui/WalkLayer.tsx'))).toBe(true);
    expect([...visited].some(p=>p.endsWith('/ui/stillFrames.tsx'))).toBe(true);
  });

  it.each(SCENES)('renders real configured URLs/dimensions for %s without storage access', async (scene) => {
    const {DisplayReview,makeDisplayPreset}=await moduleUnderTest();
    const preset=makeDisplayPreset(scene,'visible','spawn');
    expect(saveDataSchema.safeParse(preset.save).success).toBe(true);
    const view=render(<DisplayReview search={`?view=${scene}&phase=visible`} />); await flush();
    const stage=view.getByTestId('walk-stage'); expect(stage.getAttribute('data-scene')).toBe(`dba.scene.${scene}`);
    for (const item of preset.expected) {
      const host=view.container.querySelector(`[data-art-id="${item.id}"]`);
      if (item.hidden) { expect(host).toBeNull(); continue; }
      if (!item.asset) continue;
      const img=host?.querySelector<HTMLImageElement>('img.slot-asset');
      expect(img, `actual configured image missing: ${scene}/${item.id}`).toBeTruthy();
      expect(img!.getAttribute('src')).toBe(slotAssetUrl(item.asset));
      const size=loadImage(img!); expect(size[0]).toBeGreaterThan(64); expect(size[1]).toBeGreaterThan(64);
    }
    await flush();
    expect(view.getByTestId('display-review').getAttribute('data-frozen')).toBe('yes');
    expect(view.container.querySelector('fieldset[disabled]')).toBeTruthy();
    expect(accesses).toEqual([]);
  });

  it.each(STILLS)('preserves the real wrapper and loaded dimensions for %s', async (id) => {
    const {DisplayReview}=await moduleUnderTest();
    const view=render(<DisplayReview search={`?view=${id}`} />);await flush();
    const img=view.container.querySelector<HTMLImageElement>('.plate-still img')!;
    expect(img.getAttribute('src')).toBe(slotAssetUrl(id)); const [w,h]=loadImage(img); await flush();
    expect(img.closest(id.startsWith('art.pro.')?'.prologue':'.cutscene')).toBeTruthy();
    expect(view.getByTestId('review-observation').textContent).toContain(`${w}×${h}`);
    expect(accesses).toEqual([]);
  });

  it('preserves initial hidden story props and defaults to visible-condition snapshots, not a forced hidden override', async () => {
    const {DisplayReview,makeDisplayPreset}=await moduleUnderTest();
    const hall=makeDisplayPreset('hall','visible','spawn'); expect(hall.save.words['dba.word.betray'].state).toBe('learned');
    expect(makeDisplayPreset('night','visible','spawn').save.memories).toContain('dba.mem.rain-night');
    const view=render(<DisplayReview search="?view=hall&phase=initial"/>);await flush();
    expect(view.container.querySelector('[data-spot="hall-tattoo"]')).toBeNull();
    expect(view.getByTestId('review-observation').textContent).toContain('剧情条件隐藏');
    fireEvent.change(view.getByLabelText('阶段'),{target:{value:'visible'}}); await flush();
    expect(view.container.querySelector('[data-spot="hall-tattoo"]')).toBeTruthy();
    expect(accesses).toEqual([]);
  });

  it('GUI chooses all thirteen views manually and invalid choices fall back safely', async () => {
    const {DisplayReview}=await moduleUnderTest();const view=render(<DisplayReview search="?view=unknown&phase=no&camera=no"/>);await flush();
    const choice=view.getByLabelText('场景或图片') as HTMLSelectElement;
    expect(choice.options.length).toBe(13);expect(choice.value).toBe('shore');
    fireEvent.change(choice,{target:{value:'art.mem.cloak'}});await flush();
    expect(view.queryByTestId('walk-stage')).toBeNull();expect(view.getByTestId('still-frame').getAttribute('data-art-id')).toBe('art.mem.cloak');
    expect(accesses).toEqual([]);
  });

  it('labels a loaded offscreen object as outside rather than missing', async () => {
    const {DisplayReview}=await moduleUnderTest();const view=render(<DisplayReview search="?view=camp"/>);await flush();
    const img=view.container.querySelector<HTMLImageElement>('.scene-slot img.slot-asset')!;loadImage(img,true);await flush();
    expect(view.getByTestId('review-observation').textContent).toContain('视窗外（非缺图）');expect(accesses).toEqual([]);
  });

  it('freeze does not block a genuinely pending decoded bitmap from becoming ready', async () => {
    const {DisplayReview}=await moduleUnderTest();const id='art.camp.ground';const wanted=slotAssetUrl(id)!;
    const real=decoded.decodeAssetUrl;let release!:(url:string)=>void;
    const pending=new Promise<string>(yes=>{release=yes;});
    vi.spyOn(decoded,'decodeAssetUrl').mockImplementation(url=>url===wanted?pending:real(url));forgetSlotAsset(id);
    const view=render(<DisplayReview search="?view=camp"/>);await flush();
    expect(view.container.querySelector('[data-art-id="art.camp.ground"] img')).toBeNull();
    await act(async()=>{release(wanted);});await flush();
    expect(view.container.querySelector('[data-art-id="art.camp.ground"] img')?.getAttribute('src')).toBe(wanted);
    expect(view.getByTestId('display-review').getAttribute('data-frozen')).toBe('yes');expect(accesses).toEqual([]);
  });

  it('uses production camera initialization and remounts on resize with unchanged WORLD_SCALE', async () => {
    const {DisplayReview,makeDisplayPreset}=await moduleUnderTest();vi.stubEnv('MODE','production');
    let w=1280,h=720;vi.spyOn(HTMLElement.prototype,'clientWidth','get').mockImplementation(()=>w);vi.spyOn(HTMLElement.prototype,'clientHeight','get').mockImplementation(()=>h);
    let seq=0;const frames=new Map<number,FrameRequestCallback>();vi.stubGlobal('requestAnimationFrame',(fn:FrameRequestCallback)=>{frames.set(++seq,fn);return seq;});vi.stubGlobal('cancelAnimationFrame',(id:number)=>frames.delete(id));
    const callbacks=new Set<ResizeObserverCallback>();vi.stubGlobal('ResizeObserver',class{constructor(public callback:ResizeObserverCallback){}observe(){callbacks.add(this.callback);}disconnect(){callbacks.delete(this.callback);}});
    const view=render(<DisplayReview search="?view=shore&camera=right"/>);await flush();
    const initial=view.getByTestId('walk-stage');const pos=makeDisplayPreset('shore','visible','right').pos;
    const check=()=>{const stage=view.getByTestId('walk-stage');const cam=lookEast(cameraOffset(pos,w,h),w,true);expect(stage.getAttribute('data-cam-x')).toBe(cam.x.toFixed(1));expect(stage.getAttribute('data-cam-y')).toBe(cam.y.toFixed(1));expect((view.container.querySelector('.world-layer') as HTMLElement).style.width).toBe(`${w*WORLD_SCALE}px`);};check();
    w=390;h=844;await act(async()=>{window.dispatchEvent(new Event('resize'));for(const cb of [...callbacks])cb([],{} as ResizeObserver);});await flush();
    expect(view.getByTestId('walk-stage')).not.toBe(initial);check();
    const portrait=view.getByTestId('walk-stage');w=844;h=390;
    await act(async()=>{window.dispatchEvent(new Event('resize'));for(const cb of [...callbacks])cb([],{} as ResizeObserver);});await flush();
    expect(view.getByTestId('walk-stage')).not.toBe(portrait);check();
    expect(accesses).toEqual([]);view.unmount();expect(frames.size).toBe(0);
  });
});
