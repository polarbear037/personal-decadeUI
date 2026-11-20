"""从已确认的一将成名 APK 提取 CardUiNew.updateSkillText 使用的原图。"""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import struct
import sys
import zipfile
import zlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apk', required=True)
    parser.add_argument('--dependency-path', required=True)
    args = parser.parse_args()
    sys.path.insert(0, args.dependency_path)
    import texture2ddecoder

    digest = lambda data: hashlib.sha256(data).hexdigest()
    def decode(data):
        if data[:4] == b'CCZ!':
            data = zlib.decompress(data[16:])
        version, flags, fmt, space, channel, height, width, depth, surfaces, faces, mips, meta = struct.unpack_from('<IIQ9I', data)
        if version != 0x03525650 or fmt != 6:
            raise ValueError(f'Unsupported PVR format: {fmt}')
        return Image.frombytes('RGBA', (width, height), texture2ddecoder.decode_etc1(data[52 + meta:], width, height), 'raw', 'BGRA')

    with zipfile.ZipFile(args.apk) as archive:
        member = 'assets/res/new/tex/plist/gameinfo.plist'
        plist_data = archive.read(member)
        frame = plistlib.loads(plist_data)['frames']['card_turn_text_bg_2.png']
        assert frame == {'frame': '{{1840,485},{120,40}}', 'offset': '{0,0}', 'rotated': False, 'sourceColorRect': '{{0,0},{120,40}}', 'sourceSize': '{120,40}'}, frame
        texture = member[:-6] + '.pvr.ccz'
        color, alpha = archive.read(texture), archive.read(texture + '@alpha')
        image = decode(color)
        image.putalpha(decode(alpha).getchannel('R'))
        target = ROOT / 'image/ui/card/xinsha/card_turn_text_bg_2.png'
        target.parent.mkdir(parents=True, exist_ok=True)
        image.crop((1840, 485, 1960, 525)).save(target)
        report = {
            'client': {'version': '6.4.5', 'apk_sha256': digest(Path(args.apk).read_bytes()), 'game_member': 'assets/res/lib/game.zip', 'decoded_game_sha256': '23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'},
            'rea_evidence': ['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'ev_229e54696ec7e1268eb03d4586c6bfe650ee8130405d6b2810fec6e459a49243'],
            'source': {'plist': member, 'plist_sha256': digest(plist_data), 'texture': texture, 'texture_sha256': digest(color), 'alpha_sha256': digest(alpha), 'frame': frame},
            'destination': {'path': target.relative_to(ROOT).as_posix(), 'sha256': digest(target.read_bytes()), 'size': [120, 40]},
            'conversion': 'ETC1 color + ETC1 alpha red channel; unrotated plist crop; no resizing or recoloring',
            'layout': {'module': 'app.view.game.card.CardUiNew', 'prototype': '0.46', 'line': 904, 'method': 'updateSkillText', 'data_method': 'app.module.game.card.Card.getSkillShowText', 'card': [126, 174], 'background_anchor': 'CENTER', 'background_position': [63, 74], 'label_parent': 'skillTextBg', 'label_anchor': 'CENTER', 'label_position': [60, 20], 'font_factory': 'framework_extend.ui.init.newLabel -> framework_extend.viewNode.ViewLabel -> display.newTTFLabel', 'font_defaults': 'app.Constant.DEFAULT_LABEL_FONT', 'font': 'fnt/fzbw.ttf', 'font_size': 24, 'color': [255, 240, 213], 'shadow_color': [99, 35, 26], 'shadow_position': [60, 18], 'outline': False, 'fit': 'scale=min(1,(card.width-10)/label.contentSize.width); one line'},
            'mapping': 'Native card remains 108x150 and uses existing cardScale. Strip left=3/126, top=80/174, width=120/126, height=40/174. Skill text is centered, cream with a shadow 2 design units below. Only othersOff -> xinsha uses this asset and text fitting.',
            'correction': 'Previous setCardTextLabel/card_text_bg.png implementation was ordinary card-description text, not getSkillShowText. The user supplied the official skill-tag screenshot and exposed the incorrect mapping; geometric assertions of that wrong method were not valid visual acceptance.',
            'limitation': 'Shipped Lua bytecode and assets checked; official client runtime comparison not performed.'
        }
        (ROOT / 'verification/yjcm-card-tag-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        print(target)

if __name__ == '__main__':
    main()
