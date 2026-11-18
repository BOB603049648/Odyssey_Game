from pathlib import Path
import hashlib
import base64
import json
import subprocess
import zipfile

root = Path(__file__).resolve().parent.parent
out = root / 'artifacts/three-v2'
out.mkdir(parents=True, exist_ok=True)
new = subprocess.check_output(['git', 'ls-files', '--others', '--exclude-standard'], cwd=root, text=True).splitlines()
with (out / 'source.patch').open('wb') as patch:
    subprocess.run(['git', 'diff', '--binary'], cwd=root, stdout=patch, check=True)
    for name in new:
        result = subprocess.run(['git', 'diff', '--no-index', '--binary', '/dev/null', name], cwd=root, stdout=patch)
        if result.returncode not in (0, 1):
            raise RuntimeError(name)
subprocess.run(['git', 'apply', '--check', '--reverse', str(out / 'source.patch')], cwd=root, check=True)

launcher = '''from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
import webbrowser

url = 'http://127.0.0.1:8793/?renderer=three'
handler = partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).resolve().parent))
with ThreadingHTTPServer(('127.0.0.1', 8793), handler) as server:
    print('Odyssey Three.js preview: ' + url, flush=True)
    print('Press Ctrl+C to stop.', flush=True)
    webbrowser.open(url)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
'''
readme = '''Odyssey · Three.js 2.5D 光影版

基于 fix/snapshot-portability-and-gameplay / e9499c9 / v0.1.10。
这是参考用户提供的 HTML 后完成的第二轮光影原型，功能与验证边界见 THREE-PREVIEW.md。

启动（已编译，无需安装 Node.js 或 npm 依赖）：
1. 解压整个目录；电脑需要 Python 3。
2. 在解压目录打开终端，运行：python3 start-preview.py
   Windows 可用：python start-preview.py
3. 浏览器打开 http://127.0.0.1:8793/?renderer=three
   不带 ?renderer=three 的地址可对照原渲染。建议先用桌面浏览器。
4. 终端按 Ctrl+C 关闭。不能直接双击 index.html 启动模块应用。

WASD / 方向键行走，也可以点击地面；靠近物品后点击交互。
点击“路线”前往相邻场景。右侧“光影增强 / 基础画面”按钮可即时对比。\n两种画面共用同一个浏览器存档。render-comparison.html 可直接打开查看截图对比。

source.patch 包含本次全部源码修改，可在对应基线 checkout 上使用 git apply。
本目录的 version.json 如实标记 dirty=true，属于原型包而非正式发布版。
'''

scenes = []
for key, title, detail in [
    ('shore', '雾岸', '晨光、薄雾与水面亮部，让远山和近岸拉开层次。'),
    ('hall', '经堂', '窗隙光与浮尘穿过室内，人物和地面接受同一组暖光。'),
    ('night', '夜营', '冷月色与暖火光相映，灯笼和火盆周围保留细节。'),
]:
    def image_url(path):
        return 'data:image/png;base64,' + base64.b64encode(path.read_bytes()).decode()
    scenes.append({'key': key, 'title': title, 'detail': detail,
                   'base': image_url(out / 'base' / (key + '.png')),
                   'enhanced': image_url(out / (key + '.png'))})
comparison = r'''<!doctype html>
<html lang="zh-CN"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Odyssey · 光影对比</title>
<style>
*{box-sizing:border-box}body{margin:0;background:#101b1d;color:#eee6d3;font-family:system-ui,"PingFang SC","Microsoft YaHei",sans-serif}
main{max-width:1280px;margin:auto;padding:36px 28px 24px}.eyebrow{font-size:11px;letter-spacing:.22em;color:#c2ad7e}
header{display:flex;justify-content:space-between;gap:28px;align-items:end;margin-bottom:26px}h1{font-family:Georgia,"Songti SC",serif;font-size:clamp(25px,4vw,40px);font-weight:400;margin:12px 0 0;letter-spacing:.1em}
.intro{font-size:13px;line-height:1.8;color:#a9b6b3;max-width:375px;margin:0}nav{display:flex;gap:8px;margin:0 0 16px}nav button{font:inherit;font-size:13px;border:1px solid #a7956d40;background:transparent;color:#b6c0b9;border-radius:3px;padding:9px 24px;cursor:pointer}
nav button[aria-pressed=true]{background:#dec78f;color:#162a2b;border-color:#dec78f}button:focus-visible,input:focus-visible{outline:2px solid #ffe2a1;outline-offset:5px}
.stage{position:relative;aspect-ratio:8/5;overflow:hidden;border:1px solid #a7956d60;border-radius:5px;background:#152326;--split:50%;touch-action:pan-y}
.stage img{position:absolute;inset:0;width:100%;height:100%;object-fit:contain;pointer-events:none}
#enhanced{clip-path:inset(0 0 0 var(--split))}.divider{position:absolute;left:var(--split);top:0;bottom:0;width:1px;background:#fff0c9;pointer-events:none;box-shadow:0 0 14px #0009}
.handle{position:absolute;left:50%;top:50%;transform:translate(-50%,-50%);width:42px;height:42px;display:grid;place-items:center;background:#18282be6;border:1px solid #e4cea0;border-radius:50%;font-size:18px;color:#f4e6c8}
.label{position:absolute;bottom:18px;padding:6px 12px;background:#122225dc;border:1px solid #d3bb8838;font-size:11px;letter-spacing:.12em;pointer-events:none}
.label.left{left:16px}.label.right{right:16px}
input{position:absolute;inset:0;width:100%;height:100%;margin:0;opacity:.001;cursor:ew-resize}
.caption{display:flex;align-items:baseline;gap:20px;margin:20px 0 0}h2{font-size:16px;font-weight:500;margin:0;white-space:nowrap;color:#e5cd99}.caption p{font-size:13px;line-height:1.8;color:#b0beb8;margin:0}
footer{border-top:1px solid #a7956d28;margin-top:25px;padding-top:14px;display:flex;justify-content:space-between;gap:20px;font-size:11px;line-height:1.8;color:#7f9592}
@media(max-width:680px){main{padding:24px 12px}header{display:block;margin-bottom:20px}.intro{margin-top:15px}nav button{padding:8px 22px}.stage{border-radius:2px}.label{bottom:8px;font-size:9px;padding:4px 7px}.label.left{left:8px}.label.right{right:8px}.handle{width:32px;height:32px}.caption{gap:12px}footer{display:block}footer span{display:block}}
</style>
<main><header><div><div class="eyebrow">ODYSSEY / LIGHTING STUDY 02</div><h1>绘画中的光与空气</h1></div>
<p class="intro">拖动分界线，比较同一场景的基础画面与光影增强。<br>画面来自当前游戏的真实渲染。</p></header>
<nav aria-label="选择对比场景"></nav>
<div class="stage"><img id="base" alt="基础画面"><img id="enhanced" alt="光影增强画面">
<div class="divider"><span class="handle">↔</span></div><span class="label left">基础画面</span><span class="label right">光影增强</span>
<input type="range" min="0" max="100" value="50" aria-label="对比分界" aria-valuetext="左右各一半"></div>
<div class="caption"><h2 id="title"></h2><p id="detail"></p></div>
<footer><span>保留绘画笔触 · 分场景布光 · 柔和亮部 · 空间氛围</span><span>此页为截图对比；动效请打开试玩包体验。当前为 2.5D 光影原型。</span></footer></main>
<script id="scenes" type="application/json">__SCENES__</script>
<script>
const scenes=JSON.parse(document.getElementById('scenes').textContent),nav=document.querySelector('nav'),stage=document.querySelector('.stage'),range=document.querySelector('input');
function show(key){const scene=scenes.find(s=>s.key===key);document.getElementById('base').src=scene.base;document.getElementById('enhanced').src=scene.enhanced;document.getElementById('title').textContent=scene.title;document.getElementById('detail').textContent=scene.detail;nav.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.key===key)));}
scenes.forEach(scene=>{const button=document.createElement('button');button.textContent=scene.title;button.dataset.key=scene.key;button.onclick=()=>show(scene.key);nav.appendChild(button);});
range.oninput=()=>{stage.style.setProperty('--split',range.value+'%');range.setAttribute('aria-valuetext','基础画面占 '+range.value+'%');};show(scenes[0].key);
</script></html>'''
comparison = comparison.replace('__SCENES__', json.dumps(scenes, ensure_ascii=False))
(out / 'render-comparison.html').write_text(comparison)

extra = {
    'start-preview.py': launcher.encode(),
    'README-试玩.txt': readme.encode(),
    'source.patch': (out / 'source.patch').read_bytes(),
    'THREE-PREVIEW.md': (root / 'THREE-PREVIEW.md').read_bytes(),
    'docs/design/three-2-5d-prototype.md': (root / 'docs/design/three-2-5d-prototype.md').read_bytes(),
}
extra['render-comparison.html'] = (out / 'render-comparison.html').read_bytes()
extra['docs/design/three-lighting-reference.md'] = (root / 'docs/design/three-lighting-reference.md').read_bytes()
for report in ['checks.json', 'package-check.json', 'verification.json']:
    if (out / report).exists():
        extra['verification/' + report] = (out / report).read_bytes()
for source, target in [
    ('src/assets/audio/README.md', 'credits/AUDIO.md'),
    ('src/assets/art/painted/README.md', 'credits/ART.md'),
    ('src/assets/traveler/actions-README.md', 'credits/ACTIONS.md'),
    ('src/assets/traveler/performance-README.md', 'credits/CHARACTERS.md'),
    ('src/assets/art/states/README.md', 'credits/STATES.md'),
]:
    extra[target] = (root / source).read_bytes()
files = {str(path.relative_to(root / 'dist')): path.read_bytes() for path in (root / 'dist').rglob('*') if path.is_file()}
files.update(extra)
files['SHA256SUMS'] = ''.join(f'{hashlib.sha256(data).hexdigest()}  {name}\n' for name, data in sorted(files.items())).encode()
archive = out / 'odyssey-three-lighting-v2.zip'
with zipfile.ZipFile(archive, 'w', compression=zipfile.ZIP_DEFLATED) as zipout:
    for name, data in files.items():
        zipout.writestr(name, data)
with zipfile.ZipFile(archive) as zipin:
    assert zipin.testzip() is None
    assert zipin.read('index.html') == (root / 'dist/index.html').read_bytes()
print(f'Preview package: {archive}; {len(files)} files; {archive.stat().st_size} bytes')
