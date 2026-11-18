import url from '../assets/art/npc/villagers.webp';
import {NPC_PEOPLE,type NpcVisit} from './npcJourney';
import {sceneBodyHeight,NPC_STATURE} from './sceneScale';
export const NPC_ATLAS={url,width:1086,height:1448,cellWidth:543,cellHeight:724};
/** Measured on the delivered RGBA sheet, excluding detached edge pixels. */
export const NPC_FEET=[712/724,708/724,711/724,709/724] as const;
export const NPC_BODY_FRACTIONS=[695/724,668/724,685/724,674/724] as const;
export function npcFrame(npc:NpcVisit){
  const cell=NPC_PEOPLE[npc.id].cell;
  return {src:url,crop:{x:(cell%2)*543,y:Math.floor(cell/2)*724,width:543,height:724,atlasWidth:1086,atlasHeight:1448},
    foot:{x:.5,y:NPC_FEET[cell]},height:sceneBodyHeight(npc.scene,NPC_STATURE[npc.id])/NPC_BODY_FRACTIONS[cell],cell};
}
