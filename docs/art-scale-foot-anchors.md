# Odyssey art scale & foot anchors (P1 + nanaicha ground)

> **No-ambiguity (same-day clarity):** Engine pivot = `engine_pivot_recommended` in `art-scale-contract.json` → **bottom-center of opaque alpha bounds**. Shared `foot_pad_below_opaque_max_px` = **24**. Traveler soles may have 16–24px clear below; props prefer empty space **above** but may keep ≤24px below base for AA. Interact success overlays: `*.interact.png` for driftwood / sleep-mat / grain-bags — eng swaps or crossfades briefly; **use base prop pivot** (see `interact_success_overlays` in the contract).

**Contract:** `/workspace/odyssey-art/art-scale-contract.json`  
**Traveler:** 1.75 m · sprite 864×1152 · body ≈ 92% H · ≈ **606 px/m** on traveler sheet.

## Engine pivot (required)

For every hotspot prop PNG, pivot = **bottom-center of opaque alpha bounds**, not canvas center.  
Art layout: subject **feet/base near bottom of canvas** (≤24px pad below per `foot_pad_below_opaque_max_px`; traveler soles often 16–24px); spare transparent space **above** on props. Interact overlays: see contract `interact_success_overlays`.

## Traveler anim frame list (开发 PR)

Base: `traveler-mythic/cloud-inspired/v3/anim/`

| Set | Files |
|-----|-------|
| walk-front ×4 | walk-front-01..04.png |
| walk-side ×4 | walk-side-01..04.png |
| walk-back ×4 | walk-back-01..04.png (**distinct cycle** — unlock all; do not lock only -01) |
| idle-front ×2 | idle-front-01..02.png |
| idle-side ×2 | idle-side-01..02.png |
| idle-back ×2 | idle-back-01..02.png (**real idle**, not walk-back stub) |
| reach-front ×2 | reach-front-01..02.png |
| reach-side ×1 | reach-side-01.png |

## Prop family foot notes

### Shore
- **gourd** (`art.shore.prop.gourd.png`): hand ladle on small stone; opaque foot = stone bottom; subject H ≈ 15–18% plate; pad above.
- **driftwood** (`art.shore.prop.driftwood.png`): log rests on long axis; foot = lowest bark contact; visual length 0.8–1.2 m; subject H ≈ 18–22%.
- **nanaicha** (`art.shore.prop.nanaicha.png`): sit ON fog-shore ground; foot = paws/haunches; subject H ≈ 55–70% (measured ~62%); **baked** soft elliptical contact shadow; pad 16px below. **§5.1 intent:** default by `shore-driftwood` / gaze → gourd or east door (water→…); **禁**漂潮线上方、贴屏边装饰、目光空打远山。
- **fg** (`art.shore.fg.png`): already bottom-weighted mist/grass. Playtest white vertical “fence” is **engine debug grid**, not this plate.

### Camp
- **fire** (`art.camp.prop.fire.png`): foot = outer stone ring bottom; circle ~1–1.5 m; subject H ≤ 28% (prefer ~22–26%).
- **sleep-mat** (`art.camp.prop.sleep-mat.png`): foot = mat near-edge / ground contact; low thickness; subject H ≈ 20–26%.
- **paper-bundles** (`art.camp.prop.paper-bundles.png`): foot = stack base; below traveler shoulder; ≈ 20–26%.
- **nanaicha** (`art.camp.prop.nanaicha.png`): lying/loaf **guard** at fire edge or sleep-mat side; foot = belly/haunches; subject H ≈ 48–55% (measured ~50%); baked contact shadow; pad 16px. **§5.1 intent:** pre-food → 东门要粮；pre-sleep → 铺侧；post-sleep → 火旁 guard。**禁**浮火塘上方、堵北门。
- **building** (`art.camp.building.png`): foot = post/step bottoms; eng must place foundation on ground plate Y.

### Yard
- **grain-bags** (`art.yard.prop.grain-bags.png`): foot = pedestal/stone bottom; bags knee–waist; subject H ≈ 22–28%; sit ON ground (no mid-air hang).
- **dried-fish** (`art.yard.prop.dried-fish.png`): foot = A-frame legs; rack ~1.2–1.5 m; subject H ≈ 40–50% (was ~78%).
- **more-less-boards** (`art.yard.prop.more-less-boards.png`): foot = board bottom edge / stand; grounded; ≈ 28–35%.
- **nanaicha** (`art.yard.prop.nanaicha.png`): sit BY grain-bags / give-side; foot = paws; subject H ≈ 55–70% (measured ~60%); baked contact shadow; pad 16px. **§5.1 intent:** 递出位旁 gaze bags；post-food → 西门回棚火；post-sleep → 东望雾径。**禁**浮石坪上方、堵西门、只盯旅人脸。
- **building** (`art.yard.building.png`): foot = stone foundation bottom; align platform with ground plate in eng.

### Prologue tide
- Still `art.pro.tide.jpg` (= `art.pro.tide-v4.jpg`; prior lock kept as `art.pro.tide-v3.jpg`): **one** oversized housecat 奈奈茶 (hood up, seal-point, flat rope knot); paws/haunches on wet sand + soft contact; **no** second small cloaked cat.

### 奈奈茶 trajectory sheets (2026-10-28 §5.1)

**Primary for 开发 waypoint machine:** `/workspace/odyssey-art/nanaicha/traj/` · canvas **864×1152** RGBA · pivot = opaque-bounds bottom-center · landings foot_pad ≈ **18px** · soft contact shadow baked on landings · leaps mid-frame (float OK).

| File | Scene / §5.1 | Pose / gaze | Stage |
|------|----------------|-------------|-------|
| `land-shore-driftwood.png` | shore S0 | crouch by driftwood → wood | pre-water |
| `land-shore-gourd.png` | shore S1 | half-step by gourd → gourd | **water** |
| `land-shore-east-gap.png` | shore S2 | stand east gap → camp smoke | post-water |
| `land-camp-sleep-mat.png` | camp C2 | crouch mat side → mat+fire | post-food → **sleep** |
| `land-camp-fireside.png` | camp C3 | loaf/guard by fire | post-**sleep** |
| `land-yard-give.png` | yard Y0 | sit give-side → bag/string | **food** |
| `leap-01.png` / `leap-02.png` | transition | mid-air arc (optional) | between beats |

Queue lock: **water → food → sleep → danger**. Float leap OK; each **landing** must make guide target readable. Scene props `art.*.prop.nanaicha.png` remain fallback aliases (see contract `nanaicha_trajectory.alias_scene_props`). Full table: `art-scale-contract.json` → `nanaicha_trajectory`.

### 奈奈茶 grounding (playtest 2026-10-28)
| Path | Pose | §5.1 meaning |
|------|------|----------------|
| `shore/art.shore.prop.nanaicha.png` | sit, gaze east/gourd | tide-line guide / 跟我走 |
| `camp/art.camp.prop.nanaicha.png` | loaf guard | fireside / sleep-mat companion |
| `yard/art.yard.prop.nanaicha.png` | sit by bags | grain-bags / give-side guide |
Pivot: **bottom-center opaque**; place on Band ground Y like other props — **do not canvas-center float**. Gaze queue: water→food→sleep→danger. See scene cards §5.1 + hotspot §7.4 / §7.5#7.



## 共光/共影（辅资产 · 2026-10-28）

> **主路径 = 工程**（世界根 ambient、脚底锚、合成后 grade）。美工包只辅：椭圆影 + 场景 ambient/shadowTint + 1×256 strip。详见 `research-visual-cohesion-2026-10-28.md`。**勿当「画完就一体」。**

- Pack: `/workspace/odyssey-art/cohesion/`（`shadows/` · `strips/` · `grades/` optional）
- Contract field: `art-scale-contract.json` → `cohesion.scenes.<id>.{ambient,shadowTint,strip}`
- Eng: tint runtime shadows with `shadowTint`; multiply world by `ambient`; grade **after** composite

## What eng still owns
1. Opaque-bounds pivot + worldScale retune per this contract.  
2. Scene prop Y so all co-ground with traveler feet.  
3. Unlock walk-back-02/03/04 + idle-back; no duplicate cat overlay on tide.  
4. **奈奈茶:** place `art.*.prop.nanaicha` with opaque foot on walkable Band; companion state machine §5.1 (身位锚点 + look 目标); baked PNG shadow OK, optional eng y-scaled shadow for traveler too.
5. **奈奈茶 traj:** wire `nanaicha/traj/` landing ids to §5.1 state machine; optional leap-01/02 between beats; opaque-foot pivot on landings.
6. **共光/共影:** shared shadow under traveler pivot + per-scene `grade.*.png` fullscreen; baked prop shadows already in PNGs — 开新 PR 合 main.


---

## Failfix addendum (2026-10-28 Asia/Shanghai) — cohesion FAIL pack

**Role:** auxiliary art only. Eng still owns world ambient, opaque-foot pivot, post-composite grade, and debug overlays.

### White vertical lines (雾岸竖白线)
- **Source: eng** debug/walk grid — lower-third thin verticals, median spacing **~60px** (shot `pr10-pages/02-shore-s1-scale-lines.png`).
- Shore/camp/yard `fg/ground/building/sky` plates: **0** hard white vertical seam peaks.
- **Art action: none.** Eng must disable the grid overlay.

### Props rebaked (stronger soft contact shadow, foot_pad=16)
| Path | notes |
|------|-------|
| `camp/art.camp.prop.fire.png` | 火塘 ≤28%H; soft ellipse under stones |
| `shore/art.shore.prop.gourd.png` | 碗/瓢 15–18%H |
| `yard/art.yard.prop.dried-fish.png` | 鱼架 40–50%H |
| `yard/art.yard.prop.grain-bags.png` + `.interact.png` | 粮袋 22–28%H; interact same pivot |

Do **not** stack a hard eng drop-shadow on these; optional soft y-scaled shared ellipse OK.

### C2 / C3 dedicated frames (NOT curtain)
| Beat | Wire this | Readable |
|------|-----------|----------|
| **C2 铺边** | `nanaicha/traj/land-camp-sleep-mat.png` | 该睡了 — crouch/sit at mat edge |
| **C3 火旁蜷** | `nanaicha/traj/land-camp-fireside.png` | 守夜 — loaf/curl, half-open guard eyes |
| Fallback | `camp/art.camp.prop.nanaicha.png` | = C3 loaf, 1280×720, strong ground contact |

**CRITICAL:** never hang `art.camp.prop.north-curtain.png` as the companion sprite (playtest `40-c2-curtain.png`).

### Leap — no horizontal squash
- `nanaicha/traj/leap-01.png` / `leap-02.png` regenerated.
- Opaque body aspect target **~0.7–1.1**; mid-air float OK; **do not** apply horizontal stretch in engine tweens.

### PR
开**新 PR** 合 main（#10 已合）。合同 version `1.3-failfix`。详见 `_failfix-report.json`。
