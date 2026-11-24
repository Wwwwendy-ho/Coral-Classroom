"""Render Old vs New Front 3/4 vs New Back/Side 3/4 Cycles tiles for Visual Gate #3."""
import math
import subprocess
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
TILES = HERE / "_compare_tiles"

OLD_MODELS = {
    "echo": (REPO / "game" / "art-source" / "npcs" / "echo" / "echo-close.glb", 38, 14),
    "taxi-squid": (REPO / "game" / "assets" / "models" / "taxi-squid-close.glb", 32, 14),
    "bok": (REPO / "work" / "cast-full-review" / "bok" / "bok-board.glb", 28, 16),
    "hana": (REPO / "work" / "cast-full-review" / "hana" / "hana-board.glb", 24, 14),
    "captain-bay": (REPO / "work" / "cast-full-review" / "captain-bay" / "captain-bay-board.glb", 32, 16),
}

NEW_VIEWS = {
    "echo": ((56, 14), (-135, 16)),
    "taxi-squid": ((22, 14), (-148, 18)),
    "bok": ((24, 16), (-145, 16)),
    "hana": ((18, 14), (150, 16)),
    "captain-bay": ((26, 14), (-145, 16)),
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for it in list(col):
            if it.users == 0:
                col.remove(it)


def render_view(glb_path, out_png, az_deg, el_deg):
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
    scene.render.resolution_x = 380
    scene.render.resolution_y = 380
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

    cam_data = bpy.data.cameras.new("ReworkCam")
    cam_data.lens = 45
    cam = bpy.data.objects.new("ReworkCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    az, el = math.radians(az_deg), math.radians(el_deg)
    view_dir = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    look = -view_dir
    cam_right = look.cross(Vector((0.0, 0.0, 1.0))).normalized()
    cam_up = cam_right.cross(look).normalized()

    fov_half = 18.0 / 45.0
    fill = 0.80
    req_dist = radius * 2.1
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
    scene.render.filepath = str(out_png)
    bpy.ops.render.render(write_still=True)


def main():
    TILES.mkdir(parents=True, exist_ok=True)
    for slug, (old_path, az, el) in OLD_MODELS.items():
        render_view(old_path, TILES / f"{slug}_old.png", az, el)
        new_close = HERE / slug / "out" / f"{slug}-close.glb"
        (faz, fel), (baz, bel) = NEW_VIEWS[slug]
        render_view(new_close, TILES / f"{slug}_new_front.png", faz, fel)
        render_view(new_close, TILES / f"{slug}_new_back.png", baz, bel)

    wsl_script = "/mnt/c" + str(HERE / "stitch_rework_compare.py").replace("\\", "/")[2:]
    subprocess.run(["wsl", "-e", "/home/wendy/.venvs/coral-classroom/bin/python", wsl_script], check=True)


if __name__ == "__main__":
    main()
