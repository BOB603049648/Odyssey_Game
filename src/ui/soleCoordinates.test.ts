import {describe,expect,it} from 'vitest';
import {worldContactBox} from './soleCoordinates';
describe('same-RAF world contact box',()=>{
 it('subtracts the world rect exactly once, not viewport/scale/support offsets',()=>{
  const image={left:300,top:400,width:80,height:110},world={left:-200,top:-100};
  expect(worldContactBox(image,world,14)).toEqual({left:500,top:500,width:80,height:124,fit:110/124});
  expect(worldContactBox({...image,left:150,top:360},{left:-350,top:-140},14)).toEqual(worldContactBox(image,world,14));
 });
 it('uses the existing cat16px feather with no Y reanchor',()=>expect(worldContactBox({left:600,top:300,width:120,height:160},{left:-200,top:-100},16)).toEqual({left:800,top:400,width:120,height:176,fit:160/176}));
});
