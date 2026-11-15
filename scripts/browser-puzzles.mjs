import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-puzzles');
await mkdir(output, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'], proxy });
const errors = [], results = [];
const mode = process.env.ODYSSEY_PUZZLE_MODE ?? 'all';
let activePage;

async function journey(mobile) {
  const name = mobile ? 'touch' : 'desktop';
  const viewport = mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 };
  const context = await browser.newContext({ viewport, hasTouch: mobile, isMobile: mobile,
    recordVideo: { dir: resolve(output, name), size: viewport } });
  const page = activePage = await context.newPage();
  page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${name}: ${response.status()} ${response.url()}`); });
  const read = () => page.evaluate(() => JSON.parse(localStorage.getItem('odyssey.save.v1')));
  const ready = () => page.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor();
  const activate = locator => mobile ? locator.tap() : locator.click();
  const button = label => page.getByRole('button', { name: label, exact: true });
  const foodDialog = () => page.getByRole('dialog', { name: '分一份晚餐', exact: true });
  const touch = mobile ? await context.newCDPSession(page) : null;
  const shot = async label => {
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: horizontal overflow`);
    await page.waitForTimeout(550); // Allow the entry veil and the latest local object state to settle.
    await page.screenshot({ path: resolve(output, `${name}-${label}.png`) });
  };
  async function spot(id) {
    await ready();
    const target = page.getByTestId(id);
    if (mobile) await revealHotspot(target, id);
    if (await target.getAttribute('data-reach') !== 'near') {
      await activateHotspot(target);
      await page.waitForFunction(id => document.querySelector(`[data-testid="${id}"]`)?.dataset.reach === 'near', id);
    }
    await page.waitForFunction(() => document.querySelector('[data-testid="traveler"]')?.dataset.moving === 'no');
    await activateHotspot(target);
  }
  async function activateHotspot(target) {
    if (!mobile) return target.click();
    const box = await target.boundingBox();
    assert.ok(box, 'missing touch target');
    const left = Math.max(8, box.x), right = Math.min(viewport.width - 8, box.x + box.width);
    const top = Math.max(8, box.y), bottom = Math.min(viewport.height - 8, box.y + box.height);
    assert.ok(right > left && bottom > top, 'touch hotspot is outside the viewport');
    await target.tap({ position: { x: (left + right) / 2 - box.x, y: (top + bottom) / 2 - box.y } });
  }
  async function holdStick(dx, dy, ms = 280) {
    const box = await page.getByTestId('walk-stick').boundingBox();
    assert.ok(box && touch, 'touch movement control is unavailable');
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    try {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx, y: y + dy, id: 1 }] });
      await page.waitForTimeout(ms);
    } finally { await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  }
  async function revealHotspot(target, id) {
    const inView = box => box && Math.min(viewport.width - 8, box.x + box.width) - Math.max(8, box.x) >= 32
      && Math.min(viewport.height - 8, box.y + box.height) - Math.max(8, box.y) >= 24;
    if (inView(await target.boundingBox())) return;
    // A phone camera crops the wide scene. Walk with the real touch stick along
    // its open foreground, then tap the now-visible object to auto-approach.
    const scene = (await read()).currentScene;
    const floor = scene === 'dba.scene.shore' ? .79 : scene === 'dba.scene.yard' ? .925 : null;
    if (floor !== null) for (let n = 0; n < 20 && Number(await page.getByTestId('traveler').getAttribute('data-y')) < floor; n++) await holdStick(0, 36);
    for (let n = 0; n < 30 && !inView(await target.boundingBox()); n++) {
      const box = await target.boundingBox();
      assert.ok(box, 'hotspot disappeared while approaching');
      const middle = box.x + box.width / 2;
      await holdStick(middle < viewport.width / 2 ? -36 : 36, 0);
    }
    assert.ok(inView(await target.boundingBox()), `could not reveal ${id} through touch movement`);
    await page.waitForFunction(() => document.querySelector('[data-testid="traveler"]')?.dataset.moving === 'no');
    console.log(`touch: joystick revealed ${id}`);
  }
  async function travel(to) {
    await activate(button('路线')); await activate(page.getByTestId(`route-${to}`));
    await page.waitForFunction(to => document.querySelector('[data-testid="walk-stage"]')?.dataset.scene === `dba.scene.${to}`, to);
    await ready();
  }
  async function resume() {
    await page.reload(); await activate(button('继续')); await ready();
  }
  async function patch(id, active) {
    await page.waitForFunction(({ id, active }) => {
      const patch = document.querySelector(`[data-testid="world-patch-${id}"]`);
      return patch?.dataset.status === 'ready' && patch.dataset.active === (active ? 'yes' : 'no')
        && getComputedStyle(patch).opacity === (active ? '1' : '0');
    }, { id, active });
  }
  async function bowls(self, companion) {
    assert.equal(await page.getByTestId('food-self-bowl').getAttribute('data-count'), String(self));
    assert.equal(await page.getByTestId('food-companion-bowl').getAttribute('data-count'), String(companion));
    assert.equal(self + companion, 4);
  }
  async function openFood() {
    await spot('yard-grab'); await foodDialog().waitFor();
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('[data-testid="food-table"] img')];
      return images.length === 5 && images.every(image => image.complete && image.naturalWidth > 0);
    });
    assert.equal(await page.getByTestId('world-state-layer').getAttribute('data-running'), 'no', 'food table must pause scene presentation');
  }
  async function closeFood() {
    await activate(button('回到前坪')); await foodDialog().waitFor({ state: 'hidden' });
  }

  await page.goto(url);
  await activate(button('新游戏')); await activate(button('跳过序章')); await ready();
  assert.equal(Object.values((await read()).words).filter(word => ['learned', 'mastered'].includes(word.state)).length, 0);
  await patch('shore-ladle', false);
  await shot('water-empty');

  // No save seeding: discover an empty vessel and fail at both the salty source
  // and the unread spring before learning the needed word through the mural.
  await spot('island-gourd');
  assert.equal((await read()).flags['dba.puzzle.water'], 'carried');
  assert.notEqual((await read()).beats['dba.beat.water'], true);
  await patch('shore-ladle', true);
  const sourceHitboxes = await page.evaluate(() => {
    const get = id => document.querySelector(`[data-testid="${id}"]`).getBoundingClientRect();
    const sea = get('water-sea');
    return ['island-mural', 'water-spring'].map(id => {
      const other = get(id);
      return { id, overlap: Math.max(0, Math.min(sea.right, other.right) - Math.max(sea.left, other.left))
        * Math.max(0, Math.min(sea.bottom, other.bottom) - Math.max(sea.top, other.top)) };
    });
  });
  assert.ok(sourceHitboxes.every(hit => hit.overlap < 1), `water source hitboxes overlap: ${JSON.stringify(sourceHitboxes)}`);
  await spot('water-sea');
  assert.equal((await read()).feedback.line, 'spot.water.salt');
  assert.equal((await read()).flags['dba.puzzle.water'], 'carried');
  await spot('water-spring');
  assert.equal((await read()).feedback.line, 'spot.water.unknown');
  assert.equal((await read()).flags['dba.puzzle.water'], 'carried');
  await shot('water-observation');
  console.log(`${name}: empty vessel, wrong source and unread spring checked`);

  await spot('island-mural');
  for (let band = 1; band <= 4; band++) {
    await activate(page.getByRole('tab', { name: `壁画带 ${band}`, exact: true }));
    while (await page.locator('.glyph-wall button[data-testid^="cell-"]').count()) {
      const id = (await page.locator('.glyph-wall button[data-testid^="cell-"]').first().getAttribute('data-testid')).slice(5);
      await activate(page.getByTestId(`cell-${id}`)); await activate(page.getByTestId(`object-${id}`));
    }
  }
  assert.equal(Object.values((await read()).words).filter(word => ['learned', 'mastered'].includes(word.state)).length, 28);
  await activate(button('返回')); await ready();
  await spot('water-spring');
  assert.equal((await read()).flags['dba.puzzle.water'], 'filled');
  assert.notEqual((await read()).beats['dba.beat.water'], true, 'filling must not award drinking');
  const filledStep = (await read()).stepCounter;
  await resume();
  assert.equal((await read()).flags['dba.puzzle.water'], 'filled');
  assert.equal((await read()).stepCounter, filledStep, 'resume replayed a puzzle reward');
  await patch('shore-ladle', true); await shot('water-restored');
  await spot('island-gourd');
  assert.equal((await read()).beats['dba.beat.water'], true);
  await patch('shore-ladle', false);
  const waterStep = (await read()).stepCounter;
  await spot('island-gourd');
  assert.equal((await read()).stepCounter, waterStep, 'repeat drinking awarded progress twice');
  console.log(`${name}: fill, resume, drink and repeated action checked`);

  await travel('camp'); await travel('yard');
  await spot('yard-give');
  assert.equal((await read()).feedback.line, 'spot.food.inspectFirst');
  assert.notEqual((await read()).beats['dba.beat.food'], true);
  await spot('yard-grab'); assert.equal((await read()).flags['dba.puzzle.food'], 'inspected');
  await spot('yard-grab'); assert.equal((await read()).flags['dba.puzzle.food'], 'taken');
  await patch('yard-source', true); await patch('yard-share', false);
  await openFood(); await bowls(4, 0);
  await activate(button('移一份给同行者')); await bowls(3, 1);
  await closeFood(); await spot('yard-give');
  assert.equal((await read()).feedback.line, 'spot.food.unequal');
  assert.notEqual((await read()).beats['dba.beat.food'], true);
  assert.equal((await read()).flags['dba.puzzle.food-self'], 3);
  await openFood(); await bowls(3, 1); await shot('food-unequal');
  if (!mobile) {
    const before = await page.getByTestId('traveler').evaluate(element => ({ x: element.dataset.x, y: element.dataset.y }));
    await page.keyboard.down('d'); await page.waitForTimeout(250); await page.keyboard.up('d');
    assert.deepEqual(await page.getByTestId('traveler').evaluate(element => ({ x: element.dataset.x, y: element.dataset.y })), before, 'modal input moved the traveler');
  }
  await activate(button('移一份给同行者')); await bowls(2, 2);
  await activate(button('移一份给自己')); await bowls(3, 1);
  await activate(button('移一份给同行者')); await bowls(2, 2);
  await shot('food-balanced'); await closeFood();
  const dividedStep = (await read()).stepCounter;
  await resume();
  assert.equal((await read()).flags['dba.puzzle.food-self'], 2);
  assert.notEqual((await read()).beats['dba.beat.food'], true, 'division alone must not award sharing');
  assert.equal((await read()).stepCounter, dividedStep);
  await openFood(); await bowls(2, 2); await closeFood();
  await spot('yard-give');
  assert.equal((await read()).beats['dba.beat.food'], true);
  await patch('yard-source', true); await patch('yard-share', true);
  const foodStep = (await read()).stepCounter;
  await spot('yard-give'); assert.equal((await read()).stepCounter, foodStep, 'repeat giving awarded progress twice');
  await shot('food-served');
  console.log(`${name}: inspection, taking, unequal offer, reversible division, resume and serving checked`);

  if (!mobile) {
    // A v0.1.2 save has completed beats but no puzzle flags. It must render the
    // completed world and stay completable without forcing these new steps.
    const legacy = await read();
    for (const key of Object.keys(legacy.flags)) if (key.startsWith('dba.puzzle.')) delete legacy.flags[key];
    legacy.currentScene = 'dba.scene.shore'; legacy.overlay = 'none'; legacy.screen = 'island';
    await page.evaluate(save => localStorage.setItem('odyssey.save.v1', JSON.stringify(save)), legacy);
    await resume(); await patch('shore-ladle', false);
    assert.equal(await page.getByTestId('world-state-layer').getAttribute('data-water'), 'done');
    await spot('island-gourd'); assert.equal((await read()).feedback.line, 'spot.gourd.again');
    await travel('camp'); await travel('yard');
    assert.equal(await page.getByTestId('world-state-layer').getAttribute('data-food'), 'done');
    await patch('yard-source', true); await patch('yard-share', true);
    await spot('yard-give'); assert.equal((await read()).feedback.line, 'spot.food.done');
    assert.equal((await read()).stepCounter, legacy.stepCounter);
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.waitForFunction(() => document.querySelector('[data-testid="world-state-layer"]')?.dataset.running === 'no');
    await patch('yard-source', true); await patch('yard-share', true);
    await shot('legacy-completed');
    results.push({ mode: name, checks: ['old completed save without puzzle flags', 'reduced motion preserves completed props'] });
  }

  const completedSave = await read();
  const videoFile = await page.video().path();
  await context.close(); activePage = null;
  execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', videoFile, '-an', '-c:v', 'libx264', '-preset', 'fast', '-crf', '25', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', resolve(output, `puzzle-flow-${name}.mp4`)]);
  results.push({ mode: name, checks: ['real new save and mural learning', 'wrong water source', 'unlearned word refusal', 'separate take/fill/drink', 'persistent world props', 'inspect/take/divide/offer', 'unequal division refusal', 'reversible food portions', 'partial puzzle reload', 'no duplicate completion rewards', 'recorded real interaction video'] });
  return completedSave;
}

async function recoverPatch(completedSave) {
  const fixture = structuredClone(completedSave);
  fixture.currentScene = 'dba.scene.shore'; fixture.screen = 'island'; fixture.overlay = 'none';
  delete fixture.beats['dba.beat.water']; fixture.flags['dba.puzzle.water'] = 'carried';
  fixture.feedback = { seq: fixture.feedback.seq, kind: 'none' };
  const context = await browser.newContext({ viewport: { width: 1280, height: 800 } });
  await context.addInitScript(save => localStorage.setItem('odyssey.save.v1', JSON.stringify(save)), fixture);
  const page = activePage = await context.newPage(); page.setDefaultTimeout(30000);
  page.on('pageerror', error => errors.push(`patch recovery: ${error.message}`));
  let blocked = true, refused = 0;
  await page.route('**/*shore-carried*.webp', route => {
    if (blocked) { refused++; return route.abort('failed'); }
    return route.continue();
  });
  await page.goto(url); await page.getByRole('button', { name: '继续', exact: true }).click();
  await page.locator('.scene-display[data-display="failed"]').waitFor();
  assert.ok(refused > 0, 'the new state plate was not included in initial scene loading');
  await page.screenshot({ path: resolve(output, 'patch-network-failure.png') });
  blocked = false;
  await page.getByRole('button', { name: '重试', exact: true }).click();
  const recovered = () => page.waitForFunction(() => {
    const patch = document.querySelector('[data-testid="world-patch-shore-ladle"]');
    const image = patch?.querySelector('img');
    return document.querySelector('[data-testid="walk-stage"]')?.dataset.display === 'ready'
      && patch?.dataset.active === 'yes' && patch.dataset.status === 'ready'
      && image?.complete && image.naturalWidth > 0 && getComputedStyle(patch).opacity === '1';
  });
  await recovered();

  // Separate from the real request failure above: simulate a corrupted native
  // bitmap by assigning an invalid image, rather than dispatching an artificial
  // error event on a healthy node. The mounted consumer must retire that node.
  const previous = await page.$('[data-testid="world-patch-shore-ladle"] img');
  assert.ok(previous);
  await previous.evaluate(image => { image.src = 'data:image/png;base64,AA=='; });
  await page.locator('.scene-display[data-display="failed"]').waitFor();
  await page.getByRole('button', { name: '重试', exact: true }).click();
  await recovered();
  assert.equal(await previous.evaluate(image => image.isConnected), false, 'failed native image survived recovery');
  const save = await page.evaluate(() => JSON.parse(localStorage.getItem('odyssey.save.v1')));
  assert.equal(save.flags['dba.puzzle.water'], 'carried');
  assert.notEqual(save.beats['dba.beat.water'], true);
  await page.screenshot({ path: resolve(output, 'patch-recovered.png') });
  results.push({ mode: 'recovery', checks: ['real state-plate request failure and manual retry', 'simulated corrupt native bitmap replacement', 'restored persistent object state without granting progress'] });
  await context.close(); activePage = null;
  console.log('patch recovery: real network failure and simulated native corruption recovered');
}

try {
  let fixture;
  if (mode !== 'touch') fixture = await journey(false);
  if (mode !== 'desktop') fixture = await journey(true);
  await recoverPatch(fixture);
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'result.json'), JSON.stringify({ result: 'PASS', results, errors }, null, 2));
  console.log(JSON.stringify({ result: 'PASS', results, errors }));
} catch (error) {
  console.error(error);
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
    const save = await activePage.evaluate(() => localStorage.getItem('odyssey.save.v1')).catch(() => null);
    await writeFile(resolve(output, 'failure-save.json'), save ?? 'null');
  }
  await writeFile(resolve(output, 'result.json'), JSON.stringify({ result: 'FAIL', message: String(error), results, errors }, null, 2));
  process.exitCode = 1;
} finally { await browser.close(); }
