# 桥边观察近景

`bridge-inspection-source.png` 是 2026-11-14 使用 image_gen 生成的制作原图，参考本仓库 `src/assets/art/painted/path-scene.webp`。原文件也保留在生成工作区；仓库保留这一份用于追溯与后续制作。

构图要求：沿用秋日崖边栈道的手绘风格，左侧稳固石台与空木牌、中央桥板及下方支架裂口、右侧磨断扶绳，远处为雾谷；不画人物、文字、按钮或提示箭头。两处损坏在手机尺寸也能辨认。游戏中的刻符与观察按钮由界面覆盖，不烘焙在图片里。

运行时文件为 `src/assets/art/states/bridge-inspection.webp`，保持原尺寸与构图，仅作 WebP 编码：

```python
from PIL import Image
Image.open('docs/assets/bridge/bridge-inspection-source.png').save(
    'src/assets/art/states/bridge-inspection.webp', 'WEBP', quality=91, method=6)
```

这是观察桥边磨损的近景，不替换六场景底图，不改变既有走路边界、出口或物件坐标。

SHA-256：

- `docs/assets/bridge/bridge-inspection-source.png`：`ef7ad218433ec2360f436282d90c3c80c11170caa922737d98e75cacd2eced2d`
- `src/assets/art/states/bridge-inspection.webp`：`2e74e531227283fab295bf5e7d2da8d0d53f1cdd26f879ca98bd76f7ae032387`
