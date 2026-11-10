"""还原 MuMu LayaCache 的分组配置，只导出公开技能提示、动画类别及来源摘要。"""
import argparse
import hashlib
import io
import json
import pathlib
import re
import zipfile


def extract(cache, root):
    rows = json.loads((cache / "index.json").read_text(encoding="utf-8"))
    configs = {}
    sources = []
    for row in rows:
        if row["resource"] not in ["/res/config/list6.sgs", "/res/config/list7.sgs"]:
            continue
        raw = (cache / pathlib.Path(row["host"]).name).read_bytes()
        if raw[:4] != bytes.fromhex("ffee8877"):
            raise ValueError("Unknown Laya cache header")
        with zipfile.ZipFile(io.BytesIO(raw[48:])) as archive:
            for name in archive.namelist():
                package = json.loads(archive.read(name))
                for key in ["cha_spell", "cha_spellextend"]:
                    if key in package:
                        configs[key] = package[key]
                        sources.append({"config": key, "resource": row["resource"], "member": name, "cache_sha256": hashlib.sha256(raw).hexdigest(), "package_sha256": hashlib.sha256(raw[48:]).hexdigest(), "member_sha256": hashlib.sha256(archive.read(name)).hexdigest()})
    spells = configs["cha_spell"]
    aliases = {field["Short"]: field["Long"] for field in spells["abbreviation"]["field"] if "Short" in field}
    methods_file = cache / "class-map.json"
    methods = json.loads(methods_file.read_text(encoding="utf-8")) if methods_file.exists() else None
    card_branches = set()
    if methods:
        for name, symbol in methods["reg"].items():
            seen = set()
            while symbol in methods["classes"] and symbol not in seen:
                seen.add(symbol)
                current = methods["classes"][symbol]
                getter = next((method for method in current["methods"] if method["kind"] == "get" and method["name"] == "ActiveTip"), None)
                if getter:
                    if re.search(r"CardSelector\.SelectComplete\?\w+\[1\]:\w+\[0\]", getter["source"]):
                        card_branches.add(name)
                    break
                symbol = current.get("parent")
    entries = []
    prompt_fields = set()
    for raw in spells["GameSpells"]["spell"] + spells["GameSpells"].get("spell_H5", []):
        item = {aliases.get(key, key): value for key, value in raw.items()}
        prompts = {key: value for key, value in item.items() if isinstance(value, str) and value and (re.search(r"Tips?$", key) or key.startswith("Operation") or key == "connontip")}
        prompt_fields.update(prompts)
        entry = {"id": item["id"], "name": item.get("name", ""), "className": item.get("Class", ""), "type": item.get("SkillType", 2), "description": item.get("desc", ""), "prompts": prompts}
        entry["aniType"] = int(item.get("AniType", 0) or 0)
        if entry["className"] in card_branches:
            entry["activeBranch"] = "cards-complete"
        entries.append(entry)
    supplement = configs["cha_spellextend"]
    lines = ["// 从官方运行缓存还原的完整技能/卡牌提示表；来源见 verification/official-skill-prompt-source.json。", "const officialSkillPrompts = ["]
    lines.extend("\t" + json.dumps(entry, ensure_ascii=False, separators=(",", ":")) + "," for entry in entries)
    lines.append("];\n\nexport { officialSkillPrompts };\n")
    (root / "src/ui/officialSkillPromptData.js").write_text("\n".join(lines), encoding="utf-8")
    # 触发短提示的 triggerID 属于官方协议，完整保留，不把它当成本体 triggername。
    detail_rows = supplement.get("spelltip", [])
    details = {key: supplement[key] for key in ["spelldesc", "GameSpells"] if key in supplement}
    details["spelltip"] = [entry for entry in detail_rows if entry.get("desc")]
    lines = ["// 官方触发短提示及技能描述分支；triggerID 保留官方含义，省略没有正文的空占位。", "const officialSkillPromptDetails = " + json.dumps(details, ensure_ascii=False, indent="\t") + ";", "\nexport { officialSkillPromptDetails };\n"]
    (root / "src/ui/officialSkillPromptDetails.js").write_text("\n".join(lines), encoding="utf-8")
    branch_sources = []
    if methods:
        for name, symbol in methods["reg"].items():
            current = methods["classes"].get(symbol, {})
            selected = [method for method in current.get("methods", []) if method["kind"] == "get" and re.search(r"Tip", method["name"])]
            if selected:
                branch_sources.append({"className": name, "symbol": symbol, "parent": current.get("parent"), "getters": selected})
    evidence = {"package": "com.gameabc.sgspad", "installed_version": "4.0.1", "apk_reference_version": "4.0.2", "source_kind": "user-supplied-emulator-cache", "sources": sources, "skill_card_records": len(entries), "records_with_prompts": sum(bool(entry["prompts"]) for entry in entries), "prompt_strings": sum(len(entry["prompts"]) for entry in entries), "prompt_fields": sorted(prompt_fields), "trigger_detail_records": len(detail_rows), "trigger_detail_strings": len(details["spelltip"]), "source_getter_classes": len(branch_sources), "branch_sources": branch_sources, "coverage": {"data": "complete-within-selected-configuration", "runtime": "noname adapters use verified name/class/description mappings; unresolved branches retain native prompts", "limitations": ["Hot-update cache and the requested APK have different source identities.", "Official trigger IDs and arbitrary protocol branch parameters are not interchangeable with noname event properties.", "Poker-only spellPuKe is outside noname card-game skill scope."]}}
    evidence["rea_inventory_evidence"] = "ev_e64f86e9c492910011b10dd6e8d41b3c6824fdaf5622b44bbfbec0ebdf39bda0"
    runtime_script = cache / "runtime-main.js"
    if runtime_script.exists():
        evidence["runtime_script_sha256"] = hashlib.sha256(runtime_script.read_bytes()).hexdigest()
    (root / "verification/official-skill-prompt-source.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({key: evidence[key] for key in ["skill_card_records", "records_with_prompts", "prompt_strings", "trigger_detail_records", "trigger_detail_strings", "source_getter_classes"]}))


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("cache", type=pathlib.Path)
    args = parser.parse_args()
    extract(args.cache, pathlib.Path(__file__).resolve().parents[1])
