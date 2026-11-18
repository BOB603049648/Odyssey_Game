import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/prologue-loading');
const baseline = process.env.ODYSSEY_PERF_BASELINE === '1';
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'] });
const measurements = [];
const ready = (page, step) => page.locator(`[data-frame-status="ready"][data-displayed-step="${step}"]`).waitFor({ timeout: 60_000 });
try {
  // Fresh browser cache, 1 Mbps downstream and 150 ms latency. Apply before
  // navigation so title-screen warming is measured under the same conditions.
  for (const [width, height] of [[1440, 900], [390, 844]]) {
    const context = await browser.newContext({ viewport: { width, height } });
    const page = await context.newPage();
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const cdp = await context.newCDPSession(page);
    await cdp.send('Network.enable');
    await cdp.send('Network.emulateNetworkConditions', { offline: false, latency: 150, downloadThroughput: 125000, uploadThroughput: 62500 });
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    const waits = [];
    await page.evaluate(() => {
      window.__cutStarted = performance.now();
      window.__lastRequested = null;
      window.__filmObserver = new MutationObserver(() => {
        const value = document.querySelector('[data-testid="prologue"]')?.dataset.prologueStep;
        if (value !== undefined && value !== window.__lastRequested) {
          window.__lastRequested = value; window.__cutStarted = performance.now();
        }
      });
      window.__filmObserver.observe(document.body, { subtree: true, attributes: true, attributeFilter: ['data-prologue-step'], childList: true });
    });
    await page.getByRole('button', { name: '新游戏', exact: true }).click();
    for (let step = 0; step < 4; step++) {
      await ready(page, step);
      waits.push(await page.evaluate(() => Math.round(performance.now() - window.__cutStarted)));
    }
    const resources = await page.evaluate(() => performance.getEntriesByType('resource')
      .filter(item => /prologue|\.mp3/.test(item.name)).map(item => ({ url: item.name.split('/').pop(), start: item.startTime, duration: item.duration, bytes: item.transferSize })));
    measurements.push({ viewport: { width, height }, waits, resources });
    await writeFile(resolve(output, 'measurements.json'), JSON.stringify({ url, network: { downMbps: 1, latencyMs: 150 }, measurements }, null, 2));
    await page.screenshot({ path: resolve(output, `slow-${width}.png`) });
    assert.deepEqual(errors, []);
    if (!baseline) {
      assert(waits[0] < 2500, `first shot took ${waits[0]} ms`);
      assert(Math.max(...waits.slice(1)) < 1800, `automatic cuts waited ${waits.slice(1)} ms`);
      assert(!resources.some(item => /^(select|answer-right|word-learn)-/.test(item.url)), 'island SFX must not compete with prologue images');
    }
    console.log(JSON.stringify({ viewport: { width, height }, waits }));
    await context.close();
  }
  await writeFile(resolve(output, 'measurements.json'), JSON.stringify({ url, network: { downMbps: 1, latencyMs: 150 }, measurements }, null, 2));
  if (!baseline) {
    const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    const page = await context.newPage();
    let release;
    const detailGate = new Promise(resolve => { release = resolve; });
    await page.route('**/prologue-*.webp', async route => {
      if (!route.request().url().includes('-preview-')) await detailGate;
      await route.continue();
    });
    // Full-resolution failure/stalling must never freeze the shot clock or automatic progression.
    await page.goto(url);
    await page.getByRole('button', { name: '新游戏', exact: true }).click();
    await ready(page, 0);
    await page.waitForTimeout(1000);
    const shot = page.getByTestId('still-frame');
    assert((await shot.locator('img').getAttribute('src')).includes('-preview-'));
    const progress = () => page.getByTestId('prologue').evaluate(node => Number(node.dataset.elapsed));
    const before = await progress();
    await page.screenshot({ path: resolve(output, 'preview.png') });
    release();
    await page.waitForFunction(() => !document.querySelector('[data-testid="still-frame"] img').src.includes('-preview-'));
    assert(await progress() >= before, 'detail upgrade reset the cinematic clock');
    assert.equal(await page.getByTestId('prologue').getAttribute('data-playing'), 'true');
    assert.equal(await page.locator('.prologue-shot-out').count(), 0, 'detail upgrade replayed the scene transition');
    await page.screenshot({ path: resolve(output, 'detail.png') });
    await context.close();

    // If only the original files fail, all four shots still play. If only a
    // derivative is missing, the original remains an independent fallback.
    for (const failPreview of [false, true]) {
      const fallbackContext = await browser.newContext();
      const fallback = await fallbackContext.newPage();
      await fallback.route('**/prologue-*.webp', route => route.request().url().includes('-preview-') === failPreview ? route.abort('failed') : route.continue());
      await fallback.goto(url);
      await fallback.getByRole('button', { name: '新游戏', exact: true }).click();
      for (let step = 0; step < 4; step++) await ready(fallback, step);
      await fallback.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor();
      await fallbackContext.close();
    }
  }
  console.log(baseline ? 'Baseline recorded.' : 'PASS: slow network, progressive detail, clock continuity and independent image fallbacks.');
} finally { await browser.close(); }
