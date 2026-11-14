import { describe, expect, it } from 'vitest';
import { travelerFrameUrl } from './assetUrls';
import { WALK_ATLAS, WALK_ATLAS_FILES, walkAtlasFrame, walkAtlasSource } from './travelerWalkAtlas';

describe('walk atlas registration', () => {
  it('keeps all twelve crops inside their own cell with one shared image request', () => {
    expect(WALK_ATLAS_FILES).toHaveLength(12);
    for (const [index, file] of WALK_ATLAS_FILES.entries()) {
      const cell = walkAtlasFrame(file)!;
      const column = index % 4, row = Math.floor(index/4);
      expect(cell.x).toBeGreaterThan(column * WALK_ATLAS.cell);
      expect(cell.y).toBeGreaterThanOrEqual(row * WALK_ATLAS.cell);
      expect(cell.x + cell.width).toBeLessThan((column+1) * WALK_ATLAS.cell);
      expect(cell.y + cell.height).toBeLessThan((row+1) * WALK_ATLAS.cell);
      expect(cell.width/cell.height).toBe(.75);
      const url = travelerFrameUrl(file)!;
      expect(url.split('#')[0]).toBe(WALK_ATLAS.url);
      expect(walkAtlasSource(url)).toEqual(cell);
    }
  });
  it('never applies an atlas crop to a held idle bitmap or a different source', () => {
    expect(walkAtlasSource(travelerFrameUrl('idle-front-01.png')!)).toBeNull();
    expect(walkAtlasSource(`https://invalid.test/other.png#${WALK_ATLAS_FILES[0]}`)).toBeNull();
  });
});
