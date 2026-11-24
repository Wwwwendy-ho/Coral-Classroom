"""Render Visual Gate C audit sheet: side-profile eye flush check across all 5 + Captain Bay grounded z=0 deck animation strip."""
import math
from pathlib import Path
import bpy
from mathutils import Vector

HERE = Path(__file__).resolve().parent
TILES_DIR = HERE / "_audit_tiles"


def reset_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for it in list(col):
            if it.users == 0:
                col.remove(it)


def setup_studio(res=384):
    sc = bpy.context.scene
    sc.render.engine = "CYCLES"
    sc.cycles.samples = 24
    sc.cycles.use_denoising = True
    sc.render.resolution_x = res
    sc.render.resolution_y = res
    sc.render.image_settings.file_format = "PNG"
    sc.view_settings.view_transform = "Standard"
    sc.view_settings.look = "None"
    sc.view_settings.exposure = 0.0

    world = bpy.data.worlds.new("AuditWorld")
    sc.world = world
    world.use_nodes = True
    bg = world.node_tree.nodes.get("Background")
    if bg:
        bg.inputs[0].default_value = (0.50, 0.60, 0.64, 1.0)
        bg.inputs[1].default_value = 0.85

    # Neutral key + soft fill + rim light
    for name, energy, rot_deg in (
        ("KeySun", 2.4, (46, 0, -28)),
        ("FillSun", 1.1, (65, 0, 140)),
        ("RimSun", 0.9, (52, 0, 170)),
    ):
        ld = bpy.data.lights.new(name, type="SUN")
        ld.energy = energy
        lo = bpy.data.objects.new(name, ld)
        lo.rotation_euler = tuple(math.radians(a) for a in rot_deg)
        sc.collection.objects.link(lo)


def import_and_frame(glb_path, cam_dir, clip_name=None, frame_frac=0.0, add_deck=False):
    reset_scene()
    setup_studio(384)
    bpy.ops.import_scene.gltf(filepath=str(glb_path))
    bpy.context.view_layer.update()

    rigs = [o for o in bpy.context.scene.objects if o.type == "ARMATURE"]
    if rigs and clip_name and clip_name in bpy.data.actions:
        rig = rigs[0]
        if not rig.animation_data:
            rig.animation_data_create()
        act = bpy.data.actions[clip_name]
        rig.animation_data.action = act
        f0, f1 = act.frame_range
        bpy.context.scene.frame_set(int(round(f0 + (f1 - f0) * frame_frac)))
        bpy.context.view_layer.update()

    # Compute world-space bbox of meshes (and evaluated deformed bbox!)
    deps = bpy.context.evaluated_depsgraph_get()
    pts = []
    for o in bpy.context.scene.objects:
        if o.type != "MESH":
            continue
        eo = o.evaluated_get(deps)
        me = eo.to_mesh()
        for v in me.vertices:
            pts.append(eo.matrix_world @ v.co)
        eo.to_mesh_clear()

    xs = [p.x for p in pts]
    ys = [p.y for p in pts]
    zs = [p.z for p in pts]
    c = Vector(((min(xs) + max(xs)) * 0.5, (min(ys) + max(ys)) * 0.5, (min(zs) + max(zs)) * 0.5))
    ext = max(max(xs) - min(xs), max(ys) - min(ys), max(zs) - min(zs))

    if add_deck:
        # Visible wooden deck plank plane right at Z = 0.0 to inspect flipper grounding!
        bpy.ops.mesh.primitive_plane_add(size=4.0, location=(c.x, c.y, 0.0))
        deck = bpy.context.active_object
        mat = bpy.data.materials.new("DeckWood")
        mat.use_nodes = True
        bsdf = mat.node_tree.nodes.get("Principled BSDF")
        bsdf.inputs["Base Color"].default_value = (0.58, 0.42, 0.27, 1.0)
        bsdf.inputs["Roughness"].default_value = 0.78
        deck.data.materials.append(mat)

    cam_d = bpy.data.cameras.new("AuditCam")
    cam_d.lens = 45.0
    cam = bpy.data.objects.new("AuditCam", cam_d)
    bpy.context.scene.collection.objects.link(cam)
    bpy.context.scene.camera = cam

    d_vec = Vector(cam_dir).normalized()
    dist = ext * 2.15
    cam.location = c + d_vec * dist
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()


def render_tile(glb_path, out_png, cam_dir, clip_name=None, frame_frac=0.0, add_deck=False):
    import_and_frame(glb_path, cam_dir, clip_name=clip_name, frame_frac=frame_frac, add_deck=add_deck)
    bpy.context.scene.render.filepath = str(out_png)
    bpy.ops.render.render(write_still=True)


def main():
    TILES_DIR.mkdir(parents=True, exist_ok=True)
    bay_glb = HERE / "captain-bay" / "out" / "captain-bay-close.glb"

    row1 = [
        ("Bay Front 3/4", bay_glb, (0.35, -0.92, 0.16), None, 0.0, True),
        ("Bay 90° Side (Eyes)", bay_glb, (1.0, 0.0, 0.10), None, 0.0, True),
        ("Bay Back 3/4", bay_glb, (-0.42, 0.90, 0.20), None, 0.0, True),
        ("Bay Idle (z=0)", bay_glb, (0.28, -0.95, 0.12), "Idle", 0.25, True),
        ("Bay Listen (z=0)", bay_glb, (0.28, -0.95, 0.12), "Listen", 0.22, True),
        ("Bay React (z=0)", bay_glb, (0.28, -0.95, 0.12), "React", 0.20, True),
    ]
    row2_specs = [
        ("Bok Front", HERE / "bok/out/bok-close.glb", (0.32, -0.94, 0.14)),
        ("Bok 90° Side", HERE / "bok/out/bok-close.glb", (1.0, 0.0, 0.08)),
        ("Echo Front", HERE / "echo/out/echo-close.glb", (-0.52, -0.84, 0.14)),
        ("Echo 90° Side", HERE / "echo/out/echo-close.glb", (-1.0, 0.0, 0.08)),
        ("Taxi Front", HERE / "taxi-squid/out/taxi-squid-close.glb", (0.28, -0.95, 0.14)),
        ("Hana 90° Side", HERE / "hana/out/hana-close.glb", (1.0, 0.0, 0.08)),
    ]

    for idx, (label, glb, cdir, clip, ff, deck) in enumerate(row1):
        p = TILES_DIR / f"r1_{idx}.png"
        render_tile(glb, p, cdir, clip_name=clip, frame_frac=ff, add_deck=deck)

    for idx, (label, glb, cdir) in enumerate(row2_specs):
        p = TILES_DIR / f"r2_{idx}.png"
        render_tile(glb, p, cdir)

    print("Rendered all 12 audit tiles to", TILES_DIR, flush=True)


if __name__ == "__main__":
    main()
