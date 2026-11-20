"""从已确认的6.4.5 APK提取互动道具；不运行官方代码，保留原尺寸与alpha。"""
import hashlib
import json
import plistlib
import re
import runpy
import struct
import sys
import zipfile
import zlib
from pathlib import Path
from PIL import Image, ImageDraw

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.codex-tmp/dialog-xinsha-deps'))
import texture2ddecoder

APK = Path('D:/yoka_sgs.x_g_android_6.4.5.apk')
sha = lambda data: hashlib.sha256(data).hexdigest()
report = {'client': {'apk': str(APK), 'sha256': sha(APK.read_bytes())},
          'rea_evidence': ['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'ev_9c5d0ada064eb4df0e69550e647832f45a7c91a83828969b6e7b0219840bc0e9', 'ev_229e54696ec7e1268eb03d4586c6bfe650ee8130405d6b2810fec6e459a49243', 'ev_7b06a98b4ce6e89cd974d194d4cb71ad388e73bb785813591433f0c707a6ed13'],
          'frames': [], 'spines': [], 'modules': []}
assert report['client']['sha256'] == '12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202'

def decode(data):
    if data[:4] == b'CCZ!': data = zlib.decompress(data[16:])
    version, flags, fmt, space, channel, height, width, depth, surfaces, faces, mips, meta = struct.unpack_from('<IIQ9I', data)
    assert version == 0x03525650 and fmt == 6
    return Image.frombytes('RGBA', (width, height), texture2ddecoder.decode_etc1(data[52 + meta:], width, height), 'raw', 'BGRA')

def rgba(z, name):
    color, alpha = z.read(name), z.read(name + '@alpha')
    im = decode(color); im.putalpha(decode(alpha).getchannel('R'))
    return im, {'texture': name, 'texture_sha256': sha(color), 'alpha_sha256': sha(alpha)}

output = ROOT / 'image/ui/xinsha-props'; output.mkdir(exist_ok=True)
names = {'gi_sl_all_item_bg.png', 'gi_sl_gift_cnt_bg.png', 'gi_sl_item_bg.png', 'gi_sl_item_numbg.png', 'gi_sl_item_select.png', 'gi_sl_can_select_arrow.png', 'gi_sl_flower.png', 'gi_sl_greens.png', 'gi_sl_gift_icon3.png', 'gi_sl_gift_icon4.png'}
names.update(f'gi_sl_gift_icon{i}_big.png' for i in [37, 38, 39, 40])
pictures = []
with zipfile.ZipFile(APK) as z:
    for atlas_name, selected in [('game_give_item', names), ('game_menu', {'btn_vtotxt.png'})]:
        member = f'assets/res/new/tex/plist/{atlas_name}.plist'
        plist_data = z.read(member); frames = plistlib.loads(plist_data)['frames']
        atlas, texture = rgba(z, member[:-6] + '.pvr.ccz')
        for name in sorted(selected):
            f = frames[name]; x, y, w, h = map(int, re.findall(r'-?\d+', f['frame']))
            rotated = f.get('rotated', False); sw, sh = (h, w) if rotated else (w, h)
            im = atlas.crop((x, y, x + sw, y + sh))
            if rotated: im = im.transpose(Image.Transpose.ROTATE_90)
            size = tuple(map(int, re.findall(r'-?\d+', f['sourceSize'])))
            ox, oy = map(int, re.findall(r'-?\d+', f['offset']))
            canvas = Image.new('RGBA', size)
            canvas.paste(im, ((size[0]-im.width)//2+ox, (size[1]-im.height)//2-oy))
            target = (ROOT / 'ui/assets/lbtn/yijiang' if atlas_name == 'game_menu' else output) / name
            canvas.save(target)
            report['frames'].append(dict(plist=member, plist_sha256=sha(plist_data), frame=name, frame_metadata=f, **texture, destination=target.relative_to(ROOT).as_posix(), sha256=sha(target.read_bytes())))
            pictures.append((name, canvas))
    for suffix in ['2', '29', '34', '36']:
        stem = 'SF_paiju_ZhuZhuXiabq' + suffix
        prefix = 'assets/res/new/data/spine/gamegift/' + stem
        dest = ROOT / 'assets/animation/xinsha-props'
        records = []
        for ext in ['.skel', '.atlas']:
            data = z.read(prefix + ext)
            target = dest / (stem + ext)
            target.write_bytes(data.replace(b'.pvr.ccz', b'.png') if ext == '.atlas' else data)
            records.append(dict(member=prefix+ext, source_sha256=sha(data), destination=target.relative_to(ROOT).as_posix(), sha256=sha(target.read_bytes())))
        im, texture = rgba(z, prefix + '.pvr.ccz'); target = dest / (stem + '.png'); im.save(target)
        records.append(dict(**texture, destination=target.relative_to(ROOT).as_posix(), sha256=sha(target.read_bytes())))
        report['spines'].append(dict(name=stem, resources=records, conversion='ETC1 RGB + alpha red channel; original skeleton, atlas page .pvr.ccz renamed .png'))
    report['client']['packed_game_sha256'] = sha(z.read('assets/res/lib/game.zip'))

# 与此前已校验解码缓存逐字节比对，随后解析本次实际涉及的函数。
cache = Path('C:/Users/Thunder/.codex/tmp/yjcm-archive-20261114')
with zipfile.ZipFile(APK) as z: assert z.read('assets/res/lib/game.zip') == (cache / 'game-from-apk.bin').read_bytes()
decoded = (ROOT / '.codex-tmp/yjcm-buttons/game.zip').read_bytes()
assert sha(decoded) == '23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'
report['client']['decoded_game_sha256'] = sha(decoded)
parser = runpy.run_path(str(ROOT.parent / '犟0/tools/read-official-lua.py'))
for archive, modules in [('game.zip', [('app.view.game.dlg.GameGiveItemView', ['0.2','0.4','0.5','0.6','0.8']), ('app.view.game.GameMenuLayer', ['0.20','0.37','0.40']), ('app.view.game.GameAniLayer', ['0.24','0.24.0']), ('app.manager.gameGiveItem.GameGiveItemManager', ['0.4','0.17','0.18','0.20']), ('app.ui.SpineNode', ['0.2']), ('app.view.pic.GoodsIconPic', ['0'])]), ('config.zip', [('app.config.sgs_game_give_item', ['0'])])]:
    with zipfile.ZipFile(ROOT / '.codex-tmp/yjcm-buttons' / archive) as z:
        for name, ids in modules:
            data = z.read(name); c = parser['Chunk'](data); c.function(); assert c.p == len(data)
            row = dict(member=name, archive=archive, sha256=sha(data), functions=[f for f in c.rows if f['id'] in ids])
            if archive == 'config.zip':
                table = parser['literals'](c.rows)['GameGiveItemConf']
                row['visible_items'] = [v for v in table.values() if v.get('ClientDisplay') in [1,2,3,4,37,38,39,40]]
                row['functions'] = []
            report['modules'].append(row)
report['layout'] = {'panel': 'GameGiveItemView.createChilden0.4: columns=ceil(count/2); width=87*columns+(columns-1)*2+8; height185; scale148/185; LEFT_BOTTOM(89,176). arrayHorVerNode(items,columns,2,-2) centered.', 'item': 'createItemNode0.5: gi_sl_item_bg87x87 scale1.02; GoodsIconPic100x100 scale0.5 centeredY+8; numbg78x21 LEFT_BOTTOM(4,3); cost20; selection103x100 centerY-1.', 'buttons': 'GameMenuLayer.createChilden0.20: flower, chat, VoiceTransBtn(size73, btnFrame btn_vtotxt); arrangeNodes spacing10; CENTER_BOTTOM(53,10).', 'order': [[1,3,37,38],[2,4,39,40]], 'flight': 'GameAniLayer.onPlaySendItemAni0.24: display37/38/39/40 => gamegift/SF_paiju_ZhuZhuXiabq2/29/34/36; static icon scale0.8, moveTo0.3s then play Spine play.'}
report['scatter'] = {
 'source': 'GameGiveItemManager.addDoubelHitData0.18 + getRandomWorldPt0.20 + reqGiveItemInGame0.4 -> GameAniLayer.onPlaySendItemAni0.24 PCs40..117',
 'combo': 'Same receiver/item, reset after5 seconds; first shot at seat center, double_hit_num>1 reads transmitted x_pos/y_pos.',
 'random': 'Default seat rectangle inset50 per edge (mahjong35); split inner region10x10, random cell without replacement and integer position within cell. Reject within60 units of current input or last1sec touch/chosen points (mahjong30). Fall back to inner center when no candidate satisfies spacing.',
 'reconstruction': 'Map native190-wide seat rectangle to actual avatar geometry. Generate once before native broadcast/send; third optional argument carries prop,combo,and center-relative hit. Flight and Spine use identical point, preserve water origin offsets. Record/replay the same point, never reroll receivers/replay.',
}
report['pig_audio'] = {
 'observation': 'GameAniLayer0.24 display37..40 sets image and spine only, without sound field. Shared hit callback0.24.0 invokes soundManager.playEffect only when sound is configured. SpineNode0.2 registers completion only, no audio event handler. Parsed actual four3.6.38 skeletons expose no events (verified by browser).',
 'scope': 'Selected6.4.5 shipped APK and its checked game module; searched packaged give-item audio. Unrelated voice/giveItem songs and GGBond skill voices are not these four prop sounds.',
 'result': 'No independent pig prop audio configured in this client. Keep silent; retain four base prop sounds.'
}
report['adaptation'] = ['User requested display balance: choose an integer1500..5500 once per installation; keep stable across panel openings. Existing free throwEmotion behavior remains.', 'Props retain native emotion fallbacks with optional rotate metadata {xinshaProp,xinshaCombo,xinshaHit}; generate once on sending, share flight/hit coordinates, preserve replay and other-style native fallback.', 'Pig icons use packaged matching flight artwork; remote GoodsIconPic item bitmaps are absent from this APK.']
report['limitations'] = ['Static modified-opcode Lua bytecode, not official source project.', 'No fresh official runtime or physical Android comparison.']
(ROOT / 'verification/xinsha-props-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2)+'\n', 'utf8')
sheet = Image.new('RGBA', (600, ((len(pictures)+3)//4)*145), '#342e25'); draw = ImageDraw.Draw(sheet)
for i, (name, im) in enumerate(pictures):
    x, y = i%4*150, i//4*145; copy = im.copy(); copy.thumbnail((110,100)); sheet.alpha_composite(copy,(x+15,y+5)); draw.text((x+2,y+110),name.replace('gi_sl_','').replace('game_menu_',''),fill='white')
sheet.convert('RGB').save(ROOT / '.codex-tmp/xinsha-props-official/assets.jpg')
print('XINSHA_PROPS_EXTRACT_OK', len(report['frames']), 'frames;', len(report['spines']), 'complete Spine sets')
