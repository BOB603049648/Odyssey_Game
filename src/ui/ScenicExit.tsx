import type { Gate } from '../core/stage';
import {gateLabel} from './spotViews';
import {pathExitPoint} from '../core/walk';
import './scenicExit.css';
export function ScenicExit({gate,near,selected,onTravel}:{gate:Gate;near:boolean;selected:boolean;onTravel:(gate:Gate)=>void}){
 const at=pathExitPoint(gate),door=gate.from==='dba.scene.shore'&&gate.to==='dba.scene.hall';
 const rotation=gate.edge==='east'?-90:gate.edge==='west'?90:gate.edge==='north'?180:0;
 return <button type="button" className={`scenic-exit scenic-exit-trail${near?' near':''}${selected?' selected':''}`} data-testid={`exit-${gate.to.split('.').at(-1)}`} data-gate-x={gate.x} data-gate-y={gate.y} data-ground-x={at.x} data-ground-y={at.y} data-gate-radius={gate.r} data-gate-edge={gate.edge} data-kind={door?'door':'trail'} style={{left:`${at.x*100}%`,top:`${at.y*100}%`}} aria-label={gateLabel(gate.to)} onClick={e=>{e.stopPropagation();onTravel(gate);}}>
 <svg viewBox="0 0 160 90" aria-hidden="true"><g transform={`rotate(${rotation} 80 45)`}><path d={door?'M51 23v39h58V23':'m55 29 25 15 25-15m-42 19 17 12 17-12'} fill="none" stroke="currentColor" strokeWidth="2" strokeOpacity=".65"/></g></svg></button>;
}
