"""核对牌底说明的原版字节码、底图像素和字体，不执行官方客户端。"""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import runpy
import struct
import sys
import zipfile
import zlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()

parser = argparse.ArgumentParser()
for name in ['apk', 'game-archive', 'packed-cache', 'lua-reader', 'dependency-path']:
    parser.add_argument('--' + name, required=True)
args = parser.parse_args()
sys.path.insert(0, args.dependency_path)
import texture2ddecoder

apk_sha = sha(Path(args.apk).read_bytes())
assert apk_sha == '12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202'
decoded_sha = sha(Path(args.game_archive).read_bytes())
assert decoded_sha == '23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'

def decode(data):
    if data[:4] == b'CCZ!':
        data = zlib.decompress(data[16:])
    version, flags, fmt, space, channel, height, width, depth, surfaces, faces, mips, meta = struct.unpack_from('<IIQ9I', data)
    assert version == 0x03525650 and fmt == 6
    return Image.frombytes('RGBA', (width, height), texture2ddecoder.decode_etc1(data[52 + meta:], width, height), 'raw', 'BGRA')

with zipfile.ZipFile(args.apk) as archive:
    packed = archive.read('assets/res/lib/game.zip')
    assert packed == Path(args.packed_cache).read_bytes()
    plist_member = 'assets/res/new/tex/plist/gameinfo.plist'
    plist_data = archive.read(plist_member)
    frame = plistlib.loads(plist_data)['frames']['card_text_bg.png']
    assert frame['frame'] == '{{1025,1331},{130,61}}' and not frame['rotated']
    texture = plist_member.replace('.plist', '.pvr.ccz')
    color, alpha = archive.read(texture), archive.read(texture + '@alpha')
    image = decode(color)
    image.putalpha(decode(alpha).getchannel('R'))
    crop = image.crop((1025, 1331, 1155, 1392))
    destination = 'image/ui/card/xinsha/card_text_bg.png'
    local = Image.open(ROOT / destination).convert('RGBA')
    assert crop.size == local.size and crop.tobytes() == local.tobytes()
    font = 'ui/assets/fonts/fzbw.ttf'
    assert archive.read('assets/res/fnt/fzbw.ttf') == (ROOT / font).read_bytes()

Chunk = runpy.run_path(args.lua_reader)['Chunk']
modules = []
with zipfile.ZipFile(args.game_archive) as archive:
    for name, ids in [
        ('app.manager.game.GameMoveManager', ['0.0.1', '0.0.3']),
        ('app.view.game.card.CardUiNew', ['0.42', '0.53']),
        ('app.module.game.seat.PlayerSeat', ['0.143']),
    ]:
        data = archive.read(name)
        chunk = Chunk(data)
        chunk.function()
        assert chunk.p == len(data)
        modules.append(dict(member=name, sha256=sha(data), prototypes=[row for row in chunk.rows if row['id'] in ids]))
    data = archive.read('app.cfg.CfgStyleLabel')
    chunk = Chunk(data)
    chunk.function()
    modules.append(dict(member='app.cfg.CfgStyleLabel', sha256=sha(data), prototype='0', pc_range=[6080, 6112], instructions=chunk.rows[0]['code'][6079:6112]))

report = dict(
    client=dict(version='6.4.5', apk_sha256=apk_sha, member='assets/res/lib/game.zip', packed_sha256=sha(packed), decoded_sha256=decoded_sha, cache_matches_apk=True),
    rea_evidence=['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'ev_9c5d0ada064eb4df0e69550e647832f45a7c91a83828969b6e7b0219840bc0e9'],
    modules=modules,
    asset=dict(plist=plist_member, plist_sha256=sha(plist_data), texture=texture, texture_sha256=sha(color), alpha_sha256=sha(alpha), frame=frame, destination=destination, sha256=sha((ROOT / destination).read_bytes()), rgba_matches_official_crop=True, font=font, font_sha256=sha((ROOT / font).read_bytes()), font_matches_apk=True),
    layout=dict(card=[126, 174], background=[130, 61], anchor='CENTER_BOTTOM', position=[63, 0], label_center=[63, 28.5], dimensions=[120, 60], font_size=22, color='#ffffff', outline='#3f3318', outline_width=1, wrapping='Native label wraps the complete sentence; no explicit name/action break'),
    observations=[
        'GameMoveManager0.0.1 PC250..490: general short name; AOE/self target uses 使用, other targets use 对 + names separated by 、, no targets uses 打出; equipment uses 装备. Transformed physical cards use the source skill name alone.',
        'PC84..224: 弃置, special 过河拆桥弃置 and 铁索重铸; PC45..58/65..82: 展示.',
        'CardUiNew0.53 PC59..77: all judge animations retain skill name + TXT_PANDING_CARD (判定牌), not 判定生效/失效 in card-bottom text.',
        'CfgStyleLabel PC6080..6112: fzbw22, white255, outline63/51/24 with pixel1, center/center.',
    ],
    adaptation='Only othersOff. Retain108x150 card and configured transforms. Map official sprite/label geometry proportionally; font22*108/126, CSS line-height1 with automatic wrapping. Native noname targets, conversion skills and discard ancestry supply equivalent data. Other styles retain existing HTML and animations.',
    limitations=['Shipped modified-opcode Lua bytecode and APK resources, not original authoring source.', 'Official client runtime, exact Cocos/browser font rasterization, Android device and real network multiplayer not verified.', 'Native server skill-specific rules without noname equivalents are not independently implemented.'],
)
(ROOT / 'verification/yjcm-used-info-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf8')
print('YJCM_USED_INFO_SOURCE_OK: APK/cache, background RGBA, font, label style and move-text branches verified')
