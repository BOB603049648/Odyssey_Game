import { chromium } from 'playwright';
import assert from 'node:assert/strict';
import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const url = process.env.ODYSSEY_URL ?? 'http://127.0.0.1:4173/';
const output = resolve(process.env.ODYSSEY_QA_DIR ?? 'artifacts/traveler-palette');
await mkdir(output, { recursive: true });
const browser = await chromium.launch({ executablePath: process.env.CHROMIUM_PATH, headless: true, args: ['--no-sandbox'] });
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
const errors = [];
page.on('pageerror', error => errors.push(error.message));
try {
  await page.goto(url);
  await page.getByRole('button', { name: '新游戏', exact: true }).click();
  await page.getByRole('button', { name: '跳过序章', exact: true }).click();
  await page.locator('[data-testid="walk-stage"][data-display="ready"]').waitFor();
  const filter = await page.locator('[data-testid="traveler"] filter').evaluate(node => new XMLSerializer().serializeToString(node));
  const sourceFiles = ['idle-front-01.webp', 'idle-side-01.png', 'idle-back-01.png', 'stride-atlas.png', 'action-atlas.png', 'settle-atlas.webp'];
  const sources = await Promise.all(sourceFiles.map(async name => ({ name, uri: `data:image/${name.endsWith('.png') ? 'png' : 'webp'};base64,${(await readFile(resolve('src/assets/traveler', name))).toString('base64')}` })));
  // Exercise the browser's actual SVG implementation on the original RGBA,
  // comparing material samples against idle art and checking all edge pixels.
  const colors = await page.evaluate(async ({ sources, filter }) => {
    const median = values => { values.sort((a, b) => a - b); return values[Math.floor(values.length / 2)]; };
    const bitmap = async uri => { const img = new Image(); img.src = uri; await img.decode(); return img; };
    const pixels = img => {
      const canvas = document.createElement('canvas'); canvas.width = img.naturalWidth; canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d', { willReadFrequently: true }); ctx.drawImage(img, 0, 0);
      return ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    };
    const luminance = (data, at) => data[at] * .2126 + data[at + 1] * .7152 + data[at + 2] * .0722;
    const results = [];
    for (const { name, uri } of sources) {
      const img = await bitmap(uri), raw = pixels(img), width = img.naturalWidth, height = img.naturalHeight;
      const idle = name.startsWith('idle'), settle = name.startsWith('settle');
      const id = /id="([^"]+)"/.exec(filter)[1];
      const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}"><defs>${filter}</defs><image href="${uri}" width="${width}" height="${height}" filter="url(#${id})"/></svg>`;
      const graded = idle ? raw : pixels(await bitmap(`data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`));
      let alphaError = 0, warmError = 0, warmPixels = 0;
      for (let at = 0; at < raw.length; at += 4) {
        alphaError = Math.max(alphaError, Math.abs(graded[at + 3] - raw[at + 3]));
        if (raw[at + 3] > 245 && raw[at] > 70 && raw[at + 2] < raw[at] * .8 - 3) {
          warmPixels++;
          warmError = Math.max(warmError, ...[0, 1, 2].map(channel => Math.abs(graded[at + channel] - raw[at + channel])));
        }
      }
      const cells = [];
      const rows = idle ? 1 : settle ? 2 : 3, columns = idle ? 1 : 4;
      const cw = width / columns, ch = height / rows;
      for (let row = 0; row < rows; row++) for (let column = 0; column < columns; column++) {
        const before = [], after = [];
        for (let y = Math.ceil(row * ch + .23 * ch); y < row * ch + .86 * ch; y++) {
          for (let x = Math.ceil(column * cw); x < (column + 1) * cw; x++) {
            const at = (y * width + x) * 4, r = raw[at], g = raw[at + 1], b = raw[at + 2];
            if (raw[at + 3] > 245 && r - b < 12 && Math.max(r, g, b) - Math.min(r, g, b) < 42 && Math.min(r, g, b) > 18) {
              before.push(luminance(raw, at)); after.push(luminance(graded, at));
            }
          }
        }
        cells.push({ row, column, samples: before.length, before: median(before), after: median(after) });
      }
      results.push({ name, alphaError, warmError, warmPixels, cells });
    }
    return results;
  }, { sources, filter });
  const references = colors.slice(0, 3).map(result => result.cells[0].before);
  for (const result of colors.slice(3)) {
    assert(result.alphaError <= 1, `${result.name}: changed transparent edges by ${result.alphaError}`);
    assert(result.warmPixels > 1000 && result.warmError <= 2, `${result.name}: recolored skin/hair/leather by ${result.warmError}`);
    for (const cell of result.cells) {
      const target = result.name.startsWith('stride') ? references[cell.row] : (references[0] + references[1]) / 2;
      assert(cell.samples > 500);
      assert(Math.abs(cell.after - target) < 12, `${result.name} ${cell.row}/${cell.column}: costume still too different`);
      assert(Math.abs(cell.after - target) < Math.abs(cell.before - target) * .45, `${result.name}: did not reduce costume brightness mismatch`);
    }
  }
  await writeFile(resolve(output, 'palette-pixels.json'), JSON.stringify(colors, null, 2));

  const world = await page.getByTestId('world-root').locator('.world-layer').boundingBox();
  await page.mouse.click(world.x + world.width * .49, world.y + world.height * .77);
  await page.waitForFunction(() => {
    const actor = document.querySelector('[data-testid="traveler"]');
    return actor?.dataset.moving === 'no' && Math.abs(Number(actor.dataset.x) - .49) < .003;
  });
  await page.evaluate(() => {
    window.paletteSamples = [];
    const sample = () => {
      const actor = document.querySelector('[data-testid="traveler"]');
      for (const img of actor?.querySelectorAll('[data-layer]') ?? []) {
        const wrap = img.closest('.traveler-frame-wrap');
        window.paletteSamples.push({ facing: actor.dataset.facing, layer: img.dataset.layer, atlas: img.dataset.atlas,
          frame: img.dataset.frame, palette: wrap.dataset.palette, filter: getComputedStyle(wrap).filter });
      }
      requestAnimationFrame(sample);
    };
    requestAnimationFrame(sample);
  });
  for (const [key, facing] of [['d', 'right'], ['a', 'left'], ['w', 'back'], ['s', 'front']]) {
    await page.keyboard.down(key);
    await page.waitForFunction(facing => {
      const actor = document.querySelector('[data-testid="traveler"]');
      return actor?.dataset.facing === facing && actor.querySelector('[data-layer="current"]')?.dataset.atlas?.startsWith('stride-');
    }, facing);
    await page.waitForTimeout(500);
    await page.screenshot({ path: resolve(output, `walk-${facing}.png`) });
    await page.keyboard.up(key);
    await page.waitForFunction(() => document.querySelector('[data-testid="traveler"]')?.dataset.pose === 'idle');
    await page.waitForTimeout(160);
    await page.screenshot({ path: resolve(output, `idle-${facing}.png`) });
  }
  const samples = await page.evaluate(() => window.paletteSamples);
  assert(samples.some(sample => sample.layer === 'out' && sample.atlas));
  assert(samples.some(sample => sample.layer === 'out' && !sample.atlas));
  const ids = new Set();
  for (const sample of samples) {
    assert.equal(sample.palette, sample.atlas ? 'costume-match' : 'reference');
    if (sample.atlas) { assert(sample.filter.includes('traveler-palette-')); ids.add(sample.filter); }
    else assert.equal(sample.filter, 'none', 'idle inherited the departing walk color correction');
  }
  assert.equal(ids.size, 1, 'rebuilt the filter on each animation frame');
  assert.deepEqual(errors, []);
  await writeFile(resolve(output, 'transitions.json'), JSON.stringify(samples, null, 2));
  console.log(JSON.stringify({ result: 'PASS', checks: ['32 atlas cells match idle costume', 'warm materials preserved', 'alpha edges preserved', 'four facings start/stop', 'outgoing/current retain own palette', 'one stable filter'], colors }));
} finally { await browser.close(); }
