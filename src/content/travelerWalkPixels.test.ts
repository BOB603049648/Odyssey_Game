import { execFileSync } from 'node:child_process';
import { describe, expect, it } from 'vitest';
import { WALK_ATLAS_FILES, walkAtlasFrame } from './travelerWalkAtlas';

describe('delivered walk artwork', () => {
  it('keeps source alpha and body scale, with transparent gutters and registered soles', () => {
    const cells = JSON.parse(execFileSync('python', ['-c', `
import json
import numpy as np
from PIL import Image
atlas = np.array(Image.open('src/assets/traveler/stride-eight-atlas.webp').convert('RGBA'))
assert atlas.shape == (1536, 3072, 4)
cells = []
for row, direction in enumerate(['front', 'side', 'back']):
    for frame in range(8):
        source = 'back-passing' if direction == 'back' and frame >= 6 else direction
        sheet = np.array(Image.open('docs/assets/traveler-walk8/' + source + '-source.png').convert('RGBA'))
        assert sheet.shape == (1024, 1536, 4)
        x, y = frame % 4 * 384, frame // 4 * 512
        raw = sheet[y:y+512, x:x+384]
        packed = atlas[row*512:(row+1)*512, frame*384:(frame+1)*384]
        assert np.array_equal(raw[:,:,3], packed[:,:,3]), 'alpha changed during encoding'
        solid = raw[:,:,3] > 240
        error = np.abs(raw[:,:,:3].astype(float) - packed[:,:,:3].astype(float))[solid].mean(axis=0)
        assert error.max() < 2.5, error
        a = packed[:,:,3]
        assert (a < 10).mean() > .65, 'background is not transparent'
        assert max(a[:,:6].max(), a[:,378:].max(), a[496:,:].max()) < 5, 'crop cuts artwork'
        occupied = np.flatnonzero(solid.sum(axis=1) >= 4)
        cells.append({'head': int(occupied[0]), 'sole': int(occupied[-1]+1)})
print(json.dumps(cells))
`], { encoding: 'utf8' })) as Array<{ head: number; sole: number }>;
    expect(cells).toHaveLength(24);
    for (const [index, cell] of cells.entries()) {
      expect(walkAtlasFrame(WALK_ATLAS_FILES[index])!.sole).toBe(cell.sole);
    }
    for (let row = 0; row < 3; row++) {
      const heights = cells.slice(row * 8, row * 8 + 8).map(cell => cell.sole - cell.head);
      expect(Math.max(...heights) - Math.min(...heights), 'body height jumps between poses').toBeLessThan(8);
    }
  });
});
