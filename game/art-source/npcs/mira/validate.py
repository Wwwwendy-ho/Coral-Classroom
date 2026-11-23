"""Read the exported GLBs and verify their actual mobile contracts.
python3 art-source/npcs/mira/validate.py /workspace/work/mira-production
"""
import hashlib,io,json,struct,sys
from pathlib import Path
import numpy as np
from PIL import Image
folder=Path(sys.argv[1]) if len(sys.argv)>1 else Path(__file__).parent
out={}
for tier,limit,byte_limit,sizes in [('close',24000,3000000,[(2048,2048),(512,512)]),('board',12000,1200000,[(1024,1024),(256,256)])]:
 path=folder/f'mira-{tier}.glb';data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];doc=json.loads(data[20:20+n]);binary=data[28+n:]
 def buffer(i):
  v=doc['bufferViews'][i];return binary[v.get('byteOffset',0):v.get('byteOffset',0)+v['byteLength']]
 def array(i):
  a=doc['accessors'][i];dt={5121:'u1',5123:'<u2',5125:'<u4',5126:'<f4'}[a['componentType']];w={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
  return np.frombuffer(buffer(a['bufferView']),dtype=dt,offset=a.get('byteOffset',0),count=a['count']*w).reshape(-1,w)
 prim=doc['meshes'][0]['primitives'][0];attrs=prim['attributes'];pos=array(attrs['POSITION']);weights=array(attrs['WEIGHTS_0']);joints=array(attrs['JOINTS_0']);tri=len(array(prim['indices']))//3
 dims=[];mapstats=[]
 for im in doc['images']:
  image=Image.open(io.BytesIO(buffer(im['bufferView'])));dims.append(image.size);mapstats.append(image.getextrema())
 clips={a['name']:{doc['nodes'][c['target']['node']]['name']+':'+c['target']['path'] for c in a['channels']} for a in doc['animations']}
 anchors={node['name']:index for index,node in enumerate(doc['nodes']) if node.get('name') in ['HatAnchor','MouthAnchor']}
 head=next(i for i,node in enumerate(doc['nodes']) if node.get('name')=='Head')
 assert len(doc['meshes'])==len(doc['meshes'][0]['primitives'])==len(doc['materials'])==len(doc['skins'])==1
 assert len(doc['skins'][0]['joints'])<=16 and len(doc['images'])==2
 assert tri<=limit and len(data)<byte_limit and dims==sizes
 assert np.isfinite(pos).all() and np.isfinite(weights).all() and np.max(abs(weights.sum(axis=1)-1))<.001
 assert np.min(weights)>=0 and np.max(joints)<len(doc['skins'][0]['joints'])
 names=[doc['nodes'][i]['name'] for i in doc['skins'][0]['joints']];body_index=names.index('Body');body_weight=np.sum(weights*(joints==body_index),axis=1)
 carapace=(pos[:,1]>.40)&(pos[:,1]<.90)&(pos[:,2]<.30);carapace_error=float(np.max(1-body_weight[carapace]));assert carapace_error<.001
 assert set(clips)=={'Idle','Listen','React'}
 for name,channels in clips.items():assert {'Head:rotation','EyeL:scale','EyeR:scale','EyeL:translation','EyeR:translation'}<=channels
 assert len(anchors)==2 and all(i in doc['nodes'][head]['children'] for i in anchors.values())
 # Body roughness must be nonzero; a black packed map incorrectly turns the
 # organic skin into a mirror and destroys color review.
 assert mapstats[1][1][1]>100
 out[tier]={'sha256':hashlib.sha256(data).hexdigest(),'triangles':tri,'bytes':len(data),'mesh_count':1,'primitive_count':1,'material_count':1,'skin_count':1,'joints':len(doc['skins'][0]['joints']),'vertices':len(pos),'max_weight_sum_error':float(np.max(abs(weights.sum(axis=1)-1))),'rigid_carapace_max_non_body_weight':carapace_error,'finite_attributes':True,'texture_sizes':dims,'surface_channel_extrema':mapstats[1],'clips':{k:sorted(v) for k,v in clips.items()},'head_anchors':list(anchors),'passed':True}
(folder/'validation.json').write_text(json.dumps(out,indent=2));print(json.dumps({k:{x:v[x] for x in ['triangles','bytes','joints','passed']} for k,v in out.items()},indent=2))
