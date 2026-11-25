"""读取6.4.1记录面板的Lua/CCB与原图；不执行官方客户端。"""
import hashlib, importlib.util, io, json, plistlib, re, struct, sys, zipfile, zlib
from pathlib import Path
from PIL import Image
import texture2ddecoder

ROOT = Path(__file__).resolve().parents[1]
def module(name, path):
    spec = importlib.util.spec_from_file_location(name, path)
    result = importlib.util.module_from_spec(spec); spec.loader.exec_module(result)
    return result
parser = module('lua_reader', ROOT / 'verification/verify-yjcm-dialog-layout-source.py')
ccb = module('ccb_reader', parser.TOOLS / 'read_ccbi.py')
sys.path.insert(0, str(parser.TOOLS / 'vendor'))
import xxtea
sha = lambda data: hashlib.sha256(data).hexdigest()
apk = Path('G:/yoka_sgs.x_g_android_6.4.1.apk')
assert hashlib.file_digest(apk.open('rb'), 'sha256').hexdigest() == '974381c26f5bdc45daa6796f31cf384840e8d95e2eff3039990180f22f36a895'
out = ROOT / 'image/ui/xinsha-record'; out.mkdir(exist_ok=True)
report = dict(apk_sha256='974381c26f5bdc45daa6796f31cf384840e8d95e2eff3039990180f22f36a895',
              rea_evidence=['ev_05d5033df946a225de4c38cf5efc4639c70456d4f31e1909520997450f785874'], modules=[], assets=[], ccb=[],
              limitations=['Static Lua bytecode/CCB and atlas pixels; official Android runtime not observed.'])
def decode(data):
    if data[:4] == b'CCZ!': data = zlib.decompress(data[16:])
    version, _, fmt, _, _, h, w, _, _, _, _, meta = struct.unpack_from('<IIQ9I', data)
    assert version == 0x03525650 and fmt == 6
    return Image.frombytes('RGBA', (w,h), texture2ddecoder.decode_etc1(data[52+meta:],w,h),'raw','BGRA')
with zipfile.ZipFile(apk) as a:
    packed = a.read('assets/res/lib/game.zip')
    decoded = xxtea.decrypt(packed[15:],b'sgsYpad7Lo0khJf'.ljust(16,b'\0'),padding=False)
    report.update(packed_sha256=sha(packed), decoded_sha256=sha(decoded))
    with zipfile.ZipFile(io.BytesIO(decoded)) as z:
        for name in ['app.view.game.dlg.recordGameInfo','app.view.game.dlg.recordTabBtnCcb','app.view.game.record.GameRecordListView','app.view.game.record.GameRecordItem']:
            data=z.read(name); c=parser.Chunk(data); c.function()
            report['modules'].append(dict(member=name,sha256=sha(data),prototypes=c.rows))
        data=z.read('app.cfg.CfgStyleButton'); c=parser.Chunk(data); c.function()
        report['button_style']=dict(member='app.cfg.CfgStyleButton',sha256=sha(data),prototype='0',
            instructions=[x for x in c.rows[0]['instructions'] if 3449 <= x['pc'] <= 3478 or 8143 <= x['pc'] <= 8148])
    font=a.read('assets/res/fnt/fzbw.ttf'); assert font == (ROOT/'ui/assets/fonts/fzbw.ttf').read_bytes()
    report['font']=dict(member='assets/res/fnt/fzbw.ttf',sha256=sha(font),existing_destination='ui/assets/fonts/fzbw.ttf')
    for name in a.namelist():
        if 'recordTabBtn' in name and name.endswith('.ccbi'):
            data=a.read(name); tree=ccb.Reader(data).read()
            report['ccb'].append(dict(member=name,sha256=sha(data),tree=tree))
        if name.endswith('ui/bg/game_record_info_bg.pvr.ccz'):
            data=a.read(name); alpha=a.read(name+'@alpha'); image=decode(data); image.putalpha(decode(alpha).getchannel('R'))
            image.save(out/'game_record_info_bg.png')
            report['assets'].append(dict(member=name,texture_sha256=sha(data),alpha_sha256=sha(alpha),sha256=sha((out/'game_record_info_bg.png').read_bytes()),destination='image/ui/xinsha-record/game_record_info_bg.png',size=image.size))
    for atlas,names in [('gameinfo',['gameRecordBtn_1.png']),('game_dlg',['record_head.png','record_selectg.png','record_unselectg.png'])]:
        member=f'assets/res/new/tex/plist/{atlas}.plist'; data=a.read(member); frames=plistlib.loads(data)['frames']
        tex=member.replace('.plist','.pvr.ccz'); color=a.read(tex); alpha=a.read(tex+'@alpha')
        image=decode(color); image.putalpha(decode(alpha).getchannel('R'))
        for name in names:
            f=frames[name]; x,y,w,h=map(int,re.findall(r'-?\d+',f['frame']))
            crop=image.crop((x,y,x+(h if f['rotated'] else w),y+(w if f['rotated'] else h)))
            if f['rotated']: crop=crop.transpose(Image.Transpose.ROTATE_90)
            sw,sh=map(int,re.findall(r'\d+',f['sourceSize'])); cx,cy,_,_=map(int,re.findall(r'\d+',f['sourceColorRect']))
            result=Image.new('RGBA',(sw,sh)); result.paste(crop,(cx,cy)); result.save(out/name)
            report['assets'].append(dict(name=name,atlas=member,atlas_sha256=sha(data),texture_sha256=sha(color),alpha_sha256=sha(alpha),frame=f,destination='image/ui/xinsha-record/'+name,sha256=sha((out/name).read_bytes()),size=[sw,sh]))
report['layout']=dict(background=[-150,0,982,750],title=[150,51,278,45],list=[0,166,500,574],
    tabs=dict(left=559,top=33,width=112,height=50,step=80,avatar_frame=[48,49]),
    record_font_size=28,record_color='#a37052',title_color='#c1ae8e',tab_color='#ffedc7')
report['local_adaptation']=['Keep native game.log HTML/broadcast/video. Associate player objects with original sidebar nodes in a WeakMap; historical string logs use visible translated names and seat labels.',
    'Use existing Xinsha player-avatar/tab helper for visible skins; keep original record tab textures/geometry. Scroll tabs for more than eight seats.',
    'Local pause uses native pause2/resume2 without arena blur/dim, preserving the screenshot battlefield. Empty area/Escape closes; original log DOM and game event/selection stay unchanged.',
    'Cocos bottom-up anchors converted to DOM top-left; panel scales with existing scene safe inset/documentZoom. Native log line spacing adapted to 40 design units.']
(ROOT/'verification/yjcm-record-source.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf8')
print('ASSETS',[(x.get('name',x.get('member')),x['size']) for x in report['assets']])
for entry in report['ccb']:
    print('CCB',entry['member'])
    def visit(node):
        props={k:v['value'] for k,v in node['properties'].items()}
        print(node['class'],props)
        for child in node['children']:visit(child)
    visit(entry['tree']['root'])
for entry in report['modules'][2:]:
    print(entry['member'])
    for row in entry['prototypes']: print(row['id'],row['constants'])
