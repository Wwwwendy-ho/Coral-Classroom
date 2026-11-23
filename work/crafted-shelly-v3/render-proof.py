"""Reimport a runtime Shelly export and photograph the mesh under diffuse studio light."""
import argparse
import math
import sys
from pathlib import Path

import bpy
from mathutils import Vector

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--views', default='quarter,front,side,back,overhead')
parser.add_argument('--size', type=int, default=640)
parser.add_argument('--samples', type=int, default=48)
parser.add_argument('--transparent',action='store_true')
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:])
args.output.mkdir(parents=True, exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(args.source))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.samples = args.samples
scene.cycles.use_denoising = False
scene.cycles.device = 'CPU'
scene.cycles.max_bounces = 4
scene.render.resolution_x = scene.render.resolution_y = args.size
scene.render.resolution_percentage = 100
scene.render.image_settings.file_format = 'PNG'
scene.view_settings.view_transform = 'Standard'
scene.world = bpy.data.worlds.new('Studio daylight')
scene.world.use_nodes = True
sky = scene.world.node_tree.nodes['Background']
sky.inputs[0].default_value = (.67,.77,.81,1)
sky.inputs[1].default_value = .51

def area(name, pos, target, size, power, color):
    lamp = bpy.data.lights.new(name, 'AREA')
    lamp.energy, lamp.shape, lamp.size, lamp.color = power,'DISK',size,color
    obj = bpy.data.objects.new(name, lamp)
    scene.collection.objects.link(obj)
    obj.location = pos
    obj.rotation_euler = (Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()

area('Window',(-2.6,-3.7,5.5),(0,0,.65),3.5,256,(1,.92,.80))
area('Bounce',(3.2,-2.4,2.4),(0,0,.65),3,120,(.81,.94,1))
area('Rim',(.6,2.8,3.2),(0,0,.65),2.3,180,(1,.86,.78))
scene.render.film_transparent=args.transparent
if not args.transparent:
    bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.072))
    ground=bpy.context.object
    mat=bpy.data.materials.new('Studio floor')
    mat.use_nodes=True
    shader=mat.node_tree.nodes['Principled BSDF']
    shader.inputs['Base Color'].default_value=(.20,.33,.36,1)
    shader.inputs['Roughness'].default_value=1
    ground.data.materials.append(mat)
camdata=bpy.data.cameras.new('Turntable')
cam=bpy.data.objects.new('Turntable',camdata)
scene.collection.objects.link(cam)
scene.camera=cam
camdata.type='ORTHO'
for name,angle,elevation,scale,focus in [
    ('board',-24,47,2.27,(0,.02,.60)), ('top',0,89.6,2.34,(0,.02,.60)),
    ('quarter',-46,15,2.18,(0,.025,.620)), ('front',0,11,2.16,(0,0,.663)),
    ('side',-88,10,2.28,(0,.035,.663)), ('back',174,22,2.16,(0,.10,.64)),
    ('overhead',-12,80,2.31,(0,.05,.53)),('face',-31,7,1.10,(0,-.51,.966)),
]:
    if name not in args.views.split(','):
        continue
    theta,phi=map(math.radians,(angle,elevation))
    camdata.ortho_scale=scale*(1.05 if args.transparent else 1)
    axis=Vector((math.sin(theta)*math.cos(phi),-math.cos(theta)*math.cos(phi),math.sin(phi)))
    cam.location=Vector(focus)+axis*6
    cam.rotation_euler=(-axis).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(args.output/(name+'.png'))
    bpy.ops.render.render(write_still=True)
