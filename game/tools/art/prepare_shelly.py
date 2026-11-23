"""Clean, optimize and rig the selected Shelly pearl reconstruction.

Run from the repo: blender -b --factory-startup --python tools/art/prepare_shelly.py
The source reconstruction and original generated concept remain editable assets;
this script does not require remote inference or add a game runtime dependency.
"""
import bpy
import bmesh
import json
import math
import os
import struct
from pathlib import Path
from mathutils import Matrix

ROOT=Path(__file__).resolve().parents[2]
SOURCE=ROOT/'art-source/shelly'
REVIEW=Path(os.environ.get('SHELLY_REVIEW_DIR',str(ROOT/'build/shelly-pearl')))
REVIEW.mkdir(parents=True,exist_ok=True)
OUT=ROOT/'assets/models/shelly.glb'
TARGET=24000
def smooth(a,b,x):
    t=max(0,min(1,(x-a)/(b-a)))
    return t*t*(3-2*t)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(SOURCE/'pearl-source.glb'))
objects=[o for o in bpy.context.scene.objects if o.type=='MESH']
bpy.ops.object.select_all(action='DESELECT')
for o in objects:o.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
if len(objects)>1:bpy.ops.object.join()
body=bpy.context.object
body.name='Shelly | pearl skinned surface'
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
z0=min(v.co.z for v in body.data.vertices)
z1=max(v.co.z for v in body.data.vertices)
scale=1.6/(z1-z0)
for v in body.data.vertices:
    v.co.x*=scale
    v.co.y*=scale
    v.co.z=(v.co.z-z0)*scale

# Weld positional duplicates while retaining loop UV seams. Reject isolated
# reconstruction specks but retain small eyelash pieces beside the face.
bm=bmesh.new();bm.from_mesh(body.data)
bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=.000003)
seen=set();parts=[]
for vertex in bm.verts:
    if vertex in seen:continue
    stack=[vertex];seen.add(vertex);part=[]
    while stack:
        current=stack.pop();part.append(current)
        for edge in current.link_edges:
            other=edge.other_vert(current)
            if other not in seen:seen.add(other);stack.append(other)
    parts.append(part)
parts.sort(key=len,reverse=True)
removed=0
for part in parts[1:]:
    center=sum((v.co for v in part),part[0].co*0)/len(part)
    eyelash=center.y<-.35 and 1.04<center.z<1.48 and .12<abs(center.x)<.52 and len(part)>=8
    if not eyelash:
        removed+=len(part)
        bmesh.ops.delete(bm,geom=part,context='VERTS')
bm.normal_update();bm.to_mesh(body.data);bm.free();body.data.update()

# Make the low-frequency roughness/metal map compact. Color stays 2K for face
# and shell detail; the runtime can use a 1K color copy on lower quality tiers.
color=bpy.data.images.load(str(SOURCE/'pearl-color-runtime.jpg'),check_existing=False)
surface=bpy.data.images.load(str(SOURCE/'pearl-surface.png'),check_existing=False)
surface.colorspace_settings.name='Non-Color'
surface.scale(512,512)
surface.filepath_raw=str(SOURCE/'pearl-surface-512.png');surface.file_format='PNG';surface.save()
for material in body.data.materials:
    if not material.use_nodes:continue
    nodes=material.node_tree.nodes;links=material.node_tree.links
    for node in nodes:
        if node.type=='TEX_IMAGE' and node.image:
            node.image=surface if node.image.name.startswith('Image_1') else color
    shader=next((n for n in nodes if n.type=='BSDF_PRINCIPLED'),None)
    if not shader:continue
    shader.inputs['Emission Strength'].default_value=.08
    color_link=next(iter(shader.inputs['Base Color'].links),None)
    if color_link:links.new(color_link.from_socket,shader.inputs['Emission Color'])
    material.name='Shelly | soft pastel pearl'

original_triangles=sum(len(p.vertices)-2 for p in body.data.polygons)
decimate=body.modifiers.new('Mobile silhouette budget','DECIMATE')
decimate.ratio=min(1,TARGET/original_triangles)
decimate.use_collapse_triangulate=True
bpy.context.view_layer.objects.active=body
bpy.ops.object.modifier_apply(modifier=decimate.name)
body.data.validate(verbose=True,clean_customdata=True)
body.data.update()
for p in body.data.polygons:p.use_smooth=True

arm=bpy.data.armatures.new('Shelly pearl armature')
rig=bpy.data.objects.new('ShellyRig',arm)
bpy.context.collection.objects.link(rig)
bpy.context.view_layer.objects.active=rig;rig.select_set(True)
bpy.ops.object.mode_set(mode='EDIT')
bones=[
 ('Root',None,(0,0,.05),(0,0,.3)),
 ('Body','Root',(0,.12,.43),(0,.12,.7)),
 ('Neck','Body',(0,-.12,.62),(0,-.18,.94)),
 ('Head','Neck',(0,-.18,.97),(0,-.40,1.28)),
 ('FlipperFL','Body',(-.26,-.10,.51),(-.55,-.42,.10)),
 ('FlipperFR','Body',(.26,-.10,.51),(.55,-.42,.10)),
 ('FlipperRL','Body',(-.23,.35,.25),(-.47,.56,.09)),
 ('FlipperRR','Body',(.23,.35,.25),(.47,.56,.09)),
 ('Tail','Body',(0,.52,.22),(0,.70,.18)),
 ('EyeL','Head',(-.328,-.52,1.193),(-.328,-.67,1.193)),
 ('EyeR','Head',(.269,-.51,1.297),(.269,-.66,1.297)),
]
for name,parent,start,end in bones:
    b=arm.edit_bones.new(name);b.head=start;b.tail=end
    if parent:b.parent=arm.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')
groups={name:body.vertex_groups.new(name=name) for name,*_ in bones}
for vertex in body.data.vertices:
    x,y,z=vertex.co
    head=smooth(.87,1.10,z)
    head=max(head,smooth(.77,.97,z)*(1-smooth(-.35,-.15,y)))
    neck=smooth(.60,.94,z)*(1-head)*(1-smooth(.12,.32,y))
    weights={'Body':1-head-neck,'Neck':neck,'Head':head}
    front=smooth(.22,.47,abs(x))*(1-smooth(.43,.71,z))*(1-smooth(-.12,.08,y))
    rear=smooth(.16,.38,abs(x))*smooth(.20,.42,y)*(1-smooth(.31,.51,z))
    tail=smooth(.53,.70,y)*(1-smooth(.10,.21,abs(x)))*(1-smooth(.24,.38,z))
    amount=max(front,rear,tail)
    weights={n:w*(1-amount) for n,w in weights.items()}
    if amount:
        name='Tail' if tail>=max(front,rear) else ('FlipperF' if front>=rear else 'FlipperR')+('L' if x<0 else 'R')
        weights[name]=amount
    for name,cx,cz in [('EyeL',-.328,1.193),('EyeR',.269,1.297)]:
        # Broad, smooth falloff keeps the reconstructed eye and lash surface
        # together. These are squints, not separate closing eyelids.
        radius=math.sqrt(((x-cx)/.20)**2+((z-cz)/.17)**2)
        eye=(1-smooth(.45,1.35,radius))*(1-smooth(-.27,-.12,y))*.96
        if eye:
            weights={n:w*(1-eye) for n,w in weights.items()}
            weights[name]=eye
    total=sum(weights.values())
    for name,weight in weights.items():
        if weight>.0001:groups[name].add([vertex.index],weight/total,'REPLACE')
modifier=body.modifiers.new('Shelly skeletal motion','ARMATURE')
modifier.object=rig;body.parent=rig

def anchor(name,position):
    obj=bpy.data.objects.new(name,None);bpy.context.collection.objects.link(obj)
    obj.parent=rig;obj.parent_type='BONE';obj.parent_bone='Head'
    bpy.context.view_layer.update();obj.matrix_world=Matrix.Translation(position)
    bpy.context.view_layer.update()
    return obj
hat=anchor('HatAnchor',(0,-.22,1.60))
mouth=anchor('MouthAnchor',(0,-.69,1.035))

clips={
 'Idle':(73,{'Body':[(1,0,0,0),(19,.025,0,.012),(37,0,0,0),(55,-.025,0,-.012),(73,0,0,0)],'Head':[(1,0,0,0),(19,.025,0,.025),(37,0,0,0),(55,-.02,0,-.02),(73,0,0,0)]}),
 'Swim':(49,{'Body':[(1,0,0,0),(13,.045,0,.025),(25,0,0,0),(37,-.045,0,-.025),(49,0,0,0)],'Head':[(1,0,0,0),(13,-.035,0,-.025),(37,.035,0,.025),(49,0,0,0)],'FlipperFL':[(1,0,0,0),(13,.34,0,.18),(25,0,0,0),(37,-.30,0,-.16),(49,0,0,0)],'FlipperFR':[(1,0,0,0),(13,-.34,0,-.18),(25,0,0,0),(37,.30,0,.16),(49,0,0,0)],'FlipperRL':[(1,0,0,0),(13,.16,0,.06),(37,-.16,0,-.06),(49,0,0,0)],'FlipperRR':[(1,0,0,0),(13,-.16,0,-.06),(37,.16,0,.06),(49,0,0,0)]}),
 'Turn':(49,{'Body':[(1,0,0,0),(14,0,0,.09),(35,0,0,-.08),(49,0,0,0)],'Head':[(1,0,0,0),(14,.04,.06,.20),(35,.04,-.06,-.18),(49,0,0,0)]}),
 'Happy':(49,{'Body':[(1,0,0,0),(13,-.045,0,.04),(27,.04,0,-.035),(49,0,0,0)],'Head':[(1,0,0,0),(12,.09,0,.09),(24,-.10,0,-.08),(36,.06,0,.06),(49,0,0,0)],'FlipperFR':[(1,0,0,0),(12,-.38,0,-.20),(22,.16,0,.10),(32,-.32,0,-.16),(49,0,0,0)],'FlipperFL':[(1,0,0,0),(14,.21,0,.12),(29,-.15,0,-.08),(49,0,0,0)]}),
 'Curious':(61,{'Neck':[(1,0,0,0),(18,-.055,0,.035),(44,-.045,0,.03),(61,0,0,0)],'Head':[(1,0,0,0),(18,-.09,.05,.20),(44,-.07,.04,.16),(61,0,0,0)],'FlipperFR':[(1,0,0,0),(20,-.12,0,-.06),(44,-.10,0,-.05),(61,0,0,0)]}),
 'Celebrate':(73,{'Body':[(1,0,0,0),(15,-.075,0,.065),(30,.08,0,-.065),(45,-.07,0,.055),(60,.07,0,-.05),(73,0,0,0)],'Head':[(1,0,0,0),(15,-.10,0,-.07),(30,.07,0,.07),(45,-.09,0,-.06),(60,.06,0,.05),(73,0,0,0)],'FlipperFL':[(1,0,0,0),(15,-.38,0,-.20),(30,.08,0,.06),(45,-.34,0,-.18),(60,.06,0,.04),(73,0,0,0)],'FlipperFR':[(1,0,0,0),(15,.38,0,.20),(30,-.08,0,-.06),(45,.34,0,.18),(60,-.06,0,-.04),(73,0,0,0)]}),
}
# The baked eye surface has no separate lids. Short, shallow squints convey
# expression without folding the textured brows or pretending to close lids.
eyes={'Idle':[(42,1),(45,.72),(49,1)],'Swim':[(25,1),(28,.78),(32,1)],'Happy':[(9,1),(16,.84),(32,.88),(49,1)],'Curious':[(15,1),(25,1.06),(44,1.04),(61,1)],'Celebrate':[(12,1),(18,.84),(30,1),(48,.76),(53,1)]}
rig.animation_data_create()
for name,(end,channels) in clips.items():
    rig.animation_data.action=None
    for bone in rig.pose.bones:
        bone.rotation_mode='XYZ';bone.location=(0,0,0);bone.rotation_euler=(0,0,0);bone.scale=(1,1,1)
        for frame in (1,end):
            for prop in ['location','rotation_euler','scale']:bone.keyframe_insert(prop,frame=frame,group=bone.name)
    for name_b,keys in channels.items():
        for frame,x,y,z in keys:
            bone=rig.pose.bones[name_b];bone.rotation_euler=(x,y,z);bone.keyframe_insert('rotation_euler',frame=frame,group=name_b)
    for name_b in ['EyeL','EyeR']:
        for frame,amount in eyes.get(name,[]):
            bone=rig.pose.bones[name_b];bone.scale=(1,1,amount);bone.keyframe_insert('scale',frame=frame,group=name_b)
    if name in ['Idle','Celebrate']:
        for frame,amount in [(1,0),(end//4,.018),(end//2,0),(end*3//4,-.012),(end,0)]:
            bone=rig.pose.bones['Body'];bone.location=(0,0,amount);bone.keyframe_insert('location',frame=frame,group='Body')
    action=rig.animation_data.action;action.name=name
    for curve in action.fcurves:
        for key in curve.keyframe_points:key.interpolation='BEZIER'
    track=rig.animation_data.nla_tracks.new();track.name=name;track.strips.new(name,1,action);track.mute=True
    rig.animation_data.action=None
rig.animation_data.action=bpy.data.actions['Idle']
bpy.context.scene.frame_set(1)
bpy.context.scene.render.fps=24
bpy.ops.object.select_all(action='DESELECT')
for obj in [body,rig,hat,mouth]:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
OUT.parent.mkdir(parents=True,exist_ok=True)
bpy.ops.export_scene.gltf(filepath=str(OUT),export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_apply=False,export_extras=True)
color.pack();surface.pack()
bpy.ops.wm.save_as_mainfile(filepath=str(SOURCE/'shelly.blend'))
with OUT.open('rb') as f:
    f.read(12);size,_=struct.unpack('<I4s',f.read(8));doc=json.loads(f.read(size))
report={'source':'Selected original concept reconstructed by TRELLIS.2, cleaned/rigged in Blender','blender':bpy.app.version_string,'triangles':sum(doc['accessors'][p['indices']]['count']//3 for m in doc['meshes'] for p in m['primitives']),'bones':len(arm.bones),'clips':[a['name'] for a in doc.get('animations',[])],'materials':len(doc.get('materials',[])),'texture_dimensions':[list(color.size),list(surface.size)],'removed_speck_vertices':removed,'glb_bytes':OUT.stat().st_size,'anchor_world':{o.name:list(o.matrix_world.translation) for o in [hat,mouth]}}
(REVIEW/'asset-report.json').write_text(json.dumps(report,indent=2))
print('SHELLY_REPORT',json.dumps(report),flush=True)

# The single-file viewing copy has a strict 16 MiB budget shared with music and
# the rest of the game. Export a separate LOD after saving the full-detail
# editable source; the regular game and the orbit preview keep the main GLB.
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True);bpy.context.view_layer.objects.active=body
view_decimate=body.modifiers.new('Embedded viewing copy budget','DECIMATE')
view_decimate.ratio=min(1,12000/report['triangles'])
view_decimate.use_collapse_triangulate=True
while body.modifiers.find(view_decimate.name)>0:
    bpy.ops.object.modifier_move_up(modifier=view_decimate.name)
bpy.ops.object.modifier_apply(modifier=view_decimate.name)
body.data.validate(verbose=True,clean_customdata=True);body.data.update()
view_color=color.copy();view_color.scale(1024,1024)
view_color.filepath_raw=str(REVIEW/'shelly-view-color.jpg')
view_color.file_format='JPEG';view_color.save()
view_surface=surface.copy();view_surface.scale(256,256)
view_surface.filepath_raw=str(REVIEW/'shelly-view-surface.png')
view_surface.file_format='PNG';view_surface.save()
# Fresh image datablocks avoid exporting a copied image's original packed
# bytes instead of the resized file.
view_color=bpy.data.images.load(str(REVIEW/'shelly-view-color.jpg'),check_existing=False)
view_surface=bpy.data.images.load(str(REVIEW/'shelly-view-surface.png'),check_existing=False)
view_surface.colorspace_settings.name='Non-Color'
for material in body.data.materials:
    for node in material.node_tree.nodes:
        if node.type=='TEX_IMAGE':
            if node.image==color:node.image=view_color
            elif node.image==surface:node.image=view_surface
for obj in [body,rig,hat,mouth]:obj.select_set(True)
bpy.context.view_layer.objects.active=rig
view_out=OUT.with_name('shelly-view.glb')
bpy.ops.export_scene.gltf(filepath=str(view_out),export_format='GLB',use_selection=True,export_materials='EXPORT',export_animations=True,export_animation_mode='NLA_TRACKS',export_skins=True,export_apply=False,export_extras=True)
with view_out.open('rb') as f:
    f.read(12);size,_=struct.unpack('<I4s',f.read(8));view_doc=json.loads(f.read(size))
report['embedded_view']={'triangles':sum(view_doc['accessors'][p['indices']]['count']//3 for m in view_doc['meshes'] for p in m['primitives']),'glb_bytes':view_out.stat().st_size,'texture_dimensions':[list(view_color.size),list(view_surface.size)]}
(REVIEW/'asset-report.json').write_text(json.dumps(report,indent=2))
print('SHELLY_VIEW_REPORT',json.dumps(report['embedded_view']),flush=True)
