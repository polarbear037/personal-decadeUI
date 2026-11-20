"""检查真实角色DOM截图：所有状态均不把动画实心中心盖到暗将/动皮/静态牌面。"""
import json
from pathlib import Path
from PIL import Image,ImageChops,ImageStat

ROOT=Path(__file__).resolve().parent
rows=json.loads((ROOT/'yjcm-target-alignment-results.json').read_text('utf-8'))
checks=[]
visibility=[]
for row in rows:
    image=Image.open(ROOT/('yjcm-target-alignment-'+row['border']+'.png')).convert('RGB')
    for kind in ['hidden','dynamic','static']:
        samples=[]
        for player in row['records']:
            if not player['id'].startswith(kind+'-'):continue
            r=player['rect']
            samples.append((player['id'],image.crop((round(r['x']+45),round(r['y']+45),round(r['x']+125),round(r['y']+180)))))
        for name,sample in samples[1:]:
            difference=ImageChops.difference(samples[0][1],sample)
            maximum=max(channel[1] for channel in difference.getextrema())
            assert maximum<=1,(row['border'],name,maximum)
            checks.append({'border':row['border'],'state':name,'interior_max_rgb_difference':maximum})
        edge_samples={}
        for player in row['records']:
            if player['id'] not in [kind+'-idle',kind+'-white']:continue
            r=player['rect']
            edge_samples[player['id']]=image.crop((round(r['x']+60),round(r['y']-8),round(r['x']+115),round(r['y'])))
        difference=ImageChops.difference(edge_samples[kind+'-idle'],edge_samples[kind+'-white'])
        mean=sum(ImageStat.Stat(difference).mean)/3
        assert mean>10,(row['border'],kind,'white outer edge is not visibly rendered',mean)
        visibility.append({'border':row['border'],'portrait':kind,'white_edge_mean_rgb_difference':mean})
    # 不透明露头从角色顶部向上延伸12px；下层白框不能盖掉这段头像。
    crops={}
    for player in row['records']:
        if player['id'] not in ['outcrop-idle','outcrop-white']:continue
        r=player['rect']
        crops[player['id']]=image.crop((round(r['x']+60),round(r['y']-12),round(r['x']+115),round(r['y']-1)))
    difference=ImageChops.difference(crops['outcrop-idle'],crops['outcrop-white'])
    maximum=max(channel[1] for channel in difference.getextrema())
    assert maximum<=1,(row['border'],'outcrop portrait was covered by white frame',maximum)
(ROOT/'yjcm-target-alignment-pixel-results.json').write_text(json.dumps(checks,indent=2)+'\n',encoding='utf-8')
print('OPAQUE_BACKDROP_CENTER_OK:',len(checks),'comparisons, RGB difference<=1')
(ROOT/'yjcm-target-white-visibility-results.json').write_text(json.dumps(visibility,indent=2)+'\n',encoding='utf-8')
print('WHITE_VISIBLE_BEHIND_PORTRAIT_OK:',len(visibility),'outer-edge comparisons; all4 outcrop strips unchanged')
