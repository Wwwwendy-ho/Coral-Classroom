"""Reproducible authored Jisu hermit-crab candidate. No active asset writes.
blender -b --factory-startup --python tools/art/build_jisu.py -- --output /workspace/work/jisu-production
"""
import argparse, importlib.util, json, math, sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, Quaternion
spec=importlib.util.spec_from_file_location('cafe_helpers',str(Path(__file__).with_name('build_cafe_seahorse.py')))
h=importlib.util.module_from_spec(spec);spec.loader.exec_module(h)
h.YAW_ROTATION=Quaternion((0,0,1),0)
h.ATLAS={'shell':(0,0,512,1024),'limb':(512,0,256,512),'body':(768,0,256,256),'claw':(768,256,256,256),'eye':(512,512,256,256),'cloth':(768,512,256,256),'paper':(512,768,256,256),'orange':(768,768,128,128),'metal':(896,768,128,128),'dark':(768,896,128,128),'white':(896,896,128,128)}
TAU=math.tau
Z=Vector((0,0,1))
def mix(a,b,t):return a+(b-a)*t

def tube(points,radii,u,v,scale=(1,1),ripple=0):
    p=Vector(h.curve(points,v*(len(points)-1)))
    a=Vector(h.curve(points,max(0,v-.001)*(len(points)-1)))
    b=Vector(h.curve(points,min(1,v+.001)*(len(points)-1)))
    tangent=(b-a).normalized();n=tangent.cross(Vector((0,1,.001))).normalized();w=tangent.cross(n).normalized()
    r=h.curve([(r,) for r in radii],v*(len(radii)-1))[0]
    return p+r*(1+ripple*math.cos(TAU*v*19))*(n*math.cos(TAU*u)*scale[0]+w*math.sin(TAU*u)*scale[1])

def ell(c,s,u,v):
    a=TAU*u;b=math.pi*v
    return Vector(c)+Vector((s[0]*math.cos(a)*math.sin(b),s[1]*math.sin(a)*math.sin(b),s[2]*math.cos(b)))

def shell_center(t):
    return Vector((.025+.075*math.sin(math.pi*t),.93-1.12*t,1.54-.74*t))

def shell_frame(t):
    return shell_center(t),Vector((1,0,0)),Vector((0,0,1))

def shell(u,v,inside=False):
    # Continuous screw-shaped gastropod surface. A helical shoulder rolls around
    # a widening conical axis rather than intersecting swept tube whorls.
    p,n,w=shell_frame(v);a=TAU*u
    base=.52*math.sin(math.pi*.5*v)**.82+.12*math.sin(math.pi*v)**1.6
    phase=TAU*v*3.1+a
    shoulder=.068*math.sin(phase)*math.sin(math.pi*v)**.5
    growth=.0016*math.cos(a*21+v*37)+.0007*math.sin(a*43-v*21)
    r=max(.002,base+shoulder+growth*v)-(.030 if inside else 0)
    return p+r*(n*math.cos(a)+w*math.sin(a)*1.02)

def eye(side,u,v):
    # Spherical portrait mapped by polar distance from the forward direction.
    c=Vector((side*.224,-.645,1.31));a=TAU*u;p=math.pi*v
    return c+Vector((.128*math.sin(p)*math.cos(a),-.078*math.cos(p),.148*math.sin(p)*math.sin(a)))

def eye_rim(side,u,v):
    c=Vector((side*.224,-.636,1.31));a=TAU*u;b=TAU*v
    # Sculpted dark cuticle annulus behind the globe, without eyebrows/lashes.
    return c+Vector(((.134+.012*math.cos(b))*math.cos(a),.014*math.sin(b)+.024,(.154+.013*math.cos(b))*math.sin(a)))

def cloth_box(c,s,u,v):
    a=TAU*u;z=mix(-1,1,v)
    # Rounded square perimeter, with softly padded canvas walls.
    x=math.copysign(abs(math.cos(a))**.60,math.cos(a));y=math.copysign(abs(math.sin(a))**.60,math.sin(a))
    f=(.83+.17*math.sin(math.pi*v))
    return Vector(c)+Vector((s[0]*x*f,s[1]*y*f,s[2]*z))

def flap(u,v):
    x=mix(-.882,-.437,u)+(1-2*u)*.024*v**5;z=mix(.805,.555,v)+.044*abs(2*u-1)**5*v**5-.018*(1-(2*u-1)**2)*v
    return Vector((x,-.726-.027*math.sin(math.pi*v),z))

def envelope(u,v):
    x=mix(.49,.94,u);z=mix(.60,.92,v)+.05*u
    return Vector((x,-.970-.010*math.sin(math.pi*u)*math.sin(math.pi*v),z))

def make_mesh(lod,mat,rig):
    m=h.MeshBuilder();close=lod=='close';K=1;resolution=1.30 if close else .78
    def grid(fn,n,j,tile,bone='Body',**kw):m.grid(fn,max(4,round(n*resolution)),max(2,round(j*resolution)),tile,bone,**kw)
    def pipe(points,rad,tile,bone='Body',n=8,j=10,scale=(1,1),ripple=0):
        grid(lambda u,v:tube(points,rad,u,v,scale,ripple),n*K,j*K,tile,bone)
    grid(lambda u,v:shell(u,v),32*K,42*K,'shell')
    # Real rolled aperture lip, full interior wall and shaded closed throat.
    p,n,w=shell_frame(1)
    grid(lambda u,v:p+(n*math.cos(TAU*u)+w*1.04*math.sin(TAU*u))*(.521+.025*math.cos(TAU*v))+Vector((0,.024*math.sin(TAU*v),0)),32*K,6*K,'shell',wrap_v=True)
    grid(lambda u,v:shell(u,mix(.90,1,v),True),28*K,5*K,'shell',reverse=True)
    grid(lambda u,v:Vector((.025,-.18+.55*v,.80+.14*v))+Vector((math.cos(TAU*u)*.52*(1-.55*v),0,math.sin(TAU*u)*.53*(1-.55*v))),28*K,8*K,'dark',reverse=True)
    grid(lambda u,v:ell((0,-.21,.71),(.37,.35,.30),u,v),20*K,10*K,'body')
    # Flattened carapace arch, a real crab thorax in the aperture.
    grid(lambda u,v:ell((0,-.47,.665),(.40,.32,.218),u,v)+Vector((0,0,.014*math.cos(TAU*u*7)*math.sin(math.pi*v)**3)),24*K,12*K,'body')
    # Natural paired maxillipeds, deliberately no smile or lips.
    for side,suf in [(-1,'L'),(1,'R')]:
        pipe([(side*.095,-.761,.61),(side*.061,-.81,.56),(side*.018,-.815,.586)],[.030,.026,.004],'claw',n=6,j=6)
        for j in range(3):
            # Six grounded, arched walking legs, tapering dactyls.
            origin=(side*(.26+.015*j),-.31+j*.20,.61)
            knee=(side*(.61+.09*j),-.37+j*.27,.50+.055*j)
            ankle=(side*(.78+.12*j),-.49+j*.30,.23)
            tip=(side*(.80+.11*j),-.60+j*.30,.035)
            pipe([origin,knee,ankle,tip],[.112-.008*j,.096-.006*j,.070,.044],'limb','Leg%d.%s'%(j+1,suf),n=12,j=12)
            # Rounded plush foot pad closes the leg tube; knee gets a soft ball joint.
            grid(lambda u,v,tip=tip:ell((tip[0],tip[1],tip[2]+.012),(.052,.056,.044),u,v),12*K,8*K,'limb','Leg%d.%s'%(j+1,suf))
            grid(lambda u,v,knee=knee,j=j:ell(knee,(.100-.006*j,.100-.006*j,.100-.006*j),u,v),12*K,8*K,'limb','Leg%d.%s'%(j+1,suf))
            # Joint cuffs reinforce articulated cuticle.
            pipe([tuple(Vector(knee)+Vector((0,0,.025))),tuple(Vector(knee)+Vector((side*.03,0,-.04)))],[.080-.006*j,.075-.006*j],'limb','Leg%d.%s'%(j+1,suf),n=8,j=3)
        # Curved orange eye peduncles and socket collars.
        pipe([(side*.18,-.63,.77),(side*.205,-.645,.99),(side*.224,-.645,1.185)],[.037,.032,.043],'orange','Eye.'+suf,n=10,j=12)
        grid(lambda u,v:eye(side,u,v),20*K,12*K,'eye','Eye.'+suf)
        grid(lambda u,v:eye_rim(side,u,v),24*K,6*K,'body','Eye.'+suf,wrap_v=True)
        pipe([(side*.08,-.72,.75),(side*.12,-.78,1.02),(side*.29,-.79,1.23),(side*.42,-.76,1.27)],[.014,.011,.007,.001],'orange','Antenna.'+suf,n=6,j=14)
        # Chelipeds are unequal; left rests low, right reaches forward/up to pinch and hold the envelope.
        if side < 0:
            mul=1.17
            c=(-.52,-.83,.38)
            pipe([(-.29,-.55,.61),(-.48,-.67,.48),c],[.105,.093,.09],'limb','Claw.L',n=10,j=10)
            grid(lambda u,v:ell(c,(.153*mul,.168*mul,.20*mul),u,v),16*K,10*K,'claw','Claw.L')
            pipe([(-.62,-.86,.37),(-.67,-.89,.22),(-.58,-.91,.13)],[.097*mul,.060*mul,.003],'claw','Claw.L',n=9,j=9)
            pipe([(-.45,-.87,.36),(-.46,-.94,.22),(-.55,-.94,.15)],[.069*mul,.039*mul,.002],'claw','Claw.L',n=8,j=9)
        else:
            mul=.88
            c=(.48,-.85,.58)
            pipe([(.29,-.55,.61),(.44,-.70,.56),c],[.105,.093,.086],'limb','Claw.R',n=10,j=10)
            grid(lambda u,v:ell(c,(.145*mul,.155*mul,.185*mul),u,v),16*K,10*K,'claw','Claw.R')
            # Outer pincer presses against front face of envelope; inner pincer supports behind it.
            pipe([(.54,-.88,.57),(.58,-.955,.63),(.53,-.985,.69)],[.088*mul,.054*mul,.003],'claw','Claw.R',n=9,j=9)
            pipe([(.42,-.87,.57),(.44,-.945,.64),(.50,-.955,.70)],[.064*mul,.036*mul,.002],'claw','Claw.R',n=8,j=9)
    # Postal pouch, flap and seams are physical. Body deliberately stays crab-like.
    grid(lambda u,v:cloth_box((-.658,-.65,.55),(.235,.082,.235),u,v),20*K,10*K,'cloth')
    grid(flap,12*K,8*K,'cloth')
    # Ends closed underneath the flap and bag floor.
    for z in [.321,.777]:
        grid(lambda u,v,z=z:Vector((mix(-.87,-.446,u),mix(-.72,-.58,v),z)),8*K,3*K,'cloth')
    pipe([(-.86,-.714,.65),(-.73,-.718,.76),(-.41,-.63,.81),(-.04,-.50,.815),(.33,-.11,.98),(.42,.24,1.27),(.10,.55,1.55),(-.48,.34,1.23),(-.83,-.35,.77),(-.86,-.63,.58)],[.033]*10,'cloth',n=6,j=32,scale=(1,.20))
    grid(lambda u,v:ell((-.66,-.765,.58),(.038,.014,.038),u,v),12*K,6*K,'metal')
    # Cream envelope with fold illustration + orange scallop-shell wax seal, gripped and weighted to Claw.R.
    grid(envelope,10*K,7*K,'paper','Claw.R')
    grid(lambda u,v:envelope(u,v)+Vector((0,.014,0)),10*K,7*K,'paper','Claw.R',reverse=True)
    for x,z0,z1 in [(.49,.60,.92),(.94,.65,.97)]:
        pipe([(x,-.966,z0),(x,-.966,z1)],[.008,.008],'paper','Claw.R',n=4,j=2)
    grid(lambda u,v:Vector((.715+.080*math.sin(math.pi*v)*math.cos(TAU*u),-1.015-.018*math.sin(math.pi*v),.785+.075*math.cos(math.pi*v))),16*K,10*K,'orange','Claw.R')
    for i in range(7):
        a=mix(-1.15,1.15,i/6)
        pipe([(.715,-1.033,.72),(.715+.033*math.sin(a),-1.037,.775),(.715+.068*math.sin(a),-1.020,.825)],[.007,.008,.003],'orange','Claw.R',n=5,j=5)
    obj=m.create(mat,rig);obj.name='Jisu | authored shell, crab and postal kit';obj.data.name='Jisu organic production mesh'
    return obj

def smoothstep(a,b,x):
    t=np.clip((x-a)/(b-a),0.0,1.0)
    return t*t*(3.0-2.0*t)

def paint(name,u,v):
    rgb=np.zeros((*u.shape,3),np.float32);rough=np.full(u.shape,.68,dtype=np.float32);metal=np.zeros(u.shape,dtype=np.float32)
    def color(c):rgb[:]=c
    def overlay(c,a):
        a=np.clip(a,0.0,1.0)[...,None];rgb[:]=rgb*(1.0-a)+np.array(c,dtype=np.float32)*a
    if name=='shell':
        # Silky warm ivory-cream shell with smooth sand-caramel spiral bands (zero dark speckle noise)
        color((246,238,224))
        band=(0.5+0.5*np.cos(TAU*(u*5.0+v*1.15)))**2
        overlay((208,186,154),band*0.48)
        overlay((255,248,236),smoothstep(0.70,0.98,v)*0.42)
        rough[:]=0.64
    elif name in ('limb','claw','body'):
        # v13 plush coral-peach felt (matches Kiko/Shelly): velvety matte, soft rosy knee/joint blush, no photoreal bands.
        rough[:]=0.84
        color((240,152,134))
        overlay((255,206,176),smoothstep(0.10,0.95,v)*0.62)
        overlay((252,122,118),np.exp(-((v-0.52)/0.11)**2)*0.30)
        if name=='limb':
            overlay((255,226,204),np.exp(-((v-0.86)/0.10)**2)*0.55)
        elif name=='body':
            overlay((255,168,160),np.exp(-((u-0.5)/0.30)**2-((v-0.5)/0.28)**2)*0.38)
            overlay((255,226,210),smoothstep(0.55,1.0,v)*0.42)
        elif name=='claw':
            overlay((255,222,196),smoothstep(0.55,0.98,v)*0.62)
            overlay((250,120,112),np.exp(-((v-0.20)/0.14)**2)*0.28)
    elif name=='eye':
        # Crisp warm pearl-white sclera + glowing golden-amber iris + twin Nintendo catchlights
        color((255,252,246));rad=v
        iris=np.clip((0.535-rad)*140.0,0.0,1.0);a=u*TAU
        honey_w=np.clip(0.35+0.48*np.clip((rad-0.28)/0.22,0.0,1.0)-0.24*np.sin(a),0.0,1.0)
        irisrgb=np.array((132,62,22),dtype=np.float32)*(1.0-honey_w[...,None])+np.array((248,174,54),dtype=np.float32)*honey_w[...,None]
        limbal=np.clip((rad-0.495)*110.0,0.0,1.0)
        irisrgb=irisrgb*(1.0-0.75*limbal[...,None])+np.array((52,34,24),dtype=np.float32)*(0.75*limbal[...,None])
        rgb=rgb*(1.0-iris[...,None])+irisrgb*iris[...,None]
        overlay((16,14,22),np.clip((0.355-rad)*160.0,0.0,1.0))
        rough[:]=0.14
        x=np.sin(v*math.pi)*np.cos(a);z=np.sin(v*math.pi)*np.sin(a)
        overlay((255,255,250),np.clip((0.118-np.sqrt((x+0.16)**2+(z-0.22)**2))*160.0,0.0,1.0))
        overlay((255,252,245),np.clip((0.054-np.sqrt((x-0.15)**2+(z+0.16)**2))*160.0,0.0,0.85))
    elif name=='cloth':
        # Clean silky tangerine-orange postal pouch + golden stitch trim
        fold=0.5+0.5*np.sin(u*math.pi)*np.sin(v*math.pi)
        color((226,98,22))
        overlay((248,128,36),fold*0.72)
        seam=np.minimum(np.minimum(u,1.0-u),np.minimum(v,1.0-v))
        overlay((186,76,16),np.exp(-seam*55.0)*0.35)
        stitch=(np.abs(seam-0.036)<0.007)&(np.sin((u+v)*TAU*36.0)>0.08)
        overlay((255,218,128),stitch*0.90)
        rough[:]=0.80
    elif name=='paper':
        color((248,240,224))
        d=np.minimum(np.abs(v-(1.0-u*0.78)),np.abs(v-(0.22+u*0.78)))
        overlay((214,200,176),np.exp(-d*140.0)*0.42)
        rough[:]=0.82
    elif name=='orange':
        color((248,122,28))
        overlay((255,168,54),(0.5+0.5*np.sin(u*TAU))*0.28)
        rough[:]=0.52
    elif name=='metal':color((224,178,84));rough[:]=0.34;metal[:]=0.50
    elif name=='dark':
        color((156,146,136));overlay((44,48,56),np.clip(v*1.55,0.0,1.0));rough[:]=0.85
    else:color((242,238,226))
    return np.clip(rgb,0.0,255.0),rough,metal
paint_mp=paint

def atlas(output,size):
    color=np.full((size,size,3),128,dtype=np.uint8);surface=np.zeros_like(color);factor=size/1024
    for name,tile in h.ATLAS.items():
        x,y,w,j=[int(t*factor) for t in tile]
        u,v=np.meshgrid((np.arange(w)+.5-4*factor)/(w-8*factor),(np.arange(j)+.5-4*factor)/(j-8*factor))
        rgb,r,m=paint(name,np.clip(u,0,1),np.clip(v,0,1))
        color[y:y+j,x:x+w]=np.uint8(np.rint(rgb));surface[y:y+j,x:x+w,0]=255;surface[y:y+j,x:x+w,1]=np.uint8(r*255);surface[y:y+j,x:x+w,2]=np.uint8(m*255)
    pngpath=output/f'jisu-color-{size}.png';jpgpath=output/f'jisu-color-{size}.jpg';surpath=output/f'jisu-surface-{size//4}.png'
    h.png(pngpath,color);im=bpy.data.images.load(str(pngpath));im.size[:];im.file_format='JPEG';im.save(filepath=str(jpgpath),quality=91);bpy.data.images.remove(im)
    h.png(surpath,np.uint8(np.rint(surface.reshape(size//4,4,size//4,4,3).mean(axis=(1,3)))))
    return jpgpath,surpath

def rig_create():
    data=bpy.data.armatures.new('Jisu | 14 bone crustacean rig');rig=bpy.data.objects.new('Jisu rig',data);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,a,b,parent='Body'):
        q=data.edit_bones.new(name);q.head=Vector(a)+Vector((0,0,.022));q.tail=Vector(b)+Vector((0,0,.022));
        if parent:q.parent=data.edit_bones[parent]
    bone('Root',(0,0,0),(0,0,.2),None);bone('Body',(0,0,.60),(0,0,.85),'Root')
    for side,suf in [(-1,'L'),(1,'R')]:
        bone('Eye.'+suf,(side*.18,-.63,.77),(side*.236,-.66,1.40))
        bone('Antenna.'+suf,(side*.08,-.72,.75),(side*.22,-.78,1.14))
        bone('Claw.'+suf,(side*.29,-.55,.61),(side*.52,-.83,.38) if side<0 else (.48,-.85,.58))
        for j in range(3):bone('Leg%d.%s'%(j+1,suf),(side*(.26+.015*j),-.31+j*.20,.61),(side*(.61+.09*j),-.37+j*.27,.5))
    bpy.ops.object.mode_set(mode='OBJECT');return rig

def animate(rig):
    keys={'Idle':[(1,0,0,0),(16,0,0,1),(21,-9,6,-1),(29,-9,6,1),(34,3,-2,0),(49,0,0,-1),(73,0,0,0)],'Listen':[(1,0,0,0),(7,4,-3,1),(17,4,-3,0),(22,1,2,0),(39,1,2,0),(47,0,0,0)],'React':[(1,0,0,0),(5,-13,9,-1),(9,12,-8,3),(14,5,5,1),(21,0,0,0),(31,0,0,0)]}
    rig.animation_data_create();bpy.context.scene.render.fps=30
    for clip,items in keys.items():
        action=bpy.data.actions.new(clip);rig.animation_data.action=action
        for f,yaw,pitch,energy in items:
            for pb in rig.pose.bones:
                pb.rotation_mode='QUATERNION';q=Quaternion()
                if pb.name.startswith('Eye.'):
                    side=-1 if pb.name.endswith('L') else 1
                    # Independent stalk turns: asymmetry leads the eager focus shifts.
                    ang=yaw*(1 if side<0 else .76)+side*energy*.4
                    axis=rig.data.bones[pb.name].matrix_local.to_quaternion().inverted()
                    q=Quaternion(axis@Z,math.radians(ang))@Quaternion(axis@Vector((0,1,0)),math.radians(ang*.65))@Quaternion(axis@Vector((1,0,0)),math.radians(pitch*(1 if side>0 else .83)))
                elif pb.name.startswith('Antenna.'):q=Quaternion((0,1,0),math.radians(energy*(4 if pb.name.endswith('L') else -3)))
                elif pb.name.startswith('Claw.'):q=Quaternion((0,0,1),math.radians(energy*1.4))
                elif pb.name=='Body':q=Quaternion((1,0,0),math.radians(energy*.38))
                elif pb.name.startswith('Leg'):q=Quaternion((0,1,0),math.radians(energy*.25))
                pb.rotation_quaternion=q;pb.keyframe_insert(data_path='rotation_quaternion',frame=f,group=pb.name)
        for curve in action.fcurves:
            for k in curve.keyframe_points:k.handle_left_type=k.handle_right_type='AUTO_CLAMPED'
        action.use_fake_user=True;rig.animation_data.action=None;track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action);track.mute=True
    rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1);bpy.context.scene.frame_end=73

def exported_weight_audit(path):
    import struct
    raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);base=28+length
    def accessor(index):
        a=doc['accessors'][index];b=doc['bufferViews'][a['bufferView']]
        types={5121:np.uint8,5123:np.uint16,5126:np.float32};dtype=types[a['componentType']];item=np.dtype(dtype).itemsize;n={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4}[a['type']]
        return np.ndarray((a['count'],n),dtype=dtype,buffer=raw,offset=base+b.get('byteOffset',0)+a.get('byteOffset',0),strides=(b.get('byteStride',item*n),item)).copy()
    prim=doc['meshes'][0]['primitives'][0];weights=accessor(prim['attributes']['WEIGHTS_0']);joints=accessor(prim['attributes']['JOINTS_0']);sums=weights.sum(axis=1)
    weighted=sorted(set(joints[weights>.0001].tolist()));bone_ids=doc['skins'][0]['joints'];names=[doc['nodes'][bone_ids[i]]['name'] for i in weighted]
    result={'exportedVertices':len(weights),'unweightedExportVertices':int((sums<.999).sum()),'maxSerializedInfluences':int((weights>.0001).sum(axis=1).max()),'weightSumRange':[float(sums.min()),float(sums.max())],'weightedBoneNames':names}
    assert result['unweightedExportVertices']==0 and float(sums.max())<1.001,result
    return result

SCALE=1.30  # v13: sculpted mesh + rig enlarged inside the GLB for readability on Bottle Beach (feet stay on z=0).

def scale_asset(mesh,rig,s):
    for v in mesh.data.vertices:v.co=v.co*s
    mesh.data.update()
    bpy.ops.object.select_all(action='DESELECT');bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    for b in rig.data.edit_bones:b.head=b.head*s;b.tail=b.tail*s
    bpy.ops.object.mode_set(mode='OBJECT')

def build(lod,output):
    bpy.ops.wm.read_factory_settings(use_empty=True);size=2048 if lod=='close' else 1024
    mat=h.shared_material(*atlas(output,size));mat.name='Jisu | painted shell, cuticle, canvas, eye atlas'
    rig=rig_create();mesh=make_mesh(lod,mat,rig);scale_asset(mesh,rig,SCALE);animate(rig)
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
    dest=output/f'jisu-{lod}.glb'
    bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_apply=False,export_image_format='AUTO',export_extras=False,export_yup=True,export_rest_position_armature=True)
    report=h.glb_stats(dest);report.update(exported_weight_audit(dest));report['weightedVertices']=len(mesh.data.vertices);report['unweightedVertices']=sum(not v.groups for v in mesh.data.vertices);report['maxInfluences']=max(len(v.groups) for v in mesh.data.vertices);report['bounds']=[list(v) for v in (Vector([min(p[i] for p in mesh.bound_box) for i in range(3)]),Vector([max(p[i] for p in mesh.bound_box) for i in range(3)]))]
    assert report['triangles']<=(28000 if lod=='close' else 10500),report
    assert report['bytes']<(2500000 if lod=='close' else 1000000),report
    assert report['draws']==report['materials']==1 and report['bones']<=16 and report['unweightedVertices']==0,report
    assert len(report['textureImages'])==2,report
    (output/f'{lod}-report.json').write_text(json.dumps(report,indent=2)+'\n')
    if lod=='close':
        bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(output/'jisu-production.blend'),compress=True)
    print('JISU_REPORT',json.dumps(report),flush=True)

if __name__=='__main__':
    parser=argparse.ArgumentParser(description=__doc__);parser.add_argument('--output',required=True,type=Path);parser.add_argument('--lod',choices=['both','board','close'],default='both');args=parser.parse_args(sys.argv[sys.argv.index('--')+1:]);args.output=args.output.resolve();args.output.mkdir(parents=True,exist_ok=True)
    for lod in (['board','close'] if args.lod=='both' else [args.lod]):build(lod,args.output)
