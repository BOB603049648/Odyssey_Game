import { describe, expect, it } from 'vitest';
import { travelerFrameUrl } from './assetUrls';
import { WALK_ATLAS, WALK_ATLAS_FILES, WALK_FRAME_COUNT, crossedWalkContact, walkAtlasFrame, walkAtlasSource } from './travelerWalkAtlas';

describe('walk atlas registration', () => {
  it('keeps all twenty-four crops inside their own cell with one shared image request', () => {
    expect(WALK_ATLAS_FILES).toHaveLength(24);
    for (const [index, file] of WALK_ATLAS_FILES.entries()) {
      const cell = walkAtlasFrame(file)!;
      const column = index % WALK_FRAME_COUNT, row = Math.floor(index / WALK_FRAME_COUNT);
      expect(cell.x).toBeGreaterThan(column * WALK_ATLAS.cellWidth);
      expect(cell.y).toBeGreaterThanOrEqual(row * WALK_ATLAS.cellHeight);
      expect(cell.x + cell.width).toBeLessThan((column+1) * WALK_ATLAS.cellWidth);
      expect(cell.y + cell.height).toBeLessThan((row+1) * WALK_ATLAS.cellHeight);
      expect(cell.sole).toBeLessThan(cell.height);
      expect(cell.sole).toBeGreaterThan(cell.height * .94);
      expect(cell.width/cell.height).toBe(.75);
      const url = travelerFrameUrl(file)!;
      expect(url.split('#')[0]).toBe(WALK_ATLAS.url);
      expect(walkAtlasSource(url)).toEqual(cell);
    }
  });
  it('sounds alternating plant phases even when a display frame is skipped', () => {
    expect(crossedWalkContact(-1, 0)).toBe(0);
    expect(crossedWalkContact(-1, 3)).toBeNull();
    expect(crossedWalkContact(1, 3)).toBeNull();
    expect(crossedWalkContact(3, 5)).toBe(4);
    expect(crossedWalkContact(7, 1)).toBe(0);
    expect(crossedWalkContact(4, 4)).toBeNull();
    expect(crossedWalkContact(6, 5)).toBe(4); // Latest contact, no catch-up burst.
  });
  it('never applies an atlas crop to a held idle bitmap or a different source', () => {
    expect(walkAtlasSource(travelerFrameUrl('idle-front-01.png')!)).toBeNull();
    expect(walkAtlasSource(`https://invalid.test/other.png#${WALK_ATLAS_FILES[0]}`)).toBeNull();
  });
});
