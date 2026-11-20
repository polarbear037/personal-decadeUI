"""核对动态PNG帧数、时长、alpha边界，并保存包内来源与布局换算依据。"""
import hashlib
import json
from pathlib import Path
from statistics import median
from PIL import Image, ImageChops

ROOT=Path(__file__).resolve().parents[1]
digest=lambda data:hashlib.sha256(data).hexdigest()
source=json.loads((ROOT/'.codex-tmp/yjcm-target-spine/extraction.json').read_text('utf-8'))
bounds=json.loads((ROOT/'.codex-tmp/yjcm-target-spine/bounds.json').read_text('utf-8'))
records=[]
for item in bounds:
    name=item['name']+'_play_dynamic.png'
    target=ROOT/'image/ui/effects/xinsha'/name
    prepared=ROOT/'.codex-tmp/yjcm-target-apng'/item['name']/name
    assert target.read_bytes()==prepared.read_bytes(),name
    image=Image.open(target)
    assert image.is_animated and image.info['loop']==0
    assert image.size==(item['width'],item['height'])
    union=Image.new('L',image.size)
    duration=0
    unique=set()
    horizontal=[[] for _ in range(image.width)]
    vertical=[[] for _ in range(image.height)]
    for i in range(image.n_frames):
        image.seek(i)
        frame=image.convert('RGBA')
        for x in range(image.width):horizontal[x].append(frame.getpixel((x,image.height//2))[3])
        for y in range(image.height):vertical[y].append(frame.getpixel((image.width//2,y))[3])
        duration+=image.info['duration']
        unique.add(digest(frame.tobytes()))
        mask=frame.getchannel('A').point(lambda a:255 if a>=64 else 0)
        union=ImageChops.lighter(union,mask)
    box=union.getbbox()
    assert box and box[0]>0 and box[1]>0 and box[2]<image.width and box[3]<image.height,(name,box)
    assert len(unique)>10
    assert abs(duration/1000-item['duration'])<.001
    horizontal=list(map(median,horizontal));vertical=list(map(median,vertical))
    ridge=[]
    for values,start,end in [(horizontal,0,image.width//3),(horizontal,image.width*2//3,image.width),(vertical,0,image.height//3),(vertical,image.height*2//3,image.height)]:
        indices=[i for i in range(start,end) if values[i]>=254]
        assert indices
        ridge.append(sum(indices)/len(indices))
    records.append({**item,'path':target.relative_to(ROOT).as_posix(),'sha256':digest(target.read_bytes()),'bytes':target.stat().st_size,'frames':image.n_frames,'duration_ms':duration,'loop':0,'unique_frames':len(unique),'visible_alpha64_union':list(box),'bright_ridge_lrtb':ridge,'unchanged_converter_output':True})
report={
 'client':{'version':'6.4.5','apk_sha256':'12a3a7bb9bef360ed8f652efb3efb13be6494ba40701b8c0b04e3a4dd25c9202','game_member':'assets/res/lib/game.zip','decoded_sha256':'23e20c1adc656591533849a0fccff66ec2262d1b8e8730492f9c0f242c2aae28'},
 'rea_evidence':['ev_21378a25c4c3a406bcbf9affc4a729d1202833a82378733501bd16f7cd446965','ev_c86fbbdc52e479ecd3205698402df56a06275158f4056a4ae3e989f4fdf3db0f','ev_dfd6cd8c4fffa08ad889ec37ec8ca2af4280d83b99bd4da4e237c36293e9976b'],
 'source_resources':source,
 'call_chain':{
  'model':'app.module.game.seat.PlayerSeat.getDisplayStatus prototype0.152 line2079',
  'priority':'isSelected->2; isActive->4; inOwnRound2&&!isSelf->1; inAskState&&isSelf->3 (completed combo may return5); otherwise0',
  'view':'OtherSeatView.updateDisplayStatus -> GameSeatCcb.updateSeatDisplayStatus prototype0.100 line3261',
  'state_table':'GameSeatCcb root PC721-767: array1 green_m,2 orange_m,3 red_m,4 nil,5 lianzhao_zuowei; yjcm paths',
  'active_white':'State4 uses #paiju_target_actived.png, not Spine; CENTER, scaleX1.02/scaleY1.01, center offsets(+4,-9). addTo(parent) has no negative z, unlike Spine addTo(parent,-2). FadeIn2 seconds, then repeat fadeTo(.5)1 second/fadeTo(1)1 second.',
  'spine':'States1/2/3: CENTER alignment through getDisplayStatusParent0.99, yjcm x adjustment-2, z=-2, playAnimation(play,true).',
  'variant':'GeneralUiResCfg.isUseOldDragon0.12 is DragonType2; getTranfromUiName0.13 maps to m2, offset(0,0). State4 additionally uses x offset-7 and scaleX1.16.',
  'scope':'Combo/lianzhao state5 is a separate skill mechanic and is not replaced with a generic seat frame.'
 },
 'converter':{'tool':'D:/spine2apng/make_apng.mjs','sha256':digest(Path('D:/spine2apng/make_apng.mjs').read_bytes()),'renderer_sha256':digest(Path('D:/spine2apng/render.html').read_bytes()),'runtime':'3.6 / shipped skeleton3.6.38','fps':30,'scale':1,'output':'RGBA APNG, infinite loop, untouched converter output','conversion':'ETC1 RGB + red channel from separate ETC1 alpha; atlas page suffix .pvr.ccz -> .png; no recoloring, extra cropping or resizing.'},
 'assets':records,
 'geometry':{'reference':'Local player background stretches to130x180. Align source bright-ridge rectangle to this actual background boundary; the earlier164x236 cardbg trim mapping was incorrect for the local node.', 'apng_origin':'Keep the full converter canvas and its transparent margins. Each asset has its own bright_ridge_lrtb; the CSS scales the ridge span to the local frame and compensates its center.', 'measurement':'Across all frames, take median alpha on the middle row/column; in each outer third, average coordinates with median alpha>=254. This measures the stable bright line instead of the outer animated flame union.', 'white':{'canvas':[169,243],'bright_ridge_lrtb':[6,162,6,236],'method':'Alpha maxima on middle row/column, independently aligned to the same local frame for every border style.'},'render_order':'One state effect in::before z=-1; duplicate inherited player background in::after z=0, below avatar/dynamic/camp. Merely a negative effect z-index cannot move it under its own stacking-context background. The extra backdrop occludes solid effect centers even with hidden/missing/transparent avatars.','mapping_limit':'Local source-pixel and real-DOM checks; not a captured official-client runtime coordinate trace.'},
 'implementation':{'file':'src/styles/player3.css','host':'body[data-style=othersOff] #arena','available':'white sprite + fade/breathe','selected':'orange Spine APNG, independent1.05 scale; higher priority than available/target','turn':'green Spine APNG for other current-turn player','response':'red Spine APNG for self during arena.selecting, excluding choose-character, dead, selected and selectable; nonacting other target state uses same red APNG; target excludes glow_phase and position0','other_styles':'Original shared sprites and other style CSS are unchanged'},
 'verification':{'commands':['python verification/extract-yjcm-target-effects.py','node D:/spine2apng/make_apng.mjs --input <six extracted skel files> --output-dir <project temporary directory>','python verification/verify-yjcm-target-assets.py','node verification/yjcm-target-effects-browser.cjs','git diff --check'],'browser_results':'verification/yjcm-target-effects-browser-results.json','live_before':'verification/yjcm-target-effects-live-before.json','live_after':'verification/yjcm-target-effects-live-after.json','live_screenshot':'verification/yjcm-target-effects-live-after.png','checks':['all6 APNG frame counts/durations/alpha bounds/looping','4 frame styles and8 DOM states','selected/available priority and clearing','static white fade and pulse','visible APNG animation behind avatar','CSS/source-coordinate ratios and transparent margins','five other style isolation']},
 'alignment_verification':{'commands':['node verification/yjcm-target-alignment-browser.cjs','python verification/verify-yjcm-target-alignment.py'],'geometry':'verification/yjcm-target-alignment-results.json','pixels':'verification/yjcm-target-alignment-pixel-results.json','live':'verification/yjcm-target-alignment-live.json','screenshot':'verification/yjcm-target-alignment-live.png','cases':'4 borders x hidden/dynamic without opaque frame/static/outcrop x5 states; red/green use centered1.03 display scale, selected orange uses1.05 display scale, white ridges to the independently expanded3px outline, all within0.04 CSS px;48 interior RGB comparisons and4 outcrop strips differ by at most1.'},
 'white_frame_fitting':{'local_geometry':'Independent white169x243 source with ridge(6,6)-(162,236); map ridge to local frame expanded3px each side. At130x180, canvas147.333x196.513 and center(65.4359,90.4043).','layer':'User-requested white/red/green/gold all remain at z-1, behind portrait61/dynamic60 and the occluding backdrop; only white geometry expands the visible fine line beyond the root frame.','visibility':'verification/yjcm-target-white-visibility-results.json','live':'verification/yjcm-target-white-live-after.json','screenshot':'verification/yjcm-target-white-live-after.png','checks':'12 visible outer-edge comparisons,4 opaque outcrop strips unchanged; actual selectable targets inspected with decoded white image, running breathe animation and z-1.'},
 'state_priority_fix':{'rea_evidence':'ev_2085c90d63c90dfc4f1d502b9c27dbac4f77fdaf73242771f01e9ebc0931efc4','orange':'Official state2 paidiorange is selected target. Its resource was already connected, but previous2%/5% adjustments only changed red/green and left selected orange at1.0. It now uses its own1.05 scale.','actor':'Official own-round state1 precedes ask state3. Generic target highlight must not replace an acting player glow_phase with the wider red asset. Self seat response follows arena.selecting instead of generic target.','root_zoom':'Base layout/default/layout.css target_shake=zoom separately applies scale1.03 to target and target2. Suppress this additional root transform only for the acting player/self in othersOff. Current observed game uses target_shake=off; that optional zoom is a separately covered amplification path.','verification':'Real card-actions-xinsha.js playerUseCard wrapper executed on browser role DOM, checking target add/remove and original finish across both off/zoom for self/other current actor and all4 borders.'},
 'limitations':['Official client runtime side-by-side not performed','Physical Android device not tested','Actual user game stylesheet inspected/loaded; selection interaction and geometry additionally checked in the browser fixture']
}
(ROOT/'verification/yjcm-target-effects-source.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n',encoding='utf-8')
print(json.dumps({'status':'TARGET_ASSETS_OK','animations':len(records),'frames':sum(r['frames'] for r in records),'bytes':sum(r['bytes'] for r in records)},ensure_ascii=False))
