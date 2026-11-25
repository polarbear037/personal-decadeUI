"""重验当前 APK 提示表及多阶段方法；只读解析 Lua，不执行官方客户端。"""
import hashlib
import json
from pathlib import Path
import re
import runpy
import zipfile

ROOT = Path(__file__).resolve().parents[1]
reader = runpy.run_path(str(ROOT.parent / "烽火连天/tools/lua51.py"))
sha = lambda data: hashlib.sha256(data).hexdigest()
cache = ROOT / ".codex-tmp/yjcm-buttons"
with zipfile.ZipFile("D:/yoka_sgs.x_g_android_6.4.5.apk") as apk:
    for name in ["game", "config"]:
        assert apk.read(f"assets/res/lib/{name}.zip") == (cache / f"{name}.packed").read_bytes()
assert sha((cache / "game.zip").read_bytes()) == "23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28"
assert sha((cache / "config.zip").read_bytes()) == "954227244cf413b393d4394848ae218b46707c2e340ead266e7e21f85966b0d2"

def parse(archive, name):
    data = archive.read(name)
    chunk = reader["Chunk"](data)
    chunk.function()
    assert chunk.p == len(data)
    return data, chunk.rows

local = [json.loads(line.strip().rstrip(",")) for line in (ROOT / "src/ui/xinshaPromptData.js").read_text(encoding="utf-8").splitlines() if line.startswith("\t{")]
with zipfile.ZipFile(cache / "game.zip") as game, zipfile.ZipFile(cache / "config.zip") as config:
    spell_bytes, rows = parse(game, "app.skill.spell")
    spells = list(reader["literals"](rows)["Spell"].values())
    desc_bytes, rows = parse(config, "app.config.spell_desc")
    descriptions = {int(r["SpellId"]): r for r in reader["literals"](rows)["SpellDesc"].values()}
    expected = [{"id": int(r["SpellId"]), "name": r.get("Name", ""), "type": int(r.get("SkillType", 0)), "className": r.get("Class", "").split(".")[-1],
                 "description": descriptions.get(int(r["SpellId"]), {}).get("Desc", ""),
                 "prompts": {key: r[key] for key in ["ActiveTip", "AskTip", "DefensiveTip", "PassiveTip"] if r.get(key)}} for r in spells]
    assert local == expected, "Local prompt corpus differs from the selected APK"
    multi = [r for r in spells if r.get("SkillType") == 2 and any(re.search(r"[|;]", r.get(key, "")) for key in ["ActiveTip", "AskTip", "DefensiveTip", "PassiveTip"])]
    modules = []
    for name in sorted({"app.skill." + r["Class"] for r in multi if r.get("Class")}):
        if name not in game.namelist():
            continue
        payload, rows = parse(game, name)
        top = rows[0]
        functions = {r["id"]: r for r in rows}
        registers = {}
        methods = []
        for w in top["code"]:
            op, a, b, c, bx = w & 63, w >> 6 & 255, w >> 23 & 511, w >> 14 & 511, w >> 14
            if op == 7:
                registers[a] = functions[f"0.{bx}"]
            elif op == 30 and b >= 256 and c in registers and top["constants"][b - 256] in ["getActiveTip", "getAskTip", "getDefensiveTip"]:
                f = registers[c]
                method = {"method": top["constants"][b - 256], "function": f["id"], "line": f["line"], "last_line": f["last"], "constants": f["constants"]}
                if name.endswith(".LieXiang"):
                    method["code"] = f["code"]
                methods.append(method)
        modules.append({"member": name, "sha256": sha(payload), "methods": methods})

report = {
    "client": {"version": "6.4.5", "apk_sha256": "12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202", "packed_cache_matches_apk": True},
    "rea_evidence": ["ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965", "ev_9c5d0ada064eb4df0e69550e647832f45a7c91a83828969b6e7b0219840bc0e9"],
    "corpus": {"entries": len(local), "exact_match": True, "spell_module_sha256": sha(spell_bytes), "description_module_sha256": sha(desc_bytes),
               "multi_skill_entries": len(multi), "active_multibranch": sum(bool(re.search(r"[|;]", r.get("ActiveTip", ""))) for r in multi)},
    "modules": modules,
    "observations": ["LieXiang.getActiveTip splits ActiveTip on |: role operation uses branch3 and getMaxCardCnt; selected draw count uses branch2 and Chinese getMaxTargetCnt, prefixed with TXT_SKILL_MAX above one; initial selection uses branch1.",
                     "Many other packaged skills also split multi-stage prompt fields. Copying a field without selecting its stage cannot synchronize their live prompts."],
    "adaptation": "Use only a unique branch matching actual card/target selection. Fill a count only when the placeholder is explicitly a selection count. Preserve native prompts for ambiguous branches, unknown protocol parameters and custom constraints; these are not claimed to be official matches.",
    "limitations": ["Static packaged configuration and Lua bytecode; official Android runtime was not observed.", "Method inventories identify branch-bearing code, not a complete semantic reconstruction of every skill."]
}
(ROOT / "verification/xinsha-prompt-stages-source.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps({**report["corpus"], "modules": len(modules), "methods": sum(len(m["methods"]) for m in modules)}))
