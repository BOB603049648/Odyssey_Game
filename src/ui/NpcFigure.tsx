import type {CSSProperties} from 'react';
import {npcFrame} from '../content/npcAtlas';
import type {NpcVisit} from '../content/npcJourney';
import {depthScale,worldToScreen} from '../core/world';
import './npc.css';
export function NpcPortrait({npc}:{npc:NpcVisit}){
  const f=npcFrame(npc);
  return <span className="npc-portrait" aria-hidden="true" style={{backgroundImage:`url(${f.src})`,backgroundPosition:`${f.cell%2*100}% ${Math.floor(f.cell/2)*100}%`}}/>;
}
export function NpcFigure({npc}:{npc:NpcVisit}){
  const f=npcFrame(npc),h=f.height*depthScale(npc.y);
  return <div className="npc-figure" data-testid="npc-figure" data-npc={npc.id} aria-hidden="true" style={{...worldToScreen(npc,f.foot),height:`${h*100}%`,width:`${h*.75/(16/9)*100}%`,'--npc-foot':`${f.foot.y*100}%`} as CSSProperties}>
    <span className="npc-contact"/><NpcPortrait npc={npc}/>
  </div>;
}
