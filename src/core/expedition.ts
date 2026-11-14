import { canDepart, type IslandScene } from './island';
import type { SaveData } from './schema';
import { isLearnedState } from './words';
import { puzzleState } from './puzzles';

export type ExpeditionGoal = { title: string; detail: string; destination: IslandScene; spot: string };
/** A short narrative intention, derived from the same saved actions as the chapter. */
export function expeditionGoal(save: SaveData): ExpeditionGoal {
  const learned = (id: string) => isLearnedState(save.words[`dba.word.${id}`]?.state);
  const wall = (detail: string): ExpeditionGoal => ({ title: '读懂陌生的刻痕', detail,
    destination: 'dba.scene.shore', spot: 'island-mural' });
  const puzzles = puzzleState(save);
  if (save.beats['dba.beat.depart']) return { title: '余音未散', detail: '重访岛上的人和物，或在案卷中重看回忆。', destination: 'dba.scene.night', spot: 'night-memory' };
  if (puzzles.water === 'empty') return { title: '带上一只空瓢', detail: '泉池边的瓢还是空的。先拿起来，看看哪里能接到清水。', destination: 'dba.scene.shore', spot: 'island-gourd' };
  if (puzzles.water === 'carried') return learned('water')
    ? { title: '找到能喝的水', detail: '潮水有咸味，岩缝间却流着清泉。把空瓢带到泉口。', destination: 'dba.scene.shore', spot: 'water-spring' }
    : wall('空瓢在手，泉边却留着陌生的水纹。读懂石壁上的图形，再来接水。');
  if (puzzles.water === 'filled') return { title: '让清水润过喉咙', detail: '瓢里已经盛满清水。停下喝一口，再把瓢放回泉边。', destination: 'dba.scene.shore', spot: 'island-gourd' };
  if (!save.beats['dba.beat.sleep']) return learned('sleep') && learned('fire')
    ? { title: '在火边歇一歇', detail: '沿东边的小路去棚火，找一处可以歇息的铺位。', destination: 'dba.scene.camp', spot: 'camp-sleep' }
    : wall('火边的铺位有新的刻痕。观察壁画第二带里的动作。');
  if (puzzles.food.stage === 'unseen') return { title: '看看两只空碗', detail: '前坪留着四份食物和两只空碗。先观察，再决定怎样分。', destination: 'dba.scene.yard', spot: 'yard-grab' };
  if (puzzles.food.stage === 'inspected') return { title: '把食物拿到碗边', detail: '你和同行者都需要吃东西。把四份食物取到身前，开始分配。', destination: 'dba.scene.yard', spot: 'yard-grab' };
  if (puzzles.food.stage !== 'done' && puzzles.food.self !== 2) return { title: '给同行者留下一半', detail: '点碗移动一份食物，让两边都留下两份。分错了可以再挪回来。', destination: 'dba.scene.yard', spot: puzzles.food.self > 2 ? 'act:dba.word.amount:less' : 'act:dba.word.amount:more' };
  if (puzzles.food.stage !== 'done') return learned('give') && learned('share')
    ? { title: '把这一半递出去', detail: '两只碗里已经各有两份。将留好的那一半递给同行者。', destination: 'dba.scene.yard', spot: 'yard-give' }
    : wall('两只碗已经各有一半。壁画里人与人相处的情景，还藏着把心意递出去的方法。');
  if (!save.beats['dba.beat.danger']) return learned('danger')
    ? { title: '有时，停下才是前进', detail: '前坪东侧通往雾径。观察桥板和向导，再决定下一步。', destination: 'dba.scene.path', spot: 'path-stop' }
    : wall('雾径上的刻痕还没有读懂。再看一看第三带的情景。');
  if (!canDepart(save)) return wall('身体已经安定下来。壁画深处的饥饿与约定，还在等待你理解。');
  return { title: '向雾的另一边', detail: '这些刻痕已经与你的经历连在一起。回到雾岸，往东走。', destination: 'dba.scene.shore', spot: 'shore-depart' };
}
