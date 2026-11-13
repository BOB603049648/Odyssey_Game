import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-gameplay');
await mkdir(output, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'], proxy });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, hasTouch: true });
page.setDefaultTimeout(30000);
const errors = [];
page.on('pageerror', e => errors.push(e.message));
page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('odyssey.save.v1')));
const ready = () => page.locator('.scene-display').waitFor({ state: 'hidden' });
const sheetVisible = () => page.waitForFunction(() => {
  const sheet = document.querySelector('.sheet.in');
  return sheet && Number(getComputedStyle(sheet).opacity) >= .99;
});
async function close() {
  if (['casefile','lexicon','settings'].includes((await save()).overlay)) await page.getByRole('button', { name: '合上', exact: true }).click();
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
}
async function spot(id) {
  await close(); await ready();
  const target = page.getByTestId(id);
  if (await target.getAttribute('data-reach') !== 'near') {
    await target.click();
    await page.waitForFunction(id => document.querySelector(`[data-testid="${id}"]`)?.dataset.reach === 'near', id);
    await page.waitForFunction(() => document.querySelector('[data-testid="traveler"]')?.dataset.moving === 'no');
  }
  await target.click();
}
async function travel(to) {
  await close();
  await page.getByRole('button', { name: '路线', exact: true }).click();
  await page.getByTestId(`route-${to}`).click();
  console.log('route requested', to);
  await page.waitForFunction(to => document.querySelector('[data-testid="walk-stage"]')?.dataset.scene === `dba.scene.${to}`, to);
  await ready();
}
async function learnBand() {
  while (await page.locator('button[data-testid^="object-"]').count()) {
    const id = (await page.locator('button[data-testid^="object-"]').first().getAttribute('data-testid')).slice(7);
    await page.getByTestId(`cell-${id}`).click();
    await page.getByTestId(`object-${id}`).click();
  }
}
try {
  await page.goto(url);
  await page.getByRole('button', { name: '新游戏', exact: true }).click();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一幕', exact: true }).click();
  await page.getByRole('button', { name: '走上潮线', exact: true }).click(); await ready();
  await spot('island-mural');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '看向导', exact: true }).click();
  await page.getByTestId('cell-dba.word.fire').click();
  assert.equal((await save()).companion.level, 0);
  await page.getByRole('button', { name: '看向导', exact: true }).click();
  assert.equal((await save()).companion.targetId, 'dba.word.fire');
  await learnBand();
  await page.screenshot({ path: resolve(output, 'mural-complete.png'), animations: 'disabled' });
  for (let i = 0; i < 2; i++) { await page.getByTestId('mural-next-band').click(); await learnBand(); }
  await page.getByTestId('mural-next-band').click();
  await page.setViewportSize({ width: 390, height: 844 });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  for (const tab of await page.getByRole('tab').all()) assert.ok((await tab.boundingBox()).height >= 44);
  await page.screenshot({ path: resolve(output, 'mobile-mural.png') });
  // Every abstract cell and answer must remain clickable, including the rows
  // below the fold; the companion must not cover the answer tray.
  await learnBand();
  assert.equal(Object.values((await save()).words).filter(w => ['learned','mastered'].includes(w.state)).length, 28);
  assert.equal(await page.locator('.gloss').count(), 0);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.getByRole('button', { name: '返回', exact: true }).click();
  await page.getByTestId('journey-status').click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.locator('[data-testid="journey-checklist"] li[data-complete="no"]').count(), 4);
  await close();
  await spot('island-gourd'); await page.getByTestId('use-dba.word.water').click();
  await spot('island-gourd'); assert.equal((await save()).feedback.line, 'spot.gourd.again');
  await spot('shore-depart');
  assert.equal((await save()).overlay, 'none');
  assert.equal((await save()).beats['dba.beat.depart'], undefined);
  assert.equal((await save()).feedback.line, 'spot.depart.food');
  await page.getByTestId('journey-status').click();
  await page.getByRole('dialog').waitFor();
  await sheetVisible();
  assert.equal(await page.getByTestId('spot-line').count(), 0, 'scene feedback covers the journal');
  await page.screenshot({ path: resolve(output, 'journey-incomplete.png') }); await close();
  await travel('camp'); await spot('camp-sleep');
  await page.waitForFunction(() => document.querySelector('[data-testid="walk-stage"]')?.dataset.resting === 'yes');
  // Choosing a route during the short rest must wait, then walk after rising.
  await travel('yard'); await spot('yard-give');
  await travel('path'); await spot('path-step');
  assert.equal((await save()).feedback.line, 'spot.path.step');
  await spot('path-stop'); assert.equal((await save()).beats['dba.beat.danger'], true);
  await travel('yard'); await travel('camp'); await travel('night');
  await spot('night-ember'); assert.equal((await save()).feedback.line, 'spot.ember.ok');
  await travel('camp'); await travel('shore');
  await page.getByTestId('journey-status').click();
  await page.getByRole('dialog').waitFor();
  assert.equal(await page.locator('[data-testid="journey-checklist"] li[data-complete="yes"]').count(), 4);
  await sheetVisible();
  await page.screenshot({ path: resolve(output, 'journey-ready.png') }); await close();
  await spot('shore-depart'); await page.getByTestId('depart-plate').waitFor();
  assert.deepEqual((await save()).evidence, ['dba.ev.a'], 'optional evidence became required');
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一幕', exact: true }).click();
  await page.getByRole('button', { name: '合上', exact: true }).click();
  await page.reload(); await page.getByRole('button', { name: '继续', exact: true }).click(); await ready();
  assert.equal((await save()).beats['dba.beat.depart'], true);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', checks: ['hint retarget', 'visible band progression', 'mobile all abstract answers', 'drinking acknowledgment', 'early departure blocked', 'four survival actions', 'route queued during rest', 'optional evidence skipped', 'ember and danger feedback', 'completed save reload'], errors }));
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  console.error('last scene', (await save())?.currentScene);
  console.error('walker', await page.getByTestId('traveler').evaluate(el => ({ ...el.dataset })));
  await writeFile(resolve(output, 'failure-save.json'), JSON.stringify(await save(), null, 2));
  console.error(error); process.exitCode = 1;
} finally { await browser.close(); }
