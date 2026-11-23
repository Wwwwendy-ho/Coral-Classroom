"""Author two distinct Kiko crustaceans. Candidate-only, no runtime writes.
blender -b -t 4 --factory-startup --python tools/art/build_kiko_cast.py -- --character hermit --output /workspace/work/kiko-production/hermit
"""
import argparse,importlib.util,json,math,sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector,Quaternion
spec=importlib.util.spec_from_file_location('jisu_helpers',str(Path(__file__).with_name('build_jisu.py')))
j=importlib.util.module_from_spec(spec);spec.loader.exec_module(j)
h=j.h;Z=Vector((0,0,1));TAU=math.tau
h.ATLAS={'shell':(0,0,512,1024),'limb':(512,0,256,512),'body':(768,0,256,384),'claw':(768,384,256,256),'eye':(512,512,256,256),'underside':(768,640,256,256),'gold':(512,768,128,256),'dark':(640,768,128,256),'rim':(768,896,128,128),'antenna':(896,896,128,128)}
mix=j.mix;tube=j.tube;ell=j.ell

def shell_center(t):return Vector((-.13+.11*t,.92-1.10*t,1.36-.64*t))
def shell_surface(u,v):
    a=TAU*u;p=shell_center(v)
    r=.575*math.sin(math.pi*.5*v)**.74+.11*math.sin(math.pi*v)**1.4
    shoulder=.047*math.sin(TAU*v*2.8+a)*math.sin(math.pi*v)**.6
    frill=.043*math.cos(a*13+.35)*v**24+.016*math.cos(a*21+v*9)*v**18
    radius=max(.002,r+shoulder+frill)
    return p+Vector((math.cos(a)*radius,(-.035*math.cos(a*13))*v**25,math.sin(a)*radius*.93))

def eye_center(kind,side):return Vector((side*(.224 if kind=='hermit' else .255),-.65 if kind=='hermit' else -.475,1.105 if kind=='hermit' else 1.175))
def eye_surface(kind,side,u,v):
    p=math.pi*v;a=TAU*u;s=(.143,.128,.160) if kind=='hermit' else (.153,.139,.174)
    return eye_center(kind,side)+Vector((s[0]*math.sin(p)*math.cos(a),-s[1]*math.cos(p),s[2]*math.sin(p)*math.sin(a)))
def carapace(u,v):
    a=TAU*u;p=math.pi*v;ring=math.sin(p)
    flank=1+.045*math.cos(a*10)*ring**8
    return Vector((.69*math.cos(a)*ring*flank,.395*math.sin(a)*ring,.68+.252*math.cos(p)+.019*math.sin(a*3)*ring**3))

def make_mesh(kind,lod,mat,rig):
    m=h.MeshBuilder();res=(.85 if lod=='board' else 1.39) if kind=='hermit' else (.88 if lod=='board' else 1.43)
    def grid(fn,n,t,tile,bone='Body',**kw):m.grid(fn,max(4,round(n*res)),max(2,round(t*res)),tile,bone,**kw)
    def pipe(points,radii,tile,bone='Body',n=8,t=10,scale=(1,1)):
        grid(lambda u,v:tube(points,radii,u,v,scale),n,t,tile,bone)
    if kind=='hermit':
        grid(shell_surface,32,38,'shell')
        # Flared/scalloped aperture with a visibly modeled rolled edge.
        grid(lambda u,v:shell_surface(u,1)+Vector((math.cos(TAU*u)*.022*math.cos(TAU*v),.022*math.sin(TAU*v),math.sin(TAU*u)*.022*math.cos(TAU*v))),36,5,'shell',wrap_v=True)
        grid(lambda u,v:Vector((-.02,-.17+.50*v,.72+.12*v))+Vector((math.cos(TAU*u)*.573*(1-.55*v),0,math.sin(TAU*u)*.53*(1-.55*v))),28,8,'dark',reverse=True)
        grid(lambda u,v:ell((0,-.25,.60),(.37,.35,.26),u,v),20,10,'body')
        grid(lambda u,v:ell((0,-.49,.55),(.405,.26,.195),u,v),22,10,'body')
    else:
        grid(carapace,36,18,'body')
        grid(lambda u,v:ell((0,-.015,.53),(.55,.32,.126),u,v),28,10,'underside')
        # Raised natural carapace granules, irregularly sized and kept clear of eye roots.
        rng=np.random.default_rng(23)
        for i in range(31):
            angle=rng.uniform(0,TAU);r=math.sqrt(rng.uniform(.05,.87));x=.65*r*math.cos(angle);y=.36*r*math.sin(angle)
            z=.68+.252*math.sqrt(max(.02,1-r*r));size=rng.uniform(.017,.034)
            grid(lambda u,v,x=x,y=y,z=z,size=size:ell((x,y,z),(size,size*.85,size*.47),u,v),6,4,'rim')
        # Low pointed lateral cuticle lobes distinguish a crab carapace from a sphere.
        for side in [-1,1]:
            for k in range(3):
                y=-.17+k*.16
                pipe([(side*.57,y,.72),(side*.72,y-.015,.72),(side*.756,y-.03,.73)],[.052,.030,.001],'body',n=6,t=5)
    for side,suf in [(-1,'L'),(1,'R')]:
        # Paired natural maxillipeds under the rostrum.
        base_y=-.738 if kind=='hermit' else -.357
        pipe([(side*.077,base_y,.52),(side*.050,base_y-.028,.475),(side*.012,base_y-.025,.49)],[.027,.024,.003],'limb',n=6,t=5)
        count=3 if kind=='hermit' else 4
        for k in range(count):
            if kind=='hermit':
                root=(side*.28,-.30+k*.18,.51);knee=(side*(.59+.065*k),-.36+k*.26,.45+.035*k);ankle=(side*(.76+.075*k),-.44+k*.26,.20);tip=(side*(.80+.07*k),-.53+k*.27,.035)
            else:
                root=(side*.46,-.16+k*.115,.57);knee=(side*(.79+.07*math.sin(k)), -.35+k*.25,.48);ankle=(side*(.98+.04*math.sin(k)),-.46+k*.28,.17);tip=(side*(1.04+.025*math.sin(k)),-.56+k*.30,.035)
            pipe([root,knee,ankle,tip],[.080,.070,.035,.002],'limb','Leg%d.%s'%(k+1,suf),n=8,t=12)
        ec=eye_center(kind,side)
        origin=(side*.178,-.57,.68) if kind=='hermit' else (side*.24,-.33,.82)
        stalkbone='Sensors' if kind=='hermit' else 'Eye.'+suf
        pipe([origin,tuple(Vector(origin)*.45+ec*.55),tuple(ec+Vector((0,.018,-.135)))],[.043,.035,.044],'limb',stalkbone,n=10,t=9)
        grid(lambda u,v:eye_surface(kind,side,u,v),22,12,'eye','Eye.'+suf)
        # Slim protective cuticle surround; no human lids or eyelashes.
        grid(lambda u,v:ec+Vector(((.150+.010*math.cos(TAU*v))*math.cos(TAU*u),.035+.012*math.sin(TAU*v),(.167+.010*math.cos(TAU*v))*math.sin(TAU*u))),24,5,'rim',stalkbone,wrap_v=True)
        if kind=='hermit':
            # Amber wire glasses: no transparent lenses, draw/material cost remains one.
            grid(lambda u,v:ec+Vector(((.174+.008*math.cos(TAU*v))*math.cos(TAU*u),-.148+.008*math.sin(TAU*v),(.184+.008*math.cos(TAU*v))*math.sin(TAU*u))),32,5,'gold','Sensors',wrap_v=True)
            pipe([(side*.394,-.791,1.11),(side*.435,-.65,1.10),(side*.395,-.42,1.04)],[.009,.009,.006],'gold','Sensors',n=6,t=8)
            pipe([(side*.073,-.70,.67),(side*.12,-.76,.84),(side*.27,-.78,.94),(side*.39,-.76,.96)],[.012,.010,.006,.001],'antenna','Antenna.'+suf,n=6,t=11)
        # Unequal chelae; Hermit holds them close, Mochi lifts the larger one sideways.
        if kind=='hermit':
            center=(side*.48,-.755,.37);arm=[(side*.29,-.52,.52),(side*.43,-.64,.45),center];size=1.13 if side<0 else .85
            palm=(.144*size,.153*size,.188*size)
            fixed=[(side*.57,-.78,.35),(side*.60,-.82,.22),(side*.53,-.84,.145)]
            finger=[(side*.405,-.80,.35),(side*.42,-.86,.23),(side*.50,-.87,.165)]
        else:
            size=1.26 if side>0 else .85
            center=(side*.88,-.33,.99 if side>0 else .48)
            arm=[(side*.52,-.17,.60),(side*.75,-.30,.72 if side>0 else .47),center]
            palm=(.177*size,.14*size,.195*size)
            if side>0:
                fixed=[(.99,-.33,1.06),(1.12,-.32,1.28),(1.055,-.32,1.37)]
                finger=[(.79,-.34,1.05),(.84,-.34,1.26),(1.00,-.33,1.345)]
            else:
                fixed=[(-.98,-.34,.47),(-1.07,-.37,.31),(-.98,-.39,.25)]
                finger=[(-.81,-.35,.46),(-.83,-.40,.34),(-.93,-.41,.27)]
        pipe(arm,[.097*size,.088*size,.093*size],'limb','Claw.'+suf,n=10,t=10)
        grid(lambda u,v,center=center,palm=palm:ell(center,palm,u,v),18,11,'claw','Claw.'+suf)
        pipe(fixed,[.080*size,.047*size,.001],'claw','Claw.'+suf,n=9,t=10)
        pipe(finger,[.063*size,.035*size,.001],'claw','Claw.'+suf,n=9,t=10)
    if kind=='hermit':pipe([(-.054,-.802,1.108),(0,-.823,1.126),(.054,-.802,1.108)],[.009,.008,.009],'gold','Sensors',n=6,t=8)
    obj=m.create(mat,rig);obj.name=f'Kiko {kind} | organic authored mesh';obj.data.name=f'Kiko {kind} single painted mesh';obj.modifiers[0].name='Crustacean skeleton'
    return obj

def paint(kind,name,u,v):
    noise=np.sin(u*TAU*63+v*191)*np.sin(v*TAU*91-u*79)
    rgb=np.zeros((*u.shape,3),np.float32);rough=np.full(u.shape,.60);metal=np.zeros(u.shape)
    def color(c):rgb[:]=c
    def over(c,a):
        a=np.clip(a,0,1)[...,None];rgb[:]=rgb*(1-a)+np.array(c)*a
    if name=='shell':
        color((225,216,210));cloud=h.cloud(u*1.1,v*.8)
        over((171,151,184),np.clip((cloud+.1)*.8,0,.67))
        over((235,215,197),(.5+.5*np.sin(TAU*(u*7+v*2)))**7*.31)
        # Fine natural growth lines, worn shoulder marks and pearly cream edges.
        ridge=.5+.5*np.sin(TAU*(u*102+v*6))
        over((136,120,145),ridge**19*.22);over((249,239,223),(.5+.5*np.sin(TAU*(u*102+v*6)+.9))**15*.32)
        over((150,124,123),(np.sin(u*161+np.sin(v*81))*np.sin(v*151-u*71)>.81)*.25)
        rgb+=noise[...,None]*1.2;rough[:]=.62
    elif name in ['body','limb','claw','rim']:
        if kind=='hermit':color((183,100,112) if name!='rim' else (190,136,145))
        else:color((219,117,111) if name!='rim' else (237,153,132))
        cloud=h.cloud(u,v)
        over((241,184,167),np.clip(cloud+.28,0,.85)*(.32 if name=='body' else .22))
        over((145,68,90),np.clip(-cloud-.1,0,.8)*.17)
        freckles=(np.sin(u*141+np.sin(v*77)*3)*np.sin(v*181+u*57)>.72)
        over((251,220,187),freckles*(.66 if name in ['claw','limb'] else .39))
        if name=='body':
            over((241,176,143),(.5+.5*np.sin(TAU*(u*13+v*3)))**11*.17)
        if name=='limb':
            over((235,192,170),np.exp(-((v-.35)*22)**2)*.34)
            over((137,67,83),np.exp(-((v-.69)*36)**2)*.21)
        if name=='claw':
            over((248,210,178),np.clip((v-.69)*2.6,0,.62))
            over((142,68,81),np.exp(-((v-.23)*26)**2)*.16);rough[:]=.48
        rgb+=noise[...,None]*1.8
    elif name=='eye':
        # Warm glossy A eye, pupil-dominant but with restrained cream sclera.
        color((221,202,183));rad=v
        iris=np.clip((.365-rad)*160,0,1);ir=np.zeros_like(rgb);ir[:]=(112,75,49)
        filament=np.sin(u*TAU*73+np.sin(v*41))*np.sin(u*TAU*111-v*51)
        ir+=filament[...,None]*9
        edge=np.clip((rad-.31)*110,0,1);ir=ir*(1-edge[...,None])+np.array((55,42,41))*edge[...,None]
        rgb=rgb*(1-iris[...,None])+ir*iris[...,None]
        over((8,10,16),np.clip((.275-rad)*160,0,1));rough[:]=.19
        x=np.sin(v*math.pi)*np.cos(u*TAU);z=np.sin(v*math.pi)*np.sin(u*TAU)
        over((255,253,245),np.clip((.095-np.sqrt((x+.17)**2+(z-.245)**2))*190,0,1))
        over((202,214,216),np.clip((.038-np.sqrt((x-.14)**2+(z+.13)**2))*170,0,1)*.65)
    elif name=='underside':
        color((238,206,175));over((199,142,137),(.5+.5*np.sin(v*TAU*7))**13*.29);rgb+=noise[...,None]*1.5
    elif name=='gold':color((181,129,55));rough[:]=.32;metal[:]=.67
    elif name=='antenna':color((209,117,99));rough[:]=.55
    elif name=='dark':color((156,132,134));over((49,38,49),np.clip(v*1.65,0,1));rough[:]=.85
    return np.clip(rgb,0,255),rough,metal

def atlas(kind,output,size):
    color=np.full((size,size,3),128,dtype=np.uint8);surface=np.zeros_like(color);factor=size/1024
    for name,tile in h.ATLAS.items():
        x,y,w,t=[int(a*factor) for a in tile];u,v=np.meshgrid((np.arange(w)+.5-4*factor)/(w-8*factor),(np.arange(t)+.5-4*factor)/(t-8*factor))
        rgb,r,m=paint(kind,name,np.clip(u,0,1),np.clip(v,0,1));color[y:y+t,x:x+w]=np.uint8(np.rint(rgb));surface[y:y+t,x:x+w,0]=255;surface[y:y+t,x:x+w,1]=np.uint8(r*255);surface[y:y+t,x:x+w,2]=np.uint8(m*255)
    png=output/f'kiko-{kind}-color-{size}.png';jpg=output/f'kiko-{kind}-color-{size}.jpg';surf=output/f'kiko-{kind}-surface-{size//4}.png'
    h.png(png,color);im=bpy.data.images.load(str(png));im.size[:];im.file_format='JPEG';im.save(filepath=str(jpg),quality=90);bpy.data.images.remove(im)
    h.png(surf,np.uint8(np.rint(surface.reshape(size//4,4,size//4,4,3).mean(axis=(1,3)))))
    return jpg,surf

def make_rig(kind):
    data=bpy.data.armatures.new(f'Kiko {kind} skeleton');rig=bpy.data.objects.new(f'Kiko {kind} rig',data);bpy.context.collection.objects.link(rig);bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,a,b,parent='Body'):
        q=data.edit_bones.new(name);q.head=Vector(a)+Vector((0,0,.022));q.tail=Vector(b)+Vector((0,0,.022))
        if parent:q.parent=data.edit_bones[parent]
    bone('Root',(0,0,0),(0,0,.2),None);bone('Body',(0,0,.54),(0,0,.79),'Root')
    if kind=='hermit':bone('Sensors',(0,-.57,.68),(0,-.65,1.105))
    for side,suf in [(-1,'L'),(1,'R')]:
        ec=eye_center(kind,side)
        if kind=='hermit':bone('Eye.'+suf,tuple(ec),tuple(ec+Vector((0,-.12,0))),'Sensors')
        else:bone('Eye.'+suf,(side*.24,-.33,.82),tuple(ec))
        bone('Claw.'+suf,(side*(.29 if kind=='hermit' else .52),-.52 if kind=='hermit' else -.17,.52 if kind=='hermit' else .60),(side*.50,-.73,.37) if kind=='hermit' else (side*.88,-.33,.99 if side>0 else .48))
        for k in range(3 if kind=='hermit' else 4):
            a=(side*.28,-.30+k*.18,.51) if kind=='hermit' else (side*.46,-.16+k*.115,.57)
            b=(side*.61,-.36+k*.26,.45) if kind=='hermit' else (side*.80,-.35+k*.25,.48)
            bone('Leg%d.%s'%(k+1,suf),a,b)
        if kind=='hermit':bone('Antenna.'+suf,(side*.073,-.70,.67),(side*.25,-.78,.94),'Sensors')
    bpy.ops.object.mode_set(mode='OBJECT');return rig

def animate(kind,rig):
    if kind=='hermit':
        clips={'Idle':[(1,0,0,0),(23,0,0,0),(29,-8,-2,.3),(47,-8,-2,.3),(59,0,0,0),(91,0,0,0)],'Listen':[(1,0,0,0),(11,4,-4,.4),(43,4,-4,.4),(57,1,-2,.2),(73,0,0,0)],'React':[(1,0,0,0),(7,-11,7,-1),(17,-7,2,-.45),(29,3,-3,.4),(45,0,0,0)]}
    else:
        clips={'Idle':[(1,0,0,0),(13,-13,2,.6),(20,-13,2,.6),(27,8,-3,-.4),(37,0,0,0),(61,0,0,0)],'Listen':[(1,0,0,0),(8,6,-4,.3),(23,6,-4,.3),(30,-2,-1,-.2),(45,0,0,0)],'React':[(1,0,0,0),(5,-11,4,-.6),(11,14,-3,1.4),(18,8,0,.6),(29,0,0,0),(37,0,0,0)]}
    rig.animation_data_create();bpy.context.scene.render.fps=30
    for clip,keys in clips.items():
        action=bpy.data.actions.new(clip);rig.animation_data.action=action
        for frame,yaw,pitch,energy in keys:
            for pb in rig.pose.bones:
                pb.rotation_mode='QUATERNION';axis=rig.data.bones[pb.name].matrix_local.to_quaternion().inverted();q=Quaternion()
                if pb.name.startswith('Eye.'):
                    side=-1 if pb.name.endswith('L') else 1;ang=yaw*(1 if side<0 else .82)
                    q=Quaternion(axis@Z,math.radians(ang))@Quaternion(axis@Vector((1,0,0)),math.radians(pitch))
                    if kind=='mochi':q=q@Quaternion(axis@Vector((0,1,0)),math.radians(ang*.50))
                elif pb.name=='Sensors':
                    q=Quaternion(axis@Vector((0,1,0)),math.radians(yaw*.20))
                    displacement=Vector((0,-.025*energy,.020*energy));pb.location=axis@displacement;pb.keyframe_insert(data_path='location',frame=frame,group=pb.name)
                elif pb.name.startswith('Claw.'):
                    side=-1 if pb.name.endswith('L') else 1;degrees=energy*(9 if kind=='mochi' else 1.5)*(1 if side>0 else -.55)
                    q=Quaternion(axis@Vector((0,1,0)),math.radians(degrees))@Quaternion(axis@Z,math.radians(energy*(4 if kind=='mochi' else .5)*side))
                elif pb.name.startswith('Antenna.'):q=Quaternion((0,1,0),math.radians(energy*3))
                elif pb.name=='Body':q=Quaternion((0,1,0),math.radians(energy*(2 if kind=='mochi' else .35)))
                elif pb.name.startswith('Leg'):q=Quaternion((0,1,0),math.radians(energy*(1 if kind=='mochi' else .20)))
                pb.rotation_quaternion=q;pb.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=pb.name)
        for channel in action.fcurves:
            for k in channel.keyframe_points:k.handle_left_type=k.handle_right_type='AUTO_CLAMPED'
        action.use_fake_user=True;rig.animation_data.action=None;track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action);track.mute=True
    rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1);bpy.context.scene.frame_end=91 if kind=='hermit' else 61

def build(kind,lod,output,reuse_atlas=False):
    bpy.ops.wm.read_factory_settings(use_empty=True);size=2048 if lod=='close' else 1024;paths=(output/f'kiko-{kind}-color-{size}.jpg',output/f'kiko-{kind}-surface-{size//4}.png') if reuse_atlas else atlas(kind,output,size);mat=h.shared_material(*paths);mat.name=f'Kiko {kind} | cuticle, shell and eyes';rig=make_rig(kind);mesh=make_mesh(kind,lod,mat,rig);animate(kind,rig)
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=mesh;dest=output/f'kiko-{kind}-{lod}.glb'
    bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_apply=False,export_image_format='AUTO',export_extras=False,export_yup=True,export_rest_position_armature=True)
    report=h.glb_stats(dest);report.update(j.exported_weight_audit(dest));report['authorVertices']=len(mesh.data.vertices);report['bounds']=[[min(p[i] for p in mesh.bound_box) for i in range(3)],[max(p[i] for p in mesh.bound_box) for i in range(3)]]
    assert report['triangles']<=(21000 if lod=='close' else 7500),report
    assert report['bytes']<(2000000 if lod=='close' else 850000),report
    assert report['draws']==report['materials']==1 and report['bones']<=16 and report['unweightedExportVertices']==0 and len(report['textureImages'])==2,report
    (output/f'{lod}-report.json').write_text(json.dumps(report,indent=2)+'\n')
    if lod=='close':bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(output/f'kiko-{kind}-production.blend'),compress=True)
    print('KIKO_REPORT',json.dumps(report),flush=True)

if __name__=='__main__':
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--character',choices=['hermit','mochi'],required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--lod',choices=['both','board','close'],default='both');p.add_argument('--reuse-atlas',action='store_true');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output=a.output.resolve();a.output.mkdir(parents=True,exist_ok=True)
    for lod in ['board','close'] if a.lod=='both' else [a.lod]:build(a.character,lod,a.output,a.reuse_atlas)
