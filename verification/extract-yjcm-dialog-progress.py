"""只读当前 APK，提取技能窗口的原生倒计时图片；不缩放或重绘。"""
import hashlib
import json
from pathlib import Path
import plistlib
import re
import struct
import zipfile
import zlib
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
MODIFIERS = [(2, 8), (5, 17), (9, 29), (13, 42), (18, 60), (24, 80), (33, 106), (47, 183)]


def pvr(data):
    if data[:4] == b"CCZ!":
        data = zlib.decompress(data[16:])
    version, flags, fmt, space, channel, height, width, depth, surfaces, faces, mips, meta = struct.unpack_from("<IIQ9I", data)
    assert version == 0x03525650 and fmt == 6
    return data[52 + meta:], width


def sample(texture, x, y):
    data, width = texture
    high, low = struct.unpack_from(">II", data, ((y // 4) * ((width + 3) // 4) + x // 4) * 8)
    half = int((y % 4 >= 2) if high & 1 else (x % 4 >= 2))
    if high & 2:
        base = [(high >> shift) & 31 for shift in (27, 19, 11)]
        if half:
            delta = [(high >> shift) & 7 for shift in (24, 16, 8)]
            base = [value + (d if d < 4 else d - 8) for value, d in zip(base, delta)]
        base = [(value << 3) | (value >> 2) for value in base]
    else:
        base = [((high >> (shift - half * 4)) & 15) * 17 for shift in (28, 20, 12)]
    index = x % 4 * 4 + y % 4
    modifier = MODIFIERS[(high >> (2 if half else 5)) & 7][(low >> index) & 1]
    if low & (1 << (index + 16)):
        modifier = -modifier
    return tuple(max(0, min(255, value + modifier)) for value in base)


def extract(frame, color, alpha):
    x, y, width, height = map(int, re.findall(r"\d+", frame["frame"]))
    rotated = frame.get("rotated", False)
    w, h = (height, width) if rotated else (width, height)
    image = Image.new("RGBA", (w, h))
    image.putdata([(*sample(color, x + i, y + j), sample(alpha, x + i, y + j)[0]) for j in range(h) for i in range(w)])
    if rotated:
        image = image.transpose(Image.Transpose.ROTATE_90)
    sw, sh = map(int, re.findall(r"\d+", frame["sourceSize"]))
    sx, sy, _, _ = map(int, re.findall(r"\d+", frame["sourceColorRect"]))
    result = Image.new("RGBA", (sw, sh))
    result.paste(image, (sx, sy))
    return result


def main():
    digest = lambda data: hashlib.sha256(data).hexdigest()
    apk = Path("D:/yoka_sgs.x_g_android_6.4.5.apk")
    with apk.open("rb") as stream:
        apk_digest = hashlib.file_digest(stream, "sha256").hexdigest()
    assert apk_digest == "12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202"
    with zipfile.ZipFile(apk) as archive:
        member = "assets/res/new/tex/plist/gameinfo.plist"
        plist = archive.read(member)
        frames = plistlib.loads(plist)["frames"]
        texture = member[:-6] + ".pvr.ccz"
        color_data, alpha_data = archive.read(texture), archive.read(texture + "@alpha")
        color, alpha = pvr(color_data), pvr(alpha_data)
        # 与已核对的582宽正式资源逐像素交叉检查，避免自带解码器引入颜色或翻转差异。
        reference = Image.open(ROOT / "image/ui/progress/xinsha/xf_newTimeBar_2.png").convert("RGBA")
        assert reference.tobytes() == extract(frames["xf_newTimeBar_2.png"], color, alpha).tobytes()
        assets = []
        for name in ["xf_newTimeBar_1.png", "xf_newTimeBar_red_1.png", "xf_newTimeBar_bg_1.png"]:
            target = ROOT / "image/ui/progress/xinsha" / name
            image = extract(frames[name], color, alpha)
            image.save(target)
            assets.append({"frame": name, "metadata": frames[name], "destination": target.relative_to(ROOT).as_posix(), "size": list(image.size), "sha256": digest(target.read_bytes())})
    report = {
        "client": {"apk_sha256": apk_digest, "version": "6.4.5", "decoded_sha256": "23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28"},
        "rea_evidence": ["ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965", "ev_8a72e32c34675ee63afb8842348a359d1e11de76b120394a47bae68bd545c346"],
        "source": {"plist": member, "plist_sha256": digest(plist), "texture_sha256": digest(color_data), "alpha_sha256": digest(alpha_data)},
        "assets": assets,
        "layout": {
            "SkillNewStyleBaseWindow": {"sha256": "bc761bac3d2ec8ae795aec07ce4d161a9e2d7af0cae5b78dee55806d2e4e4902", "function": "0.4 line43 PC46..103", "bar": "xf_newTimeBar_1.png, 560x17, CENTER_BOTTOM y113", "prompt": "CENTER_BOTTOM y120, fnt/fzbw.ttf size30 color255,243,222"},
            "windowSnitch": {"sha256": "4a65d0ab8bf1c55f2ae79988c1e090db6560c802ee908dbcf295ea786f98658f", "function": "0.6 line250 PC162..187", "with_buttons": {"bar_y": 108, "prompt_y": 120}, "without_buttons": {"bar_y": 73, "prompt_y": 80}},
            "WindowManager": {"sha256": "193474362395ed9b3e5f9b0d091a78d4f8d3fcd68a15182ec36356dd7f7c6f7f", "function": "0.81 line696 PC8..41 and PC55..73", "button": "parent runningScene; LEFT_BOTTOM((display.width-USE_WIDTH)/2+39,258); 86x86"},
        },
        "scope": "Static APK resource and modified-opcode Lua inspection; local browser verification is separate; no official-client runtime capture.",
        "adaptation": "Keep the original countdown and current noname card/dialog scale. Override only displayed xinsha dialogs; use each overlay node's measured containing-block scale for body zoom and transformed parents. Paint noninteractive text copies in the body at z104 above progress z103, retaining original nodes for native lifecycle/accessibility. Remove copies and restore only changed inline properties on hide/close. Both normal and dialog progress share brightness(1.1) on the same texture node, as a user-requested display adjustment, not an observed official source parameter; original asset pixels remain unchanged.",
        "validation": {"command": "node verification/dialog-xinsha-prompts-browser.cjs", "results": "verification/dialog-xinsha-prompts-results.json", "official_client_runtime": False, "electron_live": False},
    }
    (ROOT / "verification/dialog-xinsha-prompts-source.json").write_text(json.dumps(report, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps({"assets": assets, "decoder_reference_pixel_match": True}, ensure_ascii=False))


if __name__ == "__main__":
    main()
