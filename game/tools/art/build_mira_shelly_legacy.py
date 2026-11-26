"""Build Mira's review candidate from the accepted organic Shelly family surface.

blender -b --factory-startup --python tools/art/build_mira.py -- --output /workspace/work/mira-production
blender -b --factory-startup --python tools/art/build_mira.py -- --output /workspace/work/mira-production --render

This does not modify runtime assets. Source is the packed accepted natural-beak
Shelly, not the historical procedural turtle. Mira receives distinct proportions,
natural pigments, sculpted fitted equipment and her own three authored clips.
"""
import argparse,hashlib,json,math,struct,sys
from pathlib import Path
import bpy,bmesh,numpy as np
from mathutils import Vector
ROOT=Path(__file__).resolve().parents[2]
P=argparse.ArgumentParser();P.add_argument('--close-tris',type=int,default=15500);P.add_argument('--board-tris',type=int,default=7000);P.add_argument('--output',type=Path,default=ROOT/'art-source/npcs/mira/production');P.add_argument('--render',action='store_true');P.add_argument('--size',type=int,default=512);P.add_argument('--tier',choices=['close','board'],default='close');P.add_argument('--views',default='all');a=P.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
CLOSE_TRIS=a.close_tris;BOARD_TRIS=a.board_tris;OUT=a.output;OUT.mkdir(parents=True,exist_ok=True)
def ease(a,b,x):
 t=max(0.,min(1.,(x-a)/(b-a)));return t*t*(3-2*t)
def shape(p):
 x,y,z=p;h=ease(.79,1.00,z)
 body=Vector((x*1.14,y*1.16,z*1.17))
 head=Vector((x*.88,-.25+(y+.25)*.88-.035,1.2+(z-1.2)*.88+.14))
 q=body.lerp(head,h)
 # Older juvenile front flippers have longer, more tapered reach.
 front=ease(.32,.57,abs(x))*(1-ease(.39,.64,z))*(1-ease(-.12,.08,y))
 q.x*=1+.12*front;q.y-=.06*front
 return q

def load_doc(path):
 data=path.read_bytes();n=struct.unpack_from('<I',data,12)[0];return json.loads(data[20:20+n])

def report(path):
 d=load_doc(path);ps=[p for m in d['meshes'] for p in m['primitives']]
 return {'path':str(path),'bytes':path.stat().st_size,'triangles':sum(d['accessors'][p['indices']]['count']//3 for p in ps),'mesh_count':len(d['meshes']),'primitive_count':len(ps),'materials':len(d.get('materials',[])),'skins':len(d.get('skins',[])),'bones':len(d['skins'][0]['joints']),'clips':[v['name'] for v in d.get('animations',[])],'maps':len(d.get('images',[]))}

if a.render:
 bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
 RENDER=OUT/(a.tier+'-proof');RENDER.mkdir(exist_ok=True)
 bpy.ops.import_scene.gltf(filepath=str(OUT/('mira-'+a.tier+'.glb')))
 rig=next(o for o in bpy.context.scene.objects if o.type=='ARMATURE')
 meshes=[o for o in bpy.context.scene.objects if o.type=='MESH']
 scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=24;scene.cycles.use_denoising=False
 scene.render.resolution_x=scene.render.resolution_y=a.size;scene.render.resolution_percentage=100;scene.render.image_settings.file_format='PNG'
 scene.world.use_nodes=True;scene.world.node_tree.nodes['Background'].inputs['Color'].default_value=(.50,.55,.56,1);scene.world.node_tree.nodes['Background'].inputs['Strength'].default_value=.6;scene.view_settings.view_transform='Standard';scene.view_settings.look='Medium High Contrast'
 center=Vector((0,0,.86))
 for name,loc,power,size in [('soft daylight',(3,-5,6),500,5),('fill',(-4,-2,4),300,5),('back',(1,4,5),400,4)]:
  data=bpy.data.lights.new(name,'AREA');data.energy=power;data.shape='DISK';data.size=size;o=bpy.data.objects.new(name,data);scene.collection.objects.link(o);o.location=loc;o.rotation_euler=(center-o.location).to_track_quat('-Z','Y').to_euler()
 camdata=bpy.data.cameras.new('Mira review');cam=bpy.data.objects.new('Mira review',camdata);scene.collection.objects.link(cam);scene.camera=cam;camdata.type='ORTHO';camdata.ortho_scale=2.13
 rig.animation_data_create()
 for t in rig.animation_data.nla_tracks:t.mute=True
 for clip,frame,views in [('Idle',1,[('front',0),('quarter',45),('right',90),('left',-90),('back',180)]),('Listen',24,[('attentive',25)]),('React',18,[('reaction',-25)])]:
  rig.animation_data.action=next(v for v in bpy.data.actions if v.name.startswith(clip));scene.frame_set(frame);bpy.context.view_layer.update()
  for name,angle in views:
   if a.views!='all' and name not in a.views.split(','):continue
   theta=math.radians(angle);cam.location=center+Vector((math.sin(theta)*5,-math.cos(theta)*5,.85));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(RENDER/(name+'.png'));bpy.ops.render.render(write_still=True)
 if a.tier=='close':
  rig.animation_data.action=next(v for v in bpy.data.actions if v.name.startswith('Idle'));scene.frame_set(1)
  center=Vector((0,-.32,1.37));camdata.ortho_scale=1.08
  for name,angle in [('face-front',0),('face-quarter',45)]:
   if a.views!='all' and name not in a.views.split(','):continue
   t=math.radians(angle);cam.location=center+Vector((math.sin(t)*5,-math.cos(t)*5,.35));cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(RENDER/(name+'.png'));bpy.ops.render.render(write_still=True)
 (RENDER/'proof-manifest.json').write_text(json.dumps({'source':str(OUT/('mira-'+a.tier+'.glb')),'sha256':hashlib.sha256((OUT/('mira-'+a.tier+'.glb')).read_bytes()).hexdigest(),'renderer':'Blender Cycles CPU, 24 samples, neutral daylight','resolution':[a.size,a.size],'views_requested':a.views,'frame_states':{'Idle':1,'Listen':24,'React':18}},indent=2))
 print('MIRA_RENDER_COMPLETE',flush=True);raise SystemExit

bpy.ops.wm.open_mainfile(filepath=str(ROOT/'art-source/shelly/natural-mouth/shelly.blend'))
body=next(o for o in bpy.data.objects if o.type=='MESH' and len(o.data.vertices)>1000)
rig=next(o for o in bpy.data.objects if o.type=='ARMATURE')
for o in list(bpy.data.objects):
 if o not in (body,rig):bpy.data.objects.remove(o,do_unlink=True)
rig.animation_data_clear()
for act in list(bpy.data.actions):bpy.data.actions.remove(act)
for bone in rig.pose.bones:bone.rotation_mode='XYZ';bone.location=(0,0,0);bone.rotation_euler=(0,0,0);bone.scale=(1,1,1)
bpy.context.scene.frame_set(1);bpy.context.view_layer.update()
body.name='Mira | continuous organic family surface';rig.name='MiraRig';rig.data.name='Mira 11-joint conversation rig'
# The atlas keeps the accepted A eyes and face detail while replacing pigments.
mat=body.data.materials[0];color=next(n.image for n in mat.node_tree.nodes if n.type=='TEX_IMAGE' and n.image.size[0]==2048)
src=np.array(color.pixels[:],dtype=np.float32).reshape(2048,2048,4)
r,g,b=src[:,:,:3].transpose(2,0,1).copy()
# Convert blue skin into seafoam without changing the natural ivory muzzle.
blue=(b>r*1.07)&(g>r*1.01)&(b>.18);mint=np.stack((.56*r+.27*g,.66*g+.17*b,.50*b+.25*g),axis=-1)
src[:,:,:3][blue]=mint[blue]
# Lavender shell becomes matte slate/sage. This flattens decorative pearl tracery;
# the original sculpted scute edges remain visible as actual relief.
shell=(b>g*1.06)&(b>r*1.04)&(r>.16)
luma=(r+g+b)/3
shellrgb=np.stack((.28+.12*luma,.39+.14*luma,.43+.17*luma),axis=-1)
src[:,:,:3][shell]=shellrgb[shell]
# Pink blush is subdued into the warm cream pigment of a coastal juvenile.
pink=(r>g*1.08)&(r>b*.92)&(r>.48)&(b>.30)
src[:,:,:3][pink]=src[:,:,:3][pink]*np.array([.96,1.06,.96])
# Recolor the amber/magenta irises through their geometric UV footprints only.
mesh=body.data;uv=mesh.uv_layers.active.data
for poly in mesh.polygons:
 points=[mesh.vertices[mesh.loops[i].vertex_index].co for i in poly.loop_indices]
 c=sum(points,Vector())/len(points)
 flipper_weight=max((sum(g.weight for g in mesh.vertices[mesh.loops[li].vertex_index].groups if body.vertex_groups[g.group].name.startswith('Flipper')) for li in poly.loop_indices),default=0)
 is_shell=(.20<c.z<.89 and c.y>-.34 and (flipper_weight<.50 or c.z>.30))
 if not is_shell and (c.z<1.08 or c.y>-.39):continue
 # Rasterize local triangle into original image; only the saturated iris is tinted.
 t=np.array([uv[i].uv[:] for i in poly.loop_indices])*2047
 x0,y0=np.floor(t.min(axis=0)).astype(int);x1,y1=np.ceil(t.max(axis=0)).astype(int);x0=max(0,x0);y0=max(0,y0);x1=min(2047,x1);y1=min(2047,y1)
 if x1<x0 or y1<y0:continue
 yy,xx=np.mgrid[y0:y1+1,x0:x1+1];p0,p1,p2=t[:3];den=(p1[1]-p2[1])*(p0[0]-p2[0])+(p2[0]-p1[0])*(p0[1]-p2[1])
 if abs(den)<1e-6:continue
 u=((p1[1]-p2[1])*(xx-p2[0])+(p2[0]-p1[0])*(yy-p2[1]))/den;v=((p2[1]-p0[1])*(xx-p2[0])+(p0[0]-p2[0])*(yy-p2[1]))/den
 patch=src[y0:y1+1,x0:x1+1,:3];mx=patch.max(axis=-1);mn=patch.min(axis=-1);sat=mx-mn
 mask=(u>=-.02)&(v>=-.02)&(u+v<=1.02)&(sat>.16)&(patch[:,:,0]>patch[:,:,1]*1.2)&(mx<.96)
 value=patch.mean(axis=-1);recol=np.stack((value*.36,value*.95,value*.81),axis=-1)
 if is_shell:
  mask=(u>=-.04)&(v>=-.04)&(u+v<=1.04)
  q=np.sin(xx*.063+yy*.021)*.006+np.sin(xx*.015-yy*.041)*.008
  recol=np.stack((.16+q,.245+q,.27+q),axis=-1)
 patch[mask]=recol[mask]
# v13 plush eye pass: glossy eye-globe roughness mask, crisp twin catchlights, warm cheek blush.
mesh.calc_loop_triangles()
EYE_NAMES=('EyeL','EyeR');eye_gi=[body.vertex_groups[n].index for n in EYE_NAMES]
eye_w=np.zeros((2,len(mesh.vertices)),np.float32)
for v in mesh.vertices:
 for g in v.groups:
  for k in (0,1):
   if g.group==eye_gi[k]:eye_w[k,v.index]=g.weight
vco=np.array([v.co[:] for v in mesh.vertices],np.float32)
eye_vert=(eye_w>.55)&(vco[None,:,2]>1.0)&(vco[None,:,1]<-.2)
eye_center=[(vco[eye_vert[k]].min(axis=0)+vco[eye_vert[k]].max(axis=0))/2 for k in (0,1)]
print('MIRA_EYE_CENTERS',[c.tolist() for c in eye_center],[int(e.sum()) for e in eye_vert],flush=True)
eye_mask=np.zeros((2048,2048),np.float32)
def tri_pixels(uvs,pos):
 t=np.array(uvs)*2047;x0,y0=np.floor(t.min(axis=0)).astype(int);x1,y1=np.ceil(t.max(axis=0)).astype(int);x0=max(0,x0);y0=max(0,y0);x1=min(2047,x1);y1=min(2047,y1)
 if x1<x0 or y1<y0:return None
 yy,xx=np.mgrid[y0:y1+1,x0:x1+1];p0,p1,p2=t;den=(p1[1]-p2[1])*(p0[0]-p2[0])+(p2[0]-p1[0])*(p0[1]-p2[1])
 if abs(den)<1e-6:return None
 u=((p1[1]-p2[1])*(xx-p2[0])+(p2[0]-p1[0])*(yy-p2[1]))/den;v=((p2[1]-p0[1])*(xx-p2[0])+(p0[0]-p2[0])*(yy-p2[1]))/den
 m=(u>=-.03)&(v>=-.03)&(u+v<=1.03)
 P=u[...,None]*pos[0]+v[...,None]*pos[1]+(1-u-v)[...,None]*pos[2]
 return yy,xx,m,P
cheek_target=[]
for k,side in ((0,-1),(1,1)):
 c=eye_center[k];target=c+np.array([side*.075,-.045,-.17],np.float32)
 non_eye=np.where((~eye_vert[0])&(~eye_vert[1])&(vco[:,1]<-.28)&(vco[:,2]>.95))[0]
 j=non_eye[np.argmin(np.linalg.norm(vco[non_eye]-target,axis=1))];cheek_target.append(vco[j])
print('MIRA_CHEEK_CENTERS',[c.tolist() for c in cheek_target],flush=True)
BLUSH=np.array([250,118,116],np.float32)/255
uvdata=mesh.uv_layers.active.data
cache=[];coverage=np.zeros((2048,2048),np.float32);protect=np.zeros((2048,2048),np.float32)
for tri in mesh.loop_triangles:
 vi=list(tri.vertices);uvs=[uvdata[i].uv[:] for i in tri.loops];pos=np.array([vco[i] for i in vi],np.float32)
 r=tri_pixels(uvs,pos)
 if r is None:continue
 yy,xx,m,P=r;k=0 if all(eye_vert[0][i] for i in vi) else (1 if all(eye_vert[1][i] for i in vi) else None)
 sl=np.s_[yy.min():yy.max()+1,xx.min():xx.max()+1]
 coverage[sl]=np.maximum(coverage[sl],m.astype(np.float32))
 if min(np.linalg.norm(pos.mean(axis=0)-eye_center[j]) for j in (0,1))<.27:protect[sl]=np.maximum(protect[sl],m.astype(np.float32))
 cache.append((k,pos,sl,m,P))
# Plush skin pass: normalized (masked) blur removes scan cracks and scute speckle everywhere except the lashed eye zone.
from scipy.ndimage import gaussian_filter
cov=gaussian_filter(coverage,2.6)+1e-4;soft=np.stack([gaussian_filter(src[:,:,c]*coverage,2.6)/cov for c in range(3)],axis=-1)
keep=gaussian_filter(protect,3.0)[...,None];blend=np.where(coverage[...,None]>0,1-keep,0)*.92
src[:,:,:3]=src[:,:,:3]*(1-blend)+soft*blend
for k,pos,sl,m,P in cache:
 if k is None:
  # Warm cheek blush on face skin near either cheek target (never on eye globes).
  if min(np.linalg.norm(pos.mean(axis=0)-cheek_target[j]) for j in (0,1))>.20 or pos[:,2].mean()<.95:continue
  d=np.minimum(np.linalg.norm(P-cheek_target[0],axis=-1),np.linalg.norm(P-cheek_target[1],axis=-1))
  w=np.exp(-(d/.085)**2)*.62*m
  patch=src[sl][:,:,:3];patch[:]=patch+(BLUSH-patch)*w[...,None]
  continue
 c=eye_center[k];d=P-c;d=d/np.maximum(np.linalg.norm(d,axis=-1,keepdims=True),1e-6)
 eye_mask[sl]=np.maximum(eye_mask[sl],m.astype(np.float32))
 front=d[...,1]<-.25
 # Big upper-inner catchlight and small lower-outer twin, anchored to the eye globe direction.
 big=np.sqrt((d[...,0]+.30)**2+(d[...,2]-.36)**2)<.150
 small=np.sqrt((d[...,0]-.26)**2+(d[...,2]+.26)**2)<.072
 patch=src[sl][:,:,:3];patch[(big|small)&front&m]=1.0
eye_mask=np.asarray(eye_mask)
# Accessory strip occupies the right 20%; original charts are resized consistently.
W=2048;BODYW=1640
atlas=np.empty_like(src);idx=np.minimum(2047,(np.arange(BODYW)/BODYW*2048).astype(int));atlas[:,:BODYW]=src[:,idx];atlas[:,BODYW:]=(.45,.45,.45,1)
eye_atlas=np.zeros_like(eye_mask);eye_atlas[:,:BODYW]=eye_mask[:,idx]
PATCHES={'canvas':((.77,.29,.23),.84,0),'leather':((.24,.29,.26),.73,0),'brass':((.60,.37,.16),.35,.68),'lens':((.12,.34,.39),.22,.08),'paper':((.86,.81,.63),.87,0),'stitch':((.92,.75,.47),.82,0),'gasket':((.11,.16,.16),.83,0)}
rect={};yy,xx=np.mgrid[0:2048,0:408]
for i,(name,(rgb,rough,metal)) in enumerate(PATCHES.items()):
 y0=i*288;y1=y0+276;rect[name]=(1648,y0+8,392,260)
 weave=np.sin(xx*.9)*np.sin(yy*1.5)*.012+np.sin(xx*.16+yy*.21)*.008
 grain=np.random.default_rng(87+i).normal(0,.005,(2048,408))
 for k in range(3):atlas[y0:y1,BODYW:,k]=np.clip(rgb[k]+weave[y0:y1]+grain[y0:y1],0,1)
 atlas[y0:y1,BODYW:,3]=1
# Baked soft blue reflection on the opaque convex lenses, never alpha blending.
x0,y0,w,h=rect['lens'];ly,lx=np.mgrid[0:h,0:w];shine=np.exp(-(((lx/w-.27)/.21)**2+((ly/h-.73)/.17)**2))*.21
atlas[y0:y0+h,x0:x0+w,:3]+=shine[:,:,None]
for loop in uv:loop.uv.x*=BODYW/W
base=bpy.data.images.new('Mira coastal skin, scutes and canvas | 2K',width=W,height=W);base.pixels=atlas.ravel();base.filepath_raw=str(OUT/'mira-color-2048.jpg');base.file_format='JPEG';base.save();base=bpy.data.images.load(str(OUT/'mira-color-2048.jpg'),check_existing=False)
surf=np.ones((512,512,4),dtype=np.float32);surf[:,:,0]=1;surf[:,:,1]=.74;surf[:,:,2]=0
for name,(_,rough,metal) in PATCHES.items():
 x,y,w,h=rect[name];surf[y//4:(y+h)//4,x//4:(x+w)//4,1]=rough;surf[y//4:(y+h)//4,x//4:(x+w)//4,2]=metal
# v13: glossy eye globes (.12 roughness) while skin/scutes stay matte .74.
em=np.clip(eye_atlas.reshape(512,4,512,4).mean(axis=(1,3))*1.6,0,1);surf[:,:,1]=surf[:,:,1]*(1-em)+.12*em
surface=bpy.data.images.new('Mira packed occlusion roughness metallic | 512',width=512,height=512);surface.colorspace_settings.name='Non-Color';surface.pixels=surf.ravel();surface.filepath_raw=str(OUT/'mira-surface-512.png');surface.file_format='PNG';surface.save()
mat.name='Mira | natural coastal pigments and worn field kit';nodes=mat.node_tree.nodes;nodes.clear();links=mat.node_tree.links
bs=nodes.new('ShaderNodeBsdfPrincipled');bs.inputs['Roughness'].default_value=.74;bs.inputs['Specular IOR Level'].default_value=.28
tex=nodes.new('ShaderNodeTexImage');tex.image=base;links.new(tex.outputs['Color'],bs.inputs['Base Color'])
st=nodes.new('ShaderNodeTexImage');st.image=surface;split=nodes.new('ShaderNodeSeparateColor');links.new(st.outputs['Color'],split.inputs[0]);links.new(split.outputs['Green'],bs.inputs['Roughness']);links.new(split.outputs['Blue'],bs.inputs['Metallic'])
out=nodes.new('ShaderNodeOutputMaterial');links.new(bs.outputs[0],out.inputs[0])
# Proportion changes and bone rest positions use the same smooth mapping.
for v in body.data.vertices:
 source_co=v.co.copy()
 # The accepted source's broad flipper fields reach the marginal scutes.
 # Keep Mira's actual carapace rigid while the flipper roots retain their
 # lower, forward surface and their smooth distal motion.
 if .30<source_co.z<.89 and source_co.y>-.34:
  for gi in [g.group for g in v.groups]:body.vertex_groups[gi].remove([v.index])
  body.vertex_groups['Body'].add([v.index],1,'REPLACE')
 v.co=shape(source_co)
bpy.context.view_layer.objects.active=rig;rig.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
for bone in rig.data.edit_bones:bone.head=shape(bone.head);bone.tail=shape(bone.tail)
bpy.ops.object.mode_set(mode='OBJECT')
# Accessories are modeled with rounded continuous surfaces, then joined and
# weighted to Head or Body. Every accessory has a complete back surface.
parts=[]
def finish(obj,name,patch,bone='Body'):
 obj.name=name
 bpy.context.view_layer.objects.active=obj;bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
 if not obj.data.uv_layers:obj.data.uv_layers.new(name='UVMap')
 layer=obj.data.uv_layers.active
 x,y,w,h=rect[patch]
 for d in layer.data:d.uv=((x+d.uv.x*w)/W,(y+d.uv.y*h)/W)
 obj.data.materials.clear();obj.data.materials.append(mat)
 for p in obj.data.polygons:p.use_smooth=True
 obj.vertex_groups.new(name=bone).add(list(range(len(obj.data.vertices))),1,'REPLACE');parts.append(obj);return obj

def rounded(name,loc,scale,patch,bevel=.025,bone='Body'):
 bpy.ops.mesh.primitive_cube_add(size=1,location=loc);o=bpy.context.object;o.scale=scale;bpy.ops.object.transform_apply(location=False,rotation=False,scale=True)
 mod=o.modifiers.new('Soft sewn corners','BEVEL');mod.width=bevel;mod.segments=3;bpy.ops.object.modifier_apply(modifier=mod.name)
 return finish(o,name,patch,bone)

def tube(name,points,r,patch,bone='Body',res=6):
 points=[Vector(p) for p in points]
 # Dense supplied loops are used directly. Sparse sewing paths get cardinal interpolation.
 if len(points)<12:
  expanded=[]
  for i in range(len(points)-1):
   a,b,c,d=points[max(0,i-1)],points[i],points[i+1],points[min(len(points)-1,i+2)]
   for j in range(4):
    t=j/4;expanded.append(b+.5*t*((c-a)+t*((2*a-5*b+4*c-d)+t*(3*b-3*c+d-a))))
  points=expanded+[points[-1]]
 verts=[];faces=[]
 for i,p in enumerate(points):
  tangent=(points[min(len(points)-1,i+1)]-points[max(0,i-1)]).normalized()
  helper=Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((0,1,0))
  n=tangent.cross(helper).normalized();v=tangent.cross(n).normalized()
  for j in range(res):
   t=j*math.tau/res;verts.append(tuple(p+r*(math.cos(t)*n+math.sin(t)*v)))
 for i in range(len(points)-1):
  for j in range(res):faces.append((i*res+j,i*res+(j+1)%res,(i+1)*res+(j+1)%res,(i+1)*res+j))
 faces.extend([tuple(range(res))[::-1],tuple(range((len(points)-1)*res,len(points)*res))])
 me=bpy.data.meshes.new(name);me.from_pydata(verts,[],faces);me.uv_layers.new()
 for p in me.polygons:
  for li in p.loop_indices:
   vi=me.loops[li].vertex_index;me.uv_layers.active.data[li].uv=((vi%res)/(res-1),(vi//res)/(len(points)-1))
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return finish(o,name,patch,bone)

def ribbon(name,points,width,patch,bone='Body'):
 vertices=[];faces=[]
 for i,p in enumerate(points):
  p=Vector(p);before=Vector(points[max(0,i-1)]);after=Vector(points[min(len(points)-1,i+1)]);t=(after-before).normalized();side=t.cross(Vector((0,-1,0))).normalized()*width/2
  for d in [-.005,.005]:vertices.extend([tuple(p-side+Vector((0,d,0))),tuple(p+side+Vector((0,d,0)))])
 for i in range(len(points)-1):
  j=i*4;k=j+4
  faces.extend([(j,k,k+1,j+1),(j+2,j+3,k+3,k+2),(j,j+2,k+2,k),(j+1,k+1,k+3,j+3)])
 faces.extend([(0,1,3,2),(len(vertices)-4,len(vertices)-2,len(vertices)-1,len(vertices)-3)])
 me=bpy.data.meshes.new(name);me.from_pydata(vertices,[],faces);me.uv_layers.new()
 for p in me.polygons:
  for j,i in enumerate(p.loop_indices):me.uv_layers.active.data[i].uv=((j%2)*.9+.05,(me.loops[i].vertex_index//4)/(len(points)-1)*.9+.05)
 o=bpy.data.objects.new(name,me);bpy.context.collection.objects.link(o);return finish(o,name,patch,bone)

# Forehead goggles sit above the eye orbit. Oval metal rims have dark gaskets,
# sculpted convex tinted lenses, a bridge and a broad cloth retaining band.
N=Vector((0,-.68,.733)).normalized();H=Vector((1,0,0));V=N.cross(H).normalized()
for side in [-1,1]:
 c=Vector((side*.166,-.478,1.571))
 for name,rx,ry,r,patch,depth in [('gasket',.145,.106,.023,'gasket',0),('rim',.145,.106,.015,'brass',.020)]:
  pts=[tuple(c+H*(rx*math.cos(i*math.tau/32))+V*(ry*math.sin(i*math.tau/32))+N*depth) for i in range(33)]
  tube(f'{name} of forehead goggle {side}',pts,r,patch,'Head')
 # Convex lens is a UV mapped radial cap, with a full opaque back.
 verts=[tuple(c+N*.028)];uvs=[(.5,.5)];faces=[]
 for ring in range(1,5):
  rr=ring/4
  for i in range(32):
   t=i*math.tau/32;verts.append(tuple(c+H*(.128*rr*math.cos(t))+V*(.089*rr*math.sin(t))+N*(.012+.016*(1-rr*rr))));uvs.append((.5+.48*rr*math.cos(t),.5+.48*rr*math.sin(t)))
 for i in range(32):faces.append((0,1+i,1+(i+1)%32))
 for ring in range(3):
  for i in range(32):
   j=1+ring*32+i;k=1+ring*32+(i+1)%32;faces.append((j,j+32,k+32,k))
 faces.append(tuple(range(97,129))[::-1]);me=bpy.data.meshes.new('convex goggle lens');me.from_pydata(verts,[],faces);me.uv_layers.new()
 for p in me.polygons:
  for li in p.loop_indices:me.uv_layers.active.data[li].uv=uvs[me.loops[li].vertex_index]
 o=bpy.data.objects.new('Blue optical glass',me);bpy.context.collection.objects.link(o);finish(o,'Blue optical glass', 'lens','Head')
 # One restrained functional rivet per side.
 rounded('Goggle side hinge',(side*.321,-.46,1.56),(.032,.028,.045),'brass',.009,'Head')
tube('Flexible nose bridge',[(-.025,-.485,1.58),(0,-.497,1.591),(.025,-.485,1.58)],.012,'brass','Head')
# A fitted band follows the back of the skull; it never covers the eyes.
band=[]
headpoints=np.array([v.co[:] for v in body.data.vertices if 1.445<v.co.z<1.535])
for i in range(49):
 theta=.97+(math.tau-1.94)*i/48
 direction=np.array([math.sin(theta),-math.cos(theta)])
 local=headpoints[:,:2]-np.array([0,-.285]);radii=np.linalg.norm(local,axis=1)
 alignment=local@direction/np.maximum(.001,radii)
 near=radii[alignment>.975];radius=float(np.percentile(near,95))+.008 if len(near) else .31
 band.append((direction[0]*radius,-.285+direction[1]*radius,1.493))
for _ in range(3):
 band=[band[0]]+[tuple((Vector(band[i-1])+2*Vector(band[i])+Vector(band[i+1]))/4) for i in range(1,len(band)-1)]+[band[-1]]
ribbon('Goggle woven head band',band,.055,'leather','Head')
# Coral canvas map satchel. Rounded bag, folded flap, piping, stitching and clasp.
bag=rounded('Coral canvas field satchel',(-.588,.016,.505),(.267,.184,.303),'canvas',.043)
flap=rounded('Rounded overhanging satchel flap',(-.588,-.089,.578),(.281,.045,.175),'canvas',.028)
tube('Satchel flap piping',[(-.714,-.117,.626),(-.71,-.117,.53),(-.67,-.118,.501),(-.52,-.118,.501),(-.454,-.117,.53),(-.45,-.117,.626)],.005,'stitch')
rounded('Short leather fastening tab',(-.583,-.12,.514),(.039,.019,.087),'leather',.008)
rounded('Brass clasp',(-.583,-.134,.508),(.043,.012,.032),'brass',.008)
# Fit the diagonal to the actual organic breast rather than an assumed plane.
points=np.array([v.co[:] for v in body.data.vertices])
strap=[]
for sx,sz in [(.29,.96),(.23,.89),(.14,.81),(.02,.75),(-.11,.69),(-.25,.64),(-.39,.615)]:
 d=(points[:,0]-sx)**2+(points[:,2]-sz)**2;near=points[d<.045**2]
 sy=float(near[:,1].min())-.018 if len(near) else -.55
 strap.append((sx,sy,sz))
strap.extend([(-.49,-.23,.62),(-.58,-.045,.64)])
ribbon('Crossbody woven webbing',strap,.059,'leather')
# Matching return strap lies along the shell, preserving complete rear views.
ribbon('Back of crossbody webbing',[(.278,-.051,.985),(.32,.10,.955),(.27,.35,.908),(.10,.52,.82),(-.12,.54,.706),(-.36,.36,.602),(-.56,.12,.594)],.055,'leather')
rounded('Strap adjuster',(.14,strap[2][1]-.012,.81),(.075,.021,.063),'brass',.008)
rounded('Strap adjuster inset',(.14,strap[2][1]-.025,.81),(.044,.009,.038),'leather',.004)
# Rolled chart peeking out behind flap, with visible concentric paper at top.
bpy.ops.mesh.primitive_cylinder_add(vertices=24,radius=.047,depth=.28,location=(-.62,.048,.733));o=bpy.context.object;o.rotation_euler[1]=-.12;finish(o,'Rolled coastal chart','paper')
for rad in [.043,.032,.021,.011]:
 pts=[(-.637+rad*math.cos(t*math.tau/32),.048+rad*math.sin(t*math.tau/32),.875) for t in range(33)];tube('Paper spiral at chart end',pts,.0025,'leather')
# Keep organic family mesh at 17.6K so fitted equipment fits the close budget.
bpy.ops.object.select_all(action='DESELECT');body.select_set(True);bpy.context.view_layer.objects.active=body
mod=body.modifiers.new('Mira close organic budget','DECIMATE');mod.ratio=17600/23836;mod.use_collapse_triangulate=True
while body.modifiers.find(mod.name)>0:bpy.ops.object.modifier_move_up(modifier=mod.name)
bpy.ops.object.modifier_apply(modifier=mod.name)
for o in parts:o.select_set(True)
bpy.context.view_layer.objects.active=body;bpy.ops.object.join()
# Remove accidental duplicate material slots after the join.
for p in body.data.polygons:p.material_index=0
while len(body.data.materials)>1:body.data.materials.pop(index=1)
for p in body.data.polygons:p.use_smooth=True
body.parent=rig
# Authored decisive eye focus, relaxed lids, listening lean and exploratory turn.
clips={
 'Idle':(73,{'Body':[(1,0,0,0),(25,.012,0,.008),(49,-.010,0,-.008),(73,0,0,0)],'Head':[(1,0,0,0),(18,-.012,.015,-.025),(34,-.012,.015,-.025),(43,0,-.012,.018),(60,0,-.012,.018),(73,0,0,0)]}),
 'Listen':(61,{'Neck':[(1,0,0,0),(12,-.035,0,.015),(43,-.035,0,.015),(61,0,0,0)],'Head':[(1,0,0,0),(12,-.045,.025,.08),(39,-.045,.025,.08),(49,-.012,0,.025),(61,0,0,0)],'FlipperFR':[(1,0,0,0),(15,-.07,0,-.035),(43,-.07,0,-.035),(61,0,0,0)]}),
 'React':(61,{'Head':[(1,0,0,0),(9,-.025,-.025,-.115),(23,-.025,-.025,-.115),(33,-.055,.02,.07),(48,-.055,.02,.07),(61,0,0,0)],'FlipperFL':[(1,0,0,0),(11,-.19,0,-.12),(27,-.19,0,-.12),(42,.04,0,.03),(61,0,0,0)]})}
rig.animation_data_create()
for clip,(end,channels) in clips.items():
 rig.animation_data.action=None
 for bone in rig.pose.bones:
  bone.rotation_euler=(0,0,0);bone.location=(0,0,0);bone.scale=(1,1,1)
  for f in (1,end):
   for prop in ['rotation_euler','location','scale']:bone.keyframe_insert(prop,frame=f,group=bone.name)
 for name,keys in channels.items():
  bone=rig.pose.bones[name]
  for frame,x,y,z in keys:bone.rotation_euler=(x,y,z);bone.keyframe_insert('rotation_euler',frame=frame,group=name)
 for name in ['EyeL','EyeR']:
  bone=rig.pose.bones[name]
  for frame,wide,aim in [(1,.96,0),(11,.96,-.007 if clip=='React' else .002),(24,1.015 if clip=='React' else .98,-.007 if clip=='React' else .002),(38,.96,.004),(end,.96,0)]:
   bone.scale=(1,1,wide);bone.location=(aim,0,0);bone.keyframe_insert('scale',frame=frame,group=name);bone.keyframe_insert('location',frame=frame,group=name)
  if clip=='Idle':
   for f,s in [(51,.96),(54,.79),(58,.96)]:bone.scale=(1,1,s);bone.keyframe_insert('scale',frame=f,group=name)
 act=rig.animation_data.action;act.name=clip
 for fc in act.fcurves:
  for k in fc.keyframe_points:k.interpolation='BEZIER'
 track=rig.animation_data.nla_tracks.new();track.name=clip;track.strips.new(clip,1,act);track.mute=True
 rig.animation_data.action=None
rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1);bpy.context.scene.render.fps=24
body['character']='Mira, confident teenage coastal sea turtle';body['source']='Accepted natural-beak organic Shelly family surface; substantial juvenile proportion, pigment and equipment derivation';body['eye_acting']='Decisive exploratory shift, companion check-back, alert relaxed lids; no mouth animation'
anchors=[]
from mathutils import Matrix
for name,position in [('HatAnchor',shape((0,-.22,1.60))),('MouthAnchor',shape((0,-.69,1.035)))]:
 obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj);obj.parent=rig;obj.parent_type='BONE';obj.parent_bone='Head';bpy.context.view_layer.update();obj.matrix_world=Matrix.Translation(position);anchors.append(obj)
for im in [base,surface]:im.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(OUT/'mira.blend'))
def export(path):
 bpy.ops.object.select_all(action='DESELECT');body.select_set(True);rig.select_set(True)
 for obj in anchors:obj.select_set(True)
 bpy.context.view_layer.objects.active=rig
 bpy.ops.export_scene.gltf(filepath=str(path),export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_apply=False,export_extras=True,export_image_format='AUTO')
def budget(tris,name):
 bpy.context.view_layer.objects.active=body;bpy.ops.object.select_all(action='DESELECT');body.select_set(True)
 cur=sum(len(p.vertices)-2 for p in body.data.polygons);mod=body.modifiers.new(name,'DECIMATE');mod.ratio=min(1.,tris/cur);mod.use_collapse_triangulate=True
 while body.modifiers.find(mod.name)>0:bpy.ops.object.modifier_move_up(modifier=mod.name)
 bpy.ops.object.modifier_apply(modifier=mod.name)
def retex(color_size,color_name,quality,surface_size,surface_name):
 for node,img,size,filename,fmt in [(tex,base,color_size,color_name,'JPEG'),(st,surface,surface_size,surface_name,'PNG')]:
  copy=img.copy();copy.scale(size,size);copy.filepath_raw=str(OUT/filename);copy.file_format=fmt
  if fmt=='JPEG':copy.save(quality=quality)
  else:copy.save()
  new=bpy.data.images.load(str(OUT/filename),check_existing=False)
  if node==st:new.colorspace_settings.name='Non-Color'
  node.image=new
# Close tier: plush 15.5K-triangle silhouette and 1536 atlas keep the file under the 1,433.6 KB close budget.
budget(CLOSE_TRIS,'Mira close v13 budget');retex(1536,'mira-color-1536.jpg',84,512,'mira-surface-512.png')
export(OUT/'mira-close.glb');close=report(OUT/'mira-close.glb')
# Board tier has an independently budgeted silhouette and texture pair (<= 600 KB target).
budget(BOARD_TRIS,'Mira board v13 budget');retex(768,'mira-color-768.jpg',80,256,'mira-surface-256.png')
export(OUT/'mira-board.glb');board=report(OUT/'mira-board.glb')
for tier,contract,tri_limit,byte_limit in [('close',close,24000,3000000),('board',board,12000,1200000)]:
 assert contract['triangles']<=tri_limit and contract['bytes']<byte_limit,(tier,contract)
 assert contract['mesh_count']==contract['primitive_count']==contract['materials']==contract['skins']==1
 assert contract['maps']==2 and contract['bones']<=16 and set(contract['clips'])=={'Idle','Listen','React'}
result={'character':'Mira','candidate_only':True,'source':'art-source/shelly/natural-mouth/shelly.blend (accepted organic A-eye closed-beak family source)','close':close,'board':board,'texture_sizes':{'close':[[1536,1536],[512,512]],'board':[[768,768],[256,256]]},'proportion_changes':'Head 88%, body width114%, body height117%, longer flippers and neck; fitted field kit','bones':11,'clips':['Idle','Listen','React'],'limitations':['Offline CPU validation only; world scale and runtime integration owned by root.']}
(OUT/'asset-report.json').write_text(json.dumps(result,indent=2));print('MIRA_REPORT',json.dumps(result),flush=True)
