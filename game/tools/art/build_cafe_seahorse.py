"""Build the editable café seahorse and its two skinned glTF levels.

blender -b --factory-startup --python tools/art/build_cafe_seahorse.py -- \
  --output /workspace/work/cafe-production
"""

import argparse
import json
import math
import struct
import sys
import zlib
from pathlib import Path

import bpy
import numpy as np
from mathutils import Quaternion, Vector

TAU = math.tau
Z = Vector((0, 0, 1))
X = Vector((1, 0, 0))
YAW = math.radians(-34)
YAW_ROTATION = Quaternion(Z, YAW)

# (x, y, width, height) measured from the lower-left corner of a 1024 atlas.
ATLAS = {
    'body': (0, 0, 486, 1024),
    'head': (486, 0, 538, 336),
    'cloth': (486, 336, 284, 308),
    'fin': (770, 336, 254, 298),
    'eye': (486, 644, 172, 196),
    'orbit': (658, 644, 160, 196),
    'badge': (818, 634, 206, 206),
    'strap': (486, 840, 240, 84),
    'pocket': (726, 840, 184, 184),
    'crest': (910, 840, 114, 184),
    'gold': (486, 924, 80, 100),
}


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


# The armor cross-sections of the neck, abdomen and corkscrew tail share a surface.
BODY = [
    (.040, 2.66, .16, .17),
    (.140, 2.52, .265, .242),
    (.201, 2.35, .266, .235),
    (.206, 2.16, .237, .213),
    (.145, 1.976, .250, .231),
    (.040, 1.795, .319, .303),
    (-.030, 1.590, .385, .389),
    (-.016, 1.369, .369, .355),
    (.072, 1.155, .292, .286),
    (.202, .961, .208, .223),
    (.344, .785, .150, .164),
    (.456, .602, .125, .130),
    (.482, .388, .107, .111),
    (.397, .180, .096, .100),
    (.216, .072, .087, .093),
    (.024, .089, .078, .084),
    (-.118, .215, .071, .075),
    (-.132, .374, .063, .065),
    (-.041, .508, .055, .058),
    (.101, .529, .047, .052),
    (.208, .443, .040, .044),
    (.228, .337, .034, .038),
    (.154, .268, .028, .030),
    (.084, .297, .018, .022),
    (.079, .354, .010, .013),
    (.117, .371, .001, .001),
]

HEAD = [
    (.290, 2.520, .025, .032),
    (.248, 2.574, .201, .199),
    (.161, 2.609, .318, .294),
    (.034, 2.614, .371, .306),
    (-.102, 2.590, .379, .286),
    (-.246, 2.548, .343, .247),
    (-.387, 2.483, .263, .185),
    (-.509, 2.422, .187, .130),
    (-.661, 2.391, .124, .095),
    (-.818, 2.363, .096, .081),
    (-.944, 2.340, .089, .081),
    (-1.017, 2.328, .101, .094),
    (-1.062, 2.323, .097, .092),
    (-1.081, 2.323, .071, .071),
    (-1.066, 2.324, .051, .053),
    (-.998, 2.333, .047, .043),
    (-.946, 2.342, .020, .017),
    (-.938, 2.343, .001, .001),
]


def body_frame(v):
    station = v*(len(BODY)-1)
    y, z, width, depth = curve(BODY, station)
    before = curve(BODY, station-.012)
    after = curve(BODY, station+.012)
    dy, dz = after[0]-before[0], after[1]-before[1]
    normal = Vector((0, dz, -dy)).normalized()
    return Vector((0,y,z)), normal, width, depth


def body_surface(u, v, extra=0, plated=1):
    center, normal, width, depth = body_frame(v)
    a = TAU*u
    scute = math.cos(TAU*(v*25-.13*math.cos(a*3)))
    column = (0.5 + 0.5*math.cos(a*6))**5 * (0.75-.25*math.cos(a))
    seam = (.5+.5*scute)**5
    profile = 1 + plated*(.040*scute + .054*seam + .043*column + .038*column*seam)
    profile *= 1 + .016*math.sin(a*2 + v*10)
    return center + X*(math.sin(a)*(width*profile+extra)) + normal*(math.cos(a)*(depth*profile+extra))


def head_surface(u, v):
    y, z, width, height = curve(HEAD, v*(len(HEAD)-1))
    y += max(0,-y-.338)*.218
    a = TAU*u
    accent = .016*math.cos(a*5)*math.sin(math.pi*v)
    return Vector((math.sin(a)*width*(1+accent), y, z+math.cos(a)*height))


def eye_axes(side):
    center = Vector((side*.218, -.265, 2.602))
    normal = Vector((side*.704, -.708, .058)).normalized()
    horizontal = Z.cross(normal).normalized()
    vertical = normal.cross(horizontal)
    return center, horizontal, vertical, normal


def eye_point(side, u, v):
    c, h, w, n = eye_axes(side)
    phi, theta = math.pi*v, TAU*u
    direction = .148*(math.sin(phi)*(math.cos(theta)*h+math.sin(theta)*w) + .56*math.cos(phi)*n)
    return c + Quaternion(Z,math.radians(5-side*37)) @ direction


def upper_orbit_point(side, u, v):
    c, h, w, n = eye_axes(side)
    theta = (u-.5)*math.radians(163)
    # The upper orbital margin arches over the globe.
    end = math.radians(52-9*(abs(theta)/1.423)**1.6)
    phi = lerp(math.radians(-102), end, v)
    return c + .153*math.sin(theta)*h + math.cos(theta)*(
        .153*math.cos(phi)*w + .092*math.sin(phi)*n
    )


def socket_point(side, u, v):
    c, h, w, n = eye_axes(side)
    a = TAU*u
    x, y = math.cos(a), math.sin(a)
    sizes = curve([
        (.144, .134, .016), (.154, .145, .015), (.166, .157, .005),
        (.184, .174, -.026), (.196, .186, -.068)
    ], v*4)
    return c + h*(sizes[0]*x) + w*(sizes[1]*y) + n*(sizes[2]+.012*y)


def apron_width(v):
    return curve([(.119,),(.125,),(.136,),(.165,),(.204,),(.218,)], v*5)[0]


def apron_point(u, v, extra=0):
    angle = (2*u-1)*apron_width(v)
    corner = abs(2*u-1)**4
    body_t = lerp(.204,.336,v) - .012*math.sin(math.pi*v)*corner - .022*v**8*corner
    center = (math.sin(math.pi*u)*math.sin(math.pi*v))**.64
    bulk = .014 + center*(.026 + .008*math.sin(TAU*(u*1.53+v*.42)))
    return body_surface(angle,body_t,bulk+extra,plated=1-.72*center)


def pocket_point(u, v):
    # The edges tuck back onto the apron rather than floating above it.
    corner = abs(2*u-1)**5
    at_u = lerp(.18,.82,u) + .058*(1-2*u)*v**4
    at_v = lerp(.468,.869,v) - .071*v**5*corner
    puff = .004+.019*math.sin(math.pi*u)*math.sin(math.pi*v)
    return apron_point(at_u,at_v,puff)


def strap_point(u, v, waist=False):
    front = (.5+.5*math.cos(TAU*u))
    if waist:
        body_t = .273 + (v-.5)*.018 + .003*math.cos(TAU*u)
        return body_surface(u,body_t,.022+.044*front**2,plated=.72)
    body_t = .183 + (v-.5)*.020 + .024*(.5+.5*math.cos(TAU*u))**3
    return body_surface(u,body_t,.024,plated=.79)


DORSAL_RAIL = [
    (.315,1.94,.365,1.96),
    (.339,1.875,.608,2.025),
    (.369,1.783,.806,1.94),
    (.381,1.696,.918,1.794),
    (.392,1.611,.959,1.631),
    (.404,1.527,.946,1.468),
    (.405,1.440,.897,1.308),
    (.393,1.365,.802,1.175),
    (.385,1.297,.635,1.087),
    (.371,1.273,.369,1.269),
]


def dorsal_point(u, v, side):
    y,z, outer_y,outer_z = curve(DORSAL_RAIL,u*(len(DORSAL_RAIL)-1))
    scallop = (.966+.034*math.cos(TAU*(u*10.5+.05)))
    extent = v*scallop
    ray = (.5+.5*math.cos(TAU*(u*10.5+.05)))**7
    thickness = (.052*(1-v)**3+.010 + ray*.011)*math.sin(math.pi*(u*.98+.01))**.45
    return Vector((side*thickness + .034*v*math.sin(TAU*(u*2.6+.12)),
                   lerp(y,outer_y,extent),lerp(z,outer_z,extent)))


def pectoral_point(u, v, side):
    left = side
    a = lerp(.35,-1.02,u)
    scallop = .964+.036*math.cos(TAU*u*6)
    x = left*(.193 + v*.225*math.cos(a)*scallop + .037*u)
    y = .090+ v*(.196+.105*math.sin(a))*scallop
    z = 2.361 + .087*u + v*.151*math.sin(a)*scallop
    return Vector((x,y,z))


# Sagittal crest web spans the neck and head with hand-shaped crown teeth.
CREST = [
    (-.320,2.733,-.324,2.737,.028),
    (-.303,2.852,-.267,2.965,.103),
    (-.218,2.885,-.184,2.941,.132),
    (-.176,2.898,-.160,3.087,.147),
    (-.095,2.907,-.056,3.006,.164),
    (.002,2.903,.022,3.126,.158),
    (.083,2.890,.103,3.020,.150),
    (.148,2.867,.213,3.087,.140),
    (.214,2.819,.256,2.963,.110),
    (.249,2.757,.354,2.973,.090),
    (.277,2.691,.345,2.828,.081),
    (.297,2.608,.422,2.851,.088),
    (.308,2.538,.398,2.685,.090),
    (.329,2.468,.466,2.665,.091),
    (.349,2.385,.422,2.505,.130),
    (.376,2.309,.493,2.467,.154),
    (.393,2.234,.450,2.333,.119),
    (.396,2.154,.492,2.294,.125),
    (.379,2.070,.419,2.147,.090),
    (.337,2.016,.360,2.044,.063),
]


def crest_point(u, v, side):
    by,bz,ty,tz,width = curve(CREST,u*(len(CREST)-1))
    cap = .010 + .012*math.sin(math.pi*v)+.008*math.sin(math.pi*u)
    tz -= max(0,tz-bz)*.23
    by -= .039
    bz -= .065*(1-ease(.42,.76,u))
    if u<.58:
        lo,hi = 0,9
        for step in range(16):
            mid = (lo+hi)/2
            y,z,w,h = curve(HEAD,mid)
            if y + max(0,-y-.338)*.218 > by:
                lo = mid
            else:
                hi = mid
        head_z = z+h*math.sqrt(max(0,1-((cap+width*.76)/w)**2))
        bz = lerp(min(bz,head_z-.028),bz,ease(.50,.58,u))
    return Vector((side*(cap+width*.76*(1-v)**1.3), lerp(by,ty,v), lerp(bz,tz,v)))


def cheek_point(u, v, side):
    # Side scutes continue behind each orbit into the neck armor.
    a = lerp(.65,-1.74,u)
    flare = .53+.47*(.5+.5*math.cos(TAU*(u*3.2+.12)))**1.5
    x = side*(.229 + .102*math.sin(math.pi*v*.78) + .029*math.cos(a)*v)
    y = -.028 + .023*math.cos(a) + .217*v*flare*math.cos(a)
    z = 2.569+.093*math.sin(a)+.113*v*flare*math.sin(a)
    return Vector((x,y,z))


def badge_frame():
    h = Vector((.793,.609,0))
    n = h.cross(Z)
    return apron_point(.64,.125,.025),h,n


def badge_point(u, v):
    c,h,n = badge_frame()
    r = v*.130
    a = TAU*u
    return c+ h*(r*math.cos(a)) + Z*(.95*r*math.sin(a)) + n*(.022+.010*(1-v*v))


def badge_edge(u, v):
    c,h,n = badge_frame()
    a,b = TAU*u, TAU*v
    r = .121+.0105*math.cos(b)
    return c+h*(r*math.cos(a))+Z*(.95*r*math.sin(a))+n*(.024+.0105*math.sin(b))


def rivet_point(c, h, n, u, v, radius):
    a,b = TAU*u, math.pi*v
    return c+radius*math.sin(b)*(h*math.cos(a)+Z*math.sin(a))+radius*.68*math.cos(b)*n


def atlas_uv(tile, u, v):
    x,y,w,h = ATLAS[tile]
    return ((x+4+u*(w-8))/1024,(y+4+v*(h-8))/1024)


class MeshBuilder:
    def __init__(self):
        self.vertices = []
        self.faces = []
        self.uvs = []
        self.weights = []

    def grid(self, fn, n, m, tile, weights, *, wrap=False, wrap_v=False, reverse=False, uv=None):
        offset = len(self.vertices)
        rows, columns = m+(not wrap_v), n+(not wrap)
        for j in range(rows):
            v = j/m
            for i in range(columns):
                u = i/n
                p = fn(u,v)
                self.vertices.append(YAW_ROTATION @ p + Vector((0,0,.022)))
                self.weights.append(weights(p,u,v) if callable(weights) else {weights: 1.0})
        for j in range(m):
            for i in range(n):
                jc,jn = j,(j+1)%rows
                ic, inn = i,(i+1)%columns
                ids = (offset+jc*columns+ic,offset+jc*columns+inn,offset+jn*columns+inn,offset+jn*columns+ic)
                tuv = ((i/n,j/m),((i+1)/n,j/m),((i+1)/n,(j+1)/m),(i/n,(j+1)/m))
                coords = tuple(atlas_uv(tile,*(uv(*t) if uv else t)) for t in tuv)
                self.faces.append(ids[::-1] if reverse else ids)
                self.uvs.extend(coords[::-1] if reverse else coords)

    def loft_cap(self, fn, sides, v, tile, weight, reverse=False):
        """Close the small hidden end rings of a loft."""
        ring = [fn(i/sides,v) for i in range(sides)]
        p = sum(ring, Vector())/sides
        offset = len(self.vertices)
        self.vertices.extend(YAW_ROTATION @ p+Vector((0,0,.022)) for p in (p,*ring))
        self.weights.extend({weight:1.0} for p in (p,*ring))
        for i in range(sides):
            ids = (offset,offset+i+1,offset+((i+1)%sides)+1)
            self.faces.append(ids[::-1] if reverse else ids)
            self.uvs.extend(atlas_uv(tile,.55,v) for i in ids)

    def create(self, mat, rig):
        mesh = bpy.data.meshes.new('Café seahorse sculpt')
        mesh.from_pydata(self.vertices,[],self.faces)
        mesh.update()
        uv_layer = mesh.uv_layers.new(name='Painted atlas UV')
        uv_layer.data.foreach_set('uv',np.ravel(self.uvs))
        mesh.polygons.foreach_set('use_smooth',[True]*len(mesh.polygons))
        mesh.materials.append(mat)
        obj = bpy.data.objects.new('Café seahorse',mesh)
        bpy.context.collection.objects.link(obj)
        obj.parent = rig
        groups = {bone.name:obj.vertex_groups.new(name=bone.name) for bone in rig.data.bones}
        for i, weights in enumerate(self.weights):
            for name,value in weights.items():
                if value>.001:
                    groups[name].add([i],value,'REPLACE')
        armature = obj.modifiers.new('Flexible seahorse skeleton','ARMATURE')
        armature.object = rig
        return obj


def trunk_weights(p,u,v):
    if v<.211:
        neck = 1-ease(.101,.211,v)
        head = 1-ease(.004,.088,v)
        return {'Body':1-neck,'Neck':neck-head,'Head':head}
    base = ease(.332,.492,v)
    curl = ease(.515,.689,v)
    return {'Body':1-base,'Tail base':base-curl,'Tail curl':curl}


def crest_weights(p,u,v):
    neck = ease(.62,.94,u)
    return {'Head':1-neck,'Neck':neck}


def make_mesh(lod, material, rig):
    b = MeshBuilder()
    close = lod=='close'
    scale = lambda board,near: near if close else board
    b.grid(body_surface,scale(16,24),scale(74,122),'body',trunk_weights,wrap=True,reverse=True)
    b.loft_cap(body_surface,scale(16,24),0,'body','Head',True)
    b.loft_cap(body_surface,scale(16,24),1,'body','Tail curl')
    b.grid(head_surface,scale(20,32),scale(32,59),'head','Head',wrap=True,reverse=True)
    b.loft_cap(head_surface,scale(20,32),0,'head','Head',True)
    b.loft_cap(head_surface,scale(20,32),1,'head','Head')

    for side,suffix in ((-1,'L'),(1,'R')):
        eye = lambda u,v: eye_point(side,u,lerp(.002,.998,v))
        b.grid(eye,scale(18,25),scale(11,18),'eye','Eye.'+suffix,wrap=True,reverse=True)
        b.grid(lambda u,v: socket_point(side,u,v),scale(18,26),scale(4,7),'orbit','Head',
               wrap=True,reverse=True,uv=lambda u,v:(u,.76-.73*v))
        b.grid(lambda u,v: upper_orbit_point(side,u,v),scale(14,21),scale(5,9),'orbit','Head',
               reverse=True)
        b.grid(lambda u,v: cheek_point(u,v,side),scale(18,26),scale(3,5),'crest','Head',
               reverse=side<0)
        b.grid(lambda u,v: pectoral_point(u,v,side),scale(13,20),scale(4,6),'fin','Pectoral.'+suffix,
               reverse=side>0,uv=lambda u,v:(u,.11+.83*v))
        b.grid(lambda u,v: crest_point(u,v,side),scale(40,69),scale(3,5),'crest',crest_weights,
               reverse=side<0)
        b.grid(lambda u,v: dorsal_point(u,v,side),scale(25,42),scale(3,7),'fin','Dorsal fin',
               reverse=side<0)

    # Join the fin and crest edge surfaces with thin rounding.
    for fn,n,weight,tile in (
        (dorsal_point,scale(25,42),'Dorsal fin','fin'),
        (crest_point,scale(40,69),crest_weights,'crest'),
    ):
        b.grid(lambda u,v: fn(u,.999,-1).lerp(fn(u,.999,1),v),n,1,tile,weight,
               uv=lambda u,v:(u,.97+.025*v))

    b.grid(apron_point,scale(13,23),scale(14,26),'cloth','Body',reverse=True)
    b.grid(pocket_point,scale(9,18),scale(8,15),'pocket','Body',reverse=True)
    for waist in (False,True):
        b.grid(lambda u,v: strap_point(u,v,waist),scale(24,34),scale(3,5),'strap','Body',
               wrap=True,reverse=True)
    b.grid(badge_point,scale(23,35),scale(4,8),'badge','Body',
           wrap=True,reverse=True,uv=lambda u,v:(.5+.5*v*math.cos(TAU*u),.5+.5*v*math.sin(TAU*u)))
    b.grid(badge_edge,scale(23,35),scale(5,7),'gold','Body',wrap=True,wrap_v=True)
    for u,v in ((.16,.11),(.84,.11),(.15,.57),(.85,.57)):
        c = apron_point(u,v,.008)
        normal = Vector((lerp(-.34,.34,u*1.4-.2),-.94,.015)).normalized()
        hor = Z.cross(normal)
        b.grid(lambda u,v: rivet_point(c,hor,normal,u,v,.023),scale(8,12),scale(4,6),
               'gold','Body',wrap=True,reverse=True)
    return b.create(material,rig)


def tint(a,b,t):
    return np.asarray(a)[None,None,:]+np.asarray(t)[...,None]*(np.asarray(b)-np.asarray(a))


def paint(base,color,alpha):
    return base+(np.asarray(color)-base)*np.clip(alpha,0,1)[...,None]


def cloud(u,v):
    a,b = u*TAU,v*TAU
    return (.45*np.sin(7*a+11*b+.6*np.cos(3*b))+
            .32*np.sin(19*a-13*b+np.sin(17*a+8*b))+
            .23*np.sin(33*a+39*b+.7*np.cos(17*a)))


def pores(u,v,tile,seed,count,radius):
    rng = np.random.default_rng(seed)
    # Splat in atlas space so mottling keeps the same scale in both LODs.
    result = np.zeros_like(u,dtype='float32')
    tall,wide = u.shape
    for i in range(count):
        cx,cy = rng.random(2)
        size = radius*rng.uniform(.41,1.37)
        sx,sy = size/max(.5,tile[2]/486),size/max(.5,tile[3]/486)
        x,y = round((wide-8)*cx+4),round((tall-8)*cy+4)
        rx,ry = math.ceil(sx*wide*2),math.ceil(sy*tall*2)
        ys = slice(max(0,y-ry),min(tall,y+ry+1))
        xs = slice(max(0,x-rx),min(wide,x+rx+1))
        d = ((u[ys,xs]-cx)/sx)**2+((v[ys,xs]-cy)/sy)**2
        result[ys,xs] += np.exp(-d)*rng.uniform(.32,1)
    return np.clip(result,0,1)


def painted_skin(tile,u,v,head=False):
    a = TAU*u
    chroma = cloud(u,v)
    pore = pores(u,v,tile,47 if head else 38,1300 if head else 2300,.0032 if head else .0026)
    if head:
        freckles = pores(u,v,tile,707,355,.0060)
        upper = .5+.5*np.cos(a)
        nose = np.clip((v-.35)/.28,0,1)
        result = tint((224,137,103),(251,197,143),.22+.49*upper+.24*nose-.057*chroma)
        result = paint(result,(252,212,166),(.5-.5*np.cos(a))*(.16+.39*nose))
        fine = .045*(.5+.5*np.cos(12*a+12*v))**8*(1-nose)**2
        result = paint(result,(254,207,157),fine)
        result = paint(result,(155,65,43),pore*(.46-.23*nose)+freckles*(.52-.27*nose))
        mouth = np.clip((v-.805)/.146,0,1)**.55
        result = paint(result,(85,39,31),mouth*.97)
        roll = np.exp(-((v-.731)/.031)**2)
        result = paint(result,(255,223,171),roll*.36)
        return result,.58-.13*roll+.08*pore,np.zeros_like(u)
    phase = TAU*(v*25-.13*np.cos(a*3))
    plate = .5+.5*np.cos(phase)
    ridge = plate**13
    column = (.5+.5*np.cos(a*6))**15
    vanilla = (.5+.5*np.cos(a))**2
    result = tint((210,113,96),(246,186,129),.25+.62*vanilla+.13*chroma)
    blush = (.5-.5*np.cos(a))*(.34+.15*chroma)*(1-ridge*.8)
    result = paint(result,(190,92,80),blush)
    result = paint(result,(255,200,137),.68*ridge+.36*column)
    result = paint(result,(252,222,168),.33*ridge*column)
    result = paint(result,(148,62,50),pore*(.28+.23*(1-vanilla))*(1-ridge*.6))
    etched = .5+.5*np.sin(TAU*(83*u+67*v)+.7*np.sin(78*v))
    result = paint(result,(255,209,164),.09*etched*(1-ridge))
    return result,.60-.18*ridge+.10*pore,np.zeros_like(u)


def interrupted_stitch(x,y,edge):
    pulse = np.clip((np.cos(TAU*x)-.22)*3,0,1)
    return np.exp(-(y/edge)**2)*pulse


def linen(name,u,v):
    wrinkle = cloud(u*.46,v*.91)*.08 + .07*np.sin(TAU*(u*2.3+v*.73))
    weave = .028*np.sin(224*u*TAU+1.7*np.sin(91*v*TAU))+.029*np.sin(188*v*TAU+1.2*np.sin(51*u*TAU))
    base = tint((203,162,117),(250,229,195),.74+wrinkle+weave)
    if name=='strap':
        edge_dist = np.abs(v-.5)
        seam = interrupted_stitch(u*95,edge_dist-.335,.012)
        border = np.exp(-((edge_dist-.445)/.033)**2)
    else:
        x,y = np.minimum(u,1-u),np.minimum(v,1-v)
        margin = .042 if name=='pocket' else .030
        seam = np.maximum(interrupted_stitch(u*32,y-margin,.0065),
                          interrupted_stitch(v*42,x-margin,.009))
        border = np.maximum(np.exp(-((x-.015)/.011)**2),np.exp(-((y-.016)/.011)**2))
        if name=='pocket':
            border = np.maximum(border,np.exp(-((v-.056)/.020)**2)*.7)
            seam = np.maximum(seam,interrupted_stitch(u*28,v-.083,.007))
    base = paint(base,(160,110,72),.40*border)
    base = paint(base,(248,218,154),.86*seam)
    return base,.82-.08*seam,np.zeros_like(u)


def badge_paint(u,v):
    r = np.sqrt((u-.5)**2+(v-.5)**2)
    frame = np.exp(-((r-.426)/.012)**2)
    grain = cloud(u,v)*.015
    result = tint((222,162,79),(254,218,161),.60+grain+.20*(v-.5))
    result = paint(result,(156,89,36),frame*.82)
    # A tapered cup, its handle, saucer and three steam strokes.
    x,y = u-.474,v-.483
    bowl = (y<.06)&(y>-.123)&(abs(x)<(.143-.055*np.clip((.055-y)/.19,0,1)))
    bowl &= ((x/.139)**2+((y-.032)/.162)**2)<1.06
    rim = ((x/.145)**2+((y-.054)/.021)**2)<1
    handle_r = np.sqrt(((x-.139)/.067)**2+((y-.020)/.076)**2)
    handle = (handle_r<1)&(handle_r>.66)&(x>.114)
    saucer = (x/.179)**2+((y+.169)/.020)**2<1
    steam = np.zeros_like(bowl)
    for shift,height in ((-.055,.129),(0,.176),(.056,.134)):
        wave = np.sin((y-.114)/height*TAU+.18)*.016+shift
        steam |= (abs(x-wave)<.012)&(y>.107)&(y<.112+height)
    result = paint(result,(116,56,31),(bowl|handle|saucer|steam)*.95)
    result = paint(result,(116,56,31),rim*.90)
    result = paint(result,(249,216,155),(((x/.111)**2+((y-.058)/.010)**2)<1)*.88)
    return result,np.full_like(u,.51),np.full_like(u,.09)


def eye_paint(u,v):
    u = u % 1
    a = TAU*u
    r = math.pi*v
    iris = np.clip((.84-r)/.030,0,1)
    t = np.clip((r-.50)/.30,0,1)
    fibers = .13*np.sin(87*a+8*r)+.12*np.sin(119*a-11*r)+.10*np.sin(38*a+37*r)
    result = tint((255,249,238),(176,134,112),np.clip((r-.74)*.49,0,.65))
    pigment = tint((82,40,20),(224,142,52),np.clip(.36+.45*np.sin(t*math.pi)+fibers-.28*np.sin(a),0,1))
    result = result+(pigment-result)*iris[...,None]
    result = paint(result,(48,25,17),np.exp(-((r-.80)/.032)**2)*.9)
    pupil = np.clip((.56-r)/.018,0,1)
    black = tint((18,12,12),(40,30,26),.55+.38*np.sin(a)*np.clip(r/.56,0,1))
    result = result+(black-result)*pupil[...,None]
    x,y = np.sin(r)*np.cos(a),np.sin(r)*np.sin(a)
    light = np.exp(-(((x+.162)/.105)**2+((y-.229)/.090)**2))
    low = np.exp(-(((x-.138)/.048)**2+((y+.182)/.048)**2))
    result = paint(result,(255,252,244),np.clip((light-.20)*1.65,0,.95)+.55*low)
    return result,.22-.06*iris+.32*np.clip((r-.97),0,1),np.zeros_like(u)


def other_paint(name,tile,u,v):
    detail = cloud(u,v)
    empty = np.zeros_like(u)
    if name=='orbit':
        freckle = pores(u,v,tile,24,460,.0023)
        result = tint((223,139,103),(252,191,143),.46+.055*detail)
        result = paint(result,(158,63,48),freckle*.56)
        result = paint(result,(106,56,39),np.exp(-((v-.989)/.025)**2)*.68)
        return result,.60-.14*v,empty
    if name=='crest':
        rays = (.5+.5*np.cos(TAU*(u*9.5-.5-.08*v)))**6
        flecks = pores(u,v,tile,18,550,.0030)
        result = tint((194,94,80),(242,149,112),.62+.13*detail+.24*(1-v))
        result = paint(result,(253,187,128),.52*rays+.70*np.maximum(v,0)**7)
        result = paint(result,(150,62,48),.27*flecks)
        return result,.60-.17*rays,empty
    if name=='fin':
        rays = (.5+.5*np.cos(TAU*(u*10.5+.05)))**11
        tendrils = (.5+.5*np.sin(TAU*(u*70+v*.48)))**4
        result = tint((216,129,86),(255,221,189),.38+.58*v+.11*detail)
        result = paint(result,(225,137,62),(.44+.27*v)*rays)
        result = paint(result,(255,231,201),.18*tendrils+.42*np.maximum(v,0)**5)
        return result,.65-.10*rays,empty
    if name=='gold':
        result = tint((152,80,29),(237,168,78),.71+.23*np.sin(TAU*(u+v)))
        return result,np.full_like(u,.38),np.full_like(u,.35)
    raise KeyError(name)


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


def paint_atlas(output,size):
    color = np.full((size,size,3),128,dtype=np.uint8)
    surface = np.zeros_like(color)
    factor = size/1024
    for name,tile in ATLAS.items():
        x,y,w,h = (int(a*factor) for a in tile)
        u,v = np.meshgrid((np.arange(w,dtype='float32')+.5-4*factor)/(w-8*factor),
                          (np.arange(h,dtype='float32')+.5-4*factor)/(h-8*factor))
        u,v = np.clip(u,0,1),np.clip(v,0,1)
        if name in ('body','head'):
            rgb,rough,metal = painted_skin(tile,u,v,name=='head')
        elif name in ('cloth','strap','pocket'):
            rgb,rough,metal = linen(name,u,v)
        elif name=='eye':
            rgb,rough,metal = eye_paint(u,v)
        elif name=='badge':
            rgb,rough,metal = badge_paint(u,v)
        else:
            rgb,rough,metal = other_paint(name,tile,u,v)
        color[y:y+h,x:x+w] = np.uint8(np.clip(np.rint(rgb),0,255))
        surface[y:y+h,x:x+w,0] = 255
        surface[y:y+h,x:x+w,1] = np.uint8(np.clip(np.rint(rough*255),0,255))
        surface[y:y+h,x:x+w,2] = np.uint8(np.clip(np.rint(metal*255),0,255))
    paint_path = output/f'painted-color-{size}.png'
    color_path = output/f'painted-color-{size}.jpg'
    surface_path = output/f'painted-surface-{size//4}.png'
    png(paint_path,color)
    loaded = bpy.data.images.load(str(paint_path))
    # Size access loads the pixels before the file format changes.
    if tuple(loaded.size)!=(size,size):
        raise RuntimeError(f'Could not load {paint_path}')
    loaded.file_format = 'JPEG'
    loaded.save(filepath=str(color_path),quality=94)
    bpy.data.images.remove(loaded)
    averaged = np.rint(surface.reshape(size//4,4,size//4,4,3).mean(axis=(1,3)))
    png(surface_path,np.uint8(averaged))
    return color_path,surface_path


def shared_material(color_path,surface_path):
    material = bpy.data.materials.new('Café seahorse | skin, canvas and eyes')
    material.use_nodes = True
    tree = material.node_tree
    shader = tree.nodes.get('Principled BSDF')
    shader.inputs['Specular IOR Level'].default_value = .36
    color = tree.nodes.new('ShaderNodeTexImage')
    color.image = bpy.data.images.load(str(color_path))
    color.image.pack()
    color.label = 'Pigment, scute relief, canvas and eye detail'
    color.location = (-620,220)
    surface = tree.nodes.new('ShaderNodeTexImage')
    surface.image = bpy.data.images.load(str(surface_path))
    surface.image.colorspace_settings.name = 'Non-Color'
    surface.image.pack()
    surface.label = 'Shared linear roughness and metalness'
    surface.location = (-620,-100)
    rgb = tree.nodes.new('ShaderNodeSeparateColor')
    rgb.location = (-315,-110)
    tree.links.new(color.outputs['Color'],shader.inputs['Base Color'])
    tree.links.new(surface.outputs['Color'],rgb.inputs[0])
    tree.links.new(rgb.outputs['Green'],shader.inputs['Roughness'])
    tree.links.new(rgb.outputs['Blue'],shader.inputs['Metallic'])
    return material


def make_rig():
    data = bpy.data.armatures.new('Café seahorse skeleton')
    rig = bpy.data.objects.new('Café seahorse rig',data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    rig.show_in_front = True
    data.display_type = 'OCTAHEDRAL'
    bpy.ops.object.mode_set(mode='EDIT')

    def bone(name,head,tail,parent=None):
        item = data.edit_bones.new(name)
        item.head = YAW_ROTATION @ Vector(head) + Vector((0,0,.022))
        item.tail = YAW_ROTATION @ Vector(tail) + Vector((0,0,.022))
        if parent:
            item.parent = data.edit_bones[parent]
        return item

    bone('Float',(0,0,0),(0,0,.25))
    bone('Body',(0,.05,1.35),(0,.05,1.82),'Float')
    bone('Neck',(0,.15,1.97),(0,.18,2.34),'Body')
    bone('Head',(0,.115,2.388),(0,-.111,2.602),'Neck')
    bone('Tail base',(0,.224,.979),(0,.435,.57),'Body')
    bone('Tail curl',(0,.480,.393),(0,.23,.132),'Tail base')
    bone('Dorsal fin',(0,.378,1.61),(0,.705,1.61),'Body')
    for side,suffix in ((-1,'L'),(1,'R')):
        c,h,w,n = eye_axes(side)
        bone('Eye.'+suffix,c,c+n*.155,'Head').align_roll(YAW_ROTATION @ w)
        bone('Pectoral.'+suffix,(side*.25,.101,2.36),(side*.41,.21,2.41),'Head')
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


def bone_axis(rig,name,axis):
    to_bone = rig.data.bones[name].matrix_local.to_quaternion().inverted()
    return to_bone @ YAW_ROTATION @ Vector(axis)


def animate(rig):
    # Short attention shifts lead the head and fins. The orbital rims follow the head.
    # frame, float, body roll, head nod, head turn, gaze yaw, gaze pitch, fin, tail
    clips = {
        'Idle': [
            (1,0,0,0,0,0,-2,0,0),
            (17,.011,1.0,.7,.25,0,-2,3,1),
            (27,.018,.8,.65,.30,0,-2,-3,1.4),
            (31,.019,.8,.6,.4,8,5,2,1.5),
            (36,.016,.65,.1,1.2,8,5,-3,.7),
            (41,.010,.38,.25,1.15,1,-2,3,.3),
            (54,-.004,-.2,-.6,0,0,-2,-3,-1.3),
            (65,-.012,-.6,-.8,-.7,-3,-1,2,-1.8),
            (71,-.009,-.5,-.5,-.6,-2,-2,-2,-1.5),
            (83,-.005,-.4,-.8,-.4,-2,-2,2,-1.1),
            (96,-.002,-.1,-.3,-.1,-.2,-2,-2,-.5),
            (105,0,0,0,0,0,-2,0,0),
        ],
        'Listen': [
            (1,0,0,0,0,0,-2,0,0),
            (9,.011,.3,-1.50,-.8,.6,-3,2,.6),
            (23,.015,.4,-1.65,-.8,.4,-3,-2,1),
            (32,.015,.4,-.9,-.55,.4,-3,3,1),
            (37,.014,.3,1.70,-.2,.4,-1,1,.85),
            (46,.006,-.1,-.9,-.25,.35,-3,-3,.1),
            (62,-.003,-.25,-.2,0,0,-2,2,-.4),
            (72,-.003,-.10,-.1,0,0,-2,-1,-.2),
            (81,0,0,0,0,0,-2,0,0),
        ],
        'React': [
            (1,0,0,0,0,0,-2,0,0),
            (5,.013,.7,-1,-.55,-3,-6,4,.7),
            (10,.041,2.5,-3.25,-3,-5,-7,-8,2.4),
            (15,.032,1.2,5.5,-2,-4,4,5,1.5),
            (20,.022,.2,3.35,-1,-1,3,-3,1.3),
            (28,.008,-.3,-1.3,.35,.9,-2,3,-.5),
            (41,0,0,0,0,0,-2,0,0),
        ],
    }

    def rotate(frame,name,*rotations):
        q = Quaternion()
        for axis,degrees in rotations:
            q @= Quaternion(bone_axis(rig,name,axis),math.radians(degrees))
        item = rig.pose.bones[name]
        item.rotation_mode = 'QUATERNION'
        item.rotation_quaternion = q
        item.keyframe_insert(data_path='rotation_quaternion',frame=frame,group=name)

    bpy.context.scene.render.fps = 30
    rig.animation_data_create()
    for name,keys in clips.items():
        action = bpy.data.actions.new(name)
        rig.animation_data.action = action
        for frame,bob,roll,nod,turn,gaze,pitch,fin,tail in keys:
            root = rig.pose.bones['Float']
            root.location = bone_axis(rig,'Float',Z)*bob
            root.keyframe_insert(data_path='location',frame=frame,group='Float')
            rotate(frame,'Body',((0,1,0),roll),((1,0,0),.24*nod))
            rotate(frame,'Neck',(Z,.32*turn),((1,0,0),.28*nod))
            rotate(frame,'Head',(Z,turn),((1,0,0),nod))
            rotate(frame,'Dorsal fin',(Z,fin))
            rotate(frame,'Tail base',((0,1,0),.4*tail),((1,0,0),.48*tail))
            rotate(frame,'Tail curl',((1,0,0),-tail),(Z,.51*tail))
            for side,suffix in ((-1,'L'),(1,'R')):
                c,h,w,n = eye_axes(side)
                convergence = max(0,pitch+2)*.18
                rotate(frame,'Eye.'+suffix,(Z,gaze-side*convergence),(h,pitch))
                rotate(frame,'Pectoral.'+suffix,(Z,.4*fin*side),((0,1,0),.35*fin))
        for channel in action.fcurves:
            for key in channel.keyframe_points:
                key.handle_left_type = key.handle_right_type = 'AUTO_CLAMPED'
        action.use_fake_user = True
        rig.animation_data.action = None
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name,1,action)
        track.mute = True
    rig.animation_data.action = bpy.data.actions['Idle']
    bpy.context.scene.frame_set(1)
    bpy.context.scene.frame_end = 105


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


def build(lod,output,blend_output):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    size = 2048 if lod=='close' else 1024
    material = shared_material(*paint_atlas(output,size))
    rig = make_rig()
    mesh = make_mesh(lod,material,rig)
    animate(rig)
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    dest = output/f'cafe-seahorse-{lod}.glb'
    bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,
                             export_animations=True,export_animation_mode='ACTIONS',
                             export_force_sampling=True,export_apply=False,
                             export_image_format='AUTO',export_extras=False,
                             export_yup=True,export_rest_position_armature=True)
    report = glb_stats(dest)
    assert report['triangles'] <= (22000 if lod=='close' else 8000), report['triangles']
    assert report['draws']==report['materials']==1, report
    assert {item['name'] for item in report['clips']} == {'Idle','Listen','React'}, report
    (output/f'{lod}-report.json').write_text(json.dumps(report,indent=2)+'\n')
    if lod=='close':
        bpy.context.scene.frame_set(1)
        bpy.context.preferences.filepaths.save_version = 0
        for screen in bpy.data.screens:
            for area in screen.areas:
                if area.type=='VIEW_3D':
                    space = area.spaces.active
                    space.shading.type = 'MATERIAL'
                    space.overlay.show_overlays = False
                    view = space.region_3d
                    view.view_distance = 5.3
                    view.view_location = (0,-.08,1.54)
                    view.view_rotation = Vector((0,-1,.16)).to_track_quat('Z','Y')
                    view.view_perspective = 'ORTHO'
        bpy.ops.wm.save_as_mainfile(filepath=str(blend_output),compress=True)
    print('CAFE_GLTF',json.dumps(report),flush=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output',type=Path,required=True)
    parser.add_argument('--blend-output',type=Path)
    parser.add_argument('--lod',choices=['both','board','close'],default='both')
    args = parser.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
    output = args.output.resolve()
    output.mkdir(parents=True,exist_ok=True)
    blend_output = (args.blend_output or output/'cafe-seahorse.blend').resolve()
    blend_output.parent.mkdir(parents=True,exist_ok=True)
    for lod in ('board','close') if args.lod=='both' else (args.lod,):
        build(lod,output,blend_output)


if __name__=='__main__':
    main()
