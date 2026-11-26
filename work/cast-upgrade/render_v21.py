"""Render grain-free denoised AgX front/quarter proofs from an exported GLB with exact per-view framing.
Usage:
  python work/cast-upgrade/render_v21.py -- --glb X.glb --out dir [--size 640] [--samples 48] [--elev 0.14] [--front-fill 0.74] [--quarter-fill 0.78]
"""
import argparse, math, sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector

p = argparse.ArgumentParser()
p.add_argument('--glb', type=Path, required=True)
p.add_argument('--out', type=Path, required=True)
p.add_argument('--views', default='front,quarter')
p.add_argument('--size', type=int, default=640)
p.add_argument('--samples', type=int, default=48)
p.add_argument('--elev', type=float, default=.14)
p.add_argument('--front-elev', type=float, default=None)
p.add_argument('--quarter-elev', type=float, default=None)
p.add_argument('--front-fill', type=float, default=.74)
p.add_argument('--quarter-fill', type=float, default=.78)
p.add_argument('--quarter-deg', type=float, default=38.0)
p.add_argument('--scale', type=float, default=0.0)
p.add_argument('--center', default='')
a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
a.out = a.out.resolve()
a.glb = a.glb.resolve()
a.out.mkdir(parents=True, exist_ok=True)

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.gltf(filepath=str(a.glb))
scene = bpy.context.scene
scene.render.engine = 'CYCLES'
scene.cycles.device = 'CPU'
scene.cycles.samples = a.samples
scene.cycles.use_denoising = True
scene.cycles.denoiser = 'OPENIMAGEDENOISE'
scene.render.resolution_x = scene.render.resolution_y = a.size
scene.render.resolution_percentage = 100
scene.world = bpy.data.worlds.new('NeutralStudio')
scene.world.use_nodes = True
bg = scene.world.node_tree.nodes['Background']
bg.inputs[0].default_value = (.16, .17, .19, 1)
bg.inputs[1].default_value = .70
scene.view_settings.view_transform = 'AgX'

rig = next((o for o in scene.objects if o.type == 'ARMATURE'), None)
if rig:
    act = next((x for x in bpy.data.actions if x.name.split('|')[-1].startswith('Idle')), None)
    if act:
        rig.animation_data_create()
        rig.animation_data.action = act
scene.frame_set(1)

dep = bpy.context.evaluated_depsgraph_get()
pts = []
for o in scene.objects:
    if o.type == 'MESH' and any(m.type == 'ARMATURE' for m in o.modifiers):
        ev = o.evaluated_get(dep)
        me = ev.to_mesh()
        for v in me.vertices:
            pts.append(o.matrix_world @ v.co)
        ev.to_mesh_clear()
arr = np.array([[v.x, v.y, v.z] for v in pts])
bmin, bmax = arr.min(axis=0), arr.max(axis=0)
c_global = Vector([float(x) for x in a.center.split(',')]) if a.center else Vector((bmin + bmax) * .5)

def area(name, loc, power, size, target):
    d = bpy.data.lights.new(name, 'AREA')
    o = bpy.data.objects.new(name, d)
    scene.collection.objects.link(o)
    o.location = loc
    d.energy = power
    d.shape = 'DISK'
    d.size = size
    o.rotation_euler = (target - o.location).to_track_quat('-Z', 'Y').to_euler()

area('Key', c_global + Vector((-3.2, -4.5, 4.6)), 540, 4.2, c_global)
area('Fill', c_global + Vector((4.2, -2.8, 2.2)), 340, 4.5, c_global)
area('Rim', c_global + Vector((0.4, 3.6, 4.2)), 420, 3.4, c_global)
area('FrontBounce', c_global + Vector((0.0, -4.5, -1.5)), 120, 4.0, c_global)

cam = bpy.data.cameras.new('cam')
cam.type = 'ORTHO'
co = bpy.data.objects.new('cam', cam)
scene.collection.objects.link(co)
scene.camera = co

dist = 6.5
ang = {'front': 0.0, 'quarter': a.quarter_deg, 'side': 90.0, 'back': 180.0}
elev_map = {
    'front': a.elev if a.front_elev is None else a.front_elev,
    'quarter': a.elev if a.quarter_elev is None else a.quarter_elev,
}
fill_map = {'front': a.front_fill, 'quarter': a.quarter_fill}

for v in a.views.split(','):
    t = math.radians(ang[v])
    el = elev_map.get(v, a.elev)
    view_dir = Vector((math.sin(t), -math.cos(t), el)).normalized()
    right = Vector((0, 0, 1)).cross(view_dir).normalized()
    up = view_dir.cross(right).normalized()
    rel = arr - np.array([c_global.x, c_global.y, c_global.z])
    px = rel @ np.array([right.x, right.y, right.z])
    py = rel @ np.array([up.x, up.y, up.z])
    cx_off = 0.5 * (px.min() + px.max())
    cy_off = 0.5 * (py.min() + py.max())
    c_view = c_global + right * cx_off + up * cy_off
    proj_w = float(px.max() - px.min())
    proj_h = float(py.max() - py.min())
    fill = fill_map.get(v, 0.76)
    scale = a.scale if a.scale > 0 else max(proj_w, proj_h) / fill
    cam.ortho_scale = scale
    co.location = c_view + view_dir * dist
    co.rotation_euler = (c_view - co.location).to_track_quat('-Z', 'Y').to_euler()
    scene.render.filepath = str(a.out / (v + '.png'))
    bpy.ops.render.render(write_still=True)
    print(f'RENDER_V21_VIEW {a.glb.name} view={v} scale={scale:.3f} fill_w={proj_w/scale:.1%} fill_h={proj_h/scale:.1%}', flush=True)
