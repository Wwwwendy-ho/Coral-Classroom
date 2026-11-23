"""Check the exported attributes and rest anatomy against the animated GLB contract."""
import json
import sys
from pathlib import Path

import numpy as np
from scipy.spatial.transform import Rotation
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components

root=Path('/workspace/coral-classroom')
sys.path.insert(0,str(root/'tools/art'))
from refine_shelly_mouth import Model

out=Path(__file__).resolve().parent
def bounds(p):
    return [p.min(axis=0).round(5).tolist(),p.max(axis=0).round(5).tolist()]

def validate(path,source):
    m,baseline=Model(path),Model(source)
    d=m.doc
    assert len(d['materials'])==len(d['skins'])==len(d['meshes'])==len(d['meshes'][0]['primitives'])==1
    attributes={name:m.array(index) for name,index in m.attributes.items()}
    pos=attributes['POSITION'].astype(float)
    norm=attributes['NORMAL'].astype(float)
    weights=attributes['WEIGHTS_0']
    joints=attributes['JOINTS_0']
    faces=m.array(m.primitive['indices']).reshape(-1,3)
    assert np.isfinite(pos).all() and np.isfinite(norm).all() and (faces>=0).all() and faces.max()<len(pos)
    assert np.max(abs(np.linalg.norm(norm,axis=1)-1))<.001
    assert np.allclose(weights.sum(1),1) and np.min(weights)>=0 and joints.max()<11
    assert len(faces)<=len(baseline.array(baseline.primitive['indices']))//3
    raw=np.cross(pos[faces[:,1]]-pos[faces[:,0]],pos[faces[:,2]]-pos[faces[:,0]])
    assert np.min(np.linalg.norm(raw,axis=1))>1.e-11
    assert not np.any(np.einsum('ij,ij->i',raw,norm[faces].sum(axis=1))<-.00001)
    nodes=d['nodes'];by_name={n['name']:i for i,n in enumerate(nodes)}
    skin=d['skins'][0]
    names=[nodes[i]['name'] for i in skin['joints']]
    assert len(names)==11
    world={}
    def visit(idx,parent=np.eye(4)):
        n=nodes[idx]
        matrix=np.eye(4)
        matrix[:3,:3]=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()@np.diag(n.get('scale',[1,1,1]))
        matrix[:3,3]=n.get('translation',[0,0,0])
        world[idx]=parent@matrix
        for child in n.get('children',[]):
            visit(child,world[idx])
    for start in d['scenes'][d['scene']]['nodes']:
        visit(start)
    ibm=m.array(skin['inverseBindMatrices']).reshape(-1,4,4).transpose(0,2,1)
    max_error=np.max(abs(np.stack([world[i] for i in skin['joints']])@ibm-np.eye(4)))
    assert max_error<.00001
    anchors={key:world[by_name[key]][:3,3].round(4).tolist() for key in ['HatAnchor','MouthAnchor']}
    assert np.allclose(anchors['HatAnchor'],[0,1.1809,.634],atol=.001)
    assert anchors['MouthAnchor'][2]>1.01
    uv=attributes['TEXCOORD_0']
    shell_mask=(uv[:,0]<.5)&(uv[:,1]<.5)
    shell_bounds=bounds(pos[shell_mask])
    paddles={}
    # The high-weight portion of each appendage must resolve to one contiguous
    # surface after welding the repeated vertices along the UV seam and tip.
    for bone in ['FlipperFL','FlipperFR','FlipperRL','FlipperRR','Tail']:
        w=((joints==names.index(bone))*weights).sum(1)
        mask=w>.5
        part=pos[mask]
        part_faces=faces[mask[faces].all(1)]
        vertices,inv=np.unique(part.round(6),axis=0,return_inverse=True)
        dedup=np.zeros(len(pos),dtype=int);dedup[mask]=inv
        ids=dedup[part_faces]
        i=ids[:,[0,1,2]].ravel();j=ids[:,[1,2,0]].ravel()
        edges=coo_matrix((np.ones(len(i)),(i,j)),shape=(len(vertices),len(vertices)))
        components=connected_components(edges,directed=False,return_labels=False)
        assert components==1 and np.max(w)==1
        paddles[bone]={'vertices_weight_gt_half':int(mask.sum()),'vertex_weight_range_nonzero':[round(float(w[w>0].min()),5),1.0],
                       'connected_surfaces_weight_gt_half':int(components),'bounds_xyz_weight_gt_half':bounds(part)}
        if bone=='Tail':
            assert np.max(abs(part[:,0]))<.07 and part[:,2].max()<-.70
            assert part[:,2].min()>shell_bounds[0][2]
        elif bone.endswith('L'):
            assert part[:,0].max()<-.20
        else:
            assert part[:,0].min()>.20
    animations={}
    for anim,prior in zip(d['animations'],baseline.doc['animations']):
        assert anim['name']==prior['name'] and len(anim['channels'])==len(prior['channels'])==33
        duration=0
        for channel in anim['channels']:
            target=channel['target']
            sm=anim['samplers'][channel['sampler']]
            t=m.array(sm['input'])
            v=m.array(sm['output'])
            old=baseline.array(sm['output'])
            assert np.isfinite(v).all() and np.array_equal(t,baseline.array(sm['input']))
            assert np.allclose(v,old) if target['path']!='translation' else np.allclose(v-v[0],old-old[0],atol=.00001)
            duration=max(duration,float(t.max()))
        animations[anim['name']]={'channels':len(anim['channels']),'duration_s':round(duration,3)}
    assert set(animations)==set(['Idle','Swim','Turn','Happy','Curious','Celebrate'])
    return {'file':path.name,'triangles':len(faces),'baseline_triangle_ceiling':len(baseline.array(baseline.primitive['indices']))//3,
            'bytes':path.stat().st_size,'vertices':len(pos),'materials':1,'textures_px':[list(m.image(i).size) for i in range(2)],
            'bounds_xyz_m':bounds(pos),'carapace_bounds_xyz_m':shell_bounds,'joints':names,'max_inverse_bind_matrix_error':float(max_error),
            'anchors_xyz_m':anchors,'appendages':paddles,'animations':animations}
report=[validate(out/f'crafted-{key}.glb',root/'assets/models'/f'{key}.glb') for key in ['shelly','shelly-view']]
(out/'validation.json').write_text(json.dumps(report,indent=2)+'\n')
print([(v['file'],v['triangles'],v['joints'],v['bounds_xyz_m']) for v in report])
