"""Author the illustrated sea-turtle Shelly as one skinned, textured runtime mesh.

Run with Python, NumPy, SciPy and Pillow:
    python tools/art/build_crafted_shelly.py --output-dir /tmp/crafted-shelly

Only the animation skeleton and clips come from the original model. All surfaces
and both maps are generated here. The relaxed pose retargets joint pivots and
attachment points while retaining the original rotations and animation timing.
"""
import argparse
from functools import lru_cache
from io import BytesIO
from pathlib import Path

import numpy as np
from PIL import Image
from scipy.interpolate import PchipInterpolator
from scipy.spatial import cKDTree
from scipy.spatial.transform import Rotation

from refine_shelly_mouth import Model

ROOT = Path(__file__).resolve().parents[2]
PI = np.pi
SIN, COS = np.sin, np.cos


def xyz(x, y, z):
    return np.stack(np.broadcast_arrays(x, y, z), axis=-1)


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def mix(a, b, t):
    return a + (np.asarray(b) - a) * np.asarray(t)[..., None]


def unit(p):
    return p / np.maximum(np.linalg.norm(p, axis=-1, keepdims=True), 1e-25)


def wav(x, y, z):
    return (SIN(2.1*x + .6*y + 1.7*z) * COS(1.3*y - .7*z) +
            .48*SIN(4.3*x - 3.7*y + .9*z) +
            .21*COS(7.3*z + 6.5*y - 8.3*x) + .10*SIN(19*x + 14*z)) / 1.79


@lru_cache(maxsize=1)
def seeds():
    rng = np.random.default_rng(831)
    grid = np.stack(np.meshgrid(*([np.arange(-25, 26)] * 3), indexing='ij'), -1).reshape(-1, 3)
    points = grid + rng.uniform(-.39, .39, grid.shape)
    return cKDTree(points), rng.random(len(grid))


def scales(x, y, z):
    tree, tint = seeds()
    p = xyz(x + .12*SIN(y*1.7+z), y+.1*COS(z*1.8-x), z+.12*SIN(x*1.5+y))
    d, i = tree.query(p, k=4)
    gaps = d[...,1:]-d[...,:1]
    # A smooth minimum rounds the triple junctions of neighboring shields.
    edge = -np.log(np.exp(-gaps*13).sum(axis=-1))/13
    interior = smooth(-.013, .100, edge) * smooth(1.03,.75,d[...,0])
    delta=p-tree.data[i[...,0]]
    light=.16*delta[...,1]-.12*delta[...,2] + .11*COS(5*delta[...,0]+2*delta[...,1])
    return interior, tint[i[...,0]]+light, edge


def skin(p, domain, strength=1):
    x, y, z = p.T
    interior, tint, edge = scales(*domain)
    g = wav(x*6, y*6, z*6)
    cell = mix([56,136,137], [145,199,156], .36+.39*g+.66*(tint-.5))
    cell += (6*wav(x*22,y*22,z*22) + 5*smooth(.05,.34,edge))[...,None]
    cell = mix(cell,[175,204,155],.18*np.exp(-((edge-.12)/.066)**2))
    edge_color = mix([148,197,156],[223,220,159], .42+.30*g)
    patterned = mix(edge_color,cell,interior)
    return mix(mix([121,176,145],[170,195,150],.5+.25*g), patterned, strength)


# Each panel is (x, y, width, height) in a 2048-square base-color atlas.
PANELS = {
    'shell':(0,0,1024,1024), 'head':(1024,0,1024,1100),
    'fore':(0,1024,1024,420), 'hind':(0,1444,680,300),
    'belly':(1024,1100,1024,512),
    'eye':(1024,1612,512,410), 'left_eye':(1536,1612,512,410), 'rim':(0,1744,1024,160),
    'tail':(680,1444,344,300)
}


def shell_lines():
    lines = []
    centers = [-.86,-.56,-.23,.15,.48,.85]
    for sign in (-1,1):
        for i,(lo,hi) in enumerate(zip(centers,centers[1:])):
            width = lambda t: .34*(1-.68*t*t)
            a = np.array([sign*width(lo), lo+.025])
            b = np.array([sign*(width((lo+hi)/2)+.092), (lo+hi)/2])
            c = np.array([sign*width(hi),hi+.025])
            lines += [(a,b),(b,c)]
            if i:
                lines += [(np.array([0,lo-.052]),a)]
            by = b[1]-.10+.018*i
            bx = sign*np.sqrt(max(0,.845**2-by**2))
            lines += [(b,np.array([bx,by]))]
    return lines


LINES = shell_lines()


def carapace(u,v,paint):
    a = u*2*PI
    # Equal-angle rather than equal-radius sampling keeps the lip silhouette smooth.
    r = np.sin(v*PI*.5)
    x, z = r*SIN(a), r*COS(a)
    d = np.full_like(u, 2.)
    for start,end in LINES:
        ab = end-start
        t = np.clip(((x-start[0])*ab[0]+(z-start[1])*ab[1]) / np.dot(ab,ab),0,1)
        d = np.minimum(d,np.hypot(x-start[0]-ab[0]*t,z-start[1]-ab[1]*t))
    band = .845+.014*COS(12*a+.36*SIN(3*a))
    inner = d + .005*SIN(14*x+18*z)*SIN(10*z-8*x)
    # Marginal plates follow a scalloped peripheral ring.
    phase = 12*a + .42*SIN(2*a)+.25*SIN(5*a)
    margin_seam = abs(SIN(phase)) / 12 * r
    seam = np.where(r<band,np.minimum(inner,band-r),np.minimum(r-band,margin_seam))
    depth = np.exp(-(seam/.014)**2)
    crest = .02*(1-np.exp(-seam/.058))
    scallop = .017*COS(phase*2)*smooth(.83,1,r)
    p = xyz(.535*x*(1+.10*z)*(1-scallop), .365+.457*np.maximum(0,1-r*r)**.68+
            .075*z+.015*smooth(.80,.90,r)-.006*depth+crest,
            -.235+(.837-.178*smooth(.05,.98,z))*z*(1-scallop))
    if not paint:
        return p
    g = wav(x*4.4,z*4.8,r*3)
    bloom = wav(x*9+g, z*7+g, x*2-z)
    grain = wav(x*31,z*27,3*bloom)
    base = mix([83,95,168],[176,139,196], .54+.49*g+.26*bloom)
    mineral = smooth(.04,.65,bloom+.34*grain)
    base = mix(base,[211,174,195],.55*mineral)
    flecks = wav(x*26+1.7*bloom,z*17+1.4*g,3*grain) + .24*wav(x*64,z*45,g*1.7)
    base = mix(base,[240,193,147],.64*smooth(.17,.78,flecks+.59*bloom))
    base = mix(base,[147,189,191],.39*smooth(.18,.76,-flecks+.33*g))
    base = mix(base,[211,180,177],.31*smooth(.12,.7,g+.42*COS(z*22+x*9))*smooth(.28,.84,r))
    growth = .5+.5*COS(seam*210 + .8*SIN(23*z)+.45*SIN(39*x))
    base += (5*growth*np.exp(-seam/.13)+5.5*grain)[...,None]
    base = mix(base,[211,184,190],.61*np.exp(-((seam-.020)/.008)**2))
    base = mix(base,[83,78,118],.74*np.exp(-(seam/.009)**2))
    return base


def shell_rim(u,v,paint):
    a=u*2*PI
    top=carapace(u,np.ones_like(u),False)
    p=top.copy()
    p[:,0] *= 1-.12*v+.018*SIN(PI*v)
    p[:,2]=-.235+(p[:,2]+.235)*(1-.095*v+.012*SIN(PI*v))
    p[:,1] -= .074*v
    if not paint:
        return p
    phase=12*a+.42*SIN(2*a)+.25*SIN(5*a)
    base=mix([154,139,173],[199,172,160],v*.76+.12*SIN(4*a)**2)
    return mix(base,[107,94,132],.65*np.exp(-(abs(SIN(phase))/.16)**2))


# Continuous sections from the collar through the jaw and crown. Each station
# gives its height, half-width, back and front extent. The final stations turn
# inward over the crown, avoiding a pointed pole.
STATION = [0,.10,.20,.30,.39,.48,.55,.63,.70,.78,.86,.93,1.]
PROFILE = PchipInterpolator(STATION, [
    [.300,.230,.075,.480], [.438,.236,.105,.605], [.545,.208,.163,.644],
    [.650,.181,.216,.677], [.748,.188,.268,.741], [.837,.258,.319,.905],
    [.908,.301,.341,.981], [.978,.318,.341,1.008], [1.055,.322,.342,.978],
    [1.138,.307,.363,.915], [1.208,.248,.425,.837], [1.247,.152,.505,.765],
    [1.263,0,.634,.634]
])


def head_geometry(a,t):
    y,width,back,front = PROFILE(np.clip(t,0,1)).T
    facing=COS(a)
    # Low throat folds continue over the cheeks near the mandibular hinge.
    collar=smooth(.54,.33,t)*smooth(.025,.17,t)
    fold=.0014*collar*COS(2*PI*(9.7*t+.34*facing+.15*COS(2*a)))
    forward=np.maximum(0,facing)
    crease=.970-.026*np.exp(-(a/.25)**2)-.042*(1-np.exp(-(a/.60)**2))+.012*smooth(.54,1.12,abs(a))
    beak=smooth(1.04,.48,abs(a))
    groove=np.exp(-((y-crease)/.011)**2)*beak
    hook=np.exp(-((y-.986)/.082)**2-(a/.39)**2)
    nostril=np.exp(-((abs(a)-.31)/.059)**2-((y-1.035)/.012)**2)
    cheek=np.exp(-((abs(a)-.79)/.32)**2-((y-.945)/.067)**2)
    z=(front+back)/2+(front-back)*facing/2
    z+=(.048*hook-.012*groove-.007*nostril+.014*cheek+fold*facing)*smooth(1,.96,t)
    # A broader cheek and a shorter distance from shell to jaw keep the head
    # silhouette readable from the elevated route camera.
    cheek_width=1+.13*smooth(.34,.54,t)*(1-.25*smooth(.79,.99,t))
    cheek_width+=.035*cheek
    return xyz((width+fold)*SIN(a)*cheek_width, head_height(y), z)


def head_height(y):
    return y-.044*smooth(.48,.91,y)-.095*np.maximum(0,y-.83)


def head(u,v,paint):
    a=(u-.5)*2*PI
    p=head_geometry(a,v)
    if not paint:
        return p
    x,_,z=p.T
    y=PROFILE(v)[:,0]
    facing=COS(a)
    # The larger forehead shields transition to smaller cheek scales, with
    # pigmentation fading where the keratin bill and soft throat begin.
    scale_size=1+.36*np.exp(-((y-.946)/.095)**2)
    crown=smooth(.99,1.20,y)
    scale_contrast=.59-.24*crown
    c=skin(p,(x*13.5*scale_size,(y-1.025)*15.5,(z-.64)*16*scale_size),scale_contrast)
    seafoam=mix([123,181,155],[172,203,169],.53+.32*wav(8*x,9*y,7*z))
    c=mix(c,seafoam,.17+.13*crown)
    mottling=wav(16*x,13*y,12*z)
    throat=smooth(.44,.86,facing)*smooth(.99,.81,y)
    neck_side=smooth(.84,.61,y)
    wrinkle=.5+.5*COS(2*PI*(9.7*v+.34*facing+.15*COS(2*a)))
    neck_color=mix([124,170,143],[186,196,149],.47+.30*mottling+.18*wrinkle)
    c=mix(c,neck_color,neck_side*.61)
    blade=.64+.11*np.exp(-((y-.98)/.068)**2)+.36*smooth(1.00,1.12,y)
    beak=smooth(blade-.105,blade+.075,facing)*smooth(1.143-.075*abs(a),1.077-.075*abs(a),y)
    jaw=smooth(.02,.70,facing)*smooth(.99,.91,y)
    cheek_wash=.60*np.exp(-((abs(a)-.91)/.53)**2-((y-.990)/.079)**2)
    pale=np.maximum.reduce([beak,throat,jaw,cheek_wash])
    grain=wav(31*x,28*y,30*z)
    ivory=mix([213,175,119],[248,224,170],.68+.18*mottling+.09*grain)
    ivory+=((wrinkle-.5)*6*neck_side)[...,None]
    throat_seam=np.exp(-((wrinkle-.03)/.11)**2)*smooth(.18,.69,facing)*neck_side
    ivory=mix(ivory,[169,142,104],.27*throat_seam)
    c=mix(c,ivory,pale)
    crease=.970-.026*np.exp(-(a/.25)**2)-.042*(1-np.exp(-(a/.60)**2))+.012*smooth(.54,1.12,abs(a))
    groove=np.exp(-((y-crease)/.0062)**2)*smooth(1.00,.50,abs(a))
    c=mix(c,[142,101,68],groove*.53)
    nostril=np.sqrt(((abs(a)-.31)/.052)**2+((y-1.035)/.011)**2)
    c=mix(c,[227,191,138],.74*np.exp(-((nostril-1.04)/.33)**2))
    c=mix(c,[92,76,57],smooth(1.08,.35,nostril)*.85)
    return c


def belly(u,v,paint):
    a=u*2*PI
    b=(v-.5)*PI
    r=COS(b)
    p=xyz(.473*r*SIN(a), .366+.216*SIN(b)+.052*r*COS(a),-.215+.733*r*COS(a))
    if not paint:
        return p
    x,y,z=p.T
    seam=np.minimum(abs(x)*1.1,abs(SIN((z+.13*abs(x))*14.2))*.066)
    g=wav(9*x,9*z,4*y)
    c=mix([183,161,122],[235,210,159],.53+.22*g-.20*SIN(b))
    return mix(c,[155,131,103],.59*np.exp(-(seam/.010)**2))


def flipper(u,v,paint,side=1,fore=True):
    a=u*2*PI
    # A foil with a fuller leading edge and a slim, swept point.
    s=v
    width=(.172 if fore else .139)*(np.maximum(0,SIN(PI*s))**.64)*(1.15-.26*s)
    width+=.086*(1-s)**3
    thickness=(.067 if fore else .063)*(np.maximum(0,SIN(PI*s))**.60)+.073*(1-s)**3
    if fore:
        x=.312+.707*s-.072*s*s
        z=.223+.162*s+.196*s*s
        height=.455-.477*s+.112*s*s
        dx,dz=.707-.144*s,.162+.392*s
    else:
        x=.306+.327*s
        z=-.480-.367*s-.031*s*s
        height=.293-.281*s+.078*s*s
        dx,dz=np.full_like(s,.327),-.367-.062*s
    length=np.hypot(dx,dz)
    w=width*COS(a)*(1-.09*COS(a))
    p=xyz(side*(x+w*dz/length),height+thickness*SIN(a)-.38*w*(.45+s),
          z-w*dx/length)
    if not paint:
        return p
    c=skin(p,(s*(7.4 if fore else 5.8),COS(a)*(2.5 if fore else 1.8),SIN(a)*1.12))
    tip=smooth(.69,1,s)*.35 + smooth(.65,1,abs(COS(a)))*.28
    c=mix(c,[185,203,147],tip)
    under=smooth(.38,-.45,SIN(a))
    g=wav(s*6,COS(a)*2,1)
    c=mix(c,mix([191,174,121],[230,210,150],.59+.23*g),under*.96)
    return c


def tail(u,v,paint):
    a=2*PI*u
    p=xyz(.068*(1-v)*SIN(a),.255-.053*v+.052*(1-v)*COS(a),-.791-.179*v)
    if not paint:
        return p
    return skin(p,(p[:,0]*25,p[:,1]*17,p[:,2]*20))


EYE_ANGLE=.72
EYE_HEIGHT=.772


def eye_center(side):
    return head_geometry(np.array([side*EYE_ANGLE]),np.array([EYE_HEIGHT]))[0]


def eye(u,v,paint,side=1):
    angle=(u-.5)*2*PI
    ex,ey=v*COS(angle),v*SIN(angle)
    a=side*(EYE_ANGLE+.535*ex)
    t=EYE_HEIGHT+.126*ey
    if not paint:
        # The pupil sits on a convex cornea whose axis bisects the front and
        # elevated camera directions. The orbit flows back into the curved head.
        axis=unit(np.array([.36,.706,.616]))
        horizontal=unit(np.cross([0,1,0],axis))
        vertical=unit(np.cross(axis,horizontal))
        axis[0]*=side
        horizontal[0]*=side
        vertical[0]*=side
        surface=head_geometry(a,t)
        base=eye_center(side)+(.153*ex)[:,None]*horizontal+(.149*ey)[:,None]*vertical
        depth=.047*np.maximum(0,1-(v/.86)**2)**1.37
        lid=.008*np.exp(-((v-.795)/.112)**2)*(1+.66*SIN(angle))
        raised=base+(depth+lid+.0035)[:,None]*axis
        return mix(raised,surface-.004*axis,smooth(.69,1,v))

    # A deep aubergine limbus, translucent-colored iris fibers and restrained
    # corneal highlights stay legible under the game's small, moving camera.
    pupil=np.hypot(ex+.035,ey-.013)
    ang=np.arctan2(ey-.013,ex+.035)
    fiber=(SIN(51*ang+.8*SIN(11*ang))*SIN(8*ang-12*pupil)+.6*COS(83*ang+pupil*35))/1.6
    gradient=np.clip(.47-.99*ey+.12*fiber,0,1)
    iris=mix([63,43,68],[180,112,123],gradient)
    iris=mix(iris,[222,162,99],.47*smooth(.03,-.60,ey)*smooth(.36,.55,pupil))
    c=mix(iris,[29,29,40],smooth(.465,.439,pupil))
    aperture=v+.049*smooth(.06,.67,ey)
    c=mix(c,[57,45,57],smooth(.61,.684,aperture))
    c=mix(c,[189,161,120],smooth(.694,.729,aperture))
    rim=mix([140,172,145],[196,199,148],.46+.48*ey+.06*COS(8*angle))
    c=mix(c,rim,smooth(.725,.785,aperture))
    skin_color=head(.5+a/(2*PI),t,True)
    c=mix(c,skin_color,smooth(.79,.96,v))
    upper=smooth(.05,.66,ey)*np.exp(-((v-.852)/.045)**2)
    c=mix(c,[120,154,128],upper*.19)
    c=mix(c,[252,247,227],smooth(1.12,.70,np.hypot((ex+.18*side)/.132,(ey-.241)/.134)))
    c=mix(c,[225,225,211],smooth(.037,.017,np.hypot(ex-.26*side,ey+.29))*.78)
    return c


SURFACES = dict(shell=carapace,head=head,fore=flipper,
                hind=lambda u,v,paint:flipper(u,v,paint,fore=False),
                belly=belly,eye=eye,left_eye=lambda u,v,paint:eye(u,v,paint,-1),
                rim=shell_rim,tail=tail)


def bake(size):
    img=Image.new('RGB',(size,size),(157,172,150))
    rough=Image.new('RGB',(512,512),(255,190,0))
    for name,(x,y,w,h) in PANELS.items():
        x,y,w,h=[round(i*size/2048) for i in (x,y,w,h)]
        # Clamp extension under the guard band protects islands during mipmapping.
        guard=max(2,round(4*size/2048))
        u=np.clip((np.arange(w)+.5-guard)/(w-2*guard),0,1)
        colors=[]
        for row in range(0,h,32):
            v=np.clip((np.arange(row,min(row+32,h))+.5-guard)/(h-2*guard),0,1)
            uu,vv=np.meshgrid(u,v)
            col=SURFACES[name](uu.ravel(),vv.ravel(),True)
            colors.append(np.clip(col,0,255).astype('u1').reshape(len(v),w,3))
        img.paste(Image.fromarray(np.concatenate(colors)),(x,y))
        # The cornea catches light while the eyelid and all shell plates are matte.
        if name in ('eye','left_eye'):
            xx,yy,ww,hh=[round(i*512/size) for i in (x,y,w,h)]
            vv=np.broadcast_to((np.arange(hh)[:,None]+.5)/hh,(hh,ww))
            green=103+87*smooth(.65,.80,vv)
            rough.paste(Image.fromarray(xyz(255,green,0).astype('u1')),(xx,yy))
    color_io,rm_io=BytesIO(),BytesIO()
    img.save(color_io,format='JPEG',quality=92,subsampling=0,optimize=True)
    rough.save(rm_io,format='PNG',optimize=True)
    return {0:color_io.getvalue(),1:rm_io.getvalue()}


def joint_transforms(model):
    doc=model.doc
    nodes=doc['nodes']
    skin=doc['skins'][0]
    names={n['name']:i for i,n in enumerate(nodes)}
    targets={'Head':(0,float(head_height(.857)),.497),'Neck':(0,float(head_height(.53)),.234),
             'HatAnchor':(0,float(head_height(1.263))+.003,.634),'MouthAnchor':(0,float(head_height(.945)),1.027),
             'Tail':(0,.255,-.79)}
    for side,suffix in [(-1,'L'),(1,'R')]:
        targets['Eye'+suffix]=eye_center(side).tolist()
        targets['FlipperF'+suffix]=(side*.312,.455,.223)
        targets['FlipperR'+suffix]=(side*.306,.293,-.480)
    matrices={}
    offsets={}
    def visit(i,parent):
        node=nodes[i]
        local=np.eye(4)
        local[:3,:3]=(Rotation.from_quat(node.get('rotation',[0,0,0,1])).as_matrix()
                      @np.diag(node.get('scale',[1,1,1])))
        old=np.asarray(node.get('translation',[0,0,0]))
        local[:3,3]=old
        if node['name'] in targets:
            new=(np.linalg.inv(parent)@[*targets[node['name']],1])[:3]
            offsets[i]=new-old
            node['translation']=new.tolist()
            local[:3,3]=new
        matrices[i]=parent@local
        for child in node.get('children',[]):
            visit(child,matrices[i])
    visit(names['ShellyRig'],np.eye(4))
    replacements={skin['inverseBindMatrices']:np.array(
        [np.linalg.inv(matrices[i]).T.ravel() for i in skin['joints']])}
    for anim in doc['animations']:
        for ch in anim['channels']:
            target=ch['target']
            if target['path']=='translation' and target['node'] in offsets:
                acc=anim['samplers'][ch['sampler']]['output']
                value=model.array(acc)+offsets[target['node']]
                if acc in replacements and not np.allclose(replacements[acc],value):
                    raise ValueError('Shared animation samples have conflicting offsets')
                replacements[acc]=value
    return replacements, {nodes[i]['name']:j for j,i in enumerate(skin['joints'])}


def build(source,dest,maps,low):
    model=Model(source)
    arrays,bones=joint_transforms(model)
    positions,normals,texcoords,joints,weights,faces=[],[],[],[],[],[]
    def surface(name,fn,rows,cols,joint,second=None,blend=None,reverse=False):
        if low:
            rows=max(5,round(rows*.70))
            cols=max(8,round(cols*.70))
        u,v=np.meshgrid(np.linspace(0,1,cols+1),np.linspace(0,1,rows+1))
        u,v=u.ravel(),v.ravel()
        p=fn(u,v,False)
        delta=.00015
        v_safe=np.clip(v,delta*2,1-delta*2)
        du=fn(u+delta,v_safe,False)-fn(u-delta,v_safe,False)
        dv=fn(u,v_safe+delta,False)-fn(u,v_safe-delta,False)
        normals.append(unit(np.cross(du,dv))*(-1 if reverse else 1))
        ids=np.arange(len(p)).reshape(rows+1,cols+1)+sum(map(len,positions))
        a,b,c,d=ids[:-1,:-1],ids[:-1,1:],ids[1:,:-1],ids[1:,1:]
        tri=np.stack((a,b,c,b,d,c),axis=-1).reshape(-1,3)
        faces.append(tri[:,::-1] if reverse else tri)
        positions.append(p)
        x,y,w,h=PANELS[name]
        texcoords.append(np.stack(((x+4+u*(w-8))/2048,(y+4+v*(h-8))/2048),axis=-1))
        factor=np.zeros_like(v) if blend is None else blend(v)
        joints.append(xyz(bones[joint]+v*0,bones[second or joint]+v*0,v*0))
        weights.append(xyz(1-factor,factor,0*v))

    surface('shell',carapace,32,96,'Body',reverse=True)
    surface('rim',shell_rim,4,96,'Body',reverse=True)
    surface('belly',belly,15,48,'Body')
    surface('head',head,54,72,'Neck','Head',lambda v:smooth(.19,.51,v))
    for side,suffix in [(-1,'L'),(1,'R')]:
        for fore,name in [(True,'fore'),(False,'hind')]:
            def paddle(u,v,p,fore=fore,side=side):
                return flipper(u,v,p,side,fore)
            # Circumferential u runs from the leading edge toward the upper face.
            surface(name,paddle,24 if fore else 16,28,'Flipper'+('F' if fore else 'R')+suffix,
                    'Body',lambda v:.90*(1-smooth(0,.24,v)),reverse=(side==-1))
        def lens(u,v,p,side=side):
            return eye(u,v,p,side)
        surface('left_eye' if side==-1 else 'eye',lens,14,46,'Eye'+suffix,'Head',lambda v:smooth(.69,.85,v),reverse=(side==1))
    surface('tail',tail,8,20,'Tail',reverse=False)
    a=model.attributes
    for key,data in [('POSITION',positions),('NORMAL',normals),('TEXCOORD_0',texcoords)]:
        arrays[a[key]]=np.concatenate(data)
    for key,data in [('JOINTS_0',joints),('WEIGHTS_0',weights)]:
        arr=np.concatenate(data)
        arrays[a[key]]=np.column_stack((arr,np.zeros(len(arr))))
    f=np.concatenate(faces)
    # Collapse zero-area triangles on organic tips and parametric poles.
    pp=arrays[a['POSITION']].astype('f4').astype('f8')[f]
    valid=np.linalg.norm(np.cross(pp[:,1]-pp[:,0],pp[:,2]-pp[:,0]),axis=-1)>1e-11
    arrays[model.primitive['indices']]=f[valid].reshape(-1,1)
    doc=model.doc
    doc['asset']['generator']='Coral Classroom | crafted Shelly authoring mesh and retained Blender rig'
    mat=doc['materials'][0]
    mat.update(name='Shelly | seafoam skin and lavender carapace',emissiveFactor=[.025]*3)
    mat['pbrMetallicRoughness'].update(metallicFactor=0,roughnessFactor=1)
    doc['meshes'][0]['name']='Shelly | crafted sea turtle'
    next(n for n in doc['nodes'] if 'mesh' in n)['name']='Shelly | crafted sea turtle'
    doc['images'][0]['name']='Shelly | hand-patterned scales and scutes'
    doc['images'][1]['name']='Shelly | matte scutes and cornea roughness'
    model.write(dest,arrays,maps)
    print(f'{dest.name}: {np.sum(valid)} triangles, {dest.stat().st_size:,} bytes',flush=True)


def main():
    parser=argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output-dir',required=True,type=Path)
    args=parser.parse_args()
    args.output_dir.mkdir(parents=True,exist_ok=True)
    for low,name in [(True,'shelly-view'),(False,'shelly')]:
        maps=bake(1024 if low else 2048)
        build(ROOT/'assets/models'/f'{name}.glb',args.output_dir/f'crafted-{name}.glb',maps,low)


if __name__=='__main__':
    main()
