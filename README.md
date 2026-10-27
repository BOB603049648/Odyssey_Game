# 奥德赛（Odyssey）

可玩演示是**序章 + 皮拉罕岛**，讨论在 [PR #4](https://github.com/BOB603049648/Odyssey_Game/pull/4)。教学义默认关闭，画面上不出现向导的名字。三条结局的数据是假归乡、新渡语人、重启回声；对峙本身还不能玩。

## 怎么打开

还没有公开网址。仓库是私有的；当前自动化令牌调用 GitHub Pages 返回 403，本机也没有 Cloudflare、Netlify 或 Surge 的发布凭据。私有仓库即便开通 Pages，通常也只给有权限的人看。要一条别人能直接点开的链接，需要仓库所有者把仓库公开并打开 Pages，或提供上述任一托管的 token。

协作者在本机用一条命令（需要 Node.js 20 或更新版本）：

```bash
npm i && npm run dev
```

浏览器打开终端打印的本地地址。`vite.config.ts` 的 `base` 是 `./`，资源和字体都走相对路径，所以 `npm run dev` 以及构建后的 `npm run preview` 都不用改 base。

存档在 `localStorage`，键是 `odyssey.save.v1`。刷新后在标题选「继续」。

## 怎么玩到离岛

1. 新游戏。序章四步会叠化，然后「走上潮线」。热点平时只是光点，悬停才出字。
2. 点「鸣石」，案卷里是「签署手势」。壁画上把具体层六格配对记下，再用「水」点潮线上的水囊。
3. 顶上的刻度可以去棚火、河湾、岩壁、密林、夜营。词还没记下时，动作只会让画面摇一下。28 个教学词都能在壁画配对，再在最右的复用带记熟。
4. 饥饿、承诺、危险都记下之后，回到潮线点「往东」。先看离岛，再点「下一幕」看完三段没有字幕的回忆。之后可以从海图角、夜营或案卷里的「回忆」再看。

开发服务器左下角有「调试」，`npm run build` 的正式包里没有。

## 核对

```bash
npm test
npm run content:check
npm run build
```

## 向导画面

向导仍是剪影，正式形象还没接入。只改 [`src/ui/companion/CatMark.tsx`](src/ui/companion/CatMark.tsx)。请保留根元素的 class `cat`、属性 `data-look`，以及眼睛那组的 class `eyes`，现有的呼吸、视线和姿势动画才接得上。

手机壳只放了 `capacitor.config.ts`（`webDir` 为 `dist`）。还没有 iOS / Android 工程。

## 文档索引

| 文档 | 说明 |
|------|------|
| [docs/01-产品说明.md](docs/01-产品说明.md) | 产品定位、用户、MVP |
| [docs/02-巴别塔圣歌调研.md](docs/02-巴别塔圣歌调研.md) | 对标调研（五层虚构语） |
| [docs/03-故事纲要.md](docs/03-故事纲要.md) | 断语者反转、五岛弧、结局 |
| [docs/04-壁画视觉词典-皮拉罕.md](docs/04-壁画视觉词典-皮拉罕.md) | 第一岛壁画教学机制 |
| [docs/05-主线剧本与世界观.md](docs/05-主线剧本与世界观.md) | 群岛历史、向导、回忆线、15 枚证物、Boss 对峙与结局 |
| [docs/06-开发文档.md](docs/06-开发文档.md) | 技术选型、架构、数据模型、内容核对流程、测试与里程碑 |
| [docs/islands/01-皮拉罕岛.md](docs/islands/01-皮拉罕岛.md) | 岛 1 完整设计 |
| [docs/islands/02-塔阿岛.md](docs/islands/02-塔阿岛.md) | 岛 2 完整设计 |
| [docs/islands/03-阿姆哈拉岛.md](docs/islands/03-阿姆哈拉岛.md) | 岛 3 完整设计 |
| [docs/islands/04-因纽特岛.md](docs/islands/04-因纽特岛.md) | 岛 4 完整设计 |
| [docs/islands/05-巴斯克赛博岛.md](docs/islands/05-巴斯克赛博岛.md) | 岛 5 终局设计 |

## 五岛语言梯度

1. [皮拉罕语 Pirahã — 原始部落](docs/islands/01-皮拉罕岛.md)
2. [塔阿语 Taa / !Xóõ — 搭嘴音声景](docs/islands/02-塔阿岛.md)
3. [阿姆哈拉语 Amharic — Fidel 碑铭](docs/islands/03-阿姆哈拉岛.md)
4. [因纽特语 Inuktitut — 音节 + 多式综合](docs/islands/04-因纽特岛.md)
5. [巴斯克语 Basque — 赛博孤立语](docs/islands/05-巴斯克赛博岛.md)

## 来源

文档由协作画布导出为 Markdown，便于开发落地。
