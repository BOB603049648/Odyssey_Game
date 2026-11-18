import { describe, expect, it } from 'vitest';
import { cameraWindow, cropUV } from './geometry';

describe('GPU coordinates preserve existing gameplay registration', () => {
  it('projects the same world point to the same viewport pixel after camera travel', () => {
    const world={w:1920,h:1080},view={w:1200,h:720},cam={x:380,y:160};
    const bounds=cameraWindow(cam,world,view);
    const foot={x:.6,y:.75};
    const pixelX=(foot.x-bounds.left)/(bounds.right-bounds.left)*view.w;
    const pixelY=(bounds.top-(1-foot.y))/(bounds.top-bounds.bottom)*view.h;
    expect(pixelX).toBeCloseTo(foot.x*world.w-cam.x);
    expect(pixelY).toBeCloseTo(foot.y*world.h-cam.y);
  });
  it('uses only the authored atlas cell, including mirroring and top-left Y', () => {
    const crop={x:390,y:512,width:372,height:496,atlasWidth:3072,atlasHeight:1536};
    const normal=cropUV(crop),mirror=cropUV(crop,true);
    expect(normal.left).toBeCloseTo(390/3072);
    expect(normal.top).toBeCloseTo(1-512/1536);
    expect(normal.bottom).toBeCloseTo(1-1008/1536);
    expect(mirror.left).toBe(normal.right);
    expect(mirror.right).toBe(normal.left);
    expect(mirror.top).toBe(normal.top);
  });
});
