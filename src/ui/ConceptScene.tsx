import { useState } from 'react';
import concrete from '../assets/art/painted/concepts-concrete.webp';
import actions from '../assets/art/painted/concepts-actions.webp';
import relations from '../assets/art/painted/concepts-relations.webp';
import bonds from '../assets/art/painted/concepts-bonds.webp';
import memories from '../assets/art/painted/concepts-memories.webp';

/** Authored scenes teach meaning; none reuse the answer glyph as the question. */
export const CONCEPT_SCENES: Record<string, readonly [string, number, string]> = {
  sun: [concrete, 0, '天色渐明，山脊上升起一轮金色的光。'],
  moon: [concrete, 1, '夜色里，一弯清辉悬在山峰之上。'],
  water: [concrete, 2, '清泉从石缝流下，在池中漾开。'],
  fire: [concrete, 3, '木柴噼啪作响，橙色的光带来温暖。'],
  fish: [concrete, 4, '银色的鳞片与尾鳍从清流中掠过。'],
  person: [concrete, 5, '一个陌生的身影，和你一样站在土地上。'],
  eat: [actions, 0, '他把食物送到嘴边。'],
  drink: [actions, 1, '他举起杯子，让清泉润过喉咙。'],
  sleep: [actions, 2, '火光渐暗，他在铺位上闭上了眼。'],
  walk: [actions, 3, '他的脚步带着身体沿小路向前。'],
  give: [actions, 4, '他把整篮食物递到对方手中。'],
  take: [actions, 5, '桌上的袋子被他伸手提起。'],
  me: [relations, 0, '说话的人，用手指向自己的胸口。'],
  you: [relations, 1, '说话的人，用手指向面前的同行者。'],
  size: [relations, 2, '同样的陶罐，一个高过另一个。'],
  amount: [relations, 3, '一样大的篮子，一边只有一颗，另一边装着许多。'],
  danger: [relations, 4, '前方桥板断裂，下面是深不见底的山谷。'],
  hunger: [bonds, 0, '碗已经空了，他按着仍在发紧的肚子。'],
  share: [bonds, 1, '同一篮食物，被分成两人面前相等的两份。'],
  wait: [bonds, 2, '他坐在路口，目光一直留在尚无人到来的小路上。'],
  promise: [bonds, 3, '出发之前，两人将一根绳系在相握的手腕上。'],
  trust: [bonds, 4, '他蒙着双眼，把下一步交给牵着自己的那只手。'],
  protect: [bonds, 5, '石块落下，他把孩子护在举起的盾下。'],
  betray: [memories, 0, '下方的人仍握着绳索，上方的同伴却割断了它。'],
  lie: [memories, 1, '他展示空篮，却把那条鱼藏在身后。'],
  miss: [memories, 2, '他攥着旧物，望向身旁再没有人坐下的空位。'],
  forgive: [memories, 3, '陶罐已经碎了。面对低头的人，他仍轻轻伸出手。'],
  home: [memories, 4, '走过漫长山路，门内终于有人张开双臂迎接他。'],
};

export function ConceptScene({ id }: { id: string }) {
  const art = CONCEPT_SCENES[id.split('.').at(-1)!];
  const [failed, setFailed] = useState<string | null>(null);
  if (!art) return null;
  const [src, index, story] = art;
  return <span className="concept-scene" data-concept={id}>
    <span className="concept-picture" data-failed={failed === src ? 'yes' : 'no'}>
      {failed !== src ? <img src={src} alt="" draggable={false} loading="lazy" decoding="async"
        style={{ left: `${-(index % 3) * 100}%`, top: `${-Math.floor(index / 3) * 100}%` }}
        onError={() => setFailed(src)} /> : <span className="concept-image-fallback">画面暂未载入，请根据下面的情景观察。</span>}
    </span>
    <span className="concept-story">{story}</span>
  </span>;
}
