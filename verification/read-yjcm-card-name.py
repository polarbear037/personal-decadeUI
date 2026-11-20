"""只读核对当前 APK 的牌名控件字节码，提取两种状态原图；不执行目标 Lua。"""
import hashlib
import io
import json
from pathlib import Path
import sys
import plistlib
import struct
import zlib
from PIL import Image
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT.parent / '抚琴益州/tools'
sys.path.insert(0, str(TOOLS / 'vendor'))
sys.path.insert(0, str(ROOT.parent / '烽火连天/tools'))
from lua51 import Chunk
import texture2ddecoder

digest = lambda data: hashlib.sha256(data).hexdigest()
def texture(data):
    if data.startswith(b'CCZ!'):
        data = zlib.decompress(data[16:])
    version, flags, fmt, space, channel, height, width, depth, surfaces, faces, mips, meta = struct.unpack_from('<IIQ9I', data)
    assert version == 0x03525650 and fmt == 6
    return Image.frombytes('RGBA', (width, height), texture2ddecoder.decode_etc1(data[52 + meta:], width, height), 'raw', 'BGRA')

with zipfile.ZipFile('D:/yoka_sgs.x_g_android_6.4.5.apk') as apk:
    packed = apk.read('assets/res/lib/game.zip')
    assert hashlib.sha256(packed).hexdigest() == 'df9af4ec01e45b7a2bca47b4fa22c1537c8c8365199b8ba2f764224d5e696d04'
    cached = Path('C:/Users/Thunder/.codex/tmp/yjcm-archive-20261114/game-from-apk.bin')
    assert cached.read_bytes() == packed
    decoded = Path('C:/Users/Thunder/.codex/tmp/yjcm-archive-20261114/game-from-apk-decoded.zip').read_bytes()
    assert hashlib.sha256(decoded).hexdigest() == '23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'
    with zipfile.ZipFile(io.BytesIO(decoded)) as game:
        module = 'app.view.game.card.CardsSortTagNode'
        payload = game.read(module)
        output = ROOT / '.codex-backups/card-name-source'
        output.mkdir(parents=True, exist_ok=True)
        bytecode = output / module
        bytecode.write_bytes(payload)
        chunk = Chunk(payload)
        chunk.function()
        assert chunk.p == len(payload)
        (output / (module + '.json')).write_text(json.dumps(chunk.rows, ensure_ascii=False, indent=2), encoding='utf-8')
        for row in chunk.rows:
            print(row['id'], row['line'], row['last'], json.dumps(row['constants'], ensure_ascii=False))
        print('module_sha256', hashlib.sha256(payload).hexdigest())
        report = {'apk': {'path': 'D:/yoka_sgs.x_g_android_6.4.5.apk', 'sha256': '12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202'}, 'rea_evidence': ['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'ev_9c5d0ada064eb4df0e69550e647832f45a7c91a83828969b6e7b0219840bc0e9'], 'game': {'member': 'assets/res/lib/game.zip', 'packed_sha256': digest(packed), 'decoded_sha256': digest(decoded)}, 'modules': {}}
        manifest = json.loads((ROOT.parent/'抚琴益州/reverse/source-manifest.json').read_text(encoding='utf-8'))
        for name in [module, 'app.view.game.card.CardUiNew', 'app.view.game.card.SelfCardsArea', 'app.module.game.spell.SpellData', 'framework_extend.viewNode.ViewLabel']:
            raw = game.read(name)
            report['modules'][name] = {'sha256': digest(raw)}
            if name != module:
                assert (ROOT.parent/'抚琴益州/reverse/game'/name).read_bytes() == raw
                record = next((r for r in manifest['records'] if r['module'] == name), None)
                if not record:
                    continue
                assert record['bytecode_sha256'] == digest(raw)
                source = (ROOT.parent/'抚琴益州'/record['source']).read_bytes()
                assert record['source_sha256'] == digest(source)
        report['tag_bytecode'] = chunk.rows
    member = 'assets/res/new/tex/plist/game_ui.plist'
    plist_bytes = apk.read(member)
    frames = plistlib.loads(plist_bytes)['frames']
    color_path = member[:-6] + '.pvr.ccz'
    color = apk.read(color_path)
    alpha = apk.read(color_path + '@alpha')
    atlas = texture(color)
    atlas.putalpha(texture(alpha).getchannel('R'))
    report['atlas'] = {'plist': member, 'plist_sha256': digest(plist_bytes), 'texture': color_path, 'texture_sha256': digest(color), 'alpha_sha256': digest(alpha)}
    report['assets'] = []
    for name in ['game_ui_cards_tag_normal.png', 'game_ui_cards_tag_select.png']:
        frame = frames[name]
        assert not frame['rotated'] and frame['sourceSize'] == '{12,30}'
        import re
        x,y,w,h = map(int, re.findall(r'\d+',frame['frame']))
        target = ROOT/'image/ui/card/xinsha'/name
        atlas.crop((x,y,x+w,y+h)).save(target)
        report['assets'].append({'frame_name': name, 'frame': frame, 'destination': target.relative_to(ROOT).as_posix(), 'sha256': digest(target.read_bytes())})
    report['observations'] = ['SelfCardsArea.reorderAllCards_new: hadSort && isHandCard && count(currentPage)>=15. CardUiNew.setShowCardTag: LEFT_BOTTOM(0,5), z=13, width=126, useShortName=true, selected from cardData.', 'CardsSortTagNode.refresh (0.5): normal/select assets; scale9 size(width,30), capInsets rect(6,10,1,1); label size22, LEFT_CENTER(3,15); selected RGB(255,233,129), normal RGB(193,174,142).', 'SpellData.getShortName uses spell_desc.ShortName, falling back to Name. ui.newLabel uses ViewLabel and default font fnt/fzbw.ttf.']
    report['adaptation'] = 'othersOff only; automatically follow the current native hand layout (no extra manual-sort flag), >=15 active cards per hand zone. Existing other-style count>=15 behavior retained. Independent hidden-by-default tag avoids the companion card-face hiding native .name; CSS only reveals it under the current hand zone. Dimensions map 126x174 to existing 108x150 cards and inherit cardScale. Use official short names for base cards and translated name fallback for extension cards; no gameplay change.'
    report['conversion'] = 'ETC1 RGB + alpha red channel; unrotated lossless crop; no resizing/recoloring.'
    report['limitations'] = ['Static shipped Lua bytecode and verified cached decompilation; official client runtime not observed.', 'Bundled unluac.jar is an HTML file (Invalid or corrupt jarfile); used existing Lua 5.1 parser and raw custom-opcode instruction analysis instead.']
    (ROOT/'verification/yjcm-card-name-source.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
