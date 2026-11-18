"""Re-encode runtime PNGs as lossless WebP; keep source art and frame geometry.

Requires ffmpeg (libwebp), Pillow and numpy. Pillow is used only to verify decoded
pixels. RGB under fully transparent pixels is not visible and may be normalized.
"""
from pathlib import Path
import json
import subprocess
import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCES = [
    'art/spatial/shore-clean.png', 'art/spatial/shore-props-alpha.png',
    'art/spatial/hall-clean.png', 'art/spatial/hall-props-alpha.png',
    'art/npc/villagers.png', 'traveler/action-atlas.png',
    'companion/nanaicha/nanaicha-hero.png',
]
report = []
for name in SOURCES:
    src = ROOT / 'src/assets' / name
    dst = src.with_suffix('.webp')
    subprocess.run(['ffmpeg', '-v', 'error', '-i', str(src), '-c:v', 'libwebp',
                    '-lossless', '1', '-compression_level', '6', '-pix_fmt', 'bgra', '-y', str(dst)], check=True)
    before = np.asarray(Image.open(src).convert('RGBA'))
    after = np.asarray(Image.open(dst).convert('RGBA'))
    assert before.shape == after.shape, name
    assert np.array_equal(before[:, :, 3], after[:, :, 3]), name + ': alpha'
    visible = before[:, :, 3] > 0
    assert np.array_equal(before[visible], after[visible]), name + ': visible RGBA'
    row = dict(source=name, output=name.replace('.png', '.webp'),
               before=src.stat().st_size, after=dst.stat().st_size,
               width=before.shape[1], height=before.shape[0], alphaExact=True, visibleRGBAExact=True)
    report.append(row)
    print(json.dumps(row), flush=True)
out = ROOT / 'artifacts/three-v9'
out.mkdir(parents=True, exist_ok=True)
(out / 'image-compression.json').write_text(json.dumps(report, indent=2) + '\n')
