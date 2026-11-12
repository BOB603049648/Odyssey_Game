# 雾岸视觉样板：阶段一设计（待父代理发布方案后才实施）

## 目标与边界
不是重写游戏。第一版要可运行、可 A/B，优先消除无主暗斑、同地面物体相机滑移、整件道具连阴影漂浮三件具体问题。只针对雾岸；剧情、教学、存档格式、出口、世界设定不变。用户授权本地实现与测试，不授权 commit/push/merge/部署；既有禁云会话继续有效。本阶段只建立快照和文档，没有业务实现。

原目录 `/workspace/odyssey-image-load-fix` 只读。独立目录 `/workspace/odyssey-visual-sample-20261111`。编导已确认原目录无运行写入，同意独立副本和端口。没有 clone、git worktree、git init；没有复制原 .git、.env、部署归档/脚本、浏览器数据。独立 node_modules 实体副本（内部相对符号链接仍限于副本依赖），不向原依赖写缓存。

## 三条路径
1. **推荐：现有 DOM 定向修视觉**。保留 React/Zustand/Zod/Vite 与现有游戏循环，先做 3 个证据充分的小改；收益直达当前拼贴感，迁移成本最低。上限是复杂遮挡与大量动态精灵不宜继续堆 DOM 例外。
2. 独立 Phaser/Pixi 雾岸小样：统一 ground 坐标、相机、脚点排序更自然，可借 WorkAdventure 的 body/foot/depth 契约；但要重新接输入、交互命中、React 桥、加载与动画资产契约。不能只换 renderer 就期待旧图变成统一透视。放在 DOM 样板之后，以结果决定是否试，不现在引依赖。
3. Three.js/完整 3D（或 Godot Web）：用户 HTML 与 Bruno Simon 提供统一空间、材质和灯光管线的参照，但当前主要是烘焙 2D 素材；没有可直接替换的统一模型/法线/碰撞资产。成本和视觉风险最高，不属于这一版。Godot 旁路不动。

CrossCode/WorkAdventure/Bruno Simon/Dominion Minor 的共同启示是统一坐标/资产尺度/渲染责任，不是必须同引擎；这版只采用同平面同投影和接地契约。附件 FPS 的枪械、ADS、锁鼠标、整套后处理不移植。

## 基线与继承契约
捕获时间见 `audit/baseline-source-manifest.json`（2026-11-11 15:40:04 Asia/Shanghai）。262 个明确允许的应用/测试文件逐一 SHA256，复制前后源文件及副本一致。源 HEAD b57f27bb6676d51bcb22e7d72e7118d05e9f5d0b + 当前全部允许范围的未提交修复，不是 main 的干净检出。
- 实跑 npm test：39 文件、190 测试通过；npm run build（tsc --noEmit + vite build）通过。
- 输出 index-BKygATxT.js / index-Ba53vgZj.css，SHA256 与已核生产归档对应哈希一致，详见 audit/baseline-results.json。说明所复制基线构建可复现报告版本；本阶段没有重新访问生产站点。
- 不改 decode、共享 5/10/20/30 秒退避、online 唤醒与卸载清理；猫失败 Promise 不缓存；底图恢复移除 failed 遮罩；FramePicture lastReady。
- 三张猫轨迹修补 alpha 保留原文件；shore ground-fill 隐藏、北遮罩和 Plate/styles 南沿双高包络保柔影保留。
- WORLD_SCALE=1.46，走带、脚锚、角色/猫尺寸全部锁定。第一版不改 mask 的 opacity/blur/包络常量。
- 完整日志 audit/baseline-tests.txt、audit/baseline-build.txt。alpha 测试依赖只读外部旧图 `/workspace/playtest/cat-face-restore-20261110/rollback-originals`，非完全自包含；只导入 restore helper 的纯函数，未执行其写图 main。Python 禁止写 bytecode。

## 新的可用证据：干净底图已存在
静态查看四种本机历史 ground 后，`/workspace/odyssey-art/raw/pre-pr64-read/shore/art.shore.ground.jpg` 没有当前底图中几块独立椭圆暗斑，海岸纹理/构图属于同一系列。SHA256 16dd72e05c1c1661b2dcc27326dc0cd5a05007532f9889ebd08b0c1d2e0d4bbc。证据副本 `audit/asset-evidence/existing-clean-shore-ground.jpg`。
这不是生成新美术，也不是 CSS 恢复纹理。仍须实画检查与现有 props、南北遮罩的色调/接缝是否协调，不先承诺整套素材完美匹配。不回退其他旧素材，不直接覆盖旧 ground。若 A/B 不合适则拒收此项，不用大色块或模糊冒充修复。

## 推荐第一版实施范围
A. 单独引入现有 clean ground，保留原图作为 A。解析 URL 仍使用当前 decoded/load-recovery 机制，测试构建专用 profile 选择，不改错误重试算法。
B. 只把雾岸接地的 building/prop 平移视差改成与地面相同（parallax=1），远景和前景装饰仍可视差。宽高、pivot、foot、mask 不动。底图/脚点用相同 camera→screen 变换；目前 building .72 对 ground 1 是直接风险来源。
C. 雾岸 lit prop 取消整个 prop-body 的 -4px 上下浮动。保留互动可发现性，用不移动实体、不过曝贴图的独立提示标记；不动其他场景样式。先不改亮度/色彩规则，以免一次混淆因素。

以上三项已经产生可见变化，不以“增加测试”充当修画面。第一版不同时重做角色贴图、尺寸、调色栈和所有层级。

## 遮挡和调色怎么处理
- 已知 Plate near pass 固定层与 WalkLayer 猫/人相互换层不同轴，不能只把一个 z-index 变大宣称解决。第一版先用相同机位画清 overlap 失败矩阵；如出现实际穿帮，第二小步再把同平面 props/猫/人挂在同一 depth root，使用同一足点数值+稳定 tie-break。禁止在不同父 stacking context 内做伪统一排序。
- styles 的 ambient multiply、grade-veil、scene-grade、sole 上层共同作用；不是“完全没有统一调色”。第一版保留数值，只做 A/B 记录，避免把移除烘焙暗斑的收益与大范围滤镜调色混在一起。第二小步再选单一 scene profile，前提是有同机位颜色/主体层级证据。
- 如果排序重构超过 Plate/WalkLayer 单平面层级边界，停在三项视觉样板，不扩大到全岛 renderer 重写；向父代理报告后续拆分。

## A/B 和样板入口要求（尚未实现）
保留 audit/baseline-dist 作为只读 A，候选 dist 为 B。建议 localhost:8792/8793 两个独立 origin，不能复用已有游戏端口或浏览器存档。可启动 A：`npm run preview -- --host 0.0.0.0 --port 8792 --strictPort --outDir audit/baseline-dist`；B 构建后用 `npm run preview -- --host 0.0.0.0 --port 8793 --strictPort`。阶段一未启动服务器。
候选另加仅样板构建启用的 profile（VITE_VISUAL_SAMPLE=1，限定 localhost/127.0.0.1），`?shoreVisual=baseline|candidate`；未知值回退 baseline。普通构建/非本机 URL 不启用。不得把 profile 写入 SaveData/localStorage。
固定 fixture 如 `&fixture=shore-spawn|overlap-left|overlap-center|overlap-right|south|edge-left|edge-right&freeze=1`：使用 newGameState+确定的雾岸状态/局部内存 reducer，角色初始 (.42,.62)，cat 固定 S0/driftwood；前后遮挡 fixture 明确指定猫/人足点与目标 prop。相机用现有 clamp 数值固定，保存实际 camera/world/view 参数到截图旁 JSON；不得用修改走带避开问题。固定帧禁实体漂浮/呼吸与相机跟随，显示原尺寸贴图。另保留可操作、非冻结正常教学/出口的候选入口。fixture 不读写原站存档。
若使用新 fixture 组件，必须复用真实 Plate/WalkLayer/Traveler，而不是另写一个看起来更好的静态假画面。A/B 可先在同候选构建切 variant 验证，然后与冻结生产基线对照；不要把新的 fixture 截图冒充旧生产截图。

## 浏览器验收（父代理派浏览器，本代理不驱动 UI）
生产 build+preview，而不只是 Vite dev/jsdom。桌面 1920x1200 原图、手机 390x844；补 844x390 横屏。记录 DPR、viewport、实际游戏容器矩形，不能把 Read 预览尺寸当原图尺寸。
1. 相同 fixture 和相机 A/B：无主椭圆暗斑确实消失，同时地面纹理连续，没有色块、拉花或新的南沿缝；猫接触软影没有被一并删掉。
2. camera 左/中/右移动时，building/prop 的地面接触点与地面标记相对位移 ≤1 CSS px（同一 viewport，模型误差断言另见测试）。远景可动，接地体不能滑。
3. lit/unlit 切换及 5 秒观察：物体实体/baked shadow 不整件上下漂；交互提示仍看得见，点击/触摸命中和目标反馈不退步。
4. overlap 三位置，猫/人各在物体前/后检查，记录仍存在的穿帮，不将未改排序说成已修；第一版若触发关键路径遮挡即不验收为完整可玩版，推进下一小步。
5. 南沿、左外缘、右外缘都截图；猫至少三轨迹姿态，当前只有部分截图验证过，不报全通过。
6. 教学、一次正常交互、拾取、出口/返回正常；独立新 origin 保存并刷新可继续，原 origin 未触碰。
7. 一次离线→恢复/失败→重试：图能恢复、failed 遮罩消退；cat 不被永久失败缓存；清理卸载后无重复重试。自动测试只是底线。
不实测就不声称 FPS/移动性能改善。最终是否满意由用户看 A/B 决定。
