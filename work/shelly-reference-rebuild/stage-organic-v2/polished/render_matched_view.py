"""Render a warm-daylight 3/4 Blender Cycles view of shelly-polished.glb for visual comparison against approved-shelly-crop.png."""
import math
from pathlib import Path
import bpy
from mathutils import Vector

POL = Path(__file__).resolve().parent
GLB = POL / "shelly-polished.glb"
OUT = POL / "matched-target-angle.png"


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(GLB))
    obj = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 16
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 768
    scene.render.resolution_y = 512
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.38, 0.62, 0.68, 1.0)
    bg.inputs[1].default_value = 0.65
    scene.view_settings.view_transform = "Standard"

    # Warm sunlit underwater key + soft aqua bounce + gentle lavender rim (calibrated so highlights stay rich)
    for name, loc, energy, color, size in (
        ("Key", (-2.6, -4.2, 4.4), 520, (1.0, 0.96, 0.88), 4.5),
        ("Bounce", (3.5, -2.5, -1.2), 200, (0.62, 0.95, 0.92), 5.0),
        ("Rim", (2.2, 3.8, 3.6), 310, (0.95, 0.88, 1.0), 4.0),
    ):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.color = color
        light.size = size
        lobj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(lobj)
        lobj.location = Vector(loc)
        lobj.rotation_euler = (Vector((0, -0.1, 0.65)) - lobj.location).to_track_quat("-Z", "Y").to_euler()

    cam_data = bpy.data.cameras.new("MatchedCam")
    cam_data.lens = 45
    cam = bpy.data.objects.new("MatchedCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    # Target framing: camera looking at front-right 3/4 (azimuth +52 deg, elevation +16 deg)
    target = Vector((-0.05, -0.18, 0.72))
    az = math.radians(52)
    el = math.radians(16)
    dist = 4.65
    cam.location = target + dist * Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
    cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()

    scene.render.filepath = str(OUT)
    bpy.ops.render.render(write_still=True)
    print(f"Saved matched view: {OUT}")


if __name__ == "__main__":
    main()
