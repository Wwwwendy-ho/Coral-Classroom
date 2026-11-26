"""Render front/quarter proofs from an exported GLB.
blender -b --factory-startup --python work/cast-upgrade/render_v13.py -- --glb X.glb --out dir [--lod close|board] [--center x,y,z] [--scale 3.3] [--views front,quarter]
"""
import argparse, math, sys
from pathlib import Path
import bpy
from mathutils import Vector
p=argparse.ArgumentParser();p.add_argument('--glb',type=Path,required=True);p.add_argument('--out',type=Path,required=True);p.add_argument('--center',default='0,0,1.0');p.add_argument('--scale',type=float,default=3.2);p.add_argument('--views',default='front,quarter');p.add_argument('--size',type=int,default=640);p.add_argument('--samples',type=int,default=24);p.add_argument('--prefix',default='');p.add_argument('--dist',type=float,default=6.0);p.add_argument('--elev',type=float,default=.18)
a=p.parse_args(sys.argv[sys.argv.index('--')+1:]);a.out=a.out.resolve();a.glb=a.glb.resolve();a.out.mkdir(parents=True,exist_ok=True)
bpy.ops.wm.read_factory_settings(use_empty=True);bpy.ops.import_scene.gltf(filepath=str(a.glb));scene=bpy.context.scene
scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=a.samples;scene.cycles.use_denoising=False
scene.render.resolution_x=scene.render.resolution_y=a.size;scene.render.resolution_percentage=100
scene.world=bpy.data.worlds.new('Neutral');scene.world.use_nodes=True;bg=scene.world.node_tree.nodes['Background'];bg.inputs[0].default_value=(.78,.82,.86,1);bg.inputs[1].default_value=.55
scene.view_settings.view_transform='Standard'
def area(name,loc,power,size,target):
    d=bpy.data.lights.new(name,'AREA');o=bpy.data.objects.new(name,d);scene.collection.objects.link(o);o.location=loc;d.energy=power;d.shape='DISK';d.size=size;o.rotation_euler=(target-o.location).to_track_quat('-Z','Y').to_euler()
c=Vector([float(x) for x in a.center.split(',')])
area('Key',(-3,-4,6),520,4,c);area('Fill',(4,-2,3),300,4,c);area('Rim',(0,3,5),400,3,c)
cam=bpy.data.cameras.new('cam');cam.type='ORTHO';cam.ortho_scale=a.scale;co=bpy.data.objects.new('cam',cam);scene.collection.objects.link(co);scene.camera=co
rig=next((o for o in scene.objects if o.type=='ARMATURE'),None)
if rig:
    act=next((x for x in bpy.data.actions if x.name.split('|')[-1].startswith('Idle')),None)
    if act:
        rig.animation_data_create();rig.animation_data.action=act
scene.frame_set(1)
ang={'front':0,'quarter':40,'side':90,'back':180,'face':0,'face-quarter':40}
for v in a.views.split(','):
    t=math.radians(ang[v]);co.location=c+Vector((math.sin(t)*a.dist,-math.cos(t)*a.dist,a.dist*a.elev));co.rotation_euler=(c-co.location).to_track_quat('-Z','Y').to_euler()
    scene.render.filepath=str(a.out/(a.prefix+v+'.png'));bpy.ops.render.render(write_still=True)
print('RENDER_DONE')
