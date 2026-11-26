"""Author the adult shopkeeper, its two mobile LODs and inspection evidence.

blender -b --factory-startup --python tools/art/build_shop_octopus.py -- \
  --output art-source/npcs/shop-octopus/production

No reconstruction input or runtime files are modified. Eight separately indexed
closed tube components attach inside the crown. Each uses one nonbranching
centerline and has exactly one root and one tip. Color alpha is an OPAQUE skin
selection mask; it is deliberately never connected to material opacity.
"""
import argparse
import json
import math
import struct
import shutil
import subprocess
import sys
import zlib
from pathlib import Path

import bpy
import numpy as np
from mathutils import Vector, Quaternion

TAU = math.tau
Z = Vector((0,0,1))
ATLAS = {
    'skin': (0,0,600,1024), 'arm': (600,0,424,512),
    'cloth': (600,512,284,300), 'pocket': (600,812,284,212),
    'eye': (884,512,140,140), 'sucker': (884,652,140,140),
    'gold': (884,792,140,116), 'strap': (884,908,140,116),
}
# All coordinates are in authoring space: +Z up, -Y the customer-facing side.
# Deliberate depth staggering prevents false branches and fused curling tips.
ARMS = [
    [(-.48,.14,1.48),(-.95,.13,1.35),(-1.55,.15,1.42),(-1.85,.11,1.82),(-1.73,.07,2.06),(-1.48,.04,2.02),(-1.45,.02,1.82),(-1.61,.01,1.79)],
    [(.47,.10,1.48),(.96,.08,1.36),(1.55,.03,1.52),(1.83,-.02,1.94),(1.65,-.04,2.15),(1.43,-.06,2.04),(1.49,-.08,1.86),(1.61,-.08,1.92)],
    [(-.54,-.13,1.23),(-1.02,-.23,1.02),(-1.69,-.30,1.02),(-2.05,-.34,1.22),(-2.05,-.37,1.49),(-1.83,-.39,1.53),(-1.74,-.41,1.35),(-1.88,-.42,1.31)],
    [(.54,-.15,1.22),(1.04,-.20,1.05),(1.64,-.23,1.14),(2.02,-.25,1.37),(2.04,-.28,1.60),(1.82,-.30,1.66),(1.73,-.32,1.48),(1.87,-.33,1.43)],
    [(-.45,.40,1.12),(-.95,.68,.66),(-1.57,.77,.42),(-1.97,.70,.53),(-2.10,.60,.77),(-1.91,.51,.92),(-1.74,.47,.78),(-1.83,.43,.66)],
    [(.45,.43,1.10),(.92,.72,.58),(1.53,.78,.35),(1.94,.72,.43),(2.12,.60,.68),(1.94,.49,.85),(1.76,.44,.74),(1.86,.41,.61)],
    [(-.30,-.42,1.00),(-.55,-.66,.55),(-1.00,-.91,.29),(-1.38,-1.05,.24),(-1.53,-1.12,.43),(-1.40,-1.17,.64),(-1.18,-1.19,.62),(-1.14,-1.20,.43),(-1.29,-1.20,.39)],
    [(.30,-.43,1.00),(.55,-.70,.54),(1.02,-.97,.28),(1.36,-1.12,.21),(1.55,-1.17,.39),(1.45,-1.21,.60),(1.22,-1.23,.63),(1.12,-1.24,.46),(1.27,-1.24,.39)],
]


def spline(points,t):
    q=min(len(points)-1.000001,max(0,t)*(len(points)-1))
    i=int(q);u=q-i
    a,b,c,d=(Vector(points[max(0,i-1)]),Vector(points[i]),Vector(points[i+1]),Vector(points[min(i+2,len(points)-1)]))
    return b+.5*u*((c-a)+u*((2*a-5*b+4*c-d)+u*(3*b-3*c+d-a)))


def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)))
    return t*t*(3-2*t)


def arm_frame(index,t):
    p=spline(ARMS[index],t)
    tangent=(spline(ARMS[index],min(1,t+.001))-spline(ARMS[index],max(0,t-.001))).normalized()
    n=Vector((0,-1,-.12))
    n=(n-tangent*tangent.dot(n)).normalized()
    b=tangent.cross(n).normalized()
    # Broad muscular roots taper continuously, including through each curl.
    radius=.215*(1-t)**1.11+.009
    radius*=1+.045*math.sin(t*TAU*2+index)
    return p,tangent,n,b,radius


def arm_point(index,u,v):
    p,t,n,b,r=arm_frame(index,v)
    a=TAU*u
    relief=1+.018*math.sin(v*72+math.sin(a*5))+.012*math.cos(a*9+v*43)
    return p+r*relief*(n*math.cos(a)+b*math.sin(a))


PROFILE=[(.77,.37,.35,-.02),(.97,.53,.48,0),(1.24,.61,.55,0),(1.52,.59,.58,.02),
         (1.78,.66,.63,.04),(2.02,.82,.72,.08),(2.30,.96,.78,.12),
         (2.57,1.00,.76,.15),(2.82,.87,.67,.18),(3.04,.61,.48,.20),(3.17,.20,.17,.21),(3.19,.003,.003,.21)]


def skin_point(u,v):
    z,rx,ry,cy=spline(PROFILE,v)
    a=TAU*(u-.5)
    x=rx*math.sin(a);y=cy-ry*math.cos(a)
    # Wide adult mantle, with low-amplitude dermal contours rather than facets.
    ripple=.009*math.sin(a*9+v*49)+.005*math.sin(a*17-v*61)
    ripple*=math.sin(math.pi*v)**.7
    x+=ripple*math.sin(a);y-=ripple*math.cos(a)
    x-=.055*math.sin(math.pi*v)
    return Vector((x,y,z))


def eye_center(side):
    return Vector((side*.392-.015,-.578,2.045+(.018 if side==1 else 0)))


def eye_point(side,u,v):
    # v40: Warm slightly horizontal almond-oval eyeball seated cleanly inside the sculpted brow-ridged socket
    a=(u-.5)*TAU;phi=math.pi*(1-v)
    return eye_center(side)+Vector((.204*math.sin(a)*math.sin(phi),-.092*math.cos(a)*math.sin(phi),.194*math.cos(phi)))


def mantle_front_y(x,z):
    # Invert the authored mantle profile so the orbital rim really merges into
    # its curved surface at every side angle instead of becoming a flat disc.
    lo,hi=0.,1.
    for _ in range(18):
        mid=(lo+hi)/2
        if spline(PROFILE,mid)[0]<z:lo=mid
        else:hi=mid
    v=(lo+hi)/2
    _,rx,ry,cy=spline(PROFILE,v)
    xx=x+.055*math.sin(math.pi*v)
    return cy-ry*math.sqrt(max(.025,1-(xx/rx)**2))


def orbit_point(side,u,v):
    a=TAU*u
    r=1+.24*v
    c=eye_center(side)
    # v40: Sculpted warm Nintendo brow-ridge overhang above the eye + soft lower cheek bolster
    up_w=max(0.0,math.sin(a))**1.35
    x=c.x+.202*r*math.cos(a);z=c.z+(.192+.022*up_w)*r*math.sin(a)
    inside=c.y-.036-.024*up_w
    outside=mantle_front_y(x,z)-.010
    brow_roll=.028*up_w*math.sin(math.pi*v)
    y=inside*(1-v)+outside*v-.014*math.sin(math.pi*v)-brow_roll
    return Vector((x,y,z))


def lid_point(side,u,v):
    # v40: Warm welcoming brow-ridged upper eyelid gently framing the top ~18% of the iris (warm & alert, never sleepy!)
    a=math.pi*u
    x=.205*math.cos(a)
    bottom=(.086-side*.012*math.cos(a))*math.sin(a)**.46+.020*math.sin(a)
    top=.220*math.sin(a)
    z=bottom*(1-v)+max(bottom,top)*v
    brow_puff=.020*math.sin(math.pi*v)*math.sin(a)
    y=-.096*math.sqrt(max(.03,1-(x/.205)**2-(z/.214)**2))-.014-brow_puff
    return eye_center(side)+Vector((x,y,z))


def apron_point(u,v,extra=0):
    width=.67-.18*v+.026*math.sin(math.pi*v)
    x=(2*u-1)*width
    z=.58+1.04*v-.045*(abs(2*u-1)**4)*(1-v)
    y=-.57-.13*math.sin(math.pi*v)-.075*(1-(2*u-1)**2)
    y+=.020*math.sin(u*TAU*3+.8)*math.sin(math.pi*v)**2
    return Vector((x,y-extra,z))


def pocket_point(u,v):
    # Sewn-on pocket follows cloth surface and has a rounded bottom edge.
    pu=.19+.62*u;pv=.23+.42*v+.05*abs(2*u-1)**5*(1-v)
    return apron_point(pu,pv,.012+.018*math.sin(math.pi*u)*math.sin(math.pi*v))


def strap_point(side,u,v):
    c=spline([(side*.46,-.63,1.59),(side*.59,-.56,1.84),(side*.63,-.28,1.95),
              (side*.60,.15,1.89),(side*.54,.51,1.66),(side*.48,.50,1.34)],v)
    return c+Vector(((u-.5)*.114,0,0))


def waist_point(u,v):
    a=TAU*u
    return Vector((.583*math.sin(a),.035-.573*math.cos(a),1.20+(v-.5)*.10))


def uv(tile,u,v):
    x,y,w,h=ATLAS[tile]
    return ((x+4+u*(w-8))/1024,(y+4+v*(h-8))/1024)


class Builder:
    def __init__(self):
        self.vertices=[];self.faces=[];self.uvs=[];self.weights=[];self.parts=[]

    def grid(self,name,fn,n,m,tile,weight,wrap=False,closed=False,uv_fn=None,reverse=False):
        start=len(self.vertices);face_start=len(self.faces)
        cols=n if wrap else n+1
        for j in range(m+1):
            for i in range(cols):
                u=i/n;v=j/m;p=fn(u,v)
                self.vertices.append(tuple(p))
                self.weights.append(weight(p,u,v) if callable(weight) else {weight:1})
        for j in range(m):
            for i in range(n):
                ids=(start+j*cols+i,start+j*cols+(i+1)%cols,start+(j+1)*cols+(i+1)%cols,start+(j+1)*cols+i)
                coords=[(i/n,j/m),((i+1)/n,j/m),((i+1)/n,(j+1)/m),(i/n,(j+1)/m)]
                self.faces.append(ids[::-1] if reverse else ids)
                self.uvs.extend(uv(tile,*(uv_fn(*q) if uv_fn else q)) for q in (coords[::-1] if reverse else coords))
        if closed:
            for row,reverse in ((0,True),(m,False)):
                ids=[start+row*cols+i for i in range(n)]
                p=sum((Vector(self.vertices[i]) for i in ids),Vector())/n
                cap=len(self.vertices);self.vertices.append(tuple(p));self.weights.append(self.weights[ids[0]].copy())
                for i in range(n):
                    face=(cap,ids[(i+1)%n],ids[i]) if reverse else (cap,ids[i],ids[(i+1)%n])
                    self.faces.append(face);self.uvs.extend([uv(tile,.5,row/m)]*3)
        self.parts.append({'name':name,'vertexStart':start,'vertexCount':len(self.vertices)-start,
                           'faceStart':face_start,'faceCount':len(self.faces)-face_start,'tile':tile})

    def finish(self,material,rig):
        mesh=bpy.data.meshes.new('Authored octopus, eight independent arms')
        mesh.from_pydata(self.vertices,[],self.faces);mesh.update()
        layer=mesh.uv_layers.new(name='Pigment and skin-mask atlas')
        layer.data.foreach_set('uv',np.ravel(self.uvs))
        mesh.polygons.foreach_set('use_smooth',[True]*len(mesh.polygons))
        mesh.materials.append(material)
        obj=bpy.data.objects.new('Adult town shopkeeper',mesh);bpy.context.collection.objects.link(obj)
        obj.parent=rig
        groups={b.name:obj.vertex_groups.new(name=b.name) for b in rig.data.bones}
        for i,w in enumerate(self.weights):
            total=sum(w.values())
            for name,value in w.items():
                if value>0:groups[name].add([i],value/total,'REPLACE')
        modifier=obj.modifiers.new('Twenty-bone calm shopkeeper rig','ARMATURE');modifier.object=rig
        return obj


def arm_weights(index,t):
    root=smooth(0,.16,t)
    bend=smooth(.30,.77,t)
    return {'Root':1-root,f'Arm{index+1:02}.base':root*(1-bend),f'Arm{index+1:02}.curl':root*bend}


def make_mesh(lod,material,rig):
    close=lod=='close';b=Builder()
    b.grid('mantle and crown',skin_point,48 if close else 28,30 if close else 18,'skin',
           lambda p,u,v:{'Root':1-smooth(.13,.48,v),'Mantle':smooth(.13,.48,v)},wrap=True,closed=True)
    for index in range(8):
        b.grid(f'arm-{index+1:02}-root-to-tip',lambda u,v,i=index:arm_point(i,u,v),12 if close else 8,44 if close else 28,
               'arm',lambda p,u,v,i=index:arm_weights(i,v),wrap=True,closed=True,
               uv_fn=lambda u,v,i=index:(u,(v*.86+i*.017)%1))
        count=13 if close else 8
        for row in (-1,1):
            for j in range(count):
                t=.15+j*(.77/(count-1))
                p,tangent,n,across,r=arm_frame(index,t)
                direction=(n*math.cos(.42)+across*math.sin(row*.42)).normalized()
                width=tangent.cross(direction).normalized()
                center=p+direction*r*.94
                radius=r*.37*(1+.06*math.sin(j*2))
                def cup(u,v,c=center,d=direction,h=width,w=tangent,s=radius):
                    a=TAU*u
                    # Raised muscular rim surrounding an inset cup, not a pearl bead.
                    lift=(.015+.23*math.sin(math.pi*v*.85))*s
                    return c+(h*math.cos(a)+w*math.sin(a))*s*v+d*lift
                b.grid(f'arm-{index+1:02}-sucker-{row}-{j}',cup,8 if close else 6,2 if close else 1,
                       'sucker',lambda p,u,v,i=index,t=t:arm_weights(i,t),wrap=True,reverse=True)
    for side,label in ((-1,'L'),(1,'R')):
        b.grid('eye '+label,lambda u,v,s=side:eye_point(s,u,v),24 if close else 16,14 if close else 9,'eye','Eye.'+label,wrap=True)
        b.grid('socket '+label,lambda u,v,s=side:orbit_point(s,u,v),24 if close else 16,4 if close else 3,'skin','Mantle',wrap=True,
               uv_fn=lambda u,v:(.12+.34*u,.30+.10*v),reverse=True)
        b.grid('upper lid '+label,lambda u,v,s=side:lid_point(s,u,v),18 if close else 12,4 if close else 2,'skin','Mantle',
               uv_fn=lambda u,v:(.25+.30*u,.36+.08*v))
    b.grid('work apron',apron_point,20 if close else 12,16 if close else 9,'cloth','Root')
    b.grid('sewn pocket',pocket_point,12 if close else 8,8 if close else 5,'pocket','Root')
    for side in (-1,1):
        b.grid('shoulder strap',lambda u,v,s=side:strap_point(s,u,v),2,24 if close else 14,'strap','Root')
        c=apron_point(.08 if side==-1 else .92,.94,.024)
        b.grid('brass strap button',lambda u,v,c=c:c+Vector((.046*math.cos(TAU*u)*math.sin(math.pi*v),-.021*math.sin(TAU*u)*math.sin(math.pi*v),.046*math.cos(math.pi*v))),
               12 if close else 8,6 if close else 4,'gold','Root',wrap=True)
    b.grid('waist band',waist_point,36 if close else 24,2,'strap','Root',wrap=True)
    return b.finish(material,rig),b


def png(path,pixels):
    h,w,c=pixels.shape
    def chunk(tag,payload):return struct.pack('>I',len(payload))+tag+payload+struct.pack('>I',zlib.crc32(tag+payload))
    delta=pixels.copy();delta[:,1:]-=pixels[:,:-1]
    data=b''.join(b'\1'+row.tobytes() for row in delta[::-1])
    path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,6 if c==4 else 2,0,0,0))+chunk(b'IDAT',zlib.compress(data,9))+chunk(b'IEND',b''))


def mix(a,b,t):
    return np.array(a,dtype=np.float32)+(np.array(b,dtype=np.float32)-a)*np.asarray(t)[...,None]


def seeded_noise(u,v,seed,columns,rows):
    rng=np.random.default_rng(seed)
    field=rng.uniform(-1,1,(rows+1,columns+1)).astype(np.float32)
    field[:,-1]=field[:,0]
    x=np.clip(u*columns,0,columns-.0001);y=np.clip(v*rows,0,rows-.0001)
    ix=x.astype(np.int32);iy=y.astype(np.int32)
    fx=x-ix;fy=y-iy;fx=fx*fx*(3-2*fx);fy=fy*fy*(3-2*fy)
    lower=field[iy,ix]*(1-fx)+field[iy,ix+1]*fx
    upper=field[iy+1,ix]*(1-fx)+field[iy+1,ix+1]*fx
    return lower*(1-fy)+upper*fy


def pigment(tile,u,v):
    a=u*TAU
    # v40: Warm organic crimson-coral mottling matching Hero Shelly's velvety Switch/Pixar craft (ZERO robotic plastic shine!)
    cloud=(np.sin(a*6+np.sin(v*19)*1.5)+.60*np.sin(a*11-v*31+.75*np.sin(a*3+v*17))+
           .32*np.sin(a*23+v*59)+.20*np.cos(a*37-v*83))/2.12
    if tile=='arm':cloud=(np.sin(a*5+v*21+np.sin(v*35))+.60*np.sin(a*10-v*47)+.35*np.sin(a*19+v*83))/1.95
    mottle=np.clip((cloud-.38)*2.4,0,1)
    mottle*=.58+.42*(.5+.5*np.sin(a*37+v*97)*np.cos(a*29-v*71))
    # Lush sunlit coral-crimson base transitioning softly into warm organic crimson-peach mottling (zero harsh pale blotches!)
    base=mix([146,42,36],[206,74,54],.46+.36*np.sin(math.pi*v)+.14*np.sin(a*3-v*11))
    base=base*(1-mottle[...,None]*.34)+np.array([228,116,86],dtype=np.float32)*(mottle[...,None]*.34)
    # Soft warm peach-coral subsurface warmth along lower mantle & arm undersides + subtle baked collar/socket AO
    if tile=='skin':
        sub_warm=np.clip((.42-v)*2.6,0,1)*.24
        base=mix(base,[228,118,92],sub_warm)
        collar_ao=np.exp(-((v-.16)/.065)**2)*.24
        base*=(1.0-collar_ao[...,None])
    else:
        tip_warm=np.clip((v-.52)*2.2,0,1)*.30
        base=mix(base,[232,126,96],tip_warm)
        root_ao=np.exp(-((v/.10)**2))*.22
        base*=(1.0-root_ao[...,None])
    # Smooth painterly organic dermal variation (zero high-frequency pixel noise -> velvety Pixar finish & tight PNG budget!)
    seed=521 if tile=='skin' else 838
    cells=seeded_noise(u,v,seed,22,38)
    relief=1+.028*cells
    base*=relief[...,None]
    # Strictly velvety matte-satin roughness (0.88..0.92), zero metallic!
    rough=np.clip(.90+.015*cells-.010*mottle,.88,.92)
    return base,rough,np.zeros_like(u)


def paint(tile,u,v):
    if tile in ('skin','arm'):
        return (*pigment(tile,u,v),np.ones_like(u))
    if tile in ('cloth','pocket','strap'):
        weave=np.sin(u*TAU*48+v*TAU*48)*np.sin(v*TAU*52)
        warp=np.sin(u*TAU*24+v*TAU*4)
        wear=.5+.5*np.sin(u*21+v*15)*np.cos(v*19-u*9)
        base=mix([24,42,72],[48,74,110],.34+.34*wear)
        base*=1+.022*weave[...,None]+.016*warp[...,None]
        edge=np.minimum(np.minimum(u,1-u),np.minimum(v,1-v))
        base*=np.clip(.74+edge*8,.74,1)[...,None]
        line=(np.abs(u-.042)<.006)|(np.abs(u-.958)<.006)|(np.abs(v-.035)<.006)|(np.abs(v-.96)<.006)
        dash=np.where((np.abs(u-.042)<.006)|(np.abs(u-.958)<.006),np.sin(v*TAU*45)>.0,np.sin(u*TAU*49)>.0)
        stitches=line&dash
        base[stitches]=[198,162,92]
        if tile=='pocket':
            opening=(v>.945)&(v<.968)
            base[opening]=[14,26,48]
            center=np.exp(-((u-.5)**2+(v-.55)**2)*9)
            base+=center[...,None]*np.array([4,7,10])
        return base,np.full_like(u,.90),np.zeros_like(u),np.zeros_like(u)
    if tile=='eye':
        # v40: Hero-Shelly living amber-gold eye with warm pearl-cream sclera, rich upper-eyelid shadow,
        # radial iris fibers, caustic lower-iris crescent, feathered limbus & glossy 0.06 wet cornea!
        a=(u-.5)*TAU;phi=math.pi*(1-v)
        x=np.sin(a)*np.sin(phi);z=np.cos(phi)
        r=np.sqrt((x+.020)**2+(z+.030)**2)
        front=np.cos(a)>0
        # Warm living pearl-cream sclera with orbital edge shading
        sclera=mix([234,225,212],[184,174,178],np.clip((r-.50)*1.4,0,.70))
        angle=np.arctan2(z+.030,x+.020)
        radial=(np.sin(53*angle+.8*np.sin(11*angle))*np.sin(8*angle-12*r)+.6*np.cos(83*angle+r*35))/1.6
        grad=np.clip(.48-.92*(z+.030)+.14*radial,0,1)
        iris_col=mix([72,30,12],[214,132,36],grad)
        # Luminous caustic lower-iris bounce
        caustic=np.clip((-.04-z)*2.4,0,1)*np.clip((r-.34)*5.0,0,1)*np.clip((.76-r)*6.0,0,1)
        iris_col=mix(iris_col,[252,208,92],caustic*.62)
        # Soft feathered limbus border
        limbus=np.clip((r-.68)*14.0,0,1)*np.clip((.80-r)*14.0,0,1)
        iris_col=mix(iris_col,[36,18,16],limbus*.75)
        # Velvety deep pupil with soft feathered edge
        pup_t=np.clip((.44-r)*18.0,0,1)
        iris_col=mix(iris_col,[18,16,26],pup_t)
        iris_mask=np.clip((.79-r)*16.0,0,1)*front.astype(np.float32)
        base=mix(sclera,iris_col,iris_mask)
        # Rich sculpted upper-eyelid overhang shadow across upper ~32% of sclera & iris!
        lid_sh=np.clip((z-.08)/.48,0,1)
        lid_sh=lid_sh*lid_sh*(3-2*lid_sh)
        base*=1.0-lid_sh[...,None]*np.array([.44,.46,.36],dtype=np.float32)
        # Restrained luminous warm-cream primary catchlight + delicate lower bounce
        hl1=np.clip((1.0-np.sqrt(((x-.15)/.12)**2+((z-.16)/.10)**2))*2.6,0,1)*front.astype(np.float32)
        hl2=np.clip((1.0-np.sqrt(((x+.17)/.062)**2+((z+.18)/.056)**2))*2.6,0,1)*front.astype(np.float32)
        base=mix(base,[255,248,234],hl1*.95)
        base=mix(base,[248,242,226],hl2*.64)
        # ONLY eye cornea is glossy (0.06 <= 0.08)!
        return base,np.full_like(u,.06),np.zeros_like(u),np.zeros_like(u)
    if tile=='sucker':
        # v40: Subtle pale velvety cream-peach suckers (roughness 0.88 — ZERO plastic bead glare!)
        base=mix([174,116,96],[244,224,198],np.clip(v*1.55,0,1))
        rim_hi=np.exp(-((v-.76)/.14)**2)
        base+=rim_hi[...,None]*np.array([10,11,9],dtype=np.float32)
        base*=1+.020*np.sin(u*TAU*16+v*37)[...,None]
        return base,np.full_like(u,.88),np.zeros_like(u),np.zeros_like(u)
    if tile=='gold':
        rim=np.exp(-((v-.18)/.035)**2)+np.exp(-((v-.82)/.035)**2)
        base=mix([118,80,26],[212,168,74],.60+.18*np.sin(u*TAU)+.15*rim)
        return base,np.full_like(u,.36),np.full_like(u,.48),np.zeros_like(u)
    raise ValueError(tile)


def atlas(output,size):
    color=np.zeros((size,size,4),dtype=np.uint8)
    surface=np.zeros((size,size,3),dtype=np.uint8);surface[...,0]=255
    factor=size/1024
    evidence={}
    for name,rect in ATLAS.items():
        x,y,w,h=(int(a*factor) for a in rect)
        u,v=np.meshgrid(np.clip((np.arange(w,dtype=np.float32)+.5-4*factor)/(w-8*factor),0,1),
                        np.clip((np.arange(h,dtype=np.float32)+.5-4*factor)/(h-8*factor),0,1))
        rgb,rough,metal,mask=paint(name,u,v)
        # A small deterministic tonal quantization keeps the lossless atlas mobile-sized.
        color[y:y+h,x:x+w,:3]=np.uint8(np.clip(np.rint(rgb/2)*2,0,255))
        color[y:y+h,x:x+w,3]=np.uint8(mask*255)
        surface[y:y+h,x:x+w,1]=np.uint8(np.clip(rough*255,0,255))
        surface[y:y+h,x:x+w,2]=np.uint8(np.clip(metal*255,0,255))
        evidence[name]={'alphaMin':int(mask.min()*255),'alphaMax':int(mask.max()*255),'region':list(rect)}
    color_path=output/f'painted-color-{size}.png';surface_path=output/f'painted-surface-{size//4}.png'
    png(color_path,color)
    # Quantize RGB first, then duplicate its palette for the two exact mask
    # values. Quantizing RGBA directly would discard RGB under mask alpha 0.
    subprocess.run([sys.executable,'-c',
        "from PIL import Image,ImageChops; import sys; "
        "p=sys.argv[1]; n=int(sys.argv[2]); im=Image.open(p).convert('RGBA'); "
        "q=im.convert('RGB').quantize(colors=n,method=Image.Quantize.MEDIANCUT,dither=Image.Dither.NONE); "
        "pal=q.getpalette()[:n*3]; "
        "idx=Image.frombytes('L',q.size,q.tobytes()); "
        "mask=im.getchannel('A').point(lambda a:n if a>127 else 0); "
        "result=Image.frombytes('P',q.size,ImageChops.add(idx,mask).tobytes()); "
        "result.putpalette(pal+pal); result.info['transparency']=bytes([0]*n+[255]*n); "
        "result.save(p,optimize=True)",str(color_path),'72'],check=True)
    down=np.uint8(np.rint(surface.reshape(size//4,4,size//4,4,3).mean(axis=(1,3))))
    down[...,1]=np.uint8(np.clip(np.rint(down[...,1].astype(np.float32)/8)*8,0,255))
    png(surface_path,down)
    (output/f'skin-mask-{size}.json').write_text(json.dumps({'rule':'alpha 255 only skin/arm; 0 eyes/suckers/clothing/brass; OPAQUE material','tiles':evidence},indent=2)+'\n')
    return color_path,surface_path


def material(color_path,surface_path):
    mat=bpy.data.materials.new('OctopusSkinMask');mat.use_nodes=True
    mat['residentSkinMask']='baseColorAlpha'
    nodes=mat.node_tree.nodes;links=mat.node_tree.links;shader=nodes.get('Principled BSDF')
    shader.inputs['Specular IOR Level'].default_value=.14
    if 'Coat Weight' in shader.inputs:
        shader.inputs['Coat Weight'].default_value=0.0
    tex=nodes.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(color_path));tex.image.pack()
    tex.label='Opaque pigment; alpha selects skin for intentional camouflage'
    surface=nodes.new('ShaderNodeTexImage');surface.image=bpy.data.images.load(str(surface_path));surface.image.colorspace_settings.name='Non-Color';surface.image.pack()
    split=nodes.new('ShaderNodeSeparateColor')
    links.new(tex.outputs['Color'],shader.inputs['Base Color'])
    links.new(surface.outputs['Color'],split.inputs[0]);links.new(split.outputs['Green'],shader.inputs['Roughness']);links.new(split.outputs['Blue'],shader.inputs['Metallic'])
    # Alpha remains a shader-independent data channel. DO NOT connect to opacity.
    shader.inputs['Alpha'].default_value=1
    return mat


def make_rig():
    data=bpy.data.armatures.new('Shopkeeper authored skeleton')
    rig=bpy.data.objects.new('Shopkeeper rig',data);bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active=rig;rig.select_set(True);rig.show_in_front=True
    bpy.ops.object.mode_set(mode='EDIT')
    def bone(name,head,tail,parent=None):
        b=data.edit_bones.new(name);b.head=head;b.tail=tail
        if parent:b.parent=data.edit_bones[parent]
    bone('Root',(0,0,.8),(0,0,1.2))
    bone('Mantle',(0,.06,1.68),(0,.12,2.5),'Root')
    for side,label in ((-1,'L'),(1,'R')):
        c=eye_center(side);bone('Eye.'+label,c,c+Vector((0,-.2,0)),'Mantle')
    for i in range(8):
        bone(f'Arm{i+1:02}.base',spline(ARMS[i],0),spline(ARMS[i],.40),'Root')
        bone(f'Arm{i+1:02}.curl',spline(ARMS[i],.48),spline(ARMS[i],.72),f'Arm{i+1:02}.base')
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


def animate(rig):
    # Practiced customer/item glances. Eye leads mantle by several frames;
    # only one service arm gestures, other arms have tiny asynchronous settling.
    clips={
        'Idle':[(1,0,0,0),(25,.7,0,0),(48,.25,9,-3),(73,-.5,9,-3),(91,-.35,0,0),(121,0,0,0)],
        'Listen':[(1,0,0,0),(18,-.9,-1,1),(42,-.8,-1,1),(64,.1,-6,-2),(83,-.2,0,0),(103,0,0,0)],
        'React':[(1,0,0,0),(12,-1,-9,-5),(25,1.6,-6,-2),(39,.6,0,1),(59,0,0,0)],
    }
    def rotate(name,frame,world_rot):
        b=rig.pose.bones[name];q=Quaternion()
        for axis,degrees in world_rot:
            local=b.bone.matrix_local.to_3x3().inverted()@Vector(axis)
            q@=Quaternion(local,math.radians(degrees))
        b.rotation_mode='QUATERNION';b.rotation_quaternion=q
        b.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=name)
    rig.animation_data_create();bpy.context.scene.render.fps=30
    for clip,keys in clips.items():
        action=bpy.data.actions.new(clip);rig.animation_data.action=action
        end=keys[-1][0]
        for frame,nod,gaze,pitch in keys:
            rotate('Mantle',frame,[((1,0,0),nod),((0,0,1),gaze*.09)])
            for side,label in ((-1,'L'),(1,'R')):
                rotate('Eye.'+label,frame,[((0,0,1),gaze*(1+.035*side)),((1,0,0),pitch+.25*side if gaze else 0)])
            for i in range(8):
                phase=math.sin((frame-1)/(end-1)*TAU)*(math.sin(i*1.7)*.55)
                gesture=(math.sin((frame-1)/(end-1)*math.pi)**2*3.2 if clip=='React' and i==1 else 0)
                rotate(f'Arm{i+1:02}.base',frame,[((0,1,0),phase*.22),((0,0,1),gesture*.23)])
                rotate(f'Arm{i+1:02}.curl',frame,[((0,1,0),phase*.55+gesture),((0,0,1),phase*.30)])
        for curve in action.fcurves:
            for key in curve.keyframe_points:key.handle_left_type=key.handle_right_type='AUTO_CLAMPED'
        action.use_fake_user=True;rig.animation_data.action=None
        track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,action);track.mute=True
    rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1);bpy.context.scene.frame_end=121


def glb_read(path):
    raw=path.read_bytes();n=struct.unpack_from('<I',raw,12)[0]
    return raw,json.loads(raw[20:20+n]),28+n


def preserve_png_payloads(path,output,size):
    """Preserve exact color RGBA data even when an exporter strips unused alpha.

    glTF is OPAQUE; its alpha is intentionally application data. Rebuilding
    buffer views uses ordinary embedded PNGs and adds no material or texture.
    """
    raw,doc,offset=glb_read(path)
    replace={}
    for image in doc['images']:
        name=image.get('name','')
        if 'painted-color' in name:replacement=output/f'painted-color-{size}.png'
        elif 'painted-surface' in name:replacement=output/f'painted-surface-{size//4}.png'
        else:raise AssertionError(name)
        replace[image['bufferView']]=replacement.read_bytes()
    binary=bytearray()
    for i,view in enumerate(doc['bufferViews']):
        while len(binary)%4:binary.append(0)
        payload=replace.get(i,raw[offset+view.get('byteOffset',0):offset+view.get('byteOffset',0)+view['byteLength']])
        view['byteOffset']=len(binary);view['byteLength']=len(payload);binary.extend(payload)
    doc['buffers'][0]['byteLength']=len(binary)
    while len(binary)%4:binary.append(0)
    encoded=json.dumps(doc,separators=(',',':')).encode()
    encoded+=b' '*((-len(encoded))%4)
    data=struct.pack('<III',0x46546c67,2,28+len(encoded)+len(binary))+struct.pack('<II',len(encoded),0x4e4f534a)+encoded+struct.pack('<II',len(binary),0x004e4942)+binary
    path.write_bytes(data)


def png_alpha(payload):
    width,height,depth,kind=struct.unpack_from('>IIBB',payload,16)
    assert depth==8 and kind==3,(depth,kind)
    compressed=bytearray();palette=None;position=8
    while position<len(payload):
        count=struct.unpack_from('>I',payload,position)[0];tag=payload[position+4:position+8];data=payload[position+8:position+8+count]
        if tag==b'tRNS':palette=np.frombuffer(data,dtype=np.uint8)
        if tag==b'IDAT':compressed.extend(data)
        position+=12+count
    assert palette is not None,'Embedded image lost mask alpha'
    decoded=zlib.decompress(compressed);out=np.zeros((height,width),dtype=np.uint8)
    for y in range(height):
        line=decoded[y*(width+1):(y+1)*(width+1)];kind=line[0];values=np.frombuffer(line[1:],dtype=np.uint8).astype(np.int32)
        if kind==0:out[y]=values
        elif kind==1:out[y]=np.cumsum(values)%256
        else:
            for x,val in enumerate(values):
                a=int(out[y,x-1]) if x else 0;b=int(out[y-1,x]) if y else 0;c=int(out[y-1,x-1]) if x and y else 0
                if kind==2:predict=b
                elif kind==3:predict=(a+b)//2
                elif kind==4:
                    p=a+b-c;pa,pb,pc=abs(p-a),abs(p-b),abs(p-c);predict=a if pa<=pb and pa<=pc else b if pb<=pc else c
                else:raise ValueError(kind)
                out[y,x]=(int(val)+predict)%256
    return palette[out][::-1]


def glb_audit(path):
    raw,doc,offset=glb_read(path)
    def accessor(index):
        a=doc['accessors'][index];v=doc['bufferViews'][a['bufferView']]
        components={'SCALAR':1,'VEC2':2,'VEC3':3,'VEC4':4,'MAT4':16}[a['type']]
        dtype={5126:'<f4',5123:'<u2',5121:'u1',5125:'<u4'}[a['componentType']]
        return np.frombuffer(raw,dtype=dtype,count=a['count']*components,offset=offset+v.get('byteOffset',0)+a.get('byteOffset',0)).reshape(-1,components)
    primitives=[p for m in doc['meshes'] for p in m['primitives']]
    images=[]
    mask_evidence={}
    for img in doc['images']:
        view=doc['bufferViews'][img['bufferView']];start=offset+view.get('byteOffset',0)
        width,height=struct.unpack_from('>II',raw,start+16)
        images.append({'name':img.get('name'),'mime':img['mimeType'],'width':width,'height':height,'bytes':view['byteLength']})
        if 'painted-color' in img.get('name',''):
            alpha=png_alpha(raw[start:start+view['byteLength']]);factor=width/1024
            for name,rect in ATLAS.items():
                x,y,w,h=(int(q*factor) for q in rect);selection=alpha[y:y+h,x:x+w]
                mask_evidence[name]={'min':int(selection.min()),'max':int(selection.max()),'expected':255 if name in ('skin','arm') else 0}
                assert selection.min()==selection.max()==mask_evidence[name]['expected'],mask_evidence
    weights=accessor(primitives[0]['attributes']['WEIGHTS_0'])
    report={'file':path.name,'bytes':len(raw),'triangles':sum(doc['accessors'][p['indices']]['count']//3 for p in primitives),
            'draws':len(primitives),'materials':len(doc['materials']),'bones':len(doc['skins'][0]['joints']),
            'textureImages':images,'alphaMode':doc['materials'][0].get('alphaMode','OPAQUE'),
            'materialName':doc['materials'][0]['name'],'materialExtras':doc['materials'][0].get('extras'),
            'maxWeightSumError':float(np.max(np.abs(weights.sum(axis=1)-1))),
            'maxInfluences':int(np.max((weights>0).sum(axis=1))),
            'embeddedPngSkinMask':mask_evidence,
            'clips':[{'name':a['name'],'channels':len(a['channels']),
                      'duration':max(doc['accessors'][s['input']]['max'][0] for s in a['samplers'])} for a in doc['animations']]}
    return report


def anatomy_report(builder):
    arms=[]
    for i in range(8):
        part=next(x for x in builder.parts if x['name']==f'arm-{i+1:02}-root-to-tip')
        start=part['faceStart'];faces=builder.faces[start:start+part['faceCount']]
        edges={};adj={}
        for face in faces:
            for j,a in enumerate(face):
                b=face[(j+1)%len(face)];e=tuple(sorted((a,b)));edges[e]=edges.get(e,0)+1
                adj.setdefault(a,set()).add(b);adj.setdefault(b,set()).add(a)
        seen=set();todo=[part['vertexStart']]
        while todo:
            item=todo.pop()
            if item not in seen:seen.add(item);todo.extend(adj[item]-seen)
        arms.append({'arm':i+1,'root':list(ARMS[i][0]),'tip':list(ARMS[i][-1]),
                     'ringTubeOnly':True,'oneCenterlineNoBranches':True,'rootCapCount':1,'tipCapCount':1,
                     'connectedComponentVertices':len(seen),'expectedVertices':part['vertexCount'],
                     'nonManifoldEdges':sum(c!=2 for c in edges.values()),
                     'eulerCharacteristic':part['vertexCount']-len(edges)+len(faces),
                     'controlStations':ARMS[i]})
    pairs=[]
    samples=[]
    parameters=np.linspace(.28,1,81)
    for i in range(8):
        frames=[arm_frame(i,float(t)) for t in parameters]
        samples.append((np.array([tuple(f[0]) for f in frames]),np.array([f[-1] for f in frames])))
    for i in range(8):
        for j in range(i+1,8):
            p,r=samples[i];q,rr=samples[j]
            distance=np.linalg.norm(p[:,None,:]-q[None,:,:],axis=2)-r[:,None]-rr[None,:]
            a,b=np.unravel_index(np.argmin(distance),distance.shape)
            pairs.append({'arms':[i+1,j+1],'surfaceClearance':round(float(distance[a,b]),5),'t':[float(parameters[a]),float(parameters[b])],'excludes':'shared crown attachment t<.28'})
    return {'armCount':8,'generation':'Eight independent closed swept tubes; no arm vertices or faces are shared. Two capped ends each; one hidden root and one exposed tip.',
            'arms':arms,'neutralPairClearances':pairs,'minimumNeutralArmClearance':min(p['surfaceClearance'] for p in pairs),
            'parts':builder.parts,'mouth':'No human mouth or mantle smile; natural beak hidden beneath crown and apron.'}


def verify_reimport(path,output):
    """Measure the real exported/reimported rig in each authored clip.

    The centerline samples use imported bone rest/pose matrices, not the source
    action data. Radius subtraction is conservative for these rotation-only
    joints. The shared crown attachment (t<.28) is explicitly excluded.
    """
    bpy.ops.wm.read_factory_settings(use_empty=True)
    bpy.ops.import_scene.gltf(filepath=str(path))
    rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
    obj=next(o for o in bpy.context.scene.objects if o.type=='MESH')
    for track in rig.animation_data.nla_tracks:track.mute=True
    parameters=np.linspace(.28,1,81)
    samples=[]
    for i in range(8):
        frames=[arm_frame(i,float(t)) for t in parameters]
        samples.append((np.array([(*f[0],1) for f in frames]),np.array([f[-1] for f in frames])))
    clips=[]
    inverse={b.name:b.matrix_local.inverted() for b in rig.data.bones}
    for clip in ('Idle','Listen','React'):
        action=next(a for a in bpy.data.actions if a.name==clip or a.name.startswith(clip+'_'))
        rig.animation_data.action=action
        tests=[]
        for frame in np.linspace(action.frame_range[0],action.frame_range[1],9):
            bpy.context.scene.frame_set(int(round(frame)));bpy.context.view_layer.update()
            matrices={b.name:np.array(b.matrix@inverse[b.name]) for b in rig.pose.bones}
            transformed=[]
            for i,(points,radius) in enumerate(samples):
                result=np.zeros((len(points),3))
                for k,t in enumerate(parameters):
                    for name,weight in arm_weights(i,float(t)).items():
                        result[k]+=(matrices[name]@points[k])[:3]*weight
                transformed.append((result,radius))
            min_clearance=999;closest=None
            for i in range(8):
                p,r=transformed[i]
                for j in range(i+1,8):
                    q,rr=transformed[j]
                    distance=np.linalg.norm(p[:,None,:]-q[None,:,:],axis=2)-r[:,None]-rr[None,:]
                    value=float(distance.min())
                    if value<min_clearance:min_clearance=value;closest=[i+1,j+1]
            tips=[]
            for i in range(8):
                p=np.array([*spline(ARMS[i],1),1])
                tip=sum(((matrices[n]@p)[:3]*w for n,w in arm_weights(i,1).items()),np.zeros(3))
                tips.append([round(float(x),5) for x in tip])
            tests.append({'frame':int(round(frame)),'minimumArmSurfaceClearance':round(min_clearance,5),'closestArms':closest,'eightDistinctTips':tips})
            assert min_clearance>0,(clip,frame,min_clearance)
        clips.append({'name':clip,'samples':tests,'minimumArmSurfaceClearance':min(t['minimumArmSurfaceClearance'] for t in tests)})
    sums=[sum(g.weight for g in v.groups) for v in obj.data.vertices]
    report={'source':path.name,'inspection':'Actual exported GLB reimported in Blender; imported action/rest/pose matrices used.',
            'meshes':1,'materials':len(obj.data.materials),'bones':len(rig.data.bones),
            'reimportedVertexWeightMaxError':max(abs(s-1) for s in sums),
            'allEightArmBaseAndCurlBonesPresent':all(f'Arm{i+1:02}.{part}' in rig.data.bones for i in range(8) for part in ('base','curl')),
            'independentEyeBones':['Eye.L','Eye.R'],'clips':clips,
            'clearanceScope':'81 centerline/radius samples per arm; 9 imported poses per clip; excludes shared crown t<.28. No pixel-level browser claim.'}
    assert report['reimportedVertexWeightMaxError']<1e-5
    (output/(path.stem+'-reimport-proof.json')).write_text(json.dumps(report,indent=2)+'\n')
    return report


def build(lod,output,blend_path):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mat=material(*atlas(output,2048 if lod=='close' else 1024))
    rig=make_rig();obj,builder=make_mesh(lod,mat,rig);animate(rig)
    bpy.ops.object.select_all(action='DESELECT');rig.select_set(True);obj.select_set(True);bpy.context.view_layer.objects.active=obj
    path=output/f'shop-octopus-{lod}.glb'
    bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_animations=True,
                             export_animation_mode='ACTIONS',export_force_sampling=True,export_extras=True,
                             export_apply=False,export_image_format='AUTO',export_yup=True,export_rest_position_armature=True)
    preserve_png_payloads(path,output,2048 if lod=='close' else 1024)
    report=glb_audit(path)
    assert report['triangles']<=(22000 if lod=='close' else 8000),report
    assert report['bytes']<(3000000 if lod=='close' else 1200000),report
    assert report['draws']==report['materials']==1 and report['bones']<=20,report
    assert len(report['textureImages'])==2 and report['alphaMode']=='OPAQUE',report
    assert report['maxWeightSumError']<1e-5 and report['materialName']=='OctopusSkinMask',report
    assert {a['name'] for a in report['clips']}=={'Idle','Listen','React'},report
    (output/f'{lod}-report.json').write_text(json.dumps(report,indent=2)+'\n')
    anatomy=anatomy_report(builder)
    assert anatomy['minimumNeutralArmClearance']>0,anatomy['minimumNeutralArmClearance']
    assert all(a['nonManifoldEdges']==0 and a['eulerCharacteristic']==2 for a in anatomy['arms'])
    (output/f'{lod}-anatomy.json').write_text(json.dumps(anatomy,indent=2)+'\n')
    if lod=='close':
        bpy.context.scene.frame_set(1);bpy.context.preferences.filepaths.save_version=0
        bpy.ops.wm.save_as_mainfile(filepath=str(blend_path),compress=True)
    print('OCTOPUS_GLTF',json.dumps(report),flush=True)
    verify_reimport(path,output)


def main():
    p=argparse.ArgumentParser(description=__doc__);p.add_argument('--output',type=Path,required=True)
    p.add_argument('--lod',choices=['both','board','close'],default='both');p.add_argument('--blend-output',type=Path)
    args=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    output=args.output.resolve();output.mkdir(parents=True,exist_ok=True)
    for lod in ('board','close') if args.lod=='both' else (args.lod,):build(lod,output,args.blend_output or output/'shop-octopus.blend')


if __name__=='__main__':main()
