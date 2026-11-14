import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const out = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-performance');
await mkdir(out, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true,
  args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'], proxy });
const errors = [], checks = [], results = {};
let page, context;

/** Observe the actual native image and crop container on every displayed frame.
 * Do not compare the silhouette height of sitting/curled art with standing art. */
function probe() {
  window.performanceQA = { label: 'ready', samples: [], audio: [] };
  const nodes = new WeakMap();
  let nextNode = 0;
  const nodeId = img => { if (!nodes.has(img)) nodes.set(img, ++nextNode); return nodes.get(img); };
  const rect = el => { const r = el.getBoundingClientRect(); return { w: r.width, h: r.height }; };
  const layout = el => { const style = getComputedStyle(el); return { w: parseFloat(style.width), h: parseFloat(style.height),
    overflow: style.overflow, objectFit: style.objectFit, transform: style.transform }; };
  const visibility = img => {
    let opacity = 1;
    for (let node = img; node; node = node.parentElement) {
      const style = getComputedStyle(node);
      if (style.visibility !== 'visible' || style.display === 'none') return 0;
      opacity *= Number(style.opacity);
    }
    return opacity;
  };
  const image = img => img ? { src: img.currentSrc || img.src, requestedSrc: img.src, currentSrc: img.currentSrc,
    nodeId: nodeId(img), naturalW: img.naturalWidth, naturalH: img.naturalHeight,
    loaded: img.complete, frame: img.dataset.frame, atlas: img.dataset.atlas, performance: img.dataset.performance,
    opacity: visibility(img),
    image: rect(img), crop: rect(img.parentElement), styleW: img.style.width, styleH: img.style.height,
    ...(img.dataset.performance ? { imageLayout: layout(img), cropLayout: layout(img.parentElement) } : {}) } : null;
  const sample = now => {
    const actor = document.querySelector('[data-testid=traveler]');
    const stage = document.querySelector('[data-testid=walk-stage]');
    if (actor && stage?.dataset.display === 'ready') {
      window.performanceQA.samples.push({ at: now, label: window.performanceQA.label,
        x: Number(actor.dataset.x), y: Number(actor.dataset.y), facing: actor.dataset.facing,
        pose: actor.dataset.pose, moving: actor.dataset.moving, paused: actor.dataset.animationPaused,
        actor: rect(actor), current: image(actor.querySelector('[data-layer=current]')),
        outgoing: image(actor.querySelector('[data-layer=out]')),
        companion: image(document.querySelector('.nanaicha-ground')) });
    }
    requestAnimationFrame(sample);
  };
  requestAnimationFrame(sample);
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(destination, ...args) {
    const result = connect.call(this, destination, ...args);
    const entry = window.performanceQA.audio.find(entry => entry.context === this.context);
    if (entry && destination === this.context.destination) connect.call(this, entry.recording);
    return result;
  };
  const Original = window.AudioContext;
  window.AudioContext = class extends Original {
    constructor(...args) {
      super(...args);
      window.performanceQA.audio.push({ context: this, recording: this.createMediaStreamDestination() });
    }
  };
}
const ready = p => p.locator('[data-testid=walk-stage][data-display=ready]').waitFor();
const mark = label => page.evaluate(label => { window.performanceQA.label = label; return performance.now(); }, label);
const samples = prefix => page.evaluate(prefix => window.performanceQA.samples.filter(s => s.label.startsWith(prefix)), prefix);
async function approach(id) {
  const target = page.getByTestId(id);
  if (await target.getAttribute('data-reach') !== 'near') {
    await target.click();
    await page.waitForFunction(id => document.querySelector(`[data-testid="${id}"]`)?.dataset.reach === 'near', id);
  }
  await page.waitForFunction(() => document.querySelector('[data-testid=traveler]')?.dataset.moving === 'no');
  await page.waitForTimeout(150);
}
async function activate(id, label) { await approach(id); await mark(label); await page.getByTestId(id).click(); }
const current = () => page.evaluate(() => {
  const actor = document.querySelector('[data-testid=traveler]'), frame = actor.querySelector('[data-layer=current]');
  return { x: Number(actor.dataset.x), y: Number(actor.dataset.y), facing: actor.dataset.facing,
    pose: actor.dataset.pose, paused: actor.dataset.animationPaused, frame: frame?.dataset.frame, atlas: frame?.dataset.atlas };
});
async function frame(prefix, indexes) {
  await page.waitForFunction(({ prefix, indexes }) => {
    const img = document.querySelector('[data-testid=traveler] [data-layer=current]');
    return img?.dataset.atlas?.startsWith(prefix) && indexes.includes(Number(img.dataset.frame)) && img.complete && img.naturalWidth > 0;
  }, { prefix, indexes });
}
async function idle() {
  await page.waitForFunction(() => {
    const actor = document.querySelector('[data-testid=traveler]'), img = actor?.querySelector('[data-layer=current]');
    return actor?.dataset.pose === 'idle' && actor.dataset.moving === 'no' && img?.complete && img.naturalWidth > 0 && !img.dataset.atlas;
  });
}
async function pauseAction(label, ms) {
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid=traveler]')?.dataset.animationPaused === 'yes');
  // Exclude a pending pre-pause React commit before fixing the frozen reference.
  await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
  await mark(`${label}-paused`);
  const frozen = await current();
  await page.waitForTimeout(ms);
  assert.deepEqual(await current(), frozen, `${label}: menu changed frame, facing or planted feet`);
  const held = await samples(`${label}-paused`);
  assert.ok(held.length > 5, `${label}: missing pause observations`);
  assert.ok(held.every(s => s.paused === 'yes' && s.x === frozen.x && s.y === frozen.y
    && s.current?.atlas === frozen.atlas && s.current?.frame === frozen.frame), `${label}: animation advanced while paused`);
  await page.screenshot({ path: resolve(out, `${label}-paused.png`) });
  await mark(`${label}-resumed`);
  await page.getByRole('button', { name: '合上', exact: true }).click();
  await page.waitForFunction(() => document.querySelector('[data-testid=traveler]')?.dataset.animationPaused === 'no');
  return frozen;
}
function observedFrames(list, prefix) {
  return [...new Set(list.filter(s => s.current?.atlas?.startsWith(prefix)).map(s => Number(s.current.frame)))].sort();
}
function verifyBitmaps(list) {
  const readyImage = f => Boolean(f?.loaded && f.naturalW > 0 && f.naturalH > 0 && f.opacity > .01 && f.crop.w > 10 && f.crop.h > 10);
  let pendingAt = null, pendingSamples = 0, maximumPendingMs = 0;
  for (const s of list) {
    if (readyImage(s.current)) {
      if (pendingAt !== null) {
        maximumPendingMs = Math.max(maximumPendingMs, s.at - pendingAt);
        assert.ok(s.at - pendingAt < 100, `current image remained pending for ${s.at - pendingAt}ms`);
        pendingAt = null;
      }
    } else {
      // A newly keyed atlas may await its native img update for one frame.
      // Accept it only while a decoded, visibly unfaded outgoing figure still
      // covers the transition; an existing but invisible DOM node is not art.
      assert.ok(readyImage(s.outgoing), `${s.label} at ${s.at}ms: neither current nor outgoing figure is ready and visible`);
      pendingAt ??= s.at;
      pendingSamples++;
      assert.ok(s.at - pendingAt < 100, `${s.label}: pending image outlasted its transition window`);
    }
  }
  assert.equal(pendingAt, null, 'recording ended before the current image became ready');
  const measured = list.filter(s => s.current?.atlas && readyImage(s.current));
  assert.ok(measured.length > 100, 'not enough actual atlas frames observed');
  const atlasLayers = list.flatMap(s => [s.current, s.outgoing]).filter(f => f?.atlas && readyImage(f));
  for (const f of atlasLayers) {
    const settle = f.atlas.startsWith('settle-');
    const walk = f.atlas.startsWith('stride-');
    const expected = settle ? { w: 1536, h: 1024, cw: 360, ch: 480 }
      : walk ? { w: 1448, h: 1086, cw: 249, ch: 332 } : { w: 1448, h: 1086, cw: 271.5, ch: 362 };
    assert.ok(f.loaded && f.naturalW === expected.w && f.naturalH === expected.h,
      `${f.atlas}: incorrect native bitmap ${f.naturalW}x${f.naturalH}`);
    assert.ok(f.crop.w > 10 && f.crop.h > 10, `${f.atlas}: empty crop container`);
    assert.ok(Math.abs(f.image.w / f.crop.w - expected.w / expected.cw) < .025,
      `${f.atlas}: bitmap width escaped its cell crop`);
    assert.ok(Math.abs(f.image.h / f.crop.h - expected.h / expected.ch) < .025,
      `${f.atlas}: bitmap height escaped its cell crop`);
  }
  // Within a stationary action, changing cells must not rescale the container.
  for (const label of ['drink-', 'rest-full']) {
    const still = measured.filter(s => s.label.startsWith(label) && s.moving === 'no');
    const groups = new Map();
    for (const s of still) {
      const key = `${s.current.atlas.startsWith('settle-') ? 'settle' : 'action'}:${s.x.toFixed(5)}:${s.y.toFixed(5)}`;
      const first = groups.get(key);
      if (!first) groups.set(key, s);
      else {
        assert.ok(Math.abs(s.current.crop.w / first.current.crop.w - 1) < .015, `${label}: crop width jumped between frames`);
        assert.ok(Math.abs(s.current.crop.h / first.current.crop.h - 1) < .015, `${label}: crop height jumped between frames`);
      }
    }
  }
  const cats = list.filter(s => s.companion?.performance);
  for (const { companion: f } of cats) {
    assert.ok(f.loaded && f.naturalW === 1536 && f.naturalH === 1024, `${f.performance}: guide native image is not ready`);
    // The purr animation rotates the common ancestor by one degree. Rotated
    // axis-aligned bounding boxes do not preserve ratios between a 4x2 atlas
    // and a single cell; compare their actual CSS layout dimensions instead.
    // Keep the screen-space bounds in samples for visual diagnostics.
    assert.ok(f.cropLayout.w > 10 && f.cropLayout.h > 10, `${f.performance}: empty guide crop container`);
    assert.equal(f.cropLayout.overflow, 'hidden', `${f.performance}: guide cells are not clipped`);
    assert.equal(f.imageLayout.objectFit, 'fill', `${f.performance}: guide atlas is letterboxed inside its crop`);
    assert.equal(f.imageLayout.transform, 'none', `${f.performance}: guide image has an independent scale`);
    assert.ok(Math.abs(f.imageLayout.w / f.cropLayout.w - 4) < .025 && Math.abs(f.imageLayout.h / f.cropLayout.h - 2) < .025,
      `${f.performance}: guide crop changed scale`);
  }
  return { travelerAtlasSamples: measured.length, visibleAtlasLayerSamples: atlasLayers.length,
    companionAtlasSamples: cats.length, pendingCurrentSamples: pendingSamples, maximumPendingMs };
}

try {
  // Obtain a schema-valid save through the public new-game flow, then focus the
  // recording on camp performance instead of spending it learning 28 words.
  const bootstrap = await browser.newContext();
  const start = await bootstrap.newPage(); start.on('pageerror', error => errors.push(error.message));
  await start.goto(url);
  await start.getByRole('button', { name: '新游戏', exact: true }).click();
  await start.getByRole('button', { name: '跳过序章', exact: true }).click();
  await ready(start);
  const fixture = await start.evaluate(() => JSON.parse(localStorage.getItem('odyssey.save.v1')));
  await bootstrap.close();
  fixture.screen = 'island'; fixture.currentScene = 'dba.scene.camp'; fixture.overlay = 'none';
  fixture.feedback = { seq: 0, kind: 'none' }; fixture.companion = { level: 0, targetId: null, pawUsed: false };
  fixture.flags['dba.flag.taught-approach'] = true; fixture.flags['dba.flag.driftwood'] = true;
  fixture.beats['dba.beat.water'] = true;
  for (const word of Object.values(fixture.words)) word.state = 'learned';
  context = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: out, size: { width: 1280, height: 800 } } });
  await context.addInitScript(probe);
  await context.addInitScript(save => localStorage.setItem('odyssey.save.v1', JSON.stringify(save)), fixture);
  page = await context.newPage(); page.setDefaultTimeout(20000); page.on('pageerror', error => errors.push(error.message));
  await page.goto(url); await page.getByRole('button', { name: '继续', exact: true }).click(); await ready(page);
  await page.waitForFunction(() => window.performanceQA.audio.length > 0);
  await page.evaluate(() => {
    window.performanceQA.chunks = [];
    const recorder = new MediaRecorder(window.performanceQA.audio[0].recording.stream, { mimeType: 'audio/webm;codecs=opus' });
    recorder.ondataavailable = event => { if (event.data.size) window.performanceQA.chunks.push(event.data); };
    window.performanceQA.recorder = recorder; recorder.start();
  });
  await mark('guide-observe');
  await page.waitForFunction(() => {
    const img = document.querySelector('.nanaicha-ground');
    return img?.dataset.performance?.startsWith('pose-observe-') && img.complete && img.naturalWidth === 1536;
  });
  await page.screenshot({ path: resolve(out, 'guide-observe.png') });
  await mark('guide-point'); await page.getByTestId('companion').click();
  await page.waitForFunction(() => {
    const img = document.querySelector('.nanaicha-ground');
    return img?.dataset.performance?.startsWith('pose-point-') && img.complete && img.naturalWidth === 1536;
  });
  await page.screenshot({ path: resolve(out, 'guide-point.png') });
  checks.push('guide observe and request-help poses are decoded');

  // The spawn is already beside the drink marker. Turn north without leaving
  // its reach radius, then activate it directly: no approach can hide a bad turn.
  await approach('act-dba.word.drink');
  await page.keyboard.down('w');
  await page.waitForFunction(() => document.querySelector('[data-testid=traveler]')?.dataset.facing === 'back');
  await page.keyboard.up('w');
  await page.waitForFunction(() => document.querySelector('[data-testid=traveler]')?.dataset.moving === 'no');
  assert.equal(await page.getByTestId('act-dba.word.drink').getAttribute('data-reach'), 'near', 'back-facing test left drink reach');
  await mark('drink-start'); await page.getByTestId('act-dba.word.drink').click();
  await frame('action-drink-', [1, 2]);
  assert.equal((await current()).facing, 'right', 'drinking retained a back-facing walk direction');
  const drinkFrozen = await pauseAction('drink', 2000);
  assert.ok([1, 2].includes(Number(drinkFrozen.frame)), `paused after drink had already ended: ${drinkFrozen.frame}`);
  await frame('action-drink-', [3]); await idle();
  const drinkSamples = await samples('drink-');
  assert.deepEqual(observedFrames(drinkSamples, 'action-drink-'), [0, 1, 2, 3]);
  assert.ok((await samples('drink-resumed')).some(s => s.current?.frame === '3' && s.current.atlas?.startsWith('action-drink-')));
  results.drinkPause = drinkFrozen;
  checks.push('back-facing interaction turns toward the vessel', 'drink freezes for two seconds in settings and resumes remaining frames');

  await activate('camp-sleep', 'rest-full-start');
  await frame('settle-down-', [1, 2]);
  const restFrozen = await pauseAction('rest-full', 900);
  await page.waitForFunction(() => {
    const img = document.querySelector('.nanaicha-ground');
    return img?.dataset.performance?.startsWith('pose-curl-') && img.complete && img.naturalWidth === 1536;
  });
  await page.screenshot({ path: resolve(out, 'rest-and-curled-guide.png') });
  await frame('settle-up-', [3]); await idle();
  const resting = await samples('rest-full');
  assert.deepEqual(observedFrames(resting, 'settle-down-'), [0, 1, 2, 3]);
  assert.deepEqual(observedFrames(resting, 'settle-up-'), [0, 1, 2, 3]);
  const hold = resting.filter(s => s.current?.atlas === 'settle-down-04.png' && s.paused === 'no');
  assert.ok(hold.length > 10 && hold.at(-1).at - hold[0].at >= 450, 'rest did not hold the seated frame before standing');
  results.restPause = restFrozen; results.seatedHoldMs = hold.at(-1).at - hold[0].at;
  checks.push('four lower frames, seated hold and four rise frames', 'rest pauses and resumes without skipping its rise', 'guide curl pose is decoded during rest');

  await activate('camp-sleep', 'rest-interrupt'); await frame('settle-down-', [1]);
  const interruptAt = await mark('movement-interrupt');
  await page.keyboard.down('d');
  await page.waitForFunction(() => {
    const actor = document.querySelector('[data-testid=traveler]');
    return actor?.dataset.moving === 'yes' && actor.querySelector('[data-layer=current]')?.dataset.atlas?.startsWith('stride-');
  });
  const reacted = await page.evaluate(() => performance.now());
  await page.keyboard.up('d'); await idle(); await page.waitForTimeout(200);
  assert.ok(reacted - interruptAt < 450, `movement interruption took ${reacted - interruptAt}ms`);
  const interrupted = await samples('movement-interrupt');
  assert.ok(interrupted.filter(s => s.at > interruptAt + 450).every(s => !s.current?.atlas?.startsWith('settle-')), 'rest resumed after movement cancelled it');
  results.interruptionMs = reacted - interruptAt;
  checks.push('movement promptly cancels resting without a delayed rise');
  await page.screenshot({ path: resolve(out, 'camp-performance.png') });
  const allSamples = await page.evaluate(() => window.performanceQA.samples);
  Object.assign(results, verifyBitmaps(allSamples));
  checks.push('native atlas dimensions and crop scales remain correct on every sampled frame');
  const bytes = await page.evaluate(async () => {
    await new Promise(resolve => { window.performanceQA.recorder.onstop = resolve; window.performanceQA.recorder.stop(); });
    const bytes = new Uint8Array(await new Blob(window.performanceQA.chunks).arrayBuffer());
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i, i + 8192));
    return btoa(binary);
  });
  const audioFile = resolve(out, 'performance-audio.webm'); await writeFile(audioFile, Buffer.from(bytes, 'base64'));
  const videoFile = await page.video().path();
  await context.close(); context = null;
  const duration = file => Number(execFileSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'default=nw=1:nk=1', file], { encoding: 'utf8' }).trim());
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-ss', String(Math.max(0, duration(videoFile) - duration(audioFile))), '-i', videoFile, '-i', audioFile,
    '-c:v', 'libx264', '-preset', 'fast', '-crf', '23', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', resolve(out, 'character-performance.mp4')]);
  assert.deepEqual(errors, []);
  await writeFile(resolve(out, 'samples.json'), JSON.stringify(allSamples));
  await writeFile(resolve(out, 'result.json'), JSON.stringify({ result: 'PASS', checks, results, errors }, null, 2));
  console.log(JSON.stringify({ result: 'PASS', checks, results, errors }));
} catch (error) {
  if (page && !page.isClosed()) {
    await page.screenshot({ path: resolve(out, 'failure.png') }).catch(() => {});
    const captured = await page.evaluate(() => window.performanceQA?.samples ?? []).catch(() => []);
    await writeFile(resolve(out, 'failure-samples.json'), JSON.stringify(captured));
  }
  console.error(error); process.exitCode = 1;
} finally {
  if (context) await context.close().catch(() => {});
  await browser.close();
}
