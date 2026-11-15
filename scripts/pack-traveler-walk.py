"""Pack generated walk sheets without rescaling or changing alpha.

Each source is four columns x two rows. Runtime has eight columns x three
directions, so one decode supplies every turn. Pillow is required.
"""
from pathlib import Path
from PIL import Image, ImageChops, ImageStat

root = Path(__file__).resolve().parents[1]
packed = Image.new('RGBA', (3072, 1536))
back_passing = Image.open(root / 'docs/assets/traveler-walk8/back-passing-source.png').convert('RGBA')
assert back_passing.size == (1536, 1024)
for row, direction in enumerate(['front', 'side', 'back']):
    source = Image.open(root / f'docs/assets/traveler-walk8/{direction}-source.png').convert('RGBA')
    assert source.size == (1536, 1024)
    for frame in range(8):
        sheet = back_passing if direction == 'back' and frame >= 6 else source
        x, y = frame % 4 * 384, frame // 4 * 512
        packed.paste(sheet.crop((x, y, x + 384, y + 512)), (frame * 384, row * 512))
target = root / 'src/assets/traveler/stride-eight-atlas.webp'
packed.save(target, 'WEBP', quality=92, exact=True, method=6)
decoded = Image.open(target).convert('RGBA')
assert decoded.getchannel('A').tobytes() == packed.getchannel('A').tobytes()
opaque = packed.getchannel('A').point(lambda value: 255 if value > 240 else 0)
error = ImageStat.Stat(ImageChops.difference(decoded.convert('RGB'), packed.convert('RGB')), opaque).mean
assert max(error) < 2, error
print(f'{target.name}: {target.stat().st_size} bytes; alpha unchanged; mean opaque RGB error {error}')
