import {describe,expect,it} from 'vitest';
import {figureIllumination} from './figureLighting';
import {SCENE_LOOKS} from './looks';

describe('shared figure illumination',()=>{
  it('keeps night figures in moonlight and adds bounded warm fire light nearby',()=>{
    const look=SCENE_LOOKS['dba.scene.night'];
    const far=figureIllumination(look,{x:.9,y:.5},0),near=figureIllumination(look,{x:.617,y:.698},0);
    expect(far.b).toBeGreaterThan(far.r);expect(far.r).toBeLessThan(.35);
    expect(near.r).toBeGreaterThan(far.r*2);
    for(const c of [...near.toArray(),...far.toArray()])expect(c).toBeLessThanOrEqual(1.12);
  });
  it('does not flicker daylight or change source opacity',()=>{
    const look=SCENE_LOOKS['dba.scene.shore'],foot={x:.44,y:.72};
    expect(figureIllumination(look,foot,0).toArray()).toEqual(figureIllumination(look,foot,12).toArray());
  });
});
