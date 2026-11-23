"""Render an actual NPC GLB from four angles with offline CPU Cycles.

blender -b --factory-startup --python tools/art/render_npc_turntable.py -- \
  --source assets/models/taxi-squid.glb --output /tmp/taxi-review --size 384
Blender's -Y looks toward glTF +Z. Rendered PNGs are standalone review artifacts.
"""
import argparse
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

p=argparse.ArgumentParser()
p.add_argument('--source',type=Path,required=True)
p.add_argument('--output',type=Path,required=True)
p.add_argument('--size',type=int,default=384)
p.add_argument('--samples',type=int,default=16)
p.add_argument('--clip',choices=['Idle','Listen','React'])
p.add_argument('--frame',type=int,default=1)
p.add_argument('--views',default='front,quarter,side,back')
p.add_argument('--clay',action='store_true',help='Use a neutral gray material for an untextured geometry review')
a=p.parse_args(sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else [])
a.output.mkdir(parents=True,exist_ok=True)
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(a.source.resolve()))
if a.clip:
    rig=next((o for o in bpy.context.scene.objects if o.type=='ARMATURE'),None)
    action=next((v for v in bpy.data.actions if v.name==a.clip or v.name.startswith(a.clip+'_')),None)
    if not rig or not action: raise RuntimeError('Requested animation clip not found')
    rig.animation_data_create()
    for track in rig.animation_data.nla_tracks: track.mute=True
    rig.animation_data.action=action
bpy.context.scene.frame_set(a.frame)
bpy.context.view_layer.update()
meshes=[o for o in bpy.context.scene.objects if o.type=='MESH' and o.visible_get()]
if not meshes: raise RuntimeError('Source contains no actual mesh')
if a.clay:
    material=bpy.data.materials.new('Geometry review only')
    material.use_nodes=True
    shader=material.node_tree.nodes.get('Principled BSDF')
    shader.inputs['Base Color'].default_value=(.19,.24,.28,1)
    shader.inputs['Roughness'].default_value=.78
    for obj in meshes:
        obj.data.materials.clear()
        obj.data.materials.append(material)
pts=[o.matrix_world @ Vector(corner) for o in meshes for corner in o.bound_box]
mins=[min(p[i] for p in pts) for i in range(3)];maxs=[max(p[i] for p in pts) for i in range(3)]
center=Vector([(mins[i]+maxs[i])/2 for i in range(3)])
span=max(maxs[i]-mins[i] for i in range(3))
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=a.samples
scene.cycles.use_denoising=False;scene.render.resolution_x=scene.render.resolution_y=a.size;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.film_transparent=False
scene.world.color=(.55,.55,.55)
scene.view_settings.view_transform='Standard'
scene.view_settings.look='Medium High Contrast'
scene.view_settings.exposure=0;scene.view_settings.gamma=1
for name,offset,power,size in [('key',(4,-6,7),650,5),('fill',(-5,-3,4),400,5),('rim',(1,5,5),500,4)]:
    lamp=bpy.data.lights.new(name,'AREA');lamp.energy=power;lamp.shape='DISK';lamp.size=size
    obj=bpy.data.objects.new(name,lamp);scene.collection.objects.link(obj);obj.location=center+Vector(offset)
    obj.rotation_euler=(center-obj.location).to_track_quat('-Z','Y').to_euler()
camera=bpy.data.cameras.new('ReviewCamera');cam=bpy.data.objects.new('ReviewCamera',camera);scene.collection.objects.link(cam);scene.camera=cam
camera.type='ORTHO';camera.ortho_scale=span*1.38
for name,angle in [('front',0),('quarter',45),('side',90),('back',180)]:
    if name not in a.views.split(','): continue
    theta=math.radians(angle);cam.location=center+Vector((math.sin(theta)*5,-math.cos(theta)*5,1.15))
    cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str((a.output/(name+'.png')).resolve());bpy.ops.render.render(write_still=True)
print('NPC_TURNTABLE',str(a.output.resolve()),flush=True)
