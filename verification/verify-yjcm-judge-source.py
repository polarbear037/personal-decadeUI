"""重验6.4.5 APK、已解码Lua及CCB；只读原客户端，不运行游戏代码。"""
import hashlib
import json
import plistlib
import runpy
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
APK = Path('D:/yoka_sgs.x_g_android_6.4.5.apk')
CACHE = Path('C:/Users/Thunder/.codex/tmp/yjcm-archive-20261114')
sha = lambda data: hashlib.sha256(data).hexdigest()
Chunk = runpy.run_path(str(ROOT.parent / '犟0/tools/read-official-lua.py'))['Chunk']
Reader = runpy.run_path(str(ROOT / 'verification/read-yjcm-character-ccb.py'))['Reader']

assert sha(APK.read_bytes()) == '12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202'
with zipfile.ZipFile(APK) as apk:
    packed = apk.read('assets/res/lib/game.zip')
    assert packed == (CACHE / 'game-from-apk.bin').read_bytes()
    ccb = apk.read('assets/res/new/data/ccb/judgeshow.ccbi')
    plist = apk.read('assets/res/new/tex/plist/gameinfo.plist')
decoded = (CACHE / 'game-from-apk-decoded.zip').read_bytes()
assert sha(decoded) == '23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'
modules = []
with zipfile.ZipFile(CACHE / 'game-from-apk-decoded.zip') as game:
    for name, ids in [('app.view.game.GameSelfSeatUi', ['0.121']), ('app.view.game.GameJudgeCcb', ['0.0', '0.13'])]:
        data = game.read(name)
        chunk = Chunk(data)
        chunk.function()
        assert chunk.p == len(data)
        modules.append(dict(member=name, sha256=sha(data), functions=[f for f in chunk.rows if f['id'] in ids]))
tree = Reader(ccb).read()
slots = [node['properties'].get('position', [0, 0, 0])[:2] for node in tree['children']]
assert slots == [[35 * i, 0] for i in range(7)]
report = dict(
    client=dict(apk=str(APK), sha256=sha(APK.read_bytes()), packed_sha256=sha(packed), decoded_sha256=sha(decoded)),
    rea_evidence=['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'ev_97f06108101d98cedd8001cc310e13e8688193c5bf23b743206c2881553c7f7f'],
    modules=modules,
    ccb=dict(member='assets/res/new/data/ccb/judgeshow.ccbi', sha256=sha(ccb), tree=tree),
    frames=dict(member='assets/res/new/tex/plist/gameinfo.plist', sha256=sha(plist), selected={name: plistlib.loads(plist)['frames'][name] for name in ['spellsign_1.png', 'spellsign_3.png', 'spellsign_7.png']}),
    observations=[
        'GameSelfSeatUi.layoutYJCM0.121 PC4..10: gameJudge.align(LEFT_BOTTOM,108,194). Final override after createChildren; unrelated to portrait position.',
        'GameSelfSeatUi.createChildren0.120 PC239..252 creates GameJudgeCcb.new() with no spaceXOffset. onCreate0.0 PC13..34 only adds the optional offset when supplied; ordinary slots remain0,35,70,...',
        'judgeshow.ccbi has anchor(0,0), size250x35; each mark has anchor(0,0), y0. gameinfo.plist mark sprites are39x41.',
        'GameJudgeCcb.updateUI0.13 PC196..217 centers each Spine in its mark and loops play. The local existing45x45 dynamic PNG remains, centered on the39x41 source carrier; artwork and animation lifecycle unchanged.',
    ],
    limitation='Static shipped bytecode/layout inspection; no official Android runtime comparison. Local browser and current Electron verification are separate.'
)
(ROOT / 'verification/yjcm-judge-layout-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
print('YJCM_JUDGE_SOURCE_OK: LEFT_BOTTOM(108,194), step35, source carrier39x41')
