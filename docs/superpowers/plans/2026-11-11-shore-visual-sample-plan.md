# 雾岸视觉样板实施计划（阶段一，不含业务实现）

> 下一阶段执行时使用 executing-plans / test-driven-development。无需用户再选框架；父代理先发布方案，再依现授权继续。禁止提交/部署。所有实现仅在本隔离目录。

## 任务 0 已完成：安全基线
- audit/baseline-source-manifest.json：源文件、mtime_ns、SHA256、分支、HEAD、未提交状态。
- audit/baseline-source/：src/content/public 和根构建配置冻结副本；audit/baseline-dist/：独立 baseline build。
- npm test = 39 文件 190 通过；npm run build = exit 0；产物哈希匹配已核生产版本。
- 原目录/副本业务文件复制后、测试后重新校验一致。没有新增基线失败。

## 任务 1：最小 A/B profile 和可重复 fixture（不是业务改版）
文件：新增 src/dev/shoreVisualProfile.ts、shoreVisualProfile.test.ts、ShoreVisualSample.tsx；入口 src/main.tsx；必要时 WalkLayer/IslandScreen 仅加可选呈现/fixture 参数，不改变默认路径。是否需传参先看实际组件接口，不添加第二份 renderer。
- Red：测试本机构建显式 opt-in 才启用、无效参数/普通构建回 baseline；fixture 使用独立内存 state，不读写用户存档；同输入得到同一 camera/feet。
- Green：仅 profile 和固定场景壳；使用现有渲染组件，无新引擎、无新持久化字段。动态候选正常 App 仍可玩。
- 回归：`npm test -- src/dev/shoreVisualProfile.test.ts src/platform/storage.test.ts src/ui/shoreRead.test.tsx`（上述现有回归文件名已核；新增 profile test 待下一阶段创建），再 npm test、npm run build。浏览器 A/B 应完全一致，确认 harness 本身没改画面。

## 任务 2：干净地面资产（最大直接收益）
文件：仅从 audit/asset-evidence 复制既有图到 src/assets/art/slots/art.shore.ground.clean.jpg；src/content/assetUrls.ts 在 profile 下对 ground ID 做 URL 选择；新增 src/ui/shoreVisualSample.test.ts 或对应 asset test。若 ground URL 入口不是唯一 resolver，先追踪 loadGate/Plate 共用选择，不能另走未 decode 的 img.src 路径。
- Red：候选解析到 clean URL，baseline/非 shore/普通构建保持旧 URL；比对原图 SHA 与 clean SHA、尺寸；初始预载和后续 useAssetSrc 对同一选择一致；失败/恢复仍走现有 imageLoad。
- Green：只加命名资产+显式映射，旧 ground 和报告哈希契约不删除。不改其他猫/人物/物体，不运行 restore 图像脚本，不重新压缩风格。
- 回归：`npm test -- src/content/assetUrls.test.ts src/content/loadGate.test.ts src/ui/useAssetSrc.test.tsx src/ui/assetRecovery.test.tsx src/content/shoreCatFaceAlpha.test.ts`（现有文件名/扩展名均已核）；完整 npm test/build；父代理浏览器确认暗斑去掉、纹理连续、mask 柔边和猫接触影保留。
- 若旧图与当前包络色调不兼容：拒收此项，报告具体图，不以大色块/blur补洞。

## 任务 3：同地面投影与停止整件漂浮
文件：src/ui/Plate.tsx（只针对 shore 接地 projection），src/styles.css（shore class / data-profile 精准范围）；新增 src/ui/shoreVisualSample.test.ts；如需纯函数新增 src/core/shorePresentation.ts、shorePresentation.test.ts。
- Red：camera.x 取 -0.1/0/+0.1（实际 camera 单位依原函数换算），同一地面足点投影在三机位相对 ground 差值一致；当前 .72 导致差值变化，必须先观察此失败。断言 scale/pivot/WORLD_SCALE/feet 不变；其他场景投影相等于基线。
- Red：candidate shore lit prop 不再应用 prop-stir translateY；baseline/非 shore 原样；提示标记保持可交互、无全物体亮度额外改变。
- Green：shore 接地 building/prop parallax=1；仅取消 shore 整体上下运动并把提示隔离到非实体节点。沿用相同 slot 坐标，不改图尺寸、走带、脚点和阴影素材。
- 回归：shoreRead、shoreTreadClipping、cohesion、walk/touch 及全测试；源 manifest 比对保护 decode、猫图、mask 核心常量未变。浏览器固定机位移动、静止/点亮5秒及手机触摸检查。

## 任务 4：第一版交付关卡
- 先 npm test、npm run content:check、npm run build。候选样板构建 VITE_VISUAL_SAMPLE=1 npm run build；普通 npm run build 也必须通过，普通构建不得启用样板入口。
- 对 audit/baseline-source 做逐文件 hash diff，列新增/修改/删除，文本差异使用 diff -u；排除 node_modules/dist/audit，仅向父代理报告真正源码差异。不靠 git diff（本目录没有 .git）。
- 不启动/关闭任何既有服务器；获父代理安排后仅独立端口。命令见 design。由父代理派浏览器执行 desktop/mobile、正常玩法及离线恢复验收；提交截图原图路径、fixture JSON、A/B 观察，不用 jsdom 冒充视觉通过。
- 三项应对用户可见。最多一轮依据截图的定向小调；新问题超范围则报告并拆下一小步，不无边界试滤镜。

## 后续小步，仅在第一版实画暴露需要时实施
### 5：统一脚点深度（不承诺第一版已修）
文件：src/ui/Plate.tsx、WalkLayer.tsx、styles.css；新增 core/sceneDepth.ts + tests。
Red：脚点 [prop=.60,cat=.59,traveler=.61] 与相反排列、同 y 稳定排序；组件断言所有可排序项处于共同 depth root，无 near pass/actor stacking context 抢层；foreground 仍独立顶层。
Green：只扁平化 shore 接地对象、猫、人深度根，用同一归一化 ground y+稳定 tie-break 排序；透明过渡不能重新产生封闭祖先 stacking context。高度/alpha 不当作脚点。地图前景/远景/天空不参与动态排序。
回归：三物体前后关系实际截图与路径互穿，猫三姿态；其他岛 DOM/截图不变。若需要大面积重排封装，停下分支设计，不挤进第一版。

### 6：统一 scene grade（不为“更高级”盲加后处理）
先拍固定 A/B 并定位 ambient/grade-veil/scene-grade/sole 的合成贡献。Red：shore scene profile 参数唯一来源、foreground/actors/ground 的分级作用明确且不重复；不动独立 UI 可读性。Green：只收敛冗余级，不增加曝光/模糊堆栈。回归：同机位人/猫/ground 的亮度与色相协调，UI 不抢主视觉；无实画收益即不合入候选。

## 保留项和验收证据
第一版不改变渲染引擎，不生成新美术，不改锁定设置、猫图 alpha、WORLD_SCALE 1.46、band/foot、mask blur/opacity。任何确需变动必须单列原因/测试/截图，不能偷偷改。
自动测试通过 ≠ 用户满意。最终给父代理：源快照版本/差异清单、实际测试输出、生产构建标识、同位置桌面手机 A/B 图、已知未验项，再由父代理让用户看一版。
