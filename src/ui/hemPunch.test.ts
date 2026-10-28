import { describe, expect, it } from 'vitest';
import { HEM_Y0, HEM_Y1, SOLE_Y0, punchHemPixels } from './hemPunch';

describe('hem punch', () => {
  it('clears near-black hem pixels and leaves the sole rows', () => {
    const width = 4;
    const height = 1152;
    const data = new Uint8ClampedArray(width * height * 4);
    const paint = (y: number, rgba: [number, number, number, number]) => {
      for (let x = 0; x < width; x += 1) {
        const i = (y * width + x) * 4;
        data[i] = rgba[0];
        data[i + 1] = rgba[1];
        data[i + 2] = rgba[2];
        data[i + 3] = rgba[3];
      }
    };
    paint(HEM_Y0, [5, 5, 5, 255]);
    paint(HEM_Y1, [8, 6, 4, 240]);
    paint(HEM_Y0, [5, 5, 5, 255]);
    paint(100, [5, 5, 5, 255]);
    paint(SOLE_Y0, [28, 22, 16, 110]);
    paint(1151, [28, 22, 16, 108]);
    const cloth = (HEM_Y0 * width + 1) * 4;
    data[cloth] = 40;
    data[cloth + 1] = 32;
    data[cloth + 2] = 24;
    data[cloth + 3] = 255;

    punchHemPixels(data, width, height);

    expect(data[(HEM_Y0 * width) * 4 + 3]).toBe(0);
    expect(data[(HEM_Y1 * width) * 4 + 3]).toBe(0);
    expect(data[(100 * width) * 4 + 3]).toBe(255);
    expect(data[cloth + 3]).toBe(255);
    expect([data[SOLE_Y0 * width * 4], data[SOLE_Y0 * width * 4 + 1], data[SOLE_Y0 * width * 4 + 2], data[SOLE_Y0 * width * 4 + 3]]).toEqual([28, 22, 16, 110]);
    expect(data[(1151 * width) * 4 + 3]).toBe(108);
  });
});
