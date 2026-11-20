"""核对当前APK与已有解密缓存，仅提取官方 moonTimeBar 的两个图集裁片。"""
import hashlib
import json
from pathlib import Path
import plistlib
import runpy
import zipfile

ROOT = Path(__file__).resolve().parents[1]
digest = lambda data: hashlib.sha256(data).hexdigest()
extractor = runpy.run_path(str(ROOT / "verification/extract-yjcm-dialog-progress.py"))
reader = runpy.run_path(str(ROOT.parent / "犟0/tools/read-official-lua.py"))["Chunk"]
cache = ROOT / ".codex-tmp/yjcm-buttons"
apk = Path("D:/yoka_sgs.x_g_android_6.4.5.apk")
with apk.open("rb") as stream:
    apk_hash = hashlib.file_digest(stream, "sha256").hexdigest()
assert apk_hash == "12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202"
with zipfile.ZipFile(apk) as archive:
    assert archive.read("assets/res/lib/game.zip") == (cache / "game.packed").read_bytes()
    plist_path = "assets/res/new/tex/plist/gameinfo.plist"
    metadata = archive.read(plist_path)
    frames = plistlib.loads(metadata)["frames"]
    texture_path = plist_path[:-6] + ".pvr.ccz"
    rgb, alpha = archive.read(texture_path), archive.read(texture_path + "@alpha")
    assets = []
    for name in ["newTimeBar.png", "newTimeBarBg.png"]:
        image = extractor["extract"](frames[name], extractor["pvr"](rgb), extractor["pvr"](alpha))
        target = ROOT / "image/ui/progress/xinsha" / name
        image.save(target)
        assets.append(dict(frame=name, metadata=frames[name], size=list(image.size), destination=target.relative_to(ROOT).as_posix(), sha256=digest(target.read_bytes())))
game_bytes = (cache / "game.zip").read_bytes()
assert digest(game_bytes) == "23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28"
modules = []
with zipfile.ZipFile(cache / "game.zip") as game:
    for name, functions in [
        ("app.view.game.GameSelfSeatUi", ["0.109", "0.111", "0.120", "0.130"]),
        ("app.view.game.GameTimeBar", ["0.2", "0.3"]),
        ("app.ui.TimeBar", ["0.3", "0.4", "0.7", "0.9"]),
    ]:
        data = game.read(name)
        chunk = reader(data)
        chunk.function()
        assert chunk.p == len(data)
        modules.append(dict(member=name, sha256=digest(data), functions=[row for row in chunk.rows if row["id"] in functions]))
report = dict(
    client=dict(version="6.4.5", apk_sha256=apk_hash, packed_cache_matches_apk=True, decoded_sha256=digest(game_bytes)),
    rea_evidence=["ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965", "ev_c7da21990fb996ad65659cc96236beb62046547ed190e643d4ecee1c420cdadf"],
    source=dict(plist=plist_path, plist_sha256=digest(metadata), texture=texture_path, texture_sha256=digest(rgb), alpha_sha256=digest(alpha)),
    assets=assets, modules=modules,
    observations=[
        "GameSelfSeatUi.createChildren 0.120 PC288..306 constructs moonTimeBar with newTimeBar.png/newTimeBarBg.png at CENTER_BOTTOM(width/2,195). The fill is520x26 and background522x28; this control uses GameTimeBar/UILoadingBar, not Spine.",
        "GameSelfSeatUi.onReverseTime 0.130 hides timeBar and moonTimeBarLine, calls moonTimeBar:setTimeout(0,seat:getCountdownReverseMaxTime()), then shows moonTimeBar. hideTimeBar0.111 hides all three controls.",
        "TimeBar.createChildren0.9 builds UILoadingBar using barFrame and viewRect(width,height). TimeBar.setPercent0.4 delegates to the loading bar. The separate SF_eff_paiju_daojishi Spine is referenced by AutoChessPhaseBtnNode, not this moonTimeBar.",
    ],
    adaptation=[
        "Only progress preset4 (一将成名进度条) gains a second stage. Keep existing normal and dialog dimensions, position, original449-tick first stage and configured interval. Crop the original moon fill without compressing the remaining gradient; PNG pixels are not resized or recolored on disk.",
        "User-requested behavior: start full moonTimeBar automatically after first stage, consume0.2 of the previous1-unit step per interval, clamp at exactly5% remaining, stop its interval but retain its DOM. This speed/clamp is a local adaptation, not official timing.",
        "Existing operation completion, game end, replacement and isolated dispose still remove the bar. Other progress presets and AI seat bars keep their original lifecycle.",
    ],
    scope="Static official Lua bytecode/atlas inspection and separate local browser verification; no official Android runtime comparison or complete Electron match claim.",
)
(ROOT / "verification/yjcm-moon-progress-source.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
print(json.dumps(dict(assets=assets, modules=len(modules)), ensure_ascii=False))
