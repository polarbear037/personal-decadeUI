"""提取已确认 APK 的装备原图；拆分预绘横条供独立节点拼装，不重新绘制图标。"""
import hashlib
import json
from pathlib import Path
import plistlib
import re
import runpy
import sys
import zipfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / '.codex-tmp/dialog-xinsha-deps'))
decode = runpy.run_path(str(ROOT / 'verification/extract-yjcm-target-effects.py'))['decode']
digest = lambda b: hashlib.sha256(b).hexdigest()

def main():
    output = ROOT / 'image/ui/equip/xinsha'
    output.mkdir(parents=True, exist_ok=True)
    sources, assets, frames = [], [], {}
    with zipfile.ZipFile('D:/yoka_sgs.x_g_android_6.4.5.apk') as apk:
        for package in ['game', 'config']:
            assert apk.read(f'assets/res/lib/{package}.zip') == (ROOT / f'.codex-tmp/yjcm-buttons/{package}.packed').read_bytes()
        for stem, selected in [('equip_card', ['equip_2767.png', 'equip_84.png', 'equip_67.png', 'equip_70.png', 'equip_31.png', 'equip_370.png']), ('playcard_2', [f'cflag{i}.png' for i in range(4)] + [f'{color}{i}.png' for color in ['red', 'black'] for i in range(1, 14)]), ('gameinfo', ['cardbg.png', 'game_abolish_equip_label.png'] + [f'game_abolish_equip_{kind}.png' for kind in ['weapon','armor','def_horse','att_horse','treasure']])]:
            member = f'assets/res/new/tex/plist/{stem}.plist'
            pb = apk.read(member)
            plist = plistlib.loads(pb)
            texture = member[:-6] + '.pvr.ccz'
            color, alpha = apk.read(texture), apk.read(texture + '@alpha')
            atlas = decode(color)
            atlas.putalpha(decode(alpha).getchannel('R'))
            sources.append(dict(plist=member, plist_sha256=digest(pb), texture_sha256=digest(color), alpha_sha256=digest(alpha)))
            for name in selected:
                f = plist['frames'][name]
                x,y,w,h = map(int, re.findall(r'-?\d+', f['frame']))
                im = atlas.crop((x,y,x+(h if f['rotated'] else w),y+(w if f['rotated'] else h)))
                if f['rotated']: im = im.transpose(Image.Transpose.ROTATE_90)
                size = tuple(map(int,re.findall(r'-?\d+',f['sourceSize'])))
                ox,oy = map(int,re.findall(r'-?\d+',f['offset']))
                canvas = Image.new('RGBA',size)
                canvas.paste(im,((size[0]-im.width)//2+ox,(size[1]-im.height)//2-oy))
                frames[name] = canvas
                assets.append(dict(frame=name, plist=member, frame_metadata=f, decoded_sha256=digest(canvas.tobytes())))
        # 工巧横条左右为空：保留原始圆角和边缘，中央取其无文字区逐列拼接。
        original = frames['equip_2767.png']
        bg = original.copy()
        for x in range(8,121): bg.paste(original.crop((8,0,9,23)), (x,0))
        bg.save(output / 'background.png')
        for slot,name in {1:'equip_84.png',2:'equip_67.png',3:'equip_70.png',4:'equip_31.png',5:'equip_370.png'}.items():
            # 原图标与底色预先合成；直接盖到背景上会令左端alpha从.8叠成.96。
            # 按 source-over 反解前景，运行时只绘制一层底图。
            patch = frames[name].crop((0,0,20,23))
            icon = Image.new('RGBA',patch.size)
            for y in range(23):
                for x in range(20):
                    source = patch.getpixel((x,y)); backdrop = bg.getpixel((x,y))
                    sa,ba = source[3]/255,backdrop[3]/255
                    fa = max(0,min(1,(sa-ba)/(1-ba))) if ba<1 else 0
                    if fa <= 1/255: continue
                    rgb = tuple(round(max(0,min(255,(source[i]*sa-backdrop[i]*ba*(1-fa))/fa))) for i in range(3))
                    icon.putpixel((x,y),(*rgb,round(fa*255)))
            icon.save(output / f'type{slot}.png')
        for name, im in frames.items():
            if not name.startswith('equip_') and name != 'cardbg.png': im.save(output/name)
        modules = []
        for package,names in [('game',['app.view.game.card.EquipArea','app.view.game.card.EquipCardUi','app.controller.game.MoveCardController','app.view.game.GameSeatCcb']),('config',['app.config.UseSpellAnimConfig'])]:
            with zipfile.ZipFile(ROOT / f'.codex-tmp/yjcm-buttons/{package}.zip') as z:
                for name in names: modules.append(dict(package=package,member=name,sha256=digest(z.read(name))))
        report = dict(client=dict(version='6.4.5',apk_sha256=digest(Path(apk.filename).read_bytes())),rea_evidence=['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965','ev_25ba7c7f5ace3de215d28d32c3a1b9587e376cd88926fbeddecd3f03da38fa9e'],sources=sources,frames=assets,modules=modules,
            layout=dict(seat=[190,252],card=[125,23],source_card=[129,23],x=37,bottoms=dict(treasure=104,weapon=81,armor=58,def_horse=35,att_horse=12),order=['treasure','weapon','armor','def_horse','att_horse'],empty='fixed positions, no compression',extra_weapon='type8 uses armor bottom58'),
            composition=dict(background='Derived from equip_2767: retain x0..7 and121..128, repeat empty x8 in center. Original beige RGBA, no recolor; central alpha204/255.',icons='Crop x0..19,y0..22 from native strips, invert source-over against background to remove duplicate backdrop. alphaForeground=(alphaSource-alphaBackground)/(1-alphaBackground).',points='Official playcard_2 cflag/red/black frames; EquipCardUi.updateGongQiaoEquip uses number RIGHT_CENTER(110,12), flower RIGHT_CENTER(128,12), children of equImg scaledX125/129',point_fit='Native equip_84 digit dark bounds x102..112,y4..17 and suit x113..124,y3..16; playcard glyphs are larger. Use .75 number and .65 suit scale with right anchors114/128, centerY12, to match ordinary prepainted strips. These are derived composition parameters, not a literal Lua scale.',name='Local composited text uses original fzbw 20px and #3d1c0c; normal official cards bake text and distance into the strip, so typography can differ slightly',adaptation='Retain noname composed type/range/name/number/suit; no complete baked per-card strip at runtime. Independent-equipment preference keeps a separate 5-row column.'),
            animation=dict(observed='EquipArea.addCard creates EquipCardUi and moves to its fixed slot in0.2s. MoveCardController performs previously restored full-card flight; neither method invokes Spine for generic equip entry.',not_entry='GameSeatCcb.updateEquipAni SF_paiju_eff_zbtishi is attack equipment prompting; UseSpellAnimConfig.equip is equipment SKILL activation. SF_zhuangbei_eff_xuanzhong02 is spell-button selection. None is generic equipping.',local='Suppress only FX_PaiJu_ZhuangBei_saoguang when othersOff; preserve Online and other effects. No unrelated Spine substituted. Suppress base card_start2x on equipped rows; full-card flight remains active.'),limitations=['Static shipped bytecode and artwork; no official-client runtime observation.','Normal official strips contain prepainted names/numbers. Dynamic components deliberately follow the requested noname composition.'])
    report['outputs']=[dict(path=p.relative_to(ROOT).as_posix(),sha256=digest(p.read_bytes()),size=list(Image.open(p).size)) for p in sorted(output.glob('*.png'))]
    report['layout']['visible_frame_mapping'] = dict(source='cardbg.plist sourceColorRect in194x256; CCB sprite at(0,0), anchorLEFT_BOTTOM',trim_top_left=[21,12,164,236],trim_cocos_left_bottom=[21,8],decoded_alpha_bbox=list(frames['cardbg.png'].getbbox()),local_reference='Local .player visible frame, not the whole190x252 Cocos node',left='(37-21)/164',width='125/164',row_height='23/236',bottom='(12-8)/236',interpretation='Derived adaptation from official layout and atlas trim. Trim rectangle is not the exact alpha contour of rounded corners.')
    report['opacity_correction'] = dict(source_alpha=204,source_alpha_fraction=0.8,local_native_selection_opacity=0.6,old_combined_alpha=0.48,current_label_opacity=1,scope='othersOff equipped.name2 only; original texture alpha and selection eligibility retained',live_evidence='verification/yjcm-equip-correction-electron.json; cloned self portrait in current Electron selecting state; no equipment-rule mutation')
    (ROOT/'verification/yjcm-equip-layout-source.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n','utf8')
    print(json.dumps(dict(assets=len(report['outputs']),directory=str(output)),ensure_ascii=False))

if __name__ == '__main__': main()
