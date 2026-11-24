"""Render 384x384 RGBA transparent loading image of stage-organic-v4-eyes/crafted-shelly.glb -> loading-raw.png."""
import math
from pathlib import Path
import bpy
from mathutils import Vector

ST4 = Path(__file__).resolve().parent
GLB = ST4 / "crafted-shelly.glb"
OUT = ST4 / "loading-raw.png"


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(GLB))

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 384
    scene.render.resolution_y = 384
    scene.render.film_transparent = True
    scene.render.image_settings.file_format = "PNG"
    scene.render.image_settings.color_mode = "RGBA"
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.45, 0.72, 0.78, 1.0)
    bg.inputs[1].default_value = 0.72
    scene.view_settings.view_transform = "Standard"

    for name, loc, energy, color, size in (
        ("Key", (-2.0, -3.2, 3.4), 340, (1.0, 0.96, 0.88), 4.0),
        ("Bounce", (2.6, -2.0, -0.8), 150, (0.62, 0.95, 0.92), 4.5),
        ("Rim", (1.8, 3.0, 2.8), 230, (0.95, 0.88, 1.0), 3.5),
    ):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.color = color
        light.size = size
        lobj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(lobj)
        lobj.location = Vector(loc)
        lobj.rotation_euler = (Vector((0, -0.1, 0.45)) - lobj.location).to_track_quat("-Z", "Y").to_euler()

    cam_data = bpy.data.cameras.new("LoadCam")
    cam_data.lens = 45
    cam = bpy.data.objects.new("LoadCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    target = Vector((0.0, -0.06, 0.46))
    az, el = math.radians(42), math.radians(18)
    dist = 2.75
    cam.location = target + dist * Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()

    scene.render.filepath = str(OUT)
    bpy.ops.render.render(write_still=True)
    print(f"Rendered {OUT}")


if __name__ == "__main__":
    main()
