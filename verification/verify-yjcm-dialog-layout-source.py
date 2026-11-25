"""核对指定官方 APK 的技能窗布局；只解析字节码，不执行 Lua。"""
import hashlib
import io
import json
from pathlib import Path
import plistlib
import struct
import sys
import zipfile

ROOT = Path(__file__).resolve().parents[1]
TOOLS = ROOT.parent / '抚琴益州/tools'
OPS = {int(s.split()[1]): s.split()[2] for s in (TOOLS / 'opmap.txt').read_text(encoding='utf-8').splitlines() if s.startswith('.op')}
sha = lambda b: hashlib.sha256(b).hexdigest()


class Chunk:
    def __init__(self, data):
        assert data[:12] == b'\x1bLuaQ\x00\x01\x04\x04\x04\x08\x00'
        self.data, self.position, self.rows = data, 12, []

    def uint(self):
        value = struct.unpack_from('<I', self.data, self.position)[0]
        self.position += 4
        return value

    def byte(self):
        value = self.data[self.position]
        self.position += 1
        return value

    def string(self):
        length = self.uint()
        value = self.data[self.position:self.position + max(0, length - 1)].decode('utf-8', errors='backslashreplace')
        self.position += length
        return value

    def function(self, identity='0'):
        self.string()
        line, last = self.uint(), self.uint()
        header = [self.byte() for _ in range(4)]
        code = [self.uint() for _ in range(self.uint())]
        constants = []
        for _ in range(self.uint()):
            kind = self.byte()
            if kind == 0:
                value = None
            elif kind == 1:
                value = bool(self.byte())
            elif kind == 3:
                value = struct.unpack_from('<d', self.data, self.position)[0]
                self.position += 8
            elif kind == 4:
                value = self.string()
            else:
                raise ValueError(f'Unknown Lua constant kind: {kind}')
            constants.append(value)
        row = dict(id=identity, line=line, last_line=last, header=header, constants=constants, instructions=[])
        self.rows.append(row)
        for pc, word in enumerate(code, 1):
            op, a, b, c = OPS[word & 63], (word >> 6) & 255, (word >> 23) & 511, (word >> 14) & 511
            instruction = dict(pc=pc, op=op, a=a, b=b, c=c)
            if op in ('getglobal', 'loadk', 'setglobal'):
                instruction['constant'] = constants[word >> 14]
            elif op in ('gettable', 'settable', 'self', 'add', 'sub', 'mul', 'div', 'eq', 'lt', 'le'):
                instruction['constant_operands'] = {name: constants[value - 256] for name, value in [('b', b), ('c', c)] if value >= 256}
            row['instructions'].append(instruction)
        for child in range(self.uint()):
            self.function(identity + '.' + str(child))
        count = self.uint()
        self.position += 4 * count
        for _ in range(self.uint()):
            self.string(); self.uint(); self.uint()
        for _ in range(self.uint()):
            self.string()


def main():
    sys.path.insert(0, str(TOOLS / 'vendor'))
    import xxtea
    modules = {
        'app.view.game.dlg.SkillNewStyleBaseWindow': ['0.3', '0.4'],
        'app.view.game.dlg.SkillPopUpWindow': ['0.9'],
        'app.ui.TimeBar': ['0.1', '0.9'],
        'cframe.extends.cc.ui.RichLabel': ['0.1', '0.6', '0.10'],
        'framework.cocos2dx.NodeEx': ['0.2'],
    }
    apk_path = Path(sys.argv[1])
    with zipfile.ZipFile(apk_path) as apk:
        packed = apk.read('assets/res/lib/game.zip')
        assert packed.startswith(b'sgsEpadGsign28k')
        # 包内资源解码算法，与现有只读提取器相同；不涉及用户凭据。
        decoded = xxtea.decrypt(packed[15:], b'sgsYpad7Lo0khJf'.ljust(16, b'\0'), padding=False)
        records = []
        with zipfile.ZipFile(io.BytesIO(decoded)) as inner:
            for name, selected in modules.items():
                data = inner.read(name)
                chunk = Chunk(data)
                chunk.function()
                assert chunk.position == len(data)
                rows = chunk.rows if selected is None else [r for r in chunk.rows if r['id'] in selected]
                records.append(dict(member=name, sha256=sha(data), prototypes=rows))
        member = 'assets/res/new/tex/plist/skill_window.plist'
        plist_data = apk.read(member)
        frames = plistlib.loads(plist_data)['frames']
    base = records[0]['prototypes'][1]['instructions']
    assert base[12]['op'] == 'sub' and base[12]['constant_operands']['c'] == 20
    assert base[61]['constant'] == 113 and base[97]['constant'] == 120
    assert frames['skill_window_title.png']['sourceSize'] == '{295,37}'
    report = dict(apk_sha256=sha(apk_path.read_bytes()), packed_sha256=sha(packed), decoded_sha256=sha(decoded),
                  rea_evidence=['ev_2ea443d8c59d7d564cce7107d494e63d2b670ad3cef90bc87f8aba521c5793c3', 'ev_fb46dbac93a191733ae50f6886c89cbe33e789d9e0157087d66423042acd0da6'],
                  modules=records, plist=dict(member=member, sha256=sha(plist_data), title=frames['skill_window_title.png'], background=frames['skill_window_bg_2.png']),
                  layout=dict(title=dict(size=[295, 37], anchor='CENTER', center_from_top=20, text_center_x_offset=3, font_size=32),
                              native_prompt=dict(anchor='CENTER_BOTTOM', bottom=120, font_size=30),
                              native_progress=dict(anchor='CENTER_BOTTOM', bottom=113, size=[560, 17]),
                              dom_adaptation='One shared moving anchor; convert native anchor delta7 to a visible gap7 below DOM text using bar height17. Both positions follow the same group translation. This boundary conversion is local and is not an official runtime observation.'),
                  limitation='Static modified-opcode Lua 5.1 bytecode and packaged assets; no official-client runtime capture.')
    (ROOT / 'verification/yjcm-dialog-layout-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    for record in records:
        print(record['member'], [(r['id'], r['line'], r['last_line']) for r in record['prototypes']])


if __name__ == '__main__':
    main()
