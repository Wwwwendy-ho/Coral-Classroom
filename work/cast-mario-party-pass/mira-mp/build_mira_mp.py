"""Build smooth coastal teenage female Mira GLBs (mira-board.glb & mira-close.glb) from Mario-Party organic Shelly."""
import importlib.util
import json
import math
from pathlib import Path
import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Quaternion, Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
RIG2_SCRIPT = REPO / "work" / "shelly-reference-rebuild" / "stage-organic-v2" / "rigged" / "build_rigged_shelly.py"


def load_rig2():
    spec = importlib.util.spec_from_file_location("build_rigged_shelly", RIG2_SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def smoothstep(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def morph_mira(co):
    """Smooth C2 teenage-female proportion morph (no sharp thresholds, zero spikes)."""
    x, y, z = co.x, co.y, co.z

    # Carapace dome mask & head mask in scaled Shelly space
    dome_w = smoothstep(-0.32, -0.05, y) * smoothstep(0.30, 0.48, z)
    head_w = smoothstep(0.54, 0.72, z) * smoothstep(-0.30, -0.50, y)
    flip_w = smoothstep(0.32, 0.54, abs(x))

    # Slightly longer, sleeker juvenile carapace & athletic flippers
    nx = x * (1.0 - 0.055 * dome_w) * (1.0 + 0.11 * flip_w)
    ny = y * (1.0 + 0.12 * dome_w)
    nz = z * (1.0 + 0.02 * dome_w)
    if flip_w > 0.0:
        nz = 0.26 + (nz - 0.26) * (1.0 - 0.07 * flip_w)

    base_p = Vector((nx, ny, nz))

    # Poised, slightly slimmer teenage head (0.90x around head pivot, shifted forward & up)
    pivot = Vector((0.0, -0.68, 0.84))
    head_p = Vector((
        co.x * 0.90,
        pivot.y + (co.y - pivot.y) * 0.90 - 0.075,
        pivot.z + (co.z - pivot.z) * 0.90 + 0.055,
    ))
    return base_p.lerp(head_p, head_w)


def snap_surface(body_obj, pt, offset=0.0):
    ok, loc, nrm, _ = body_obj.closest_point_on_mesh(pt)
    if not ok:
        return pt, Vector((0, -1, 0))
    return loc + nrm * offset, nrm.normalized()


def make_patch_part(name, obj, patch_rect, atlas_w, rig, mat, bone_name):
    obj.name = name
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
    if not obj.data.uv_layers:
        obj.data.uv_layers.new(name="UVMap")
    uv = obj.data.uv_layers.active.data
    x, y, w, h = patch_rect
    # Note PIL Y=0 is top, Blender V=1 is top -> flip V coordinate cleanly
    v_top = 1.0 - y / atlas_w
    v_bot = 1.0 - (y + h) / atlas_w
    u0 = (x + 6) / atlas_w
    u1 = (x + w - 6) / atlas_w
    v0 = v_bot + 6 / atlas_w
    v1 = v_top - 6 / atlas_w
    for d in uv:
        d.uv = (u0 + max(0.0, min(1.0, d.uv.x)) * (u1 - u0), v0 + max(0.0, min(1.0, d.uv.y)) * (v1 - v0))
    obj.data.materials.clear()
    obj.data.materials.append(mat)
    for p in obj.data.polygons:
        p.use_smooth = True
    obj.vertex_groups.clear()
    vg = obj.vertex_groups.new(name=bone_name)
    vg.add(list(range(len(obj.data.vertices))), 1.0, "REPLACE")
    return obj


def build_grid_mesh(name, fn, nu, nv, wrap_u=False, wrap_v=False, reverse=False):
    verts, faces, uvs = [], [], []
    rows, cols = nv + (0 if wrap_v else 1), nu + (0 if wrap_u else 1)
    for j in range(rows):
        v = j / nv
        for i in range(cols):
            u = i / nu
            verts.append(fn(u, v))
            uvs.append((u, v))
    me = bpy.data.meshes.new(name)
    for j in range(nv):
        for i in range(nu):
            jc, jn = j, (j + 1) % rows if wrap_v else j + 1
            ic, inn = i, (i + 1) % cols if wrap_u else i + 1
            ids = (jc * cols + ic, jc * cols + inn, jn * cols + inn, jn * cols + ic)
            faces.append(ids[::-1] if reverse else ids)
    me.from_pydata(verts, [], faces)
    me.update()
    layer = me.uv_layers.new(name="UVMap")
    for poly in me.polygons:
        for li in poly.loop_indices:
            vi = me.loops[li].vertex_index
            layer.data[li].uv = uvs[vi]
    obj = bpy.data.objects.new(name, me)
    bpy.context.scene.collection.objects.link(obj)
    return obj


def build_accessories(body_obj, rig, mat, patches, atlas_w, lod_scale=1):
    parts = []
    # 1. Forehead Explorer Goggles (weighted to Head), sleekly hugging forehead brow above eyes
    brow_L_hint = morph_mira(Vector((-0.125, -0.770, 0.992)))
    brow_R_hint = morph_mira(Vector((0.125, -0.770, 0.992)))

    goggle_centers = []
    for side, hint in ((-1.0, brow_L_hint), (1.0, brow_R_hint)):
        # Snap directly onto forehead brow and pitch ~15 deg forward to hug the skull sleekly
        surf_pt, surf_n = snap_surface(body_obj, hint, offset=0.004)
        forward = (surf_n * 0.45 + Vector((side * 0.15, -0.82, 0.14))).normalized()
        right = forward.cross(Vector((0.0, 0.0, 1.0))).normalized()
        up = right.cross(forward).normalized()
        goggle_centers.append((surf_pt, forward, right, up))

        # Copper torus rim
        def rim_pt(u, v, c=surf_pt, f=forward, r=right, upv=up):
            a = math.tau * u
            b = math.tau * v
            R = 0.082
            rt = 0.015
            ring_p = r * (math.cos(a) * (R + rt * math.cos(b))) + upv * (math.sin(a) * (R + rt * math.cos(b)))
            return c + ring_p + f * (rt * math.sin(b) + 0.006)

        parts.append(make_patch_part(
            f"GoggleRim_{side}",
            build_grid_mesh(f"GoggleRim_{side}", rim_pt, 20 * lod_scale, 8 * lod_scale, wrap_u=True, wrap_v=True),
            patches["copper"], atlas_w, rig, mat, "Head",
        ))

        # Convex glossy opaque aqua lens
        def lens_pt(u, v, c=surf_pt, f=forward, r=right, upv=up):
            a = math.tau * u
            rho = 0.075 * v
            return c + r * (rho * math.cos(a)) + upv * (rho * math.sin(a)) + f * (0.008 + 0.020 * (1.0 - v * v))

        parts.append(make_patch_part(
            f"GoggleLens_{side}",
            build_grid_mesh(f"GoggleLens_{side}", lens_pt, 18 * lod_scale, 6 * lod_scale, wrap_u=True),
            patches["lens"], atlas_w, rig, mat, "Head",
        ))

    # Short copper nose bridge between the two rims + open-front teal head strap wrapping ONLY around sides & back
    pL, fL, _, _ = goggle_centers[0]
    pR, fR, _, _ = goggle_centers[1]
    brL = pL + Vector((0.075, 0.0, 0.0)) + fL * 0.010
    brR = pR - Vector((0.075, 0.0, 0.0)) + fR * 0.010
    brM = 0.5 * (brL + brR) + Vector((0.0, -0.010, 0.008))

    def bridge_fn(u, v):
        t = u
        p = ((1 - t) ** 2) * brL + 2 * (1 - t) * t * brM + (t ** 2) * brR
        ang_s = math.tau * v
        return p + Vector((0.0, math.cos(ang_s) * 0.010, math.sin(ang_s) * 0.010))

    parts.append(make_patch_part(
        "GoggleBridge",
        build_grid_mesh("GoggleBridge", bridge_fn, 8, 6, wrap_u=False, wrap_v=True),
        patches["copper"], atlas_w, rig, mat, "Head",
    ))

    head_mid = morph_mira(Vector((0.0, -0.68, 0.90)))
    strap_pts = [pR + Vector((0.068, 0.015, 0.012))]
    # Arc cleanly around right temple (+X) -> back of skull (+Y) -> left temple (-X), ZERO front strap!
    for k in range(1, 18):
        t = k / 18.0
        ang = (0.58 - 1.16 * t) * math.pi  # +0.58*pi (+X) -> 0 (+Y back) -> -0.58*pi (-X)
        probe = morph_mira(Vector((0.28 * math.sin(ang), -0.68 + 0.28 * math.cos(ang), 0.96)))
        sp, _ = snap_surface(body_obj, probe, offset=0.006)
        strap_pts.append(sp)
    strap_pts.append(pL + Vector((-0.068, 0.015, 0.012)))

    def strap_fn(u, v):
        idx_f = min(len(strap_pts) - 1.0001, u * (len(strap_pts) - 1))
        i = int(idx_f)
        f = idx_f - i
        p = strap_pts[i].lerp(strap_pts[i + 1], f)
        t_dir = (strap_pts[min(i + 1, len(strap_pts) - 1)] - strap_pts[max(i - 1, 0)]).normalized()
        out_n = (p - head_mid).normalized()
        up_w = out_n.cross(t_dir).normalized()
        ang_s = math.tau * v
        return p + up_w * (0.016 * math.cos(ang_s)) + out_n * (0.007 * math.sin(ang_s))

    parts.append(make_patch_part(
        "GoggleStrap",
        build_grid_mesh("GoggleStrap", strap_fn, 24 * lod_scale, 6 * lod_scale, wrap_u=False, wrap_v=True),
        patches["strap_teal"], atlas_w, rig, mat, "Head",
    ))

    # 2. Coral Map Satchel + Scroll clearly perched on upper right carapace shoulder/flank (visible in 3/4 view)
    sat_hint = morph_mira(Vector((0.43, -0.04, 0.50)))
    sat_c, sat_n = snap_surface(body_obj, sat_hint, offset=0.052)
    sat_up = Vector((0.0, 0.0, 1.0))
    sat_side = (sat_n * 0.7 + Vector((0.75, -0.25, 0.35))).normalized()
    sat_fwd = sat_side.cross(sat_up).normalized()
    sat_up = sat_fwd.cross(sat_side).normalized()

    bpy.ops.mesh.primitive_cube_add(size=1.0, location=(0, 0, 0))
    bag = bpy.context.object
    bag.scale = (0.095, 0.215, 0.175)
    bpy.ops.object.transform_apply(location=False, rotation=False, scale=True)
    bev = bag.modifiers.new("Soft", "BEVEL")
    bev.width = 0.032
    bev.segments = 3 if lod_scale > 1 else 2
    bpy.ops.object.modifier_apply(modifier="Soft")
    rot_m = Matrix((sat_side, sat_fwd, sat_up)).transposed().to_4x4()
    bag.matrix_world = Matrix.Translation(sat_c) @ rot_m
    parts.append(make_patch_part("MapSatchel", bag, patches["coral_canvas"], atlas_w, rig, mat, "Body"))

    # Map scroll tucked prominently along the top edge of the satchel
    scr_c = sat_c + sat_up * 0.088 - sat_side * 0.006
    bpy.ops.mesh.primitive_cylinder_add(vertices=14 * lod_scale, radius=0.040, depth=0.205, location=(0, 0, 0))
    scr = bpy.context.object
    scr.rotation_euler = (math.pi * 0.5, 0.0, 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    scr.matrix_world = Matrix.Translation(scr_c) @ rot_m
    parts.append(make_patch_part("MapScroll", scr, patches["scroll_cream"], atlas_w, rig, mat, "Body"))

    # Slim strap wrapping cleanly over the right shoulder / neck base (visible in both 3/4 and front)
    bag_strap_pts = []
    anchors = [
        sat_c + sat_up * 0.05,
        morph_mira(Vector((0.28, -0.30, 0.68))),
        morph_mira(Vector((-0.24, -0.34, 0.64))),
        morph_mira(Vector((-0.36, -0.14, 0.28))),
        morph_mira(Vector((0.02, 0.14, 0.22))),
        morph_mira(Vector((0.36, 0.08, 0.30))),
        sat_c - sat_up * 0.02,
    ]
    for a, b in zip(anchors[:-1], anchors[1:]):
        for k in range(4):
            t = k / 4.0
            sp, _ = snap_surface(body_obj, a.lerp(b, t), offset=0.011)
            bag_strap_pts.append(sp)
    bag_strap_pts.append(sat_c + sat_up * 0.05)

    def bag_strap_fn(u, v):
        idx_f = min(len(bag_strap_pts) - 1.0001, u * (len(bag_strap_pts) - 1))
        i = int(idx_f)
        f = idx_f - i
        p = bag_strap_pts[i].lerp(bag_strap_pts[i + 1], f)
        t_dir = (bag_strap_pts[min(i + 1, len(bag_strap_pts) - 1)] - bag_strap_pts[max(i - 1, 0)]).normalized()
        out_n = (p - Vector((0.0, -0.05, 0.42))).normalized()
        w_dir = out_n.cross(t_dir).normalized()
        ang_s = math.tau * v
        return p + w_dir * (0.022 * math.cos(ang_s)) + out_n * (0.008 * math.sin(ang_s))

    parts.append(make_patch_part(
        "SatchelStrap",
        build_grid_mesh("SatchelStrap", bag_strap_fn, 26 * lod_scale, 6 * lod_scale, wrap_u=True, wrap_v=True),
        patches["strap_teal"], atlas_w, rig, mat, "Body",
    ))

    return parts


def build_resident_clips(arm):
    """Author exact Idle, Listen, React resident clips animating EyeL/EyeR + Head + Flippers."""
    arm.animation_data_clear()
    for act in list(bpy.data.actions):
        if act.users == 0:
            bpy.data.actions.remove(act)

    clips = {
        "Idle": [
            # frame, body_rx, neck_rx, head_rx, head_rz, eye_rz, eye_rx, flap_rz
            (1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
            (25, 1.8, -1.5, -2.5, 4.5, 4.0, -2.0, 5.5),
            (55, 0.0, 0.5, 1.5, -4.0, -3.5, 1.5, -3.5),
            (85, -1.2, 0.8, 0.0, 1.5, 2.0, 0.0, 2.0),
            (105, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
        ],
        "Listen": [
            (1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
            (14, 1.5, -2.5, -5.0, 6.0, 5.5, -3.0, 3.0),
            (40, 1.2, -2.0, -4.5, 7.0, 4.0, -2.5, 4.0),
            (60, 0.4, -1.0, -2.0, 3.0, 1.5, -1.0, 1.5),
            (80, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
        ],
        "React": [
            (1, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
            (10, -4.0, -4.5, -8.5, -5.0, -6.5, -5.0, 16.0),
            (22, 3.0, 2.5, 5.0, 6.0, 6.0, 3.0, -10.0),
            (36, 0.8, -1.0, -2.0, 2.0, 2.0, 0.0, 6.0),
            (48, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0),
        ],
    }

    bpy.context.scene.render.fps = 30
    arm.animation_data_create()
    for name, keys in clips.items():
        action = bpy.data.actions.new(name)
        arm.animation_data.action = action
        for frame, brx, nrx, hrx, hrz, erz, erx, flap in keys:
            def set_rot(bname, rx_d, ry_d, rz_d):
                pb = arm.pose.bones[bname]
                pb.rotation_mode = "QUATERNION"
                pb.rotation_quaternion = Quaternion((1, 0, 0), math.radians(rx_d)) @ Quaternion((0, 1, 0), math.radians(ry_d)) @ Quaternion((0, 0, 1), math.radians(rz_d))
                pb.keyframe_insert(data_path="rotation_quaternion", frame=frame, group=bname)

            set_rot("Body", brx, 0.0, 0.0)
            set_rot("Neck", nrx, 0.0, 0.0)
            set_rot("Head", hrx, 0.0, hrz)
            set_rot("EyeL", erx, 0.0, erz)
            set_rot("EyeR", erx, 0.0, erz)
            set_rot("FlipperFL", 0.0, flap * 0.4, -flap)
            set_rot("FlipperFR", 0.0, -flap * 0.4, flap)
            set_rot("FlipperRL", 0.0, flap * 0.2, -flap * 0.3)
            set_rot("FlipperRR", 0.0, -flap * 0.2, flap * 0.3)
            set_rot("Tail", -brx, 0.0, hrz * 0.3)
        for fc in action.fcurves:
            for k in fc.keyframe_points:
                k.handle_left_type = k.handle_right_type = "AUTO_CLAMPED"
        action.use_fake_user = True
    arm.animation_data.action = bpy.data.actions["Idle"]
    bpy.context.scene.frame_set(1)


def export_mira_lod(mod, arm, src, meta, target_tris, max_tris, color_path, surface_path, out_path, lod_scale):
    body_obj = mod.decimate_lod(src, target_tris, max_tris)
    body_obj.name = "Mira | smooth coastal teenage turtle"
    mod.assign_skin_weights(body_obj)

    # Scale turtle UVs to left 80% of combined atlas
    u_scale = meta["body_w"] / meta["atlas_w"]
    for d in body_obj.data.uv_layers.active.data:
        d.uv.x *= u_scale

    # Morph mesh vertices smoothly into teenage proportions
    for v in body_obj.data.vertices:
        v.co = morph_mira(v.co)
    body_obj.data.update()

    # Apply shared opaque material
    mod.apply_opaque_material(body_obj, color_path, surface_path)
    mat = body_obj.data.materials[0]
    mat.name = "Mira | Mario-Party coastal sea turtle"

    # Build snug fitted accessories in morphed space and join into the single skinned mesh
    parts = build_accessories(body_obj, arm, mat, meta["patches"], meta["atlas_w"], lod_scale=lod_scale)
    bpy.ops.object.select_all(action="DESELECT")
    body_obj.select_set(True)
    for p in parts:
        p.select_set(True)
    bpy.context.view_layer.objects.active = body_obj
    bpy.ops.object.join()

    # Strictly triangulate joined accessories
    bm = bmesh.new()
    bm.from_mesh(body_obj.data)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bm.to_mesh(body_obj.data)
    bm.free()
    body_obj.data.update()

    body_obj.parent = arm
    body_obj.matrix_parent_inverse.identity()
    amod = body_obj.modifiers.new("Armature", "ARMATURE")
    amod.object = arm

    bpy.ops.object.select_all(action="DESELECT")
    arm.select_set(True)
    body_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm

    bpy.ops.export_scene.gltf(
        filepath=str(out_path),
        export_format="GLB",
        use_selection=True,
        export_image_format="AUTO",
        export_skins=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_def_bones=False,
        export_all_influences=False,
    )
    print(f"Exported {out_path.name}: {out_path.stat().st_size:,} B, tris={len(body_obj.data.polygons)}")

    bpy.data.objects.remove(body_obj, do_unlink=True)
    if mat and mat.users == 0:
        bpy.data.materials.remove(mat)


def main():
    meta = json.loads((HERE / "atlas-patches.json").read_text())
    mod = load_rig2()
    mod.clear_scene()
    arm, hat, mouth = mod.setup_rig_from_canonical()
    # Keep only armature (remove anchors since resident schema expects 1 armature + 1 mesh)
    for anc in (hat, mouth):
        bpy.data.objects.remove(anc, do_unlink=True)

    # Morph rig bones cleanly into teenage proportions matching morph_mira()
    bpy.context.view_layer.objects.active = arm
    bpy.ops.object.mode_set(mode="EDIT")
    for eb in arm.data.edit_bones:
        eb.head = morph_mira(eb.head)
        eb.tail = morph_mira(eb.tail)
    bpy.ops.object.mode_set(mode="OBJECT")

    build_resident_clips(arm)
    src = mod.prepare_welded_source()

    export_mira_lod(
        mod, arm, src, meta,
        target_tris=9000, max_tris=10800,
        color_path=HERE / "color-1024.jpg",
        surface_path=HERE / "surface-256.png",
        out_path=HERE / "mira-board.glb",
        lod_scale=1,
    )
    export_mira_lod(
        mod, arm, src, meta,
        target_tris=19800, max_tris=20800,
        color_path=HERE / "color-2048.jpg",
        surface_path=HERE / "surface-512.png",
        out_path=HERE / "mira-close.glb",
        lod_scale=1,
    )


if __name__ == "__main__":
    main()
