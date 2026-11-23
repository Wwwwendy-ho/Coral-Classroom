"""Report projected dark-pupil shape from real GLB geometry and map pixels.

This checks viewing-angle foreshortening; it is not a perceptual cuteness score.
Occlusion and highlights can change the visible aperture in the rendered image.
"""
from pathlib import Path
import json,math,sys
import numpy as np
sys.path.insert(0,'/workspace/coral-classroom/tools/art')
from refine_shelly_mouth import Model

def measure(path):
    model=Model(path)
    a=model.attributes
    p=model.array(a['POSITION'])
    uv=model.array(a['TEXCOORD_0'])
    joints=model.array(a['JOINTS_0']);weights=model.array(a['WEIGHTS_0'])
    nodes=model.doc['nodes'];names=[nodes[i]['name'] for i in model.doc['skins'][0]['joints']]
    image=np.asarray(model.image(0).convert('RGB'));h,w=image.shape[:2]
    pixels=image[np.clip((uv[:,1]*h).astype(int),0,h-1),np.clip((uv[:,0]*w).astype(int),0,w-1)]
    dark=(pixels[:,0]<42)&(pixels[:,1]<48)&(pixels[:,2]<62)
    out=[]
    for eye in ['EyeL','EyeR']:
        group=np.any((joints==names.index(eye))&(weights>.5),axis=1)
        points=p[dark&group]
        if len(points)<8:raise ValueError('Too few sampled pupil vertices for '+eye)
        for elevation in [15,50,80]:
            for yaw in [0,30]:
                el,ya=map(math.radians,[elevation,yaw])
                right=np.array([math.cos(ya),0,-math.sin(ya)])
                up=np.array([-math.sin(ya)*math.sin(el),math.cos(el),-math.cos(ya)*math.sin(el)])
                xy=np.column_stack((points@right,points@up))
                values=np.linalg.eigvalsh(np.cov(xy.T))
                ratio=math.sqrt(max(0,values[0])/max(1e-12,values[1]))
                out.append({'eye':eye,'elevation':elevation,'yaw':yaw,'dark_vertices':len(points),'projected_axis_ratio':round(ratio,3)})
    return {'file':str(path),'scope':'Pupil vertex projection; no occlusion or GPU shading; not a perceptual score','views':out}

results=[measure(Path(arg)) for arg in sys.argv[1:]]
print(json.dumps(results,indent=2))
