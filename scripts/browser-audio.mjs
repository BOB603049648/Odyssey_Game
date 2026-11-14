import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-audio');
await mkdir(output, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true,
  args: ['--no-sandbox', '--autoplay-policy=user-gesture-required'], proxy });
const results = [], errors = [];
function probe() {
  window.soundProbe = { contexts: [], voices: [] };
  // Exercise optional Safari routing without pretending Chromium is Safari.
  if (!navigator.audioSession) Object.defineProperty(navigator, 'audioSession', { value: { type: 'auto' } });
  const Original = window.AudioContext, connect = AudioNode.prototype.connect;
  AudioNode.prototype.connect = function(destination, ...args) {
    const result = connect.call(this, destination, ...args);
    const observed = window.soundProbe.contexts.find(item => item.context === this.context);
    if (observed && destination === this.context.destination) connect.call(this, observed.analyser);
    return result;
  };
  window.AudioContext = class extends Original {
    constructor(...args) {
      super(...args); const analyser = this.createAnalyser(); analyser.fftSize = 2048;
      window.soundProbe.contexts.push({ context: this, analyser });
    }
    createBufferSource() {
      const source = super.createBufferSource(), start = source.start.bind(source), entry = { live: false, loop: false };
      window.soundProbe.voices.push(entry);
      source.start = (...args) => { entry.live = true; entry.loop = source.loop; return start(...args); };
      source.addEventListener('ended', () => { entry.live = false; });
      return source;
    }
  };
  window.soundProbe.level = () => {
    const observed = window.soundProbe.contexts.at(-1); if (!observed) return 0;
    const samples = new Float32Array(2048); observed.analyser.getFloatTimeDomainData(samples);
    return Math.sqrt(samples.reduce((sum, value) => sum + value * value, 0) / samples.length);
  };
}
try {
  for (const mobile of [false, true]) {
    const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 }, isMobile: mobile, hasTouch: mobile });
    await context.addInitScript(probe);
    const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
    const audible = () => page.waitForFunction(() => window.soundProbe.contexts.at(-1)?.context.state === 'running' && window.soundProbe.level() > .001);
    const gesture = locator => mobile ? locator.tap() : locator.click();
    await page.goto(url);
    assert.equal(await page.evaluate(() => window.soundProbe.contexts.length), 0);
    await page.getByRole('button', { name: '启用声音', exact: true }).waitFor();
    await gesture(page.getByRole('button', { name: '试听声音', exact: true })); await audible();
    assert.equal(await page.evaluate(() => navigator.audioSession.type), 'playback');
    await gesture(page.getByRole('button', { name: '新游戏', exact: true })); await audible();
    await page.locator('[data-audio="playing"]').waitFor();
    // Real AudioContext suspension, rather than merely hiding the page.
    await page.evaluate(() => window.soundProbe.contexts[0].context.suspend());
    await page.locator('[data-audio-status="blocked"]').waitFor();
    await gesture(page.getByRole('button', { name: '下一幕', exact: true })); await audible();
    await page.locator('.audio-recovery-note').waitFor({ state: 'hidden' });
    await page.evaluate(async () => {
      Object.defineProperty(document, 'hidden', { configurable: true, value: true });
      document.dispatchEvent(new Event('visibilitychange'));
      await window.soundProbe.contexts[0].context.suspend();
    });
    await page.waitForTimeout(200);
    assert.equal(await page.evaluate(() => window.soundProbe.contexts[0].context.state), 'suspended');
    await page.evaluate(() => { delete document.hidden; document.dispatchEvent(new Event('visibilitychange')); }); await audible();
    // An explicit toggle must recover once, never flip back to mute because of
    // the global recovery listener's event ordering.
    await page.evaluate(() => window.soundProbe.contexts[0].context.suspend());
    await gesture(page.getByRole('button', { name: '启用声音', exact: true })); await audible();
    assert.equal(await page.evaluate(() => JSON.parse(localStorage.getItem('odyssey.audio.v1')).muted), false);
    await gesture(page.getByRole('button', { name: '声音开', exact: true }));
    await page.waitForFunction(() => window.soundProbe.level() < .0001);
    await page.reload(); await gesture(page.getByRole('button', { name: '继续', exact: true }));
    assert.equal(await page.evaluate(() => window.soundProbe.contexts.length), 0, 'saved mute must survive recovery');
    await gesture(page.getByRole('button', { name: '声音关', exact: true })); await audible();
    await gesture(page.getByRole('button', { name: '跳过序章', exact: true }));
    await page.locator('.scene-display').waitFor({ state: 'hidden' }); await audible();
    await page.waitForTimeout(350);
    assert.equal(await page.evaluate(() => window.soundProbe.voices.filter(v => v.live && v.loop).length), 1);
    await page.evaluate(() => window.soundProbe.contexts[0].context.suspend());
    await page.locator('.audio-recovery-note').waitFor();
    await gesture(page.locator('.audio-recovery-note').getByRole('button', { name: '启用声音' })); await audible();
    await gesture(page.getByRole('button', { name: '设置', exact: true }));
    const slider = page.getByRole('slider', { name: '音量' }); await slider.fill('0');
    await page.getByRole('button', { name: '声音关', exact: true }).waitFor();
    await gesture(page.getByRole('button', { name: '试听声音', exact: true })); await audible();
    assert.equal(await slider.inputValue(), '70');
    await page.screenshot({ path: resolve(output, mobile ? 'mobile-audio.png' : 'desktop-audio.png') });
    results.push({ mobile, checks: ['gesture unlock', 'two-tone output', 'playback routing', 'resume on game input', 'resume after background', 'explicit recovery', 'saved mute', 'one scene loop', 'zero volume recovery'], rms: await page.evaluate(() => window.soundProbe.level()) });
    await context.close();
  }
  // The independent output check works even when all downloadable audio fails.
  const context = await browser.newContext(); await context.addInitScript(probe);
  const page = await context.newPage(); page.on('pageerror', error => errors.push(error.message));
  let blockAudio = true;
  await page.route('**/*.mp3', route => blockAudio ? route.abort('failed') : route.continue());
  await page.goto(url); await page.getByRole('button', { name: '新游戏', exact: true }).click();
  await page.getByRole('button', { name: '跳过序章', exact: true }).click();
  await page.locator('.audio-recovery-note').waitFor();
  await page.getByRole('button', { name: '设置', exact: true }).click();
  await page.getByRole('button', { name: '试听声音', exact: true }).click();
  await page.waitForFunction(() => window.soundProbe.level() > .001);
  blockAudio = false;
  // Close the overlay before retrying the scene's visible recovery control.
  await page.keyboard.press('Escape');
  await page.locator('.audio-recovery-note').getByRole('button', { name: '重试声音' }).click();
  await page.waitForFunction(() => window.soundProbe.voices.some(v => v.live && v.loop));
  await page.locator('.audio-recovery-note').waitFor({ state: 'hidden' });
  results.push({ checks: ['scene failure is visible', 'offline output test', 'manual MP3 retry'] });
  await context.close();
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'result.json'), JSON.stringify({ result: 'PASS', results, errors }, null, 2));
  console.log(JSON.stringify({ result: 'PASS', results, errors }));
} finally { await browser.close(); }
