"""从指定 APK 的 Laya 主脚本提取提示常量；只写扩展内的指定输出目录。"""
import argparse
import ast
import hashlib
import io
import json
import pathlib
import re
import zipfile


def extract(apk_path, root):
    with zipfile.ZipFile(apk_path) as apk:
        candidates = []
        for entry in apk.infolist():
            if "/cache/" not in entry.filename:
                continue
            with apk.open(entry) as stream:
                header = stream.read(4)
            if header != b"PK\x03\x04":
                continue
            with zipfile.ZipFile(io.BytesIO(apk.read(entry))) as nested:
                if "main.sgs" in nested.namelist():
                    candidates.append((entry.filename, nested.read("main.sgs")))
        if len(candidates) != 1:
            raise ValueError(f"Expected one main.sgs, found {len(candidates)}")
        member, source_bytes = candidates[0]
        source = source_bytes.decode("utf-8-sig")
        symbol = re.search(r'(\w+)\s*,\s*"DealCard_Opt_Msg"\s*,', source).group(1)
        constants = {}
        literal = r'''("(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*')'''
        pattern = re.compile(r'\w+\(' + re.escape(symbol) + ',' + literal + ',' + literal + r'\)')
        def decode_literal(value):
            return json.loads(value) if value.startswith('"') else ast.literal_eval(value.replace(r'\/', '/'))
        for match in pattern.finditer(source):
            constants[decode_literal(match[1])] = decode_literal(match[2])
        selection = re.compile(r'^(?:SKILL_|Skill_|Game_(?:SelfSeat|SelectCard|Ask|Seat)|PinDian_|(?:DealCard|DisCard|Wxkj|Select)_Opt_Msg|TRIGGER_MULTISPELL|Select.*_Tips|.*_(?:Skill_Tips|Select_Tips|Opt_tips))')
        prompts = {key: value for key, value in constants.items() if selection.search(key)}
        # 额外收录操作提示用到的基础动作、牌名与通用模板，不收集账户/商城文案。
        for key, value in constants.items():
            if re.match(r'^(?:SKILL_USE|MOVE_CARD_(?:DISCARD|GET|GIVE|SHOW)|Select_Card_Tips|TIESUOLIANHUAN_ActiveTips[1-4]|MANY_SHA|MANY_SHAN)$', key):
                prompts[key] = value
        output = "// 自动提取自 APK main.sgs；通过 verification/extract-official-prompts.py 更新。\n"
        output += "const officialPromptText = " + json.dumps(prompts, ensure_ascii=False, indent="\t") + ";\n\nexport { officialPromptText };\n"
        (root / "src/ui/officialPromptText.js").write_text(output, encoding="utf-8")
        with open(apk_path, "rb") as stream:
            digest = hashlib.file_digest(stream, "sha256").hexdigest()
        evidence = {
            "apk_sha256": digest,
            "member": member + "!main.sgs",
            "source_sha256": hashlib.sha256(source_bytes).hexdigest(),
            "constant_symbol": symbol,
            "constant_count": len(constants),
            "prompt_constant_count": len(prompts),
            "rea_inventory_evidence": "ev_edcf0b916ee34807938588035c3ed96b6f776080202e0b1ddb6b950602425eab",
            "style": {"font": "FZLBGBK", "font_size": 30, "color": "#f9ecce", "stroke": 4, "stroke_color": "#533d21", "multiselect_stroke_color": "#582b0c", "letter_spacing": 1, "leading": 4, "align": "center", "bold": False},
            "semantic_colors": {"player": "#E4A840", "skill": "#FFD800", "card": "#FFD800", "number": "#FFE073", "discard": "#FF5050", "gain": "#91F47E"},
            "font_member": "assets/cache/https.__web.sanguosha.com_220_sgsolApp/d54ce33c",
            "font_resource_url": "/res/assets/fontApp/FZLBGBK.ttf",
            "resource_hash_rule": "cache member name = lowercase hex CRC32 of resource path including leading slash",
            "font_sha256": hashlib.sha256(apk.read("assets/cache/https.__web.sanguosha.com_220_sgsolApp/d54ce33c")).hexdigest(),
            "observed": ["Fvi.createChild: Qx.Create(30,#f9ecce,null,400,39,false,4,#533d21,center,middle)", "dOi: multi-select text stroke #582b0c", "Qx.Create: mobile font hB.SemiBold, letterSpacing=1, leading=4", "eH: semantic color getters", "TZ: FileName=cha_spell; skills load ActiveTip/AskTip/PassiveTip/DefensiveTip from configuration"],
            "limitations": ["Static artifact inspection; APK runtime not executed.", "Catalog contains packaged battle UI constants, not the complete cha_spell skill configuration.", "No speculative pairing of official numeric skill IDs with noname skill IDs.", "Fallback wording and selection progress come from noname events; they are not claimed as official strings."],
        }
        assert hashlib.sha256((root / "ui/assets/fonts/FZLBGBK.ttf").read_bytes()).hexdigest() == evidence["font_sha256"]
        (root / "verification/official-prompt-source.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(json.dumps({"prompts": len(prompts), "apk_sha256": digest, "font_verified": True}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("apk", type=pathlib.Path)
    args = parser.parse_args()
    extract(args.apk, pathlib.Path(__file__).resolve().parents[1])
