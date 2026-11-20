"""只读提取一将目标/回合状态 Spine；解码 ETC1 颜色和独立 alpha，供指定转换器使用。"""
import hashlib
import json
from pathlib import Path
import runpy
import re
import plistlib
import struct
import sys
import zipfile
import zlib

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.codex-tmp/dialog-xinsha-deps'))
from PIL import Image
import texture2ddecoder

def digest(data):
    return hashlib.sha256(data).hexdigest()

def decode(data):
    if data[:4] == b'CCZ!':
        data = zlib.decompress(data[16:])
    version, flags, fmt, space, channel, height, width, depth, surfaces, faces, mips, meta = struct.unpack_from('<IIQ9I', data)
    if version != 0x03525650 or fmt != 6:
        raise ValueError(f'Unsupported PVR format {fmt}')
    return Image.frombytes('RGBA', (width, height), texture2ddecoder.decode_etc1(data[52+meta:], width, height), 'raw', 'BGRA')

def main():
    output = ROOT / '.codex-tmp/yjcm-target-spine'
    output.mkdir(parents=True, exist_ok=True)
    records = []
    with zipfile.ZipFile('D:/yoka_sgs.x_g_android_6.4.5.apk') as archive:
        plist_member = 'assets/res/new/tex/plist/gameinfo.plist'
        plist_bytes = archive.read(plist_member)
        frames = plistlib.loads(plist_bytes)['frames']
        white_frame = frames['paiju_target_actived.png']
        texture_member = plist_member[:-6]+'.pvr.ccz'
        atlas = decode(archive.read(texture_member))
        atlas.putalpha(decode(archive.read(texture_member+'@alpha')).getchannel('R'))
        x,y,w,h = map(int, re.findall(r'-?\d+', white_frame['frame']))
        crop = atlas.crop((x,y,x+(h if white_frame['rotated'] else w),y+(w if white_frame['rotated'] else h)))
        if white_frame['rotated']:
            crop = crop.transpose(Image.Transpose.ROTATE_90)
        crop.save(output/'paiju_target_actived.png')
        records.append({'name':'paiju_target_actived', 'plist':plist_member, 'plist_sha256':digest(plist_bytes), 'frame':white_frame, 'reference_cardbg':frames['cardbg.png'], 'texture_sha256':digest(archive.read(texture_member)), 'alpha_sha256':digest(archive.read(texture_member+'@alpha')), 'prepared_sha256':digest((output/'paiju_target_actived.png').read_bytes())})
        for color in ['green', 'orange', 'red']:
            for suffix in ['', '2']:
                stem = f'SF_eff_paiju_paidi{color}_m{suffix}'
                prefix = 'assets/res/new/data/spine/yjcm/' + stem
                record = {'name': stem, 'members': []}
                for ext in ['.skel', '.atlas']:
                    data = archive.read(prefix + ext)
                    target = output / (stem + ext)
                    target.write_bytes(data.replace(b'.pvr.ccz', b'.png') if ext == '.atlas' else data)
                    record['members'].append({'member': prefix+ext, 'sha256': digest(data), 'prepared_sha256': digest(target.read_bytes())})
                color_bytes, alpha_bytes = archive.read(prefix+'.pvr.ccz'), archive.read(prefix+'.pvr.ccz@alpha')
                image = decode(color_bytes)
                image.putalpha(decode(alpha_bytes).getchannel('R'))
                image.save(output / (stem + '.png'))
                record.update(texture_sha256=digest(color_bytes), alpha_sha256=digest(alpha_bytes), prepared_texture_size=list(image.size))
                records.append(record)
    # 与已经核对过的 APK game.packed/game.zip 对应；仅解析新增的聚焦 Lua 模块。
    Chunk = runpy.run_path('F:/noname/resources/app/extension/犟0/tools/read-official-lua.py')['Chunk']
    modules = []
    with zipfile.ZipFile(ROOT / '.codex-tmp/yjcm-buttons/game.zip') as game:
        for name in ['app.module.game.seat.PlayerSeat', 'app.manager.general.GeneralUiResCfg', 'app.view.game.GameSeatCcb', 'app.cfg.CfgCCB']:
            data = game.read(name)
            chunk = Chunk(data); chunk.function()
            assert chunk.p == len(data)
            (output / (name+'.json')).write_text(json.dumps(chunk.rows, ensure_ascii=False, indent=2), encoding='utf-8')
            modules.append({'module': name, 'sha256': digest(data)})
    (output/'extraction.json').write_text(json.dumps({'resources': records, 'modules': modules}, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    print(json.dumps({'resources': len(records), 'directory': str(output)}, ensure_ascii=False))

if __name__ == '__main__':
    main()
