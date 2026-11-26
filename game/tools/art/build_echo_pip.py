"""Build Echo beluga and Pip royal gramma. Blender 4.3 CPU only.
blender -b --factory-startup --python tools/art/build_echo_pip.py -- --character echo --output /workspace/work/vertebrate-production/echo
"""
import argparse, importlib.util, json, math, struct, sys, zlib
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, Quaternion
from scipy.ndimage import map_coordinates
TAU=math.tau
Z=Vector((0,0,1))
ATLAS={'body':(0,0,640,1024),'eye':(640,0,384,384),'fin':(640,384,384,220),'tailfin':(640,604,384,80),'cloth':(640,684,256,340),'dark':(896,684,64,64),'orbit':(960,684,64,64),'jaw':(960,748,64,64),'brass':(896,748,64,64),'strap':(896,812,128,212)}
def lerp(a, b, t):
    return a + (b-a)*t


def ease(a, b, t):
    t = max(0.0, min(1.0, (t-a)/(b-a)))
    return t*t*(3-2*t)


def curve(points, t):
    """Connect control stations with a cardinal interpolating spline."""
    q = max(0.0, min(len(points)-1.000001, t))
    i = int(q)
    u = q-i
    a, b, c, d = (points[max(0, i-1)], points[i], points[i+1], points[min(i+2, len(points)-1)])
    return tuple(
        b0 + .5*u*((c0-a0) + u*((2*a0-5*b0+4*c0-d0) + u*(3*b0-3*c0+d0-a0)))
        for a0, b0, c0, d0 in zip(a, b, c, d)
    )


def png(path,img):
    def chunk(name,payload):
        return struct.pack('>I',len(payload))+name+payload+struct.pack('>I',zlib.crc32(name+payload))
    h,w,_ = img.shape
    delta = img.copy()
    delta[:,1:] -= img[:,:-1]
    data = b''.join(b'\1'+row.tobytes() for row in delta[::-1])
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+
                     chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+
                     chunk(b'IDAT',zlib.compress(data,8))+chunk(b'IEND',b''))


def image_dimensions(raw):
    if raw.startswith(b'\x89PNG\r\n\x1a\n'):
        return struct.unpack_from('>II',raw,16)
    if not raw.startswith(b'\xff\xd8'):
        raise ValueError('Expected PNG or JPEG')
    offset = 2
    while offset+9<len(raw):
        marker = raw[offset+1]
        length = struct.unpack_from('>H',raw,offset+2)[0]
        if marker in (0xc0,0xc1,0xc2,0xc3):
            height,width = struct.unpack_from('>HH',raw,offset+5)
            return width,height
        offset += length+2
    raise ValueError('JPEG frame not found')


def glb_stats(path):
    raw = path.read_bytes()
    json_length = struct.unpack_from('<I',raw,12)[0]
    doc = json.loads(raw[20:20+json_length])
    bin_start = 28+json_length
    triangles = 0
    draws = 0
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:
            assert primitive.get('mode',4)==4
            triangles += doc['accessors'][primitive['indices']]['count']//3
            draws += 1
    images = []
    for image in doc.get('images',[]):
        block = doc['bufferViews'][image['bufferView']]
        start = bin_start+block.get('byteOffset',0)
        width,height = image_dimensions(raw[start:start+block['byteLength']])
        images.append({'name':image.get('name'),'width':width,'height':height,
                       'mime':image['mimeType'],'bytes':block['byteLength']})
    animations = []
    for item in doc.get('animations',[]):
        channel_names = sorted({doc['nodes'][c['target']['node']]['name'] for c in item['channels']})
        duration = max(doc['accessors'][s['input']]['max'][0] for s in item['samplers'])
        animations.append({'name':item['name'],'duration':round(duration,4),
                           'animatedBones':channel_names,'channels':len(item['channels'])})
    return {'file':path.name,'bytes':len(raw),'triangles':triangles,'draws':draws,
            'materials':len(doc['materials']),'bones':len(doc['skins'][0]['joints']),
            'textureImages':images,'clips':animations}



def exported_audit(path):
    raw=path.read_bytes();length=struct.unpack_from('<I',raw,12)[0];doc=json.loads(raw[20:20+length]);binary=28+length
    widths={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16};dtypes={5126:'<f4',5123:'<u2',5121:'u1',5125:'<u4'}
    def accessor(index):
        a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']];dt=np.dtype(dtypes[a['componentType']]);columns=widths[a['type']]
        result=np.ndarray((a['count'],columns),dtype=dt,buffer=raw,offset=binary+v.get('byteOffset',0)+a.get('byteOffset',0),strides=(v.get('byteStride',columns*dt.itemsize),dt.itemsize)).astype('float64')
        if a.get('normalized') and a['componentType']!=5126:result/=np.iinfo(dt).max
        return result
    weights=[]
    for mesh in doc['meshes']:
        for primitive in mesh['primitives']:weights.append(accessor(primitive['attributes']['WEIGHTS_0']))
    weights=np.concatenate(weights)
    result={'verticesAfterUVSplits':len(weights),'unweighted':int(np.sum(weights.sum(axis=1)<.999)),'maxSumError':float(np.max(abs(weights.sum(axis=1)-1))),'maxInfluences':int(np.max(np.sum(weights>0,axis=1)))}
    motion={}
    for animation in doc.get('animations',[]):
        tracks={}
        for channel in animation['channels']:
            name=doc['nodes'][channel['target']['node']]['name']
            if name.startswith('Eye.') and channel['target']['path']=='rotation':
                data=accessor(animation['samplers'][channel['sampler']]['output']);dot=np.clip(np.abs(data@data[0]),0,1)
                tracks[name]={'samples':len(data),'maxDegreesFromFirst':round(float(np.degrees(2*np.arccos(dot)).max()),3)}
        motion[animation['name']]=tracks
    assert result['unweighted']==0 and result['maxSumError']<.00001
    assert all(set(tracks)=={'Eye.L','Eye.R'} for tracks in motion.values())
    return {'exportedSkinWeights':result,'eyeMotionFromActualGLB':motion}

CHAR='echo'
ECHO=[(-1.37,1.54,.002,.002),(-1.32,1.56,.17,.105),(-1.20,1.61,.285,.19),(-1.04,1.79,.39,.42),(-.73,1.72,.50,.55),(-.25,1.48,.57,.53),(.29,1.26,.45,.40),(.75,1.03,.28,.25),(1.12,.86,.15,.14),(1.46,.77,.065,.065)]
PIP=[(-1.055,1.38,.056,.027),(-1.00,1.38,.16,.18),(-.80,1.42,.30,.38),(-.46,1.39,.37,.51),(-.03,1.35,.34,.51),(.39,1.33,.23,.35),(.77,1.33,.105,.145),(.94,1.33,.055,.095)]

def frame(v):
    p=ECHO if CHAR=='echo' else PIP
    y,z,w,h=curve(p,v*(len(p)-1))
    return y,z,max(w,.001),max(h,.001)

def body(u,v,extra=0):
    y,z,w,h=frame(v); a=TAU*u
    if CHAR=='echo':
        organic=1+.012*math.sin(a*3+v*15)*math.sin(math.pi*v)**2
    else:
        organic=1+.006*math.cos(a*31+v*97)*math.sin(math.pi*v)
    return Vector((math.sin(a)*(w+extra)*organic,y,z+math.cos(a)*(h+extra)*organic))

def eye_axes(side):
    if CHAR=='echo':
        c=Vector((side*.448,-.915,1.785)); n=Vector((side*.86,-.50,.05)).normalized();r=.180
    else:
        c=Vector((side*.312,-.735,1.565)); n=Vector((side*.94,-.33,.06)).normalized();r=.160
    h=Z.cross(n).normalized(); w=n.cross(h).normalized()
    return c,h,w,n,r

def eye_point(side,u,v):
    c,h,w,n,r=eye_axes(side);a=-TAU*u;t=1.48*v;flat=.42 if CHAR=='echo' else .38
    return c+r*(math.sin(t)*(math.cos(a)*h+math.sin(a)*w)+flat*math.cos(t)*n)

def orbit(side,u,v):
    # A tapered continuous annulus covers the globe margins and sinks into the cheek.
    c,h,w,n,r=eye_axes(side);a=TAU*u;flat=.42 if CHAR=='echo' else .38
    upper=max(0,math.sin(a));lower=max(0,-math.sin(a))
    inner_w=.94 if CHAR=='echo' else .87
    inner_h=(.87-.045*upper+.025*lower) if CHAR=='echo' else (.80-.09*upper+.04*lower)
    width=r*(inner_w+.59*v)
    height=r*(inner_h+.76*v)
    inner_radius=r*math.sqrt((inner_w*math.cos(a))**2+(inner_h*math.sin(a))**2)
    innerdepth=flat*math.sqrt(max(0,r*r-inner_radius*inner_radius))+.003
    radius=math.sqrt((width*math.cos(a))**2+(height*math.sin(a))**2)
    depth=flat*math.sqrt(max(0,r*r-radius*radius))+.006 if radius<r else lerp(.006,-.135,ease(r,r*1.52,radius))
    return c+width*math.cos(a)*h+height*math.sin(a)*w+n*depth

def ellipsoid(center,radius,u,v):
    a=TAU*u;t=math.pi*v
    return Vector(center)+Vector((radius[0]*math.sin(t)*math.cos(a),radius[1]*math.sin(t)*math.sin(a),radius[2]*math.cos(t)))

def flipper(side,u,v):
    # Long tapered beluga pectoral with a rounded leading edge and swept tip.
    a=TAU*u
    x=side*(.43+.55*v-.09*v*v)
    y=-.27+.38*v
    z=1.25-.53*v
    chord=.205*math.sin(math.pi*(v*.94+.025))**.55*(1-.55*v)
    thick=.055*math.sin(math.pi*(v*.94+.025))**.65
    return Vector((x,y+math.cos(a)*chord,z+math.sin(a)*thick))

def fluke(side,u,v):
    a=TAU*u
    x=side*(.02+.71*v)
    y=1.42+.20*v-.12*v*v
    z=.78-.13*v*v
    chord=.23*math.sin(math.pi*(v*.94+.025))**.65*(1-.58*v)
    return Vector((x,y+math.cos(a)*chord,z+math.sin(a)*.047*(1-v)**.55))

def fish_fin(kind,u,v,face):
    # Radially ruled membranes; lifted fine rays and scalloped outer margins.
    ray=(.5+.5*math.cos(TAU*(u*(14 if kind=='dorsal' else 10))))**12
    scallop=.988+.012*math.cos(TAU*u*(14 if kind=='dorsal' else 10))
    q=v*scallop
    thickness=(.013*(1-v)+.004+.004*ray)*math.sin(math.pi*(u*.98+.01))**.5
    if kind=='dorsal':
        y=-.61+1.42*u; z=1.71+.12*math.sin(math.pi*u)-.20*u
        height=(.10+.43*math.sin(math.pi*u)**.7)*(1-.18*u)
        return Vector((face*thickness,y+q*.12,z+q*height))
    if kind=='anal':
        y=-.13+1.0*u; z=.96+.10*u
        return Vector((face*thickness,y+.15*q,z-q*(.05+.31*math.sin(math.pi*u)**.8)))
    if kind=='tail':
        a=-1.05+2.10*u
        return Vector((face*thickness,.88+q*(.62*math.cos(a)+.12),1.33+q*.64*math.sin(a)))
    side=1 if kind=='pectoralR' else -1
    a=-1.05+2.05*u
    return Vector((side*(.29+q*.39*math.cos(a)), -.35+q*(.34+.17*math.cos(a)),1.22+q*.27*math.sin(a)+face*thickness))

def mouth(u,v):
    a=TAU*u
    if CHAR=='echo':
        x=(v-.5)*.38; y=-1.413+.084*(abs(v-.5)*2)**1.8; z=1.501+.003*math.cos(math.pi*(v-.5))
        return Vector((x,y+.009*math.cos(a),z+.009*math.sin(a)))
    # Small terminal fish mouth, no projecting fleshy lip and no tooth geometry.
    return Vector((.056*math.cos(a)*v,-1.059+.012*(1-v),1.38+.025*math.sin(a)*v))

def weights(p,u,v):
    tail=ease(.56,.88,v); head=1-ease(.17,.39,v)
    return {'Body':1-head-tail,'Head':head,'Tail':tail}

class Builder:
    def __init__(self): self.v=[];self.f=[];self.uv=[];self.w=[]
    def grid(self,fn,n,m,tile,weight,wrap=False):
        start=len(self.v);cols=n if wrap else n+1
        for j in range(m+1):
            for i in range(cols):
                p=Vector(fn(i/n,j/m));self.v.append(p);self.w.append(weight(p,i/n,j/m) if callable(weight) else {weight:1})
        tx,ty,tw,th=ATLAS[tile]
        for j in range(m):
            for i in range(n):
                self.f.append((start+j*cols+i,start+j*cols+(i+1)%cols,start+(j+1)*cols+(i+1)%cols,start+(j+1)*cols+i))
                self.uv.extend(((tx+4+u*(tw-8))/1024,(ty+4+v*(th-8))/1024) for u,v in ((i/n,j/m),((i+1)/n,j/m),((i+1)/n,(j+1)/m),(i/n,(j+1)/m)))
    def create(self,mat,rig):
        me=bpy.data.meshes.new(CHAR+' authored surface');me.from_pydata(self.v,[],self.f);me.update()
        layer=me.uv_layers.new(name='Painted atlas');layer.data.foreach_set('uv',np.ravel(self.uv));me.materials.append(mat)
        for p in me.polygons:p.use_smooth=True
        ob=bpy.data.objects.new(CHAR+' one skinned primitive',me);bpy.context.collection.objects.link(ob)
        bpy.context.view_layer.objects.active=ob;ob.select_set(True)
        bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.mesh.normals_make_consistent(inside=False);bpy.ops.object.mode_set(mode='OBJECT')
        groups={b.name:ob.vertex_groups.new(name=b.name) for b in rig.data.bones}
        for i,ws in enumerate(self.w):
            total=sum(max(0,x) for x in ws.values())
            for name,value in ws.items():
                if value>0:groups[name].add([i],value/total,'REPLACE')
        ob.parent=rig;mod=ob.modifiers.new('Restrained species motion','ARMATURE');mod.object=rig
        return ob

def box_face(center,half,axis,sign,u,v):
    p=Vector((0,0,0));p[axis]=sign
    p[(axis+1)%3]=2*u-1;p[(axis+2)%3]=2*v-1
    inner=Vector(tuple(max(-.77,min(.77,c)) for c in p));delta=(p-inner).normalized()
    p=inner+delta*.23
    return Vector(center)+Vector(tuple(p[i]*half[i] for i in range(3)))

def make_mesh(lod,mat,rig):
    near=lod=='close';s=lambda a,b:b if near else a;b=Builder()
    b.grid(body,s(30,44),s(44,70),'body',weights,True)
    if CHAR=='echo':
        b.grid(lambda u,v:ellipsoid((0,-1.18,1.555),(.29,.23,.17),u,.002+.996*v),s(20,30),s(10,16),'jaw','Head',True)
        b.grid(lambda u,v:ellipsoid((0,-1.14,1.43),(.265,.215,.105),u,.002+.996*v),s(20,30),s(8,12),'jaw','Head',True)
    for side,suffix in ((-1,'L'),(1,'R')):
        b.grid(lambda u,v:eye_point(side,u,.002+.996*v),s(20,30),s(12,22),'eye','Eye.'+suffix,True)
        b.grid(lambda u,v:orbit(side,u,v),s(20,30),s(5,8),'orbit','Head',True)
        if CHAR=='echo':
            b.grid(lambda u,v:flipper(side,u,v),s(12,20),s(12,20),'fin','Pectoral.'+suffix,True)
            b.grid(lambda u,v:fluke(side,u,v),s(12,20),s(12,20),'fin','Tail',True)
        else:
            for face in (-1,1):b.grid(lambda u,v:fish_fin('pectoral'+suffix,u,v,face),s(14,24),s(4,8),'fin','Pectoral.'+suffix)
    if CHAR=='pip':
        for kind,bone in (('dorsal','Dorsal'),('anal','Body'),('tail','Tail')):
            for face in (-1,1):b.grid(lambda u,v:fish_fin(kind,u,v,face),s(30,46),s(4,8),'tailfin' if kind=='tail' else 'fin',bone)
    b.grid(mouth,s(8,16) if CHAR=='echo' else s(24,36),s(20,30) if CHAR=='echo' else 3,'dark','Head',True)
    if CHAR=='pip':
        def lip_edge(u,v):
            a=TAU*u;t=TAU*v
            # The thin pigmented maxillary edge follows the terminal oval.
            return Vector(((.058+.005*math.cos(t))*math.cos(a),-1.056+.005*math.sin(t),1.38+(.029+.004*math.cos(t))*math.sin(a)))
        b.grid(lip_edge,s(24,36),s(4,6),'orbit','Head',True)
    if CHAR=='echo':center=(.60,.04,1.14);half=(.072,.245,.25)
    else:center=(.39,-.01,1.03);half=(.048,.19,.235)
    for axis in range(3):
        for sign in (-1,1):
            b.grid(lambda u,v:box_face(center,half,axis,sign,u,v),s(4,7),s(4,7),'cloth' if axis==0 and CHAR=='pip' else 'strap','Body')
    if CHAR=='echo':
        flap=(center[0]+.071,center[1],center[2]+.074)
        for axis in range(3):
            for sign in (-1,1):b.grid(lambda u,v:box_face(flap,(.018,.239,.163),axis,sign,u,v),s(4,7),s(4,7),'cloth' if axis==0 else 'strap','Body')
        def button(u,v):
            a=TAU*u;t=math.pi*v
            return Vector((flap[0]+.025+.018*math.cos(t),flap[1]+.045*math.sin(t)*math.cos(a),flap[2]-.119+.045*math.sin(t)*math.sin(a)))
        b.grid(button,s(12,18),s(6,10),'brass','Body',True)
    # Broad practical strap follows the body in a continuous band, not a loose necklace.
    b.grid(lambda u,v:body(u,(.57 if CHAR=='echo' else .53)+(v-.5)*.028,.015),s(32,48),s(3,5),'strap','Body',True)
    return b.create(mat,rig)

def tint(a,b,t):return np.asarray(a)[None,None,:]+np.asarray(t)[...,None]*(np.asarray(b)-np.asarray(a))
def paint(a,c,t):return a+(np.asarray(c)-a)*np.clip(t,0,1)[...,None]
NOISE=np.random.default_rng(207).normal(0,1,(257,257)).astype('float32')
def clouds(u,v):
    # Seeded irregular value fields avoid a periodic ornamental skin pattern.
    result=np.zeros_like(u)
    for scale,weight in ((9,.54),(29,.30),(93,.16)):
        result += weight*map_coordinates(NOISE,[(v*scale+31.3)%256,(u*scale+17.7)%256],order=1,mode='wrap')
    return result

def body_xyz(u,v):
    # Per-texel 3D position of the body surface (same parameterization as body()).
    a=TAU*u;xyz=np.zeros(u.shape+(3,),np.float32)
    for j,vv in enumerate(v[:,0]):
        y,z,w,h=frame(float(vv))
        org=(1+.012*np.sin(a[j]*3+vv*15)*math.sin(math.pi*vv)**2) if CHAR=='echo' else (1+.006*np.cos(a[j]*31+vv*97)*math.sin(math.pi*vv))
        xyz[j,:,0]=np.sin(a[j])*w*org;xyz[j,:,1]=y;xyz[j,:,2]=z+np.cos(a[j])*h*org
    return xyz

def cheek_blush(u,v):
    # Soft warm rosy cheek spots beneath and slightly forward of each eye.
    p=body_xyz(u,v);out=np.zeros(u.shape,np.float32)
    for side in (-1,1):
        c,h,w,n,r=eye_axes(side)
        tgt=np.array(c)+np.array((-side*.045,-.075,-.215) if CHAR=='echo' else (-side*.035,-.05,-.17))
        out=np.maximum(out,np.exp(-(np.linalg.norm(p-tgt,axis=-1)/(.095 if CHAR=='echo' else .068))**2))
    return out

def pigment(tile,u,v):
    cloud=clouds(u,v);zero=np.zeros_like(u)
    if tile=='eye':
        a=-TAU*u;r=1.48*v;iris=np.clip(((.94 if CHAR=='echo' else .80)-r)/.03,0,1)
        rgb=tint((250,247,239),(167,171,181),np.clip((r-.6)*.3,0,.4))
        fiber=.12*np.sin(a*87+r*13)+.08*np.sin(a*121-r*23)
        col=tint((5,30,46),(24,104,126),np.clip(.40+.35*np.sin(r*5)+fiber,0,1)) if CHAR=='echo' else tint((40,16,6),(176,104,24),np.clip(.38+.40*np.sin(r*5)+fiber,0,1))
        rgb=rgb+(col-rgb)*iris[...,None];rgb=paint(rgb,(5,12,20),np.exp(-((r-(.90 if CHAR=='echo' else .76))/.030)**2)*.92)
        rgb=paint(rgb,(4,8,14),np.clip(((.62 if CHAR=='echo' else .50)-r)/.018,0,1))
        x,y=np.sin(r)*np.cos(a),np.sin(r)*np.sin(a)
        light=np.exp(-(((x+.16)/.10)**2+((y-.24)/.088)**2))
        low=np.exp(-(((x-.14)/.042)**2+((y+.16)/.042)**2))
        rgb=paint(rgb,(255,255,252),np.clip((light-.30)*16,0,1)*.99);rgb=paint(rgb,(255,255,252),np.clip((low-.30)*16,0,1)*.97)
        return rgb,.10+zero,zero
    if tile=='brass':return tint((148,106,52),(235,201,123),.6+.1*cloud),.43+zero,.24+zero
    if tile=='jaw':return tint((194,207,210),(244,240,226),.72+.045*cloud),.84+zero,zero
    if tile=='orbit':
        rgb=tint((170,186,202),(237,240,235),.60+.06*cloud) if CHAR=='echo' else tint((79,23,128),(151,60,194),.62+.04*cloud)
        upper=np.maximum(0,np.sin(TAU*u))**.45
        crease=np.exp(-(v/.065)**2)*(.16+.62*upper)
        rgb=paint(rgb,(75,94,116) if CHAR=='echo' else (54,15,87),crease)
        return rgb,.84+zero,zero
    if tile=='dark':return tint((23,26,37),(57,52,65),.35+.08*cloud),.65+zero,zero
    if tile=='body':
        if CHAR=='echo':
            shade=.5+.5*np.cos(TAU*u)
            rgb=tint((155,177,200),(244,242,229),.40+.38*(1-shade)+.06*cloud)
            # Subtle cloudy skin grain, never fish scales or glowing ornament.
            fine=clouds(u*2.7,v*2.9)
            rgb=paint(rgb,(202,215,224),np.clip(.035+.035*fine,0,.09))
            blow=np.exp(-(((u-.0)/.035)**2+((v-.44)/.010)**2))+np.exp(-(((u-1)/.035)**2+((v-.44)/.010)**2))
            rgb=paint(rgb,(84,101,118),blow*.72)
            rgb=paint(rgb,(250,138,150),.58*cheek_blush(u,v))
            return rgb,np.clip(.84+.02*cloud,.80,.88),zero
        transition=np.clip((v-.48)/.19,0,1);transition=transition*transition*(3-2*transition)
        rgb=tint((105,29,174),(252,191,29),transition)
        belly=(.5-.5*np.cos(TAU*u))**3;rgb=paint(rgb,(173,84,208),.18*belly*(1-transition))
        # Interleaved ctenoid scale crescents baked into color and roughness.
        row=np.floor(v*69);sx=(u*42+.5*(row%2))%1;sy=(v*69)%1
        crescent=np.exp(-((np.sqrt(((sx-.5)/.54)**2+((sy-.05)/1.05)**2)-.88)/.055)**2)
        glint=np.exp(-(((sx-.37)/.23)**2+((sy-.42)/.20)**2))
        rgb=paint(rgb,(55,15,98),.09*crescent*(1-.65*transition))
        rgb=paint(rgb,(255,224,109),glint*(.05+.08*transition))
        gill=np.exp(-((v-(.365+.025*np.cos(TAU*u)))/.0045)**2)*np.abs(np.sin(TAU*u))**6
        rgb=paint(rgb,(62,18,101),.66*gill)
        lateral=np.exp(-((np.abs(np.sin(TAU*u))-.985)/.018)**2)*np.clip((v-.43)*9,0,1)*np.clip((.9-v)*10,0,1)
        rgb=paint(rgb,(255,207,71),.14*lateral)
        rgb=paint(rgb,(255,128,152),.52*cheek_blush(u,v))
        return rgb,np.clip(.84-.04*glint+.03*crescent,.80,.88),zero
    if tile=='tailfin':
        rays=(.5+.5*np.cos(TAU*u*10))**18
        rgb=tint((221,132,10),(255,219,65),.4+.45*v+.04*cloud);rgb=paint(rgb,(255,238,154),.54*rays)
        return rgb,np.clip(.84-.03*rays,.80,.88),zero
    if tile=='fin':
        if CHAR=='echo':return tint((184,197,213),(245,245,235),.69+.06*cloud+.12*v),np.clip(.84+.02*cloud,.80,.88),zero
        ray=(.5+.5*np.cos(TAU*u*14+.12*v))**16
        rgb=tint((111,33,177),(255,198,44),np.clip(.12+.68*v+.14*cloud,0,1))
        rgb=paint(rgb,(248,220,151),.55*ray)
        rgb=paint(rgb,(87,27,144),.50*np.exp(-((v-.97)/.025)**2))
        return rgb,np.clip(.84-.03*ray,.80,.88),zero
    if tile in ('cloth','strap'):
        weave=.018*np.sin(u*TAU*160)+.018*np.sin(v*TAU*190)
        if CHAR=='echo':rgb=tint((22,49,121),(54,99,197),.47+.04*cloud+weave)
        else:rgb=tint((93,153,131),(182,214,178),.69+.04*cloud+weave)
        edge=np.minimum(np.minimum(u,1-u),np.minimum(v,1-v))
        stitch=np.exp(-((edge-.05)/.009)**2)*np.clip(np.cos(TAU*(u+v)*34)*4,0,1)
        rgb=paint(rgb,(235,221,174),.88*stitch)
        if tile=='cloth':
            x,y=u-.5,v-.52
            if CHAR=='echo':
                # Whaletail note emblem printed on the flap.
                mark=((abs(x)<.045)&(y>-.16)&(y<.07))|((((x-.13)/.17)**2+((y-.07-.35*x)/.082)**2<1)&(x>0))|((((x+.13)/.17)**2+((y-.07+.35*x)/.082)**2<1)&(x<0))
            else:
                mark=(abs(x)<.12)&(abs(y)<.12)
                mark |= ((x-.12)**2+(y/.9)**2)<.055**2
                mark &= ~((x+.12)**2+(y/.9)**2<.055**2)
            rgb=paint(rgb,(245,237,204),mark*.94)
        return rgb,.82+zero,zero
    raise KeyError(tile)

def paint_atlas(output,size):
    color=np.full((size,size,3),128,dtype=np.uint8);surface=np.zeros_like(color);f=size/1024
    for name,tile in ATLAS.items():
        x,y,w,h=(int(a*f) for a in tile)
        u,v=np.meshgrid(np.clip((np.arange(w,dtype='float32')+.5-4*f)/(w-8*f),0,1),np.clip((np.arange(h,dtype='float32')+.5-4*f)/(h-8*f),0,1))
        rgb,rough,metal=pigment(name,u,v)
        color[y:y+h,x:x+w]=np.uint8(np.clip(np.rint(rgb),0,255));surface[y:y+h,x:x+w,0]=255;surface[y:y+h,x:x+w,1]=np.uint8(np.clip(np.rint(rough*255),0,255));surface[y:y+h,x:x+w,2]=np.uint8(np.clip(np.rint(metal*255),0,255))
    paintpath=output/f'painted-color-{size}.png';png(paintpath,color)
    im=bpy.data.images.load(str(paintpath));tuple(im.size);im.file_format='JPEG';dest=output/f'painted-color-{size}.jpg';im.save(filepath=str(dest),quality=90);bpy.data.images.remove(im)
    averaged=np.rint(surface.reshape(size//4,4,size//4,4,3).mean(axis=(1,3)));surf=output/f'painted-surface-{size//4}.png';png(surf,np.uint8(averaged));return dest,surf

def material(paths):
    mat=bpy.data.materials.new(CHAR+' painted skin canvas and eyes');mat.use_nodes=True;t=mat.node_tree;p=t.nodes.get('Principled BSDF');p.inputs['Specular IOR Level'].default_value=.32
    a=t.nodes.new('ShaderNodeTexImage');a.image=bpy.data.images.load(str(paths[0]));a.image.pack();t.links.new(a.outputs['Color'],p.inputs['Base Color'])
    b=t.nodes.new('ShaderNodeTexImage');b.image=bpy.data.images.load(str(paths[1]));b.image.colorspace_settings.name='Non-Color';b.image.pack();s=t.nodes.new('ShaderNodeSeparateColor');t.links.new(b.outputs['Color'],s.inputs[0]);t.links.new(s.outputs['Green'],p.inputs['Roughness']);t.links.new(s.outputs['Blue'],p.inputs['Metallic']);return mat

def rig():
    data=bpy.data.armatures.new(CHAR+' independent attention rig');ob=bpy.data.objects.new(CHAR+' rig',data);bpy.context.collection.objects.link(ob);bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,h,t,parent=None):
        b=data.edit_bones.new(name);b.head=h;b.tail=t
        if parent:b.parent=data.edit_bones[parent]
    bone('Float',(0,0,0),(0,0,.2));bone('Body',(0,0,1.3),(0,-.2,1.4),'Float');bone('Head',(0,-.55,1.6),(0,-.9,1.65),'Body');bone('Tail',(0,.65,1.1),(0,1.2,.9),'Body')
    for side,suf in ((-1,'L'),(1,'R')):
        c,h,w,n,r=eye_axes(side);bone('Eye.'+suf,c,c+n*.15,'Head');bone('Pectoral.'+suf,(side*.35,-.25,1.3),(side*.7,-.05,1.15),'Body')
    if CHAR=='pip':bone('Dorsal',(0,0,1.7),(0,.3,1.8),'Body')
    bpy.ops.object.mode_set(mode='OBJECT');return ob

def animate(ob):
    # Independent eye aim leads restrained body/fin responses. Fish have no blink tracks.
    measured={'Idle':[(1,0,0,0),(37,.012,1.6,1),(69,0,-1.2,-1),(97,0,0,0)],'Listen':[(1,0,0,0),(17,.006,3,-1),(49,.006,3,-1),(65,.008,1,2),(85,0,0,0)],'React':[(1,0,0,0),(13,.024,-4,-2),(29,.012,4,2),(53,0,0,0)]}
    focused={'Idle':[(1,0,-3,-3),(19,.009,-3,-3),(23,.01,7,-6),(41,.006,7,-6),(46,0,-3,-3),(73,0,-3,-3)],'Listen':[(1,0,-3,-3),(11,.008,2,-1),(37,.008,2,-1),(47,.01,-1,-4),(65,0,-3,-3)],'React':[(1,0,-3,-3),(7,.018,-9,-6),(13,.025,8,3),(25,.01,3,1),(43,0,-3,-3)]}
    ob.animation_data_create();bpy.context.scene.render.fps=30
    for name,keys in (measured if CHAR=='echo' else focused).items():
        act=bpy.data.actions.new(name);ob.animation_data.action=act
        for f,bob,aim,pitch in keys:
            for p in ob.pose.bones:p.rotation_mode='QUATERNION';p.rotation_quaternion=Quaternion();p.location=(0,0,0)
            p=ob.pose.bones['Float'];p.location=p.bone.matrix_local.to_quaternion().inverted()@Vector((0,0,bob));p.keyframe_insert('location',frame=f)
            def rot(b,axis,degrees):
                p=ob.pose.bones[b];local=p.bone.matrix_local.to_quaternion().inverted()@Vector(axis);p.rotation_quaternion=Quaternion(local,math.radians(degrees));p.keyframe_insert('rotation_quaternion',frame=f)
            rot('Body',(0,1,0),aim*.12);rot('Head',(1,0,0),pitch*.32);rot('Tail',(1,0,0) if CHAR=='echo' else (0,0,1),math.sin(f*.11)*1.4)
            for side,suf in ((-1,'L'),(1,'R')):
                c,h,w,n,r=eye_axes(side)
                p=ob.pose.bones['Eye.'+suf];q=p.bone.matrix_local.to_quaternion().inverted();p.rotation_quaternion=Quaternion(q@Z,math.radians(aim+side*.35*pitch))@Quaternion(q@h,math.radians(pitch));p.keyframe_insert('rotation_quaternion',frame=f)
                rot('Pectoral.'+suf,(0,1,0),side*math.sin(f*.21)*2)
            if CHAR=='pip':rot('Dorsal',(0,1,0),aim*.15)
        for c in act.fcurves:
            for k in c.keyframe_points:k.handle_left_type=k.handle_right_type='AUTO_CLAMPED'
        act.use_fake_user=True;ob.animation_data.action=None;track=ob.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,act);track.mute=True
    ob.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1)

def render_imported(path,output,lod):
    bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(path));scene=bpy.context.scene
    scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16;scene.cycles.use_denoising=False
    scene.render.resolution_x=480 if lod=='board' else 512;scene.render.resolution_y=480 if lod=='board' else 512;scene.render.resolution_percentage=100
    scene.world=bpy.data.worlds.new('Soft neutral daylight');scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.72,.77,.82,1);scene.world.node_tree.nodes['Background'].inputs[1].default_value=.42
    def area(name,pos,power,size):
        d=bpy.data.lights.new(name,'AREA');d.energy=power;d.shape='DISK';d.size=size;o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=pos;o.rotation_euler=(Vector((0,0,1.2))-o.location).to_track_quat('-Z','Y').to_euler()
    area('Large daylight',(-3,-4,6),450,4);area('Soft fill',(4,-1,3),210,4);area('Cool back',(-1,4,4),260,3)
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.22 if CHAR=='echo' else .38));floor=bpy.context.object;mat=bpy.data.materials.new('Warm neutral studio');mat.diffuse_color=(.76,.75,.71,1);floor.data.materials.append(mat)
    camdata=bpy.data.cameras.new('Review lens');cam=bpy.data.objects.new('Review lens',camdata);scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO';camdata.ortho_scale=3.65 if CHAR=='echo' else 3.25
    scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast';scene.view_settings.exposure=-1.2;scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
    target=Vector((0,.15,1.25))
    rigob=next(o for o in scene.objects if o.type=='ARMATURE')
    views={'front':(0,-6,2.5),'quarter':(5,-6,3.0),'side':(6,0,2.5),'back':(0,6,2.5)}
    for name,pos in views.items():
        if name not in REVIEW_VIEWS:continue
        cam.location=pos;cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(output/f'{lod}-{name}.png');scene.frame_set(1);bpy.ops.render.render(write_still=True)
    if lod=='close' and 'eyes' in REVIEW_VIEWS:
        for action,frame in (('Idle',1),('Listen',30),('React',13)):
            candidates=[a for a in bpy.data.actions if a.name==action or a.name.endswith('|'+action) or a.name.endswith('_'+action)]
            if not candidates:candidates=[a for a in bpy.data.actions if action in a.name]
            if candidates:rigob.animation_data.action=candidates[0]
            scene.frame_set(frame);cam.location=(4,-6,2.7);cam.rotation_euler=(Vector((0,-.72,1.65))-cam.location).to_track_quat('-Z','Y').to_euler();camdata.ortho_scale=1.65
            scene.render.filepath=str(output/f'eyes-{action.lower()}.png');bpy.ops.render.render(write_still=True)

def build(lod,output,source):
    bpy.ops.wm.read_factory_settings(use_empty=True);mat=material(paint_atlas(output,2048 if lod=='close' else 1024));arm=rig();mesh=make_mesh(lod,mat,arm);animate(arm)
    bpy.ops.object.select_all(action='DESELECT');arm.select_set(True);mesh.select_set(True);bpy.context.view_layer.objects.active=mesh
    dest=output/f'{CHAR}-{lod}.glb'
    bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_apply=False,export_image_format='AUTO',export_extras=False,export_yup=True,export_rest_position_armature=True)
    report=glb_stats(dest);report.update(exported_audit(dest));report['skinWeights']={'vertices':len(mesh.data.vertices),'unweighted':sum(not v.groups for v in mesh.data.vertices),'maxInfluences':max(len(v.groups) for v in mesh.data.vertices),'maxSumError':max(abs(sum(g.weight for g in v.groups)-1) for v in mesh.data.vertices)}
    report['character']=CHAR;report['species']='beluga' if CHAR=='echo' else 'royal gramma';report['validation']='Offline CPU, exported GLB reimported before review rendering; no browser/device FPS claim.'
    assert report['triangles']<=(20000 if lod=='close' else 7500),report
    assert report['bytes']<(2000000 if lod=='close' else 850000),report
    assert report['draws']==report['materials']==1 and report['bones']<=14,report
    assert len(report['textureImages'])==2 and {c['name'] for c in report['clips']}=={'Idle','Listen','React'},report
    assert report['skinWeights']['unweighted']==0 and report['skinWeights']['maxSumError']<.00001,report
    (output/f'{lod}-report.json').write_text(json.dumps(report,indent=2)+'\n')
    if lod=='close':
        bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(source/f'{CHAR}-authored.blend'),compress=True)
    print('VERTEBRATE_REPORT',json.dumps(report),flush=True)

def main():
    global CHAR, REVIEW_VIEWS
    p=argparse.ArgumentParser();p.add_argument('--character',choices=['echo','pip'],required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--source',type=Path);p.add_argument('--skip-render',action='store_true');p.add_argument('--render-only',action='store_true');p.add_argument('--views',default='front,quarter,side,back,eyes');p.add_argument('--lod',choices=['both','board','close'],default='both');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);CHAR=a.character;a.output=a.output.resolve();a.source=a.source.resolve() if a.source else None
    if CHAR in ('pip','echo'):
        # v25/v26: Route both Pip and Echo directly to the cast-standard conforming_eye.py builder in build_supporting_hosts.py
        # (Pip: 76.5% iris fill, S-wave dorsal fin, enlarged twin catchlights & bold smile;
        #  Echo: silky pearl-cream/coral-marigold finish, 3D NACA hydrofoil beluga paddle flippers, 76% teal-aqua eyes).
        spec=importlib.util.spec_from_file_location('build_supporting_hosts',str(Path(__file__).with_name('build_supporting_hosts.py')))
        sh=importlib.util.module_from_spec(spec);spec.loader.exec_module(sh)
        a.output.mkdir(parents=True,exist_ok=True)
        lods=('board','close') if a.lod=='both' else (a.lod,)
        if not a.render_only:
            for lod in lods:sh.build(CHAR,lod,a.output)
        if not a.skip_render:
            REVIEW_VIEWS=a.views.split(',')
            for lod in lods:render_imported(a.output/f'{CHAR}-{lod}.glb',a.output,lod)
        return
    if CHAR=='echo':ATLAS['fin']=(640,384,384,300);ATLAS.pop('tailfin',None)
    a.output.mkdir(parents=True,exist_ok=True);source=a.source or Path(__file__).resolve().parents[2]/'art-source/npcs'/CHAR;source.mkdir(parents=True,exist_ok=True)
    lods=('board','close') if a.lod=='both' else (a.lod,)
    if not a.render_only:
        for lod in lods:build(lod,a.output,source)
    if not a.skip_render:
        REVIEW_VIEWS=a.views.split(',')
        for lod in lods:render_imported(a.output/f'{CHAR}-{lod}.glb',a.output,lod)
if __name__=='__main__':main()
