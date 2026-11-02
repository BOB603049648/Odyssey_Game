import { describe, expect, it } from 'vitest';
import { bootColumns, keepCatContact } from './soleClip';

function sheet(width: number, height: number): Uint8ClampedArray {
  return new Uint8ClampedArray(width * height * 4);
}

function paint(rgba: Uint8ClampedArray, width: number, x: number, y: number, a: number, rgb: [number, number, number] = [40, 36, 32]) {
  const i = (y * width + x) * 4;
  rgba[i] = rgb[0];
  rgba[i + 1] = rgb[1];
  rgba[i + 2] = rgb[2];
  rgba[i + 3] = a;
}

describe('boot footprint columns', () => {
  it('keeps hem leather near the shaft and drops the wide soft mat', () => {
    const width = 80;
    const height = 1000;
    const rgba = sheet(width, height);
    for (let y = 842; y < 858; y++) paint(rgba, width, 20, y, 255);
    for (let y = 900; y < 930; y++) {
      paint(rgba, width, 20, y, 255);
      paint(rgba, width, 50, y, 255);
    }
    for (let y = 940; y < 990; y++) {
      for (let x = 0; x < width; x++) paint(rgba, width, x, y, 175, [28, 22, 16]);
    }
    const cols = bootColumns(rgba, width, height);
    expect(cols[20]).toBe(1);
    expect(cols[19]).toBe(1);
    expect(cols[50]).toBe(0);
    expect(cols[0]).toBe(0);
    expect(cols[70]).toBe(0);
  });
});

describe('cat contact gate', () => {
  it('keeps the tip puddle and drops the cloak', () => {
    const width = 4;
    const height = 1000;
    const rgba = sheet(width, height);
    paint(rgba, width, 0, 850, 230, [30, 22, 14]);
    paint(rgba, width, 1, 850, 255, [70, 55, 40]);
    paint(rgba, width, 2, 100, 240, [30, 22, 14]);
    keepCatContact(rgba, width, height, 0.85);
    expect(rgba[0 * 4 + 3]).toBe(0);
    expect(rgba[(850 * width + 0) * 4 + 3]).toBe(230);
    expect(rgba[(850 * width + 1) * 4 + 3]).toBe(0);
    expect(rgba[(100 * width + 2) * 4 + 3]).toBe(0);
  });
});
