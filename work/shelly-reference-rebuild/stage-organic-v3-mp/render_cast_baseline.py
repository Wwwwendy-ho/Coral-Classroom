"""Render 3/4 offline Cycles audit stills of existing canonical residents alongside the v3-mp Shelly candidate."""
import math
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
MODELS = REPO / "game" / "assets" / "models"
TILES = HERE / "_cast_tiles"

CAST = [
    ("jisu", MODELS / "jisu.glb", "Jisu (Hermit Crab)", 40),
    ("seahorse", MODELS / "cafe-seahorse.glb", "Cafe Seahorse", 40),
    ("octopus", MODELS / "shop-octopus.glb", "Shop Octopus", 40),
    ("squid", MODELS / "taxi-squid.glb", "Taxi Squid", 40),
    ("shelly-mp", HERE / "crafted-shelly.glb", "Shelly v3-MP", 44),
]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for it in list(col):
            if it.users == 0:
                col.remove(it)


def render_tile(slug, path, az_deg):
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(path))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.context.view_layer.update()

    # Compute combined world bounding box
    pts = []
    for m in meshes:
        for corner in m.bound_box:
            pts.append(m.matrix_world @ Vector(corner))
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
    dist = radius * 2.75
    cam.location = center + dist * Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()

    out = TILES / f"{slug}.png"
    scene.render.filepath = str(out)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {slug} (radius={radius:.3f})")


def main():
    TILES.mkdir(parents=True, exist_ok=True)
    for slug, path, _, az_deg in CAST:
        render_tile(slug, path, az_deg)


if __name__ == "__main__":
    main()
