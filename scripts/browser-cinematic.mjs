import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-cinematic');
await mkdir(output, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost','127.0.0.1'].includes(new URL(url).hostname) ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'], proxy });

// Observe the real Web Audio graph from the test harness, with no production debug API.
function audioProbe() {
  window.__sound = { contexts: [], voices: [] };
  const Original = window.AudioContext;
  const connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(destination, ...rest) {
    const result = connect.call(this, destination, ...rest);
    const observed = window.__sound.contexts.find(item => item.context === this.context);
    if (observed && destination === this.context.destination) {
      connect.call(this, observed.analyser); connect.call(this, observed.recording);
    }
    return result;
  };
  window.AudioContext = class extends Original {
    constructor(...args) {
      super(...args);
      const analyser = this.createAnalyser(); analyser.fftSize = 2048;
      window.__sound.contexts.push({ context: this, analyser, recording: this.createMediaStreamDestination() });
    }
    createBufferSource() {
      const source = super.createBufferSource();
      const start = source.start.bind(source);
      const voice = { live: false, loop: false, duration: 0 };
      window.__sound.voices.push(voice);
      source.start = (...args) => { voice.live = true; voice.loop = source.loop; voice.duration = source.buffer?.duration ?? 0; return start(...args); };
      source.addEventListener('ended', () => { voice.live = false; });
      return source;
    }
  };
  window.__sound.level = () => {
    const observed = window.__sound.contexts.at(-1);
    if (!observed) return 0;
    const samples = new Float32Array(2048); observed.analyser.getFloatTimeDomainData(samples);
    return Math.sqrt(samples.reduce((sum,value) => sum + value*value,0)/samples.length);
  };
}
const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
await context.addInitScript(audioProbe);
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
const ready = async step => {
  await page.locator(`[data-frame-status="ready"][data-displayed-step="${step}"]`).waitFor();
  await page.locator('.prologue-weather').waitFor();
};
const audible = () => page.waitForFunction(() => window.__sound.level() > .001);
const silent = () => page.waitForFunction(() => window.__sound.level() < .0001 && window.__sound.voices.filter(v => v.live).length === 0);
const pixels = () => page.locator('.prologue-weather').evaluate(canvas => canvas.toDataURL());
try {
  let failAudio = false;
  await page.route('**/*.mp3', route => failAudio ? route.abort('failed') : route.continue());
  await page.goto(url);
  assert.equal(await page.evaluate(() => window.__sound.contexts.length), 0, 'title must not autoplay');
  await page.getByRole('button', { name: '新游戏', exact: true }).click();
  await ready(0); await audible();
  const first = await pixels(); await page.waitForTimeout(400);
  assert.notEqual(await pixels(), first, 'weather/water must animate');
  await page.getByRole('button', { name: '暂停', exact: true }).click();
  await silent();
  const frozen = await pixels(); await page.waitForTimeout(450);
  assert.equal(await pixels(), frozen, 'pause must freeze the painted motion');
  await page.getByRole('button', { name: '播放', exact: true }).click(); await audible();
  await page.getByRole('button', { name: '声音开', exact: true }).click(); await silent();
  assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('odyssey.audio.v1')).muted), true);
  await page.reload();
  await page.getByRole('button', { name: '继续', exact: true }).click(); await ready(0);
  assert.equal(await page.evaluate(() => window.__sound.contexts.length), 0, 'mute must survive reload');
  await page.getByRole('button', { name: '声音关', exact: true }).click(); await audible();
  // Simulated OS visibility event: both audio and the independent animation clock suspend.
  await page.evaluate(() => { Object.defineProperty(document, 'hidden', { configurable: true, value: true }); document.dispatchEvent(new Event('visibilitychange')); });
  await silent();
  const hidden = await pixels(); await page.waitForTimeout(350); assert.equal(await pixels(), hidden);
  await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); }); await audible();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.locator('[data-motion="reduced"]').waitFor();
  const still = await pixels(); await page.waitForTimeout(400); assert.equal(await pixels(), still);
  await page.emulateMedia({ reducedMotion: 'no-preference' });
  await page.getByRole('button', { name: '下一幕', exact: true }).click(); await ready(1);
  await page.waitForTimeout(1800);
  const catCount = () => page.evaluate(() => window.__sound.voices.filter(v => !v.loop && v.duration > 1 && v.duration < 1.3).length);
  assert.equal(await catCount(), 1, 'one recorded cat cue on reveal');
  await page.getByRole('button', { name: '暂停', exact: true }).click(); await silent();
  await page.getByRole('button', { name: '播放', exact: true }).click(); await page.waitForTimeout(1200);
  assert.equal(await catCount(), 1, 'pause/resume must not repeat the cat');
  await page.getByRole('button', { name: '重播本幕', exact: true }).click(); await page.waitForTimeout(1500);
  assert.equal(await catCount(), 2);
  await page.getByRole('button', { name: '跳过序章', exact: true }).click();
  await page.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor(); await page.waitForTimeout(600); await audible();
  assert.equal(await page.evaluate(() => window.__sound.voices.filter(v => v.live && v.loop).length), 1, 'shore has one ambience, no ghost storm');
  await page.getByRole('button', { name: '标题', exact: true }).click(); await silent();
  // A fresh context has no decoded cache; sound failure must not block pictures.
  await context.close();
  const failureContext = await browser.newContext();
  await failureContext.addInitScript(audioProbe);
  const failure = await failureContext.newPage();
  failure.on('pageerror', error => errors.push(error.message));
  let blocked = true;
  await failure.route('**/*.mp3', route => blocked ? route.abort('failed') : route.continue());
  await failure.goto(url); await failure.getByRole('button', { name: '新游戏', exact: true }).click();
  await failure.locator('[data-audio="failed"][data-frame-status="ready"]').waitFor();
  assert.equal(await failure.getByRole('button', { name: '下一幕', exact: true }).isEnabled(), true);
  blocked = false;
  await failure.getByRole('button', { name: '重试声音', exact: true }).click();
  await failure.waitForFunction(() => window.__sound.level() > .001);
  await failureContext.close();

  // Watch the entire automatic performance at real time; save a reviewable capture.
  const demoContext = await browser.newContext({ viewport: { width: 1280, height: 800 }, recordVideo: { dir: output, size: { width: 1280, height: 800 } } });
  await demoContext.addInitScript(audioProbe);
  const demo = await demoContext.newPage();
  demo.on('pageerror', error => errors.push(error.message));
  await demo.goto(url);
  await demo.getByRole('button', { name: '新游戏', exact: true }).click();
  await demo.locator('[data-frame-status="ready"][data-audio="playing"]').waitFor();
  await demo.evaluate(() => {
    window.__chunks = [];
    window.__recorder = new MediaRecorder(window.__sound.contexts[0].recording.stream, { mimeType: 'audio/webm;codecs=opus' });
    window.__recorder.ondataavailable = event => { if (event.data.size) window.__chunks.push(event.data); };
    window.__recorder.start();
  });
  await demo.getByRole('button', { name: '重播本幕', exact: true }).click();
  await demo.getByRole('button', { name: '连播', exact: true }).click();
  for (let step = 0; step < 4; step++) {
    await demo.locator(`[data-displayed-step="${step}"][data-frame-status="ready"]`).waitFor({ timeout: 14000 });
    await demo.waitForTimeout(1600);
    await demo.screenshot({ path: resolve(output, `animated-${step}.png`) });
  }
  await demo.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor({ timeout: 14000 });
  assert.equal(await demo.evaluate(() => JSON.parse(localStorage.getItem('odyssey.save.v1')).evidence.filter(id => id === 'dba.ev.a').length), 1);
  await demo.waitForTimeout(1200);
  const audio = await demo.evaluate(async () => {
    await new Promise(done => { window.__recorder.onstop = done; window.__recorder.stop(); });
    const bytes = new Uint8Array(await new Blob(window.__chunks).arrayBuffer());
    let binary = ''; for (let i = 0; i < bytes.length; i += 8192) binary += String.fromCharCode(...bytes.subarray(i,i+8192));
    return btoa(binary);
  });
  const audioFile = resolve(output, 'performance-audio.webm'); await writeFile(audioFile, Buffer.from(audio, 'base64'));
  const videoFile = await demo.video().path();
  await demoContext.close();
  const duration = file => Number(execFileSync('ffprobe',['-v','error','-show_entries','format=duration','-of','default=nw=1:nk=1',file],{encoding:'utf8'}).trim());
  const trim = Math.max(0,duration(videoFile)-duration(audioFile));
  execFileSync('ffmpeg',['-v','error','-y','-ss',String(trim),'-i',videoFile,'-i',audioFile,'-c:v','libx264','-preset','fast','-crf','23','-pix_fmt','yuv420p','-c:a','aac','-b:a','128k','-shortest','-movflags','+faststart',resolve(output,'prologue-performance.mp4')]);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({result:'PASS',checks:['real decoded audio and nonzero output','animated water/weather','pause freezes picture and sound','mute persists reload','hidden-tab suspend/resume','reduced motion','one cat cue per take','late/failed audio recovery','no ghost loops after skip/title','complete real-time automatic sequence','38-second captured performance with actual game audio'],errors}));
} catch (error) {
  if (!page.isClosed()) await page.screenshot({path:resolve(output,'failure.png')});
  console.error(error); process.exitCode = 1;
} finally { await browser.close(); }
