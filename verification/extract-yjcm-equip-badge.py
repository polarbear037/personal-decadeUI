"""核对当前 APK/解码缓存，提取装备入手的原版牌底；不执行客户端。"""
import hashlib
import json
import plistlib
import re
import runpy
import zipfile
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()


def main():
    apk_path = Path('D:/yoka_sgs.x_g_android_6.4.5.apk')
    cache = ROOT / '.codex-tmp/yjcm-buttons'
    assert sha(apk_path.read_bytes()) == '12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202'
    game_bytes = (cache / 'game.zip').read_bytes()
    assert sha(game_bytes) == '23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'
    decode = runpy.run_path(str(ROOT / 'verification/extract-yjcm-target-effects.py'))['decode']
    lua = runpy.run_path(str(ROOT.parent / '犟0/tools/read-official-lua.py'))
    with zipfile.ZipFile(apk_path) as apk:
        packed = apk.read('assets/res/lib/game.zip')
        assert packed == (cache / 'game.packed').read_bytes()
        member = 'assets/res/new/tex/plist/gameinfo.plist'
        plist_bytes = apk.read(member)
        frame = plistlib.loads(plist_bytes)['frames']['card_text_bg.png']
        texture = member[:-6] + '.pvr.ccz'
        color, alpha = apk.read(texture), apk.read(texture + '@alpha')
        atlas = decode(color)
        atlas.putalpha(decode(alpha).getchannel('R'))
        x, y, w, h = map(int, re.findall(r'-?\d+', frame['frame']))
        assert not frame['rotated'] and frame['sourceSize'] == '{130,61}'
        output = ROOT / 'image/ui/card/xinsha/card_text_bg.png'
        atlas.crop((x, y, x + w, y + h)).save(output)
    modules = []
    selected = {
        'app.skill.selector.card.CardSelector': ['0.40'],
        'app.module.game.seat.PlayerSeat': ['0.211'],
        'app.module.game.card.Card': ['0.50', '0.52'],
        'app.view.game.card.CardUiNew': ['0.41', '0.42'],
        'app.cfg.CfgStyleLabel': ['0'],
    }
    with zipfile.ZipFile(cache / 'game.zip') as game:
        for name, ids in selected.items():
            data = game.read(name)
            chunk = lua['Chunk'](data)
            chunk.function()
            assert chunk.p == len(data)
            rows = [row for row in chunk.rows if row['id'] in ids]
            if name == 'app.cfg.CfgStyleLabel':
                style = lua['literals'](chunk.rows)['FZBW_255_255_255_22_CardText']
                rows = [dict(id='0', style=style, pc_range=[6080, 6112],
                             code=rows[0]['code'][6079:6112], constants=rows[0]['constants'])]
            modules.append(dict(member=name, sha256=sha(data), prototypes=rows))
        assert '已装备' in modules[0]['prototypes'][0]['constants']
    report = dict(
        client=dict(version='6.4.5', apk_sha256=sha(apk_path.read_bytes()), member='assets/res/lib/game.zip',
                    packed_sha256=sha(packed), decoded_sha256=sha(game_bytes)),
        rea_evidence=['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965',
                      'ev_9c5d0ada064eb4df0e69550e647832f45a7c91a83828969b6e7b0219840bc0e9'],
        source=dict(plist=member, plist_sha256=sha(plist_bytes), texture=texture,
                    texture_sha256=sha(color), alpha_sha256=sha(alpha), frame=frame),
        destination=dict(path=output.relative_to(ROOT).as_posix(), sha256=sha(output.read_bytes()), size=[w, h]),
        conversion='ETC1 color + ETC1 alpha red channel; original plist crop; no resizing/recoloring',
        modules=modules,
        observations=[
            'CardSelector 0.40 PC98..139 collects allowable equipped cards not already in hand, adds equip visual copies, sets their cardText to 已装备 and enables selection.',
            'Card.setCardText dispatches TEXT_CHANGED; CardUiNew.updateCardTextLabel calls setCardTextLabel(getCardText()).',
            'CardUiNew.setCardTextLabel uses card_text_bg.png CENTER_BOTTOM(63,0) on the 126x174 card, layer2 of fadeNode. Label CENTER(63,28.5), dimensions120x60.',
            'CfgStyleLabel PC6080..6112: fnt/fzbw.ttf, size22, white255/255/255, outline63/51/24, pixel1, horizontal/vertical center.',
        ],
        layout=dict(card=[126,174], background=[130,61], background_bottom_center=[63,0],
                    label_center_in_background=[63,28.5], label_center_in_card_bottom_up=[61,28.5],
                    font='fnt/fzbw.ttf', size=22, color='#ffffff', outline='#3f3318', outline_width=1),
        adaptation='Reuse existing equip-hand-equipped node and equipHand copy selection/cleanup. Only body[data-style=othersOff] uses this asset; percentages map source geometry to existing108x150 card, which keeps native cardScale.',
        limitations=['Static shipped bytecode/artwork; no official-client runtime comparison.',
                     'Browser fixture, Electron game, physical Android and real online play are distinct validation scopes.'],
    )
    # 样式表只保留聚焦指令及其实际引用常量，避免复制整份无关配置。
    style_row = modules[-1]['prototypes'][0]
    constants = style_row.pop('constants')
    style_row['referenced_constants'] = {
        str(i): constants[i] for i in sorted({
            index for word in style_row['code']
            for index in ([word >> 14] if word & 63 in [1, 5] else
                          [v - 256 for v in [(word >> 23) & 511, (word >> 14) & 511] if v >= 256])
            if index < len(constants)
        })
    }
    (ROOT / 'verification/yjcm-equip-badge-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf8')
    print(json.dumps(report['destination'], ensure_ascii=False))


if __name__ == '__main__':
    main()
