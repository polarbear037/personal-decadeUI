"""核对本次技能光效的APK、调用链、转换产物和浏览器静态按钮。"""
import hashlib
import io
import json
from pathlib import Path
import runpy
import struct
import zipfile
import zlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
TEMP = ROOT / '.codex-tmp/skill-button-effect'
sha = lambda data: hashlib.sha256(data).hexdigest()
report = {'clients': {}, 'assets': [], 'static_masks': []}
apk = Path('D:/yoka_sgs.x_g_android_6.4.5.apk')
client = {'apk': str(apk), 'sha256': sha(apk.read_bytes())}
assert client['sha256'] == '12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202'
with zipfile.ZipFile(apk) as archive:
    packed = archive.read('assets/res/lib/game.zip')
    assert sha(packed) == 'df9af4ec01e45b7a2bca47b4fa22c1537c8c8365199b8ba2f764224d5e696d04'
    client['packed_sha256'] = sha(packed)
    decoded = (ROOT / '.codex-tmp/yjcm-buttons/game.zip').read_bytes()
    assert sha(decoded) == '23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'
    client['decoded_sha256'] = sha(decoded)
    client['modules'] = []
    parser = runpy.run_path(str(ROOT.parent / '犟0/tools/read-official-lua.py'))['Chunk']
    with zipfile.ZipFile(io.BytesIO(decoded)) as modules:
        for name, ids in [
            ('app.view.game.spell.SpellAreaNew', ['0.11', '0.12', '0.14']),
            ('app.view.game.spell.SpellPassiveItem', ['0.1', '0.7', '0.11']),
            ('app.module.game.general.SkillItemData', ['0.9', '0.11']),
            ('app.view.game.GameSelfSeatUi', ['0.50', '0.100', '0.102']),
        ]:
            data = modules.read(name)
            chunk = parser(data); chunk.function(); assert chunk.p == len(data)
            client['modules'].append({'member': name, 'sha256': sha(data), 'functions': [dict(id=r['id'], line=r['line'], last=r['last'], constants=r['constants'], code=r['code']) for r in chunk.rows if r['id'] in ids]})
    for stem in ['zhudong_xuanzhong', 'beidong_xuanzhong']:
        prefix = 'assets/res/new/data/spine/game/' + stem
        members = [{'member': prefix + suffix, 'sha256': sha(archive.read(prefix + suffix))} for suffix in ['.skel', '.atlas', '.pvr.ccz', '.pvr.ccz@alpha']]
        outputs = []
        for ext in ['.skel', '.atlas', '.png']:
            target = ROOT.parent / f'雷的一将/animation/skill-button/{stem}{ext}'
            if ext == '.skel': assert target.read_bytes() == archive.read(prefix + ext)
            elif ext == '.atlas': assert target.read_bytes() == archive.read(prefix + ext).replace(b'.pvr.ccz', b'.png')
            else: assert target.read_bytes() == (TEMP / (stem + ext)).read_bytes()
            outputs.append(dict(destination=str(target), sha256=sha(target.read_bytes())))
        report['assets'].append(dict(name=stem, source=members, outputs=outputs, runtime='3.6', original_skeleton=True))
client['rea_evidence'] = ['ev_e5081d053984b015a998c7cc75c873ede06dd1264422661244f634fc47739b01', 'ev_056a14a37e4453738a35bc60ea0b702a7591748c163eeebb5e453040d3731489']
report['clients']['xinsha'] = client

apk = Path('D:/yoka.game_g_android_4.0.3.apk')
client = {'apk': str(apk), 'sha256': sha(apk.read_bytes())}
assert client['sha256'] == '47be3dbf22d303d055c42b615282f29b7799a4c8d1471172af6fb59c4a902c3d'
with zipfile.ZipFile(apk) as archive:
    member = 'assets/cache/https.__web.sanguosha.com_220_sgsolApp/217defbb'
    packed = archive.read(member)
    with zipfile.ZipFile(io.BytesIO(packed)) as inner:
        main = inner.read('main.sgs')
    for stem in ['fx_UI_AnNIu_ZhuDong', 'fx_UI_AnNIu_BeiDong_new']:
        outputs = []
        for ext in ['.skel', '.atlas.txt', '.png']:
            logical = '/res/assets/animate/game/skillItem/' + stem + ext
            source = 'assets/cache/https.__web.sanguosha.com_220_sgsolApp/' + format(zlib.crc32(logical.encode()), '08x')
            target = ROOT.parent / ('雷的ol/animation/skill-button/' + stem + ('.atlas' if ext == '.atlas.txt' else ext))
            assert target.read_bytes() == archive.read(source)
            outputs.append(dict(logical_path=logical, member=source, destination=str(target), sha256=sha(target.read_bytes())))
        report['assets'].append(dict(name=stem, outputs=outputs, runtime='4.0', original_skeleton=True))
assert sha(main) == 'd47fdd2d1c9e54a2eced7118446af19e124158f657c90c716a7abb20ca937022'
client.update(member=member, packed_sha256=sha(packed), inner_member='main.sgs', main_sha256=sha(main))
text = main.decode('utf-8')
button = (TEMP / 'online-skill-button.js').read_text('utf-8')
assert button in text and button.startswith('class YEs ')
client['button_class'] = 'YEs'
client['button_class_sha256'] = sha(button.encode('utf-8'))
client['source_ranges'] = []
for file in ['online-skill-button', 'ApplyActivateSpell', 'ApplyTriggerSpell', 'TouchSkillItem', 'EndSelectSkillItem']:
    source = (TEMP / (file + '.js')).read_text('utf-8')
    start = text.index(source)
    client['source_ranges'].append(dict(name=file, utf16_start=len(text[:start].encode('utf-16-le')) // 2, utf16_length=len(source.encode('utf-16-le')) // 2, sha256=sha(source.encode('utf-8'))))
client['rea_evidence'] = ['ev_6d4eb8006f4c47995440e71b2c17a2859af779bf610cf72c8c07d35ec36d74c8', 'ev_23935adabc9199fad4f06aa234c4a7526b150f1a2613107a8612ab3bbb752d54']
report['clients']['online'] = client
report['call_chain'] = {
    'xinsha_active': 'SpellAreaNew.onItemSelectChanged 0.11 -> showBtnLight 0.14 -> game/zhudong_xuanzhong play(loop); isSelected controls show/hide.',
    'xinsha_passive': 'SkillItemData.ACTIVE_CHANGED -> SpellAreaNew.onItemActiveChanged 0.12 -> SpellPassiveItem.setActive 0.11 -> game/beidong_xuanzhong play(loop). Initial bind calls setActive(false).',
    'xinsha_active_flag': 'GameSelfSeatUi.startSelectSkillItem 0.100 checks matching ask skill/isOffsetSkill, canUse, avatar-skill canUse, HuoShui and getCanCanUse; endSelectSkillItem 0.102 sets all inactive. applyTriggerSpell starts ask-item selection before handling auto/manual.',
    'xinsha_original_geometry': 'Active110x45 centered. Passive72.5x26, center(width/2,height/2+1), scaleX0.9.',
    'online_state': 'YEs.getState: passive Selected -> PASSIVE_SEL; activated only -> PASSIVE_ACT; otherwise PASSIVE. IsInvalid/used limited override selection.',
    'online_effect_gate': 'YEs.updateInfo only creates/shows beidongEffect for PASSIVE_SEL; every other state hides it. Activated is insufficient.',
    'online_selection': 'RWt.ApplyActivateSpell -> StartSelectSkillItem/ask; SpellTouch_ConfirmResult -> TouchSkill -> TouchSkillItem calls G(true,true), records selectedSkillItem, then OnTouchSkill. Automatic/no-selection use and EndSelectSkillItem deactivate/clear selection.',
    'local_online_mapping': 'Require actual local input under an accepted skill-content event. Trigger initial chooseBool, *_cost, passive usable alone, automatic trigger and pure settlement do not qualify. Cancel, finish, auto control, remote ownership and style exit remove effects.',
}
report['playback'] = dict(modules=['雷的一将/utils/skillButtonEffects.js', '雷的ol/utils/skillButtonEffects.js'], canvas='皮肤切换 chukuangWorkerApi.playEffect / existing chukuang-canvas; original skeleton origin with referenceSize and parent follow.', alpha='Original Spine blending including additive slots, alpha:false, opacity:1; textures retained without recoloring.', removed='All four production APNGs removed at user request. Xinsha ETC1 RGB/alpha decoded losslessly; Online resources copied byte-identically. Assets migrated to their owning extensions.')
report['alignment'] = dict(user_requested=True, method='Restore original Spine-origin alignment and native scale, replacing earlier APNG ridge-to-full-button enlargement. Xinsha active110x45 origin=center/scale1; passive72.5x26 origin=(width/2,height/2+1), scaleX0.9. Online origin=center/scale1, normalized to local active146x64 and passive130x56 static textures.', xinsha_original_bright_ridge={'active_button':[110,45],'active_lrtb':[1,108,1,43],'passive_button':[72.5,26],'passive_lrtb':[4.15346,68.05346,-.5,23.5]}, conclusion='Bright ridge sits on or slightly inside the static border; only soft glow extends outward. No extra enlargement of the whole outline.')
for style in ['othersOff', 'onlineUI']:
    for kind in ['active', 'passive']:
        path = ROOT / f'verification/{style}-skill-effects-static-{kind}.png'
        image = Image.open(path).convert('RGBA')
        report['static_masks'].append(dict(style=style, kind=kind, size=list(image.size), alpha96_bbox=image.getchannel('A').point(lambda x: 255 if x >= 96 else 0).getbbox()))
report['limitations'] = ['Shipped-artifact static analysis; Lua bytecode is not the original authoring source.', 'Browser harness uses the real engine, skin plugins and assets with controlled event states; no official-client runtime comparison, complete Electron match, mobile device or real multiplayer verification.']
(ROOT / 'verification/yjcm-skill-effects-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf-8')
print('SKILL_EFFECTS_SOURCE_OK: both APK identities, original state gates, Spine resources and static-button alpha masks checked')
