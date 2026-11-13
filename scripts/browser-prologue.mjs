import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-prologue');
await mkdir(output, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'], proxy });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
const page = await context.newPage();
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('odyssey.save.v1')));
const ready = async (step) => {
  await page.locator(`[data-frame-status="ready"][data-displayed-step="${step}"]`).waitFor();
  await page.waitForFunction(() => {
    const img = document.querySelector('[data-testid="still-frame"] img');
    return img?.complete && img.naturalWidth > 0;
  });
};
const capture = async (name) => {
  await page.waitForTimeout(750); // Finish the deliberately short dissolve before comparison.
  await page.screenshot({ path: resolve(output, name) });
};
const layout = async () => {
  const result = await page.evaluate(() => {
    const pic = document.querySelector('[data-testid="still-frame"] img');
    const controls = [...document.querySelectorAll('.prologue-header button, .prologue-controls button')];
    const text = document.querySelector('.prologue-narration').getBoundingClientRect();
    return {
      fit: getComputedStyle(pic).objectFit,
      overflow: document.documentElement.scrollWidth > innerWidth,
      controlsVisible: controls.every(button => {
        const b = button.getBoundingClientRect();
        return b.x >= 0 && b.y >= 0 && b.right <= innerWidth + 1 && b.bottom <= innerHeight + 1;
      }),
      textVisible: text.x >= 0 && text.right <= innerWidth && text.bottom <= innerHeight,
    };
  });
  assert.deepEqual(result, { fit: 'contain', overflow: false, controlsVisible: true, textVisible: true });
};
try {
  let releaseDark;
  const darkGate = new Promise(resolve => { releaseDark = resolve; });
  let blockBreak = true;
  await page.route('**/prologue-dark-*.webp', async route => { await darkGate; await route.continue(); });
  await page.route('**/prologue-break-*.webp', route => blockBreak ? route.abort('failed') : route.continue());
  await page.goto(url);
  await page.getByRole('button', { name: '新游戏', exact: true }).click();
  await ready(0);
  await layout();
  await capture('01-storm-desktop.png');
  await page.getByRole('button', { name: '下一幕', exact: true }).click();
  assert.equal(await page.getByTestId('prologue').getAttribute('data-displayed-step'), '0');
  assert.equal(await page.getByRole('button', { name: '下一幕' }).isDisabled(), true);
  assert.match(await page.locator('[data-caption]').innerText(), /浪头吞没了船/);
  await capture('loading-keeps-previous.png');
  releaseDark();
  await ready(1);
  await capture('02-rescue-desktop.png');
  // Native keyboard activation of the focused button must advance exactly once.
  await page.getByRole('button', { name: '下一幕' }).focus();
  await page.keyboard.press('Enter');
  await page.locator('[data-frame-status="error"]').waitFor();
  assert.equal((await save()).prologueStep, 2);
  assert.equal(await page.getByTestId('prologue').getAttribute('data-displayed-step'), '1');
  await capture('failure-keeps-previous.png');
  blockBreak = false;
  await page.getByRole('button', { name: '重新加载', exact: true }).click();
  await ready(2);
  await capture('03-memory-desktop.png');
  await page.reload();
  await page.getByRole('button', { name: '继续', exact: true }).click();
  await ready(2);
  await page.keyboard.press('ArrowLeft');
  await ready(1);
  await page.keyboard.press('ArrowRight');
  await ready(2);
  assert.equal((await save()).evidence.filter(id => id === 'dba.ev.a').length, 1);
  await page.keyboard.press('ArrowRight');
  await ready(3);
  await layout();
  await capture('04-arrival-desktop.png');
  for (const [width, height] of [[390, 844], [320, 568], [844, 390]]) {
    await page.setViewportSize({ width, height });
    await ready(3);
    const expectedComposition = width === 390 ? 'portrait' : 'landscape';
    await page.locator(`[data-testid="still-frame"][data-composition="${expectedComposition}"]`).waitFor();
    await layout();
    await capture(`arrival-${width}x${height}.png`);
    await page.keyboard.press('ArrowLeft');
    await ready(2);
    await layout(); // Longest caption at each aspect ratio.
    await capture(`memory-${width}x${height}.png`);
    await page.keyboard.press('ArrowRight');
    await ready(3);
  }
  await page.emulateMedia({ reducedMotion: 'reduce' });
  assert.equal(await page.locator('.prologue-shot-in').evaluate(el => getComputedStyle(el).animationName), 'none');
  await page.getByRole('button', { name: '走上潮线', exact: true }).click();
  await page.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor();
  assert.match(await page.getByTestId('current-goal').innerText(), /刻痕/);
  assert.equal((await save()).flags['pro.flag.met-companion'], true);
  await capture('shore-handoff.png');
  // New players can skip immediately without missing evidence or tutorial gates.
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: '新游戏', exact: true }).click();
  await page.getByRole('button', { name: '跳过序章', exact: true }).click();
  await page.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor();
  const skipped = await save();
  assert.deepEqual(skipped.evidence, ['dba.ev.a']);
  for (const flag of ['pro.flag.heard-meow', 'pro.flag.saw-break', 'pro.flag.met-companion']) assert.equal(skipped.flags[flag], true);
  assert.equal(skipped.beats['dba.beat.water'], undefined);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.evaluate(() => localStorage.clear());
  await page.reload();
  await page.getByRole('button', { name: '新游戏', exact: true }).click();
  for (let step = 0; step < 4; step++) {
    await ready(step);
    await page.locator('[data-testid="still-frame"][data-composition="portrait"]').waitFor();
    assert.equal(await page.locator('[data-testid="still-frame"] img').evaluate(img => img.naturalHeight > img.naturalWidth), true);
    await layout();
    await capture(`portrait-${step}.png`);
    if (step < 3) await page.getByRole('button', { name: '下一幕', exact: true }).click();
  }
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', checks: ['four complete painted shots', 'slow transfer retains previous shot', 'failure and retry', 'keyboard without double advance', 'resume mid-prologue', 'rewatch without duplicate evidence', '390/320 portrait and 844 landscape', 'four dedicated portrait paintings', 'reduced motion', 'shore handoff', 'skip preserves story and gameplay gates'], errors }));
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  console.error(error); process.exitCode = 1;
} finally { await browser.close(); }
