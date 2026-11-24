"""Render 4-angle yaw verification sheet (front -Y, quarter, side +X, back +Y) for raw-trellis GLBs."""
import math
import sys
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for it in list(col):
            if it.users == 0:
                col.remove(it)


def render_sheet(slug):
    d = HERE / slug
    glb = d / "raw-trellis.glb"
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(glb))
    bpy.context.view_layer.update()

    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    pts = [m.matrix_world @ Vector(c) for m in meshes for c in m.bound_box]
    mn = Vector((min(p.x for p in pts), min(p.y for p in pts), min(p.z for p in pts)))
    mx = Vector((max(p.x for p in pts), max(p.y for p in pts), max(p.z for p in pts)))
    center = 0.5 * (mn + mx)
    radius = max(0.3, (mx - mn).length * 0.5)

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 8
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 360
    scene.render.resolution_y = 360
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.38, 0.62, 0.68, 1.0)
    bg.inputs[1].default_value = 0.65
    scene.view_settings.view_transform = "Standard"

    for name, offset, energy in (("Key", (-2.2, -3.4, 3.0), 340), ("Fill", (2.6, 2.0, 1.0), 220)):
        ld = bpy.data.lights.new(name, "AREA")
        ld.energy = energy * (radius ** 2)
        ld.size = 4.0 * radius
        lo = bpy.data.objects.new(name, ld)
        scene.collection.objects.link(lo)
        lo.location = center + Vector(offset) * radius
        lo.rotation_euler = (center - lo.location).to_track_quat("-Z", "Y").to_euler()

    cd = bpy.data.cameras.new("YawCam")
    cd.lens = 45
    cam = bpy.data.objects.new("YawCam", cd)
    scene.collection.objects.link(cam)
    scene.camera = cam

    for tag, az_deg in (("yaw0_front_negY", 0), ("yaw90_posX", 90), ("yaw180_posY", 180), ("yaw270_negX", 270)):
        az = math.radians(az_deg)
        el = math.radians(12)
        dist = radius * 2.85
        cam.location = center + dist * Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(d / f"{tag}.png")
        bpy.ops.render.render(write_still=True)
    print(f"Rendered 4 yaw views for {slug}: bounds min={tuple(round(v,3) for v in mn)} max={tuple(round(v,3) for v in mx)}")


def main():
    slugs = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else ["echo", "taxi-squid", "bok", "hana", "captain-bay"]
    for s in slugs:
        if (HERE / s / "raw-trellis.glb").exists():
            render_sheet(s)


if __name__ == "__main__":
    main()
