import idle from '../assets/art/actors/idle.webp';
import walk from '../assets/art/actors/walk.webp';
import action from '../assets/art/actors/action.webp';
import settle from '../assets/art/actors/settle.webp';
import cat from '../assets/art/actors/cat.webp';
import catPerformance from '../assets/art/actors/cat-performance.webp';
import catLeap from '../assets/art/actors/cat-leap.webp';
import registration from '../assets/art/actors/registration.json';

export const PAINTED_ACTORS={idle,walk,action,settle,cat,'cat-performance':catPerformance,'cat-leap':catLeap};
export const ACTOR_REGISTRATION=registration;
export const PAINTED_IDLE_FILES=[1,2].flatMap(n=>['front','side','back'].map(view=>`idle-${view}-0${n}.png`));
const files={
  idle:PAINTED_IDLE_FILES,
  walk:['front','side','back'].flatMap(view=>Array.from({length:8},(_,i)=>`stride-${view}-0${i+1}.png`)),
  action:['reach','drink','rest'].flatMap(action=>Array.from({length:4},(_,i)=>`action-${action}-0${i+1}.png`)),
  settle:['down','up'].flatMap(action=>Array.from({length:4},(_,i)=>`settle-${action}-0${i+1}.png`)),
};
export function paintedTravelerFrame(file:string){
  for(const kind of ['idle','walk','action','settle'] as const){
    const index=files[kind].indexOf(file);if(index<0)continue;
    const sheet=registration[kind];
    return {...sheet.frames[index],file,atlasWidth:sheet.width,atlasHeight:sheet.height,url:PAINTED_ACTORS[kind]};
  }
  return null;
}
export function paintedTravelerSource(src:string){
  const at=src.indexOf('#');if(at<0)return null;
  const frame=paintedTravelerFrame(src.slice(at+1));
  return frame&&src.slice(0,at)===frame.url?frame:null;
}
export function paintedIdleFrame(file:string){return PAINTED_IDLE_FILES.includes(file)?paintedTravelerFrame(file):null;}

export const CAT_PERFORMANCE_FILES=['observe-01','observe-02','point-01','point-02','settle-01','settle-02','curl-01','curl-02'].map(id=>`pose-${id}`);
export function paintedCatFrame(file:string){
  const leap=file.startsWith('leap-'),index=(leap?['leap-01','leap-02']:CAT_PERFORMANCE_FILES).indexOf(file);
  if(index<0)return null;
  const key=leap?'cat-leap':'cat-performance',sheet=registration[key];
  return {...sheet.frames[index],file,atlasWidth:sheet.width,atlasHeight:sheet.height,url:PAINTED_ACTORS[key],standingFraction:sheet.standingFraction};
}
export function paintedCatSource(src:string|undefined){
  if(!src)return null;const at=src.indexOf('#');if(at<0)return null;
  const frame=paintedCatFrame(src.slice(at+1));return frame&&src.slice(0,at)===frame.url?frame:null;
}
