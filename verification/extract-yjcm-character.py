"""提取一将成名 6.4.5 局内人物信息窗；正式素材保留尺寸与透明度。"""
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

def digest(data):
    return hashlib.sha256(data).hexdigest()

def decode(data):
    if data[:4] == b'CCZ!':
        data = zlib.decompress(data[16:])
    version, flags, fmt, space, channel, height, width, depth, surfaces, faces, mips, meta = struct.unpack_from('<IIQ9I', data)
    if version != 0x03525650 or fmt != 6:
        raise ValueError(f'Unsupported PVR format: {fmt}')
    return Image.frombytes('RGBA', (width, height), texture2ddecoder.decode_etc1(data[52 + meta:], width, height), 'raw', 'BGRA')

names = {
    'game_playerinfonew_bg.png', 'game_playerinfonew_btnbar_yjcm.png',
    'game_playerinfonew_btnclose.png', 'game_playinfo_split.png',
    'game_playerinfonew_tabbg.png', 'game_playerinfonew_tabselected.png',
    'game_playerinfonew_change_skin.png', 'game_playerinfonew_detail.png',
    'game_playerinfo_new_empty.png',
    'game_playerinfonew_general_change.png', 'game_playerinfonew_general_change_bg.png',
    'game_playerinfonew_empty_equip_tip_bg.png',
    'cardbg.png', 'yjcm_general_hp_1.png', 'yjcm_general_hp_bg.png',
    *[f'yjcm_general_gradation_bg_{i}.png' for i in [0, 1, 2, 3, 4, 5, 10, 13, 20]],
    *[f'yjcm_general_country_{i}.png' for i in [1, 2, 3, 4, 5, 10, 13, 20]],
    *[f'yjcm_general_country_bg_{i}.png' for i in [1, 2, 3, 4, 5, 10, 13, 20]],
}
output = ROOT / 'ui/assets/character/xinsha/official'
output.mkdir(parents=True, exist_ok=True)
records = []
with zipfile.ZipFile('D:/yoka_sgs.x_g_android_6.4.5.apk') as archive:
    # 与已通过 REA 核对的原包缓存逐字节比较，复用解码后的 Lua 容器。
    assert archive.read('assets/res/lib/game.zip') == (ROOT / '.codex-tmp/yjcm-buttons/game.packed').read_bytes()
    game = zipfile.ZipFile(ROOT / '.codex-tmp/yjcm-buttons/game.zip')
    modules = []
    for name in ['app.view.game.GameSeatInfoDlgYjcm', 'app.view.game.GameSeatInfoDlgNew', 'app.view.game.select.GeneralCardCcbNode', 'app.view.general.GeneralYjcmCountryContainer', 'app.view.general.GeneralYjcmHpContainer', 'app.ui.button.NewSwitchBtnGrop', 'framework.cocos2dx.SpriteEx', 'app.enum.EnumCfg']:
        data = game.read(name)
        modules.append({'member': name, 'sha256': digest(data)})
    for member in archive.namelist():
        if not member.startswith('assets/res/new/tex/plist/') or not member.endswith('.plist'):
            continue
        plist_data = archive.read(member)
        frames = plistlib.loads(plist_data).get('frames', {})
        selected = names.intersection(frames)
        if not selected:
            continue
        texture = member[:-6] + '.pvr.ccz'
        color, alpha = archive.read(texture), archive.read(texture + '@alpha')
        atlas = decode(color)
        atlas.putalpha(decode(alpha).getchannel('R'))
        for name in sorted(selected):
            frame = frames[name]
            x, y, w, h = map(int, re.findall(r'-?\d+', frame['frame']))
            rotated = frame.get('rotated', False)
            image = atlas.crop((x, y, x + (h if rotated else w), y + (w if rotated else h)))
            if rotated:
                image = image.transpose(Image.Transpose.ROTATE_90)
            size = tuple(map(int, re.findall(r'-?\d+', frame['sourceSize'])))
            ox, oy = map(int, re.findall(r'-?\d+', frame['offset']))
            canvas = Image.new('RGBA', size)
            canvas.paste(image, ((size[0] - image.width) // 2 + ox, (size[1] - image.height) // 2 - oy))
            target = output / name
            canvas.save(target)
            records.append({'member': member, 'plist_sha256': digest(plist_data), 'texture_sha256': digest(color), 'alpha_sha256': digest(alpha), 'frame': name, 'metadata': frame, 'destination': target.relative_to(ROOT).as_posix(), 'sha256': digest(target.read_bytes()), 'size': size})
    assert names == {r['frame'] for r in records}, names - {r['frame'] for r in records}
    member = 'assets/res/new/tex/noneetc/skin_clip.png'
    data = archive.read(member)
    target = output / 'skin_clip.png'
    target.write_bytes(data)
    records.append({'member': member, 'destination': target.relative_to(ROOT).as_posix(), 'sha256': digest(data), 'size': Image.open(target).size})
report = {
    'client': {'version': '6.4.5', 'apk_sha256': '12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202', 'game_member': 'assets/res/lib/game.zip', 'decoded_game_sha256': digest((ROOT / '.codex-tmp/yjcm-buttons/game.zip').read_bytes())},
    'rea_evidence': ['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'ev_587eee0cd61874d39939f356205cbe0c89e572f379ed157b8a88242b54d63070'],
    'modules': modules, 'assets': records,
    'conversion': 'ETC1 color plus alpha red channel; undo atlas rotation and restore sourceSize/offset; no resizing or recoloring',
    'layout': {
        'window': 'GameSeatInfoDlgYjcm.ctor 1031x460. createChildren background scale9(99,58,20,20); native close LEFT_BOTTOM(W-35,H-35),53x53; split LEFT_BOTTOM(376,24),1x413 => DOM top23. Local close adaptation requested after screenshot feedback: center(996,26.5),box(969.5,0,53,53),inside the frame and above the first tab. This differs deliberately from native close placement.',
        'footer': 'createUserInfo: btnbar_yjcm LEFT_BOTTOM(1,1),360x101. Nickname LEFT_TOP(27,H-7); official rank name_bg occupies(15,30),103x26; native detail(162,20),change-skin(224,20). Noname has no official account rank data: omit the empty rank placeholder and compact the two working buttons to footer LEFT_BOTTOM(15,20) and(77,20),48x48. Nickname and buttons now share the real footer parent. Mini open(player) contract is unchanged.',
        'tabs': 'getTabGroupPos=(387,H). showSpellDetailView624x0; group LEFT_TOP(578,-53),tabs52x126,gap4 => DOM left965,top53; second top183.',
        'skills': 'createSpellView:549x378 pane at LEFT_TOP(0,-21) relative to spellDetailView; list559x378. Skill item name87x41,font32 FZSHENGSKSJW color252,244,188; text maxWidth538,font24 fzbw,color255,240,213,lineSpace3; description left6,top56; item gap20.',
        'card': 'createSkin view326x354 LEFT_BOTTOM(12,100); setSkinId GeneralCardCcbNode190x252 scale1.1 center(view.width/2+12,view.height/2), giving DOM left82.5,top44.4,size209x277.2. seatInfo.ccbi tag200 cardbg original194x256 anchor(0,0) at(0,0); preserve its transparent margins. GeneralCardCcbNode.updateGeneral places GeneralSkinUi180x245 at LEFT_BOTTOM(10,10), so portrait DOM top=-3, not10. Use original skin_clip180x245 for the local portrait. Guozhan uses scale.95, centerY230 and general switch at bottom107.',
        'hp': 'GeneralCardCcbNode.createChilden: GeneralYjcmHpContainer36x105 RIGHT_BOTTOM(width-8,8),so local left146,bottom8. Native bg original139x178 RIGHT_BOTTOM(36-(-6),-7) gives local left-97,bottom-7. setScaleRange(178-30-2,30,0,0),height=max(178,min(maxHp,5)*20+130+6). Pip nodes20x20 centeredX25,images18x20; bottom6+20*i. Alpha bbox of original bg is(98,111,134,171); preserve the full transparent source instead of treating the visible band as its dimensions.',
        'country': 'GeneralYjcmCountryContainer32x230 LEFT_BOTTOM(5,10.5); bg center(16,114.5),country text backdrop and emblem center(16,202). Native sizes are restored without stretching the33x232 background or omitting the40x41 faction circle.',
        'scroll': 'User-requested adaptation: scrollbar-width:none!important and WebKit scrollbar display:none,width0,height0; retain native overflow-y:auto, wheel and touch scrolling.',
        'scale9': 'framework.cocos2dx.SpriteEx.setScaleRange(top,bottom,left,right) writes setInsetLeft(r3),setInsetRight(r4),setInsetBottom(r2),setInsetTop(r1); frame CSS slices are top99,right20,bottom58,left20.',
        'countries': 'app.enum.EnumCfg.CountryTyp: Wei1,Shu2,Wu3,Qun4,Shen5,Han10,Ye13,Jin20. Custom factions without an official mapping use neutral0.',
        'reused_assets': 'image/ui/tooltip/xinsha/game_playinfo_skillbg.png and cmn_{activite,passive}_skill_bg.png reuse exact extracted frames documented in verification/yjcm-tooltip-source.json; fonts reuse verification/yjcm-font-source.json.'
    },
    'limitations': ['Static shipped Lua bytecode and assets; official client runtime comparison not performed.', 'Noname provides its own character art, skill text, equipment and visible hand cards. Official rank service and Jiangling data are not available.']
}
(ROOT / 'verification/yjcm-character-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2), 'utf-8')
print(f'Extracted {len(records)} original frames')
