"""从已确认的一将成名 APK 提取指向说明窗素材，保留原始尺寸和 alpha。"""
import argparse
import hashlib
import json
from pathlib import Path
import plistlib
import re
import sys
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
NAMES = {"new_skill_bg.png", "game_playinfo_skillbg.png", "cmn_activite_skill_bg.png", "cmn_passive_skill_bg.png"}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--apk", required=True)
    parser.add_argument("--dependency-path", required=True)
    args = parser.parse_args()
    sys.path.insert(0, args.dependency_path)
    import texture2ddecoder
    import struct
    import zlib

    def digest(data):
        return hashlib.sha256(data).hexdigest()

    def decode(data):
        if data[:4] == b"CCZ!":
            data = zlib.decompress(data[16:])
        version, flags, fmt, space, channel, height, width, depth, surfaces, faces, mips, meta = struct.unpack_from("<IIQ9I", data)
        if version != 0x03525650 or fmt != 6:
            raise ValueError(f"Unsupported PVR format: {fmt}")
        return Image.frombytes("RGBA", (width, height), texture2ddecoder.decode_etc1(data[52 + meta:], width, height), "raw", "BGRA")

    output = ROOT / "image/ui/tooltip/xinsha"
    output.mkdir(parents=True, exist_ok=True)
    records = []
    with zipfile.ZipFile(args.apk) as archive:
        for member in archive.namelist():
            if not member.startswith("assets/res/new/tex/plist/") or not member.endswith(".plist"):
                continue
            plist_data = archive.read(member)
            frames = plistlib.loads(plist_data).get("frames", {})
            selected = NAMES.intersection(frames)
            if not selected:
                continue
            texture = member[:-6] + ".pvr.ccz"
            color, alpha = archive.read(texture), archive.read(texture + "@alpha")
            atlas = decode(color)
            atlas.putalpha(decode(alpha).getchannel("R"))
            for name in sorted(selected):
                frame = frames[name]
                x, y, w, h = map(int, re.findall(r"-?\d+", frame["frame"]))
                rotated = frame.get("rotated", False)
                image = atlas.crop((x, y, x + (h if rotated else w), y + (w if rotated else h)))
                if rotated:
                    image = image.transpose(Image.Transpose.ROTATE_90)
                size = tuple(map(int, re.findall(r"-?\d+", frame["sourceSize"])))
                ox, oy = map(int, re.findall(r"-?\d+", frame["offset"]))
                canvas = Image.new("RGBA", size)
                canvas.paste(image, ((size[0] - image.width) // 2 + ox, (size[1] - image.height) // 2 - oy))
                target = output / name
                canvas.save(target)
                records.append({"member": member, "plist_sha256": digest(plist_data), "texture_sha256": digest(color), "alpha_sha256": digest(alpha), "frame": name, "metadata": frame, "destination": target.relative_to(ROOT).as_posix(), "sha256": digest(target.read_bytes()), "size": size})
        member = "assets/res/new/ui/bg/item_tips_bg.pvr.ccz"
        color, alpha = archive.read(member), archive.read(member + "@alpha")
        image = decode(color)
        image.putalpha(decode(alpha).getchannel("R"))
        target = output / "item_tips_bg.png"
        image.save(target)
        records.append({"member": member, "texture_sha256": digest(color), "alpha_sha256": digest(alpha), "destination": target.relative_to(ROOT).as_posix(), "sha256": digest(target.read_bytes()), "size": image.size})
        for name in ["fzbw.ttf", "FZSHENGSKSJW.ttf"]:
            target = ROOT / "ui/assets/lbtn/yijiang/fnt" / name
            data = archive.read("assets/res/fnt/" + name)
            assert target.read_bytes() == data, f"Existing official font differs: {name}"
        assert NAMES == {r.get("frame") for r in records if r.get("frame")}
        with open(args.apk, "rb") as source:
            apk_hash = hashlib.file_digest(source, "sha256").hexdigest()
        report = {"client": {"version": "6.4.5", "apk_sha256": apk_hash, "game_member": "assets/res/lib/game.zip", "decoded_game_sha256": digest((ROOT / ".codex-tmp/yjcm-buttons/game.zip").read_bytes()), "packed_cache_matches_apk": archive.read("assets/res/lib/game.zip") == (ROOT / ".codex-tmp/yjcm-buttons/game.packed").read_bytes()}, "rea_evidence": ["ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965", "ev_229e54696ec7e1268eb03d4586c6bfe650ee8130405d6b2810fec6e459a49243"], "assets": records, "conversion": "ETC1 color + alpha red channel, undo atlas rotation and restore sourceSize/offset; no resizing or recoloring", "scope": "Static shipped Lua bytecode and assets; official client runtime comparison not performed."}
    report_path = ROOT / "verification/yjcm-tooltip-source.json"
    existing = json.loads(report_path.read_text("utf-8")) if report_path.exists() else {}
    report_path.write_text(json.dumps({**existing, **report}, ensure_ascii=False, indent=2), encoding="utf-8")
    print(json.dumps({r["destination"]: r["size"] for r in records}))

if __name__ == "__main__":
    main()
