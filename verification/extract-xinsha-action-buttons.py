"""从指定6.4.5 APK提取操作按钮，核对解码缓存并保留静态字节码证据。"""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import re
import runpy
import struct
import sys
import zipfile
import zlib
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
NAMES = {'game_btn_multi_select.png', 'game_btn_multi_cancel.png',
         'cmn_btn_yellow_180_54.png', 'cmn_btn_brown_180_54.png', 'cmn_btn_gray_180_54.png'}


def main():
    p = argparse.ArgumentParser()
    for name in ['apk', 'game-archive', 'packed-cache', 'lua-reader', 'dependency-path']:
        p.add_argument('--' + name, required=True)
    args = p.parse_args()
    sys.path.insert(0, args.dependency_path)
    import texture2ddecoder
    digest = lambda data: hashlib.sha256(data).hexdigest()
    client = json.loads((ROOT / 'verification/xinsha-end-turn-source.json').read_text('utf8'))['client']
    assert digest(Path(args.apk).read_bytes()) == client['apk_sha256']
    assert digest(Path(args.game_archive).read_bytes()) == client['decoded_sha256']
    Chunk = runpy.run_path(args.lua_reader)['Chunk']

    def decode(data):
        if data[:4] == b'CCZ!':
            data = zlib.decompress(data[16:])
        version, flags, fmt, space, channel, height, width, depth, surfaces, faces, mips, meta = struct.unpack_from('<IIQ9I', data)
        assert version == 0x03525650 and fmt == 6, (version, fmt)
        return Image.frombytes('RGBA', (width, height), texture2ddecoder.decode_etc1(data[52 + meta:], width, height), 'raw', 'BGRA')

    records, modules, pictures = [], [], []
    with zipfile.ZipFile(args.apk) as apk:
        assert apk.read(client['member']) == Path(args.packed_cache).read_bytes()
        for member in ['assets/res/new/tex/plist/cmn02.plist', 'assets/res/new/tex/plist/gameinfo.plist']:
            raw = apk.read(member)
            plist = plistlib.loads(raw)
            texture = member[:-6] + '.pvr.ccz'
            packed, alpha = apk.read(texture), apk.read(texture + '@alpha')
            atlas = decode(packed)
            atlas.putalpha(decode(alpha).getchannel('R'))
            for name in sorted(NAMES.intersection(plist['frames'])):
                frame = plist['frames'][name]
                x, y, w, h = map(int, re.findall(r'-?\d+', frame['frame']))
                rotated = frame['rotated']
                sw, sh = (h, w) if rotated else (w, h)
                image = atlas.crop((x, y, x + sw, y + sh))
                if rotated:
                    image = image.transpose(Image.Transpose.ROTATE_90)
                size = tuple(map(int, re.findall(r'-?\d+', frame['sourceSize'])))
                ox, oy = map(int, re.findall(r'-?\d+', frame['offset']))
                canvas = Image.new('RGBA', size)
                canvas.paste(image, ((size[0] - image.width) // 2 + ox, (size[1] - image.height) // 2 - oy))
                target = ROOT / 'ui/assets/lbtn/yijiang' / name
                canvas.save(target)
                records.append(dict(frame=name, plist=member, plist_sha256=digest(raw), texture_sha256=digest(packed), alpha_sha256=digest(alpha), metadata=frame, size=size, destination=target.relative_to(ROOT).as_posix(), sha256=digest(target.read_bytes())))
                pictures.append((name, canvas))
    assert {r['frame'] for r in records} == NAMES
    selected = {
        'app.view.game.GameButtonBar': ['0.10', '0.13', '0.17'],
        'app.manager.game.WindowManager': ['0.57'],
        'app.view.game.dlg.SpellMultiSelectorBtnBar': ['0.4', '0.5'],
        'app.view.game.dlg.windowSnitch': ['0.2', '0.3', '0.5', '0.6', '0.7', '0.8'],
        'app.ui.button.init': ['0', '0.0'],
        'app.ui.button.UICmnButton': ['0.0', '0.1', '0.2'],
        'framework_extend.ui.buttons.SimpleButton': ['0.1'],
        'app.view.game.GameSelfSeatUi': ['0.50', '0.54', '0.85', '0.107'],
    }
    with zipfile.ZipFile(args.game_archive) as game:
        for member, ids in selected.items():
            raw = game.read(member)
            chunk = Chunk(raw)
            chunk.function()
            assert chunk.p == len(raw)
            modules.append(dict(member=member, sha256=digest(raw), prototypes=[r for r in chunk.rows if r['id'] in ids]))
    report = dict(client=client, rea_evidence=['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'ev_8a72e32c34675ee63afb8842348a359d1e11de76b120394a47bae68bd545c346'],
                  conversion='ETC1 RGB + alpha R; undo atlas rotation and restore original sourceSize/offset; no resize.', resources=records, modules=modules,
                  scope='Static modified-opcode Lua5.1 instructions from shipped APK. Not original Lua source or official runtime observation.')
    report_path = ROOT / 'verification/xinsha-action-buttons-source.json'
    existing = json.loads(report_path.read_text('utf8')) if report_path.exists() else {}
    report_path.write_text(json.dumps({**existing, **report}, ensure_ascii=False, indent=2), 'utf8')
    sheet = Image.new('RGB', (600, 110 * len(pictures)), '#393430')
    draw = ImageDraw.Draw(sheet)
    for i, (name, image) in enumerate(pictures):
        sheet.paste(image, (20, i * 110 + 5), image)
        draw.text((230, i * 110 + 25), name, fill='white')
    sheet.save(ROOT / 'verification/xinsha-action-buttons-assets.png')
    print('XINSHA_ACTION_BUTTON_SOURCE_OK', len(records), 'frames;', len(modules), 'modules; APK/cache hashes verified')


if __name__ == '__main__':
    main()
