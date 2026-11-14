# Playable world states — v0.1.3

Generated with the image-generation tool on 2026-11-14 using the project's existing painted backgrounds as references. These are project-generated illustrations, not downloaded photographs or third-party sprite packs.

| File | Reference | Purpose |
| --- | --- | --- |
| `shore-carried.webp` | `../painted/shore-scene.webp` | Remove only the wooden ladle from the spring; preserve basin, stream, lighting and composition. |
| `yard-shared.webp` | `../painted/yard-scene.webp` | Empty the original food basket; place two small fish portions in the existing companion bowl. |
| `food-table.webp` | `../painted/yard-scene.webp` | A close view of two empty ceramic bowls on a wooden serving board in the same courtyard and light. |
| `food-portion.webp` | Generated food table | One boneless cooked-fish portion on a small leaf, with genuine alpha transparency and matching perspective. |

The two state plates remain registered to the original full landscape. `WorldStateLayer` exposes only measured local regions, with a feathered edge; it does not render an additional full background or restore the old layered props. The original plate supplies all unchanged scenery. Partial progress and completed beats determine which regions appear.

The food-table interface renders four persistent, individually positioned food portions. Clicking a bowl transfers an existing portion; it never creates another item. The same core state feeds the world layer and saved progress. Text and controls are HTML, not generated into the artwork.

Generation originals are retained in the workspace:

- Shore: `exec-18c49cfd-089d-4e24-9d1e-3ef7e37c2625.png`
- Yard: `exec-62433ecd-27a1-4c1e-b1e3-eb8356845a71.png`
- Table: `exec-3e6a3515-7e60-4956-b009-78ebff03da0e.png`
- Portion: `exec-43e6d173-3bde-437a-a371-ca4f73a58003.png`

Production files were encoded with FFmpeg/libwebp (quality 86–88; portion reduced to 768 px width). No color keying or background-removal filter was used. Character animation sources and measurements are documented with the traveler and companion assets separately.


## v0.1.6 桥边观察

新增 `bridge-inspection.webp`，用于雾径的桥板、扶绳观察近景。基于现有雾径绘景生成，保持原场景布局；制作原图、说明、编码参数和哈希见 `docs/assets/bridge/README.md`。
