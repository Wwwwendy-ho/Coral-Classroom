"""Match generated results to their saved originals, then encode web assets."""
from pathlib import Path
from PIL import Image
import base64
import json
import shutil

WORK=Path('/workspace/work/redesign-artbook')
OUT=Path('/workspace/sites/coral-classroom-redesign-artbook/dist/assets')
OUT.mkdir(parents=True,exist_ok=True)
requests=json.loads((WORK/'image-results.json').read_text())
candidates=list(Path('/workspace/generated_images').glob('*.png'))
suffixes={}
for path in candidates:
    size=path.stat().st_size
    with path.open('rb') as stream:
        stream.seek(-min(size,768+size%3),2)
        suffixes[base64.b64encode(stream.read()).decode()[-256:]]=path

results=[]
for entry in requests:
    source=suffixes.get(entry['tail'])
    if not source:raise RuntimeError('Generated source not found for '+entry['id'])
    destination=OUT/(entry['id']+'.webp')
    with Image.open(source) as image:
        dimensions=image.size
        image.convert('RGB').save(destination,quality=86,method=6)
    results.append({'id':entry['id'],'source':str(source),'asset':str(destination),'dimensions':dimensions,'bytes':destination.stat().st_size})

approved=Path('/workspace/generated_images/exec-6098929c-685f-410c-9cd4-45909048d01a.png')
with Image.open(approved) as image:
    dimensions=image.size
    image.convert('RGB').save(OUT/'coral-cove.webp',quality=88,method=6)
results.insert(0,{'id':'coral-cove','source':str(approved),'asset':str(OUT/'coral-cove.webp'),'dimensions':dimensions,'bytes':(OUT/'coral-cove.webp').stat().st_size})
(WORK/'image-manifest.json').write_text(json.dumps(results,indent=2)+'\n')
print(json.dumps({'images':len(results),'bytes':sum(r['bytes'] for r in results),'ids':[r['id'] for r in results]}))
