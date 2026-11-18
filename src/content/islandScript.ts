import type { IslandScene } from '../core/island';

/** Fictional island language. These shapes and conventions are not Dongba script. */
export const SCRIPT_WORDS = [
  ['water','水','清水|泉水|水源'], ['drink','喝','饮|饮水|喝水|饮用'], ['take','拿','取|拿取|取用|取走|拿走'],
  ['fire','火','火焰|炉火|火堆'], ['sleep','睡','睡觉|休息|安眠|歇息'], ['person','人','人们|人类|居民'],
  ['give','给','给予|递给|赠予|交给|递出'], ['share','分享','共享|共用|分食|分给|平分|分担'], ['fish','鱼','鱼肉'],
  ['me','我','自己|本人'], ['you','你','对方'], ['wait','等待','等|等候|停留|等一等'],
  ['danger','危险','险|险情|险兆'], ['protect','保护','守护|护住|庇护'], ['walk','走','行走|走路|前行|通行'],
  ['hunger','饥饿','饿|饥|饥荒'], ['promise','承诺','约定|诺言|誓言|保证'], ['trust','信任','相信|信赖|托付'],
] as const;
export type ScriptWord = typeof SCRIPT_WORDS[number][0];
export type ScriptMoment = { action: string; words: ScriptWord[] };
export type ScriptTrace = { id:string; group:string; scene:IslandScene; title:string; x:number;y:number; npc?:boolean; moments:ScriptMoment[]; hint:string };
export const SCRIPT_GROUPS = [
  {id:'spring',title:'泉边的往复',scene:'dba.scene.shore',words:['water','drink','take'],after:undefined},
  {id:'hearth',title:'留下的炉火',scene:'dba.scene.camp',words:['fire','sleep','person'],after:'water'},
  {id:'table',title:'两只碗之间',scene:'dba.scene.yard',words:['give','share','fish'],after:'sleep'},
  {id:'witness',title:'说话的人',scene:'dba.scene.hall',words:['me','you','wait'],after:'food'},
  {id:'bridge',title:'止步之处',scene:'dba.scene.path',words:['danger','protect','walk'],after:'food'},
  {id:'night',title:'未熄的约定',scene:'dba.scene.night',words:['hunger','promise','trust'],after:'danger'},
] as const;
export const SCRIPT_TRACES: ScriptTrace[] = [
  {id:'spring-stone',group:'spring',scene:'dba.scene.shore',title:'泉沿的刻痕',x:.36,y:.62,
    moments:[{action:'石槽在低处汇成一汪清亮，槽沿只刻着一个符号。',words:['water']},{action:'旁边的旧画里，旅人先俯身捧起液体，再把手送到嘴边。两个符号沿这一方向排列。',words:['take','drink']}],hint:'先比较泉沿、空瓢和巡路人的动作；留意重复的符号出现在什么位置。'},
  {id:'spring-cup',group:'spring',scene:'dba.scene.shore',title:'归还的瓢',x:.18,y:.73,
    moments:[{action:'瓢柄磨得发亮。刻痕旁画着两只手：一只从架上握起瓢，另一只将它放回。第一只手旁有两枚字。',words:['take','water']},{action:'瓢底的画已经褪色，只剩嘴边倾斜的瓢和一道相同的短句。',words:['drink','water']}],hint:'器物上的字可能说的是动作，并不一定是器物的名字。'},
  {id:'spring-speaker',group:'spring',scene:'dba.scene.shore',title:'巡路人的示范',x:.5,y:.77,npc:true,
    moments:[{action:'巡路人从架上取下瓢，递到你够得着的地方。他说：',words:['take','water']},{action:'他没有催你离开，而是抬起自己的杯子，喝了一口。他又说：',words:['drink','water']}],hint:'两句话的末尾没有变，开头随着手的动作改变了。'},
  {id:'hearth-cloth',group:'hearth',scene:'dba.scene.camp',title:'铺位上的布签',x:.66,y:.85,
    moments:[{action:'布签绣着一排合眼的人。有人裹着破衣，有人戴着礼帽，身下都是同样的席子。',words:['person','sleep']},{action:'签背画着空屋，炉中还留着一点红。字迹没有提到屋主。',words:['fire','wait']}],hint:'衣着不同的人被写成同一种称呼；空着的铺位也留着温度。'},
  {id:'hearth-pot',group:'hearth',scene:'dba.scene.camp',title:'旧炉砖',x:.84,y:.85,
    moments:[{action:'炉砖上刻着白昼与夜晚，中央的火苗始终没有灭。中央只有一枚字。',words:['fire']},{action:'另一面是同一个人，先端坐添柴，后蜷身合眼；后半幅画下有两个字。',words:['person','sleep']}],hint:'把整句与另一个铺位对照。画中的身份变了，动作是否也变了？'},
  {id:'hearth-speaker',group:'hearth',scene:'dba.scene.camp',title:'守火人让出的席子',x:.22,y:.825,npc:true,
    moments:[{action:'守火人添了一块柴，掌心转向炉膛。',words:['fire']},{action:'他把席子抚平，指向自己的眼睛，慢慢闭上，又把席子推给你。',words:['person','sleep']}],hint:'他没有盘问你来自哪里。这里的炉火，是为每一个抵达的人留下的。'},
  {id:'table-rack',group:'table',scene:'dba.scene.yard',title:'架边的账痕',x:.16,y:.9,
    moments:[{action:'账木左面记着一整尾带鳞的收获，右面记着切开的同一尾。两面都刻着相同的字。',words:['fish']},{action:'下方，两人各持一半，中央连着一枚与单个名字都不同的刻符。',words:['share','fish']}],hint:'比较“东西从一人到另一人”与“两人都留下了一部分”。'},
  {id:'table-bowls',group:'table',scene:'dba.scene.yard',title:'双碗的底纹',x:.36,y:.9,
    moments:[{action:'第一只碗下，画着一只手把整尾递向另一只手；递出者的掌心空了。',words:['give','fish']},{action:'第二只碗下，两人把同一尾分开，两只碗里都留下了一份。',words:['share','fish']}],hint:'这里区分的不是食物多少，而是食物与两个人的关系。'},
  {id:'table-speaker',group:'table',scene:'dba.scene.yard',title:'渔人的两次手势',x:.70,y:.92,npc:true,
    moments:[{action:'渔人把自己手里的一尾完整地递给同伴，随后摊开双手。',words:['give','fish']},{action:'下一尾，他只递出一半，另一半留在自己碗里。他指了指两个碗。',words:['share','fish']}],hint:'同一件东西，在两次动作中有不同的去向。'},
  {id:'witness-lines',group:'witness',scene:'dba.scene.hall',title:'交替的笔迹',x:.49,y:.57,
    moments:[{action:'纸上画着两个人轮流发言。第一人指着胸口，第二人也指着自己的胸口。两处写着同一句。',words:['me','give','water']},{action:'两人指向对方时，句首换成了另一枚相同的字。',words:['you','take','water']}],hint:'句首的字会随着说话者改变指向，不是两个人的姓名。'},
  {id:'witness-seal',group:'witness',scene:'dba.scene.hall',title:'未盖的印',x:.67,y:.57,
    moments:[{action:'长卷上，递水的人站着，持印的人坐着。直到第二个人到场，印才落下。持印人旁反复出现一枚字。',words:['wait']},{action:'另一个小画里，两个人站在岸边，船还没有来。衣角已被雨淋湿，那枚字仍在他们之间。',words:['person','wait']}],hint:'这枚字出现在不同姿势的人身边。共同点是事情尚未发生。'},
  {id:'witness-speaker',group:'witness',scene:'dba.scene.hall',title:'抄卷人的回问',x:.79,y:.65,npc:true,
    moments:[{action:'抄卷人指着自己，把水杯放到桌子中央。',words:['me','give','water']},{action:'他指向你，又指向水杯。',words:['you','take','water']},{action:'他没有收走杯子，放下笔，静静看着你。',words:['me','wait']}],hint:'试着交换说话的人，再读一遍前两句。'},
  {id:'bridge-plank',group:'bridge',scene:'dba.scene.path',title:'新旧两块桥板',x:.54,y:.55,
    moments:[{action:'旧桥板画着人在完整的桥面上向前，只有一枚刻符。',words:['walk']},{action:'裂开的新桥板上多了一句，和另一根断绳旁的刻痕相同。',words:['danger','wait']}],hint:'比较桥仍完好时与绳板已断时；新的字描述了什么变化？'},
  {id:'bridge-rope',group:'bridge',scene:'dba.scene.path',title:'护栏下的刻字',x:.70,y:.64,
    moments:[{action:'折断的栏木和落石旁，都有同一枚孤立的刻符。',words:['danger']},{action:'栏木未断的旧画中，一个人挡在幼者与深沟之间。另一幅里，他挡住了落石。两幅共用一句。',words:['protect','person']}],hint:'动作和险处不同，但两幅画里有人始终处在另一个人与伤害之间。'},
  {id:'bridge-speaker',group:'bridge',scene:'dba.scene.path',title:'巡路人的止步',x:.43,y:.524,npc:true,
    moments:[{action:'巡路人踏了一步，木板随即下沉。他立刻退回，抬起手。',words:['danger','wait']},{action:'奈奈茶想往前探，他侧身挡在猫与裂口之间，指了指你。',words:['me','protect','you']}],hint:'他后退不是因为忘了道路。先前留人的字，在这里有了另一层分量。'},
  {id:'night-ledger',group:'night',scene:'dba.scene.night',title:'灾年的薄册',x:.36,y:.75,
    moments:[{action:'第一幅是空粮仓和捂住腹部的人；同一枚字也记在数个空碗旁。',words:['hunger']},{action:'第二幅是闭口的粮袋、打结的绳与两个人的手。此时没有人吃东西。绳结旁写着一句。',words:['promise','share','fish']},{action:'最后一幅，隔了一个月亮的圆缺，绳结被解开，食物如先前手势所示分给众人。',words:['share','fish']}],hint:'分清事情尚未发生时说下的话，和后来真正做出的动作。'},
  {id:'night-token',group:'night',scene:'dba.scene.night',title:'留下的钥匙',x:.615,y:.75,
    moments:[{action:'刻板上，一人把仓门钥匙交给另一人，转身离开。接钥匙的人身旁有一句。',words:['me','trust','you']},{action:'另一块刻板上，两人仍站在紧闭的仓门前，双手按着绳结。句尾是已经见过的“递出”之字，句首却不同。',words:['promise','give']}],hint:'把“现在把重要的东西交给别人”与“为将来的行动作约”分开想。'},
  {id:'night-speaker',group:'night',scene:'dba.scene.night',title:'抄卷人交出的旧物',x:.46,y:.74,npc:true,
    moments:[{action:'抄卷人翻到空粮仓的一页，停了很久。他的手从空碗移到腹部。',words:['hunger']},{action:'他把仓钥放进你手心，松开手，没有取回。',words:['me','trust','you']},{action:'他把一条线绳系在自己腕上，又指向明日的粮袋；粮袋仍封着。',words:['me','promise','share']}],hint:'过去缺少的东西、当下托付的关系、对未来说下的话，分别留下了不同的刻痕。'},
];
