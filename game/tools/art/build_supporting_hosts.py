"""Author, export and CPU inspect Bok, Keeper Hana and Captain Bay. Blender 4.3, no external assets.
blender -b --factory-startup --python tools/art/build_supporting_hosts.py -- --character bok --output /workspace/work/supporting-hosts/bok --proof
Faces look along -Y; Z is up. Each LOD uses one skinned mesh and one opaque atlas.
"""
import argparse, json, math, struct, sys, zlib
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, Quaternion
T=math.tau
Z=Vector((0,0,1))
TILES={'skin':(0,0,512,1024),'eye':(512,0,256,256),'cloth':(512,256,512,384),'fin':(512,640,256,384),'rim':(768,640,256,384),'dark':(768,0,128,128),'gold':(896,0,128,128),'ivory':(768,128,256,128)}
def uv(tile,u,v):
 x,y,w,h=TILES[tile];return ((x+4+u*(w-8))/1024,(y+4+v*(h-8))/1024)
def mix(a,b,t): return np.asarray(a)+(np.asarray(b)-np.asarray(a))*np.asarray(t)[...,None]
def paint(a,c,t):return a+(np.asarray(c)-a)*np.clip(t,0,1)[...,None]
def cloud(u,v):return .45*np.sin(37*u+45*v+.7*np.sin(17*v))+.3*np.sin(107*u-97*v)+.25*np.sin(177*u+211*v)
def png(path,a):
 def chunk(n,p):return struct.pack('>I',len(p))+n+p+struct.pack('>I',zlib.crc32(n+p))
 h,w,_=a.shape; d=a.copy();d[:,1:]-=a[:,:-1]
 path.write_bytes(b'\x89PNG\r\n\x1a\n'+chunk(b'IHDR',struct.pack('>IIBBBBB',w,h,8,2,0,0,0))+chunk(b'IDAT',zlib.compress(b''.join(b'\1'+r.tobytes() for r in d[::-1]),8))+chunk(b'IEND',b''))
def paint_tile(char,name,u,v):
 n=cloud(u,v);zero=np.zeros_like(u); rough=np.full_like(u,.63);metal=zero
 if name=='eye':
  # Radial A iris with broad sclera, amber fibers and painted soft catchlights.
  a=T*u;r=math.pi*v
  rgb=mix((255,249,231),(178,143,110),np.clip((r-.7)*.28,0,.65))
  fibers=.13*np.sin(91*a+9*r)+.08*np.sin(123*a-31*r)
  iris=mix((60,30,15),(218,147,54),.32+.45*np.sin(np.clip((r-.40)/.29,0,1)*math.pi)+fibers)
  rgb=paint(rgb,iris,np.clip((.77-r)/.025,0,1))
  rgb=paint(rgb,(35,22,17),np.exp(-((r-.728)/.029)**2)*.95)
  rgb=paint(rgb,(15,18,22),np.clip((.49-r)/.019,0,1))
  xx,yy=np.sin(r)*np.cos(a),np.sin(r)*np.sin(a)
  shine=np.exp(-(((xx+.16)/.084)**2+((yy-.225)/.08)**2))
  rgb=paint(rgb,(255,252,241),np.clip((shine-.15)*1.45,0,.95))
  rgb=paint(rgb,(255,247,223),.4*np.exp(-(((xx-.145)/.04)**2+((yy+.15)/.045)**2)))
  rough=np.full_like(u,.24)
 elif name=='skin' and char=='bok':
  a=T*u;top=np.clip(v,0,1);front=(.5+.5*np.cos(a))**3
  cream=front*np.clip((v-.34)*3.2,0,1)
  rgb=mix((197,130,39),(250,193,69),.32+.36*np.sin(math.pi*v)+.09*n)
  rgb=paint(rgb,(255,240,199),cream*.94)
  rgb=paint(rgb,(174,114,37),.16*(.5+.5*np.sin(103*u+71*v))**14*(1-.7*cream))
  # Deterministic pores are shaded pits, not decorative speckle noise.
  rng=np.random.default_rng(39);pore=np.zeros_like(u)
  for i in range(300):
   cx,cy=rng.random(2);rx=rng.uniform(.002,.005);ry=rx*.58
   x0,x1=np.searchsorted(u[0],(cx-5*rx,cx+5*rx));y0,y1=np.searchsorted(v[:,0],(cy-5*ry,cy+5*ry))
   d=((u[y0:y1,x0:x1]-cx)/rx)**2+((v[y0:y1,x0:x1]-cy)/ry)**2
   pore[y0:y1,x0:x1]+=np.exp(-d)
  rgb=paint(rgb,(156,100,37),pore*.46)
  rgb=paint(rgb,(255,232,165),np.clip(np.roll(pore,2,axis=0)-pore*.4,0,1)*.34)
  side=np.abs((u+.5)%1-.5)
  gill=np.exp(-((side-.204)/.009)**2-((v-.47)/.082)**4)
  bevel=np.exp(-((side-.190)/.010)**2-((v-.47)/.089)**4)
  rgb=paint(rgb,(137,87,31),gill*.52);rgb=paint(rgb,(255,221,132),bevel*.34)
  rgb=paint(rgb,(179,114,33),.095*(1-front)*np.exp(-((v-.48)/.21)**2))
  rough=.64+.09*pore
 elif name=='skin' and char=='captain-bay':
  a=T*u;front=(.5+.5*np.cos(a))**3;cream=front*np.clip((v-.32)*1.5,0,.72)
  rgb=mix((79,100,126),(140,153,174),.44+.19*np.sin(math.pi*v)+.12*n)
  rgb=paint(rgb,(211,196,175),cream+.10*(.5+.5*np.sin(97*u+81*v))**10)
  fur=(.5+.5*np.cos(T*(u*117+.13*np.sin(v*33))))**16
  rgb=paint(rgb,(202,196,183),fur*.13);rough=np.full_like(u,.77)
 elif name=='skin':
  a=T*u;rib=(.5+.5*np.cos(a*20+.4*np.sin(7*v)))**12
  rgb=mix((233,152,142),(255,221,195),.32+.45*v+.065*n)
  rgb=paint(rgb,(247,226,216),rib*(.12+.13*v))
  rgb=paint(rgb,(216,171,205),(.5+.5*np.sin(a*3+.8))*np.clip((v-.66)*1.6,0,.45))
  vein=(.5+.5*np.cos(a*48+.4*np.sin(v*31)))**28
  rgb=paint(rgb,(255,235,214),vein*.23)
  rough=np.full_like(u,.38)
 elif name=='cloth':
  weave=.035*np.sin(218*T*u)+.035*np.sin(194*T*v)+.04*n
  rgb=mix((29,45,70),(78,99,129),.54+weave) if char=='captain-bay' else mix((194,167,123),(251,235,200),.71+weave)
  edge=np.minimum.reduce([u,1-u,v,1-v]);seam=np.exp(-((edge-.043)/.011)**2)
  stitch=seam*np.clip(np.cos((u+v)*T*48)*3,0,1)
  rgb=paint(rgb,(153,115,71),np.exp(-((edge-.017)/.014)**2)*.5)
  rgb=paint(rgb,(255,236,181),stitch*.8);rough=np.full_like(u,.86)
 elif name=='fin':
  rays=(.5+.5*np.cos(T*u*9))**12
  if char=='bok':rgb=mix((219,151,48),(255,227,150),.31+.49*v+.06*n)
  else:rgb=mix((237,157,144),(255,224,192),.28+.6*v+.07*n)
  rgb=paint(rgb,(255,238,197),rays*.45);rough=np.full_like(u,.5)
 elif name=='rim':
  if char=='bok':rgb=mix((172,113,39),(250,207,117),.6+.12*n+.2*v)
  elif char=='captain-bay':rgb=mix((62,53,56),(121,105,100),.45+.08*n+.16*v)
  else:
   rgb=mix((229,160,170),(255,235,214),.25+.62*v+.06*n)
   rgb=paint(rgb,(255,247,223),np.exp(-((v-.93)/.07)**2)*.65)
  rough=np.full_like(u,.4)
 elif name=='dark':rgb=mix((26,20,23),(85,44,29),.22+.3*v);rough=np.full_like(u,.42)
 elif name=='ivory':rgb=mix((223,183,119),(255,243,210),.32+.55*v+.04*n);rough=np.full_like(u,.46)
 else:rgb=mix((144,92,29),(229,182,80),.55+.26*v+.04*n);rough=np.full_like(u,.4);metal=np.full_like(u,.28)
 return rgb,rough,metal

def atlas(char,out,size):
 color=np.full((size,size,3),128,np.uint8);sur=np.zeros_like(color);f=size/1024
 for name,tile in TILES.items():
  x,y,w,h=(int(n*f) for n in tile);u,v=np.meshgrid((np.arange(w)+.5-4*f)/(w-8*f),(np.arange(h)+.5-4*f)/(h-8*f));u,v=np.clip(u,0,1),np.clip(v,0,1)
  rgb,r,m=paint_tile(char,name,u,v);color[y:y+h,x:x+w]=np.uint8(np.clip(rgb,0,255));sur[y:y+h,x:x+w,0]=255;sur[y:y+h,x:x+w,1]=np.uint8(np.clip(r*255,0,255));sur[y:y+h,x:x+w,2]=np.uint8(m*255)
 raw=out/f'color-{size}.png';jpg=out/f'color-{size}.jpg';surf=out/f'surface-{size//4}.png';png(raw,color)
 im=bpy.data.images.load(str(raw));_=im.size[:];im.file_format='JPEG';im.save(filepath=str(jpg),quality=91);bpy.data.images.remove(im)
 png(surf,np.uint8(sur.reshape(size//4,4,size//4,4,3).mean(axis=(1,3))))
 mat=bpy.data.materials.new(char+' | painted organic atlas');mat.use_nodes=True;ns=mat.node_tree.nodes;lk=mat.node_tree.links;bs=ns.get('Principled BSDF');bs.inputs['Specular IOR Level'].default_value=.32
 tex=ns.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(jpg));tex.image.pack();lk.new(tex.outputs['Color'],bs.inputs['Base Color'])
 tex=ns.new('ShaderNodeTexImage');tex.image=bpy.data.images.load(str(surf));tex.image.colorspace_settings.name='Non-Color';tex.image.pack();sep=ns.new('ShaderNodeSeparateColor');lk.new(tex.outputs['Color'],sep.inputs[0]);lk.new(sep.outputs['Green'],bs.inputs['Roughness']);lk.new(sep.outputs['Blue'],bs.inputs['Metallic']);return mat

class Mesh:
 def __init__(self):self.v=[];self.f=[];self.uv=[];self.w=[]
 def grid(self,fn,n,m,tile,bone,wrap=False,reverse=False,uvfn=None):
  off=len(self.v);cols=n if wrap else n+1
  for j in range(m+1):
   for i in range(cols):
    u,v=i/n,j/m;p=Vector(fn(u,v));self.v.append(p);self.w.append(bone(p,u,v) if callable(bone) else {bone:1})
  for j in range(m):
   for i in range(n):
    ids=(off+j*cols+i,off+j*cols+(i+1)%cols,off+(j+1)*cols+(i+1)%cols,off+(j+1)*cols+i);ts=((i/n,j/m),((i+1)/n,j/m),((i+1)/n,(j+1)/m),(i/n,(j+1)/m));us=[uv(tile,*(uvfn(*t) if uvfn else t)) for t in ts]
    self.f.append(ids[::-1] if reverse else ids);self.uv.extend(us[::-1] if reverse else us)
 def ellipsoid(self,c,scale,tile,bone,n=20,m=12):
  c=Vector(c)
  self.grid(lambda u,v:c+Vector((scale[0]*math.sin(math.pi*(.001+.998*v))*math.sin(T*u),-scale[1]*math.sin(math.pi*(.001+.998*v))*math.cos(T*u),scale[2]*math.cos(math.pi*(.001+.998*v)))),n,m,tile,bone,True,True)
 def tube(self,fn,rad,n,m,tile,bone,flat=1):
  def point(u,v):
   p=Vector(fn(v));t=(Vector(fn(min(1,v+.002)))-Vector(fn(max(0,v-.002)))).normalized();a=t.cross(Z)
   if a.length<.01:a=t.cross(Vector((1,0,0)))
   a.normalize();b=t.cross(a).normalized();r=rad(v) if callable(rad) else rad
   return p+r*(a*math.cos(T*u)+b*math.sin(T*u)*flat)
  self.grid(point,n,m,tile,bone,True)
 def object(self,mat,rig,char):
  me=bpy.data.meshes.new(char+' continuous painted surfaces');me.from_pydata(self.v,[],self.f);me.update();me.uv_layers.new(name='Atlas').data.foreach_set('uv',np.ravel(self.uv));me.polygons.foreach_set('use_smooth',[True]*len(me.polygons));me.materials.append(mat)
  ob=bpy.data.objects.new(char,me);bpy.context.collection.objects.link(ob);ob.parent=rig;groups={b.name:ob.vertex_groups.new(name=b.name) for b in rig.data.bones}
  for i,ws in enumerate(self.w):
   for name,w in ws.items():
    if w>.0001:groups[name].add([i],w,'REPLACE')
  mod=ob.modifiers.new('Marine gesture skeleton','ARMATURE');mod.object=rig;return ob

def bok_surface(u,v,extra=0):
 # Puffer trunk taper, softly flattened ventral surface and full cheek volume.
 a=T*u;t=math.pi*(.001+.998*v);s=math.sin(t);z=1.14+.93*math.cos(t)
 cheek=math.exp(-((v-.36)/.19)**2)
 width=.855*s*(1+.075*cheek-.055*math.exp(-((v-.78)/.14)**2))
 width-=.028*math.exp(-((v-.48)/.10)**2)*abs(math.sin(a))**8
 depth=.695*s*(1+.045*math.cos(2*a))
 plane=.024*math.exp(-((abs(math.sin(a))-.69)/.19)**2)*math.exp(-((v-.42)/.16)**2)
 width+=plane*abs(math.sin(a));depth+=plane*.6
 y=-depth*math.cos(a);x=width*math.sin(a)
 return Vector((x,y,z))+Vector((math.sin(a),-math.cos(a),.3*math.cos(t)))*extra

def bok_eye(side):
 c=Vector((side*.438,-.532,1.57));n=Vector((side*.43,-.90,.075)).normalized();h=Z.cross(n).normalized();v=n.cross(h).normalized();return c,h,v,n

def eye(mesh,side,n,m,axes=bok_eye,r=.249):
 c,h,z,normal=axes(side)
 mesh.grid(lambda u,v:c+r*(math.sin(math.pi*(.002+.996*v))*(math.cos(T*u)*h+math.sin(T*u)*z)+math.cos(math.pi*(.002+.996*v))*normal),n,m,'eye','Eye.'+('L' if side<0 else 'R'),True,True)
 # Organic skin socket rim with an amused shallow upper orbital rise.
 mesh.grid(lambda u,v:c+h*(math.cos(T*u)*(r-.001+.046*v))+z*(math.sin(T*u)*(r-.009+.043*v))+normal*(.029-.111*v+.008*math.sin(T*u)),n,3,'rim','Head',True)
 # Upper margin remains above iris, no blink in fish.
 def canopy(u,v):
  theta=(u-.5)*math.radians(163);end=math.radians(49-9*(abs(theta)/1.423)**1.6);phi=math.radians(-102)+(end-math.radians(-102))*v
  return c+(r+.008)*math.sin(theta)*h+math.cos(theta)*((r+.008)*math.cos(phi)*z+(r+.008)*math.sin(phi)*normal)
 mesh.grid(canopy,14,5,'rim','Head',reverse=True)

def bok_mesh(close,mat,rig):
 b=Mesh();q=lambda a,c:c if close else a
 b.grid(bok_surface,q(36,56),q(24,38),'skin','Head',True,True)
 for s in (-1,1):
  eye(b,s,q(20,30),q(13,22))
  # Fins have a leading attachment and broad soft fan; not human limbs.
  def fin(u,v,s=s):
   a=-.9+1.8*u;extent=v*(.97+.03*math.cos(T*u*9));return Vector((s*(.75+.49*extent*math.cos(a)),.015+.17*extent*math.sin(a),1.18+.34*extent*math.sin(a)))
  for layer in (-1,1):b.grid(lambda u,v:fin(u,v)+Vector((0,layer*.012*math.sin(math.pi*v),0)),q(14,23),q(4,7),'fin','Fin.'+('L' if s<0 else 'R'),reverse=(s*layer<0))
 # Tail peduncle and trailing vertical fan, visible behind the rounded body.
 b.ellipsoid((0,.68,1.04),(.18,.30,.21),'skin','Tail',q(14,20),q(8,11))
 for layer in (-1,1):
  b.grid(lambda u,v:Vector((layer*.015*math.sin(math.pi*v),.80+.59*v*(.96+.04*math.cos(T*u*7)),1.05+(u-.5)*(.13+.72*v))),q(14,22),q(5,8),'fin','Tail',reverse=layer<0)
 # Irregularly placed short dermal spines; spare face and apron contact.
 rng=np.random.default_rng(87)
 count=84 if close else 54
 for i in range(count):
  u=float((i*.61803398875+.17)%1);v=float(.17+.66*rng.random());a=T*u
  if math.cos(a)>.35 and .18<v<.8:continue
  p=bok_surface(u,v,.003);norm=Vector((math.sin(a),-math.cos(a),.65*math.cos(math.pi*v))).normalized();h=Z.cross(norm).normalized();k=norm.cross(h);length=float(rng.uniform(.034,.065));rad=length*.49
  b.grid(lambda u,v,p=p,norm=norm,h=h,k=k,length=length,rad=rad:p+norm*(length*v)+rad*(1-v)**1.7*(math.cos(T*u)*h+math.sin(T*u)*k),q(6,8),q(2,3),'ivory','Head',True)
 # A handful of low forehead dermal tubercles catch light without sharp spikes.
 for at_u,at_v in ((.05,.20),(.93,.23),(.87,.31),(.13,.29),(0,.17)):
  p=bok_surface(at_u,at_v,.003);a=T*at_u;normal=Vector((math.sin(a),-math.cos(a),.65*math.cos(math.pi*at_v))).normalized();h=Z.cross(normal).normalized();k=normal.cross(h)
  b.grid(lambda u,v,p=p,normal=normal,h=h,k=k:p+normal*(.009*math.sin(v*math.pi/2))+.014*math.cos(v*math.pi/2)*(math.cos(T*u)*h+math.sin(T*u)*k),q(6,8),q(2,3),'rim','Head',True)
 # Small natural beak opening. No upturned mouth line, no teeth.
 c=Vector((0,-.719,1.27));h=Vector((1,0,0));n=Vector((0,-1,0))
 b.grid(lambda u,v:c+h*(math.cos(T*u)*(.077+.032*v))+Z*(math.sin(T*u)*(.045+.026*v))+n*(.018+.019*math.sin(math.pi*v)),q(22,32),q(3,5),'rim','Head',True)
 b.ellipsoid((0,-.734,1.268),(.075,.014,.043),'dark','Head',q(20,28),q(8,12))
 # Woven curved apron follows abdomen and wraps around the flanks.
 def apron(u,v,extra=0):
  a=(u-.5)*2.75;bodyv=.505+.365*v-.035*abs(2*u-1)**3*v
  p=bok_surface((a/T)%1,bodyv,.033+extra);p.y-=.016*math.sin(math.pi*u)*math.sin(math.pi*v);return p
 b.grid(apron,q(23,35),q(13,22),'cloth','Head',reverse=True)
 b.grid(lambda u,v:apron(.29+.42*u,.30+.40*v,.012+.023*math.sin(math.pi*u)*math.sin(math.pi*v)),q(10,16),q(6,11),'cloth','Head',reverse=True)
 # Waist tie and narrow shoulder loops; all cloth, no floating jewelry.
 b.grid(lambda u,v:bok_surface(u,.523+(v-.5)*.035,.040),q(36,52),q(2,4),'cloth','Head',True,True)
 for s in (-1,1):
  b.grid(lambda u,v:bok_surface((s*(.118+(v-.5)*.020))%1,.31+.25*u,.032),q(14,22),q(2,3),'cloth','Head',reverse=s<0)
  p=apron(.15 if s<0 else .85,.07,.019);b.ellipsoid(p,(.038,.022,.038),'gold','Head',q(10,14),q(5,8))
 # Soft peaked practical cap: fitted low crown with slightly worn canvas bill.
 b.grid(lambda u,v:Vector((.56*math.sin(T*u)*math.sin((.02+.98*v)*math.pi/2),-.015-.42*math.cos(T*u)*math.sin((.02+.98*v)*math.pi/2),1.988+.205*math.cos((.02+.98*v)*math.pi/2)+.045*math.sin(T*u))),q(28,44),q(8,14),'cloth','Head',True,True)
 b.grid(lambda u,v:Vector(((2*u-1)*.58,-.33-.34*math.sin(math.pi*u)*v,2.027-.09*v+.035*(2*u-1))),q(20,32),q(4,7),'cloth','Head',reverse=True)
 return b.object(mat,rig,'Bok')

def hana_bell(u,v):
 a=T*u;theta=(.006+.994*v)*math.pi/2;r=math.sin(theta);scallop=(.5+.5*math.cos(a*18))
 return Vector((.99*r*math.sin(a),-.83*r*math.cos(a),1.63+.69*math.cos(theta)+.044*v**8*scallop))
def hana_mesh(close,mat,rig):
 b=Mesh();q=lambda a,c:c if close else a
 b.grid(hana_bell,q(48,72),q(15,25),'skin','Bell',True,True)
 # One opaque sculpted underside with amber shaded folds; no transparency stack.
 b.grid(lambda u,v:Vector((.99*(1-v)*math.sin(T*u),-.83*(1-v)*math.cos(T*u),1.63+.044*math.cos(T*u*18)**2-.095*math.sin(math.pi*v))),q(48,72),q(5,8),'rim','Bell',True,True)
 b.tube(lambda t:hana_bell(t,1),.021,q(6,8),q(72,110),'rim','Bell')
 # Four lobed, folded oral arms form broad flowing tissue ribbons.
 for i in range(4):
  a=T*i/4+.38;bone='Oral.'+str(i)
  def oral(u,v,a=a):
   t=v;center=Vector((math.sin(a)*(.18+.34*t)+.12*math.sin(t*7+a)*t,-math.cos(a)*(.18+.34*t)+.11*math.cos(t*6+a)*t,1.61-1.22*t))
   h=Vector((math.cos(a),math.sin(a),0));n=Vector((math.sin(a),-math.cos(a),0));w=(.12+.10*math.sin(math.pi*t))*(1-.68*t**5)
   return center+h*((2*u-1)*w)+n*(.047*math.sin((u*3.8+t*5.5)*T)*math.sin(math.pi*u)) + Z*(.026*math.cos(T*(u*3.5+t*3)))
  for layer in (-1,1):b.grid(lambda u,v,layer=layer:oral(u,v)+Vector((0,layer*.008,0)),q(6,13),q(18,38),'fin',bone,reverse=layer<0)
 # Fine independent trailing perimeter tentacles with nonuniform natural lengths.
 for i in range(14):
  a=T*i/14+.08;length=.88+.30*(.5+.5*math.sin(i*2.7));bone='Fringe.'+str(i%4)
  def tend(v,a=a,length=length,i=i):return Vector((.90*math.sin(a)+.18*math.sin(v*4.1+i)*v,-.75*math.cos(a)+.14*math.sin(v*5+i*.7)*v,1.64-length*v))
  b.tube(tend,lambda v:.013*(1-.73*v),q(5,7),q(15,25),'rim',bone)
 # Manifest: minimal two-dot eyes. Bell, not a human face, expresses attention.
 for s in (-1,1):
  c=Vector((s*.255,-.721,1.931));b.ellipsoid(c,(.040,.023,.048),'dark','Eye.'+('L' if s<0 else 'R'),q(12,18),q(8,12));b.ellipsoid(c+Vector((-.009,-.022,.017)),(.010,.004,.012),'ivory','Eye.'+('L' if s<0 else 'R'),q(8,10),q(5,6))
 return b.object(mat,rig,'Keeper Hana')

def captain_surface(u,v,extra=0):
 a=T*u;t=math.pi*(.001+.998*v);s=math.sin(t);z=1.2+1.01*math.cos(t)
 # A single broad chest-to-neck surface, with a reclining elongated rear torso.
 shoulder=1+.12*math.exp(-((v-.55)/.17)**2)
 width=.88*s*shoulder;depth=.71*s*(1+.18*math.cos(a))
 y=.13+.23*math.sin(math.pi*v)-depth*math.cos(a)
 return Vector((width*math.sin(a),y,z))+Vector((math.sin(a),-math.cos(a),.3*math.cos(t)))*extra

def captain_eye(side):
 c=Vector((side*.385,-.355,1.865));n=Vector((side*.38,-.92,.06)).normalized();h=Z.cross(n).normalized();v=n.cross(h).normalized();return c,h,v,n

def captain_mesh(close,mat,rig):
 b=Mesh();q=lambda a,c:c if close else a
 b.grid(captain_surface,q(32,48),q(23,34),'skin','Head',True,True)
 for s,suf in ((-1,'L'),(1,'R')):
  eye(b,s,q(18,28),q(12,18),captain_eye,.204)
  # Whisker pads are broad and taper into the central rhinarium, not smiling lips.
  def muzzle(u,v,s=s):
   t=math.pi*(.002+.996*v);a=T*u
   return Vector((s*.215+.283*math.sin(t)*math.sin(a),-.510-.242*math.sin(t)*math.cos(a),1.551+.215*math.cos(t)+.032*math.sin(a)))
  b.grid(muzzle,q(18,26),q(9,16),'ivory','Head',True,True)
  # Curving pointed ivory tusks, with flattened roots buried in the muzzle.
  b.tube(lambda t,s=s:Vector((s*(.332+.045*math.sin(t*math.pi)-.04*t),-.539-.155*t+.032*math.sin(t*math.pi),1.48-.795*t)),lambda t:.083*(1-t)**.65+.001,q(8,14),q(10,16),'ivory','Head')
  # Long tapered natural vibrissae, root shadows painted into the shared atlas.
  for i in range(q(6,10)):
   z=1.46+(i%4)*.058;root=Vector((s*(.24+.045*(i%3)),-.716+(.013*(i%3)),z));length=.30+.04*(i%4)
   b.tube(lambda t,s=s,root=root,length=length,i=i:root+Vector((s*length*t,-.16*t+.08*t*t,-(.04+.04*(i%3))*t-.09*t*t)),lambda t:.0065*(1-.94*t),q(3,4),q(5,8),'ivory','Head')
  # Front flippers are thick webbed paddles, with a continuous root and no fingers.
  def flipper(u,v,s=s):
   a=math.pi*(.01+.98*u);w=math.sin(a);return Vector((s*(.70+.48*v+.15*w*v),-.06-.26*v+.18*math.cos(a)*v,.72-.29*v+.07*w*math.sin(math.pi*v)))
  for layer in (-1,1):b.grid(lambda u,v:flipper(u,v)+Vector((0,0,layer*.038*math.sin(math.pi*v))),q(12,20),q(4,7),'skin','Fin.'+suf,reverse=layer*s<0,uvfn=lambda u,v:(.27+.18*u,.65+.22*v))
 # Broad nostril pad with two dark natural nostrils.
 b.ellipsoid((0,-.642,1.739),(.155,.101,.105),'rim','Head',q(20,28),q(10,16))
 for s in (-1,1):b.ellipsoid((s*.063,-.730,1.735),(.030,.013,.032),'dark','Head',q(10,14),q(6,9))
 # Reclining rear taper and joined hind-flipper fan keep the full walrus body plan.
 b.ellipsoid((0,.66,.54),(.60,.74,.29),'skin','Head',q(18,28),q(10,16))
 for s in (-1,1):
  for layer in (-1,1):b.grid(lambda u,v,s=s,layer=layer:Vector((s*(.11+.39*v*math.sin(math.pi*u)),1.12+.63*v,.40+layer*.025*math.sin(math.pi*v)+.04*math.sin(math.pi*u)*v)),q(10,16),q(4,6),'skin','Tail',reverse=layer<0,uvfn=lambda u,v:(.35+.13*u,.66+.24*v))
 # Worn navy shoulder cape, compact fastening, no humanoid coat sleeves.
 b.grid(lambda u,v:captain_surface(u,.40+.115*v+.025*math.cos(T*u),.037),q(32,48),q(4,6),'cloth','Head',True,True)
 for s in (-1,1):b.ellipsoid((s*.24,-.509,1.30),(.044,.023,.044),'gold','Head',q(10,14),q(6,9))
 # Naval peaked cap with painted canvas weave and restrained brass button.
 b.grid(lambda u,v:Vector((.59*math.sin(T*u)*math.sin((.015+.985*v)*math.pi/2),-.04-.44*math.cos(T*u)*math.sin((.015+.985*v)*math.pi/2),2.111+.235*math.cos((.015+.985*v)*math.pi/2)+.05*math.sin(T*u))),q(24,36),q(7,11),'cloth','Head',True,True)
 b.grid(lambda u,v:Vector(((2*u-1)*.59,-.36-.32*math.sin(math.pi*u)*v,2.15-.12*v+.045*(2*u-1))),q(16,26),q(3,5),'cloth','Head',reverse=True)
 b.ellipsoid((0,-.444,2.235),(.050,.017,.058),'gold','Head',q(12,18),q(6,10))
 return b.object(mat,rig,'Captain Bay')

def rig_create(char):
 data=bpy.data.armatures.new(char+' species skeleton');ob=bpy.data.objects.new(char+' rig',data);bpy.context.collection.objects.link(ob);bpy.context.view_layer.objects.active=ob;ob.select_set(True);bpy.ops.object.mode_set(mode='EDIT')
 def bone(name,head,tail,parent=None):
  b=data.edit_bones.new(name);b.head=head;b.tail=tail
  if parent:b.parent=data.edit_bones[parent]
 bone('Float',(0,0,0),(0,0,.25))
 if char in ('bok','captain-bay'):
  bone('Head',(0,0,1.1),(0,0,1.6),'Float');bone('Tail',(0,.66,1.04),(0,1.06,1.04),'Head')
  for s,suf in ((-1,'L'),(1,'R')):
   c,h,v,n=(bok_eye if char=='bok' else captain_eye)(s);bone('Eye.'+suf,c,c+n*.2,'Head');bone('Fin.'+suf,(s*.75,0,1.18),(s*1.07,0,1.18),'Head')
 else:
  bone('Bell',(0,0,1.62),(0,0,2.1),'Float')
  for i in range(4):
   a=T*i/4+.38;bone('Oral.'+str(i),(.18*math.sin(a),-.18*math.cos(a),1.6),(.4*math.sin(a),-.4*math.cos(a),.8),'Bell');bone('Fringe.'+str(i),(.8*math.sin(a),-.66*math.cos(a),1.63),(.8*math.sin(a),-.66*math.cos(a),.9),'Bell')
  for s,suf in ((-1,'L'),(1,'R')):bone('Eye.'+suf,(s*.255,-.721,1.931),(s*.255,-.9,1.931),'Bell')
 bpy.ops.object.mode_set(mode='OBJECT');return ob

def animate(rig,char):
 # Explicit uneven holds. Gaze initiates before body acknowledgment; fish never blink.
 clips={
 'Idle':[(1,0,0,0,0),(23,.012,.5,0,-1),(39,.017,.7,5,-1),(48,.014,.4,5,-.5),(67,-.01,-.6,-2,0),(99,0,0,0,0)],
 'Listen':[(1,0,0,0,0),(10,.008,-1,2,-2),(31,.013,-1,2,-2),(44,.01,1.5,1,-1),(62,0,.2,0,0),(85,0,0,0,0)],
 'React':[(1,0,0,0,0),(7,.015,-1,-5,-3),(15,.047,3,-4,3),(24,.026,1,2,1),(39,.006,-.4,0,0),(53,0,0,0,0)]}
 bpy.context.scene.render.fps=30;rig.animation_data_create()
 for name,keys in clips.items():
  if char=='captain-bay':keys=[(round(f*1.3),bob*.65,tilt*.72,gaze*.8,pitch*.72) for f,bob,tilt,gaze,pitch in keys]
  act=bpy.data.actions.new(name);rig.animation_data.action=act
  for f,bob,tilt,gaze,pitch in keys:
   envelope=0 if f in (keys[0][0],keys[-1][0]) else 1
   for bone in rig.pose.bones:
    bone.rotation_mode='QUATERNION';bone.rotation_quaternion=Quaternion();bone.location=(0,0,0)
   root=rig.pose.bones['Float'];root.location=(0,bob,0);root.keyframe_insert('location',frame=f)
   def rotate(n,axis,deg):
    p=rig.pose.bones[n];local=rig.data.bones[n].matrix_local.to_quaternion().inverted()@Vector(axis);p.rotation_quaternion=Quaternion(local,math.radians(deg));p.keyframe_insert('rotation_quaternion',frame=f)
   if char in ('bok','captain-bay'):
    rotate('Head',(1,0,.25),tilt);rotate('Tail',(0,0,1),tilt*1.2)
    for s,suf in ((-1,'L'),(1,'R')):
     p=rig.pose.bones['Eye.'+suf];inv=rig.data.bones[p.name].matrix_local.to_quaternion().inverted();p.rotation_quaternion=Quaternion(inv@Z,math.radians(gaze))*Quaternion(inv@Vector((1,0,0)),math.radians(pitch));p.keyframe_insert('rotation_quaternion',frame=f)
     rotate('Fin.'+suf,(0,1,0),s*(envelope*3*math.sin(f*.29+s)+tilt*1.4))
   else:
    rotate('Bell',(0,1,.25),tilt*.65)
    for i in range(4):
     rotate('Oral.'+str(i),(0,1,0),envelope*math.sin(f*.065+i*.9)*2.5+tilt*.6);rotate('Fringe.'+str(i),(1,0,0),envelope*math.sin(f*.059+i*1.4)*3+tilt*.3)
    for s,suf in ((-1,'L'),(1,'R')):rotate('Eye.'+suf,(0,0,1),gaze*.22)
  for c in act.fcurves:
   for k in c.keyframe_points:k.handle_left_type=k.handle_right_type='AUTO_CLAMPED'
  act.use_fake_user=True;rig.animation_data.action=None;track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,act);track.mute=True
 rig.animation_data.action=bpy.data.actions['Idle'];bpy.context.scene.frame_set(1)

def stats(path):
 raw=path.read_bytes();jl=struct.unpack_from('<I',raw,12)[0];d=json.loads(raw[20:20+jl]);bn=28+jl
 tris=sum(d['accessors'][p['indices']]['count']//3 for m in d['meshes'] for p in m['primitives']);imgs=[]
 for im in d['images']:
  bv=d['bufferViews'][im['bufferView']];s=bn+bv.get('byteOffset',0);data=raw[s:s+bv['byteLength']]
  if data.startswith(b'\x89PNG'):w,h=struct.unpack_from('>II',data,16)
  else:
   k=2
   while data[k+1] not in (0xc0,0xc1,0xc2,0xc3):k+=struct.unpack_from('>H',data,k+2)[0]+2
   h,w=struct.unpack_from('>HH',data,k+5)
  imgs.append({'width':w,'height':h,'bytes':len(data),'mime':im['mimeType']})
 clips=[]
 for a in d['animations']:
  clips.append({'name':a['name'],'duration':max(d['accessors'][s['input']]['max'][0] for s in a['samplers']),'animatedBones':sorted({d['nodes'][c['target']['node']]['name'] for c in a['channels']})})
 return {'file':path.name,'bytes':len(raw),'triangles':tris,'meshCount':len(d['meshes']),'primitives':sum(len(m['primitives']) for m in d['meshes']),'materials':len(d['materials']),'bones':len(d['skins'][0]['joints']),'maps':imgs,'clips':clips}

def build(char,lod,out):
 bpy.ops.wm.read_factory_settings(use_empty=True);mat=atlas(char,out,2048 if lod=='close' else 1024);rig=rig_create(char);mesh=({'bok':bok_mesh,'hana':hana_mesh,'captain-bay':captain_mesh}[char])(lod=='close',mat,rig);animate(rig,char)
 bpy.ops.object.select_all(action='DESELECT');mesh.select_set(True);rig.select_set(True);bpy.context.view_layer.objects.active=mesh
 dest=out/f'{char}-{lod}.glb';bpy.ops.export_scene.gltf(filepath=str(dest),export_format='GLB',use_selection=True,export_animations=True,export_animation_mode='ACTIONS',export_force_sampling=True,export_apply=False,export_image_format='AUTO',export_extras=False,export_yup=True,export_rest_position_armature=True)
 report=stats(dest);(out/f'{lod}-report.json').write_text(json.dumps(report,indent=2)+'\n');assert report['triangles']<=(21000 if lod=='close' else 7500),report;assert report['bytes']<(2000000 if lod=='close' else 850000),report;assert report['primitives']==report['materials']==report['meshCount']==1;assert report['bones']<=16;assert {a['name'] for a in report['clips']}=={'Idle','Listen','React'}
 if lod=='close':
  bpy.context.preferences.filepaths.save_version=0;bpy.ops.wm.save_as_mainfile(filepath=str(out/f'{char}.blend'),compress=True)
 print('SUPPORTING_HOST_REPORT',json.dumps(report),flush=True)

def proof(char,out,lod='close'):
 # Inspect actual exported GLB reimport, not the authoring scene.
 bpy.ops.wm.read_factory_settings(use_empty=True);src=out/f'{char}-{lod}.glb';bpy.ops.import_scene.gltf(filepath=str(src));scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=16;scene.render.threads_mode='FIXED';scene.render.threads=2;scene.cycles.use_denoising=False;scene.render.resolution_x=600;scene.render.resolution_y=600;scene.render.resolution_percentage=100;scene.world=bpy.data.worlds.new('Neutral daylight');scene.world.color=(.17,.17,.17);scene.view_settings.view_transform='AgX'
 rig=next(o for o in scene.objects if o.type=='ARMATURE');meshes=[o for o in scene.objects if o.type=='MESH' and any(m.type=='ARMATURE' for m in o.modifiers)];mesh=meshes[0]
 # Imported rest pose and material checks plus evaluated positions for every proof view.
 log={'source':str(src),'sourceBytes':src.stat().st_size,'reimportedSkinnedMeshes':len(meshes),'meshName':mesh.name,'vertices':len(mesh.data.vertices),'polygons':len(mesh.data.polygons),'bones':[b.name for b in rig.data.bones],'proofs':[]}
 floor=bpy.data.materials.new('Warm neutral studio');floor.diffuse_color=(.77,.73,.66,1);bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.08 if char=='hana' else .18));bpy.context.object.data.materials.append(floor)
 def area(name,loc,power,size):
  d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;d.energy=power;d.shape='DISK';d.size=size;o.rotation_euler=(Vector((0,0,1.1))-o.location).to_track_quat('-Z','Y').to_euler()
 area('Large daylight',(-3,-4,6),500,4);area('Soft fill',(4,-2,3),280,4);area('Rim daylight',(0,3,5),450,3)
 cam=bpy.data.cameras.new('Actual GLB proof');camera=bpy.data.objects.new('Actual GLB proof',cam);scene.collection.objects.link(camera);scene.camera=camera;cam.type='ORTHO';cam.ortho_scale=3.05 if lod=='close' else 3.65
 actions=list(bpy.data.actions)
 def act(name):
  a=next((a for a in actions if a.name==name or a.name.startswith(name)),None)
  if a:rig.animation_data_create();rig.animation_data.action=a
  return a
 views=[('front',(0,-5,2.5),'Idle',1),('quarter',(3,-5,2.7),'Idle',1),('side',(5,-.05,2.3),'Idle',1),('back',(0,5,2.6),'Idle',1),('reaction',(2.4,-5,2.6),'React',20 if char=='captain-bay' else 15)]
 if lod=='board':
  views=views[:2];scene.render.resolution_x=448;scene.render.resolution_y=448;scene.cycles.samples=12
 for name,pos,clip,frame in views:
  a=act(clip);scene.frame_set(frame);camera.location=pos;camera.rotation_euler=(Vector((0,0,1.24))-camera.location).to_track_quat('-Z','Y').to_euler();scene.render.filepath=str(out/f'proof-{lod}-{name}.png');bpy.ops.render.render(write_still=True)
  dep=bpy.context.evaluated_depsgraph_get();evaluated=mesh.evaluated_get(dep);coords=[mesh.matrix_world@v.co for v in evaluated.to_mesh().vertices];arr=np.array(coords);evaluated.to_mesh_clear();log['proofs'].append({'view':name,'clip':a.name if a else None,'frame':frame,'boundsMin':arr.min(axis=0).tolist(),'boundsMax':arr.max(axis=0).tolist(),'image':str(out/f'proof-{lod}-{name}.png')})
 (out/f'reimport-{lod}-proof.json').write_text(json.dumps(log,indent=2)+'\n')

def main():
 p=argparse.ArgumentParser();p.add_argument('--character',choices=['bok','hana','captain-bay'],required=True);p.add_argument('--output',type=Path,required=True);p.add_argument('--lod',choices=['board','close','both'],default='both');p.add_argument('--proof',action='store_true');p.add_argument('--proof-only',action='store_true');p.add_argument('--proof-lod',choices=['board','close'],default='close');a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.output=a.output.resolve();a.output.mkdir(parents=True,exist_ok=True)
 if not a.proof_only:
  for lod in ('board','close') if a.lod=='both' else [a.lod]:build(a.character,lod,a.output)
 if a.proof or a.proof_only:proof(a.character,a.output,a.proof_lod)
if __name__=='__main__':main()
