import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-scene-entry');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'] });
const errors = [], results = [];
let page, context;
const ready = () => page.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor();
const entered = scene => page.waitForFunction(scene => document.querySelector('[data-testid="walk-stage"]')?.dataset.scene === scene, `dba.scene.${scene}`);
const state = () => page.evaluate(() => {
  const stage = document.querySelector('[data-testid="walk-stage"]'), actor = stage.querySelector('[data-testid="traveler"]');
  return { scene: stage.dataset.scene, x: Number(actor.dataset.x), y: Number(actor.dataset.y), moving: actor.dataset.moving, target: stage.dataset.navTarget };
});
async function route(to) {
  await page.getByRole('button', { name: '路线', exact: true }).click();
  await page.getByTestId(`route-${to}`).click();
}
async function setup(base, name, mobile = false, cold = false) {
  context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 },
    isMobile: mobile, hasTouch: mobile, recordVideo: { dir: resolve(output, name) } });
  let release;
  if (cold) {
    const gate = new Promise(resolve => { release = resolve; });
    await context.route('**/camp-scene-*.webp', async route => { await gate; await route.continue(); });
  }
  await context.addInitScript(save => {
    localStorage.setItem('odyssey.save.v1', JSON.stringify(save));
    window.entrySamples = [];
    const sample = time => {
      const stage = document.querySelector('[data-testid="walk-stage"]'), actor = stage?.querySelector('[data-testid="traveler"]');
      if (actor) {
        const bob = actor.querySelector('.traveler-bob'), style = getComputedStyle(bob);
        window.entrySamples.push({ time, scene: stage.dataset.scene, display: stage.dataset.display,
          x: Number(actor.dataset.x), y: Number(actor.dataset.y), pose: actor.dataset.pose,
          animation: style.animationName, transform: style.transform, moving: actor.dataset.moving });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  }, base);
  page = await context.newPage(); page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  await page.goto(url); await page.getByRole('button', { name: '继续', exact: true }).click(); await ready();
  await route('camp');
  // Reach the doorway by real navigation, then take over with keyboard/touch.
  await page.waitForFunction(() => Number(document.querySelector('[data-testid="traveler"]')?.dataset.x) > .83);
  return release;
}
async function checkEntry(name, before, scene = 'camp') {
  assert.deepEqual(await state(), before, `${name}: entry moved without a fresh command`);
  assert.equal(before.moving, 'no'); assert.equal(before.target, '');
  const samples = await page.evaluate(scene => window.entrySamples.filter(s => s.scene === `dba.scene.${scene}`), scene);
  assert.ok(samples.length > 3);
  assert.ok(samples.every(s => !s.animation.includes('arrive-') && s.transform === 'none'), `${name}: forced visual entry translation`);
  assert.ok(samples.every(s => Math.abs(s.x - before.x) < .000001 && Math.abs(s.y - before.y) < .000001), `${name}: residual scene movement`);
  await page.screenshot({ path: resolve(output, `${name}.png`) });
  await writeFile(resolve(output, `${name}.json`), JSON.stringify(samples, null, 2));
}
async function freshKeyboard(name) {
  const before = await state(); const started = await page.evaluate(() => performance.now());
  await page.keyboard.down('d');
  await page.waitForFunction(x => Number(document.querySelector('[data-testid="traveler"]')?.dataset.x) > x + .004, before.x);
  const latency = await page.evaluate(start => performance.now() - start, started);
  await page.keyboard.up('d');
  assert.ok(latency < 300, `${name}: fresh input waited ${latency} ms`);
  results.push({ case: name, result: 'PASS', freshInputMs: latency });
}
try {
  context = await browser.newContext(); page = await context.newPage(); await page.goto(url);
  await page.getByRole('button', { name: '新游戏', exact: true }).click();
  await page.getByRole('button', { name: '跳过序章', exact: true }).click(); await ready();
  const base = await page.evaluate(() => JSON.parse(localStorage.getItem('odyssey.save.v1')));
  base.flags['dba.flag.taught-approach'] = true; base.flags['dba.flag.driftwood'] = true;
  await context.close();

  await setup(base, 'keyboard');
  await page.keyboard.down('d'); await entered('camp'); await ready();
  const keyboardEntry = await state();
  for (let i = 0; i < 5; i++) { await page.keyboard.down('d'); await page.waitForTimeout(70); }
  await checkEntry('keyboard', keyboardEntry);
  await page.keyboard.up('d'); await freshKeyboard('keyboard');
  // A selected route also stops at its destination; the next ground click owns movement.
  await route('yard'); await entered('yard'); await ready();
  const routeEntry = await state(); await page.waitForTimeout(650); await checkEntry('route', routeEntry, 'yard');
  const world = await page.locator('.world-layer').boundingBox();
  await page.mouse.click(world.x + .35 * world.width, world.y + .92 * world.height);
  await page.waitForFunction(x => Number(document.querySelector('[data-testid="traveler"]')?.dataset.x) > x + .004, routeEntry.x);
  results.push({ case: 'route-and-fresh-ground-click', result: 'PASS' }); await context.close();

  const release = await setup(base, 'cold-loading', false, true);
  await page.keyboard.down('d'); await entered('camp'); await page.keyboard.up('d');
  assert.equal(await page.getByTestId('walk-stage').getAttribute('data-display'), 'loading');
  await page.keyboard.down('d'); await page.waitForTimeout(250); release(); await ready();
  const coldEntry = await state();
  for (let i = 0; i < 5; i++) { await page.keyboard.down('d'); await page.waitForTimeout(70); }
  await checkEntry('cold-loading', coldEntry);
  await page.keyboard.up('d'); await freshKeyboard('cold-loading'); await context.close();

  await setup(base, 'touch', true);
  const touch = await context.newCDPSession(page), box = await page.getByTestId('walk-stick').boundingBox();
  const x = box.x + box.width / 2, y = box.y + box.height / 2;
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 40, y, id: 1 }] });
  await entered('camp'); await ready(); const touchEntry = await state();
  for (let i = 0; i < 5; i++) {
    await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 38 + i, y, id: 1 }] });
    await page.waitForTimeout(70);
  }
  await checkEntry('touch', touchEntry);
  assert.equal(await page.getByTestId('walk-stick').locator('i').evaluate(el => el.style.transform), 'translate(0px, 0px)');
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  const started = await page.evaluate(() => performance.now());
  await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 2 }] });
  await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 40, y, id: 2 }] });
  await page.waitForFunction(x => Number(document.querySelector('[data-testid="traveler"]')?.dataset.x) > x + .004, touchEntry.x);
  const latency = await page.evaluate(start => performance.now() - start, started);
  assert.ok(latency < 300, `touch: fresh input waited ${latency} ms`);
  await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  results.push({ case: 'touch', result: 'PASS', freshInputMs: latency });
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'result.json'), JSON.stringify({ result: 'PASS', results, errors }, null, 2));
  console.log(JSON.stringify({ result: 'PASS', results, errors }));
} catch (error) {
  await page?.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
  console.error(error); process.exitCode = 1;
} finally { await context?.close(); await browser.close(); }
