"""仅提取一将成名势力窗口的原版图集裁片，并保存静态来源。"""
import hashlib
import json
from pathlib import Path
import plistlib
import re
import runpy
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.codex-tmp/dialog-xinsha-deps'))
decode = runpy.run_path(str(ROOT / 'verification/extract-yjcm-target-effects.py'))['decode']
reader = runpy.run_path(str(ROOT.parent / '犟0/tools/read-official-lua.py'))
digest = lambda data: hashlib.sha256(data).hexdigest()
apk_path = Path(sys.argv[1])
with zipfile.ZipFile(apk_path) as apk:
    cache = ROOT / '.codex-tmp/yjcm-buttons'
    assert apk.read('assets/res/lib/game.zip') == (cache / 'game.packed').read_bytes()
    member = 'assets/res/new/tex/plist/skill_window.plist'
    metadata = apk.read(member)
    texture = member[:-6] + '.pvr.ccz'
    rgb, alpha = apk.read(texture), apk.read(texture + '@alpha')
    atlas = decode(rgb)
    atlas.putalpha(decode(alpha).getchannel('R'))
    frames = plistlib.loads(metadata)['frames']
    assets = []
    for name in [*(f'skill_window_select_country_{i}.png' for i in range(1, 5)), 'skill_window_select_country_selected_frame.png']:
        frame = frames[name]
        x, y, w, h = map(int, re.findall(r'-?\d+', frame['frame']))
        rotated = frame.get('rotated', False)
        sw, sh = (h, w) if rotated else (w, h)
        image = atlas.crop((x, y, x + sw, y + sh))
        if rotated:
            from PIL import Image
            image = image.transpose(Image.Transpose.ROTATE_90)
        assert frame['offset'] == '{0,0}'
        assert tuple(map(int, re.findall(r'\d+', frame['sourceSize']))) == image.size
        target = ROOT / 'image/ui/faction/xinsha' / name
        target.parent.mkdir(parents=True, exist_ok=True)
        image.save(target)
        assets.append(dict(frame=name, metadata=frame, destination=target.relative_to(ROOT).as_posix(), sha256=digest(target.read_bytes()), size=image.size))
modules = []
with zipfile.ZipFile(cache / 'game.zip') as game:
    for name in ['app.view.game.dlg.windowSelectCountry', 'app.view.game.dlg.SkillNewStyleBaseWindow', 'app.view.game.dlg.SkillPopUpWindow', 'app.enum.GeneralCountry', 'framework_extend.ui.buttons.SimpleButton']:
        data = game.read(name)
        chunk = reader['Chunk'](data)
        chunk.function()
        assert chunk.p == len(data)
        modules.append(dict(member=name, sha256=digest(data), functions=chunk.rows))
with apk_path.open('rb') as stream:
    apk_digest = hashlib.file_digest(stream, 'sha256').hexdigest()
report = dict(client=dict(path=str(apk_path), sha256=apk_digest, version='6.4.5', packed_cache_matches_apk=True, decoded_sha256=digest((cache / 'game.zip').read_bytes())),
    rea_evidence=['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'ev_9c5d0ada064eb4df0e69550e647832f45a7c91a83828969b6e7b0219840bc0e9'],
    source=dict(plist=member, plist_sha256=digest(metadata), texture=texture, texture_sha256=digest(rgb), alpha_sha256=digest(alpha)), assets=assets, modules=modules,
    observations=['windowSelectCountry 0.2: four SimpleButtons, country1..4=WEI/SHU/WU/OTHER, gap50, CENTER_TOP(width/2,height-65); click0.3 sends selected country and closes.',
        'SkillNewStyleBaseWindow: bg2=1696x392; title295x37 center(width/2,height-20), title32 #FFECBB with horizontal+3. windowSelectCountry sets prompt bottom80 and progress bottom64.',
        'SimpleButton0.1: pressed scale0.95 and color178/255; disabled gray.'],
    adaptation=['晋使用参照既有自制图制作的紫色竖牌底图，晋字由原版fzbw字体渲染，见xinsha-faction-jin-source.json；非标准势力用选框加本体译名。保留传入顺序、原Button/link、filter、取消、AI/远端及结算。', '复用本地通用隐藏恢复和现有倒计时，不另建计时器；可取消询问保留本体确认/取消栏。窗口按游戏画面中心、设计高度750等比适配，背景铺满窗口。', '只核对静态包内字节码和素材；未观察官方客户端同状态画面。'])
(ROOT / 'verification/xinsha-faction-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('XINSHA_FACTION_ASSETS_OK', len(assets))
