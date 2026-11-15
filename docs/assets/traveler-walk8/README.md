# v0.1.9 行走原图

2026-11-15 使用 ImageGen，以旧主角图集为参照生成三个视角的 8 姿势图。布局为 1536×1024、4 列×2 行，每格 384×512；后续局部编辑纠正相反半周期的腿部姿势和透明背景。

- `front-source.png`：最终透明背景修订，生成文件 `exec-d1ea4990-51f4-49f3-8526-081de2ed442c.png`。
- `side-source.png`：生成文件 `exec-dabae3be-3a00-4d81-a6c0-fd92fa7e44df.png`。
- `back-source.png`：生成文件 `exec-cbc07f0b-f41d-48b9-bfa5-5f406c338e43.png`，采用第 1–6 格。
- `back-passing-source.png`：生成文件 `exec-b498ea2c-9640-45d4-b551-6325aad750aa.png`，采用修订的第 7–8 格；其余格不使用，避免带入其他修改。

原始生成文件保留于制作环境的 `/workspace/generated_images/`。本目录保存选用的原图供复现，不进入网页资源包。

`python scripts/pack-traveler-walk.py` 仅选择、排列完整源格和编码，不重绘或缩放单帧。运行文件 `src/assets/traveler/stride-eight-atlas.webp` 为 3072×1536、8 列×3 行，WebP quality 92。RGB 是有损编码；alpha 逐像素保持原样。显示裁剪统一为 372×496，脚底位置根据每格实际不透明行注册，避免按衣摆宽度改变人物尺寸。

配色使用 `TravelerPalette.tsx` 与待机衣服匹配；这不是已经烘焙滤镜的源图，不应再叠加同类离线调色。
