"""核对官方 TimeBar 字节码、图集记录及本地原始图片；不执行客户端。"""
import hashlib
import io
import json
from pathlib import Path
import plistlib
import sys
import zipfile
import importlib.util
import re
import struct
import zlib
import texture2ddecoder
from PIL import Image

# 复用含连字符脚本的解析器。
spec = importlib.util.spec_from_file_location('dialog_source', Path(__file__).with_name('verify-yjcm-dialog-layout-source.py'))
parser = importlib.util.module_from_spec(spec)
spec.loader.exec_module(parser)
Chunk, TOOLS, ROOT = parser.Chunk, parser.TOOLS, parser.ROOT
sys.path.insert(0, str(TOOLS / 'vendor'))
import xxtea

apk_path = Path(sys.argv[1])
sha = lambda b: hashlib.sha256(b).hexdigest()
assert sha(apk_path.read_bytes()) == '974381c26f5bdc45daa6796f31cf384840e8d95e2eff3039990180f22f36a895'
def decode(data):
    if data[:4] == b'CCZ!': data = zlib.decompress(data[16:])
    version, _, fmt, _, _, height, width, _, _, _, _, meta = struct.unpack_from('<IIQ9I', data)
    assert version == 0x03525650 and fmt == 6
    return Image.frombytes('RGBA', (width, height), texture2ddecoder.decode_etc1(data[52+meta:], width, height), 'raw', 'BGRA')

asset_evidence = []
with zipfile.ZipFile(apk_path) as apk:
    packed = apk.read('assets/res/lib/game.zip')
    decoded = xxtea.decrypt(packed[15:], b'sgsYpad7Lo0khJf'.ljust(16, b'\0'), padding=False)
    with zipfile.ZipFile(io.BytesIO(decoded)) as inner:
        members = ['app.ui.TimeBar', 'app.ui.TimeBarXf', 'app.view.game.GameTimeBar']
        records = []
        for name in members:
            data = inner.read(name)
            chunk = Chunk(data); chunk.function()
            assert chunk.position == len(data)
            records.append(dict(member=name, sha256=sha(data), prototypes=chunk.rows))
        # 只搜索携带月光条素材名的模块，保留引用位置，不执行字节码。
        references = []
        for name in inner.namelist():
            if name not in ['app.view.game.GameSelfSeatUi','app.view.game.dlg.SkillNewStyleBaseWindow']: continue
            data = inner.read(name)
            if b'moonTimeBar' in data or b'newTimeBar' in data or b'new_timebar_bg_scale9' in data:
                chunk = Chunk(data); chunk.function()
                references.append(dict(member=name, sha256=sha(data), prototypes=[r for r in chunk.rows if any(isinstance(c, str) and any(k in c for k in ['moonTimeBar', 'newTimeBar', 'new_timebar_bg_scale9']) for c in r['constants'])]))
    frames = []
    for name in apk.namelist():
        if name.startswith('assets/res/') and name.endswith('.plist'):
            data = apk.read(name)
            if b'newTimeBar' not in data and b'new_timebar_bg_scale9' not in data: continue
            try: atlas = plistlib.loads(data)
            except Exception: continue
            for key, value in atlas.get('frames', {}).items():
                if 'newTimeBar' in key or key == 'new_timebar_bg_scale9.png':
                    frames.append(dict(atlas=name, atlas_sha256=sha(data), name=key, frame=value, metadata=atlas.get('metadata')))
    atlases = {}
    for record in frames:
        destination = ROOT / 'image/ui/progress/xinsha' / record['name']
        if record['name'] not in ['xf_newTimeBar_3.png','new_timebar_bg_scale9.png'] and not destination.exists(): continue
        texture = record['atlas'].replace('.plist', '.pvr.ccz')
        if texture not in atlases:
            color, alpha = apk.read(texture), apk.read(texture+'@alpha')
            atlas_image = decode(color); atlas_image.putalpha(decode(alpha).getchannel('R'))
            atlases[texture] = (atlas_image, sha(color), sha(alpha))
        atlas_image, color_sha, alpha_sha = atlases[texture]
        frame = record['frame']; x,y,w,h = map(int,re.findall(r'-?\d+',frame['frame']))
        crop = atlas_image.crop((x,y,x+(h if frame['rotated'] else w),y+(w if frame['rotated'] else h)))
        if frame['rotated']: crop = crop.transpose(Image.Transpose.ROTATE_90)
        sw,sh = map(int,re.findall(r'\d+',frame['sourceSize']))
        cx,cy,cw,ch = map(int,re.findall(r'\d+',frame['sourceColorRect']))
        result = Image.new('RGBA',(sw,sh)); result.paste(crop,(cx,cy))
        if destination.exists():
            local = Image.open(destination).convert('RGBA'); assert local.size == result.size and local.tobytes() == result.tobytes(), record['name']
        else: result.save(destination)
        asset_evidence.append(dict(name=record['name'], texture=texture, texture_sha256=color_sha, alpha_sha256=alpha_sha, rgba_matches_official_crop=True))
images = []
for path in (ROOT / 'image/ui/progress/xinsha').glob('*.png'):
    image = Image.open(path).convert('RGBA'); alpha = image.getchannel('A')
    images.append(dict(name=path.name, sha256=sha(path.read_bytes()), size=image.size,
                       alpha_bbox=alpha.getbbox(), left_alpha=[alpha.getpixel((0, y)) for y in range(image.height)],
                       right_alpha=[alpha.getpixel((image.width-1, y)) for y in range(image.height)]))
report = dict(apk_sha256=sha(apk_path.read_bytes()), packed_sha256=sha(packed), decoded_sha256=sha(decoded),
              rea_evidence=['ev_05d5033df946a225de4c38cf5efc4639c70456d4f31e1909520997450f785874'],
              modules=records, moon_references=references, frames=frames, local_images=images, asset_evidence=asset_evidence,
              interpretation=dict(main_bar='GameSelfSeatUi.createChildren: xf_newTimeBar_3 (501x17), new_timebar_bg_scale9 with rect(15,0,2,20); rounded original alpha.',
                                  window_bar='SkillNewStyleBaseWindow.createChilden: xf_newTimeBar_1 (560x17), xf_newTimeBar_bg_1; square original artwork.',
                                  moon_bar='GameSelfSeatUi.createChildren: newTimeBar (520x26), newTimeBarBg (522x28); separate square artwork.',
                                  color='TimeBar.setPercent delegates to UILoadingBar; the original fill has a warmer left and gold right. Cropping the right increases the relative red component of the remainder. TimeBarXf (selection countdown) separately switches to red_1 at 20 percent; do not apply that threshold to every countdown.',
                                  local_adaptation='Existing scene width and countdown timing retained; window anchors convert to DOM visible gaps and moon height26. No original PNG pixels modified.'),
              limitation='Static bytecode and original PNG alpha inspection; no official client runtime capture.')
(ROOT / 'verification/yjcm-progress-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
print('MODULES', [r['member'] for r in records + references])
print('FRAMES', [(r['atlas'], r['name']) for r in frames])
print('IMAGES', [(r['name'], r['size'], r['alpha_bbox']) for r in images])
