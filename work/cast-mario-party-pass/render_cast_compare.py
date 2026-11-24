"""Render 2-row Before (Canonical) vs After (Mario-Party Pass) comparison sheet for resident cast."""
import math
import shutil
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
CANON = REPO / "game" / "assets" / "models"
TILES = HERE / "_tiles"

ROSTER = [
    ("jisu", "Jisu (Hermit Crab)"),
    ("cafe-seahorse", "Cafe Seahorse"),
    ("shop-octopus", "Shop Octopus"),
    ("taxi-squid", "Taxi Squid"),
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for it in list(col):
            if it.users == 0:
                col.remove(it)


def render_one(glb_path, out_png, az_deg=38):
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.context.view_layer.update()

    pts = [m.matrix_world @ Vector(c) for m in meshes for c in m.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    center = 0.5 * (mn + mx)
    radius = max(0.25, (mx - mn).length * 0.5)

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 8
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 384
    scene.render.resolution_y = 384
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.38, 0.62, 0.68, 1.0)
    bg.inputs[1].default_value = 0.65
    scene.view_settings.view_transform = "Standard"

    for name, offset, energy, color, size in (
        ("Key", (-2.2, -3.4, 3.0), 320 * (radius ** 2), (1.0, 0.96, 0.88), 4.0 * radius),
        ("Bounce", (2.6, -2.0, -1.0), 140 * (radius ** 2), (0.62, 0.95, 0.92), 4.5 * radius),
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

    cam_data = bpy.data.cameras.new("CastCam")
    cam_data.lens = 45
    cam = bpy.data.objects.new("CastCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    az = math.radians(az_deg)
    el = math.radians(18)
    dist = radius * 2.55
    cam.location = center + dist * Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()

    scene.render.filepath = str(out_png)
    bpy.ops.render.render(write_still=True)


def main():
    TILES.mkdir(parents=True, exist_ok=True)
    for slug, _ in ROSTER:
        render_one(CANON / f"{slug}.glb", TILES / f"{slug}-before.png")
        render_one(HERE / f"{slug}.glb", TILES / f"{slug}-after.png")
    render_one(CANON / "crafted-shelly.glb", TILES / "shelly-mp.png", az_deg=44)


if __name__ == "__main__":
    main()
