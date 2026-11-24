"""Build decimated + rigged Mario-Party Shelly GLBs (crafted-shelly.glb & crafted-shelly-view.glb) under stage-organic-v3-mp/."""
import importlib.util
import math
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
RIG2_SCRIPT = HERE.parent / "stage-organic-v2" / "rigged" / "build_rigged_shelly.py"


def load_rig2():
    spec = importlib.util.spec_from_file_location("build_rigged_shelly", RIG2_SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def render_mp_views(glb_path, mod):
    mod.clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 12
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
        ("Key", (-2.0, -3.2, 3.4), 320, (1.0, 0.96, 0.88), 4.0),
        ("Bounce", (2.6, -2.0, -0.8), 140, (0.62, 0.95, 0.92), 4.5),
        ("Rim", (1.8, 3.0, 2.8), 220, (0.95, 0.88, 1.0), 3.5),
    ):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.color = color
        light.size = size
        lobj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(lobj)
        lobj.location = Vector(loc)
        lobj.rotation_euler = (Vector((0, -0.1, 0.45)) - lobj.location).to_track_quat("-Z", "Y").to_euler()

    cam_data = bpy.data.cameras.new("MpCam")
    cam_data.lens = 45
    cam = bpy.data.objects.new("MpCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    for out_name, az_deg, el_deg, dist, tz in (
        ("mp-quarter.png", 44, 17, 3.05, 0.48),
        ("mp-game.png", 18, 48, 3.35, 0.42),
    ):
        target = Vector((0.0, -0.10, tz))
        az, el = math.radians(az_deg), math.radians(el_deg)
        cam.location = target + dist * Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(HERE / out_name)
        bpy.ops.render.render(write_still=True)
        print(f"Rendered {out_name}")


def main():
    mod = load_rig2()
    mod.clear_scene()
    arm, hat, mouth = mod.setup_rig_from_canonical()
    src = mod.prepare_welded_source()

    hero_glb = HERE / "crafted-shelly.glb"
    view_glb = HERE / "crafted-shelly-view.glb"

    mod.export_rigged_lod(
        arm, hat, mouth, src,
        target_tris=22200, max_tris=23836,
        color_path=HERE / "color-2048.jpg",
        surface_path=HERE / "surface-512.png",
        out_path=hero_glb,
    )
    mod.export_rigged_lod(
        arm, hat, mouth, src,
        target_tris=11200, max_tris=11947,
        color_path=HERE / "color-1024.jpg",
        surface_path=HERE / "surface-256.png",
        out_path=view_glb,
    )
    render_mp_views(hero_glb, mod)


if __name__ == "__main__":
    main()
