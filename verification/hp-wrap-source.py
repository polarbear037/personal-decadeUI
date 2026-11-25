"""核对当前 APK 的座位血条配置，提取龙旗五阶原图，不改变既有素材。"""
import hashlib
import json
from pathlib import Path
import plistlib
import re
import struct
import sys
import zipfile
import zlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.codex-tmp/dialog-xinsha-deps'))
import texture2ddecoder

def sha(data):
    return hashlib.sha256(data).hexdigest()

def decode(data):
    if data[:4] == b'CCZ!':
        data = zlib.decompress(data[16:])
    header = struct.unpack_from('<IIQ9I', data)
    version, _, fmt, _, _, height, width, _, _, _, _, meta = header
    assert version == 0x03525650 and fmt == 6
    return Image.frombytes('RGBA', (width, height), texture2ddecoder.decode_etc1(data[52 + meta:], width, height), 'raw', 'BGRA')

apk = Path('D:/yoka_sgs.x_g_android_6.4.5.apk')
previous = json.loads((ROOT.parent / '烽火连天/research/seat-controls-evidence.json').read_text('utf-8'))
assert sha(apk.read_bytes()) == previous['apk_sha256']
report = {'apk': str(apk), 'apk_sha256': previous['apk_sha256'], 'rea_evidence': ['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'ev_587eee0cd61874d39939f356205cbe0c89e572f379ed157b8a88242b54d63070'], 'modules': [], 'frames': []}
with zipfile.ZipFile(apk) as archive:
    assert archive.read('assets/res/lib/game.zip') == (ROOT / '.codex-tmp/yjcm-buttons/game.packed').read_bytes()
    game_path = ROOT / '.codex-tmp/yjcm-buttons/game.zip'
    assert sha(game_path.read_bytes()) == previous['game_package_sha256']
    with zipfile.ZipFile(game_path) as game:
        for name in ['app.view.general.GeneralYjcmHpContainer', 'app.manager.general.GeneralUiResCfg']:
            record = next(m for m in previous['modules'] if m['module'] == name)
            assert sha(game.read(name)) == record['bytecode_sha256']
            source = ROOT.parent / f'烽火连天/research/seat-controls-source/{name}.lua'
            assert sha(source.read_bytes()) == record['source_sha256']
            report['modules'].append(record)
    member = 'assets/res/new/tex/plist/yjcm_general.plist'
    raw_plist = archive.read(member)
    frames = plistlib.loads(raw_plist)['frames']
    texture = member[:-6] + '.pvr.ccz'
    color, alpha = archive.read(texture), archive.read(texture + '@alpha')
    report['atlas'] = {'plist': member, 'plist_sha256': sha(raw_plist), 'texture_sha256': sha(color), 'alpha_sha256': sha(alpha)}
    atlas = decode(color)
    atlas.putalpha(decode(alpha).getchannel('R'))
    for name in ['dragon2/hp_grade_5.png', 'dragon3/hp_grade_5.png', 'dragon4/hp_grade_5.png']:
        frame = frames[name]
        x, y, w, h = map(int, re.findall(r'-?\d+', frame['frame']))
        rotated = frame.get('rotated', False)
        image = atlas.crop((x, y, x + (h if rotated else w), y + (w if rotated else h)))
        if rotated:
            image = image.transpose(Image.Transpose.ROTATE_90)
        assert image.size == (139, 178)
        target = ROOT / 'ui/assets/lbtn/yijiang' / name.replace('dragon3/', 'dragon2/').replace('/', '_')
        if name.startswith('dragon4/'):
            image.save(target)
        elif name.startswith('dragon2/'):
            with Image.open(target) as existing:
                assert image.tobytes() == existing.tobytes()
        report['frames'].append({'member': member, 'frame': name, 'metadata': frame, 'rgba_sha256': sha(image.tobytes()), 'target': str(target.relative_to(ROOT)), 'png_sha256': sha(target.read_bytes()), 'slice': [146, 0, 30, 0], 'width': 139, 'left': -97, 'bottom': -7})
    assert report['frames'][0]['rgba_sha256'] == report['frames'][1]['rgba_sha256']
report['layout'] = {
    'dragon2_dragon3_five': {'resource': 'dragon2/hp_grade_5.png (dragon3 is identical)', 'topEdge': 130, 'bottomEdge': 6},
    'dragon4_five': {'resource': 'dragon4/hp_grade_5.png', 'topEdge': 135, 'bottomEdge': 14},
    'formula': 'bgHeight=max(178,min(maxHp,5)*20+topEdge+bottomEdge); pip centers=(25,bottomEdge+10+20*i); bigHP bottom=bottomEdge+5',
    'scope': 'GeneralUiResCfg TypeCard; GeneralYjcmHpContainer shared by self/other seat. TypeDetailPic big_hp_grade_5 is not the seat resource.'
}
report['limitations'] = ['Static APK and recovered Lua verification; not an official client runtime capture.']
(ROOT / 'verification/hp-wrap-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), 'utf-8')
print(json.dumps({'verified': True, 'apk_sha256': report['apk_sha256'], 'layout': report['layout'], 'frames': [r['frame'] for r in report['frames']]}, ensure_ascii=False))
