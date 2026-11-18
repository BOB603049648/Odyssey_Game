import type { IslandScene } from '../core/island';

export type ReadingId='spring'|'hearth'|'table'|'script'|'bridge'|'palimpsest';
export type ReadingChoice={id:string;text:string;objection:string};
export type ReadingEvidence={id:string;title:string;text:string;from?:ReadingId};
export type ReadingFolio={
  id:ReadingId;scene:IslandScene;place:string;spot:string;title:string;subtitle:string;
  passage:string[];question:string;choices:ReadingChoice[];answer:string;
  evidence:ReadingEvidence[];proof:readonly [string,string];resolution:string;handoff:string;
  hints:readonly [string,string];words:string[];culture:string;source:'leiden'|'loc'|'unesco';
  variant?:{label:string;lines:string[];note:string};
};
export const CULTURE_SOURCES={
  leiden:{label:'莱顿大学图书馆 · Reading a Naxi Manuscript',url:'https://webpresentations.universiteitleiden.nl/s/naxi/page/reading-a-naxi-manuscript'},
  loc:{label:'美国国会图书馆 · Living Pictographs',url:'https://www.loc.gov/loc/lcib/9906/naxi1.html'},
  unesco:{label:'UNESCO · 纳西东巴古籍文献申报档案',url:'https://media.unesco.org/sites/default/files/webform/mow001/chinaancientnaxidongbaliteraturemanuscripts.pdf'},
} as const;

/** Chinese passages are original game fiction, never translations of a real
 * Dongba scripture. Only the explicitly sourced cultural notes are historical. */
export const READING_FOLIOS:readonly ReadingFolio[]=[
  {
    id:'spring',scene:'dba.scene.shore',place:'雾岸',spot:'island-mural',title:'泉从何来',subtitle:'第一叶 · 辨指代',
    passage:['泉出山腹，渠过数家。','客来汲水：留其源，取其流。','残行：……后来……有饮。'],
    variant:{label:'渠上人家的旁记',lines:['旱则先蓄，以备后来。'],note:'旁记没有落款。它与原页同谈“后来”，所指是否相同仍需核对。'},
    question:'原页与旁记都提到“后来”。结合水路痕迹，哪种做法最能同时解释“留源”和“取流”？',
    choices:[
      {id:'store',text:'在泉眼筑堰蓄水，由渠上人家决定何时向下游放水。',objection:'“蓄住”似乎也是留，但堵住泉眼与后来者仍能取水相矛盾。'},
      {id:'flow',text:'从流出的清泉取水，保全泉眼，让水继续流向后来者。',objection:''},
      {id:'tide',text:'从较低的积水处取用，把岩缝泉水留作全村的储备。',objection:'位置低并不能证明水适于饮用；需要辨清泉流和潮水的来路。'},
      {id:'avoid',text:'先给每户划定一段水路，旅人只取无人认领的一段。',objection:'原页没有按住户划分水路。把保全水源解释成分段占有，还缺少另一份约定。'},
    ],answer:'flow',
    evidence:[
      {id:'salt',title:'潮口白痕',text:'低处积水随潮涨落，干后留下咸白的痕迹。'},
      {id:'blue',title:'水面的颜色',text:'潮口与泉口呈相近的青灰色；风静时，两处水面都能照见天光。'},
      {id:'running',title:'泉眼与细渠',text:'岩缝出水后沿细渠流向下游，取水的位置并不需要堵住岩缝。'},
      {id:'vessel',title:'空瓢的旧痕',text:'瓢柄磨得发亮，边缘有两处修补，瓢底覆着一层细沙。'},
    ],proof:['salt','running'],
    resolution:'这里的“留”是保全来源。你没有获得占有整眼泉水的权利，只取走眼前所需的一瓢。',
    handoff:'喝过清泉，沿东侧小路去棚火。下一叶也写着“留”，却未必仍是同一种动作。',
    hints:['先分清“源”与“流”指向什么。水色与瓢的样子能证明水的来源吗？','把水色与水路分开核对；再看某种取法是否让渠下的人失去了原页留下的位置。'],words:['water','drink'],
    culture:'东巴文字用于记录纳西语；图画性的外形并不意味着它只是装饰图案。',source:'loc',
  },
  {
    id:'hearth',scene:'dba.scene.camp',place:'棚火',spot:'camp-sleep',title:'谁守着火',subtitle:'第二叶 · 补出省略的人',
    passage:['火有守，客可息。','去者添一枝，留者候天明。','朝闻泉声，仍循旧路。'],
    variant:{label:'铺边另一张抄条',lines:['火有守，客当守。'],note:'“可息”被另写为“当守”。何者对应这处铺位，不能只看哪张纸更新。'},
    question:'两张抄条对来客的安排不同。哪一种读法能解释原页与铺位、坐痕之间的关系？',
    choices:[
      {id:'all-sleep',text:'“守”指保有一个铺位；来客取得位置以后才能歇息。',objection:'这种读法没有解释朝着柴堆的坐痕，也把守火改成了占有铺位。'},
      {id:'detain',text:'来客与守火者轮换，添柴便是交换下一轮铺位的凭据。',objection:'轮换听来合理，但原页和补记没有把添柴设为换取铺位的条件。'},
      {id:'care',text:'留下的人守火，来客可以歇息；离开者添柴，把照料接续下去。',objection:''},
      {id:'trade',text:'去者付柴、留者收柴；原页记的是住客与店主的结算。',objection:'页上写了接续的动作，却没有标出买卖或结清的关系。'},
    ],answer:'care',
    evidence:[
      {id:'watch',title:'火边坐痕',text:'坐痕朝向火心，柴堆靠着坐痕；守火者无需占用铺位。'},
      {id:'guest',title:'铺位上的补记',text:'“此席待来客。”席边仍有添过的新柴。'},
      {id:'spring-copy',title:'雾岸抄记',text:'“留其源，取其流；去者莫塞泉眼。”纸角仍沾着泉边的水迹。',from:'spring'},
      {id:'ash',title:'灰烬颜色',text:'近火心的灰偏白，外缘的灰更深；雨滴只落在火塘外围。'},
    ],proof:['watch','guest'],
    resolution:'泉边留下的是水源，火边接续的是照料。相同的“留”，随着对象与行动关系改变了含义。',
    handoff:'在铺位歇息后，再沿东侧路口去前坪。路约在那里谈到食物与人之间的关系。',
    hints:['先分别找“守”“息”“添”的行动者，不要把所有动作塞给同一个人。','同一个“守”若换了行动者，谁能歇息也会改变。分别核对坐痕和铺位留下的是哪种安排。'],words:['fire','sleep','person'],
    culture:'东巴经籍与诵读传统相连，书写的提示和掌握的口传内容共同参与理解。',source:'loc',
  },
  {
    id:'table',scene:'dba.scene.yard',place:'前坪',spot:'yard-grab',title:'半份之约',subtitle:'第三叶 · 分清赠与和债',
    passage:['两人共食，四份为餐。','留其半，与同行。','背页仅存：同食者二。'],
    variant:{label:'夹在背页的补抄',lines:['来者受其半，归日补其数。'],note:'补抄另用一种墨，未记书写日期，也没有双方署名。'},
    question:'有人把补抄当成追索食物的凭据。原页、碗痕和旧记录共同支持什么，尚不能支持什么？',
    choices:[
      {id:'debt',text:'两人各半是赊食的数目；补抄补全了原页省略的还债日期。',objection:'份数相合不证明两页原本属于同一约定；原记录也没有到期日或欠数。'},
      {id:'gift',text:'原页记两人共食；补抄另加偿还条件，不能据此倒推当初已经欠债。',objection:''},
      {id:'all',text:'旧册不记欠数，足以证明这里任何一次分食都不可能附带偿还约定。',objection:'这份册子的记录有范围，不能代替从未见过的全部约定。'},
      {id:'reserve',text:'补抄没有署名，因而其中的偿还条件与原页的共食记录都应作废。',objection:'补抄的效力待核，不能因此一并否定另有碗痕和记录支持的共食事实。'},
    ],answer:'gift',
    evidence:[
      {id:'knots',title:'篮上的四道结',text:'四道绳结紧密并列，每道结旁都擦有少许鱼油，没有第五道结。'},
      {id:'bowls',title:'两只用过的碗',text:'两只碗旁各留两处放食物的浅痕；两边都曾有人用餐。'},
      {id:'ledger',title:'背面的旧记录',text:'每次只记“同食者二”，没有人名、到期日或欠数。'},
      {id:'hearth-copy',title:'棚火抄记',text:'“去者添一枝，留者候天明。”添柴的人离开后，守火者仍在火旁。',from:'hearth'},
    ],proof:['bowls','ledger'],
    resolution:'两份食物的数量没有变，人与人的关系却可能被补上一句就改变。此处可确认共同用餐；后来添上的偿还条件，不能自动成为当初已经欠债的证据。',
    handoff:'分好食物并递出去。随后回雾岸，穿过北侧门洞进经堂，查查这些读法能否只凭字形确定。',
    hints:['把数量和关系分开核对。相同的两份食物，也可能是借贷、交换或赠与。','先问两人是否真的共同用餐，再问原记录留下了哪一种关系。补抄的存在和补抄的效力，需要分开判断。'],words:['fish','give','share','take','amount','me','you','eat'],
    culture:'学习文字还要辨清它所记录的关系；本页的分食路约是游戏创作，不是纳西族习俗的史料。',source:'unesco',
  },
  {
    id:'script',scene:'dba.scene.hall',place:'经堂',spot:'hall-mural',title:'形不尽意',subtitle:'第四叶 · 图形也能提示读音',
    passage:['抄者按：见鸟形，未必皆说鸟。','辨形之后，仍须核对读音与上下文。','页边另记：旧火在来路，峭顶在远处。'],
    question:'馆藏读法中，“峭顶”字例含有鸡头形的部分。为什么不能把它直接读成“山上有鸡”？',
    choices:[
      {id:'literal',text:'鸡头先确定动物，山形再确定地点；读音只是辅助记住这幅图。',objection:'馆藏讲解区分了表意对象和提示读音的部分，不能把已说明的文字功能抹去。'},
      {id:'all-sound',text:'鸡头确定读音后，便可独立恢复整个字在每一篇经籍里的用法。',objection:'提示读音不等于独自承担整个字的意义；还要解释其余部分与叙事所指。'},
      {id:'phonetic',text:'鸡头在这个字例中提示读音；字的读法要结合其他部分及叙事位置。',objection:''},
      {id:'decoration',text:'故事提到山峰，便足以确定读法；鸡头的具体作用无须再查。',objection:'语境可以约束所指，却不能替代馆藏讲解对部件功能的说明。'},
    ],answer:'phonetic',
    evidence:[
      {id:'snow',title:'馆藏字例：雪',text:'莱顿展览以三片下落的雪花说明这个字例，并标注读音 bbei。'},
      {id:'sound',title:'馆藏字例：峭顶',text:'同一展览明确说明：这个字中的鸡头是提示读音的部分，不是在叙述鸡住在山上。'},
      {id:'sequence',title:'字例所在的叙事',text:'馆藏讲解把这一处放在“把黑卵送往黑色山峰”的情节中，所指为地点。'},
      {id:'food-copy',title:'前坪抄记',text:'原页写“两人共食”；夹入的补抄写“归日补其数”，却没有双方署名。',from:'table'},
    ],proof:['sound','sequence'],
    resolution:'图形是进入文字的线索，不能代替读音与语境。这一例只支持这个字的分析；没有因此得到一套任意猜读所有字形的方法。',
    handoff:'把这条读法记在页边。出经堂，经棚火、前坪去雾径；桥边的“留”将要求你再次核对处境。',
    hints:['比较“雪”和“峭顶”两个字例：有图画性，不等于每个部分都直接画出句子的意思。','一种证据解释部件怎样起作用，另一种约束这次叙事中的所指。二者都不能推出所有经籍通用的整句。'],words:['wait','protect'],
    culture:'“雪”和“峭顶”的例子来自莱顿大学图书馆对 Or. 26.029 的讲解；具体解释仅适用于所示字例。',source:'leiden',
  },
  {
    id:'bridge',scene:'dba.scene.path',place:'雾径',spot:'path-stop',title:'止步之后',subtitle:'第五叶 · 把省略处接回前文',
    passage:['桥未固，留步。','候于旧□，不候于断索。','同行者未安，不独往。'],
    variant:{label:'页边残注',lines:['来路有候，远处有顶。'],note:'方框处缺一字。相近的旧记可能都与“等候”有关，需要回查经历。'},
    question:'“留步”之后应该在哪里等待，为什么？',
    choices:[
      {id:'on-bridge',text:'在桥口石台等待修缮，不再踏上木板，也不必退回旧火。',objection:'这只按一个词决定位置，忽略了后句对断索的排除。'},
      {id:'solo',text:'先由一人探过桥面，再回头带同行者前往对岸的等候处。',objection:'“同行者未安，不独往”否定了这种把风险独自承担或留给对方的解释。'},
      {id:'never',text:'循页边的“顶”字去较高处等候，雾散后再判断桥面情况。',objection:'较高处未必是旧记的等候处。“峭顶”字例的叙事位置，与此处来路并不相同。'},
      {id:'return',text:'先共同退回稳固地面，再循来路到棚火等候，不在损坏的扶绳旁停留。',objection:''},
    ],answer:'return',
    evidence:[
      {id:'rope',title:'桥边扶绳',text:'扶绳已磨断多股，附近木板下陷；原地守在桥口也有危险。'},
      {id:'old-fire',title:'棚火第二叶',text:'“火有守，客可息……朝闻泉声，仍循旧路。”前文留下了一处可返回的照料点。',from:'hearth'},
      {id:'mist',title:'雾的浓淡',text:'风起时雾会散开，能望见对岸的小路；风停之后，桥的另一端又隐入雾中。'},
      {id:'peak',title:'经堂的峭顶字例',text:'页边抄着“旧火在来路，峭顶在远处”，旁边附有峭顶的馆藏字例。',from:'script'},
    ],proof:['rope','old-fire'],
    resolution:'“留步”不是原地僵住，而是暂停危险的行动。前文的旧火给出了等待的去处；理解要落实为一起退回。',
    handoff:'观察桥板、扶绳并向同行者说明决定，随后退回前坪。经棚火进夜营，将最后一叶与旧抄并读。',
    hints:['把“留步”和“候于何处”分开读。前一叶出现过的地名，未必就是此处的答案。','检查原地等候本身是否安全，再回查曾实际歇过脚的地方。页边地名相近，来路经历未必相同。'],words:['danger','walk','wait'],
    culture:'真实经籍的理解依赖具体文本及其传承语境；本题用跨页线索模拟核对前文的过程。',source:'loc',
  },
  {
    id:'palimpsest',scene:'dba.scene.night',place:'夜营',spot:'night-read',title:'被抹去的主语',subtitle:'第六叶 · 区分证据与指控',
    passage:['旧层：饥者有食，失路者有候；留其约，不夺其归。','新层：彼自弃约，余无所负。','两层文字之间，有一道与你腕纹相似的“断”形。'],
    question:'把前五叶和涂改痕迹放在一起，目前能支持哪一个结论？',
    choices:[
      {id:'confess',text:'墨层与腕纹可合证改写者是你；至于为何改写，仍应保留判断。',objection:'墨层只能补足先后，不能补足身份；腕纹相似依旧缺少执笔者的直接关联。'},
      {id:'altered',text:'新层改写了责任的归属；墨层与前文可互证，执笔者和动机仍须另证。',objection:''},
      {id:'innocent',text:'新层也许只是旧约的补充；写得较晚，并不能说明原先的责任已经改变。',objection:'墨层先后确实不能独自证明意义变化，还要比较新旧文本如何对待同行者与失约责任。'},
      {id:'erase',text:'旧层在先，应恢复为唯一有效的约定；新层所记的事情不必再查。',objection:'先写不自动等于唯一有效。你能比较责任如何改变，仍需另查两次书写的处境。'},
    ],answer:'altered',
    evidence:[
      {id:'wrist',title:'相似的腕纹',text:'你腕上的扁结纹样与断形有相似的转折；同行者颈绳上也用了同样的编法。'},
      {id:'overpaint',title:'墨层先后',text:'新层笔画压在涂白之上，旧层笔画延伸到涂白下方；两者并非同时写成。'},
      {id:'reciprocity',title:'前坪与棚火的合抄',text:'前坪不记欠数，棚火由去者添柴、留者守候；两处都把照料留给后来者。',from:'table'},
      {id:'silence',title:'同行者的沉默',text:'它望了长卷片刻，将爪子压在颈绳上，没有发出声音。'},
    ],proof:['overpaint','reciprocity'],
    resolution:'你找回了被改写的关系，却还没有找到足以定罪的证据。“留”贯穿这段路：保全水源、接续照料、保留同行者的位置。断语者的身份，仍要带往下一座岛追问。',
    handoff:'长卷的旧层已记入案卷。回雾岸，带着尚未作出的判断走向下一座岛。',
    hints:['先问“文本发生了什么变化”，再问“是谁做的”。两者需要不同证据。','墨层能证明先后；前几页能解释被改掉的责任关系。腕纹与沉默都不足以证明动机。'],words:['hunger','promise','trust','betray','lie','miss','forgive'],
    culture:'纳西东巴古籍文献于 2003 年列入世界记忆名录；此处的路约、涂改案与断语者均为游戏虚构。',source:'unesco',
  },
];
export function folioForScene(scene:string){return READING_FOLIOS.find(f=>f.scene===scene)??READING_FOLIOS[0];}
