"""Encode lightweight, complete compositions. Originals remain the detail tier.

Requires Pillow; run from the repository root. No crop or generated retouching.
"""
from pathlib import Path
from PIL import Image

source = Path('src/assets/art/painted')
target = Path('src/assets/art/prologue-light')
target.mkdir(exist_ok=True)
for path in sorted(source.glob('prologue-*.webp')):
    picture = Image.open(path)
    picture.thumbnail((768, 768), Image.Resampling.LANCZOS)
    output = target / path.name.replace('.webp', '-preview.webp')
    picture.save(output, 'WEBP', quality=72, method=6)
    print(f'{output.name}: {picture.size}, {output.stat().st_size} bytes')
