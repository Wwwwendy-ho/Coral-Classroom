"""Encode unchanged rendered views for the gallery and a labeled review overview."""
from pathlib import Path
from PIL import Image,ImageDraw,ImageFont
import json

WORK=Path('/workspace/work/shelly-cuteness-survey')
OUT=Path('/workspace/sites/coral-classroom-redesign-artbook/dist/assets/shelly-options')
OUT.mkdir(parents=True,exist_ok=True)
manifest=json.loads((WORK/'manifest.json').read_text())
assert len(manifest['options'])==10
font=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',19)
small=ImageFont.truetype('/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf',14)
overview=Image.new('RGB',(1250,1090),'#f5faf8');draw=ImageDraw.Draw(overview)
results=[]
for row in manifest['options']:
    n=row['id'];entry={'id':n};x=((n-1)%5)*250;y=((n-1)//5)*545
    draw.text((x+10,y+7),f'OPTION {n}',font=font,fill='#173b55')
    for vi,view in enumerate(['normal','top']):
        source=WORK/f'{n:02d}'/(view+'.png');asset=OUT/f'{n:02d}-{view}.webp'
        with Image.open(source) as im:
            im.load();assert im.size==(512,512)
            im.convert('RGB').save(asset,quality=88,method=6)
            entry[view]={'source':str(source),'asset':str(asset),'width':im.width,'height':im.height,'bytes':asset.stat().st_size}
            # A layout of the actual renders for review; no artwork retouching.
            preview=im.convert('RGB');preview.thumbnail((232,232),Image.Resampling.LANCZOS)
            draw.text((x+10,y+36+vi*253),'Normal' if view=='normal' else 'Top-down',font=small,fill='#496675')
            overview.paste(preview,(x+9,y+56+vi*253))
    results.append(entry)
overview.save(OUT/'overview.webp',quality=90,method=6)
overview.save(WORK/'overview.png')
(WORK/'web-manifest.json').write_text(json.dumps({'options':results,'overview':str(OUT/'overview.webp')},indent=2)+'\n')
print(json.dumps({'options':len(results),'views':sum(len([k for k in x if k in ['normal','top']]) for x in results),'bytes':sum(v['bytes'] for r in results for k,v in r.items() if k in ['normal','top'])}))
