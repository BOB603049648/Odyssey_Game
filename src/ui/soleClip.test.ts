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

function span(rgba: Uint8ClampedArray, width: number): number {
  let minX = width;
  let maxX = -1;
  for (let i = 3; i < rgba.length; i += 4) {
    if (rgba[i] === 0) continue;
    const x = Math.floor(i / 4) % width;
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
  }
  return maxX - minX + 1;
}

describe('cat contact gate', () => {
  it('keeps the paw footprint and drops the wide puddle and the cloak', () => {
    const width = 200;
    const height = 1000;
    const rgba = sheet(width, height);
    for (let y = 800; y < 900; y++) {
      for (let x = 20; x < 160; x++) paint(rgba, width, x, y, 240, [30, 22, 14]);
    }
    for (let y = 752; y < 800; y++) {
      for (let x = 40; x < 72; x++) paint(rgba, width, x, y, 255, [90, 70, 50]);
    }
    paint(rgba, width, 50, 850, 255, [70, 55, 40]);
    paint(rgba, width, 50, 100, 240, [30, 22, 14]);
    keepCatContact(rgba, width, height, 0.85);
    expect(rgba[(850 * width + 55) * 4 + 3]).toBe(240);
    expect(rgba[(850 * width + 20) * 4 + 3]).toBe(0);
    expect(rgba[(850 * width + 120) * 4 + 3]).toBe(0);
    expect(rgba[(850 * width + 50) * 4 + 3]).toBe(0);
    expect(rgba[(100 * width + 50) * 4 + 3]).toBe(0);
    expect(span(rgba, width)).toBe(32);
  });

  it('shrinks a puddle with no paw fur to a paw-sized core', () => {
    const width = 200;
    const height = 1000;
    const rgba = sheet(width, height);
    for (let y = 800; y < 900; y++) {
      for (let x = 10; x < 170; x++) paint(rgba, width, x, y, 230, [30, 22, 14]);
    }
    keepCatContact(rgba, width, height, 0.85);
    expect(span(rgba, width)).toBeLessThanOrEqual(96);
    expect(rgba[(850 * width + 90) * 4 + 3]).toBe(230);
    expect(rgba[(850 * width + 10) * 4 + 3]).toBe(0);
    expect(rgba[(850 * width + 169) * 4 + 3]).toBe(0);
  });
});
