# 奥德赛（Odyssey）

本分支基于雾岸视觉快照（`snapshot/shore-visual-20261112`），修复范围为**序章 + 东巴岛六个场景的显示与游玩**。教学义默认关闭，画面上不出现向导的名字。后续岛屿和对峙尚未开放。[项目排查、验证与部署说明](docs/playable-refactor-20261113.md)记录本次改动；剩余限制见[快照问题记录](docs/snapshot-20261112-known-issues.md)。

## 怎么打开

本地运行需要 Node.js 22 或更新版本：

```bash
npm ci
npm run dev
```

浏览器打开终端打印的本地地址。`vite.config.ts` 的 `base` 是 `./`，资源和字体都走相对路径，所以 `npm run dev` 以及构建后的 `npm run preview` 都不用改 base。

存档在 `localStorage`，键是 `odyssey.save.v1`。刷新后在标题选「继续」。

## 怎么玩到离岛

1. 新游戏，看完四步序章后「走上潮线」。用 WASD／方向键、地面点击或触屏摇杆走动；点击目的地会绕过石头与建筑、沿木桥行走，键盘与摇杆在障碍边缘受阻；走近后再次点击物件、点底部操作按钮，或按 E／F 交互。焦点在游戏画面时也可按 Enter／空格；焦点在菜单按钮上时由该按钮响应。
2. 在雾岸走近漂木、裂符残片和木牌。进入木牌壁画后配对具体层，再依次解锁动作、关系和抽象层；28 个词都可学习，最右复用带可记熟。
3. 返回雾岸，走近水瓢，选择已学的「水」。沿场景边缘出入口可往返棚火、经堂前坪、木经堂、雾径和夜营。前坪的「多／少」木牌可从台阶前交互。
4. 喝过水，且学会饥饿、承诺、危险后，回雾岸走近「往东」。看完离岛和三段无字幕回忆后，可在夜营或案卷重看回忆。海图的甲骨角仍未开放。

右下角「路线」列出当前场景的出口，选择后角色会走向出口并换场景。手机竖屏下也能找到画面外的出口；点击地面或操作方向键、摇杆可以改变行走方向。

开发服务器左下角有「调试」，`npm run build` 的正式包里没有。

## 核对

图片回归测试还需要 Python 3.12、Pillow 和 NumPy；建议在本地虚拟环境安装：

```bash
python3 -m venv .venv
. .venv/bin/activate
python -m pip install -r scripts/requirements-test.txt
npm test
npm run content:check
npm run build
```

CI 同样安装这些依赖，并在合并请求中检查测试和生产构建。图片比较使用仓库自带的原始素材，无需原开发机目录。

真实浏览器主线检查使用鼠标点击热点、键盘跨场景，并验证离岛后刷新存档：

```bash
npx playwright install chromium
npm run build
npm run preview -- --host 127.0.0.1
# 保持预览服务器运行，在另一终端执行：
npm run test:browser
# 手机路线、触屏交互、多指摇杆与键盘菜单检查：
npm run test:controls
# 行走四方向、冷加载、松手停止（首次需要 npx playwright install ffmpeg）
npm run test:movement
```

可用 `ODYSSEY_URL` 指定独立测试站、`CHROMIUM_PATH` 指定已安装的 Chromium。截图输出至被 Git 忽略的 `artifacts/browser-smoke/`、`artifacts/browser-controls/` 和 `artifacts/browser-movement/`；行走检查还会保存视频与位移采样。浏览器测试创建自己的无痕会话，不会改动日常浏览器的存档。

构建产物含 `version.json` 和 HTML 的 `odyssey-revision` 标记，可核对测试站的实际 Git 提交；`dirty: true` 表示从含未提交改动的工作区构建。

场景道具按实际透明边界布局。替换 `src/assets/art/slots/` 中的道具或建筑后，运行 `python scripts/measure_scene_art.py` 更新边界元数据，再核对游戏画面。

存储被浏览器禁用或容量不足时，游戏会提示本次进度未能保存，当前页面内仍可继续游玩；下一次操作会重试。关闭或刷新前请确认提示已消失。

## 向导画面

画面上不写向导的名字。立绘是披着旅行披风的暹罗色点家猫，组件在 [`src/ui/companion/CatMark.tsx`](src/ui/companion/CatMark.tsx)，图在 `src/assets/companion/nanaicha/`（`nanaicha-hero.png` 与 `nanaicha-silhouette.png` 是披风版主线，`kitten/` 是不披风的幼年回忆）。内部 id 是 `nanaicha`。披风钩子是 class `cloak` / `cloak-hood`（`data-cloak="worn"`，`data-hood="up"`，主线默认戴兜）。颈上扁结是 class `collar-knot`；案卷持有绳结纹身时 `data-knot` 为 `glow`，否则 `rest`。造型说明在 [`docs/characters/奈奈茶.md`](docs/characters/奈奈茶.md)，氛围和姿势参考在 `docs/assets/nanaicha/`。

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
| [docs/characters/奈奈茶.md](docs/characters/奈奈茶.md) | 向导造型定稿：暹罗色点家猫，颈结，无耳叶 |
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
