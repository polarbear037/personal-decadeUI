"""按 OL 原始 atlas 复制操作按钮；源文件和完整解包脚本不加入项目。"""
import hashlib
import json
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parent.parent
source = Path("G:/4.0.2解包/res/assets/game")
atlas = json.loads((source / "gameBase.atlas").read_text(encoding="utf-8-sig"))
sheet = Image.open(source / "gameBase.png").convert("RGBA")
assets = []
for name in ["seatui_btns_allselect.png", "seatui_btns_confirm.png"]:
    frame = atlas["frames"][name]["frame"]
    x, y, w, h = [frame[key] for key in ["x", "y", "w", "h"]]
    cropped = sheet.crop((x, y, x + w, y + h))
    relative = "ui/assets/lbtn/OL_line/uibutton/" + name
    target = root / relative
    if target.exists() and Image.open(target).convert("RGBA").tobytes() != cropped.tobytes():
        raise ValueError("Existing asset differs from official source: " + relative)
    if not target.exists():
        cropped.save(target)
    assets.append({"source": "res/assets/game/gameBase.atlas#" + name, "frame": frame,
                   "target": relative, "pixel_equal": True,
                   "sha256": hashlib.sha256(target.read_bytes()).hexdigest()})
evidence = {
    "source": "OL Android 4.0.2, main.sgs!main.sgs",
    "source_sha256": "dfd781ab2ed667c2576da52f77170244704a525ab28daf3139a2c1a50e4440ad",
    "rea_evidence": "ev_a17cd5e48c18714374afec45fbee58f0ad4f3d5a43fa075f8419c0dc364eaddd",
    "classes": ["Fvi.createChild", "Ors.Update", "dOi.ShowButton"],
    "official": {"recast": {"center": [109, 40], "size": [142, 52], "fontSize": 30, "color": "#7c2d06"},
                 "ignore": {"center": [900, 40], "size": [177, 63], "fontSize": 30, "color": "#FEEFCF"},
                 "ok": {"center": [360, 38], "size": [207, 72]},
                 "cancel": {"center": [650, 40], "size": [177, 63]}},
    "adaptation": "Scale new buttons and center offsets by current confirm width / 207; preserve native confirm/cancel layout.",
    "bindings": {"recast": "ui.click.skill('_recasting'), native selection and ui.click.ok",
                 "ignore": "original ui.tempnowuxie DOM, custom callback and _origin",
                 "self_target": "extension override of lib.filter.wuxieSwap, retain skip for other targets"},
    "assets": assets,
}
(root / "verification/online-action-buttons-source.json").write_text(json.dumps(evidence, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(assets, ensure_ascii=False))
