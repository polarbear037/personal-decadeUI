"""验证当前 APK/解码缓存，保留飞向其他座位的动作与调用条件。非官方动态画面验证。"""
import hashlib
import json
from pathlib import Path
import runpy
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()
client = json.loads((ROOT / 'verification/yjcm-equip-animation-source.json').read_text('utf8'))['client']
with zipfile.ZipFile('D:/yoka_sgs.x_g_android_6.4.5.apk') as apk:
    assert sha(apk.read(client['member'])) == client['packed_sha256']
decoded = ROOT / '.codex-tmp/yjcm-buttons/game.zip'
assert sha(decoded.read_bytes()) == client['decoded_sha256']
Chunk = runpy.run_path(str(ROOT / '../犟0/tools/read-official-lua.py'))['Chunk']
modules = []
with zipfile.ZipFile(decoded) as archive:
    for name, ids in {
        'app.controller.game.MoveCardController': ['0.11', '0.12'],
        'app.manager.game.GameMoveManager': ['0.0.0'],
    }.items():
        raw = archive.read(name)
        chunk = Chunk(raw)
        chunk.function()
        assert chunk.p == len(raw)
        cached = json.loads((ROOT / f'.codex-tmp/yjcm-equip/{name}.json').read_text('utf8'))
        assert chunk.rows == cached
        modules.append(dict(member=name, sha256=sha(raw), prototypes=[r for r in chunk.rows if r['id'] in ids]))
report = dict(client=client, modules=modules, findings=[
    dict(topic='seat-transfer-curve', evidence='MoveCardController.defaultAction 0.11 PC6 TEST r4 C1 / PC7 JMP到PC73：srcSeatIsSelf为true跳过首段。false分支PC37..46: EaseSineIn(moveTo(13/30))；true分支PC112..121: EaseSineIn(moveTo(18/30))。与同缓存重建MoveCardController.lua的if not srcSeatIsSelf/elseif srcSeatIsSelf一致。',
         conclusion='本人来源的其他座位飞牌为600ms，其余来源433.333ms；位置进度1-cos(pi*t/2)。'),
    dict(topic='source-seat-branch', evidence='GameMoveManager 0.0.0 PC397..407把来源座位isSelf作为第五实参传入moveCardToOtherSeat；后者0.12 PC83..89转交defaultAction的r4。',
         conclusion='按来源是否本人分流，不按武将名、牌名或目标座次特判。'),
], local_adaptation=['只接入一将$draw/$gain2/$give飞向其他座位的副本，保留本地坐标、卡牌大小和220ms淡出。',
    '飞行真实onfinish后停留100ms再淡出清理，取消并行墙钟删除计时；暂停或掉帧不能提前删除尚未落位的副本。',
    '本人入手、300ms EaseSineOut处理区、此前用户要求的装备演出及规则层等待不改。',
    '位置121采样关键帧交给WAAPI插值；缩放沿用本地起终点并独立线性，不声称还原官方全部缩放/透明度演出。'],
    limitations=['当前APK的静态字节码证据，不等于官方客户端动态对照。'])
(ROOT / 'verification/yjcm-card-flight-source.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n', 'utf8')
print('YJCM_CARD_FLIGHT_SOURCE_OK: current APK member, decoded cache, two modules / three prototypes verified')
