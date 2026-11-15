import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-bridge');
await mkdir(output, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'], proxy });
const errors = [], results = [];
let current;

async function journey(mobile) {
  const name = mobile ? 'touch' : 'desktop';
  const size = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const context = await browser.newContext({ viewport: size, isMobile: mobile, hasTouch: mobile, recordVideo: { dir: resolve(output, name), size } });
  const page = current = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${name}: ${response.status()} ${response.url()}`); });
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('odyssey.save.v1')));
  const button = label => page.getByRole('button', { name: label, exact: true });
  const activate = locator => mobile ? locator.tap() : locator.click();
  const ready = () => page.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor();
  const choose = (id) => activate(page.getByTestId(id));
  const shot = async label => {
    await page.waitForTimeout(450);
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false);
    await page.screenshot({ path: resolve(output, `${name}-${label}.png`) });
  };
  async function travel(to) {
    await ready(); await activate(button('路线')); await choose(`route-${to}`);
    await page.waitForFunction(to => document.querySelector('[data-testid="walk-stage"]')?.dataset.scene === `dba.scene.${to}`, to);
    await ready();
  }
  async function spot(id) {
    await ready(); const target = page.getByTestId(id);
    if (await target.getAttribute('data-reach') !== 'near') {
      await activate(target);
      await page.waitForFunction(id => document.querySelector(`[data-testid="${id}"]`)?.dataset.reach === 'near', id);
    }
    await page.waitForFunction(() => document.querySelector('[data-testid="traveler"]')?.dataset.moving === 'no');
    await activate(target);
  }
  async function resume() { await page.reload(); await activate(button('继续')); await ready(); }
  await page.goto(url); await activate(button('新游戏'));
  for (let n = 0; n < 3; n++) await activate(button('下一幕'));
  await activate(button('走上潮线')); await ready();
  // A focused fixture starts at the courtyard with prior survival complete.
  // The separate learning journey still verifies these beats from a new save.
  await page.evaluate(() => {
    const save = JSON.parse(localStorage.getItem('odyssey.save.v1'));
    save.currentScene = 'dba.scene.yard';
    for (const id of ['water', 'sleep', 'food']) save.beats[`dba.beat.${id}`] = true;
    for (const id of ['water', 'danger', 'sleep', 'give', 'sun']) save.words[`dba.word.${id}`].state = 'learned';
    localStorage.setItem('odyssey.save.v1', JSON.stringify(save));
  });
  await resume(); await travel('path');
  if (mobile) await page.route('**/bridge-inspection-*.webp', route => route.abort('failed'));
  await spot(mobile ? 'path-stop' : 'path-step'); await page.getByTestId('bridge-puzzle').waitFor();
  if (!mobile) assert.equal((await read()).feedback.line, 'spot.path.step');
  assert.notEqual((await read()).beats['dba.beat.danger'], true);
  const foot = () => page.getByTestId('traveler').evaluate(el => [el.dataset.x, el.dataset.y]);
  const beforeFoot = await foot(); await page.keyboard.down('d'); await page.waitForTimeout(500); await page.keyboard.up('d');
  assert.deepEqual(await foot(), beforeFoot, 'movement is paused behind the inspection');
  if (!mobile) {
    await page.waitForTimeout(21000);
    assert.equal((await read()).companion.level, 0, 'reading the inspection does not trigger idle assistance');
  }
  if (mobile) {
    await page.getByText(/近景暂未载入/).waitFor();
    await choose('bridge-inspect-boards');
    assert.equal((await read()).flags['dba.puzzle.bridge.boards'], true, 'observation remains usable without artwork');
    await page.unroute('**/bridge-inspection-*.webp'); await activate(button('重新载入画面'));
  }
  await page.locator('.bridge-closeup > img').evaluate(img => img.decode());
  await shot('inspect');
  await choose('bridge-inspect-boards'); await choose('bridge-inspect-rope');
  if (mobile) {
    await page.setViewportSize({ width: 844, height: 390 });
    await shot('landscape-observation');
    const close = await button('回到雾径').boundingBox();
    assert.ok(close.y >= 0 && close.y + close.height <= 390, 'close stays visible after rotation');
    await page.setViewportSize(size);
  }
  await choose('bridge-read-sleep'); assert.equal((await read()).words['dba.word.wait'].state, 'guessed');
  await page.getByTestId('bridge-read-wait').scrollIntoViewIfNeeded(); await shot('read-carving');
  await choose('bridge-read-wait'); assert.equal((await read()).words['dba.word.wait'].state, 'learned');
  await page.waitForFunction(() => document.activeElement?.getAttribute('data-testid') === 'bridge-slot-reason');
  await choose('bridge-word-water'); await choose('bridge-word-give'); await choose('bridge-signal');
  assert.equal((await read()).feedback.line, 'spot.bridge.wrongReason');
  await choose('bridge-slot-reason'); await choose('bridge-word-danger'); await choose('bridge-signal');
  assert.equal((await read()).feedback.line, 'spot.bridge.wrongIntent');
  await choose('bridge-word-wait'); await activate(button('回到雾径'));
  assert.notEqual((await read()).beats['dba.beat.danger'], true);
  await resume(); await spot('path-stop');
  assert.equal((await read()).flags['dba.puzzle.bridge.reason'], 'dba.word.danger');
  assert.equal((await read()).flags['dba.puzzle.bridge.intent'], 'dba.word.wait');
  await choose('bridge-slot-intent'); await activate(button('清空这一格'));
  assert.equal(await page.getByTestId('bridge-signal').isDisabled(), true);
  await choose('bridge-word-wait'); await page.getByTestId('bridge-signal').scrollIntoViewIfNeeded(); await shot('compose');
  const catStart = await page.getByTestId('companion-anchor').evaluate(el => parseFloat(el.style.left));
  await choose('bridge-signal'); await page.getByTestId('bridge-puzzle').waitFor({ state: 'hidden' });
  assert.notEqual((await read()).beats['dba.beat.danger'], true);
  const frames = await page.evaluate(() => new Promise(resolve => {
    const result = [], start = performance.now();
    function sample() {
      const cat = document.querySelector('[data-testid="companion-anchor"]');
      result.push({ x: parseFloat(cat.style.left), beat: cat.dataset.beat, phase: cat.dataset.guide });
      if (performance.now() - start < 3500) requestAnimationFrame(sample); else resolve(result);
    }
    requestAnimationFrame(sample);
  }));
  assert.ok(frames.some(frame => frame.beat === 'P1' && frame.phase === 'move'), 'guide visibly returns instead of teleporting');
  assert.ok(frames.at(-1).x < catStart - 3, 'guide returns toward the left gate');
  assert.equal(frames.at(-1).phase, 'hold');
  await shot('guide-return'); await travel('yard');
  assert.equal((await read()).beats['dba.beat.danger'], true); await shot('safe-return');
  await resume(); assert.equal((await read()).beats['dba.beat.danger'], true);
  results.push({ mode: name, checks: ['real route entry', 'modal pauses movement', 'two clues', 'local learning and wrong reading', 'repair wrong reason and intent', 'partial save and reload', 'explicit signal', 'guide gaze and movement', 'physical return completion', ...(mobile ? ['image failure and retry', 'touch and rotation'] : ['no idle hint while reading'])], guide: { start: catStart, end: frames.at(-1).x, sampledFrames: frames.length } });
  console.log(name, 'PASS'); await context.close();
}
try {
  await journey(false); await journey(true); assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', results, errors }, null, 2));
} catch (error) {
  if (current && !current.isClosed()) await current.screenshot({ path: resolve(output, 'failure.png') });
  console.error(error); process.exitCode = 1;
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ results, errors }, null, 2)); await browser.close();
}
