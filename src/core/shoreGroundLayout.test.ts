import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { sceneAssembly } from '../content/catalog';
import { SHORE_CAT_HEIGHT } from './companionPost';
import { BANDS, GATES, SPAWNS } from './stage';
import { WORLD_SCALE } from './walk';
import {
  GROUND_SOUTH_HANG,
  SHORE_TIDE_BAND_EDGE_OPACITY,
  SHORE_TIDE_FADE_END_WORLD,
  SHORE_TIDE_FADE_OPAQUE_WORLD,
  SHORE_TIDE_FADE_START_WORLD,
  shoreGroundMaskImage,
  shoreGroundMaskOpacityAtWorldY,
} from './shoreGroundLayout';

/**
 * art.shore.ground.jpg is an opaque 1280x720 top-down rock/sand/rock plate.
 * The measured sand belt (lum>80, sand_frac>=0.25..0.80) sits at image y
 * 269/720–317/720 for the north transition. The engine hangs that plate
 * 22% past the world south edge, so image fraction equals slot-element
 * fraction and worldY = elementFraction * (1 + 0.22).
 *
 * The old layout painted that plate full-bleed over the mist-sky slot.
 * These tests lock the contract: sky space stays clear, the walk band
 * stays on opaque ground, and the fade uses the measured tide width
 * rather than a hard crop.
 */
const IMAGE_TIDE_START = 269 / 720;
const IMAGE_TIDE_OPAQUE = 317 / 720;
const css = readFileSync('src/styles.css', 'utf8');
const plate = readFileSync('src/ui/Plate.tsx', 'utf8');

describe('shore ground vs sky layout', () => {
  it('keeps the scene contract: shore has a mist-sky asset and a wet-sand ground', () => {
    const slots = sceneAssembly('dba.scene.shore')!.slots;
    const sky = slots.find((slot) => slot.slot === 'sky');
    const ground = slots.find((slot) => slot.slot === 'ground');
    expect(sky?.kind).toBe('mist-sky');
    expect(sky?.asset).toBe('art.shore.sky');
    expect(ground?.kind).toBe('wet-sand');
    expect(ground?.asset).toBe('art.shore.ground');
  });

  it('retains the legacy fade renderer with the new painted shore navigation bounds', () => {
    expect(GROUND_SOUTH_HANG).toBe(0.22);
    expect(plate).toContain('bottom: `${-GROUND_SOUTH_HANG * 100}%`');
    const band = BANDS['dba.scene.shore'];
    expect(band).toEqual({ minX: 0.05, maxX: 0.96, minY: 0.62, maxY: 0.88 });
    expect(SPAWNS['dba.scene.shore']).toEqual({ x: 0.44, y: 0.72 });
    expect(WORLD_SCALE).toBe(1.15);
    expect(SHORE_CAT_HEIGHT).toBe(0.168);
    const shoreGates = GATES.filter((gate) => gate.from === 'dba.scene.shore');
    expect(shoreGates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ to: 'dba.scene.camp', x: 0.9, y: 0.74, r: 0.04 }),
        expect.objectContaining({ to: 'dba.scene.hall', x: 0.11, y: 0.7, r: 0.04 }),
      ]),
    );
  });

  it('does not invent fade ends: nearly opaque at the walk north edge, width from the measured tide', () => {
    const slotH = 1 + GROUND_SOUTH_HANG;
    const tideWidth = IMAGE_TIDE_OPAQUE - IMAGE_TIDE_START;
    expect(SHORE_TIDE_FADE_END_WORLD).toBe(BANDS['dba.scene.shore'].minY);
    expect(SHORE_TIDE_FADE_END_WORLD).toBe(0.62);
    expect(SHORE_TIDE_FADE_START_WORLD).toBeCloseTo((0.62 / slotH - tideWidth) * slotH, 6);
    expect(SHORE_TIDE_FADE_END_WORLD - SHORE_TIDE_FADE_START_WORLD).toBeCloseTo(tideWidth * slotH, 6);
    // Full opacity is a short tail past minY so the 100% CSS stop is not a hairline on the tread.
    expect(SHORE_TIDE_FADE_OPAQUE_WORLD).toBeCloseTo(0.62 + tideWidth * slotH, 6);
    expect(SHORE_TIDE_FADE_OPAQUE_WORLD).toBeLessThan(SPAWNS['dba.scene.shore'].y);
    expect(SHORE_TIDE_BAND_EDGE_OPACITY).toBeGreaterThanOrEqual(0.9);
    expect(SHORE_TIDE_BAND_EDGE_OPACITY).toBeLessThan(1);
  });

  it('proves full-bleed opaque ground would cover the reserved sky region', () => {
    const fullBleed = (_worldY: number) => 1;
    expect(fullBleed(0.2)).toBe(1);
    expect(shoreGroundMaskOpacityAtWorldY(0.2)).toBe(0);
  });

  it('leaves real sky space above the fade and keeps the walk band on opaque ground', () => {
    expect(shoreGroundMaskOpacityAtWorldY(0)).toBe(0);
    expect(shoreGroundMaskOpacityAtWorldY(0.2)).toBe(0);
    expect(shoreGroundMaskOpacityAtWorldY(SHORE_TIDE_FADE_START_WORLD)).toBe(0);
    const mid = (SHORE_TIDE_FADE_START_WORLD + SHORE_TIDE_FADE_END_WORLD) / 2;
    expect(shoreGroundMaskOpacityAtWorldY(mid)).toBeGreaterThan(0.25);
    expect(shoreGroundMaskOpacityAtWorldY(mid)).toBeLessThan(0.75);
    const band = BANDS['dba.scene.shore'];
    expect(shoreGroundMaskOpacityAtWorldY(band.minY)).toBe(SHORE_TIDE_BAND_EDGE_OPACITY);
    expect(shoreGroundMaskOpacityAtWorldY(band.minY)).toBeGreaterThanOrEqual(0.9);
    expect(shoreGroundMaskOpacityAtWorldY(SHORE_TIDE_FADE_OPAQUE_WORLD)).toBe(1);
    expect(shoreGroundMaskOpacityAtWorldY(SPAWNS['dba.scene.shore'].y)).toBe(1);
    expect(shoreGroundMaskOpacityAtWorldY(0.72)).toBe(1);
    expect(shoreGroundMaskOpacityAtWorldY(band.maxY)).toBe(1);
    expect(shoreGroundMaskOpacityAtWorldY(1)).toBe(1);
  });

  it('emits a soft vertical mask and Plate applies it only to shore ground art', () => {
    const mask = shoreGroundMaskImage();
    expect(mask).toMatch(/^linear-gradient\(180deg,/);
    expect(mask).toContain('transparent 0%');
    expect(mask).not.toMatch(/transparent 0%,\s*#000 /);
    expect(plate).toContain('shoreGroundMaskImage');
    expect(plate).toContain('shore-ground-plate');
    expect(css).toMatch(
      /\.walk-viewport\[data-scene="dba\.scene\.shore"\][\s\S]*?\.shore-ground-plate[\s\S]*?mask-repeat:\s*no-repeat/,
    );
    expect(css).not.toMatch(/\.walk-viewport\[data-scene="dba\.scene\.camp"\][^{]*\.shore-ground-plate/);
  });

  it('hides the viewport ground-fill on shore so the uncut rock plate cannot leak while panning', () => {
    expect(css).toMatch(
      /\.walk-viewport\[data-scene="dba\.scene\.shore"\]\s*\.ground-fill\s*\{[^}]*visibility:\s*hidden/,
    );
  });

  it('does not put the mask 100% stop on the walk-band north edge', () => {
    const mask = shoreGroundMaskImage();
    const edgePct = ((0.62 / (1 + GROUND_SOUTH_HANG)) * 100).toFixed(4);
    expect(mask).toContain(`rgba(0, 0, 0, ${SHORE_TIDE_BAND_EDGE_OPACITY.toFixed(2)}) ${edgePct}%`);
    expect(mask).not.toMatch(new RegExp(`#000 ${edgePct}%`));
    expect(mask).toMatch(/#000 [0-9.]+%, #000 100%\)/);
  });

  it('softens the spawn hearth pool so it cannot read as a solid orange plane', () => {
    const start = css.indexOf('.path-exit[data-hearth="yes"]::before');
    const after = css.indexOf('.path-exit[data-hearth="yes"] i', start);
    expect(start).toBeGreaterThan(0);
    const pool = css.slice(start, after > start ? after : start + 900);
    expect(pool).toMatch(/var\(--world-w\)\s*\*\s*0\.44/);
    expect(pool).toMatch(/rgba\(255,\s*176,\s*72/);
    const alphas = [...pool.matchAll(/rgba\(\s*255,\s*1(?:96|76|40),\s*\d+,\s*(0?\.\d+)\s*\)/g)].map((m) => Number(m[1]));
    expect(alphas.length).toBeGreaterThan(0);
    expect(Math.max(...alphas)).toBeLessThanOrEqual(0.45);
  });

  it('keeps shore fog subtle and all scene foregrounds readable', () => {
    const lipStart = css.indexOf('.shore-stone-lip');
    const lip = css.slice(lipStart, lipStart + 600);
    expect(lip).toMatch(/rgba\(8,\s*7,\s*6,\s*0\.(0?[1-4]\d?|40)\)/);
    expect(lip).not.toMatch(/rgba\(8,\s*7,\s*6,\s*0\.9\)/);
    const fogStart = css.indexOf('.shore-fog-line');
    const fog = css.slice(fogStart, fogStart + 700);
    expect(fog).toMatch(/rgba\(8,\s*16,\s*20/);
    expect(fog).toMatch(/transparent 0%/);
    expect(fog).not.toMatch(/rgba\(8,\s*16,\s*20,\s*0\.82\)/);
    expect(css).toMatch(
      /\.shore-wrap::before[^{]*\{[^}]*rgba\(0,\s*0,\s*0,\s*0\.(0?[1-3]\d?)\)/,
    );
    expect(css).toMatch(
      /\.walk-viewport\[data-scene="dba\.scene\.shore"\]\s*\.world-vignette\s*\{[^}]*rgba\(0,\s*0,\s*0,\s*0\.(0?[1-2]\d?)\)/,
    );
    // The shared world vignette must also leave the lower foreground readable.
    expect(css).toMatch(/\.world-vignette\s*\{[^}]*rgba\(0,\s*0,\s*0,\s*0\.22\)/);
  });

});
