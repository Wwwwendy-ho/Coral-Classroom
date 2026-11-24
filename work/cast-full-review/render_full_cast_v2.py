"""Render all 13 newly finished Mario-Party 3D characters under identical neutral daylight & framing."""
import math
import subprocess
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]

ROSTER = [
    ("shelly-v4", "1. Shelly (v4 Bright Eyes)", "Staged Hero MP", "work/shelly-reference-rebuild/stage-organic-v4-eyes/crafted-shelly.glb", 40, 16),
    ("cafe-mp", "2. Cafe Seahorse (MP)", "Staged MP Pass", "work/cast-mario-party-pass/cafe-seahorse-mp/cafe-seahorse-close.glb", 4, 12),
    ("shop-octopus", "3. Shop Octopus (MP)", "Staged MP Pass", "work/cast-mario-party-pass/shop-octopus-mp/shop-octopus-close.glb", 32, 16),
    ("jisu", "4. Jisu (MP)", "Staged MP Pass", "work/cast-mario-party-pass/jisu-mp/jisu-close.glb", 34, 16),
    ("taxi-squid", "5. Taxi Squid (Rework)", "Hunyuan MP Rework", "work/cast-rework/taxi-squid/out/taxi-squid-close.glb", 24, 14),
    ("echo", "6. Echo (Rework)", "Hunyuan MP Rework", "work/cast-rework/echo/out/echo-close.glb", 56, 14),
    ("pip", "7. Pip (MP)", "Staged MP Pass", "work/cast-mario-party-pass/pip-mp/pip-close.glb", 54, 14),
    ("mira", "8. Mira (MP)", "Staged MP Pass", "work/cast-mario-party-pass/mira-mp/mira-close.glb", 40, 16),
    ("mochi", "9. Kiko Mochi (MP)", "Staged MP Pass", "work/cast-mario-party-pass/kiko-mp/kiko-mochi-close.glb", 26, 18),
    ("hermit", "10. Kiko Hermit (MP)", "Staged MP Pass", "work/cast-mario-party-pass/kiko-mp/kiko-hermit-close.glb", 30, 18),
    ("bok", "11. Bok (Rework)", "Hunyuan MP Rework", "work/cast-rework/bok/out/bok-close.glb", 24, 16),
    ("hana", "12. Keeper Hana (Rework)", "Hunyuan MP Rework", "work/cast-rework/hana/out/hana-close.glb", 18, 14),
    ("captain-bay", "13. Captain Bay (Rework)", "Hunyuan MP Rework", "work/cast-rework/captain-bay/out/captain-bay-close.glb", 26, 14),
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for it in list(col):
            if it.users == 0:
                col.remove(it)


def render_one(slug, glb_path, out_png, az_deg, el_deg):
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
    scene.render.resolution_x = 420
    scene.render.resolution_y = 420
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

    cam_data = bpy.data.cameras.new("CastCamV2")
    cam_data.lens = 45
    cam = bpy.data.objects.new("CastCamV2", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    az, el = math.radians(az_deg), math.radians(el_deg)
    view_dir = Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    look = -view_dir
    cam_right = look.cross(Vector((0.0, 0.0, 1.0))).normalized()
    cam_up = cam_right.cross(look).normalized()

    fov_half = 18.0 / 45.0
    fill = 0.78
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

    scene.render.filepath = str(out_png)
    bpy.ops.render.render(write_still=True)


def main():
    tiles = HERE / "_tiles_v2"
    tiles.mkdir(parents=True, exist_ok=True)
    for slug, _, _, glb_rel, az, el in ROSTER:
        glb_path = REPO / glb_rel
        assert glb_path.exists(), f"Missing {glb_path}"
        render_one(slug, glb_path, tiles / f"{slug}.png", az, el)

    wsl_script = "/mnt/c" + str(HERE / "make_full_cast_sheet_v2.py").replace("\\", "/")[2:]
    subprocess.run(["wsl", "-e", "/home/wendy/.venvs/coral-classroom/bin/python", wsl_script], check=True)


if __name__ == "__main__":
    main()
