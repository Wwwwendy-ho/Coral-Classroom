"""Render two consistent views of every actual 3D candidate; no image mockups."""
from pathlib import Path
import argparse,json,math,sys
import bpy
from mathutils import Vector

p=argparse.ArgumentParser();p.add_argument('--root',type=Path,default=Path('/workspace/work/shelly-cuteness-survey'))
p.add_argument('--options',default='1,2,3,4,5,6,7,8,9,10');p.add_argument('--size',type=int,default=640);p.add_argument('--samples',type=int,default=64);p.add_argument('--engine',default='CYCLES')
args=p.parse_args(sys.argv[sys.argv.index('--')+1:])
bpy.ops.wm.read_factory_settings(use_empty=True)
scene=bpy.context.scene;scene.render.engine=args.engine;scene.cycles.device='CPU';scene.cycles.samples=args.samples
scene.cycles.use_denoising=False;scene.cycles.max_bounces=2
scene.cycles.diffuse_bounces=1;scene.cycles.glossy_bounces=1
scene.cycles.use_adaptive_sampling=True;scene.cycles.adaptive_threshold=.065;scene.cycles.adaptive_min_samples=8
scene.render.resolution_x=scene.render.resolution_y=args.size;scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.view_settings.view_transform='Standard';scene.view_settings.look='None'
scene.world=bpy.data.worlds.new('Shared diffuse studio');scene.world.use_nodes=True
scene.world.node_tree.nodes['Background'].inputs[0].default_value=(.67,.77,.81,1)
scene.world.node_tree.nodes['Background'].inputs[1].default_value=.51
def area(name,position,target,size,power,color):
    lamp=bpy.data.lights.new(name,'AREA');lamp.energy=power;lamp.shape='DISK';lamp.size=size;lamp.color=color
    obj=bpy.data.objects.new(name,lamp);scene.collection.objects.link(obj);obj.location=position
    obj.rotation_euler=(Vector(target)-obj.location).to_track_quat('-Z','Y').to_euler()
area('Window',(-2.6,-3.7,5.5),(0,0,.65),3.5,256,(1,.92,.80))
area('Bounce',(3.2,-2.4,2.4),(0,0,.65),3,120,(.81,.94,1))
area('Rim',(.6,2.8,3.2),(0,0,.65),2.3,180,(1,.86,.78))
bpy.ops.mesh.primitive_plane_add(size=200,location=(0,0,.035))
ground=bpy.context.object;ground.name='Shared studio floor'
mat=bpy.data.materials.new('Studio teal');mat.use_nodes=True
mat.node_tree.nodes['Principled BSDF'].inputs['Base Color'].default_value=(.20,.33,.36,1)
mat.node_tree.nodes['Principled BSDF'].inputs['Roughness'].default_value=1;ground.data.materials.append(mat)
camera=bpy.data.cameras.new('Identical comparison camera');cam=bpy.data.objects.new('Identical comparison camera',camera)
scene.collection.objects.link(cam);scene.camera=cam;camera.type='ORTHO';camera.ortho_scale=2.80
fixed=set(scene.objects)
for number in map(int,args.options.split(',')):
    folder=args.root/f'{number:02d}';bpy.ops.import_scene.gltf(filepath=str(folder/'shelly.glb'))
    imported=[o for o in scene.objects if o not in fixed]
    for obj in imported:
        if obj.animation_data:
            obj.animation_data.action=None
            for track in obj.animation_data.nla_tracks:track.mute=True
    scene.frame_set(0);bpy.context.view_layer.update()
    for name,yaw,elevation in [('normal',-32,15),('top',0,90)]:
        theta,phi=map(math.radians,(yaw,elevation));focus=Vector((0,-.03,.57))
        axis=Vector((math.sin(theta)*math.cos(phi),-math.cos(theta)*math.cos(phi),math.sin(phi)))
        cam.location=focus+axis*6;cam.rotation_euler=(-axis).to_track_quat('-Z','Y').to_euler()
        scene.render.filepath=str(folder/(name+'.png'));bpy.ops.render.render(write_still=True)
        print('SHELLY_OPTION_RENDER',number,name,flush=True)
    for obj in imported:bpy.data.objects.remove(obj,do_unlink=True)
    # Free old mesh and texture data between options instead of accumulating ten scenes.
    for collection in [bpy.data.meshes,bpy.data.materials,bpy.data.images,bpy.data.armatures,bpy.data.actions]:
        for item in list(collection):
            if item.users==0:collection.remove(item)
print('TEN_OPTION_RENDER_COMPLETE',flush=True)
