"""Shelly: original hand-authored baby sea turtle. Blender Z up, face -Y."""
import bpy, math, os, random, json, struct
def clamp(v,a=0,b=1):return max(a,min(b,v))
from mathutils import Vector
random.seed(12)
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
SRC=os.path.join(ROOT,'art-source/shelly'); os.makedirs(SRC,exist_ok=True)
PREVIEW=os.environ.get('SHELLY_REVIEW_DIR','/workspace/work/shelly-pearl/review');os.makedirs(PREVIEW,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
all_mesh=[]
SKIN=(.22,.45,.21,1); LIGHT=(.48,.69,.44,1); CREAM=(.78,.77,.51,1); SCALE=(.27,.49,.27,1)
def material(name,rough):
 m=bpy.data.materials.new(name);m.use_nodes=True;n=m.node_tree.nodes;b=n.get('Principled BSDF');b.inputs['Roughness'].default_value=rough
 a=n.new('ShaderNodeVertexColor');a.layer_name='Pigment';m.node_tree.links.new(a.outputs['Color'],b.inputs['Base Color']);b.inputs['Subsurface Weight'].default_value=.045 if rough>.4 else 0
 if rough<.4:b.inputs['Coat Weight'].default_value=.35
 return m
mat=material('Shelly | softly painted skin and shell',.62)
eye_mat=material('Shelly | wet luminous eyes',.20)
def paint(ob,col,material=mat):
 ob.data.materials.clear();ob.data.materials.append(material)
 a=ob.data.color_attributes.get('Pigment') or ob.data.color_attributes.new(name='Pigment',type='FLOAT_COLOR',domain='CORNER')
 for p in ob.data.polygons:
  p.use_smooth=True
  for li in p.loop_indices:
   v=ob.data.vertices[ob.data.loops[li].vertex_index].co
   noise=math.sin(v.x*32+math.sin(v.z*19))*math.sin(v.y*25)*.012+math.sin(v.z*6+v.x*4)*.018
   a.data[li].color=tuple(max(0,min(1,c+noise)) for c in col[:3])+(1,)
 return ob

def mesh(name,vs,fs,col,material=mat):
 me=bpy.data.meshes.new(name);me.from_pydata(vs,[],fs);me.update();ob=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(ob);all_mesh.append(ob);paint(ob,col,material);return ob

def ell(name,loc,scl,col,seg=32,rings=20,material=mat):
 bpy.ops.mesh.primitive_uv_sphere_add(segments=seg,ring_count=rings,location=loc)
 ob=bpy.context.object;ob.name=name
 for v in ob.data.vertices:v.co=Vector((v.co.x*scl[0],v.co.y*scl[1],v.co.z*scl[2]))
 all_mesh.append(ob);paint(ob,col,material);return ob

def join_remesh(parts,name,voxel=.025):
 bpy.ops.object.select_all(action='DESELECT')
 for ob in parts:ob.select_set(True);all_mesh.remove(ob)
 bpy.context.view_layer.objects.active=parts[0];bpy.ops.object.join();ob=parts[0];ob.name=name
 bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 ob.data.remesh_voxel_size=voxel;bpy.ops.object.voxel_remesh()
 sm=ob.modifiers.new('sculpt polish','SMOOTH');sm.factor=1.1;sm.iterations=5;bpy.ops.object.modifier_apply(modifier=sm.name)
 all_mesh.append(ob);paint(ob,SKIN);return ob

def tube(name,pts,radius,col,sides=8):
 vs=[];fs=[]
 for i,p in enumerate(pts):
  p=Vector(p);t=(Vector(pts[min(i+1,len(pts)-1)])-Vector(pts[max(i-1,0)])).normalized();a=t.cross(Vector((0,1,0))).normalized();b=t.cross(a).normalized()
  r=radius(i/(len(pts)-1)) if callable(radius) else radius
  for j in range(sides):vs.append(p+r*(math.cos(j*2*math.pi/sides)*a+math.sin(j*2*math.pi/sides)*b))
 for i in range(len(pts)-1):
  for j in range(sides):a=i*sides+j;d=i*sides+(j+1)%sides;fs.append((a,d,d+sides,a+sides))
 return mesh(name,vs,fs,col)

def fin(side,front):
 vs=[];fs=[];S=20;rows=13
 # Broad, rounded marine paddles sweep down and forward. Their broad axis is
 # visible from the front as well as in profile, and the tips keep real volume.
 for i in range(rows):
  t=i/(rows-1)
  x=side*(.45+(.70 if front else .43)*t)
  y=(-.12-.51*t if front else .75+.31*t)
  z=(.53-.42*t+.035*math.sin(math.pi*t) if front else .43-.25*t)
  width=(.125+.105*math.sin(math.pi*t)**.8) if front else (.085+.06*math.sin(math.pi*t))
  width*= (.32 if i==rows-1 else 1)
  thick=(.095-.042*t) if front else (.067-.028*t)
  for j in range(S):
   a=2*math.pi*j/S;w=width*math.cos(a)
   vs.append((x+side*.48*w,y+thick*math.sin(a),z+.88*w))
 for i in range(rows-1):
  for j in range(S):a=i*S+j;b=i*S+(j+1)%S;fs.append((a,b,b+S,a+S))
 fs.extend([tuple(reversed(range(S))),tuple((rows-1)*S+j for j in range(S))]);return mesh(('Front' if front else 'Rear')+' flipper '+str(side),vs,fs,SKIN)
parts=[ell('torso',(0,.28,.5),(.60,.78,.38),SKIN),ell('neck',(0,-.40,.76),(.40,.40,.48),SKIN)]
for s in (-1,1):parts.extend([fin(s,True),fin(s,False)])
parts.append(ell('tail',(0,1,.40),(.12,.29,.11),SKIN,20,12))
body=join_remesh(parts,'Body | continuous neck and marine flippers',.027)
# Approved Lavender Pearl design. The cream face mask and iridescent scales wrap
# the entire head as a UV texture; they are not camera-facing decals.
import numpy as np
SKIN=(.48,.72,.66,1)
bs=mat.node_tree.nodes.get('Principled BSDF');bs.inputs['Roughness'].default_value=.39;bs.inputs['Coat Weight'].default_value=.18
shellmat=material('Shelly | lavender pearl enamel and gold inlay',.31)
shellmat.node_tree.nodes.get('Principled BSDF').inputs['Metallic'].default_value=.12
shellmat.node_tree.nodes.get('Principled BSDF').inputs['Coat Weight'].default_value=.26
# Reposition the original continuous body into a compact supporting-flipper pose.
for v in body.data.vertices:
 x,y,z=v.co
 if abs(x)>.49:
  t=clamp((abs(x)-.49)/.93);v.co.x=math.copysign(.49+(abs(x)-.49)*.76,x)
  if y<.4:
   v.co.x=math.copysign(.49+(abs(x)-.49)*.89,x)
   v.co.y-=.10*t;v.co.z-=.04*t
paint(body,SKIN)
# One rounded, continuous baby head. Cheeks and beak are smooth sculpt
# displacements of this surface, with no separate cheek-ball primitives.
bpy.ops.mesh.primitive_uv_sphere_add(segments=96,ring_count=64)
head=bpy.context.object;head.name='Head | continuous cream face';all_mesh.append(head)
for vert in head.data.vertices:
 nx,ny,nz=vert.co
 x=.625*math.copysign(abs(nx)**.88,nx);z=1.40+.57*math.copysign(abs(nz)**.92,nz)
 # The lower face swells continuously into soft cheeks, while the temples
 # narrow a little. This is one surface, including the smiling muzzle.
 x*=1+.105*math.exp(-((z-1.20)/.25)**2)-.06*clamp((z-1.68)/.25)
 y=-.72+.51*math.copysign(abs(ny)**.64,ny)
 front=clamp(-ny*5)
 y-=front*(.135*math.exp(-(x/.51)**4-((z-1.20)/.24)**2)+.115*math.exp(-(x/.26)**4-((z-1.26)/.15)**2))
 vert.co=(x,y,z)
paint(head,SKIN)
cutter=ell('mouth cutter',(0,-1.36,1.105),(.250,.30,.112),SKIN,48,24)
for v in cutter.data.vertices:v.co.z+=.095*(v.co.x/.250)**2
bpy.context.view_layer.objects.active=head;bo=head.modifiers.new('actual happy mouth opening','BOOLEAN');bo.operation='DIFFERENCE';bo.object=cutter;bpy.ops.object.modifier_apply(modifier=bo.name)
all_mesh.remove(cutter);bpy.data.objects.remove(cutter,do_unlink=True)
# Low-frequency color, fine irregular scales, and a feathered cream facial mask.
N=1536
vv,uu=np.mgrid[0:N,0:N].astype(np.float32);u=uu/(N-1);v=vv/(N-1)
a=(u-.5)*2*np.pi;lat=(v-.5)*np.pi
px=.625*np.sin(a)*np.cos(lat);pz=1.40+.57*np.sin(lat);front=np.cos(a)
rgb=np.zeros((N,N,4),dtype=np.float32);rgb[:,:,3]=1
# Irregular Voronoi cells on the spherical atlas; longitude wraps at the seam.
seed=[]
for row in range(18):
 for col in range(36):
  seed.append(((col+(row%2)*.5+random.uniform(-.23,.23))/36%1,(row+.5+random.uniform(-.24,.24))/18,random.random()))
d1=np.full((N,N),99.,np.float32);d2=d1.copy();tone=np.zeros((N,N),np.float32)
# Each seed only touches a small pixel neighborhood, keeping authoring fast.
for su,sv,t in seed:
 for wrap in (-1,0,1):
  sx=(su+wrap)*N;sy=sv*N;x0=max(0,int(sx-N*.065));x1=min(N,int(sx+N*.065));y0=max(0,int(sy-N*.08));y1=min(N,int(sy+N*.08))
  if x0>=x1 or y0>=y1:continue
  dx=(uu[y0:y1,x0:x1]-sx)/N;dy=(vv[y0:y1,x0:x1]-sy)/N
  ds=dx*dx+dy*dy*.54;one=d1[y0:y1,x0:x1];two=d2[y0:y1,x0:x1];closer=ds<one
  two[:]=np.where(closer,one,np.minimum(two,ds));tone[y0:y1,x0:x1]=np.where(closer,t,tone[y0:y1,x0:x1]);one[:]=np.minimum(one,ds)
edge=np.clip((np.sqrt(d2)-np.sqrt(d1))/.00135,0,1)
top=np.clip((pz-1.61)/.33,0,1)
# Powder blue at the sides, lavender over the crown, seafoam by the face.
colors=[.25+.27*top+.07*tone,.56-.20*top+.08*tone,.61+.12*top+.07*tone]
for k in range(3):rgb[:,:,k]=colors[k]*edge+(.82,.73,.49)[k]*(1-edge)
face=np.clip((1.39-pz)/.14,0,1)*np.clip((front-.3)/.30,0,1)
for side in (-1,1):
 q=((px-side*.32)/.25)**2+((pz-1.48)/.31)**2
 eye=np.clip((1.06-q)/.16,0,1)*np.clip((front-.4)/.22,0,1);face=np.maximum(face,eye)
# Cream cheeks and projecting little nose.
face=np.maximum(face,np.clip((1-((px/.25)**2+((pz-1.19)/.16)**2))/.17,0,1)*np.clip((front-.5)/.15,0,1))
cream=(.91,.79,.53)
for k in range(3):rgb[:,:,k]=rgb[:,:,k]*(1-face)+cream[k]*face
# Blush stays painted into the cheek surface, feathered with no floating disk.
blush=np.zeros((N,N),np.float32)
for side in (-1,1):blush=np.maximum(blush,np.exp(-(((px-side*.40)/.15)**2+((pz-1.16)/.095)**2)*1.7)*np.clip((front-.45)/.20,0,1))
for k,c in enumerate((.91,.43,.39)):rgb[:,:,k]=rgb[:,:,k]*(1-blush*.43)+c*blush*.43
img=bpy.data.images.new('Shelly | wrapped pearl scales and cream face',width=N,height=N,alpha=True);img.pixels.foreach_set(rgb.ravel());img.filepath_raw=os.path.join(SRC,'shelly-face-color.png');img.file_format='PNG';img.save();img.pack()
headmat=bpy.data.materials.new('Shelly | pearl scales cream face');headmat.use_nodes=True
b=headmat.node_tree.nodes.get('Principled BSDF');b.inputs['Roughness'].default_value=.36;b.inputs['Coat Weight'].default_value=.18;b.inputs['Subsurface Weight'].default_value=.055
t=headmat.node_tree.nodes.new('ShaderNodeTexImage');t.image=img;headmat.node_tree.links.new(t.outputs['Color'],b.inputs['Base Color'])
head.data.materials.clear();head.data.materials.append(headmat)
uv=head.data.uv_layers.new(name='Wrapped pearl head UV');head.data.uv_layers.active=uv;uv.active_render=True
uvnode=headmat.node_tree.nodes.new('ShaderNodeUVMap');uvnode.uv_map=uv.name;headmat.node_tree.links.new(uvnode.outputs['UV'],t.inputs['Vector'])
for p in head.data.polygons:
 for li in p.loop_indices:
  co=head.data.vertices[head.data.loops[li].vertex_index].co
  # Directional ellipsoid UV stays coherent over the cheek and muzzle union.
  dx=co.x/.625;dy=-(co.y+.72)/.51;dz=(co.z-1.40)/.57
  uv.data[li].uv=(.5+math.atan2(dx,dy)/(2*math.pi),.5+math.atan2(dz,math.sqrt(dx*dx+dy*dy))/math.pi)
# Recessed mouth liner, curved tongue and a softly defined lip.
ell('Mouth | interior',(0,-1.17,1.108),(.249,.125,.110),(.11,.024,.035,1),32,16)
ell('Mouth | tongue',(0,-1.34,1.034),(.121,.074,.024),(.85,.30,.34,1),24,12)
pts=[]
for j in range(25):
 x=-1+2*j/24;pts.append((.251*x,-1.37+.09*x*x,1.192-.18*math.sqrt(max(0,1-x*x))))
tube('Mouth | lower lip',pts,lambda t:.007+.009*math.sin(math.pi*t),(.87,.65,.43,1),8)
for side in (-1,1):ell('Nostril '+str(side),(side*.085,-1.437,1.295),(.011,.004,.006),(.12,.045,.023,1),16,10)
# Custom almond-shaped sclera patches sit flush inside the face. There are no
# raised circular socket rings; lashes grow from the slim integrated upper lid.
def face_y(x,z):
 hit,loc,n,idx=head.ray_cast(Vector((x,-3,z)),Vector((0,1,0)))
 return loc.y if hit else -1.12
def eye_y(side,x,z):
 cx=side*.325;cz=1.485;r2=((x-cx)/.226)**2+((z-cz-side*.035*(x-cx)/.226)/.195)**2
 return face_y(x,z)-.012-.060*max(0,1-r2)
def eye_surface(side):
 cx=side*.325;cz=1.485;vs=[(cx,eye_y(side,cx,cz),cz)];fs=[];S=48;R=7
 for i in range(1,R+1):
  r=i/R
  for j in range(S):
   a=j*2*math.pi/S;x=math.cos(a);z=math.copysign(abs(math.sin(a))**1.06,math.sin(a))
   xx=cx+.226*x*r;zz=cz+.195*z*r+side*.035*x*r
   vs.append((xx,eye_y(side,xx,zz),zz))
 for j in range(S):fs.append((0,1+(j+1)%S,1+j))
 for i in range(R-1):
  for j in range(S):a=1+i*S+j;b=1+i*S+(j+1)%S;fs.append((a,b,b+S,a+S))
 return mesh('Eye white '+str(side),vs,fs,(.96,.91,.83,1),eye_mat)
for side in (-1,1):
 eye_surface(side);cx=side*.325+.018;cz=1.515
 # A layered curved iris with pigment variation, not protruding disks.
 vs=[(cx,eye_y(side,cx,cz)-.004,cz)];fs=[];S=64;R=10
 for i in range(1,R+1):
  r=i/R
  for j in range(S):a=j*2*math.pi/S;xx=cx+.145*r*math.cos(a);zz=cz+.163*r*math.sin(a);vs.append((xx,eye_y(side,xx,zz)-.005,zz))
 for j in range(S):fs.append((0,1+(j+1)%S,1+j))
 for i in range(R-1):
  for j in range(S):a=1+i*S+j;b=1+i*S+(j+1)%S;fs.append((a,b,b+S,a+S))
 iris=mesh('Iris violet '+str(side),vs,fs,(.28,.12,.32,1),eye_mat);attr=iris.data.color_attributes['Pigment']
 for p in iris.data.polygons:
  for li in p.loop_indices:
   q=iris.data.vertices[iris.data.loops[li].vertex_index].co;dx=(q.x-cx)/.145;dz=(q.z-cz)/.163;r=math.sqrt(dx*dx+dz*dz);a=math.atan2(dz,dx)
   light=.5+.5*math.sin(a*31+math.sin(a*13)*2);gold=clamp(-dz*1.5);base=(.32+.12*light,.13+.04*light,.38+.12*light)
   if r>.87:base=(.12,.055,.13)
   attr.data[li].color=tuple(base[k]*(1-gold*.65)+(.58,.29,.10)[k]*gold*.65 for k in range(3))+(1,)
 vs=[(cx,eye_y(side,cx,cz)-.010,cz)];fs=[];S=48
 for rr in (.25,.5,.75,1):
  for j in range(S):
   a=j*2*math.pi/S;xx=cx+.102*rr*math.cos(a);zz=cz+.122*rr*math.sin(a);vs.append((xx,eye_y(side,xx,zz)-.010,zz))
 for j in range(S):fs.append((0,1+(j+1)%S,1+j))
 for row in range(3):
  for j in range(S):a=1+row*S+j;b=1+row*S+(j+1)%S;fs.append((a,b,b+S,a+S))
 mesh('Pupil '+str(side),vs,fs,(.008,.009,.018,1),eye_mat)
 ell('Eye catchlight '+str(side),(cx-.037,eye_y(side,cx-.037,cz+.085)-.018,cz+.085),(.030,.009,.033),(.99,.99,1,1),16,10,eye_mat)
 ell('Eye small catchlight '+str(side),(cx+.047,eye_y(side,cx+.047,cz-.048)-.016,cz-.048),(.012,.006,.014),(.72,.86,1,1),12,8,eye_mat)
 cx=side*.325;cz=1.485
 upper=[];lower=[]
 for j in range(33):
  a=math.pi*j/32;x=math.cos(a);z=abs(math.sin(a))**1.06
  xx=cx+.228*x;zz=cz+.199*z+side*.035*x
  upper.append((xx,face_y(xx,zz)-.016,zz))
  zz=cz-.195*z+side*.035*x
  lower.append((xx,face_y(xx,zz)-.014,zz))
 tube('Upper eyelid '+str(side),upper,lambda t:.007+.010*math.sin(math.pi*t),(.22,.095,.095,1),8)
 tube('Lower eyelid '+str(side),lower,.007,(.54,.30,.30,1),6)
 # Soft mauve lid above the lash margin is a surface ribbon, tapered at corners.
 above=[(x,y+.012,z+.020*math.sin(math.pi*i/32)) for i,(x,y,z) in enumerate(upper)]
 tube('Mauve upper lid '+str(side),above,lambda t:.006+.012*math.sin(math.pi*t),(.66,.39,.47,1),8)
 # Swept fine lashes at the outer half, matching the approved feminine face.
 for j in range(6):
  frac=.08+j*.075 if side==1 else .92-j*.075;a=math.pi*frac;x=math.cos(a);zz=abs(math.sin(a))**1.06
  xx=cx+.228*x;zz=cz+.199*zz+side*.035*x;base=Vector((xx,face_y(xx,zz)-.025,zz));pts=[]
  length=.065-.007*j
  for k in range(6):t=k/5;pts.append(base+Vector((side*length*t,-.008*math.sin(math.pi*t),length*(.15*t+.8*t*t))))
  tube('Lash '+str(side),pts,lambda t:.0055*(1-t)+.0007,(.12,.055,.050,1),5)
 # Thin expressive asymmetric arched brows; outer tail softens to a point.
 pts=[]
 for j in range(20):
  t=j/19;x=cx+(t-.5)*.30;z=1.755+.040*math.sin(math.pi*t)+(0.018 if side==-1 else 0)-side*.018*(t-.5)
  hit,loc,n,idx=head.ray_cast(Vector((x,-3,z)),Vector((0,1,0)));y=loc.y-.01 if hit else -1.12
  pts.append((x,y,z))
 tube('Eyebrow '+str(side),pts,lambda t:.003+.011*math.sin(math.pi*t)**.7,(.19,.065,.027,1),8)
# Rounded lavender carapace and closed embossed scutes, visible from all angles.
RX=.73;RY=.85;CY=.34
def shellpt(x,y,raisez=0):
 q=(x/RX)**2+((y-CY)/RY)**2;return (x,y,.69+.46*max(0,1-q)**.65+raisez)
vs=[shellpt(0,CY)];fs=[];S=64;R=12
for i in range(1,R+1):
 for j in range(S):a=j*2*math.pi/S;vs.append(shellpt(RX*i/R*math.cos(a),CY+RY*i/R*math.sin(a)))
for j in range(S):fs.append((0,1+j,1+(j+1)%S))
for i in range(R-1):
 for j in range(S):a=1+i*S+j;b=1+i*S+(j+1)%S;fs.append((a,a+S,b+S,b))
mesh('Carapace | golden sutures',vs,fs,(.70,.43,.18,1),shellmat)
seeds=[(0,-.20),(0,.24),(0,.72),(-.45,-.06),(.45,-.06),(-.48,.42),(.48,.42),(-.36,.84),(.36,.84)]
border=[(RX*.97*math.cos(j*2*math.pi/64),CY+RY*.97*math.sin(j*2*math.pi/64)) for j in range(64)]
def clip(poly,nx,ny,c):
 out=[]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  da=nx*a[0]+ny*a[1]-c;db=nx*b[0]+ny*b[1]-c
  if da<=0:out.append(a)
  if (da<0)!=(db<0):t=da/(da-db);out.append((a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])))
 return out
for i,(sx,sy) in enumerate(seeds):
 poly=border[:]
 for k,(tx,ty) in enumerate(seeds):
  if k!=i:poly=clip(poly,tx-sx,ty-sy,(tx*tx+ty*ty-sx*sx-sy*sy)/2)
 cx=sum(p[0] for p in poly)/len(poly);cy=sum(p[1] for p in poly)/len(poly)
 poly=[(cx+(x-cx)*.947,cy+(y-cy)*.947) for x,y in poly];dense=[]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  n=max(1,int(math.dist(a,b)/.045))
  for j in range(n):t=j/n;dense.append((a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])))
 poly=dense;N=len(poly);vs=[shellpt(cx,cy,.046)];fs=[]
 for r in (.17,.34,.51,.68,.84,.94,1):
  for x,y in poly:vs.append(shellpt(cx+(x-cx)*r,cy+(y-cy)*r,.031+.018*math.sin(math.pi*r)))
 for j in range(N):fs.append((0,1+j,1+(j+1)%N))
 for ring in range(6):
  for j in range(N):a=1+ring*N+j;b=1+ring*N+(j+1)%N;fs.append((a,a+N,b+N,b))
 ob=mesh('Carapace | lavender petal scute %02d'%i,vs,fs,(.42+random.uniform(-.025,.025),.29+random.uniform(-.025,.025),.63+random.uniform(-.04,.04),1),shellmat)
 # Warm fine perimeter and botanical engraved-gold stems/leaves follow dome.
 pts=[shellpt(x,y,.036) for x,y in poly]+[shellpt(*poly[0],.036)]
 tube('Carapace | gold inlay edge',pts,.006,(.91,.63,.29,1),5)
 sx=max(x for x,y in poly)-min(x for x,y in poly);sy=max(y for x,y in poly)-min(y for x,y in poly)
 def stempt(t):return (cx+.035*math.sin(t*math.pi),cy+(t-.5)*sy*.63)
 pts=[shellpt(*stempt(j/18),.055) for j in range(19)];tube('Carapace | botanical stem',pts,.0043,(.92,.66,.31,1),5)
 for sign in (-1,1):
  for leaf in range(3):
   t=.27+leaf*.20;bx,by=stempt(t);length=min(sx*.28,.115);pts=[]
   for j in range(17):
    a=j*2*math.pi/16;progress=(1-math.cos(a))/2
    x=bx+sign*length*progress;y=by+sy*.11*progress+sy*.035*math.sin(a)
    pts.append(shellpt(x,y,.054))
   tube('Carapace | botanical leaf',pts,.0033,(.90,.63,.29,1),4)
pts=[shellpt(RX*.99*math.cos(j*2*math.pi/64),CY+RY*.99*math.sin(j*2*math.pi/64),-.01) for j in range(65)]
tube('Carapace | pearl peach rim',pts,.034,(.86,.57,.36,1),10)
ell('Plastron | cream underside',(0,.28,.29),(.55,.70,.17),(.88,.72,.47,1),32,16)
# Flipper scales are delicate surface inlays using the continuous skin raycast.
# Each cell sits on the true top skin, with cream joints and blue/lilac centers.
for side in (-1,1):
 for row in range(8):
  x=side*(.58+row*.071)
  for col in range(4):
   y=-.14-.44*((abs(x)-.49)/.71)+(col-1.5)*.078
   hit,loc,n,idx=body.ray_cast(Vector((x,y,2)),Vector((0,0,-1)))
   if not hit:continue
   vs=[tuple(loc+Vector((0,0,.007)))];ring=[]
   for k in range(6):
    a=2*math.pi*k/6;xx=x+.037*math.cos(a);yy=y+.039*math.sin(a);hit,ll,nn,idx=body.ray_cast(Vector((xx,yy,2)),Vector((0,0,-1)))
    if hit:ring.append((xx,yy,ll.z+.004))
   if len(ring)!=6:continue
   vs+=ring;ob=mesh('Flipper scale pearl '+str(side),vs,[(0,k+1,(k+1)%6+1) for k in range(6)],(.36+.13*row/8,.58-.16*row/8,.66+.07*row/8,1),mat)
   tube('Flipper scale joint '+str(side),ring+[ring[0]],.0025,(.84,.76,.50,1),4)

# Bake a three-dimensional scale field to the body's actual UVs. This covers
# both sides of every flipper and the neck, rather than front-only scale decals.
for ob in list(all_mesh):
 if ob.name.startswith('Flipper scale'):
  all_mesh.remove(ob);bpy.data.objects.remove(ob,do_unlink=True)
bodymat=bpy.data.materials.new('Shelly | wrapped flipper and neck scales');bodymat.use_nodes=True
nodes=bodymat.node_tree.nodes;nodes.clear();links=bodymat.node_tree.links
out=nodes.new('ShaderNodeOutputMaterial');em=nodes.new('ShaderNodeEmission');links.new(em.outputs[0],out.inputs['Surface'])
geo=nodes.new('ShaderNodeNewGeometry');voro=nodes.new('ShaderNodeTexVoronoi');voro.feature='DISTANCE_TO_EDGE';voro.inputs['Scale'].default_value=14;links.new(geo.outputs['Position'],voro.inputs['Vector'])
cell=nodes.new('ShaderNodeTexVoronoi');cell.feature='F1';cell.inputs['Scale'].default_value=14;links.new(geo.outputs['Position'],cell.inputs['Vector'])
sep=nodes.new('ShaderNodeSeparateColor');links.new(cell.outputs['Color'],sep.inputs['Color'])
ramp=nodes.new('ShaderNodeValToRGB');ramp.color_ramp.elements[0].color=(.28,.52,.60,1);ramp.color_ramp.elements[1].color=(.50,.47,.73,1);links.new(sep.outputs[0],ramp.inputs['Fac'])
edge=nodes.new('ShaderNodeMath');edge.operation='GREATER_THAN';edge.inputs[1].default_value=.024;links.new(voro.outputs['Distance'],edge.inputs[0])
mixnode=nodes.new('ShaderNodeMixRGB');mixnode.blend_type='MIX';mixnode.inputs[1].default_value=(.87,.77,.51,1);links.new(edge.outputs[0],mixnode.inputs[0]);links.new(ramp.outputs[0],mixnode.inputs[2])
xyz=nodes.new('ShaderNodeSeparateXYZ');links.new(geo.outputs['Normal'],xyz.inputs[0]);underside=nodes.new('ShaderNodeMath');underside.operation='LESS_THAN';underside.inputs[1].default_value=-.15;links.new(xyz.outputs['Z'],underside.inputs[0])
final=nodes.new('ShaderNodeMixRGB');links.new(underside.outputs[0],final.inputs[0]);links.new(mixnode.outputs[0],final.inputs[1]);final.inputs[2].default_value=(.88,.74,.48,1);links.new(final.outputs[0],em.inputs[0])
body.data.materials.clear();body.data.materials.append(bodymat)
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
bpy.ops.object.mode_set(mode='EDIT');bpy.ops.mesh.select_all(action='SELECT');bpy.ops.uv.smart_project(angle_limit=1.15,island_margin=.007);bpy.ops.object.mode_set(mode='OBJECT')
bodyimg=bpy.data.images.new('Shelly | full body pearl scales',width=1024,height=1024,alpha=True)
tex=nodes.new('ShaderNodeTexImage');tex.image=bodyimg;nodes.active=tex
bpy.context.scene.render.engine='CYCLES';bpy.context.scene.cycles.device='CPU';bpy.context.scene.cycles.samples=1;bpy.context.scene.render.bake.margin=8
bpy.ops.object.bake(type='EMIT');bodyimg.filepath_raw=os.path.join(SRC,'shelly-body-color.png');bodyimg.file_format='PNG';bodyimg.save();bodyimg.pack()
nodes.clear();out=nodes.new('ShaderNodeOutputMaterial');b=nodes.new('ShaderNodeBsdfPrincipled');b.inputs['Roughness'].default_value=.37;b.inputs['Coat Weight'].default_value=.15;b.inputs['Subsurface Weight'].default_value=.035
tex=nodes.new('ShaderNodeTexImage');tex.image=bodyimg;links.new(tex.outputs['Color'],b.inputs['Base Color']);links.new(b.outputs[0],out.inputs['Surface'])

# Studio review with filmic broad lighting and a warm pastel cyclorama.
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.42,.52,.49,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
for name,loc,energy,color,size in [('Key',(-3,-4,5),320,(1,.88,.72),4),('Fill',(3,-2,3),160,(.72,.87,1),3),('Rim',(1,3,4),350,(1,.88,.59),3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.color=color;o.data.size=size;o.rotation_euler=(Vector((0,-.3,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.04));floor=bpy.context.object;floor.name='Studio floor'
fm=bpy.data.materials.new('Studio sand');fm.diffuse_color=(.63,.70,.66,1);floor.data.materials.append(fm)
bpy.ops.object.camera_add(location=(-2.4,-5.8,2.65));cam=bpy.context.object;cam.name='Portrait camera';cam.rotation_euler=(Vector((0,-.15,1.00))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.3
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=80;scene.cycles.use_denoising=False;bpy.context.view_layer.cycles.use_denoising=False
scene.render.resolution_x=int(os.environ.get('SHELLY_RENDER_SIZE','850'));scene.render.resolution_y=scene.render.resolution_x;scene.cycles.samples=int(os.environ.get('SHELLY_RENDER_SAMPLES','80'));scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
if os.environ.get('SHELLY_EXPORT')=='1':
 
 # Production reduction keeps the sculpted outline and actual mouth while lowering
 # internal sampling density. Color attributes survive the collapse pass.
 for ob in all_mesh:
     n=sum(len(p.vertices)-2 for p in ob.data.polygons)
     target=4800 if ob is head else 3200 if ob is body else (500 if ob.name.startswith('Eye white') else 360 if ob.name.startswith(('Iris amber','Iris outer','Pupil')) else 440 if ob.name.startswith('Plastron') else 400 if ob.name.startswith('Mouth | recessed') else 720 if ob.name.startswith('Carapace | dark') else 700 if ob.name.startswith('Carapace | soft') else 100000)
     if n>target:
         bpy.context.view_layer.objects.active=ob
         dec=ob.modifiers.new('production silhouette reduction','DECIMATE');dec.ratio=target/n
         bpy.ops.object.modifier_apply(modifier=dec.name)
 # 11 deform/control bones. The fin shafts are child bones, so the root membrane
 # remains soft through cross weights. Root stays fixed for game-driven motion.
 arm=bpy.data.armatures.new('Shelly armature')
 rig=bpy.data.objects.new('ShellyRig',arm);bpy.context.collection.objects.link(rig)
 bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 spec=[('Root',None,(0,0,.10),(0,0,.30)),('Body','Root',(0,.20,.45),(0,.20,.75)),('Neck','Body',(0,-.35,.62),(0,-.50,.95)),('Head','Neck',(0,-.55,1.08),(0,-.8,1.36)),
       ('FlipperFL','Body',(-.46,-.07,.44),(-1.15,-.30,.28)),('FlipperFR','Body',(.46,-.07,.44),(1.15,-.30,.28)),
       ('FlipperRL','Body',(-.46,.75,.44),(-.95,.95,.25)),('FlipperRR','Body',(.46,.75,.44),(.95,.95,.25)),
       ('Tail','Body',(0,.85,.40),(0,1.25,.36)),('EyeL','Head',(-.322,-1.112,1.365),(-.322,-1.25,1.365)),('EyeR','Head',(.322,-1.112,1.365),(.322,-1.25,1.365))]
 for n,parent,h,t in spec:
     b=arm.edit_bones.new(n);b.head=h;b.tail=t
     if parent:b.parent=arm.edit_bones[parent]
 bpy.ops.object.mode_set(mode='OBJECT');rig.select_set(False)
 
 def weights_for(ob,v):
     co=ob.matrix_world@v.co;x,y,z=co
     if ob is body or ob.name.startswith('Flipper scale'):
         w={'Body':1.0}
         if y<-.26 and abs(x)<.48:
             t=clamp((z-.55)/.55);w={'Body':1-t,'Neck':t}
         if y>.87 and abs(x)<.22:
             t=clamp((y-.87)/.28);w={'Body':1-t,'Tail':t}
         if abs(x)>.46:
             front=y<.4
             bone=('FlipperFL' if x<0 else 'FlipperFR') if front else ('FlipperRL' if x<0 else 'FlipperRR')
             t=clamp((abs(x)-.46)/(.40 if front else .30));w={n:a*(1-t) for n,a in w.items()};w[bone]=t
         return {n:a for n,a in w.items() if a>.001}
     if ob.name.startswith(('Eye white','Eye catchlight','Eye small catchlight','Iris','Pupil','Upper eyelid','Lower eyelid')):
         return {'EyeL' if '-1' in ob.name else 'EyeR':1}
     if ob.name.startswith(('Carapace','Plastron')):return {'Body':1}
     return {'Head':1}
 
 for ob in all_mesh:
     if ob.type!='MESH':continue
     groups={n:ob.vertex_groups.new(name=n) for n,*_ in spec}
     for v in ob.data.vertices:
         for n,a in weights_for(ob,v).items():groups[n].add([v.index],a,'REPLACE')
     mod=ob.modifiers.new('Shelly skeletal motion','ARMATURE');mod.object=rig
     ob.parent=rig
 
 # Merge skinned parts after weights are assigned. The shared atlas and eye
 # material then export as just two mesh primitives/draw calls, while all bone
 # weights and painted UV islands remain independently editable in the blend.
 bpy.ops.object.select_all(action='DESELECT')
 for ob in all_mesh:ob.select_set(True)
 bpy.context.view_layer.objects.active=body
 bpy.ops.object.join()
 body.name='Shelly | hero skinned surface'
 all_mesh=[body]
 
 # Anchors are bone parented empties; glTF exports them as named transform nodes.
 def anchor(name,xyz):
     ob=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(ob)
     ob.empty_display_type='SPHERE';ob.empty_display_size=.035
     ob.parent=rig;ob.parent_type='BONE';ob.parent_bone='Head'
     # Set the local matrix so the final rest position lands at the given global point.
     from mathutils import Matrix
     ob.matrix_world=Matrix.Translation(Vector(xyz))
     return ob
 hat=anchor('HatAnchor',(0,-.72,1.80))
 mouthanchor=anchor('MouthAnchor',(0,-1.40,.92))
 
 fps=24
 clips={
  'Idle':(49,{'Body':[(1,0,0,0),(13,.023,0,.008),(25,0,0,0),(37,-.021,0,-.008),(49,0,0,0)],'Head':[(1,0,0,0),(25,.022,0,.014),(49,0,0,0)],'FlipperFL':[(1,0,0,0),(25,.055,0,.01),(49,0,0,0)],'FlipperFR':[(1,0,0,0),(25,-.055,0,-.01),(49,0,0,0)]}),
  'Swim':(25,{'Body':[(1,0,0,0),(7,.035,0,0),(13,0,0,0),(19,-.035,0,0),(25,0,0,0)],'FlipperFL':[(1,0,0,-.20),(7,.23,0,.06),(13,0,0,.18),(19,-.18,0,.05),(25,0,0,-.20)],'FlipperFR':[(1,0,0,.20),(7,-.23,0,-.06),(13,0,0,-.18),(19,.18,0,-.05),(25,0,0,.20)],'FlipperRL':[(1,0,0,0),(7,.10,0,0),(13,0,0,0),(19,-.10,0,0),(25,0,0,0)],'FlipperRR':[(1,0,0,0),(7,-.10,0,0),(13,0,0,0),(19,.10,0,0),(25,0,0,0)],'Head':[(1,-.035,0,0),(13,.038,0,0),(25,-.035,0,0)]}),
  'Turn':(33,{'Body':[(1,0,0,0),(10,0,0,.10),(21,0,0,-.08),(33,0,0,0)],'Neck':[(1,0,0,0),(10,0,0,.12),(21,0,0,-.11),(33,0,0,0)],'Head':[(1,0,0,0),(10,.04,0,.16),(21,.02,0,-.15),(33,0,0,0)],'FlipperFL':[(1,0,0,0),(10,.13,0,0),(21,-.07,0,0),(33,0,0,0)],'FlipperFR':[(1,0,0,0),(10,-.07,0,0),(21,.13,0,0),(33,0,0,0)]}),
  'Happy':(33,{'Body':[(1,0,0,0),(7,-.10,0,0),(12,.12,0,0),(19,0,0,0),(25,.08,0,0),(33,0,0,0)],'Head':[(1,0,0,0),(7,.12,0,0),(12,-.14,0,0),(19,0,0,0),(25,-.07,0,0),(33,0,0,0)],'FlipperFL':[(1,0,0,0),(12,-.28,0,-.13),(25,.18,0,.06),(33,0,0,0)],'FlipperFR':[(1,0,0,0),(12,.28,0,.13),(25,-.18,0,-.06),(33,0,0,0)]}),
  'Curious':(49,{'Neck':[(1,0,0,0),(10,-.04,0,0),(21,-.08,0,0),(36,-.08,0,0),(49,0,0,0)],'Head':[(1,0,0,0),(10,-.08,.025,.12),(21,-.13,.04,.15),(36,-.10,.02,.13),(49,0,0,0)],'FlipperFL':[(1,0,0,0),(21,.07,0,-.05),(49,0,0,0)]}),
  'Celebrate':(49,{'Body':[(1,0,0,0),(8,-.10,0,0),(15,.15,0,0),(24,0,0,0),(31,-.09,0,0),(39,.12,0,0),(49,0,0,0)],'Head':[(1,0,0,0),(15,-.20,0,0),(24,.06,0,0),(39,-.15,0,0),(49,0,0,0)],'FlipperFL':[(1,0,0,0),(15,-.36,0,-.17),(24,.05,0,0),(39,-.34,0,-.15),(49,0,0,0)],'FlipperFR':[(1,0,0,0),(15,.36,0,.17),(24,-.05,0,0),(39,.34,0,.15),(49,0,0,0)],'Tail':[(1,0,0,0),(15,.10,0,0),(24,-.07,0,0),(39,.10,0,0),(49,0,0,0)]})
 }
 rig.animation_data_create()
 eye_scale_keys={
     'Idle':[(32,1),(34,.16),(37,1)],
     'Swim':[(12,1),(14,.28),(17,1)],
     'Happy':[(7,1),(12,.64),(25,.71),(33,1)],
     'Curious':[(10,1),(21,1.10),(36,1.07),(49,1)],
     'Celebrate':[(12,1),(15,.58),(24,1),(31,.18),(34,1)],
 }
 for name,(end,channels) in clips.items():
     rig.animation_data.action=None
     # Every action owns a full rest-pose boundary. Without this, Blender's
     # previous action can leave an unkeyed bone rotated or a blink compressed.
     for pb in rig.pose.bones:
         pb.rotation_mode='XYZ'
         pb.rotation_euler=(0,0,0)
         pb.location=(0,0,0)
         pb.scale=(1,1,1)
         for frame in (1,end):
             pb.keyframe_insert('rotation_euler',frame=frame,group=pb.name)
             pb.keyframe_insert('location',frame=frame,group=pb.name)
             pb.keyframe_insert('scale',frame=frame,group=pb.name)
     for bone,keys in channels.items():
         pb=rig.pose.bones[bone];pb.rotation_mode='XYZ'
         for frame,rx,ry,rz in keys:
             pb.rotation_euler=(rx,ry,rz)
             pb.keyframe_insert('rotation_euler',frame=frame,group=bone)
     for bone in ('EyeL','EyeR'):
         pb=rig.pose.bones[bone]
         for frame,zscale in eye_scale_keys.get(name,[]):
             pb.scale=(1,1,zscale)
             pb.keyframe_insert('scale',frame=frame,group=bone)
     act=rig.animation_data.action;act.name=name
     for fc in act.fcurves:
         for kp in fc.keyframe_points:kp.interpolation='BEZIER'
     track=rig.animation_data.nla_tracks.new();track.name=name
     track.strips.new(name,1,act);track.mute=True
     rig.animation_data.action=None
 rig.animation_data.action=bpy.data.actions['Idle']
 
 
 bpy.ops.object.select_all(action='DESELECT')
 body.select_set(True);rig.select_set(True);hat.select_set(True);mouthanchor.select_set(True);bpy.context.view_layer.objects.active=rig
 OUT=os.path.join(ROOT,'assets/models/shelly.glb')
 bpy.ops.export_scene.gltf(filepath=OUT,export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_apply=False,export_extras=True)
 with open(OUT,'rb') as f:
     f.read(12);ln,typ=struct.unpack('<I4s',f.read(8));glb=json.loads(f.read(ln))
 report={'blender':bpy.app.version_string,'triangles_exported':sum(acc['count']//3 for acc in glb['accessors'] if acc['type']=='SCALAR' and acc['componentType'] in (5123,5125)),'bones':[x.name for x in arm.bones], 'animations':[a['name'] for a in glb.get('animations',[])], 'materials':[m['name'] for m in glb.get('materials',[])], 'skins':len(glb.get('skins',[])), 'glb_bytes':os.path.getsize(OUT),'bounds_source_xyz':[tuple(min(v.co[i] for v in body.data.vertices) for i in range(3)),tuple(max(v.co[i] for v in body.data.vertices) for i in range(3))]}
 with open(os.path.join(PREVIEW,'shelly-report.json'),'w') as f:json.dump(report,f,indent=2)
 print('SHELLY_REPORT',json.dumps(report),flush=True)
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC,'shelly.blend'))
else:
 bpy.ops.wm.save_as_mainfile(filepath=os.path.join(SRC,'shelly-sculpt.blend'))
views={'quarter':(-2.4,-5.8,2.65)}
if os.environ.get('SHELLY_ALL_VIEWS')=='1':
 views={'front':(0,-6.2,2.25),'quarter':(-2.4,-5.8,2.65),'left':(-6.2,0,2.2),'right':(6.2,0,2.2),'back':(0,6.2,2.4),'elevated':(-3.8,-4.5,4.8)}
for label,where in views.items():
 cam.location=where;cam.rotation_euler=(Vector((0,-.15,1.00))-cam.location).to_track_quat('-Z','Y').to_euler()
 scene.render.filepath=os.path.join(PREVIEW,'sculpt-'+label+'.png');bpy.ops.render.render(write_still=True)
 print('SCULPT_RENDER',scene.render.filepath,flush=True)
