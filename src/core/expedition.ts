import { canDepart, type IslandScene } from './island';
import type { SaveData } from './schema';
import { isLearnedState } from './words';

export type ExpeditionGoal = { title: string; detail: string; destination: IslandScene; spot: string };
/** A short narrative intention, derived from the same saved actions as the chapter. */
export function expeditionGoal(save: SaveData): ExpeditionGoal {
  const learned = (id: string) => isLearnedState(save.words[`dba.word.${id}`]?.state);
  const wall = (detail: string): ExpeditionGoal => ({ title: '读懂陌生的刻痕', detail,
    destination: 'dba.scene.shore', spot: 'island-mural' });
  if (save.beats['dba.beat.depart']) return { title: '余音未散', detail: '重访岛上的人和物，或在案卷中重看回忆。', destination: 'dba.scene.night', spot: 'night-memory' };
  if (!save.beats['dba.beat.water']) return learned('water')
    ? { title: '让刻痕成为行动', detail: '石壁上的水纹，让你想起岸边的清泉。走近水瓢，试着使用刚刚理解的图形。', destination: 'dba.scene.shore', spot: 'island-gourd' }
    : wall('潮水退去了。石壁上留下的图画，也许能告诉你如何在这里活下去。');
  if (!save.beats['dba.beat.sleep']) return learned('sleep') && learned('fire')
    ? { title: '在火边歇一歇', detail: '沿东边的小路去棚火，找一处可以歇息的铺位。', destination: 'dba.scene.camp', spot: 'camp-sleep' }
    : wall('火边的铺位有新的刻痕。观察壁画第二带里的动作。');
  if (!save.beats['dba.beat.food']) return learned('give') && learned('share')
    ? { title: '留一份给同行者', detail: '穿过棚火，去前坪看看那份还没有递出的食物。', destination: 'dba.scene.yard', spot: 'yard-give' }
    : wall('一个人的食物，如何成为两个人的晚餐？继续观察人与人的关系。');
  if (!save.beats['dba.beat.danger']) return learned('danger')
    ? { title: '有时，停下才是前进', detail: '前坪东侧通往雾径。观察桥板和向导，再决定下一步。', destination: 'dba.scene.path', spot: 'path-stop' }
    : wall('雾径上的刻痕还没有读懂。再看一看第三带的情景。');
  if (!canDepart(save)) return wall('身体已经安定下来。壁画深处的饥饿与约定，还在等待你理解。');
  return { title: '向雾的另一边', detail: '这些刻痕已经与你的经历连在一起。回到雾岸，往东走。', destination: 'dba.scene.shore', spot: 'shore-depart' };
}
