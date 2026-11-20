"""从已核对 APK 的本地 Lua 缓存提取提示；只解析静态字面量，不执行客户端。"""
import argparse
import hashlib
import json
from pathlib import Path
import runpy
import zipfile

ROOT = Path(__file__).resolve().parents[1]


def digest(data):
    return hashlib.sha256(data).hexdigest()


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--apk', required=True)
    parser.add_argument('--lua-reader', required=True)
    args = parser.parse_args()
    reader = runpy.run_path(args.lua_reader)
    cache = ROOT / '.codex-tmp/yjcm-buttons'
    with zipfile.ZipFile(args.apk) as apk:
        for name in ['game', 'config']:
            assert apk.read(f'assets/res/lib/{name}.zip') == (cache / f'{name}.packed').read_bytes()
        fonts = []
        for name in ['fzbw.ttf', 'FZSHENGSKSJW.ttf']:
            member = 'assets/res/fnt/' + name
            target = ROOT / 'ui/assets/fonts' / name
            assert apk.read(member) == target.read_bytes()
            fonts.append({'member': member, 'destination': target.relative_to(ROOT).as_posix(), 'sha256': digest(target.read_bytes())})
    modules = []

    def read(archive, name):
        data = archive.read(name)
        chunk = reader['Chunk'](data)
        chunk.function()
        assert chunk.p == len(data)
        modules.append({'archive_member': 'assets/res/lib/' + Path(archive.filename).name, 'member': name, 'sha256': digest(data)})
        return chunk.rows

    with zipfile.ZipFile(cache / 'game.zip') as game, zipfile.ZipFile(cache / 'config.zip') as config:
        spells = reader['literals'](read(game, 'app.skill.spell'))['Spell']
        descriptions = reader['literals'](read(config, 'app.config.spell_desc'))['SpellDesc']
        descriptions = {int(row['SpellId']): row for row in descriptions.values()}
        texts = reader['literals'](read(game, 'app.cfg.CfgText'))['Content']
        for module in ['app.skill.Skill', 'app.module.game.spell.SpellData', 'app.module.game.seat.PlayerSeat', 'app.view.game.GameSelfSeatUi', 'app.view.game.GameButtonBar', 'app.skill.normal.jinnang.WuXieKeJi']:
            read(game, module)
        entries = []
        for row in spells.values():
            sid = int(row['SpellId'])
            desc = descriptions.get(sid, {})
            entries.append({'id': sid, 'name': row.get('Name', ''), 'type': int(row.get('SkillType', 0)), 'className': row.get('Class', '').split('.')[-1], 'description': desc.get('Desc', ''), 'prompts': {key: row[key] for key in ['ActiveTip', 'AskTip', 'DefensiveTip', 'PassiveTip'] if row.get(key)}})
        target = ROOT / 'src/ui/xinshaPromptData.js'
        target.write_text('// 一将成名 6.4.5 静态提示，来源见 verification/yjcm-prompt-source.json。\nconst xinshaPromptEntries = [\n' + ',\n'.join('\t' + json.dumps(row, ensure_ascii=False, separators=(',', ':')) for row in entries) + '\n];\nconst xinshaPhasePrompt = ' + json.dumps(texts['TXT_Deal_Card'], ensure_ascii=False) + ';\nexport { xinshaPromptEntries, xinshaPhasePrompt };\n', encoding='utf-8')
    report = {'client': {'version': '6.4.5', 'apk_sha256': digest(Path(args.apk).read_bytes()), 'packed_cache_matches_apk': True, 'game_decoded_sha256': digest((cache / 'game.zip').read_bytes()), 'config_decoded_sha256': digest((cache / 'config.zip').read_bytes())}, 'rea_evidence': ['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965', 'ev_9c5d0ada064eb4df0e69550e647832f45a7c91a83828969b6e7b0219840bc0e9'], 'modules': modules, 'entries': len(entries), 'destination': target.relative_to(ROOT).as_posix(), 'sha256': digest(target.read_bytes()), 'observations': ['GameSelfSeatUi.getDealCardOptMsg uses CfgText.TXT_Deal_Card.', 'Skill.getActiveTip/getAskTip/getDefensiveTip read spellCfg; transformTip substitutes Source/Target/Skill.', 'SpellData.getColorName uses #FFD979 for equipment and #A3F030 with FZSHENGSKSJW at size32 for skills.', 'PlayerSeat.getSeatNameWithColor uses #FFE100.', 'GameButtonBar.createChildren: RichLabel fnt/fzbw.ttf, size28, #FEF0C9, charSpace0, outline 1,#614131; CENTER_BOTTOM at width/2,height+5.'], 'adaptation': 'Match names with description/version evidence; ambiguous versions, unknown branch parameters, custom operation prompts and unmatched templates preserve native text. No protocol SkillId or arbitrary branch parameter is inferred from a noname event. Online renderer remains separate.', 'scope': 'Static packaged Lua and configuration; official runtime, live Electron, mobile and multiplayer not observed.'}
    report['fonts'] = fonts
    (ROOT / 'verification/yjcm-prompt-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    print(json.dumps({'entries': len(entries), 'bytes': target.stat().st_size}))


if __name__ == '__main__':
    main()
