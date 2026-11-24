"""Render 4-angle clay turnaround sheet (yaw0 -Y, +90 +X, 180 +Y, 270 -X) for all 5 raw-shape GLBs."""
import math
import subprocess
import sys
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
TILES = HERE / "_shape_tiles"
DEFAULT_SLUGS = ["echo", "taxi-squid", "bok", "hana", "captain-bay"]


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for it in list(col):
            if it.users == 0:
                col.remove(it)


def render_character_yaws(slug):
    d = HERE / slug
    glb = d / "raw-shape.glb"
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(glb))
    bpy.context.view_layer.update()

    clay = bpy.data.materials.new("ClayPreview")
    clay.use_nodes = True
    bsdf = clay.node_tree.nodes.get("Principled BSDF")
    if bsdf:
        bsdf.inputs["Base Color"].default_value = (0.76, 0.80, 0.84, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.52

    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    world_pts = []
    deps = bpy.context.evaluated_depsgraph_get()
    for m in meshes:
        m.data.materials.clear()
        m.data.materials.append(clay)
        for p in m.data.polygons:
            p.use_smooth = True
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
    radius = max(0.3, (mx - mn).length * 0.5)

    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 10
    scene.cycles.use_denoising = True
    scene.render.resolution_x = 340
    scene.render.resolution_y = 340
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    bg = scene.world.node_tree.nodes["Background"]
    bg.inputs[0].default_value = (0.28, 0.48, 0.56, 1.0)
    bg.inputs[1].default_value = 0.70
    scene.view_settings.view_transform = "Standard"

    for name, offset, energy in (("Key", (-2.2, -3.4, 3.0), 340), ("Fill", (2.8, 2.0, 1.2), 200), ("Rim", (1.2, 3.2, 2.2), 180)):
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

    for tag, az_deg in (("yaw0", 0), ("yaw90", 90), ("yaw180", 180), ("yaw270", 270)):
        az = math.radians(az_deg)
        el = math.radians(10)
        dist = radius * 2.75
        cam.location = center + dist * Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        cam.rotation_euler = (center - cam.location).to_track_quat("-Z", "Y").to_euler()
        scene.render.filepath = str(TILES / f"{slug}_{tag}.png")
        bpy.ops.render.render(write_still=True)
    print(f"Rendered clay turnarounds for {slug}: min={tuple(round(v, 3) for v in mn)} max={tuple(round(v, 3) for v in mx)}")


def main():
    TILES.mkdir(parents=True, exist_ok=True)
    slugs = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else DEFAULT_SLUGS
    rendered = []
    for s in slugs:
        if (HERE / s / "raw-shape.glb").exists():
            render_character_yaws(s)
            rendered.append(s)
    if rendered:
        wsl_helper = "/mnt/c" + str(HERE / "stitch_shape_turnarounds.py").replace("\\", "/")[2:]
        subprocess.run(["wsl", "-e", "/home/wendy/.venvs/coral-classroom/bin/python", wsl_helper], check=True)


if __name__ == "__main__":
    main()
