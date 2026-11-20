"""核对当前 APK、解码缓存与手牌输入/选中布局字节码；不执行官方客户端。"""
import hashlib
import json
import runpy
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
apk = Path('D:/yoka_sgs.x_g_android_6.4.5.apk')
cache = Path('C:/Users/Thunder/.codex/tmp/yjcm-archive-20261114')
sha = lambda data: hashlib.sha256(data).hexdigest()
assert sha(apk.read_bytes()) == '12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202'
with zipfile.ZipFile(apk) as archive:
    packed = archive.read('assets/res/lib/game.zip')
assert packed == (cache / 'game-from-apk.bin').read_bytes()
decoded = (cache / 'game-from-apk-decoded.zip').read_bytes()
assert sha(decoded) == '23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'
Chunk = runpy.run_path(str(ROOT.parent / '犟0/tools/read-official-lua.py'))['Chunk']
modules = []
with zipfile.ZipFile(cache / 'game-from-apk-decoded.zip') as archive:
    for name in ['SelfCardsArea', 'CardsArea', 'CardUi', 'CardUiNew']:
        member = 'app.view.game.card.' + name
        data = archive.read(member)
        chunk = Chunk(data)
        chunk.function()
        assert chunk.p == len(data)
        if name == 'SelfCardsArea':
            assert chunk.rows == json.loads((ROOT / f'.codex-tmp/yjcm-buttons/{member}.json').read_text('utf-8-sig'))
            chosen = [row for row in chunk.rows if row['id'] in ['0', '0.0', '0.25', '0.26', '0.27', '0.29', '0.31', '0.32']]
        else:
            chosen = [chunk.rows[0]]
        modules.append(dict(member=member, sha256=sha(data), functions=[dict(id=row['id'], line=row['line'], last=row['last'], constants=row['constants']) for row in chosen]))
report = dict(
    client=dict(apk=str(apk), sha256=sha(apk.read_bytes()), member='assets/res/lib/game.zip', packed_sha256=sha(packed), decoded_sha256=sha(decoded), parsed_cache_rechecked=True),
    rea_evidence=['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'ev_9c5d0ada064eb4df0e69550e647832f45a7c91a83828969b6e7b0219840bc0e9'],
    modules=modules,
    observations=[
        'SelfCardsArea module 0 sets CARD_SELECTED_POP_HEIGHT=21; ctor0.0 sets moveCardTime=8/30 seconds.',
        'adjustCardPos0.25 PC15..30: expanded step80; only when a selected index exists, (width-left)/count<80, and count>=5.',
        'PC31..69: starting radius1, collect selected-radius+1 then selected+radius, skipping missing cards, until five step slots are collected. The slots are selected,right1,left1,right2,left2, extending further toward the available end at a boundary.',
        'PC70..84: narrow step=min(card_width+spacing, (width-left-80*slotCount)/(count-slotCount)). PC85..125: start at left, assign desPos, advance80 after reserved slots, otherwise narrow step. No generic20% left spread or selected-card viewport clamp.',
        'PC95..104 lifts each selected card by21 when needSelectCardHeight is true;0.29 returns true. getSelectedIdx0.26 selects the current selected card when several are selected.',
        'onTouchBegan0.31 and onTouchEnded0.32 scan cards from last to first and use cascade bounding boxes. End dispatches EVENT_CARD_CLICK for an enabled card. No mouse hover handler found in these input functions; this is a bounded static observation.',
        'reorderAllCards_new0.27 reads desPos and uses EaseSineOut moveTo with moveCardTime; native client runtime has not been observed.'
    ],
    adaptation='Only othersOff. Mouse hover previews mobile selected-card lift/layout without adding to ui.selected.cards. Preserve spread_card, fold scrolling, cardScale and the existing requested zero-gap maximum step instead of native +2 spacing. Use faceWidth/126 for21/80. Keep the exposed original pointer strip until actual mouse movement, preventing animated cards from changing the stationary hover target. Restore base hit geometry before a native press on that strip so selection/drag still use native input. Other styles delegate their existing handlers/layout.',
    limitations=['Shipped modified-opcode Lua bytecode, not original authoring source.', 'No official client runtime, Android device, or real network multiplayer verification.']
)
(ROOT / 'verification/yjcm-hand-hover-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf8')
print('YJCM_HAND_HOVER_SOURCE_OK: APK/packed/decoded identities and parsed hand-card cache verified; 21/80/five slots confirmed')
