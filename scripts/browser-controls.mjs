import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-controls');
await mkdir(output, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'], proxy });
const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true });
page.setDefaultTimeout(30000);
const errors = [];
page.on('pageerror', error => errors.push(error.message));
page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
const ready = () => page.locator('.scene-display').waitFor({ state: 'hidden' });
const save = () => page.evaluate(() => JSON.parse(localStorage.getItem('odyssey.save.v1')));
async function travel(to) {
  await page.getByRole('button', { name: '路线', exact: true }).tap();
  await page.getByTestId(`route-${to}`).tap();
  await page.waitForFunction(to => document.querySelector('[data-testid="walk-stage"]')?.dataset.scene === `dba.scene.${to}`, to);
  await ready();
  console.log('touch route', to);
}

try {
  await page.goto(url);
  await page.getByRole('button', { name: '新游戏', exact: true }).tap();
  for (let i = 0; i < 3; i++) await page.getByRole('button', { name: '下一幕', exact: true }).tap();
  await page.getByRole('button', { name: '走上潮线', exact: true }).tap();
  await ready();

  // Native activation must reach the focused HUD control rather than the game shortcut.
  await page.getByRole('button', { name: '词库', exact: true }).focus();
  await page.keyboard.press('Enter');
  await page.getByRole('dialog').waitFor();
  assert.equal((await save()).overlay, 'lexicon');
  await page.getByRole('button', { name: '合上', exact: true }).tap();
  await page.getByRole('button', { name: '案卷', exact: true }).focus();
  await page.keyboard.press('Space');
  await page.getByRole('dialog').waitFor();
  assert.equal((await save()).overlay, 'casefile');
  await page.getByRole('button', { name: '合上', exact: true }).tap();

  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '路线', exact: true }).tap();
  await page.screenshot({ path: resolve(output, 'mobile-routes.png') });
  await page.keyboard.press('Escape');
  assert.equal(await page.getByRole('navigation').count(), 0);
  assert.equal((await save()).overlay, 'none');

  // Each direction is selected from the viewport UI; no keyboard travel or save injection.
  for (const to of ['camp', 'yard', 'path', 'yard', 'camp', 'night', 'camp', 'shore', 'hall']) await travel(to);
  await page.getByTestId('hall-mural').tap();
  await page.waitForFunction(() => document.querySelector('[data-testid="hall-mural"]')?.dataset.reach === 'near');
  await page.getByTestId('nearby-action').tap();
  await page.getByRole('tab', { name: '壁画带 1', exact: true }).waitFor();
  const object = page.locator('button[data-testid^="object-"]').first();
  const word = (await object.getAttribute('data-testid')).slice(7);
  await page.getByTestId(`cell-${word}`).tap();
  await page.getByTestId(`object-${word}`).tap();
  assert.equal((await save()).words[word].state, 'learned');
  await page.getByRole('button', { name: '返回', exact: true }).tap();
  await ready();
  await travel('shore');

  const stick = await page.getByTestId('walk-stick').boundingBox();
  const client = await page.context().newCDPSession(page);
  const x = stick.x + stick.width / 2, y = stick.y + stick.height / 2;
  const before = Number(await page.getByTestId('traveler').getAttribute('data-x'));
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + 30, y, id: 1 }] });
  await page.waitForTimeout(350);
  await client.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x: x + 30, y, id: 1 }, { x: 200, y, id: 2 }] });
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [{ x: x + 30, y, id: 1 }] });
  await page.waitForTimeout(350);
  await client.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] });
  await page.waitForTimeout(700);
  assert.ok(Number(await page.getByTestId('traveler').getAttribute('data-x')) > before);
  const stopped = await page.getByTestId('traveler').getAttribute('data-x');
  await page.waitForTimeout(700);
  assert.equal(await page.getByTestId('traveler').getAttribute('data-x'), stopped);

  await page.screenshot({ path: resolve(output, 'mobile-shore.png') });
  await page.setViewportSize({ width: 844, height: 390 });
  await page.getByRole('dialog').waitFor({ state: 'hidden' });
  await page.getByRole('button', { name: '路线', exact: true }).tap();
  await page.screenshot({ path: resolve(output, 'mobile-landscape.png') });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', checks: ['native keyboard menus', 'route Escape', 'all ten touch routes', 'nearby interaction', 'mobile word learning', 'multi-touch stick release', 'landscape resize'], errors }));
} catch (error) {
  await page.screenshot({ path: resolve(output, 'failure.png') });
  console.error(error);
  process.exitCode = 1;
} finally { await browser.close(); }
