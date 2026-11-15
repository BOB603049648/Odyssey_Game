"""Measure transparent padding for runtime layout; never modify source art."""
import json
from pathlib import Path
from PIL import Image
ROOT = Path(__file__).resolve().parents[1]
selected = {}
for path in sorted((ROOT / 'src/assets/art/slots').glob('*')):
    if path.suffix not in {'.png', '.webp'} or ('.prop.' not in path.stem and '.building' not in path.stem):
        continue
    if path.stem not in selected or path.suffix == '.webp':
        selected[path.stem] = path
result = {}
for key, path in selected.items():
    im = Image.open(path).convert('RGBA')
    box = im.getchannel('A').point(lambda a: 255 if a >= 16 else 0).getbbox()
    if box is None:
        continue
    x, y, right, bottom = box
    result[key] = {'width': im.width, 'height': im.height, 'box': [max(0,x-2), max(0,y-2), min(im.width,right+2)-max(0,x-2), min(im.height,bottom+2)-max(0,y-2)]}
(ROOT / 'src/content/sceneArtBounds.json').write_text(json.dumps(result, indent=2)+'\n')
