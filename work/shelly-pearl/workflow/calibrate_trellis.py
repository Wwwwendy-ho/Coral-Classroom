"""Author a pearl/pastel material pass without changing generated geometry.
Preserves the original GLB and lossless extracted texture sources separately.
"""
from pathlib import Path
from PIL import Image
import io,json,struct
import numpy as np

root=Path('/workspace/work/shelly-pearl/workflow')
raw=(root/'shelly-trellis-source.glb').read_bytes()
n,_=struct.unpack_from('<I4s',raw,12)
doc=json.loads(raw[20:20+n]);offset=20+n
length,_=struct.unpack_from('<I4s',raw,offset)
original=raw[offset+8:offset+8+length]
data=bytearray(original)
for i,image in enumerate(doc['images']):
    view=doc['bufferViews'][image['bufferView']]
    start=view.get('byteOffset',0)
    im=Image.open(io.BytesIO(original[start:start+view['byteLength']])).convert('RGB')
    a=np.asarray(im).astype(np.float32)/255
    if i==0:
        # Gentle lift for midtone painted pigment; retain dark pupils/linework.
        lum=a.mean(axis=2,keepdims=True)
        weight=np.clip((lum-.12)/.25,0,1)*.8
        a=a*(1-weight)+(a**.82)*weight
    else:
        # Pearl finish: soft roughness floor, very restrained metal response.
        a[:,:,1]=np.maximum(a[:,:,1],.58)
        a[:,:,2]*=.12
    adjusted=Image.fromarray(np.uint8(np.clip(a*255,0,255)))
    adjusted.save(root/'textures'/f'calibrated-{i}.png')
    stream=io.BytesIO()
    if i==0:
        adjusted.save(stream,format='JPEG',quality=94,subsampling=0)
        mime='image/jpeg'
    else:
        adjusted.save(stream,format='PNG',optimize=True)
        mime='image/png'
    while len(data)%4:data.append(0)
    content=stream.getvalue();index=len(doc['bufferViews'])
    doc['bufferViews'].append({'buffer':0,'byteOffset':len(data),'byteLength':len(content)})
    data+=content;image.update(bufferView=index,mimeType=mime)
for texture in doc['textures']:
    ext=texture.get('extensions',{}).pop('EXT_texture_webp',None)
    if ext:texture['source']=ext['source']
    if not texture.get('extensions'):texture.pop('extensions',None)
for key in ['extensionsUsed','extensionsRequired']:
    doc[key]=[e for e in doc.get(key,[]) if e!='EXT_texture_webp']
    if not doc[key]:doc.pop(key,None)
doc['materials'][0]['name']='Shelly | pastel pearl surface'
doc['buffers'][0]['byteLength']=len(data)
encoded=json.dumps(doc,separators=(',',':')).encode()
encoded+=b' '*((-len(encoded))%4);data+=b'\0'*((-len(data))%4)
output=root/'shelly-pearl-calibrated.glb'
output.write_bytes(struct.pack('<4sII',b'glTF',2,28+len(encoded)+len(data))+struct.pack('<I4s',len(encoded),b'JSON')+encoded+struct.pack('<I4s',len(data),b'BIN\0')+data)
print(output,output.stat().st_size)
