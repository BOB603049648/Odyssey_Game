import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { mkdir, writeFile } from 'node:fs/promises';
import { execFileSync } from 'node:child_process';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/browser-wayfinding');
const mode = process.env.ODYSSEY_WAYFINDING_MODE ?? 'all';
await mkdir(output, { recursive: true });
const proxyServer = url.startsWith('https:') ? process.env.HTTPS_PROXY : process.env.HTTP_PROXY;
const proxy = proxyServer && !['localhost', '127.0.0.1'].includes(new URL(url).hostname)
  ? { server: proxyServer, bypass: process.env.NO_PROXY } : undefined;
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true,
  args: ['--no-sandbox'], proxy });
const errors = [], results = [], observations = [];
let activePage, activeContext, activeCase = 'bootstrap';
const sceneId = name => `dba.scene.${name}`;
const distance = (a, b) => Math.hypot((a.x - b.x) * 16 / 9, a.y - b.y);
// Independent authored doorway expectations, not imported from the code under test.
const routes = [
  ['shore', 'camp', .9, .74, 'east'], ['camp', 'yard', .9, .84, 'east'],
  ['yard', 'path', .9, .78, 'east'], ['path', 'yard', .11, .43, 'west'],
  ['yard', 'camp', .11, .8, 'west'], ['camp', 'night', .5, .8, 'north'],
  ['night', 'camp', .5, .8, 'south'], ['camp', 'shore', .1, .84, 'west'],
  ['shore', 'hall', .11, .7, 'west'], ['hall', 'shore', .5, .8, 'south'],
];

function probe() {
  window.wayfindingQA = { label: 'boot', samples: [], changes: [], pointers: [] };
  document.addEventListener('pointerdown', event => {
    window.wayfindingQA.pointers.push({ at: performance.now(), label: window.wayfindingQA.label,
      x: event.clientX, y: event.clientY, button: event.button, pointerType: event.pointerType,
      target: event.target instanceof Element ? event.target.closest('[data-testid]')?.getAttribute('data-testid') : null,
      ground: event.target instanceof Element && !!event.target.closest('[data-testid="walk-ground"]') });
  }, true);
  let previousScene;
  const opacity = element => {
    let result = 1;
    for (let node = element; node instanceof Element; node = node.parentElement) {
      const css = getComputedStyle(node);
      if (css.display === 'none' || css.visibility === 'hidden') return 0;
      result *= Number(css.opacity);
    }
    return result;
  };
  const tick = at => {
    const stage = document.querySelector('[data-testid="walk-stage"]');
    const actor = stage?.querySelector('[data-testid="traveler"]');
    if (stage && actor) {
      const viewport = stage.getBoundingClientRect();
      const world = stage.querySelector('.world-layer').getBoundingClientRect();
      const figure = actor.getBoundingClientRect();
      const expectedHeight = Math.max(viewport.height, viewport.width * 9 / 16) * 1.15;
      const scene = stage.dataset.scene;
      if (previousScene && previousScene !== scene)
        window.wayfindingQA.changes.push({ at, from: previousScene, to: scene, label: window.wayfindingQA.label });
      previousScene = scene;
      const area = document.querySelector('[data-testid="ground-guide-area"]');
      const route = document.querySelector('[data-testid="ground-guide-route"]');
      const notice = document.querySelector('[data-testid="navigation-notice"]');
      const x = Number(actor.dataset.x), y = Number(actor.dataset.y);
      // The visual mask is a conservative .004-world-height grid. Permit its
      // small raster-like boundary inset, never a projected walk into terrain.
      const feetOnGuide = area instanceof SVGGeometryElement && [0, -3, 3, -6, 6].some(dx =>
        [0, -3, 3, -6, 6].some(dy => area.isPointInFill(new DOMPoint(x * 1280 + dx, y * 720 + dy))));
      window.wayfindingQA.samples.push({ at, label: window.wayfindingQA.label, scene,
        display: stage.dataset.display, x, y, moving: actor.dataset.moving,
        view: { w: viewport.width, h: viewport.height },
        layoutReady: Math.abs(world.height - expectedHeight) < 1 && Math.abs(world.width - expectedHeight * 16 / 9) < 1,
        worldCovered: world.left <= viewport.left + 1 && world.right >= viewport.right - 1
          && world.top <= viewport.top + 1 && world.bottom >= viewport.bottom - 1,
        actorInView: figure.right > viewport.left && figure.left < viewport.right && figure.bottom > viewport.top && figure.top < viewport.bottom,
        paused: actor.dataset.animationPaused, target: stage.dataset.navTarget, phase: stage.dataset.navPhase,
        areaVisible: !!area && opacity(area) > .01, feetOnGuide,
        route: route?.getAttribute('d'), routeVisible: !!route && opacity(route) > .01,
        notice: notice?.textContent?.trim(), noticeKind: notice?.dataset.kind,
        noticeVisible: notice?.dataset.visible === 'yes' && opacity(notice) > .01 });
    }
    requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
}

async function bootstrap() {
  const context = await browser.newContext();
  const page = activePage = await context.newPage();
  await page.goto(url);
  await page.getByRole('button', { name: '新游戏', exact: true }).click();
  await page.getByRole('button', { name: '跳过序章', exact: true }).click();
  await page.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor();
  const seed = await page.evaluate(() => JSON.parse(localStorage.getItem('odyssey.save.v1')));
  await context.close();
  seed.screen = 'island'; seed.overlay = 'none'; seed.currentScene = sceneId('shore');
  seed.feedback = { seq: 0, kind: 'none' }; seed.companion = { level: 0, targetId: null, pawUsed: false };
  seed.flags['dba.flag.taught-approach'] = true; seed.flags['dba.flag.driftwood'] = true;
  // Navigation should not depend on repeating the language lesson. Position is
  // never seeded: every collision, preview and crossing uses actual input.
  for (const word of Object.values(seed.words)) word.state = 'learned';
  return seed;
}

async function journey(base, mobile, rotationOnly = false) {
  const name = mobile ? 'touch' : 'desktop';
  const viewport = mobile ? { width: 390, height: 844 } : { width: 1280, height: 800 };
  const context = activeContext = await browser.newContext({ viewport, isMobile: mobile, hasTouch: mobile,
    recordVideo: { dir: resolve(output, name), size: viewport } });
  await context.addInitScript(probe);
  const page = activePage = await context.newPage();
  page.setDefaultTimeout(20000);
  page.on('pageerror', error => errors.push(`${name}: ${error.message}`));
  page.on('response', response => { if (response.status() >= 400) errors.push(`${name}: ${response.status()} ${response.url()}`); });
  const touch = mobile ? await context.newCDPSession(page) : null;
  let capturedMenu = false;
  const button = label => page.getByRole('button', { name: label, exact: true });
  const activate = locator => mobile ? locator.tap() : locator.click();
  const ready = () => page.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor();
  const state = () => page.evaluate(() => {
    const stage = document.querySelector('[data-testid="walk-stage"]'), actor = stage.querySelector('[data-testid="traveler"]');
    return { scene: stage.dataset.scene, x: Number(actor.dataset.x), y: Number(actor.dataset.y),
      moving: actor.dataset.moving, target: stage.dataset.navTarget, phase: stage.dataset.navPhase };
  });
  const mark = async label => {
    activeCase = `${name}: ${label}`;
    return page.evaluate(label => { window.wayfindingQA.label = label; return performance.now(); }, label);
  };
  const collect = async label => {
    const data = await page.evaluate(label => ({
      samples: window.wayfindingQA.samples.filter(sample => sample.label === label),
      changes: window.wayfindingQA.changes.filter(change => change.label === label),
    }), label);
    observations.push({ device: name, label, ...data });
    return data;
  };
  async function seed(scene) {
    if (page.url() === 'about:blank') await page.goto(url);
    await page.evaluate(save => localStorage.setItem('odyssey.save.v1', JSON.stringify(save)),
      { ...structuredClone(base), currentScene: sceneId(scene) });
    await page.reload(); await activate(button('继续')); await ready();
    await page.waitForFunction(() => document.querySelector('[data-testid="traveler"]')?.dataset.moving === 'no');
  }
  async function pinGuide() {
    await activate(button('路线'));
    const toggle = page.getByTestId('toggle-ground-guide');
    if (await toggle.getAttribute('aria-pressed') !== 'true') await activate(toggle);
    // The control may leave the menu open for choosing the destination.
    if (await page.locator('.route-panel').count()) await activate(button('路线'));
    await page.getByTestId('ground-guide-area').waitFor();
  }
  async function select(to) {
    if (!(await page.locator('.route-panel').count())) await activate(button('路线'));
    await page.waitForFunction(() => {
      const stack = document.querySelector('.stage-feedback-stack');
      return stack && getComputedStyle(stack).visibility === 'hidden';
    });
    if (!capturedMenu) {
      await page.screenshot({ path: resolve(output, `${name}-route-menu.png`) });
      capturedMenu = true;
    }
    const target = page.getByTestId(`route-${to}`);
    const label = (await target.textContent()).replace(/^[\s←→↑↓◇]+/, '').trim();
    await activate(target);
    await page.waitForFunction(to => document.querySelector('[data-testid="walk-stage"]')?.dataset.navTarget === to, sceneId(to));
    const notice = page.getByTestId('navigation-notice');
    await page.waitForFunction(() => {
      const notice = document.querySelector('[data-testid="navigation-notice"]');
      return notice?.dataset.kind === 'travel' && notice.dataset.visible === 'yes';
    });
    assert.match(await notice.textContent(), /正在前往|将进入/, `${name}: missing navigation intent`);
    assert.ok((await notice.textContent()).includes(label), `${name}: navigation notice lost destination ${label}`);
    return label;
  }
  async function stopped() {
    await page.waitForFunction(() => document.querySelector('[data-testid="traveler"]')?.dataset.moving === 'no');
    await page.waitForTimeout(100);
  }
  async function hold(dx, dy, duration = 300) {
    if (!mobile) {
      const key = dx < 0 ? 'a' : dx > 0 ? 'd' : dy < 0 ? 'w' : 's';
      await page.keyboard.down(key);
      try { await page.waitForTimeout(duration); } finally { await page.keyboard.up(key); }
      return;
    }
    const box = await page.getByTestId('walk-stick').boundingBox();
    assert.ok(box, 'missing touch joystick');
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    try {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * 36, y: y + dy * 36, id: 1 }] });
      await page.waitForTimeout(duration);
    } finally { await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  }
  async function directionUntil(dx, dy, predicate, argument) {
    if (!mobile) {
      const key = dx < 0 ? 'a' : dx > 0 ? 'd' : dy < 0 ? 'w' : 's';
      await page.keyboard.down(key);
      try { await page.waitForFunction(predicate, argument, { timeout: 6000 }); }
      finally { await page.keyboard.up(key); }
      return;
    }
    const box = await page.getByTestId('walk-stick').boundingBox();
    assert.ok(box, 'missing touch joystick');
    const x = box.x + box.width / 2, y = box.y + box.height / 2;
    await touch.send('Input.dispatchTouchEvent', { type: 'touchStart', touchPoints: [{ x, y, id: 1 }] });
    try {
      await touch.send('Input.dispatchTouchEvent', { type: 'touchMove', touchPoints: [{ x: x + dx * 36, y: y + dy * 36, id: 1 }] });
      await page.waitForFunction(predicate, argument, { timeout: 6000 });
    } finally { await touch.send('Input.dispatchTouchEvent', { type: 'touchEnd', touchPoints: [] }); }
  }
  async function reject(scene, points, label) {
    await seed(scene); await pinGuide(); await mark(label);
    const before = await state();
    const point = await page.evaluate(({ points, mobile }) => {
      const world = document.querySelector('.world-layer').getBoundingClientRect();
      const controls = [...document.querySelectorAll('button,a,input,select,textarea,[role="button"],[data-testid="walk-stick"]')]
        .filter(node => {
          const css = getComputedStyle(node), rect = node.getBoundingClientRect();
          return css.pointerEvents !== 'none' && css.visibility === 'visible' && css.display !== 'none' && rect.width > 0 && rect.height > 0;
        }).map(node => node.getBoundingClientRect());
      return points.map(point => ({ ...point, cx: world.left + point.x * world.width, cy: world.top + point.y * world.height }))
        .find(point => point.cx > 8 && point.cx < innerWidth - 8 && point.cy > 8 && point.cy < innerHeight - 8
          && document.elementFromPoint(point.cx, point.cy)?.closest('[data-testid="walk-ground"]')
          && (!mobile || controls.every(rect => Math.hypot(Math.max(rect.left - point.cx, 0, point.cx - rect.right),
            Math.max(rect.top - point.cy, 0, point.cy - rect.bottom)) >= 32)));
    }, { points, mobile });
    assert.ok(point, `${name}: fixture ${label} has no exposed, visible ground hit target`);
    const pointersBefore = await page.evaluate(() => window.wayfindingQA.pointers.length);
    if (mobile) await page.touchscreen.tap(point.cx, point.cy); else await page.mouse.click(point.cx, point.cy);
    const pointer = await page.evaluate(() => window.wayfindingQA.pointers.at(-1));
    assert.ok(await page.evaluate(count => window.wayfindingQA.pointers.length > count, pointersBefore), `${label}: no native pointerdown arrived`);
    assert.equal(pointer.ground, true, `${label}: browser touch adjustment selected a nearby control: ${JSON.stringify(pointer)}`);
    await page.waitForFunction(() => {
      const notice = document.querySelector('[data-testid="navigation-notice"]');
      return notice?.dataset.kind === 'blocked' && notice.dataset.visible === 'yes' && notice.textContent.trim();
    });
    await page.waitForTimeout(350);
    const after = await state();
    assert.equal(after.scene, before.scene, `${label}: rejected terrain changed scene`);
    assert.ok(distance(after, before) < .002, `${label}: click was projected onto walkable ground and moved the traveler`);
    assert.equal(after.target, '', `${label}: rejected terrain retained navigation`);
    const guide = await page.getByTestId('ground-guide-area').evaluate((area, point) =>
      area.isPointInFill(new DOMPoint(point.x * 1280, point.y * 720)), point);
    assert.equal(guide, false, `${label}: unavailable terrain is shown as walkable`);
    await page.screenshot({ path: resolve(output, `${name}-${label}.png`) });
    await collect(label); results.push({ device: name, check: label, result: 'PASS', point });
  }
  async function rotation() {
    async function rotate(width, height, label) {
      const before = await state(); await mark(label);
      await page.setViewportSize({ width, height });
      // ResizeObserver and the first React commit may follow the browser's
      // viewport mutation. Inspect every subsequent rendered frame, not just a
      // screenshot after the old pixel camera offset has slowly caught up.
      const settledAt = await page.evaluate(() => new Promise(resolve =>
        requestAnimationFrame(() => requestAnimationFrame(() => resolve(performance.now())))));
      await page.waitForTimeout(1000);
      const data = await collect(label);
      const frames = data.samples.filter(sample => sample.at >= settledAt && sample.view.w === width && sample.view.h === height);
      assert.ok(frames.length >= 5, `${label}: missing rotation observations`);
      assert.ok(frames.every(sample => sample.layoutReady && sample.worldCovered), `${label}: resized scene leaves an empty viewport edge`);
      assert.ok(frames.every(sample => sample.actorInView), `${label}: camera lost the traveler after rotation`);
      const after = await state(); assert.equal(after.scene, before.scene);
      assert.ok(distance(before, after) < .002, `${label}: rotation moved the game-world feet`);
      await page.screenshot({ path: resolve(output, `${name}-${label}.png`) });
      results.push({ device: name, check: label, result: 'PASS', samples: frames.length });
    }
    await rotate(844, 390, 'live-landscape');
    await activate(button('路线'));
    await page.waitForFunction(() => getComputedStyle(document.querySelector('.stage-feedback-stack')).visibility === 'hidden');
    await page.screenshot({ path: resolve(output, 'touch-landscape-route-menu.png') });
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'touch landscape: horizontal overflow');
    await activate(button('路线'));
    await rotate(390, 844, 'live-portrait');
    await activate(button('设置')); await page.getByRole('dialog').waitFor();
    await page.waitForFunction(() => document.querySelector('[data-testid="traveler"]')?.dataset.animationPaused === 'yes');
    await rotate(844, 390, 'paused-landscape');
    await rotate(390, 844, 'paused-portrait');
    await activate(button('合上'));
  }
  async function finish() {
    const video = await page.video().path();
    await context.close(); activeContext = null;
    // Keep the full WebM as evidence, and provide a short real-input review clip.
    execFileSync('ffmpeg', ['-v', 'error', '-y', '-i', video, '-t', '35', '-c:v', 'libx264', '-preset', 'fast',
      '-crf', '24', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', resolve(output, `${name}-wayfinding.mp4`)]);
  }

  if (rotationOnly) {
    await seed('hall'); await pinGuide(); await rotation(); await finish();
    console.log('touch: live and paused portrait/landscape camera coverage passed');
    return;
  }

  await seed('shore'); await pinGuide();
  const cancelLabel = 'manual-cancels-navigation'; await mark(cancelLabel); const cancelStart = await state();
  await select('camp'); await hold(0, 1, 350); await stopped();
  const cancelled = await state();
  assert.equal(cancelled.target, '', `${name}: manual movement did not cancel destination`);
  assert.ok(distance(cancelStart, cancelled) > .015, `${name}: actual manual control did not move`);
  await page.waitForTimeout(550);
  const held = await state();
  assert.equal(held.scene, sceneId('shore')); assert.ok(distance(cancelled, held) < .002, `${name}: cancelled navigation restarted`);
  await collect(cancelLabel); results.push({ device: name, check: cancelLabel, result: 'PASS' });

  for (let index = 0; index < routes.length; index++) {
    const [from, to, gx, gy, edge] = routes[index];
    const label = `${from}-to-${to}`; await mark(label);
    const before = await state(); assert.equal(before.scene, sceneId(from));
    await select(to);
    assert.equal((await state()).scene, before.scene, `${label}: route selection teleported immediately`);
    // A horizontal SVG stroke has a zero-height geometric box. Its painted
    // stroke is visible even though Playwright's element-box predicate is not.
    await page.getByTestId('ground-guide-route').waitFor({ state: 'attached' });
    const guide = await page.evaluate(() => {
      const actor = document.querySelector('[data-testid="traveler"]');
      return { d: document.querySelector('[data-testid="ground-guide-route"]').getAttribute('d'),
        x: Number(actor.dataset.x), y: Number(actor.dataset.y) };
    });
    const routeShape = guide.d;
    assert.match(routeShape, /^M[\d.]+ [\d.]+(?: L[\d.]+ [\d.]+)+$/, `${label}: route does not expose actual line segments`);
    const coordinates = routeShape.match(/[\d.]+/g).map(Number);
    const firstPoint = { x: coordinates[0] / 1280, y: coordinates[1] / 720 };
    const finalPoint = { x: coordinates.at(-2) / 1280, y: coordinates.at(-1) / 720 };
    assert.ok(distance(firstPoint, guide) < .01, `${label}: route starts away from the actual feet`);
    assert.ok(distance(finalPoint, { x: gx, y: gy }) <= .075, `${label}: route points away from the selected doorway`);
    if (index === 0) {
      await page.screenshot({ path: resolve(output, `${name}-route-in-progress.png`) });
      // Real repeated menu selections must keep one navigation owner.
      await select(to); await select(to);
      await activate(button('设置'));
      await page.waitForFunction(() => document.querySelector('[data-testid="traveler"]')?.dataset.animationPaused === 'yes');
      await page.evaluate(() => new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve))));
      const paused = await state(); await page.waitForTimeout(550);
      assert.deepEqual(await state(), paused, `${name}: navigation continued through settings`);
      await activate(button('合上'));
    }
    await page.waitForFunction(to => document.querySelector('[data-testid="walk-stage"]')?.dataset.scene === to, sceneId(to));
    await ready(); await page.waitForTimeout(180);
    const data = await collect(label);
    const walking = data.samples.filter(sample => sample.scene === sceneId(from) && sample.display === 'ready');
    assert.ok(walking.length >= 5 && walking.some(sample => distance(sample, before) > .015), `${label}: no real traversal observed`);
    assert.deepEqual(data.changes.map(change => [change.from, change.to]), [[sceneId(from), sceneId(to)]], `${label}: repeated or unexpected scene transitions`);
    const last = walking.at(-1);
    const orthogonal = edge === 'east' || edge === 'west' ? Math.abs(last.y - gy) : Math.abs(last.x - gx) * 16 / 9;
    const normal = edge === 'east' || edge === 'west' ? Math.abs(last.x - gx) * 16 / 9 : Math.abs(last.y - gy);
    assert.ok(orthogonal <= .052 && normal <= .065, `${label}: left scene away from the small doorway: ${JSON.stringify(last)}`);
    for (let i = 1; i < walking.length; i++) {
      const dt = (walking[i].at - walking[i - 1].at) / 1000;
      assert.ok(distance(walking[i], walking[i - 1]) <= .22 * dt + .018, `${label}: movement position jumped`);
    }
    const guided = walking.filter(sample => sample.target && sample.routeVisible && sample.areaVisible);
    assert.ok(guided.length >= 3, `${label}: actual route or walkable surface was not visible`);
    assert.ok(guided.every(sample => sample.feetOnGuide), `${label}: actual footsteps left the displayed walkable area`);
    results.push({ device: name, check: label, result: 'PASS', samples: walking.length, exit: { x: last.x, y: last.y } });
    console.log(`${name}: ${label} passed (${walking.length} actual movement frames)`);
  }
  await page.screenshot({ path: resolve(output, `${name}-routes-complete.png`) });
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, `${name}: horizontal overflow`);

  await reject('shore', [{ x: .50, y: .43 }, { x: .48, y: .40 }, { x: .53, y: .42 }], 'sea-is-not-ground');
  await reject('camp', [{ x: .48, y: .63 }, { x: .44, y: .66 }, { x: .52, y: .62 }], 'wall-is-not-ground');
  await reject('path', [{ x: .46, y: .66 }, { x: .48, y: .70 }, { x: .40, y: .65 }], 'ravine-is-not-ground');

  if (!mobile) for (const [scene, key] of [['camp', 'w'], ['hall', 's'], ['night', 's']]) {
    await seed(scene); await pinGuide(); const label = `${scene}-off-doorway-boundary`; await mark(label);
    // The night table's southern foot is y=.75. Clear it before walking left;
    // the center south doorway at y=.8 must remain ahead of the traveler.
    if (scene === 'night') {
      await directionUntil(0, 1, () => Number(document.querySelector('[data-testid="traveler"]')?.dataset.y) >= .765);
      await stopped();
      assert.equal((await state()).scene, sceneId('night'), 'night setup crossed the south doorway');
    }
    await page.keyboard.down('a');
    try { await page.waitForFunction(() => Number(document.querySelector('[data-testid="traveler"]')?.dataset.x) <= .26); }
    finally { await page.keyboard.up('a'); }
    await stopped();
    await page.keyboard.down(key);
    try { await page.waitForTimeout(1600); } finally { await page.keyboard.up(key); }
    await stopped();
    assert.equal((await state()).scene, sceneId(scene), `${label}: a whole edge still behaves as an exit`);
    const data = await collect(label); assert.deepEqual(data.changes, [], `${label}: an unintended exit was crossed`);
    await page.screenshot({ path: resolve(output, `${name}-${label}.png`) });
    results.push({ device: name, check: label, result: 'PASS', position: await state() });
  }
  for (const [from, to, dx, dy] of [['camp', 'night', 0, -1], ['path', 'yard', -1, 0]]) {
    await seed(from); await pinGuide(); const label = `${from}-manual-doorway`; await mark(label);
    if (from === 'camp') {
      await directionUntil(1, 0, () => Number(document.querySelector('[data-testid="traveler"]')?.dataset.x) >= .49);
      await stopped();
    }
    assert.equal((await state()).target, '', `${label}: fixture accidentally selected automatic navigation`);
    await directionUntil(dx, dy, to => document.querySelector('[data-testid="walk-stage"]')?.dataset.scene === to, sceneId(to));
    await ready();
    const data = await collect(label);
    assert.deepEqual(data.changes.map(change => [change.from, change.to]), [[sceneId(from), sceneId(to)]], `${label}: manual crossing did not enter exactly once`);
    results.push({ device: name, check: label, result: 'PASS' });
    console.log(`${name}: ${label} passed using ${mobile ? 'touch joystick' : 'keyboard'}`);
  }
  // Walk toward the hall's south doorway by real input and stop before its lip.
  await seed('hall'); await pinGuide(); await mark('manual-exit-preview');
  await hold(0, 1, 350); await stopped();
  await page.waitForFunction(() => {
    const notice = document.querySelector('[data-testid="navigation-notice"]');
    return notice?.dataset.kind === 'exit' && notice.dataset.visible === 'yes' && /将进入|路口通往/.test(notice.textContent);
  });
  assert.equal((await state()).scene, sceneId('hall'), `${name}: preview crossed the doorway early`);
  assert.equal((await state()).target, '', `${name}: manual preview started automatic navigation`);
  await page.screenshot({ path: resolve(output, `${name}-manual-exit-preview.png`) });
  await collect('manual-exit-preview'); results.push({ device: name, check: 'manual-exit-preview', result: 'PASS' });
  if (mobile) await rotation();
  await finish();
  console.log(`${name}: all ten doorway routes, rejection, cancellation and preview passed`);
}

try {
  const base = await bootstrap();
  if (mode === 'rotation') await journey(base, true, true);
  else {
    if (mode !== 'touch') await journey(base, false);
    if (mode !== 'desktop') await journey(base, true);
  }
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'samples.json'), JSON.stringify(observations));
  await writeFile(resolve(output, 'result.json'), JSON.stringify({ result: 'PASS', results, errors }, null, 2));
  console.log(JSON.stringify({ result: 'PASS', checks: results.length, errors }));
} catch (error) {
  if (activePage && !activePage.isClosed()) {
    await activePage.screenshot({ path: resolve(output, 'failure.png') }).catch(() => {});
    await writeFile(resolve(output, 'failure-samples.json'), JSON.stringify(await activePage.evaluate(() => window.wayfindingQA).catch(() => null)));
    await writeFile(resolve(output, 'failure-save.json'), JSON.stringify(await activePage.evaluate(() => localStorage.getItem('odyssey.save.v1')).catch(() => null)));
  }
  await writeFile(resolve(output, 'partial-results.json'), JSON.stringify({ activeCase, results, errors }, null, 2));
  console.error(activeCase, error); process.exitCode = 1;
} finally {
  if (activeContext) await activeContext.close().catch(() => {});
  await browser.close();
}
