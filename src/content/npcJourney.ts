import type {IslandScene} from '../core/island';
import type {ReadingId} from './readingJourney';

export type NpcId='repairer'|'keeper'|'fisher'|'scribe';
export type NpcTopic='place'|'memory'|'method';
export const NPC_PEOPLE={
  repairer:{name:'巡路匠',detail:'修水渠，也修山路',cell:0},
  keeper:{name:'守火人',detail:'照看过路人的火塘',cell:1},
  fisher:{name:'分食渔人',detail:'在前坪收鱼、记食',cell:2},
  scribe:{name:'抄卷人',detail:'保存旧抄与补记',cell:3},
} as const;
export type NpcVisit={id:NpcId;scene:IslandScene;folio:ReadingId;x:number;y:number;r:number;arrival:string;place:string;memory:string;methods:readonly [string,string];after:string};
// Fictional inhabitants of one settlement. Their recollections are testimony,
// not historical descriptions of Naxi customs or translations of Dongba speech.
export const NPC_VISITS:readonly NpcVisit[]=[
  {id:'repairer',scene:'dba.scene.shore',folio:'spring',x:.50,y:.77,r:.055,
    arrival:'我正清这条渠。上游的人只看见一瓢水，下游的人却得等它流过来。你手里那句旧约，曾让两边吵了一整夜。',
    place:'潮口退水时会留下白痕，岩缝旁的细渠却一直往下走。上游想筑堰的人也不是贪心——他们担心旱季。你得分清眼前能看到的水路，和人们担心的将来。',
    memory:'去年有人把“留”理解成先蓄住，渠下的住户却等不到水。我的师父没有添一个字，只领双方各走了一次上下游。后来他们才问：这句话究竟为谁留了位置？',
    methods:['先分清“源”与“流”各指何物，再问一种做法会让谁失去取水的机会。','把水色、器具外形和水的来路分别记录。外观相似的两处水，能不能互相替代？'],
    after:'字上的争执终于落在水路上了。取够一瓢，沿东侧小路去棚火歇脚；别忘了渠下还有人。'},
  {id:'keeper',scene:'dba.scene.camp',folio:'hearth',x:.22,y:.825,r:.05,
    arrival:'你可以在火边说话。这里总有人来了又走；真正难记住的，是人走以后，谁还得添下一枝柴。',
    place:'铺位边有人添过新柴，火边那道坐痕却朝着柴堆。今早两位客人都说自己“留过火”，做的事并不相同。',
    memory:'以前有个抄手把“客可息”抄成“客当守”。只差两个字，后来的人却不敢躺下。我把两张纸留着，因为被改掉的不是字数，是谁能休息。',
    methods:['先给“守、息、添”各找一个行动者，再核对他们离开和留下的时间。','坐痕只能说明有人守过，铺位补记说明谁可以休息。不要让一个人的回忆包办所有空缺。'],
    after:'歇过再走。前坪有人正收最后一篮鱼，他记账的法子和我记添柴的人不一样。'},
  {id:'fisher',scene:'dba.scene.yard',folio:'table',x:.70,y:.92,r:.05,
    arrival:'四份食物不难数。难的是递出去以后，还要不要写下一个“欠”字。有人说人情不用记，也有人一辈子都记着。',
    place:'你可以看碗边的浅痕，再看篮上的绳结。绳结是清点时留下的；谁吃了多少、谁欠了谁，不能都由同一根绳子回答。',
    memory:'我父亲在背页只写“同食者二”。有人说这就是两不相欠，也有人说欠数另记了。我只知道，这一册从来没有人名和到期的日子；别把我的猜测当作册子上写过的话。',
    methods:['先分清数量记录与关系记录。你要解释的是一次分食，还是所有往来的规矩？','给一个读法找证据时，也试着问：另一种读法若成立，记录里还应该留下什么？'],
    after:'把分好的那份递出去吧。经堂的抄卷人读过更多旧页，她会提醒你：一样的图形，未必承担一样的意思。'},
  {id:'scribe',scene:'dba.scene.hall',folio:'script',x:.79,y:.65,r:.055,
    arrival:'卷子借你看，结论先别急着写。有人认得每个形，却把整件事读反了；也有人记得故事，却记错了纸上到底写了多少。',
    place:'手记附着两枚馆藏字例。看“雪”的构形，再读“峭顶”的馆藏讲解：同样看得出形状，各部分承担的功能却要分别核对。我的话只是帮你找读法，出处还得自己看。',
    memory:'有位旅人把一页书抄得很满，以为抄下的就是整段诵读。后来他才知道，有些提示靠传承者补足。未写在这一页上的内容，不能凭自己的想象补成唯一答案。',
    methods:['把字形中的部分、读音线索和叙事所指分开，不要用一个层面替代另外两个。','比较几种释读各自多声称了什么：知道一个部件的功能，是否就足以还原整句？'],
    after:'把出处也带上。去雾径时留心那句“旧火”——读懂一个地点，还要能从走过的路上找到它。'},
  {id:'repairer',scene:'dba.scene.path',folio:'bridge',x:.43,y:.524,r:.045,
    arrival:'又见面了。水渠要留出下游，修路也得留出退路。我能告诉你绳板坏在哪里，不能替你决定把同行的人留在哪里。',
    place:'扶绳磨断了几股，桥口一块板也松了。雾散时能看见对岸，但看得见和走得过去，是两件事。',
    memory:'早先有人只抄了“留步”两个字，便在断索旁守了一夜。第二天我们翻出同页的下一行，才发现那处等待的地方，早在来路上。',
    methods:['把“暂停什么”和“在哪里等”拆开。残页可能把后一个问题交给了前文。','用眼前损坏判断此处能否停留，再用自己的旧记录核对去处。路近不等于风险小。'],
    after:'先把危险和等待的意思向同行者说明，再沿左侧路口一起退回前坪。修桥的事由我接着做。'},
  {id:'scribe',scene:'dba.scene.night',folio:'palimpsest',x:.46,y:.74,r:.05,
    arrival:'灯斜一点，旧墨才看得见。白日大家争一句话怎么读；夜里我更担心，谁的话被盖住后，再没人知道他曾经说过。',
    place:'涂白压住旧笔画，新笔画又写在涂白上。我能确认这层先后，不能从墨色断定是哪一天，更不能只凭一个相似纹样认定执笔的人。',
    memory:'有人拿着新抄说“账已清了”。可我翻到前坪的同食记录，又找到棚火的接续记法，两处都还有未到场的人。新抄删掉了哪些位置，要由这些旧页来作证。',
    methods:['先列出墨层能证明的事，再列出措辞能证明的事。身份与动机需要另外的证据。','把“彼”和“余”分别代回前几页的关系里，看看新抄让谁退出了应当承担的位置。'],
    after:'把可确认的变化记下，把仍未确认的人留下。带着未完的判断离岛，比带着一个轻易的罪名更难。'},
];
export function npcForScene(scene:string){return NPC_VISITS.find(npc=>npc.scene===scene);}
export function npcSpotId(npc:NpcVisit){return `npc:${npc.folio}`;}
