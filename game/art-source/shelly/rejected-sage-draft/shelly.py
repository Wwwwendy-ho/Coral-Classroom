"""Shelly: original hand-authored baby sea turtle. Blender Z up, face -Y."""
import bpy, math, os, random, json, struct
def clamp(v,a=0,b=1):return max(a,min(b,v))
from mathutils import Vector
random.seed(12)
ROOT=os.path.abspath(os.path.join(os.path.dirname(__file__),'../..'))
SRC=os.path.join(ROOT,'art-source/shelly'); os.makedirs(SRC,exist_ok=True)
PREVIEW=os.environ.get('SHELLY_REVIEW_DIR','/workspace/work/shelly-reference/sculpt');os.makedirs(PREVIEW,exist_ok=True)
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
 vs=[];fs=[];S=16
 for i in range(9):
  t=i/8;x=side*(.46+(1.0 if front else .58)*t);y=(-.07-.35*t if front else .75+.23*t);z=.44-.24*t+.03*math.sin(t*math.pi)
  width=(.21 if front else .18)*math.sin((t*.93+.07)*math.pi)**.55;thick=.12*(1-t)+.018
  for j in range(S):a=2*math.pi*j/S;vs.append((x,y+width*math.cos(a),z+thick*math.sin(a)))
 for i in range(8):
  for j in range(S):a=i*S+j;b=i*S+(j+1)%S;fs.append((a,b,b+S,a+S))
 fs.extend([tuple(reversed(range(S))),tuple(8*S+j for j in range(S))]);return mesh(('Front' if front else 'Rear')+' flipper '+str(side),vs,fs,SKIN)
parts=[ell('torso',(0,.28,.5),(.60,.78,.38),SKIN),ell('neck',(0,-.40,.76),(.40,.40,.48),SKIN)]
for s in (-1,1):parts.extend([fin(s,True),fin(s,False)])
parts.append(ell('tail',(0,1,.40),(.12,.29,.11),SKIN,20,12))
body=join_remesh(parts,'Body | continuous neck and marine flippers',.027)
# Tall, soft pear forehead with projecting muzzle and smiling lower jaw.
parts=[ell('head',(0,-.72,1.23),(.615,.49,.51),SKIN,40,28),ell('muzzle',(0,-1.08,1.04),(.49,.29,.29),SKIN),ell('jaw',(0,-.99,.84),(.445,.31,.15),SKIN)]
for s in (-1,1):
 parts.append(ell('cheek',(s*.405,-.98,1.02),(.20,.27,.25),SKIN))
 parts.append(ell('orbital skin',(s*.322,-1.025,1.365),(.278,.158,.285),SKIN))
head=join_remesh(parts,'Head | sculpted smiling face',.018)
# Mouth volume physically cuts the face; a recessed liner and tongue live inside it.
cutter=ell('mouth cutter',(0,-1.29,.925),(.375,.31,.135),SKIN,48,24)
for v in cutter.data.vertices:v.co.z+=.055*(v.co.x/.375)**2
bpy.context.view_layer.objects.active=head
bo=head.modifiers.new('open smiling mouth cavity','BOOLEAN');bo.operation='DIFFERENCE';bo.object=cutter;bpy.ops.object.modifier_apply(modifier=bo.name)
all_mesh.remove(cutter);bpy.data.objects.remove(cutter,do_unlink=True)
paint(head,SKIN)
# Color the interior, chin, cheeks softly; geometry color survives export.
a=head.data.color_attributes['Pigment']
for p in head.data.polygons:
 for li in p.loop_indices:
  v=head.data.vertices[head.data.loops[li].vertex_index].co
  mouthq=(v.x/.375)**2+((v.y+1.29)/.31)**2+((v.z-.925)/.135)**2
  if abs(mouthq-1)<.12 and -1.24<v.y<-1.0 and .79<v.z<1.06:a.data[li].color=(.12,.055,.035,1)
  else:
   t=clamp((.97-v.z)/.18)*clamp((-v.y-1.02)/.20)
   a.data[li].color=tuple(SKIN[k]*(1-t)+(.58,.65,.36,1)[k]*t for k in range(4))
ell('Mouth | recessed warm interior',(0,-1.10,.92),(.34,.125,.115),(.105,.035,.022,1),32,16)
ell('Mouth | little pink tongue',(0,-1.30,.843),(.18,.10,.034),(.65,.28,.20,1),24,12)
# Rolled lower lip follows the actual cut, with ends fading into cheeks.
pts=[]
for j in range(25):
 t=-1+2*j/24;pts.append((.357*t,-1.31+.105*t*t,.963-.166*math.sqrt(max(0,1-t*t))))
tube('Mouth | sculpted lower lip',pts,lambda t:.012+.014*math.sin(math.pi*t),(.35,.49,.22,1),10)
for s in (-1,1):
 # Main eyeball emerges only partly out of a broad face, avoiding stalk-like eyes.
 x=s*.322;z=1.365
 ell('Eye white '+str(s),(x,-1.112,z),(.238,.155,.257),(.91,.86,.66,1),40,24,eye_mat)
 ell('Iris outer '+str(s),(x+s*.014,-1.253,z+.004),(.157,.050,.176),(.14,.068,.027,1),32,20,eye_mat)
 ell('Iris amber '+str(s),(x+s*.014,-1.287,z+.008),(.133,.029,.149),(.40,.205,.068,1),32,20,eye_mat)
 ell('Pupil '+str(s),(x+s*.010,-1.310,z+.014),(.093,.020,.116),(.009,.014,.012,1),32,20,eye_mat)
 # Radial iris flecks give amber depth rather than a flat colored disk.
 for j in range(24):
  ang=2*math.pi*j/24;r=.123
  p=(x+s*.014+math.cos(ang)*r,-1.312,z+.008+math.sin(ang)*r*1.12)
  q=(x+s*.014+math.cos(ang)*r*.94,-1.318,z+.008+math.sin(ang)*r*1.04)
  tube('Iris ray '+str(s),[p,q],.004,(.38,.215,.075,1),4)
 ell('Eye catchlight '+str(s),(x-.045,-1.336,z+.074),(.038,.014,.044),(.99,.99,.90,1),16,10,eye_mat)
 ell('Eye small catchlight '+str(s),(x+.052,-1.333,z-.044),(.016,.009,.019),(.9,.98,.95,1),12,8,eye_mat)
 for ob in all_mesh:
  if ob.name.startswith(('Eye white','Iris outer','Iris amber','Pupil','Eye catchlight','Eye small catchlight')) and ob.name.endswith(str(s)):ob.location.y+=.026
  if ob.name.startswith('Iris ray '+str(s)):
   for v in ob.data.vertices:v.co.y+=.026
 # lids arc over the white and tuck into the cheek, not a floating full ring.
 pts=[(x+.236*math.cos(math.pi*.02+math.pi*.96*j/24),-1.16-.032*math.sin(math.pi*j/24),z+.251*math.sin(math.pi*.02+math.pi*.96*j/24)) for j in range(25)]
 tube('Upper eyelid '+str(s),pts,lambda t:.032+.023*math.sin(math.pi*t),SKIN,10)
 pts=[(x+.228*math.cos(math.pi+math.pi*j/24),-1.16-.012*math.sin(math.pi*j/24),z+.245*math.sin(math.pi+math.pi*j/24)) for j in range(25)]
 tube('Lower eyelid '+str(s),pts,lambda t:.017+.010*math.sin(math.pi*t),(.29,.49,.24,1),8)
 ell('Nostril '+str(s),(s*.105,-1.362,1.09),(.024,.012,.017),(.14,.30,.16,1),16,10)
# The head scales are broad and lightly raised: projected irregular tiles, never dots.
def head_front(x,z):
 # Ray cast directly against the actual sculpt.
 hit,loc,norm,idx=head.ray_cast(Vector((x,-3,z)),Vector((0,1,0)))
 return (loc.y,norm) if hit else None
for row,(z,w,n) in enumerate([(1.65,.26,3),(1.56,.30,4),(1.47,.09,2),(1.25,.10,2),(1.17,.19,3)]):
 for j in range(n):
  x=(j-(n-1)/2)*w*2/n+random.uniform(-.012,.012);rx=w/n*random.uniform(.71,.89);rz=random.uniform(.028,.042) if row>2 else random.uniform(.035,.049);z+=random.uniform(-.008,.008)
  ring=[]
  for k in range(7):
   ang=2*math.pi*k/7+random.uniform(-.17,.17);xx=x+rx*math.cos(ang);zz=z+rz*math.sin(ang);h=head_front(xx,zz)
   if h:ring.append((xx,h[0]-.004,zz))
  h=head_front(x,z)
  if h and len(ring)>4:mesh('Forehead | raised scale',[(x,h[0]-.013,z)]+ring,[(0,k+1,(k+1)%len(ring)+1) for k in range(len(ring))],(.23+random.random()*.03,.40+random.random()*.035,.18,1))
for s in (-1,1):
 for j in range(8):
  x=s*(.40+(j%3)*.045);z=1.09-(j//3)*.075;h=head_front(x,z)
  if not h:continue
  vs=[(x,h[0]-.008,z)]
  for k in range(6):
   xx=x+.035*math.cos(k*math.pi/3);zz=z+.026*math.sin(k*math.pi/3);hh=head_front(xx,zz);vs.append((xx,(hh[0] if hh else h[0])-.003,zz))
  mesh('Cheek | tiny scale',vs,[(0,k+1,(k+1)%6+1) for k in range(6)],(.27,.43,.22,1))
# Convex carapace with a true staggered hexagonal scute pattern.
RX=.73;RY=.91;CY=.31
def shellpt(x,y,raisez=0):
 q=(x/RX)**2+((y-CY)/RY)**2
 return (x,y,.69+.45*max(0,1-q)**.65+raisez)
vs=[shellpt(0,CY)];fs=[]
S=64;R=12
for i in range(1,R+1):
 for j in range(S):a=j*2*math.pi/S;vs.append(shellpt(RX*i/R*math.cos(a),CY+RY*i/R*math.sin(a)))
for j in range(S):fs.append((0,1+j,1+(j+1)%S))
for i in range(R-1):
 for j in range(S):a=1+i*S+j;b=1+i*S+(j+1)%S;fs.append((a,a+S,b+S,b))
mesh('Carapace | dark sutures',vs,fs,(.24,.32,.16,1))
# Voronoi cells clipped against oval avoid concentric circular slices.
seeds=[(0,-.30),(0,.17),(0,.65),(-.46,-.15),(.46,-.15),(-.48,.36),(.48,.36),(-.38,.82),(.38,.82)]
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
 poly=[(cx+(x-cx)*.978,cy+(y-cy)*.978) for x,y in poly]
 dense=[]
 for a,b in zip(poly,poly[1:]+poly[:1]):
  n=max(1,int(math.dist(a,b)/.055))
  for step in range(n):
   t=step/n;dense.append((a[0]+t*(b[0]-a[0]),a[1]+t*(b[1]-a[1])))
 poly=dense
 # Subdivided concentric loops inside each polygon, gentle pillow bevel.
 vs=[shellpt(cx,cy,.032)];fs=[];N=len(poly)
 for r in (.18,.36,.54,.72,.86,.94,1):
  for x,y in poly:vs.append(shellpt(cx+(x-cx)*r,cy+(y-cy)*r,.025+.014*math.sin(r*math.pi)))
 for j in range(N):fs.append((0,1+j,1+(j+1)%N))
 for ring in range(6):
  for j in range(N):a=1+ring*N+j;b=1+ring*N+(j+1)%N;fs.append((a,a+N,b+N,b))
 mesh('Carapace | scute %02d'%i,vs,fs,(.40+random.uniform(-.04,.04),.35+random.uniform(-.035,.035),.13+random.uniform(-.025,.025),1))
pts=[shellpt(RX*.99*math.cos(j*2*math.pi/64),CY+RY*.99*math.sin(j*2*math.pi/64),-.01) for j in range(65)]
tube('Carapace | soft golden edge',pts,.041,(.69,.64,.36,1),10)
ell('Plastron | warm cream belly',(0,.28,.29),(.55,.72,.17),CREAM,32,16)
# Slight scale pattern along the broad flippers.
for s in (-1,1):
 for j in range(7):
  x=s*(.75+j*.075);y=-.07-.35*((abs(x)-.46)/1.0);z=.44-.24*((abs(x)-.46)/1.0)+.075
  ell('Flipper scale '+str(s),(x,y,z),(.046,.072,.007),(.28,.43,.22,1),12,6)
# Studio review with filmic broad lighting and a warm pastel cyclorama.
world=bpy.context.scene.world;world.use_nodes=True;world.node_tree.nodes['Background'].inputs[0].default_value=(.42,.52,.49,1);world.node_tree.nodes['Background'].inputs[1].default_value=.45
for name,loc,energy,color,size in [('Key',(-3,-4,5),320,(1,.88,.72),4),('Fill',(3,-2,3),160,(.72,.87,1),3),('Rim',(1,3,4),350,(1,.88,.59),3)]:
 bpy.ops.object.light_add(type='AREA',location=loc);o=bpy.context.object;o.name=name;o.data.energy=energy;o.data.color=color;o.data.size=size;o.rotation_euler=(Vector((0,-.3,1))-o.location).to_track_quat('-Z','Y').to_euler()
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.04));floor=bpy.context.object;floor.name='Studio floor'
fm=bpy.data.materials.new('Studio sand');fm.diffuse_color=(.63,.70,.66,1);floor.data.materials.append(fm)
bpy.ops.object.camera_add(location=(2.4,-5.8,2.65));cam=bpy.context.object;cam.name='Portrait camera';cam.rotation_euler=(Vector((0,-.15,.90))-cam.location).to_track_quat('-Z','Y').to_euler();cam.data.type='ORTHO';cam.data.ortho_scale=3.5
scene=bpy.context.scene;scene.camera=cam;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=64;scene.cycles.use_denoising=False;bpy.context.view_layer.cycles.use_denoising=False
scene.render.resolution_x=850;scene.render.resolution_y=850;scene.render.resolution_percentage=100;scene.view_settings.view_transform='AgX';scene.render.image_settings.file_format='PNG'
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
scene.render.filepath=os.path.join(PREVIEW,'sculpt-front.png');bpy.ops.render.render(write_still=True)
print('SCULPT_RENDER',scene.render.filepath,flush=True)
