# 聚落人物

`villagers.png` 为 2026-11-16 使用图像生成工具创建的四人透明 atlas，原样复制，未裁切、重绘或另行合成。

生成源：`/workspace/generated_images/exec-f3c20f68-f018-4480-9b0a-a47c42d822cf.png`。

画布 1086 × 1448，2 × 2 等大单元，单元 543 × 724。顺序为巡路匠、守火人、分食渔人、抄卷人。颜色与笔触参照现有聚落的朴素灰蓝、褐色、麻布和暖光方向。人物均为原创虚构角色，不是历史人物肖像或民族服饰复原。

`src/content/npcAtlas.ts` 定义裁样坐标和脚点；二维背景定位与 Three.js UV 均从同一文件取样，运行时添加接触影。透明图像检查通过，四格均有完整身体，生成图片保留原始 alpha。

第九轮运行时改用 `villagers.webp`，由原始 PNG 无损转码。画布、所有可见 RGBA 像素与完整 alpha 通道逐像素一致；PNG 保留为源文件。复现与校验：`python scripts/encode-loading-assets.py`。
