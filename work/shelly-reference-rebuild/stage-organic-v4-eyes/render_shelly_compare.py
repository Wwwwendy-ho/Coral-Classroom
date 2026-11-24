"""Render 2x3 Before (v3-mp) vs After (v4 bright eyes) Cycles comparison sheet for Shelly."""
import math
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
BEFORE_GLB = REPO / "game" / "assets" / "models" / "crafted-shelly.glb"
AFTER_GLB = HERE / "crafted-shelly.glb"
TILES = HERE / "_tiles"


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for it in list(col):
            if it.users == 0:
                col.remove(it)


def render_row(glb_path, prefix):
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 14
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 512
    scene.render.resolution_y = 512
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.38, 0.62, 0.68, 1.0)
    bg.inputs[1].default_value = 0.65
    scene.view_settings.view_transform = "Standard"

    for name, loc, energy, color, size in (
        ("Key", (-1.8, -3.5, 3.2), 340, (1.0, 0.96, 0.88), 4.0),
        ("Bounce", (2.4, -2.2, -0.6), 150, (0.66, 0.95, 0.92), 4.5),
        ("Rim", (1.6, 3.0, 2.8), 210, (0.95, 0.88, 1.0), 3.5),
    ):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.color = color
        light.size = size
        lobj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(lobj)
        lobj.location = Vector(loc)
        lobj.rotation_euler = (Vector((0, -0.45, 0.62)) - lobj.location).to_track_quat("-Z", "Y").to_euler()

    cam_data = bpy.data.cameras.new("CompCam")
    cam_data.lens = 48
    cam = bpy.data.objects.new("CompCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    views = [
        ("face", 0, 6, 1.52, (0.0, -0.82, 0.80)),
        ("quarter", 42, 16, 2.95, (0.0, -0.10, 0.48)),
        ("board", 18, 48, 3.35, (0.0, -0.10, 0.42)),
    ]
    for tag, az_deg, el_deg, dist, tgt in views:
        target = Vector(tgt)
        az, el = math.radians(az_deg), math.radians(el_deg)
        cam.location = target + dist * Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(TILES / f"{prefix}-{tag}.png")
        bpy.ops.render.render(write_still=True)


def main():
    TILES.mkdir(parents=True, exist_ok=True)
    render_row(BEFORE_GLB, "before")
    render_row(AFTER_GLB, "after")


if __name__ == "__main__":
    main()
