import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-movement');
await mkdir(output, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'], proxy });
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, recordVideo: { dir: output, size: { width: 1440, height: 900 } } });
const page = await context.newPage();
const errors = [], atlases = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); if (r.url().includes('stride-atlas')) atlases.push(r.url()); });
const traveler = page.getByTestId('traveler');
const position = () => traveler.evaluate(e => ({ x: Number(e.dataset.x), y: Number(e.dataset.y) }));
try {
  await page.goto(url);
  await page.getByRole('button', { name: '新游戏', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一幕', exact: true }).click();
  await page.getByRole('button', { name: '走上潮线', exact: true }).click();
  await page.locator('.scene-display').waitFor({ state: 'hidden' });
  await page.evaluate(() => {
    window.movementSamples = [];
    window.movementReleases = [];
    window.addEventListener('keyup', event => {
      const actor = document.querySelector('[data-testid="traveler"]');
      if (actor) window.movementReleases.push({ key: event.key, x: Number(actor.dataset.x), y: Number(actor.dataset.y) });
    }, true);
    const sample = () => {
      const actor = document.querySelector('[data-testid="traveler"]');
      const img = actor?.querySelector('[data-layer="current"]');
      if (actor && img) window.movementSamples.push({ time: performance.now(), x: Number(actor.dataset.x), y: Number(actor.dataset.y), pose: actor.dataset.pose, facing: actor.dataset.facing, frame: img.dataset.atlas, ready: img.complete && img.naturalWidth > 0 });
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  // Real keyboard displacement and release in all four facings, with screenshots
  // taken from the live game, rather than a pose-only preview component.
  for (const [key, facing] of [['d','right'], ['a','left'], ['s','front'], ['w','back']]) {
    await page.keyboard.down(key);
    await page.waitForTimeout(650);
    await page.screenshot({ path: resolve(output, `walk-${facing}.png`) });
    await page.waitForTimeout(450);
    await page.keyboard.up(key);
    // Sample at the input event, not in an earlier protocol round trip: video
    // encoding or a busy test host can delay keyup after that earlier read.
    const released = await page.evaluate(() => window.movementReleases.at(-1));
    await page.waitForTimeout(400);
    const stopped = await position();
    assert.ok(Math.hypot((stopped.x-released.x)*16/9, stopped.y-released.y) < .016, `excessive release slide: ${JSON.stringify({key,released,stopped})}`);
    assert.equal(await traveler.getAttribute('data-pose'), 'idle');
    await page.waitForTimeout(200);
    assert.deepEqual(await position(), stopped, 'movement continued after release');
  }
  const samples = await page.evaluate(() => window.movementSamples);
  for (const facing of ['right','left','front','back']) {
    const walking = samples.filter(s => s.facing === facing && s.pose === 'walk');
    assert.ok(walking.length > 15, `no sustained ${facing} walk`);
    assert.equal(new Set(walking.map(s => s.frame).filter(Boolean)).size, 4, `${facing} did not show all four walk poses`);
    assert.ok(walking.every(s => s.ready), `${facing} contained an undecoded image`);
  }
  assert.equal(new Set(atlases).size, 1, 'walk cells downloaded different atlases');
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'movement.json'), JSON.stringify({ result: 'PASS', errors, atlases, samples }, null, 2));
  console.log(JSON.stringify({ result: 'PASS', checks: ['four facings / four frames', 'cold atlas decode', 'short release', 'stationary idle'], errors }));
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  await writeFile(resolve(output, 'failure-samples.json'), JSON.stringify(await page.evaluate(() => ({ samples: window.movementSamples, releases: window.movementReleases })), null, 2));
  console.error(error); process.exitCode = 1;
} finally {
  await context.close(); await browser.close();
}
