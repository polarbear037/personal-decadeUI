"""提取指定 APK 内的 Online 互动资源；缺少的道具图标取官方资源端。"""
import concurrent.futures
import hashlib
import io
import json
from pathlib import Path
import re
import urllib.request
import zipfile
import zlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'verification/online-props-source'
SOURCE.mkdir(exist_ok=True)
APK = Path('G:/yoka.game_g_android_4.0.2.apk')
PREFIX = 'assets/cache/https.__web.sanguosha.com_220_sgsolApp/'
records = []

def extract(apk, resource, target):
    member = PREFIX + f'{zlib.crc32(resource.encode()):08x}'
    binary = apk.read(member)
    target = ROOT / target
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(binary)
    records.append(dict(resource=resource, member=member, file=target.relative_to(ROOT).as_posix(), sha256=hashlib.sha256(binary).hexdigest()))
    return binary

with zipfile.ZipFile(ROOT / '.codex-tmp/mumu-prompt-cache/list7.sgs.zip') as cached:
    config_bytes = cached.read('list7.sgs')
config = json.loads(config_bytes)['gn_paijuhudong']['root']
rows = [r for r in config['expressionItem'] if r.get('ID') in (2, 4, 101, 102)]
(SOURCE / 'configuration.json').write_text(json.dumps(dict(props=rows, common=config['common']), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
with zipfile.ZipFile(APK) as apk:
    sounds = set()
    for row in rows:
        name = row['aniname']
        for ext, saved in [('skel', 'skel'), ('atlas.txt', 'atlas'), ('png', 'png')]:
            extract(apk, f'/res/assets/animate/interactProp/{name}.{ext}', f'assets/animation/online-props/{name}.{saved}')
        sounds.update(pair.split(':')[1] for pair in row.get('Seffects', '').split(';') if pair)
    name = 'FX_MatchGame_daoju_shouji3'
    for ext, saved in [('skel', 'skel'), ('atlas.txt', 'atlas'), ('png', 'png')]:
        extract(apk, f'/res/assets/animate/interactProp/{name}.{ext}', f'assets/animation/online-props/{name}.{saved}')
    for sound in sorted(sounds):
        extract(apk, f'/res/local/voice/paijuhudong/{sound}.ogg', f'audio/online-props/{sound}.ogg')
    # 原图集裁切，不重绘。
    for atlas_name, wanted in [('game/gameBase', ['interact_bg']),
                               ('game/seat', ['interact_tips_texture', 'interact_arrow']),
                               ('Common/baseUI1', ['card_mask_1', 'shopitem_border_0', 'shopitem_select'])]:
        resource = f'/res/assets/{atlas_name}.atlas'
        member = PREFIX + f'{zlib.crc32(resource.encode()):08x}'
        atlas_bytes = apk.read(member)
        atlas = json.loads(atlas_bytes)
        png_resource = resource.replace('.atlas', '.png')
        png_member = PREFIX + f'{zlib.crc32(png_resource.encode()):08x}'
        image = Image.open(io.BytesIO(apk.read(png_member))).convert('RGBA')
        for name in wanted:
            info = atlas['frames'].get(name + '.png')
            if not info:
                print('FRAME_NOT_IN_ATLAS', atlas_name, name)
                continue
            frame = info['frame']
            crop = image.crop((frame['x'], frame['y'], frame['x'] + frame['w'], frame['y'] + frame['h']))
            size, offset = info.get('sourceSize', {}), info.get('spriteSourceSize', {})
            if size.get('w') and (size['w'], size['h']) != crop.size:
                padded = Image.new('RGBA', (size['w'], size['h']))
                padded.paste(crop, (offset.get('x', 0), offset.get('y', 0)))
                crop = padded
            target = ROOT / f'ui/assets/lbtn/OL_line/props/{name}.png'
            target.parent.mkdir(parents=True, exist_ok=True)
            crop.save(target)
            records.append(dict(resource=resource, member=member, atlasSha256=hashlib.sha256(atlas_bytes).hexdigest(),
                                pngMember=png_member, frame=info, file=target.relative_to(ROOT).as_posix(), sha256=hashlib.sha256(target.read_bytes()).hexdigest()))

def download_icon(pic):
    resource = f'/res/runtime/m/shop/GiveBuy/{pic}.png'
    url = 'https://web.sanguosha.com/220/sgsolApp' + resource
    with urllib.request.urlopen(url, timeout=25) as response:
        binary = response.read()
    if binary[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Unexpected non-PNG icon: ' + url)
    target = ROOT / f'ui/assets/lbtn/OL_line/props/{pic}.png'
    target.write_bytes(binary)
    return dict(resource=resource, url=url, file=target.relative_to(ROOT).as_posix(), sha256=hashlib.sha256(binary).hexdigest(), note='official resource endpoint; absent in APK cache')

with concurrent.futures.ThreadPoolExecutor(max_workers=5) as pool:
    records.extend(pool.map(download_icon, [12010201, 12010401, 12110101, 12110201, 12110000]))
(SOURCE / 'assets.json').write_text(json.dumps(dict(apk=str(APK), apkSha256=hashlib.file_digest(APK.open('rb'), 'sha256').hexdigest(),
    configSha256=hashlib.sha256(config_bytes).hexdigest(), configNote='existing official runtime list7; separate from APK identity', assets=records), ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('ONLINE_PROP_ASSETS_OK', len(records))
