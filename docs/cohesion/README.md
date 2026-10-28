# Odyssey cohesion pack（共光 / 共影）· **辅资产**

> **编导纠偏（2026-10-28）：** 一体感**主路径是工程**（世界根 ambient、脚底锚、**合成后** grade），不是再堆贴图。  
> 本包只作**辅**：接地影椭圆 + 场景色温条 / ambient hex 进合同；**勿当「画完就一体」**。  
> 详见 `/workspace/odyssey-docs/research-visual-cohesion-2026-10-28.md` §0 / §3 / §6 P0。

**Updated:** 2026-10-28T01:36:09+08:00  
**Report:** `/workspace/odyssey-art/_cohesion-report.json`  
**Contract:** `art-scale-contract.json` → `1.3-cohesion` · `cohesion`（role=`auxiliary`）

## Role split

| 谁 | 做啥 |
|----|------|
| **开发（主）** | 单一 `worldToScreen(foot)`；世界根 ambient 乘算；合成后 vignette/grade；接触影系统（高度→α） |
| **美工（辅）** | 中性光出图；椭圆影 sprite；每景 ambient hex + shadowTint + 1×256 strip；可选全屏 grade PNG 作假一体 |

## 1) Shared shadows — `cohesion/shadows/`

| File | Size | Use |
|------|------|-----|
| `shadow.ellipse.s.png` | 256×128 | small props |
| `shadow.ellipse.m.png` | 384×160 | knee props |
| `shadow.ellipse.l.png` | 512×192 | traveler / nanaicha |
| `shadow.ellipse.xl.png` | 768×256 | wide props |
| `shadow.foundation.bar.png` | 1024×96 | building foundation |

纯黑软椭圆。Eng：脚底世界坐标下绘制，**tint = 场景 `shadowTint`**，离地高度淡出。已烘影 props 勿再叠硬影。

## 2) Scene color strips + ambient — `cohesion/strips/` + contract

每景 **1×256** fog/grade strip（Firewatch 式深度采样）+ ambient / shadowTint hex：

| Scene | ambient | shadowTint | strip |
|-------|---------|------------|-------|
| shore | `#B8CED4` | `#3A4E55` | `strips/strip.shore.png` |
| camp | `#D4B08A` | `#4A3528` | `strips/strip.camp.png` |
| yard | `#C9BCA8` | `#3F3A32` | `strips/strip.yard.png` |
| hall | `#9AA8AC` | `#2E383C` | `strips/strip.hall.png` |
| path | `#A8B4B8` | `#353E42` | `strips/strip.path.png` |
| night | `#4A5568` | `#1E2430` | `strips/strip.night.png` |

可选全屏假 grade（P0 DOM）：`grades/grade.<scene>.png` 1280×720 — **优先**世界根乘算 ambient + 合成后一层 strip/vignette，全屏 grade 仅权宜。

## 3) Baked contact shadows（in-place，辅）

备份：`<scene>/raw/pre-cohesion/`。已烘：driftwood、dried-fish、camp/hall/path/night buildings、hall scroll/stamp、danger-board、night old-layer。部分做了下锚（foot_pad→≤16）。

## Eng one-liners（对齐调研）

1. **主**：世界根挂场景 `ambient` 乘算全部精灵；合成后再 grade/vignette。  
2. **辅影**：未烘影精灵用 `shadow.ellipse.*`，色用 `shadowTint`，贴 opaque 底中脚 Y。  
3. **辅条**：深度雾可采样 `strips/strip.<scene>.png`。  
4. 已烘影 props **勿**再叠硬影。  
5. 开**新 PR**合 main（#10 已合）。一体感不够优先改工程，美工只补合同字段（锚 / ambient / strip / 保留色）。


---

## PR11 ground addendum (2026-10-28T02:13:46+08:00)

编导复测 FAIL：道具悬空贴纸。美工辅包已就地加强 **baked contact shadows** + 雾感共光；**主路径仍是工程**。

### shadowTint（与合同 cohesion.scenes 一致）
| Scene | ambient | shadowTint | baked ellipse RGB |
|-------|---------|------------|-------------------|
| shore | `#B8CED4` | `#3A4E55` | 16,14,12 |
| camp  | `#D4B08A` | `#4A3528` | 18,12,8 |
| yard  | `#C9BCA8` | `#3F3A32` | 18,12,8 |

`cohesion/shadows/shadow.ellipse.{s,m,l,xl}.png` + `shadow.foundation.bar.png` 已刷新为 warm-dark 软椭圆（α峰~200–220）。Eng tint 运行时影用 `shadowTint`。

### Grade guidance（非全幅雾罩）
1. 世界根乘算场景 `ambient`。
2. 合成后一层 strip/vignette / `grades/grade.<scene>.png`。
3. **勿**对精灵做 uniform fog α 乘算（会变半透抠图）。
4. 已烘影 props：ground < baked-shadow-in-png < subject；勿叠硬影。


---

## PR12 sticker note (2026-10-28T04:24:57+08:00 Asia/Shanghai)

Fog-match（降对比/饱和、2–3px 柔边、高光压、暖/冷 fringe）**已烘进** camp/yard/shore 优先道具与门帘。Eng 仍须：
1. 世界根 ambient + 合成后 grade（主路径）；
2. **勿**对精灵做 uniform fog α 乘算（会变半透抠图贴纸）；
3. 已烘接触影 props 勿叠硬影；落位台面/地面 Band（粮袋/筐禁贴墙立面）。

合同 `1.3-pr12-sticker` · 报告 `_pr12-sticker-report.json` · zip `art-pr12-sticker-pack.zip`。

---

## PR14 plate note

合同 `1.3-pr14-plate`。美工辅包去掉旅人浅色脚补丁、猫描边/平底、鱼架与 act-* 矩形底板；接触影贴在不透明靴底上。工程用精灵自身 alpha 做场景光 wrap（`color` + `soft-light`），接触椭圆中心落在靴底。勿对精灵 uniform fog α 乘算，勿在已烘影道具上再叠硬影。报告 `docs/_pr14-plate-report.json`。

---

## PR15 rim note

合同 `1.3-pr15-rim`。雾岸旅人接触影用沙地暗褐，中心在靴底，不再用青白 shadow-tint。前坪门脸不是地面：人在门宽范围内脚锚落到台阶/石板。前坪猫落地帧用爪贴台阶的槽位图。雾岸猫、标石、门帘暖黄、北界 0.80 未改逻辑。报告 `docs/_pr15-rim-report.json`。

---

## PR16 wrap note

合同 `1.3-pr16-wrap`。旅人帧已烘沙地暗褐靴底 AO（rgb 28,22,16，pale pad 为 0）。雾岸色罩不再染靴底那一段，也不再叠第二层椭圆。前坪猫脚锚落在台阶线 y=0.92，棚火炉边猫落在廊板 y=0.86。粮袋、扁板、鱼架换上去底板的槽位图。雾岸猫、land-shore-*、east-gap、门帘暖奶油未覆盖。报告 `docs/_pr16-wrap-report.json`。

---

## PR17 ao note

合同 `1.3-pr17-ao`。旅人 21 帧去掉浅色脚垫，靴底只留一团暗褐接触影。雾岸不再叠青白椭圆，接触层改为贴靴的 multiply 暗褐。前坪猫锚在台阶槽 x=0.52、y=0.92，离开粮袋堆。棚火饿猫落在廊板 x=0.70、y=0.85，不在东门水边。粮袋与鱼架换上去石盘、去椭圆脚贴的槽位图。前坪入口脚钳回到 y≥0.92，雾岸标石顶面不可站。扁板、门帘、雾岸猫、land-shore-*、标石美术未覆盖。报告 `docs/_pr17-ao-report.json`。

---

## PR18 wrap note

合同 `1.3-pr18-wrap`。靴底暗褐 AO 已烘进帧（实心，不跟剪影），工程不再叠 multiply 椭圆，也不再叠亮色 fog fringe。三景旅人接触椭圆 `background: none`。前坪猫脚锚 x=0.56、y=0.92，阶槽里、离开左右粮袋。棚火饿猫仍在廊板 x=0.70、y=0.85。雾岸标石不透明体大约到 y=0.67，可走面南沿收到 y=0.68；热点坐标仍是 0.74/0.54，沙唇算走到。晾架从北雾线（y=0.76/0.78）落到前坪地面 y=0.9，与粮袋同一条脚线。北界 0.80、前坪 y≥0.92、门帘、扁板、粮袋、雾岸猫、land-shore-*、标石美术未改。报告 `docs/_pr18-wrap-report.json`。

---

## PR19 solid note

合同 `1.3-pr19-solid`。旅人帧加厚实心暗褐靴底（约 rgb 28,22,16，半透明中段抬高）。figure-grade 在旅人身上 80% 硬切，靴底带不再吃 color / soft-light。旅人 `foot-ellipse` 从 DOM 去掉。合成后的 soft-light 雾会把靴底抬成冷色，所以同一帧只把靴底带再盖在雾层之上。前坪猫改到阶槽 x=0.47、y=0.92，离开左右粮袋。雾岸猫不再整只染色，只留很轻的 soft-light。晾架、标石可走面、前坪 y≥0.92、棚火猫落点、门帘、扁板、粮袋、land-shore、标石图未改。报告 `docs/_pr19-solid-report.json`。

---

## PR20 soft note

合同 `1.3-pr20-soft`。旅人 21 帧的靴底接触改成暗褐（约 rgb 28,22,16），清掉近黑实心。雾上不再盖硬椭圆，也不再用 91% 硬切；只把靴底带以软遮罩叠回雾上，避免雾把褐底抬成冷灰。旅人和向导的 `foot-ellipse` 都从 DOM 去掉。脚锚改到不透明底（1151/1152）。前坪 `land-yard-give` 单独用爪底锚，落点仍是阶槽 x=0.47、y=0.92；雾岸、棚火落点不动。门帘、标石、晾架、扁板、粮袋、棚火猫、雾岸猫、land-shore 未改。报告 `docs/_pr20-soft-report.json`。

---

## PR21 step note

合同 `1.3-pr21-step`。只换 `land-yard-give`：去掉精灵里的粮袋，爪在画布底心，软接触留在爪下。Y0 站到右阶槽最低一级（x=0.61，y=0.94，仍 ≥0.92），不再落在西侧石台上。靴底、`sole-soft`、`foot-ellipse`、门帘、标石、晾架、棚火爪未改。报告 `docs/_pr21-step-report.json`。
