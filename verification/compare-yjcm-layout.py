"""官方截图只用于独立验收，不生成生产布局参数。"""
from pathlib import Path
from PIL import Image, ImageDraw, ImageFont, ImageChops, ImageStat
import json,hashlib
ROOT=Path(__file__).resolve().parents[1]
reference=ROOT.parent/'雷霆/duibi.png'
r=json.loads((ROOT/'verification/yjcm-buttons-results.json').read_text('utf-8'))['referenceLayout']
a=Image.open(reference).convert('RGB'); b=Image.open(ROOT/'verification/yjcm-layout-1280.png').convert('RGB')
assert a.size==b.size==(1280,576)
u=576/750; margin=60*u
# 预期框完全由官方函数推导：Windows安全边距60，USE_HEIGHT750。
expected={
 'pile':(margin+17*u,21*u,92*u,112*u),
 'menu':(1280-margin-70.5*u,18*u,56*u,51*u),
 'confirm':(640-(128.5+207.9/2)*u,576-(254.5+60.5/2)*u,207.9*u,60.5*u),
 'cancel':(640+(128.5-207.9/2)*u,576-(254.5+60.5/2)*u,207.9*u,60.5*u),
 'sort':(1280-margin-(350+53)*u,576-(50+19)*u,106*u,38*u),
 'handcount':(1280-margin-(236+44)*u,576-(51+17)*u,88*u,34*u),
 'active':(1280-margin-(202+110)*u,576-(111+45)*u,110*u,45*u),
 'passive':(1280-margin-(202+72.5)*u,576-(72+26)*u,72.5*u,26*u),
 'flower':(margin+16.5*u,576-(10+164+72)*u,73*u,72*u),
 'face':(margin+16.5*u,576-(10+82+72)*u,73*u,72*u),
 'chat':(margin+16.5*u,576-(10+72)*u,73*u,72*u),
}
assets={'pile':'showInfo.png','menu':'btn_menu_main.png','confirm':'game_btn_1.png','cancel':'game_btn_2.png','sort':'gameinfo_btn_sort_cardsnew.png'}
rows=[]
for key,box in expected.items():
 actual=r[key]['rect']; delta={k:round(actual[k]-v,3) for k,v in zip(['x','y','width','height'],box)}
 assert max(abs(v) for v in delta.values())<.1,(key,delta)
 row={'control':key,'source_expected':list(box),'dom_delta_px':delta}
 if key in assets:
  # 只使用不含文字的高alpha边缘匹配，搜索结果只进入验收报告。
  template=Image.open(ROOT/'ui/assets/lbtn/yijiang'/assets[key]).convert('RGBA').resize((round(box[2]),round(box[3])),Image.Resampling.LANCZOS)
  points=[]
  for y in range(1,template.height-1,2):
   for x in range(1,template.width-1,2):
    p=template.getpixel((x,y))
    if p[3]>245 and (x<template.width*.24 or x>template.width*.76) and (y<template.height*.22 or y>template.height*.78): points.append((x,y,p[:3]))
  if len(points)>=30:
   scored=[]
   for dy in range(-5,6):
    for dx in range(-5,6):
     xx=round(box[0])+dx; yy=round(box[1])+dy
     err=sum(sum(abs(c-d) for c,d in zip(a.getpixel((xx+x,yy+y)),p)) for x,y,p in points)/max(1,len(points)*3)
     scored.append((err,dx,dy))
   score,dx,dy=min(scored);row['reference_edge_registration']={'offset_from_source_px':[dx,dy],'mean_rgb_error':round(score,2),'sampled_pixels':len(points)}
  else:
   row['reference_edge_registration_unavailable']='Insufficient opaque edge pixels; compare overlay visually, do not report a false zero error.'
 rows.append(row)
font=ImageFont.truetype('C:/Windows/Fonts/msyh.ttc',18)
canvas=Image.new('RGB',(1280,576*2+78),'#22262c'); draw=ImageDraw.Draw(canvas)
for im,top,label in [(a,30,'原版 duibi.png：绿框为官方代码推导的区域'),(b,636,'一将 othersOff / xinsha：绿框为实际 DOM 边界（牌大小读取设置）')]:
 draw.text((12,top-25),label,font=font,fill='white'); canvas.paste(im,(0,top)); d=ImageDraw.Draw(canvas)
 for key,box in expected.items():
  x,y,w,h=box if top==30 else [r[key]['rect'][k] for k in ['x','y','width','height']]
  d.rectangle((round(x),round(y+top),round(x+w),round(y+h+top)),outline='#5dff9a',width=1)
 # 手牌区：源容器(40,0) 与实际 DOM，保留配置给出的牌高。
 h=r['hand']['rect'];d.rectangle((round(h['left']),round(h['top']+top),round(h['right']),round(h['bottom']+top)),outline='#63baff',width=1)
canvas.save(ROOT/'verification/yjcm-layout-comparison.png')
report={'reference_sha256':hashlib.sha256(reference.read_bytes()).hexdigest(),'reference_size':a.size,'scope':'geometry only; skill assets separately checked by browser native skill updater','controls':rows,'card_dimensions':'production getCardBestScale unchanged; test changes cardScale through existing config and verifies scaling','limitation':'Reference template registration is approximate due to alpha blending; exact DOM geometry is independently checked against shipped source. Existing portrait/equipment/background/progress styles are outside this comparison.'}
(ROOT/'verification/yjcm-layout-comparison.json').write_text(json.dumps(report,ensure_ascii=False,indent=2),encoding='utf-8')
print(json.dumps({'dom_checks':len(rows),'max_dom_error':max(abs(v) for row in rows for v in row['dom_delta_px'].values()),'reference_offsets':{row['control']:row.get('reference_edge_registration') for row in rows if 'reference_edge_registration' in row}},ensure_ascii=False))
