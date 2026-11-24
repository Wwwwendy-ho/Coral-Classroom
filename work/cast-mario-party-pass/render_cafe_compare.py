"""Render 2x3 Before (Canonical) vs After (Mario-Party Pass) comparison sheet for Café Seahorse."""
import math
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
BEFORE_GLB = REPO / "game" / "assets" / "models" / "cafe-seahorse-close.glb"
AFTER_GLB = HERE / "cafe-seahorse-mp" / "cafe-seahorse-close.glb"
TILES = HERE / "cafe-seahorse-mp" / "_tiles"


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
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.context.view_layer.update()
    pts = [m.matrix_world @ Vector(c) for m in meshes for c in m.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    center = 0.5 * (mn + mx)
    height = max(0.5, mx.z - mn.z)

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

    # Café Seahorse generator faces roughly -Y with YAW=-34 deg around Z
    for name, loc, energy, color, size in (
        ("Key", (-2.2, -3.5, 3.2), 380, (1.0, 0.96, 0.88), 4.0),
        ("Bounce", (2.6, -2.0, 0.0), 160, (0.66, 0.95, 0.92), 4.5),
        ("Rim", (1.6, 3.0, 3.0), 220, (0.95, 0.88, 1.0), 3.5),
    ):
        light = bpy.data.lights.new(name, "AREA")
        light.energy = energy
        light.color = color
        light.size = size
        lobj = bpy.data.objects.new(name, light)
        scene.collection.objects.link(lobj)
        lobj.location = center + Vector(loc)
        lobj.rotation_euler = (center - lobj.location).to_track_quat("-Z", "Y").to_euler()

    cam_data = bpy.data.cameras.new("CafeCam")
    cam_data.lens = 48
    cam = bpy.data.objects.new("CafeCam", cam_data)
    scene.collection.objects.link(cam)
    scene.camera = cam

    head_tgt = Vector((center.x - 0.18, center.y - 0.22, mn.z + height * 0.78))
    views = [
        ("front", -34, 8, 2.05, head_tgt),
        ("quarter", 4, 10, 2.35, Vector((center.x - 0.14, center.y - 0.16, mn.z + height * 0.76))),
        ("body", -6, 12, 5.20, Vector((center.x, center.y, mn.z + height * 0.51))),
    ]
    for tag, az_deg, el_deg, dist, tgt in views:
        az, el = math.radians(az_deg), math.radians(el_deg)
        cam.location = tgt + dist * Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        cam.rotation_euler = (tgt - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(TILES / f"{prefix}-{tag}.png")
        bpy.ops.render.render(write_still=True)


def main():
    TILES.mkdir(parents=True, exist_ok=True)
    render_row(BEFORE_GLB, "before")
    render_row(AFTER_GLB, "after")


if __name__ == "__main__":
    main()
