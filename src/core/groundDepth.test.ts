import { describe,expect,it } from 'vitest';
import { sortGroundDepth,type DepthItem } from './groundDepth';
const props=[['mural-wall',.56],['gourd',.66],['east-gap',.68],['break-shard',.70],['driftwood',.72]] as const;
describe('continuous semantic-foot depth',()=>{
 for(const [name,y] of props) for(const hy of [y-.02,y+.02]) for(const cy of [y-.02,y+.02]) {
  it(`${name}: H${hy} C${cy}`,()=>{
   const rows:DepthItem[]=[{id:'prop-'+name,footY:y,kind:'prop'},{id:'traveler',footY:hy,kind:'traveler'},{id:'cat',footY:cy,kind:'cat'}];
   const expected=hy<y?(cy<y?['cat','traveler','prop-'+name]:['traveler','prop-'+name,'cat']):(cy<y?['cat','prop-'+name,'traveler']:['prop-'+name,'cat','traveler']);
   expect(sortGroundDepth(rows).map(x=>x.id)).toEqual(expected);expect(sortGroundDepth([...rows].reverse()).map(x=>x.id)).toEqual(expected);
  });
 }
 it('has no dead zone or quantized Y bucket, uses fixed ties and never mutates input',()=>{
  const rows:DepthItem[]=[{id:'traveler',footY:.7200001,kind:'traveler'},{id:'prop',footY:.72,kind:'prop'},{id:'cat',footY:.72,kind:'cat'}];const original=[...rows];
  expect(sortGroundDepth(rows).map(x=>x.id)).toEqual(['cat','prop','traveler']);expect(rows).toEqual(original);
 });
 it.each([NaN,Infinity,-Infinity])('rejects nonfinite %s rather than sorting a bbox',y=>expect(()=>sortGroundDepth([{id:'cat',footY:y,kind:'cat'}])).toThrow());
});
