"""Decimate, skin, rig with 11-joint ShellyRig + 6 NLA clips, export crafted-shelly.glb & crafted-shelly-view.glb, and render pose stills."""
import json
import math
from pathlib import Path
import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent
POL = HERE.parent / "polished"
REPO = HERE.parents[3]
CANON_GLB = REPO / "game" / "assets" / "models" / "crafted-shelly.glb"
SRC_GLB = POL / "shelly-polished.glb"

SCALE = 0.625
Z_OFF = 0.04

BONE_HEADS = {
    "Root": (0.0, 0.0, 0.04),
    "Body": (0.0, 0.14, 0.42),
    "Neck": (0.0, -0.34, 0.42),
    "Head": (0.0, -0.52, 0.68),
    "EyeL": (-0.1943, -0.7804, 0.8792),
    "EyeR": (0.1943, -0.7804, 0.8792),
    "FlipperFL": (-0.30, -0.36, 0.30),
    "FlipperFR": (0.30, -0.36, 0.30),
    "FlipperRL": (-0.28, 0.56, 0.20),
    "FlipperRR": (0.28, 0.56, 0.20),
    "Tail": (0.0, 0.78, 0.22),
}

HAT_WORLD = (0.0, -0.683, 1.015)
MOUTH_WORLD = (0.0, -0.968, 0.745)
BONE_ORDER = ["Root", "Body", "Neck", "Head", "EyeL", "EyeR", "FlipperFL", "FlipperFR", "FlipperRL", "FlipperRR", "Tail"]


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for item in list(col):
            if item.users == 0:
                col.remove(item)


def setup_rig_from_canonical():
    bpy.ops.import_scene.gltf(filepath=str(CANON_GLB))
    arm = bpy.data.objects["ShellyRig"]
    hat = bpy.data.objects["HatAnchor"]
    mouth = bpy.data.objects["MouthAnchor"]

    # Remove old canonical meshes (Shelly mesh + Icosphere), keeping only ShellyRig + anchors
    for o in list(bpy.context.scene.objects):
        if o not in (arm, hat, mouth):
            bpy.data.objects.remove(o, do_unlink=True)

    # Record canonical unit bone vectors + lengths, then move edit heads onto organic landmarks keeping roll=0.0
    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    saved = {}
    for eb in arm.data.edit_bones:
        vec = eb.tail - eb.head
        length = vec.length
        direction = vec.normalized() if length > 1e-6 else Vector((0.0, 0.0, 1.0))
        saved[eb.name] = (direction, length)
    for eb in arm.data.edit_bones:
        direction, length = saved[eb.name]
        new_head = Vector(BONE_HEADS[eb.name])
        eb.head = new_head
        eb.tail = new_head + direction * length
        eb.roll = 0.0
    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update()

    # Align anchors in world space while preserving Head bone parenting
    for anchor, world_pos in ((hat, HAT_WORLD), (mouth, MOUTH_WORLD)):
        anchor.parent = arm
        anchor.parent_type = "BONE"
        anchor.parent_bone = "Head"
        anchor.matrix_world = Matrix.Translation(Vector(world_pos))
    bpy.context.view_layer.update()
    print(
        f"Rig aligned. HatAnchor world={[round(v,4) for v in hat.matrix_world.translation]}, "
        f"MouthAnchor world={[round(v,4) for v in mouth.matrix_world.translation]}"
    )
    return arm, hat, mouth


def prepare_welded_source():
    before = set(bpy.context.scene.objects)
    bpy.ops.import_scene.gltf(filepath=str(SRC_GLB))
    imported = [o for o in bpy.context.scene.objects if o not in before]
    src = [o for o in imported if o.type == "MESH"][0]
    for o in imported:
        if o is not src:
            bpy.data.objects.remove(o, do_unlink=True)

    # Bake object matrix, scale to S=0.625 + Z_OFF=0.04
    mat = src.matrix_world.copy()
    src.parent = None
    src.matrix_world = Matrix.Identity(4)
    src.data.transform(mat)
    for v in src.data.vertices:
        v.co = v.co * SCALE + Vector((0.0, 0.0, Z_OFF))
    src.data.update()

    # Weld UV-seam-split vertices cleanly while preserving UV islands + triangulate
    bm = bmesh.new()
    bm.from_mesh(src.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-4)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(src.data)
    bm.free()
    src.data.update()

    tris = sum(len(p.vertices) - 2 for p in src.data.polygons)
    print(f"Prepared welded organic source: verts={len(src.data.vertices)} tris={tris}")
    return src


def decimate_lod(src, target_tris, max_tris):
    obj = src.copy()
    obj.data = src.data.copy()
    bpy.context.scene.collection.objects.link(obj)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    cur_tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    mod = obj.modifiers.new("Decimate", "DECIMATE")
    mod.decimate_type = "COLLAPSE"
    mod.ratio = max(0.05, min(1.0, target_tris / max(1, cur_tris)))
    mod.use_collapse_triangulate = True
    mod.delimit = {"UV"}
    bpy.ops.object.modifier_apply(modifier="Decimate")

    tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)
    if tris > max_tris:
        mod2 = obj.modifiers.new("Decimate2", "DECIMATE")
        mod2.decimate_type = "COLLAPSE"
        mod2.ratio = max(0.1, min(0.99, (target_tris * 0.96) / tris))
        mod2.use_collapse_triangulate = True
        mod2.delimit = {"UV"}
        bpy.ops.object.modifier_apply(modifier="Decimate2")
        tris = sum(len(p.vertices) - 2 for p in obj.data.polygons)

    if tris > max_tris:
        mod3 = obj.modifiers.new("Decimate3", "DECIMATE")
        mod3.decimate_type = "COLLAPSE"
        mod3.ratio = (max_tris * 0.96) / tris
        mod3.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier="Decimate3")

    # Ensure strictly triangulated if any non-tri polygon remains
    if any(len(p.vertices) != 3 for p in obj.data.polygons):
        bm = bmesh.new()
        bm.from_mesh(obj.data)
        bmesh.ops.triangulate(bm, faces=bm.faces[:])
        bm.to_mesh(obj.data)
        bm.free()
        obj.data.update()

    obj.vertex_groups.clear()
    final_tris = len(obj.data.polygons)
    print(f"Decimated LOD: verts={len(obj.data.vertices)} tris={final_tris} (limit {max_tris})")
    return obj


def assign_skin_weights(obj):
    coords = np.array([v.co[:] for v in obj.data.vertices], dtype=np.float64)
    x, y, z = coords[:, 0], coords[:, 1], coords[:, 2]

    eyeL = np.array(BONE_HEADS["EyeL"], dtype=np.float64)
    eyeR = np.array(BONE_HEADS["EyeR"], dtype=np.float64)
    dist_eyeL = np.linalg.norm(coords - eyeL, axis=-1)
    dist_eyeR = np.linalg.norm(coords - eyeR, axis=-1)

    w_fl = (x < 0) * smoothstep(0.24, 0.44, -x) * smoothstep(0.08, -0.22, y) * np.maximum(smoothstep(0.40, 0.28, z), smoothstep(0.48, 0.56, -x))
    w_fr = (x > 0) * smoothstep(0.24, 0.44, x) * smoothstep(0.08, -0.22, y) * np.maximum(smoothstep(0.40, 0.28, z), smoothstep(0.48, 0.56, x))
    w_rl = (x < 0) * smoothstep(0.18, 0.32, -x) * smoothstep(0.26, 0.48, y) * smoothstep(0.32, 0.20, z)
    w_rr = (x > 0) * smoothstep(0.18, 0.32, x) * smoothstep(0.26, 0.48, y) * smoothstep(0.32, 0.20, z)
    w_tail = smoothstep(0.20, 0.10, np.abs(x)) * smoothstep(0.66, 0.80, y) * smoothstep(0.27, 0.20, z)
    w_headneck = smoothstep(-0.26, -0.42, y) * smoothstep(0.32, 0.42, z) * np.clip(1.0 - w_fl - w_fr, 0.0, 1.0)
    s_head = smoothstep(-0.46, -0.60, y - 0.55 * (z - 0.62))
    w_head_raw = w_headneck * s_head
    w_neck = w_headneck * (1.0 - s_head)
    w_eyeL = w_head_raw * 0.60 * smoothstep(0.092, 0.045, dist_eyeL)
    w_eyeR = w_head_raw * 0.60 * smoothstep(0.092, 0.045, dist_eyeR)
    w_head = np.maximum(0.0, w_head_raw - w_eyeL - w_eyeR)
    w_body = np.maximum(0.0, 1.0 - (w_fl + w_fr + w_rl + w_rr + w_tail + w_neck + w_head + w_eyeL + w_eyeR))
    w_root = np.zeros_like(w_body)

    W = np.stack([w_root, w_body, w_neck, w_head, w_eyeL, w_eyeR, w_fl, w_fr, w_rl, w_rr, w_tail], axis=-1)
    vgs = [obj.vertex_groups.new(name=name) for name in BONE_ORDER]
    dominant = {name: 0 for name in BONE_ORDER}

    for i in range(len(coords)):
        row = W[i].copy()
        top4 = np.argsort(row)[-4:]
        keep = np.zeros(11, dtype=np.float64)
        for j in top4:
            if row[j] > 1e-5:
                keep[j] = row[j]
        total = keep.sum()
        if total <= 1e-6:
            keep[:] = 0.0
            keep[1] = 1.0  # fallback Body
        else:
            keep /= total
        for j, val in enumerate(keep):
            if val > 0.0:
                vgs[j].add([i], float(val), "REPLACE")
                if val > 0.5:
                    dominant[BONE_ORDER[j]] += 1
    print("Dominant (>0.5) vertex counts:", dominant)


def apply_opaque_material(obj, color_path, surface_path):
    mat = bpy.data.materials.new("Shelly | organic seafoam and lavender carapace")
    mat.use_nodes = True
    if hasattr(mat, "blend_method"):
        mat.blend_method = "OPAQUE"
    nt = mat.node_tree
    nt.nodes.clear()
    out_node = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.35

    tex_col = nt.nodes.new("ShaderNodeTexImage")
    img_col = bpy.data.images.load(str(color_path), check_existing=True)
    img_col.colorspace_settings.name = "sRGB"
    img_col.name = f"Shelly_color_{color_path.stem}"
    tex_col.image = img_col

    tex_surf = nt.nodes.new("ShaderNodeTexImage")
    img_surf = bpy.data.images.load(str(surface_path), check_existing=True)
    img_surf.colorspace_settings.name = "Non-Color"
    img_surf.name = f"Shelly_surface_{surface_path.stem}"
    tex_surf.image = img_surf

    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tex_col.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex_surf.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    nt.links.new(bsdf.outputs["BSDF"], out_node.inputs["Surface"])

    obj.data.materials.clear()
    obj.data.materials.append(mat)


def export_rigged_lod(arm, hat, mouth, src, target_tris, max_tris, color_path, surface_path, out_path):
    mesh_obj = decimate_lod(src, target_tris, max_tris)
    mesh_obj.name = "Shelly | organic sea turtle"
    assign_skin_weights(mesh_obj)
    apply_opaque_material(mesh_obj, color_path, surface_path)

    mesh_obj.parent = arm
    mesh_obj.matrix_parent_inverse.identity()
    amod = mesh_obj.modifiers.new("Armature", "ARMATURE")
    amod.object = arm

    bpy.ops.object.select_all(action="DESELECT")
    for o in (arm, mesh_obj, hat, mouth):
        o.select_set(True)
    bpy.context.view_layer.objects.active = arm

    bpy.ops.export_scene.gltf(
        filepath=str(out_path),
        export_format="GLB",
        use_selection=True,
        export_image_format="AUTO",
        export_skins=True,
        export_animations=True,
        export_animation_mode="NLA_TRACKS",
        export_nla_strips=True,
        export_def_bones=False,
        export_all_influences=False,
    )
    size_bytes = out_path.stat().st_size
    print(f"Exported {out_path.name}: {size_bytes:,} bytes, tris={len(mesh_obj.data.polygons)}")

    # Remove temporary LOD mesh before next LOD
    mat = mesh_obj.data.materials[0] if mesh_obj.data.materials else None
    bpy.data.objects.remove(mesh_obj, do_unlink=True)
    if mat and mat.users == 0:
        bpy.data.materials.remove(mat)


def render_pose_verification(glb_path):
    for action_name, frame, out_name in (
        ("Swim_ShellyRig", 18, "pose-swim.png"),
        ("Happy_ShellyRig", 20, "pose-happy.png"),
    ):
        clear_scene()
        bpy.ops.import_scene.gltf(filepath=str(glb_path))
        arm = bpy.data.objects["ShellyRig"]
        # Mute NLA strips and evaluate the requested action at frame
        if arm.animation_data:
            for t in arm.animation_data.nla_tracks:
                t.mute = True
            arm.animation_data.action = bpy.data.actions[action_name]
        bpy.context.scene.frame_set(frame)
        bpy.context.view_layer.update()

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

        cam_data = bpy.data.cameras.new("PoseCam")
        cam_data.lens = 45
        cam = bpy.data.objects.new("PoseCam", cam_data)
        scene.collection.objects.link(cam)
        scene.camera = cam
        target = Vector((0.0, -0.12, 0.48))
        az = math.radians(42)
        el = math.radians(18)
        dist = 3.25
        cam.location = target + dist * Vector((math.sin(az) * math.cos(el), -math.cos(az) * math.cos(el), math.sin(el)))
        cam.rotation_euler = (target - cam.location).to_track_quat("-Z", "Y").to_euler()

        out_path = HERE / out_name
        scene.render.filepath = str(out_path)
        bpy.ops.render.render(write_still=True)
        print(f"Rendered {out_name}")


def main():
    HERE.mkdir(parents=True, exist_ok=True)
    clear_scene()
    arm, hat, mouth = setup_rig_from_canonical()
    src = prepare_welded_source()

    hero_glb = HERE / "crafted-shelly.glb"
    view_glb = HERE / "crafted-shelly-view.glb"

    export_rigged_lod(
        arm, hat, mouth, src,
        target_tris=22200, max_tris=23836,
        color_path=HERE / "color-2048.jpg",
        surface_path=HERE / "surface-512.png",
        out_path=hero_glb,
    )
    export_rigged_lod(
        arm, hat, mouth, src,
        target_tris=11200, max_tris=11947,
        color_path=HERE / "color-1024.jpg",
        surface_path=HERE / "surface-256.png",
        out_path=view_glb,
    )
    render_pose_verification(hero_glb)


if __name__ == "__main__":
    main()
