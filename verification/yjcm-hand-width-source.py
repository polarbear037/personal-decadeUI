"""只读核对6.4.5 APK和已有解码缓存，保留普通手牌区的宽度及拥挤布局依据。"""
import hashlib
import json
from pathlib import Path
import runpy
import zipfile

ROOT = Path(__file__).resolve().parents[1]
CACHE = Path('C:/Users/Thunder/.codex/tmp/yjcm-archive-20261114')
APK = Path('D:/yoka_sgs.x_g_android_6.4.5.apk')
sha = lambda data: hashlib.sha256(data).hexdigest()
assert sha(APK.read_bytes()) == '12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202'
with zipfile.ZipFile(APK) as apk:
    packed = apk.read('assets/res/lib/game.zip')
assert packed == (CACHE / 'game-from-apk.bin').read_bytes()
decoded = CACHE / 'game-from-apk-decoded.zip'
assert sha(decoded.read_bytes()) == '23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'
Chunk = runpy.run_path(str(ROOT.parent / '犟0/tools/read-official-lua.py'))['Chunk']
selected = {
    'app.view.game.GameSelfSeatUi': ['0.120', '0.121', '0.31', '0.32'],
    'app.view.game.card.CardsArea': ['0.1'],
    'app.view.game.card.SelfCardsArea': ['0.0', '0.25'],
    'app.view.game.card.CardUiNew': ['0'],
}
modules = []
with zipfile.ZipFile(decoded) as game:
    for name, ids in selected.items():
        data = game.read(name)
        chunk = Chunk(data)
        chunk.function()
        assert chunk.p == len(data)
        cached = json.loads((ROOT / '.codex-tmp/yjcm-buttons' / (name + '.json')).read_text('utf-8-sig'))
        assert chunk.rows == cached, name
        functions = [row for row in chunk.rows if row['id'] in ids]
        assert len(functions) == len(ids)
        modules.append(dict(member=name, sha256=sha(data), functions=functions))
report = dict(
    client=dict(apk=str(APK), sha256=sha(APK.read_bytes()), member='assets/res/lib/game.zip',
                packed_sha256=sha(packed), decoded_sha256=sha(decoded.read_bytes()), parsed_cache_rechecked=True),
    rea_evidence=['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965',
                  'ev_83a400d7662487233e14d0d10957b7858ba3a0cca706f6ed28fc149cfc2cd16c'],
    modules=modules,
    observations=[
        'GameSelfSeatUi.createChildren0.120 PC32..52: ordinary selfCardsArea width=self.width-40-560, position(40,0). layoutYJCM0.121 changes only the judge area and does not replace hand width.',
        'CardsArea.ctor0.1 PC1..11: width=touchRect.width; left=touchRect.x+card_width/2. CardUiNew.CARD_WIDTH=126; SelfCardsArea.ctor0.0 spacing=2, moveCardTime=8/30.',
        'SelfCardsArea.adjustCardPos0.25 PC15..19,70..84: available=width-left. Ordinary step=min(card_width+spacing,available/count). Thus the region stops growing; cards increasingly overlap in one row. It does not scale down the cards or wrap into another row.',
        'PC25..69: if a selected card exists, count>=5 and available/count<80, reserve up to five80-unit steps around it, alternating toward available neighbors. PC70..84 distributes remaining width to other steps. Selected cards lift by21; the whole hand area is not enlarged.',
        'Auxiliary zones have separate branches: GameSelfSeatUi.layoutGuoZhanStateHandCardsArea0.31/layoutMuNiuHandCardsArea0.32 can change widths for those zones. The current task restores the ordinary region; it does not implement new auxiliary zones.',
    ],
    local=dict(style='othersOff -> xinsha', file='src/styles/layout-xinsha.css',
               cause='The later #arena[data-alone-equip="off"][data-right-layout="on"] > .hand-wrap rule had higher specificity than the official ordinary region and forced left55px/right320px. Current Electron measured width910.828px instead of the scene-derived roughly760px.',
               correction='Add #window to the existing othersOff ordinary-region selector. Preserve the mirrored left-hand selector and the original width/position values. src/core/layout.js compensates oversized configured cards by subtracting max(0,renderedOuterCardWidth-126*sceneUnit) from the available step budget; this retains the native card-tail reserve without shrinking configured card faces.',
               preserved='Configured cardScale, the previously requested zero-gap maximum step, selected/hover expansion and optional fold_card minimum-spacing scrolling. Native+2 spacing and local fold scrolling remain explicit local adaptations.'),
    validation=dict(commands=['python verification/yjcm-hand-width-source.py', 'node verification/yjcm-hand-width-browser.cjs', 'node verification/yjcm-hand-hover-browser.cjs', 'node --check src/core/layout.js', 'git diff --check'],
                    browser='verification/yjcm-hand-width-results.json:48 layout combinations,60 card layouts including oversized cards and scrolling; same20 cards return from local selected-tail expansion to uniform spacing after selection/hover clear; five other style CSS isolation checks.',
                    electron='verification/yjcm-hand-width-live-results.json: same18-card hand before/after stylesheet change; width910.828->759.727CSS pixels; face width unchanged102.57377. verification/yjcm-hand-width-layout-live-results.json separately verifies the current layout function, real lei-yijiang-card-face and preserved game wrapper/state.',
                    not_verified=['official-client execution comparison', 'physical Android device', 'real network multiplayer']),
    limitations=['Static shipped modified-opcode Lua, not original authoring source or official-client execution.',
                 'Browser fixture and local Electron observations are separate from official-client runtime and Android hardware.'],
)
(ROOT / 'verification/yjcm-hand-width-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf8')
print('YJCM_HAND_WIDTH_SOURCE_OK: APK, packed/decoded cache, four modules and ordinary/auxiliary width branches verified')
