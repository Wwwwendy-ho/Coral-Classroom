"""Render 4-panel comparison: Old Spiky Mira vs New Smooth Teen Mira (3/4 & Front) vs Shelly v4."""
import math
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
TILES = HERE / "_tiles"

ITEMS = [
    ("old", REPO / "game" / "art-source" / "npcs" / "mira" / "production" / "mira-board.glb", 38, 15),
    ("new_q", HERE / "mira-close.glb", 42, 16),
    ("new_f", HERE / "mira-close.glb", 0, 14),
    ("shelly", REPO / "work" / "shelly-reference-rebuild" / "stage-organic-v4-eyes" / "crafted-shelly.glb", 42, 16),
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for it in list(col):
            if it.users == 0:
                col.remove(it)


def render_one(tag, glb_path, az_deg, el_deg):
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    scene = bpy.context.scene
    bpy.context.view_layer.update()

    meshes = [o for o in scene.objects if o.type == "MESH"]
    world_pts = []
    deps = bpy.context.evaluated_depsgraph_get()
    for m in meshes:
        ev = m.evaluated_get(deps)
        me = ev.to_mesh()
        mw = m.matrix_world
        step = max(1, len(me.vertices) // 2500)
        for i in range(0, len(me.vertices), step):
            world_pts.append(mw @ me.vertices[i].co)
        ev.to_mesh_clear()

    mn = Vector((min(p.x for p in world_pts), min(p.y for p in world_pts), min(p.z for p in world_pts)))
    mx = Vector((max(p.x for p in world_pts), max(p.y for p in world_pts), max(p.z for p in world_pts)))
    center = 0.5 * (mn + mx)
    radius = max(0.30, (mx - mn).length * 0.5)

    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 12
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 460
    scene.render.resolution_y = 460
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.38, 0.62, 0.68, 1.0)
    bg.inputs[1].default_value = 0.65
    scene.view_settings.view_transform = "Standard"

    for name, offset, energy, color, size in (
        ("Key", (-2.2, -3.4, 3.0), 340 * (radius ** 2), (1.0, 0.96, 0.88), 4.0 * radius),
        ("Bounce", (2.6, -2.0, -1.0), 150 * (radius ** 2), (0.64, 0.95, 0.92), 4.5 * radius),
        ("Rim", (1.8, 3.0, 2.5), 210 * (radius ** 2), (0.95, 0.88, 1.0), 3.5 * radius),
    ):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.color = color
        light.size = size
        lobj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(lobj)
        lobj.location = center + Vector(offset) * radius
        lobj.rotation_euler = (center - lobj.location).to_track_quat("-Z", "Y").to_euler()

    cam_data = bpy.data.cameras.new("MiraCam")
    cam_data.lens = 45
    cam = bpy.data.objects.new("MiraCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    az, el = math.radians(az_deg), math.radians(el_deg)
    view_dir = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    look = -view_dir
    cam_right = look.cross(Vector((0.0, 0.0, 1.0))).normalized()
    cam_up = cam_right.cross(look).normalized()

    fov_half = 18.0 / 45.0
    fill = 0.80
    req_dist = radius * 2.2
    for p in world_pts:
        rel = p - center
        u = abs(rel.dot(cam_right))
        w = abs(rel.dot(cam_up))
        depth = rel.dot(view_dir)
        d_need = depth + max(u, w) / (fill * fov_half)
        if d_need > req_dist:
            req_dist = d_need

    cam.location = center + req_dist * view_dir
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()

    scene.render.filepath = str(TILES / f"{tag}.png")
    bpy.ops.render.render(write_still=True)


def main():
    TILES.mkdir(parents=True, exist_ok=True)
    for tag, glb_path, az, el in ITEMS:
        render_one(tag, glb_path, az, el)


if __name__ == "__main__":
    main()
