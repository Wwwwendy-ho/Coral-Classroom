"""Offline color inspection; reads actual mesh/atlas exports, not a game screenshot."""
from pathlib import Path
import importlib.util,json,sys,math
import bpy
from mathutils import Vector

folder=Path(sys.argv[sys.argv.index('--')+1])
spec=importlib.util.spec_from_file_location('world_render','/workspace/coral-classroom/tools/art/render_world_scenery.py')
module=importlib.util.module_from_spec(spec);spec.loader.exec_module(module)
data=json.loads((folder/'scene.json').read_text())
bpy.ops.wm.read_factory_settings(use_empty=True)
class Args:
    exports=folder
    atlas=folder/'atlas-0.png'
    fog=True
args=Args()
module.import_world(data,args)
scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=8;scene.cycles.use_denoising=False
scene.render.resolution_x=data['camera']['width'];scene.render.resolution_y=data['camera']['height'];scene.render.resolution_percentage=100
scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB'
scene.view_settings.view_transform='Raw';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
world=bpy.data.worlds.new('exported fog background');world.use_nodes=True;scene.world=world
world.node_tree.nodes['Background'].inputs['Color'].default_value=(*data['background'],1)
world.node_tree.nodes['Background'].inputs['Strength'].default_value=1
cd=bpy.data.cameras.new('actual route camera');cam=bpy.data.objects.new('actual route camera',cd);scene.collection.objects.link(cam)
cam.location=module.convert(data['camera']['position']);target=Vector(module.convert(data['camera']['target']));cam.rotation_euler=(target-cam.location).to_track_quat('-Z','Y').to_euler()
cd.type='PERSP';cd.sensor_fit='HORIZONTAL';cd.angle=2*math.atan(math.tan(math.radians(data['camera']['fov'])/2)*data['camera']['width']/data['camera']['height']);cd.clip_end=100
scene.camera=cam;scene.render.filepath=str(folder/'world.png');bpy.ops.render.render(write_still=True)
print('OFFLINE_CRAFTED_INSPECTION',scene.render.filepath)
