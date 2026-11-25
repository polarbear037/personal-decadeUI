"""只读核对当前一将 APK、已验证解码缓存及处理区 Lua 指令，不执行官方客户端。"""
import hashlib
import json
from pathlib import Path
import runpy
import zipfile

ROOT = Path(__file__).resolve().parents[1]
sha = lambda data: hashlib.sha256(data).hexdigest()
client = json.loads((ROOT/'verification/yjcm-equip-animation-source.json').read_text('utf8'))['client']
cache = ROOT/'.codex-tmp/yjcm-buttons'
with zipfile.ZipFile('D:/yoka_sgs.x_g_android_6.4.5.apk') as apk:
    packed = apk.read(client['member'])
assert packed == (cache/'game.packed').read_bytes()
assert sha(packed) == client['packed_sha256']
assert sha((cache/'game.zip').read_bytes()) == client['decoded_sha256']
Chunk = runpy.run_path(str(ROOT/'../犟0/tools/read-official-lua.py'))['Chunk']
selected = {
    'app.view.game.card.CardUi': ['0'],
    'app.view.game.card.CardUiNew': ['0.1', '0.2', '0.5', '0.41', '0.42'],
    'app.controller.game.MoveCardController': ['0.12', '0.13'],
    'app.view.game.DisCardAreaUi': ['0.6', '0.13', '0.19'],
}
modules = []
with zipfile.ZipFile(cache/'game.zip') as game:
    for name, ids in selected.items():
        data = game.read(name)
        chunk = Chunk(data)
        chunk.function()
        assert chunk.p == len(data)
        cached = json.loads((ROOT/'.codex-tmp/yjcm-equip'/f'{name}.json').read_text('utf8'))
        assert cached == chunk.rows
        rows = [r for r in chunk.rows if r['id'] in ids]
        assert len(rows) == len(ids)
        modules.append(dict(member=name, sha256=sha(data), prototypes=rows))
report = dict(client=client, rea_evidence=[
    'ev_9c5d0ada064eb4df0e69550e647832f45a7c91a83828969b6e7b0219840bc0e9',
    'ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965',
    'ev_2ce5813937b0e747c27192bb68910230b3ac2c19345e374c7ddff8a7d13d5195',
], modules=modules, findings=[
    dict(topic='use-start-and-curve', conclusion='用牌入场当次启动300ms直线飞行，位置EaseSineOut，缩放独立线性；本地不再等待rAF后的计时器，首个可绘制帧起播。',
         evidence='MoveCardController.defaultAction 0.13 PC10..17直接调用stackView.addToStackArea；DisCardAreaUi.addToStackArea 0.6 PC32..38建立来源位置，PC69..70当次reorderAllCards；reorderAllCards 0.19 PC55..94为spawn(EaseSineOut(MoveTo(.3,p)),scaleTo(.3,.8,.8))，无DelayTime。位置进度sin(pi*t/2)，缩放进度t。本地以61个5ms关键帧采样，位置插值误差小于0.00009路程，保留独立手牌/弃牌大小设置。'),
    dict(topic='used-info', conclusion='处理区入场牌在飞行前已创建来源说明；普通转移副本与之不同。',
         evidence='DisCardAreaUi.addCard 0.13 PC1..6: CardUi.new(cardId, cardText, skillText); ctor 0.1 PC37..54: initData/createChildren/updateUI; initData 0.2 PC27..32: setCardText; updateUI 0.5 PC40..41: updateCardTextLabel; 0.42 PC1..55: 非空时创建并立即显示textLabelBg/textLabel，无等待入场结束。MoveCardController.moveCardToOtherSeat 0.12 PC59..69: CardUi.new(cardId)，没有额外cardText参数。'),
    dict(topic='scale', conclusion='处理区移动和缩放同时进行；本地已有从手牌设置大小过渡到弃牌设置大小。',
         evidence='DisCardAreaUi.reorderAllCards 0.19 PC55..94: EaseSineOut(MoveTo(0.3,...))与scaleTo(0.3,0.8,0.8)放入同一spawn。本地逐帧验证0.19→0.16，中间尺寸连续。官方0.8为固定终点，本地按用户要求保留两项独立设置。'),
    dict(topic='order', conclusion='最新牌在左；本地一将分支由push改为unshift。',
         evidence='DisCardAreaUi.addCard 0.13 PC46..50追加cards[#cards+1]；reorderAllCards 0.19 PC64..68横坐标为start+(count-index)*step+scaledWidth/2，因此最后入列项在左。'),
], limitations=['基于已核验APK的Lua字节码调用链，不等同官方客户端运行观察。',
                 '只修改othersOff/xinsha，不改变Online及其他风格；保留此前明确要求的装备飞行与流程独立。'])
(ROOT/'verification/yjcm-discard-source.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
print('YJCM_DISCARD_SOURCE_OK: APK packed member, decoded hash, four Lua modules and 11 prototypes matched')
