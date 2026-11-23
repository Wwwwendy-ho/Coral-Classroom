"""Ten reversible proportion studies from the actual approved-view Shelly mesh.

These are review candidates. This script never replaces the live game assets.
The same smooth morph is applied to skin geometry, joint pivots and anchors.
"""
from pathlib import Path
import argparse,json,sys
import numpy as np
from scipy.spatial.transform import Rotation
from refine_shelly_mouth import Model

ROOT=Path(__file__).resolve().parents[2]
WORK=Path('/workspace/work/shelly-cuteness-survey')
LEVELS=[.05,.14,.23,.32,.42,.53,.65,.77,.89,1.]

def smooth(a,b,x):
    t=np.clip((x-a)/(b-a),0,1)
    return t*t*(3-2*t)

def head(p,level):
    p=np.asarray(p,dtype=float);out=p.copy();y=p[...,1]
    skull=smooth(.62,.90,y);neck=smooth(.36,.78,y)
    out[...,0]=p[...,0]*(1+.55*level*skull)
    out[...,1]=y-.155*level*neck+.35*level*(y-.95)*skull
    # Grow cranial depth with its height. Flattening this axis would turn the
    # round, upward-readable pupils into horizontal ovals in the overhead view.
    out[...,2]=.70+(p[...,2]-.70)*(1+.35*level*skull)+.10*level*skull
    return out

def body(p,level):
    p=np.asarray(p,dtype=float);out=p.copy()
    out[...,0]*=1+.04*level
    out[...,2]=-.235+(out[...,2]+.235)*(1-.14*level)
    return out

def world_nodes(doc):
    worlds={}
    def visit(i,parent):
        n=doc['nodes'][i];m=np.eye(4)
        m[:3,:3]=Rotation.from_quat(n.get('rotation',[0,0,0,1])).as_matrix()@np.diag(n.get('scale',[1,1,1]))
        m[:3,3]=n.get('translation',[0,0,0]);worlds[i]=parent@m
        for child in n.get('children',[]):visit(child,worlds[i])
    for scene in doc['scenes']:
        for i in scene['nodes']:
            if i not in worlds:visit(i,np.eye(4))
    return worlds

def build(source,output,number,level):
    model=Model(source);doc=model.doc;old_world=world_nodes(doc)
    nodes=doc['nodes'];names={n['name']:i for i,n in enumerate(nodes)}
    skin=doc['skins'][0];bone_names=[nodes[i]['name'] for i in skin['joints']]
    a=model.attributes;p=model.array(a['POSITION']).astype(float)
    normals=model.array(a['NORMAL']).astype(float)
    joints=model.array(a['JOINTS_0']);weights=model.array(a['WEIGHTS_0'])
    groups={name:np.sum(np.where(joints==i,weights,0),axis=1) for i,name in enumerate(bone_names)}
    hmask=sum(groups.get(name,0) for name in ['Neck','Head','EyeL','EyeR'])>.01
    limbs={name:groups[name]>.01 for name in ['FlipperFL','FlipperFR','FlipperRL','FlipperRR']}
    tmask=groups['Tail']>.01
    ordinary=~hmask&~tmask
    for mask in limbs.values():ordinary &= ~mask
    eye_centers={name:old_world[names[name]][:3,3].copy() for name in ['EyeL','EyeR']}
    anchors={name:old_world[names[name]][:3,3].copy() for name in limbs}

    def morph(points):
        result=body(points,level)
        result[hmask]=head(points[hmask],level)
        for name,mask in limbs.items():
            anchor=anchors[name];delta=points[mask]-anchor
            # Shorter, slightly fuller paddles retain their marine tapered form.
            delta=delta*np.array([1-.10*level,1+.06*level,1-.10*level])
            result[mask]=body(anchor,level)+delta
        for name in eye_centers:
            factor=groups[name]
            mask=factor>.001
            center=head(eye_centers[name],level)
            # The skin-weight fade keeps the outer orbital seam on the head.
            extra=1+.17*level*factor[mask]**2
            result[mask]=center+(result[mask]-center)*extra[:,None]
        return result

    new_p=morph(p)
    # Transform actual smooth surface normals by the local inverse transpose.
    epsilon=1e-5;columns=[]
    for axis in range(3):
        shift=np.zeros(3);shift[axis]=epsilon
        columns.append((morph(p+shift)-morph(p-shift))/(2*epsilon))
    jac=np.stack(columns,axis=-1)
    new_n=np.linalg.solve(np.swapaxes(jac,-1,-2),normals[...,None])[...,0]
    new_n/=np.maximum(1e-10,np.linalg.norm(new_n,axis=1,keepdims=True))

    targets={}
    for i,n in enumerate(nodes):
        name=n.get('name','');old=old_world.get(i)
        if old is None:continue
        point=old[:3,3]
        if name in ['Neck','Head','EyeL','EyeR','HatAnchor','MouthAnchor']:
            targets[i]=head(point,level)
        elif name in ['Body','Tail'] or name.startswith('Flipper'):
            targets[i]=body(point,level)
    matrices={};offsets={}
    def visit(i,parent):
        node=nodes[i];local=np.eye(4)
        local[:3,:3]=Rotation.from_quat(node.get('rotation',[0,0,0,1])).as_matrix()@np.diag(node.get('scale',[1,1,1]))
        previous=np.asarray(node.get('translation',[0,0,0]),dtype=float)
        local[:3,3]=previous
        if i in targets:
            position=(np.linalg.inv(parent)@[*targets[i],1])[:3]
            offsets[i]=position-previous;node['translation']=position.tolist();local[:3,3]=position
        matrices[i]=parent@local
        for child in node.get('children',[]):visit(child,matrices[i])
    for scene in doc['scenes']:
        for i in scene['nodes']:
            if i not in matrices:visit(i,np.eye(4))
    arrays={a['POSITION']:new_p,a['NORMAL']:new_n,
            skin['inverseBindMatrices']:np.array([np.linalg.inv(matrices[i]).T.ravel() for i in skin['joints']])}
    translations={}
    for clip in doc.get('animations',[]):
        for channel in clip['channels']:
            target=channel['target']
            if target['path']=='translation' and target['node'] in offsets:
                accessor=clip['samplers'][channel['sampler']]['output']
                value=model.array(accessor)+offsets[target['node']]
                if accessor in translations:assert np.allclose(translations[accessor],value)
                translations[accessor]=value
    arrays.update(translations)
    for value in arrays.values():assert np.isfinite(value).all()
    assert np.allclose(weights.sum(axis=1),1,atol=1e-5)
    assert len([n for n in bone_names if n.startswith('Flipper')])==4
    doc['asset']['generator']='Coral Classroom | Shelly baby-proportion study '+str(number)
    doc.setdefault('extras',{})['shellyProportionStudy']={'option':number,'level':level}
    output.parent.mkdir(parents=True,exist_ok=True)
    model.write(output,arrays,{})
    return {'id':number,'title':f'Option {number}',
            'description':DESCRIPTIONS[number-1],
            'level':level,'model':str(output),'bytes':output.stat().st_size,
            'parameters':{'head_width_factor':round(1+.55*level,3),
                          'eye_size_relative_to_head':round(1+.17*level,3),
                          'neck_lowering':round(.155*level,3),
                          'shell_length_factor':round(1-.14*level,3),
                          'paddle_length_factor':round(1-.10*level,3)},
            'bounds':[new_p.min(axis=0).tolist(),new_p.max(axis=0).tolist()],
            'triangles':len(model.array(model.primitive['indices']))//3,
            'flippers':4,'clips':[x['name'] for x in doc['animations']]}

DESCRIPTIONS=[
 'A subtle softening of the current Shelly, with a slightly rounder face.',
 'A little more cheek fullness and a gently larger head.',
 'Rounder eyes and a softer, shorter-necked silhouette.',
 'A fuller head with more noticeable baby proportions.',
 'A balanced baby-turtle look with larger eyes and compact proportions.',
 'An increasingly round face and shorter, softer paddles.',
 'A large, gentle face with a compact hatchling body.',
 'Very baby-like cheeks and eyes, with a smaller-looking shell.',
 'A pronounced big-head hatchling design with broad, sweet eyes.',
 'The most baby-like option: the fullest head, largest eyes and most compact body.',
]

def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source',type=Path,default=WORK/'base-shelly-view.glb')
    parser.add_argument('--output',type=Path,default=WORK)
    parser.add_argument('--options',default='1,2,3,4,5,6,7,8,9,10')
    args=parser.parse_args();rows=[]
    for n in map(int,args.options.split(',')):
        assert 1<=n<=10
        row=build(args.source,args.output/f'{n:02d}'/'shelly.glb',n,LEVELS[n-1]);rows.append(row)
        print(json.dumps({'option':n,'bytes':row['bytes'],'head_factor':row['parameters']['head_width_factor']}),flush=True)
    args.output.mkdir(parents=True,exist_ok=True)
    (args.output/'manifest.json').write_text(json.dumps({'scope':'Ten actual 3D proportion studies; live game unchanged','options':rows},indent=2)+'\n')

if __name__=='__main__':main()
