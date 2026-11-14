import { signalAtBridge } from './bridge-journey.mjs';
import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-learning');
await mkdir(output, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'], proxy });
const errors = [], results = [];
let activePage, waterLesson, completed;
const known = save => Object.values(save.words).filter(word => ['learned', 'mastered'].includes(word.state)).length;
async function setup(mobile = false, seed) {
  const viewport = mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 };
  const context = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile });
  const page = activePage = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(error.message));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${response.status()} ${response.url()}`); });
  if (seed) await page.addInitScript(save => {
    if (!localStorage.getItem('odyssey.save.v1')) localStorage.setItem('odyssey.save.v1', JSON.stringify(save));
  }, seed);
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('odyssey.save.v1')));
  const activate = el => mobile ? el.tap() : el.click();
  const button = name => page.getByRole('button', { name, exact: true });
  const ready = () => page.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor();
  const shot = async label => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'horizontal overflow');
    await page.waitForTimeout(400); // Sheet entry animation and camera layout settle before visual capture.
    await page.waitForFunction(() => [...document.querySelectorAll('.concept-picture img')]
      .filter(img => { const box = img.parentElement.getBoundingClientRect(); return box.top < innerHeight && box.bottom > 0; })
      .every(img => img.complete && img.naturalWidth > 0));
    await page.screenshot({ path: resolve(output, `${mobile ? 'touch' : 'desktop'}-${label}.png`) });
  };
  await page.goto(url);
  if (seed) await activate(button('继续'));
  else {
    await activate(button('新游戏'));
    for (let n = 0; n < 3; n++) await activate(button('下一幕'));
    await activate(button('走上潮线')); await ready();
  }
  async function spot(id) {
    await ready(); const el = page.getByTestId(id);
    if (await el.getAttribute('data-reach') !== 'near') {
      await activate(el);
      await page.waitForFunction(id => document.querySelector(`[data-testid="${id}"]`)?.dataset.reach === 'near', id);
    }
    await page.waitForFunction(() => document.querySelector('[data-testid="traveler"]')?.dataset.moving === 'no');
    await activate(el);
  }
  async function travel(to) {
    await ready(); await activate(button('路线')); await activate(page.getByTestId(`route-${to}`));
    await page.waitForFunction(to => document.querySelector('[data-testid="walk-stage"]')?.dataset.scene === `dba.scene.${to}`, to);
    await ready();
  }
  async function study(label) {
    const learned = [];
    for (let n = 0; n < 28 && await page.getByTestId('lesson-focus').count(); n++) {
      const id = await page.getByTestId('lesson-focus').getAttribute('data-word');
      assert.ok(!learned.includes(id), 'suggestion repeated a completed clue');
      await activate(page.getByTestId('lesson-focus'));
      assert.equal((await read()).selectedCellId, id);
      await activate(page.getByTestId(`object-${id}`));
      assert.equal((await read()).words[id].state, 'learned');
      learned.push(id);
    }
    await page.getByTestId('lesson-return').waitFor();
    await page.getByTestId('lesson-return').scrollIntoViewIfNeeded();
    await shot(label);
    await activate(page.getByTestId('lesson-return')); await ready();
    results.push({ check: label, learned }); console.log(label, learned);
    return learned;
  }
  return { page, context, read, activate, button, ready, shot, spot, travel, study };
}

try {
  const p = await setup(); const { page, read, button, ready, shot, spot, travel, study } = p;
  await spot('island-gourd'); assert.equal((await read()).flags['dba.puzzle.water'], 'carried');
  await spot('island-mural'); waterLesson = await read();
  assert.equal(await page.getByTestId('lesson-focus').getAttribute('data-word'), 'dba.word.water');
  await page.getByTestId('lesson-focus').click();
  await page.locator('[data-testid^="object-"]:not([data-testid="object-dba.word.water"])').first().click();
  assert.equal(known(await read()), 0, 'a wrong picture must not teach the word');
  assert.deepEqual(await study('water-return'), ['dba.word.water']);
  await spot('water-spring'); assert.equal((await read()).flags['dba.puzzle.water'], 'filled');
  await spot('island-gourd'); assert.equal((await read()).beats['dba.beat.water'], true);
  await spot('island-mural'); const rest = await study('rest-return');
  assert.equal(rest.at(-1), 'dba.word.sleep'); assert.equal(known(await read()), 7);
  await travel('camp'); await spot('camp-sleep'); assert.equal((await read()).beats['dba.beat.sleep'], true);
  await page.waitForFunction(() => document.querySelector('[data-testid="walk-stage"]')?.dataset.resting === 'no');
  await travel('yard'); for (let n = 0; n < 3; n++) await spot('yard-grab');
  await button('移一份给同行者').click(); await button('移一份给同行者').click();
  await button('回到前坪').click(); assert.equal((await read()).flags['dba.puzzle.food-self'], 2);
  await travel('camp'); await travel('shore'); await spot('island-mural');
  const food = await study('food-return'); assert.equal(food.at(-1), 'dba.word.share');
  assert.equal(known(await read()), 16);
  await travel('camp'); await travel('yard'); await spot('yard-give'); assert.equal((await read()).beats['dba.beat.food'], true);
  await travel('path'); await spot('path-stop'); await signalAtBridge(page); assert.notEqual((await read()).beats['dba.beat.danger'], true);
  await travel('yard'); assert.equal((await read()).beats['dba.beat.danger'], true); await travel('camp'); await travel('shore'); await spot('island-mural');
  assert.deepEqual(await study('departure-return'), ['dba.word.hunger', 'dba.word.promise']);
  assert.equal(known(await read()), 19);
  await button('词库').click(); await page.getByTestId('lexicon-dba.word.promise').click();
  assert.equal(await page.getByTestId('lexicon-memory').getAttribute('data-word'), 'dba.word.promise');
  assert.equal(await page.getByTestId('lexicon-dba.word.betray').count(), 0);
  await shot('memory-notebook'); await button('合上').click();
  await spot('shore-depart'); await page.getByTestId('depart-plate').waitFor();
  for (let n = 0; n < 3; n++) await button('下一幕').click();
  await button('合上').click(); await page.getByTestId('chapter-complete').waitFor(); await shot('chapter-complete');
  await button('留在岛上探索').click(); completed = await read();
  assert.equal(completed.beats['dba.beat.depart'], true);
  await page.reload(); await button('继续').click(); await ready();
  assert.equal(known(await read()), 19); assert.equal((await read()).beats['dba.beat.depart'], true);
  results.push({ check: 'complete-first-island-and-reload', learned: 19 });
  await p.context.close();

  const mobile = await setup(true, waterLesson);
  await mobile.activate(mobile.page.getByTestId('lesson-focus'));
  await mobile.page.getByTestId('object-dba.word.water').scrollIntoViewIfNeeded();
  await mobile.shot('water-choice');
  await mobile.study('water-return');
  await mobile.activate(mobile.button('词库'));
  assert.equal(await mobile.page.getByTestId('lexicon-memory').getAttribute('data-word'), 'dba.word.water');
  await mobile.shot('water-notebook'); await mobile.activate(mobile.button('合上'));
  await mobile.context.close();

  const notebook = await setup(true, completed);
  await notebook.ready(); await notebook.activate(notebook.button('词库'));
  await notebook.activate(notebook.page.getByTestId('lexicon-dba.word.promise'));
  assert.equal(await notebook.page.getByTestId('lexicon-memory').getAttribute('data-word'), 'dba.word.promise');
  const heading = await notebook.page.locator('.lexicon-memory-heading').boundingBox();
  const close = await notebook.button('合上').boundingBox();
  assert.ok(heading.y >= close.y + close.height, 'selecting a glyph reveals its memory below the pinned close control');
  assert.ok(close.y > 0 && close.y + close.height < 844, 'notebook close remains visible');
  await notebook.shot('full-notebook');
  await notebook.page.setViewportSize({ width: 844, height: 390 });
  await notebook.shot('landscape-notebook');
  await notebook.activate(notebook.button('合上')); await notebook.ready();
  await notebook.context.close(); results.push({ check: 'touch-study-notebook-and-rotation' });

  const idle = await setup();
  await idle.page.getByTestId('walk-stage').focus();
  await idle.page.keyboard.down('s'); await idle.page.waitForTimeout(22000);
  assert.equal((await idle.read()).companion.level, 0, 'held movement must not trigger help, even at a boundary');
  await idle.page.keyboard.up('s'); await idle.page.waitForTimeout(21000);
  assert.equal((await idle.read()).companion.level, 1, 'a genuine pause may offer one glance');
  await idle.page.waitForTimeout(21000);
  assert.equal((await idle.read()).companion.level, 1, 'passive help must not escalate to solving');
  await idle.context.close(); results.push({ check: 'held-input-and-single-passive-hint' });
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ result: 'PASS', results, errors }, null, 2));
} catch (error) {
  if (activePage && !activePage.isClosed()) await activePage.screenshot({ path: resolve(output, 'failure.png') });
  console.error(error); process.exitCode = 1;
} finally {
  await writeFile(resolve(output, 'report.json'), JSON.stringify({ results, errors }, null, 2));
  await browser.close();
}
