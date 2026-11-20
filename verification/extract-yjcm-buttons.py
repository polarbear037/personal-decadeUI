"""按 Cocos plist 重建 6.4.5 局内按钮，保留原始透明留白；仅供开发提取。"""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import re
import struct
import sys
import zipfile
import zlib
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
NAMES = {
    'btn_menu_main.png', 'btn_menu_handler.png', 'btn_menu_setting.png',
    'btn_menu_background.png', 'btn_menu_surround.png', 'btn_menu_leaven.png',
    'gameinfo_xf_menu_bg.png', 'game_menu_chat.png', 'game_menu_quick_face.png', 'game_menu_flower.png',
    'gameInfoWenHao.png', 'showInfo.png', 'showInfo_card.png', 'handNum.png',
    'gameinfo_btn_sort_cardsnew.png', 'game_btn_1.png', 'game_btn_2.png',
    'btn_skill_item_normal.png', 'btn_skill_normal_gray.png',
    'skill_beidong_btn.png', 'skill_item_lmt_pic.png', 'skill_item_lmt_pic_gray.png',
    'skill_item_t_yang_pic.png', 'skill_item_t_ying_pic.png',
    'skill_item_t_yang_pic_gray.png', 'skill_item_t_ying_pic_gray.png',
    'game_ui_dlg_bg.png', 'game_ui_dlg_title_bg.png', 'game_ui_left_line.png',
    'gameinfo_bg_frame.png', 'gameinfo_bg_namebg.png', 'gameinfo_bg_select.png',
    'gameinfo_bg_onUse.png', 'gameinfo_bg_question.png', 'gameinfo_bg_dynamtic.png',
    'gameinfo_bg_btn_1.png', 'gameinfo_bg_btn_2.png', 'gameinfo_bg_btn_state.png',
    'gameinfo_bg_btn_lock.png',
    'cmn_checkbox_normal.png', 'cmn_checkbox_select.png',
    'zhanchang_zuoyun1.png', 'zhanchang_zuoyun2.png', 'zhanchang_zuoyun3.png',
    'zhanchang_youyun1.png', 'zhanchang_youyun2.png', 'zhanchang_youyun3.png',
}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apk', required=True)
    parser.add_argument('--dependency-path', required=True)
    args = parser.parse_args()
    sys.path.insert(0, args.dependency_path)
    import texture2ddecoder

    def digest(data):
        return hashlib.sha256(data).hexdigest()

    def decode(data):
        if data[:4] == b'CCZ!':
            data = zlib.decompress(data[16:])
        version, flags, fmt, space, channel, height, width, depth, surfaces, faces, mips, meta = struct.unpack_from('<IIQ9I', data)
        if version != 0x03525650 or fmt != 6:
            raise ValueError(f'Unsupported PVR format: {fmt}')
        return Image.frombytes('RGBA', (width, height), texture2ddecoder.decode_etc1(data[52 + meta:], width, height), 'raw', 'BGRA')

    output = ROOT / 'ui/assets/lbtn/yijiang'
    output.mkdir(parents=True, exist_ok=True)
    records, sources, pictures, extra = [], [], [], []
    with zipfile.ZipFile(args.apk) as archive:
        apk_hash = digest(Path(args.apk).read_bytes())
        for member in archive.namelist():
            if not member.startswith('assets/res/new/tex/plist/') or not member.endswith('.plist'):
                continue
            plist_data = archive.read(member)
            plist = plistlib.loads(plist_data)
            selected = NAMES.intersection(plist.get('frames', {}))
            if not selected:
                continue
            texture = member[:-6] + '.pvr.ccz'
            packed = archive.read(texture)
            atlas = decode(packed)
            alpha = archive.read(texture + '@alpha')
            atlas.putalpha(decode(alpha).getchannel('R'))
            sources.append({'plist': member, 'plist_sha256': digest(plist_data), 'texture_sha256': digest(packed), 'alpha_sha256': digest(alpha)})
            for name in sorted(selected):
                frame = plist['frames'][name]
                x, y, w, h = map(int, re.findall(r'-?\d+', frame.get('frame', frame.get('textureRect'))))
                rotated = frame.get('rotated', frame.get('textureRotated', False))
                sw, sh = (h, w) if rotated else (w, h)
                image = atlas.crop((x, y, x + sw, y + sh))
                if rotated:
                    image = image.transpose(Image.Transpose.ROTATE_90)
                size = tuple(map(int, re.findall(r'-?\d+', frame.get('sourceSize', frame.get('spriteSourceSize')))))
                ox, oy = map(int, re.findall(r'-?\d+', frame.get('offset', frame.get('spriteOffset', '{0,0}'))))
                canvas = Image.new('RGBA', size)
                canvas.paste(image, ((size[0] - image.width) // 2 + ox, (size[1] - image.height) // 2 - oy))
                target = output / name
                canvas.save(target)
                records.append({'frame': name, 'plist': member, 'frame_metadata': frame, 'size': size, 'destination': target.relative_to(ROOT).as_posix(), 'sha256': digest(target.read_bytes())})
                pictures.append((name, canvas))
        # SceneBg 为群雄风光额外叠加的前景，随原配置骨骼一起播放。
        for stem in ['SF_animation_paiju_qunxiong1', 'skeleton']:
            prefix = 'assets/res/new/data/spine/' + stem
            destination = output / 'background/scene'
            destination.mkdir(parents=True, exist_ok=True)
            for suffix in ['.skel', '.atlas']:
                data = archive.read(prefix + suffix)
                target = destination / (stem + suffix)
                target.write_bytes(data.replace(b'.pvr.ccz', b'.png') if suffix == '.atlas' else data)
                extra.append({'member': prefix + suffix, 'source_sha256': digest(data), 'destination': target.relative_to(ROOT).as_posix(), 'sha256': digest(target.read_bytes())})
            color, alpha = archive.read(prefix + '.pvr.ccz'), archive.read(prefix + '.pvr.ccz@alpha')
            image = decode(color)
            image.putalpha(decode(alpha).getchannel('R'))
            target = destination / (stem + '.png')
            image.save(target)
            extra.append({'member': prefix + '.pvr.ccz', 'source_sha256': digest(color), 'alpha_sha256': digest(alpha), 'destination': target.relative_to(ROOT).as_posix(), 'sha256': digest(target.read_bytes())})
        for name in ['fzbw.ttf', 'FZSHENGSKSJW.ttf']:
            member = 'assets/res/fnt/' + name
            data = archive.read(member)
            target = output / 'fnt' / name
            target.parent.mkdir(parents=True, exist_ok=True)
            if not target.exists() or target.read_bytes() != data:
                target.write_bytes(data)
            extra.append({'member': member, 'source_sha256': digest(data), 'destination': target.relative_to(ROOT).as_posix(), 'sha256': digest(data)})
    missing = NAMES - {row['frame'] for row in records}
    if missing:
        raise FileNotFoundError(f'Missing frames: {sorted(missing)}')
    report = {'client': {'version': '6.4.5', 'apk_sha256': apk_hash, 'member': 'assets/res/lib/game.zip', 'decoded_sha256': '23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'},
              'rea_evidence': {'apk_inventory': 'ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'game_inventory': 'ev_229e54696ec7e1268eb03d4586c6bfe650ee8130405d6b2810fec6e459a49243'},
              'conversion': 'ETC1 color + ETC1 alpha red channel; undo plist rotation and restore sourceSize/spriteOffset, no resizing', 'sources': sources, 'frames': records, 'extra': extra,
              'scope': 'Static shipped package and Lua bytecode inspection. Official client runtime comparison remains unverified.'}
    report_path = ROOT / 'verification/yjcm-buttons-source.json'
    existing = json.loads(report_path.read_text('utf-8')) if report_path.exists() else {}
    report_path.write_text(json.dumps({**existing, **report}, ensure_ascii=False, indent=2), encoding='utf-8')
    sheet = Image.new('RGB', (900, ((len(pictures) + 2) // 3) * 130), '#493f36')
    draw = ImageDraw.Draw(sheet)
    for index, (name, canvas) in enumerate(pictures):
        image = canvas.copy()
        image.thumbnail((280, 100))
        x, y = index % 3 * 300, index // 3 * 130
        sheet.paste(image, (x + (300 - image.width) // 2, y), image)
        draw.text((x + 5, y + 105), name, fill='white')
    sheet.save(ROOT / '.codex-tmp/yjcm-buttons/frames.jpg')
    print(json.dumps({row['frame']: row['size'] for row in records}, ensure_ascii=False))

if __name__ == '__main__':
    main()
