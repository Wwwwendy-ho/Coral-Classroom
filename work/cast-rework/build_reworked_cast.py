"""Stage 4C: Build single-material unified-atlas GLBs (board & close) with sculpted glossy Eye.L/Eye.R domes, smooth Gaussian skinning, and Idle/Listen/React clips."""
import json
import math
import shutil
import sys
from pathlib import Path

import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Quaternion, Vector

HERE = Path(__file__).resolve().parent

BOARD_BODY_TRIS = {
    "echo": 5400,
    "taxi-squid": 6000,
    "bok": 6000,
    "hana": 6000,
    "captain-bay": 6000,
}

# Clean per-character flush eye look blend & socket recess
EYE_TUNING = {
    "echo": {"rad_mul": 0.94, "depth_mul": 0.22, "out_push": -0.10, "out_vec": (0.72, -0.69, 0.04), "blend_raw": 0.55},
    "taxi-squid": {"rad_mul": 0.96, "depth_mul": 0.26, "out_push": -0.05, "out_vec": (0.20, -0.97, 0.04), "blend_raw": 0.30},
    "bok": {"rad_mul": 0.90, "depth_mul": 0.24, "out_push": -0.04, "out_vec": (0.34, -0.93, 0.08), "blend_raw": 0.40},
    "hana": {"rad_mul": 0.96, "depth_mul": 0.22, "out_push": -0.08, "out_vec": (0.24, -0.97, 0.04), "blend_raw": 0.30},
    "captain-bay": {"rad_mul": 0.90, "depth_mul": 0.24, "out_push": -0.06, "out_vec": (0.22, -0.97, 0.05), "blend_raw": 0.35},
}


def recess_eye_sockets(body_obj, slug, meta):
    """Gently indent orbital vertices inward so shallow eye domes sit flush with zero bulge."""
    tune = EYE_TUNING[slug]
    eL = Vector(meta["eye_L"])
    eR = Vector(meta["eye_R"])
    nL = Vector(meta["normal_L"]).normalized()
    nR = Vector(meta["normal_R"]).normalized()
    r = float(meta["eye_radius"]) * tune["rad_mul"]
    lim = r * 1.02
    ov = tune["out_vec"]
    for sign, (e_pos, n_surf) in ((-1, (eL, nL)), (1, (eR, nR))):
        ideal = Vector((sign * ov[0], ov[1], ov[2])).normalized()
        look = (n_surf * tune["blend_raw"] + ideal * (1.0 - tune["blend_raw"])).normalized()
        for v in body_obj.data.vertices:
            d = (v.co - e_pos).length
            if d < lim:
                fall = 0.5 + 0.5 * math.cos(math.pi * d / lim)
                v.co -= look * (0.14 * r * fall)
    body_obj.data.update()


def make_single_material(slug, lod, col_path, orm_path):
    mat = bpy.data.materials.new(f"MP_{slug}_{lod}")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()

    out = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    nt.links.new(bsdf.outputs["BSDF"], out.inputs["Surface"])

    # Clean sRGB Base Color
    img_col = bpy.data.images.load(str(col_path), check_existing=False)
    img_col.pack()
    tex_col = nt.nodes.new("ShaderNodeTexImage")
    tex_col.image = img_col
    tex_col.extension = "EXTEND"
    nt.links.new(tex_col.outputs["Color"], bsdf.inputs["Base Color"])

    # Combined ORM (G=Roughness, B=Metallic)
    img_orm = bpy.data.images.load(str(orm_path), check_existing=False)
    img_orm.colorspace_settings.name = "Non-Color"
    img_orm.pack()
    tex_orm = nt.nodes.new("ShaderNodeTexImage")
    tex_orm.image = img_orm
    tex_orm.extension = "EXTEND"
    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tex_orm.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])

    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.42
    return mat


def make_eye_and_lid_geometry(slug, meta):
    """Build smooth curved Eye.L / Eye.R domes (+ Taxi Squid deadpan upper eyelids) in ONE mesh object."""
    tune = EYE_TUNING[slug]
    eL = Vector(meta["eye_L"])
    eR = Vector(meta["eye_R"])
    nL = Vector(meta["normal_L"]).normalized()
    nR = Vector(meta["normal_R"]).normalized()
    r = float(meta["eye_radius"]) * tune["rad_mul"]
    d_depth = r * tune["depth_mul"]

    bm = bmesh.new()
    uv_lay = bm.loops.layers.uv.new("UVMap")
    tag_layer = bm.verts.layers.int.new("eye_part")  # 1 = Eye.L, 2 = Eye.R, 3 = Lid (Head)

    for side_idx, (center, n_raw) in enumerate(((-1, (eL, nL)), (1, (eR, nR)))):
        sign, (e_pos, n_surf) = side_idx * 2 - 1, n_raw
        ov = tune["out_vec"]
        ideal = Vector((sign * ov[0], ov[1], ov[2])).normalized()
        look = (n_surf * tune["blend_raw"] + ideal * (1.0 - tune["blend_raw"])).normalized()
        # Local basis where +Z_local = look outward toward viewer, +X_local = viewer's right, +Y_local = viewer's up
        right = (-look).cross(Vector((0.0, 0.0, 1.0))).normalized()
        up = right.cross(-look).normalized()

        # Build flattened UV sphere oriented cleanly along look axis
        sub_bm = bmesh.new()
        bmesh.ops.create_uvsphere(sub_bm, u_segments=18, v_segments=10, radius=1.0)
        # In create_uvsphere, poles are +/-Z. Scale X/Y by r, Z by d_depth, rotate Z_local -> look
        rot_m = Matrix((right, up, look)).transposed().to_4x4()
        dom_center = e_pos + look * (tune["out_push"] * r)

        vert_map = {}
        for v in sub_bm.verts:
            lx, ly, lz = v.co.x, v.co.y, v.co.z
            world_p = dom_center + rot_m @ Vector((lx * r, ly * r, lz * d_depth))
            nv = bm.verts.new(world_p)
            nv[tag_layer] = 1 if sign < 0 else 2
            vert_map[v.index] = (nv, lx, ly, lz)

        for f in sub_bm.faces:
            try:
                nf = bm.faces.new([vert_map[v.index][0] for v in f.verts])
                nf.smooth = True
                for lp, v in zip(nf.loops, f.verts):
                    _, lx, ly, _ = vert_map[v.index]
                    # Map eye tile strictly to [0.795, 0.985] x [0.535, 0.725] (center 0.89, 0.63)
                    u_uv = 0.89 + max(-0.96, min(0.96, lx)) * 0.095
                    v_uv = 0.63 + max(-0.96, min(0.96, ly)) * 0.095
                    lp[uv_lay].uv = (u_uv, v_uv)
            except ValueError:
                pass
        sub_bm.free()

        if meta.get("has_lid"):
            # Sculpt upper eyelid hood: kind relaxed arch for Captain Bay, heavy deadpan lid for Taxi Squid
            lid_bm = bmesh.new()
            u_seg = 16
            v_seg = 6
            ring_verts = []
            is_kind = meta.get("lid_style") == "kind"
            tilt_rad = math.radians(sign * 3.0) if is_kind else math.radians(-sign * 4.5)
            for iv in range(v_seg + 1):
                phi = (iv / v_seg) * (math.pi * 0.5)  # 0=bottom lid rim, pi/2=top back edge
                row = []
                for iu in range(u_seg + 1):
                    th = (iu / u_seg) * math.pi  # 0..pi across front upper arc (+x to -x, +z outward)
                    px0 = math.cos(th) * math.cos(phi)
                    pz0 = math.sin(th) * math.cos(phi)  # >=0 outward
                    if is_kind:
                        py0 = math.sin(phi) * 0.68 + 0.36
                        if iv == 0:
                            py0 = 0.34
                    else:
                        py0 = math.sin(phi) * 0.98 + (0.10 if iv == 0 else 0.06)
                    # Gentle brow slant
                    px_t = px0 * math.cos(tilt_rad) - py0 * math.sin(tilt_rad)
                    py_t = px0 * math.sin(tilt_rad) + py0 * math.cos(tilt_rad)
                    wp = dom_center + rot_m @ Vector((px_t * r * 1.06, py_t * r * 1.06, pz0 * d_depth * 1.15))
                    nv = bm.verts.new(wp)
                    nv[tag_layer] = 3
                    row.append((nv, iv / v_seg))
                ring_verts.append(row)
            # Connect outer shell triangles
            for iv in range(v_seg):
                for iu in range(u_seg):
                    a, va = ring_verts[iv][iu]
                    b, vb = ring_verts[iv][iu + 1]
                    c, vc = ring_verts[iv + 1][iu + 1]
                    d, vd = ring_verts[iv + 1][iu]
                    try:
                        nf = bm.faces.new((a, b, c, d))
                        nf.smooth = True
                        for lp, vv in zip(nf.loops, (va, vb, vc, vd)):
                            # Eyelid UV tile sits at [0.80, 0.98] x [0.23, 0.41] (v=0.23 is dark lash bottom rim)
                            lp[uv_lay].uv = (0.89, 0.235 + vv * 0.17)
                    except ValueError:
                        pass
            # Also fold bottom lid lip back to give sculptural thickness
            rim_back = []
            for iu in range(u_seg + 1):
                th = (iu / u_seg) * math.pi
                px0 = math.cos(th) * 0.96
                pz0 = math.sin(th) * 0.85
                py0 = 0.34 if is_kind else 0.04
                px_t = px0 * math.cos(tilt_rad) - py0 * math.sin(tilt_rad)
                py_t = px0 * math.sin(tilt_rad) + py0 * math.cos(tilt_rad)
                wp = dom_center + rot_m @ Vector((px_t * r * 1.00, py_t * r * 1.00, pz0 * d_depth * 0.92))
                nv = bm.verts.new(wp)
                nv[tag_layer] = 3
                rim_back.append(nv)
            for iu in range(u_seg):
                a, _ = ring_verts[0][iu]
                b, _ = ring_verts[0][iu + 1]
                try:
                    nf = bm.faces.new((a, rim_back[iu], rim_back[iu + 1], b))
                    nf.smooth = True
                    for lp in nf.loops:
                        lp[uv_lay].uv = (0.89, 0.232)
                except ValueError:
                    pass
            lid_bm.free()

    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    eye_me = bpy.data.meshes.new(f"{slug}_eyes")
    bm.to_mesh(eye_me)
    # Persist vertex part tags onto vertex groups before freeing
    vtags = [v[tag_layer] for v in bm.verts]
    bm.free()

    eye_obj = bpy.data.objects.new(f"{slug}_eyes", eye_me)
    bpy.context.scene.collection.objects.link(eye_obj)
    vg_l = eye_obj.vertex_groups.new(name="Eye.L")
    vg_r = eye_obj.vertex_groups.new(name="Eye.R")
    vg_h = eye_obj.vertex_groups.new(name="Head")
    for vi, t in enumerate(vtags):
        if t == 1:
            vg_l.add([vi], 1.0, "REPLACE")
        elif t == 2:
            vg_r.add([vi], 1.0, "REPLACE")
        else:
            vg_h.add([vi], 1.0, "REPLACE")
    return eye_obj


def build_rig_and_weights(slug, body_obj, eye_obj, meta):
    """Create species-tailored armature within bone caps and assign normalized Gaussian skin weights."""
    eL = Vector(meta["eye_L"])
    eR = Vector(meta["eye_R"])
    b_co = np.array([v.co[:] for v in body_obj.data.vertices], dtype=np.float32)
    z0, z1 = float(b_co[:, 2].min()), float(b_co[:, 2].max())
    H = max(1e-3, z1 - z0)

    arm_data = bpy.data.armatures.new(f"{slug}Rig")
    arm_obj = bpy.data.objects.new(f"{slug}Rig", arm_data)
    bpy.context.scene.collection.objects.link(arm_obj)
    bpy.ops.object.select_all(action="DESELECT")
    arm_obj.select_set(True)
    bpy.context.view_layer.objects.active = arm_obj
    bpy.ops.object.mode_set(mode="EDIT")

    def add_bone(name, head, tail, parent=None):
        eb = arm_data.edit_bones.new(name)
        eb.head = Vector(head)
        eb.tail = Vector(tail)
        eb.roll = 0.0
        if parent:
            eb.parent = arm_data.edit_bones[parent]
        return eb

    add_bone("Float", (0.0, 0.0, 0.0), (0.0, 0.0, 0.25))

    if slug == "echo":
        add_bone("Body", (0.0, 0.05, 0.65), (0.0, -0.15, 0.85), "Float")
        add_bone("Head", (0.0, -0.25, 0.90), (0.0, -0.55, 1.15), "Body")
        add_bone("Eye.L", eL, eL + Vector((-0.14, -0.12, 0.02)), "Head")
        add_bone("Eye.R", eR, eR + Vector((0.14, -0.12, 0.02)), "Head")
        add_bone("PectoralL", (-0.34, -0.16, 0.56), (-0.54, -0.14, 0.36), "Body")
        add_bone("PectoralR", (0.34, -0.16, 0.56), (0.54, -0.14, 0.36), "Body")
        add_bone("Tail", (0.0, 0.42, 0.48), (0.0, 0.72, 0.56), "Body")
        add_bone("Flukes", (0.0, 0.68, 0.56), (0.0, 0.92, 0.64), "Tail")
    elif slug == "taxi-squid":
        add_bone("Body", (0.0, 0.0, 0.65), (0.0, 0.0, 0.95), "Float")
        add_bone("Head", (0.0, 0.0, 0.88), (0.0, 0.0, 1.38), "Body")
        add_bone("Fin", (0.0, 0.05, 1.32), (0.0, 0.05, 1.62), "Head")
        add_bone("Eye.L", eL, eL + Vector((-0.05, -0.18, 0.01)), "Head")
        add_bone("Eye.R", eR, eR + Vector((0.05, -0.18, 0.01)), "Head")
        add_bone("TentacleL", (-0.32, 0.0, 0.58), (-0.56, -0.05, 0.22), "Body")
        add_bone("TentacleR", (0.32, 0.0, 0.58), (0.56, -0.05, 0.22), "Body")
        add_bone("TentacleF", (0.0, -0.28, 0.56), (0.0, -0.50, 0.20), "Body")
        add_bone("TentacleB", (0.0, 0.28, 0.56), (0.0, 0.50, 0.20), "Body")
    elif slug == "bok":
        add_bone("Head", (0.0, 0.0, 0.85), (0.0, 0.0, 1.45), "Float")
        add_bone("Eye.L", eL, eL + Vector((-0.06, -0.18, 0.02)), "Head")
        add_bone("Eye.R", eR, eR + Vector((0.06, -0.18, 0.02)), "Head")
        add_bone("Fin.L", (-0.72, 0.0, 0.88), (-1.00, 0.05, 0.80), "Head")
        add_bone("Fin.R", (0.72, 0.0, 0.88), (1.00, 0.05, 0.80), "Head")
        add_bone("Tail", (0.0, 0.56, 0.75), (0.0, 0.90, 0.75), "Head")
    elif slug == "captain-bay":
        add_bone("Torso", (0.0, 0.0, 0.36), (0.0, 0.0, 0.82), "Float")
        add_bone("Neck", (0.0, -0.03, 0.80), (0.0, -0.05, 1.02), "Torso")
        add_bone("Head", (0.0, -0.04, 1.00), (0.0, -0.06, 1.48), "Neck")
        add_bone("Eye.L", eL, eL + Vector((-0.06, -0.18, 0.02)), "Head")
        add_bone("Eye.R", eR, eR + Vector((0.06, -0.18, 0.02)), "Head")
    elif slug == "hana":
        add_bone("Bell", (0.0, 0.0, 1.02), (0.0, 0.0, 1.65), "Float")
        add_bone("Eye.L", eL, eL + Vector((-0.05, -0.18, 0.01)), "Bell")
        add_bone("Eye.R", eR, eR + Vector((0.05, -0.18, 0.01)), "Bell")
        for tag, tx, ty in (("FringeL", -0.45, 0.0), ("FringeR", 0.45, 0.0), ("FringeF", 0.0, -0.45), ("FringeB", 0.0, 0.45)):
            add_bone(tag, (tx, ty, 0.95), (tx * 1.15, ty * 1.15, 0.22), "Bell")
        add_bone("OralL", (-0.16, 0.0, 0.92), (-0.18, 0.0, 0.25), "Bell")
        add_bone("OralR", (0.16, 0.0, 0.92), (0.18, 0.0, 0.25), "Bell")

    bpy.ops.object.mode_set(mode="OBJECT")
    bpy.context.view_layer.update()

    def apply_weights_to_body(target_obj):
        # Compute normalized vertex weights directly using bone-zone Gaussians (zero unnormalized vertices!)
        for gname in arm_data.bones.keys():
            if gname not in target_obj.vertex_groups:
                target_obj.vertex_groups.new(name=gname)
        verts = target_obj.data.vertices
        for vi, v in enumerate(verts):
            x, y, z = v.co.x, v.co.y, v.co.z
            zn = (z - z0) / H
            w = {}
            if slug == "echo":
                w_head = math.exp(-((max(0.0, y + 0.12) / 0.34) ** 2)) * (0.4 + 0.6 / (1.0 + math.exp(-(zn - 0.48) * 9.0)))
                w_tail = math.exp(-((max(0.0, 0.34 - y) / 0.28) ** 2)) * 1.4
                w_fluke = w_tail * (1.0 / (1.0 + math.exp(-(y - 0.56) * 14.0)))
                w_tail_base = max(0.0, w_tail - w_fluke)
                in_pec = (z < 0.70) and (y > -0.34) and (y < 0.20)
                w_pec_l = math.exp(-(((x + 0.44) / 0.12) ** 2 + ((y + 0.12) / 0.20) ** 2)) if in_pec and x < -0.34 else 0.0
                w_pec_r = math.exp(-(((x - 0.44) / 0.12) ** 2 + ((y + 0.12) / 0.20) ** 2)) if in_pec and x > 0.34 else 0.0
                w_body = 0.65
                w = {"Head": w_head, "Tail": w_tail_base, "Flukes": w_fluke, "PectoralL": w_pec_l * 2.5, "PectoralR": w_pec_r * 2.5, "Body": w_body}
            elif slug == "taxi-squid":
                is_tent = 1.0 / (1.0 + math.exp((zn - 0.36) * 14.0))
                is_head = 1.0 / (1.0 + math.exp(-(zn - 0.52) * 10.0))
                is_fin = 1.0 / (1.0 + math.exp(-(zn - 0.78) * 12.0))
                aL = max(0.0, -x) * is_tent
                aR = max(0.0, x) * is_tent
                aF = max(0.0, -y) * is_tent
                aB = max(0.0, y) * is_tent
                w = {
                    "Body": max(0.30, 1.0 - is_tent - is_head * 0.7),
                    "Head": max(0.0, is_head - is_fin * 0.4),
                    "Fin": is_fin * 0.7,
                    "TentacleL": aL * 2.0,
                    "TentacleR": aR * 2.0,
                    "TentacleF": aF * 2.0,
                    "TentacleB": aB * 2.0,
                }
            elif slug == "bok":
                def _ramp(val, a, b):
                    t = max(0.0, min(1.0, (val - a) / max(1e-5, b - a)))
                    return t * t * (3.0 - 2.0 * t)
                w_fin_l = _ramp(-x, 0.62, 0.78) if (x < -0.64 and 0.32 <= zn <= 0.72) else 0.0
                w_fin_r = _ramp(x, 0.62, 0.78) if (x > 0.64 and 0.32 <= zn <= 0.72) else 0.0
                w_tail = _ramp(y, 0.54, 0.72) if (y > 0.56 and zn < 0.68) else 0.0
                w = {"Head": max(0.10, 1.0 - w_fin_l - w_fin_r - w_tail), "Fin.L": w_fin_l * 2.5, "Fin.R": w_fin_r * 2.5, "Tail": w_tail * 2.5}
            elif slug == "captain-bay":
                # Keep bottom flippers & lower haunches (zn <= 0.30) 100% anchored to Float
                if zn <= 0.30:
                    w = {"Float": 1.0}
                else:
                    t_torso = 1.0 / (1.0 + math.exp(-(zn - 0.37) * 26.0))
                    t_neck = 1.0 / (1.0 + math.exp(-(zn - 0.62) * 22.0))
                    t_head = 1.0 / (1.0 + math.exp(-(zn - 0.71) * 24.0))
                    w_float = max(0.0, 1.0 - t_torso)
                    w_torso = max(0.0, t_torso - t_neck)
                    w_neck = max(0.0, t_neck - t_head)
                    w_head = t_head
                    w = {"Float": w_float, "Torso": w_torso, "Neck": w_neck, "Head": w_head}
            elif slug == "hana":
                is_hang = 1.0 / (1.0 + math.exp((zn - 0.46) * 14.0))
                # Protect hanging gold lantern on +X upper bell cleanly on Bell bone!
                if zn > 0.44 and x > 0.50:
                    is_hang = 0.0
                r_xy = math.hypot(x, y)
                w_bell = max(0.15, 1.0 - is_hang)
                in_oral = is_hang * math.exp(-((r_xy / 0.24) ** 2))
                in_fringe = max(0.0, is_hang - in_oral)
                w = {
                    "Bell": w_bell,
                    "OralL": in_oral * (1.0 if x <= 0 else 0.05),
                    "OralR": in_oral * (1.0 if x > 0 else 0.05),
                    "FringeL": in_fringe * max(0.0, -x),
                    "FringeR": in_fringe * max(0.0, x),
                    "FringeF": in_fringe * max(0.0, -y),
                    "FringeB": in_fringe * max(0.0, y),
                }

            # Keep top 4 normalized positive weights
            items = sorted([(bn, max(0.0, float(val))) for bn, val in w.items() if val > 1e-4], key=lambda kv: -kv[1])[:4]
            if not items:
                items = [(list(arm_data.bones.keys())[1], 1.0)]
            tot = sum(val for _, val in items)
            for bn, val in items:
                target_obj.vertex_groups[bn].add([vi], val / tot, "REPLACE")

    return arm_obj, apply_weights_to_body


def animate_armature(slug, rig):
    """Author looping Idle, Listen, React actions with smooth body motion & Eye.L/Eye.R glance (zero scale/blink)."""
    bpy.context.scene.render.fps = 30
    rig.animation_data_create()
    Z = Vector((0.0, 0.0, 1.0))
    X = Vector((1.0, 0.0, 0.0))

    if slug == "captain-bay":
        # Grounded sitting walrus clips: Float stays strictly at (0,0,0) (zero hovering!)
        bay_clips = {
            # (frame, torso_pitch, neck_yaw, neck_roll, head_pitch, head_yaw, head_roll, gaze_yaw, gaze_pitch)
            "Idle": [
                (1,   0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0),
                (30,  1.1,  1.0,  0.4,  0.4,  1.8,  0.6,  3.8, -1.2),
                (60,  0.2,  0.0,  0.0, -0.5,  0.0,  0.0,  0.0,  0.0),
                (90, -0.5, -1.0, -0.4, -0.8, -1.8, -0.6, -3.5,  1.0),
                (120, 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0),
            ],
            "Listen": [
                (1,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0),
                (20, 1.5,  0.5,  1.0,  1.5,  0.8,  1.2,  2.0, -1.0),
                (48, 1.2, -0.4, -0.8,  0.2, -0.6, -1.0, -1.8, -0.6),
                (72, 1.4,  0.3,  0.7,  1.2,  0.5,  0.8,  1.2, -0.8),
                (96, 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0),
            ],
            "React": [
                (1,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0),
                (12, 1.8,  0.0,  0.6,  5.5,  0.5,  0.8,  2.5, -2.0),
                (26, -0.6, 0.0, -0.4, -1.5, -0.4, -0.6, -1.5,  1.0),
                (42, 1.0,  0.0,  0.4,  3.5,  0.3,  0.5,  1.5, -1.2),
                (60, 0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0,  0.0),
            ],
        }
        for clip_name, keys in bay_clips.items():
            act = bpy.data.actions.new(clip_name)
            rig.animation_data.action = act
            for f, t_pitch, n_yaw, n_roll, h_pitch, h_yaw, h_roll, gaze, pitch in keys:
                for pb in rig.pose.bones:
                    pb.rotation_mode = "QUATERNION"
                    pb.rotation_quaternion = Quaternion()
                    pb.location = (0.0, 0.0, 0.0)
                root = rig.pose.bones["Float"]
                root.location = (0.0, 0.0, 0.0)
                root.keyframe_insert("location", frame=f)

                def rot_b(bname, axis, deg):
                    if bname not in rig.pose.bones:
                        return
                    pb = rig.pose.bones[bname]
                    inv = rig.data.bones[bname].matrix_local.to_quaternion().inverted()
                    local_ax = inv @ Vector(axis)
                    pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion(local_ax.normalized(), math.radians(deg))
                    pb.keyframe_insert("rotation_quaternion", frame=f)

                rot_b("Torso", (1, 0, 0), t_pitch)
                rot_b("Neck", (0, 0, 1), n_yaw)
                rot_b("Neck", (0, 1, 0), n_roll)
                rot_b("Head", (1, 0, 0), h_pitch)
                rot_b("Head", (0, 0, 1), h_yaw)
                rot_b("Head", (0, 1, 0), h_roll)
                for suf in ("Eye.L", "Eye.R"):
                    if suf in rig.pose.bones:
                        pb = rig.pose.bones[suf]
                        inv = rig.data.bones[suf].matrix_local.to_quaternion().inverted()
                        pb.rotation_quaternion = Quaternion(inv @ Z, math.radians(gaze * 0.8)) @ Quaternion(inv @ X, math.radians(pitch * 0.8))
                        pb.keyframe_insert("rotation_quaternion", frame=f)

            for fc in act.fcurves:
                for kp in fc.keyframe_points:
                    kp.handle_left_type = "AUTO_CLAMPED"
                    kp.handle_right_type = "AUTO_CLAMPED"
            act.use_fake_user = True
            rig.animation_data.action = None
            track = rig.animation_data.nla_tracks.new()
            track.name = clip_name
            track.strips.new(clip_name, 1, act)
            track.mute = True

        rig.animation_data.action = bpy.data.actions["Idle"]
        bpy.context.scene.frame_set(1)
        return

    clips = {
        "Idle": [(1, 0.0, 0.0, 0.0, 0.0), (23, 0.014, 1.0, 0.0, -0.8), (39, 0.018, 1.3, 4.0, -1.0), (52, 0.012, 0.6, 4.0, -0.4), (72, -0.010, -0.8, -2.0, 0.4), (99, 0.0, 0.0, 0.0, 0.0)],
        "Listen": [(1, 0.0, 0.0, 0.0, 0.0), (12, 0.008, -1.8, 2.0, -1.8), (34, 0.014, -2.0, 2.0, -1.8), (48, 0.010, 2.0, 1.2, -0.8), (66, 0.0, 0.3, 0.0, 0.0), (85, 0.0, 0.0, 0.0, 0.0)],
        "React": [(1, 0.0, 0.0, 0.0, 0.0), (8, 0.012, -1.6, -4.5, -2.8), (16, 0.045, 4.2, -3.0, 3.0), (26, 0.024, 1.8, 2.5, 1.0), (40, 0.006, -0.6, 0.0, 0.0), (53, 0.0, 0.0, 0.0, 0.0)],
    }

    for clip_name, keys in clips.items():
        act = bpy.data.actions.new(clip_name)
        rig.animation_data.action = act
        max_f = keys[-1][0]
        for f, bob, tilt, gaze, pitch in keys:
            env = 0.0 if f in (keys[0][0], max_f) else 1.0
            ph = (f / max_f) * 2.0 * math.pi
            for pb in rig.pose.bones:
                pb.rotation_mode = "QUATERNION"
                pb.rotation_quaternion = Quaternion()
                pb.location = (0.0, 0.0, 0.0)

            root = rig.pose.bones["Float"]
            root.location = (0.0, 0.0, bob)
            root.keyframe_insert("location", frame=f)

            def rot(bname, axis, deg):
                if bname not in rig.pose.bones:
                    return
                pb = rig.pose.bones[bname]
                inv = rig.data.bones[bname].matrix_local.to_quaternion().inverted()
                local_ax = inv @ Vector(axis)
                pb.rotation_quaternion = pb.rotation_quaternion @ Quaternion(local_ax.normalized(), math.radians(deg))
                pb.keyframe_insert("rotation_quaternion", frame=f)

            # Eye rotation only (ZERO scale, ZERO blink tracks!)
            for suf in ("Eye.L", "Eye.R"):
                if suf in rig.pose.bones:
                    pb = rig.pose.bones[suf]
                    inv = rig.data.bones[suf].matrix_local.to_quaternion().inverted()
                    pb.rotation_quaternion = Quaternion(inv @ Z, math.radians(gaze * 0.9)) @ Quaternion(inv @ X, math.radians(pitch * 0.9))
                    pb.keyframe_insert("rotation_quaternion", frame=f)

            if slug == "echo":
                rot("Body", (1, 0, 0.15), tilt * 1.0)
                rot("Head", (1, 0, 0.25), tilt * 1.2)
                rot("PectoralL", (0, 1, 0.2), env * 5.0 * math.sin(ph * 2.0) + tilt * 1.0)
                rot("PectoralR", (0, 1, -0.2), -env * 5.0 * math.sin(ph * 2.0) - tilt * 1.0)
                rot("Tail", (1, 0, 0), env * 3.5 * math.cos(ph * 2.0) + tilt * 0.8)
                rot("Flukes", (1, 0, 0), env * 4.5 * math.sin(ph * 2.0))
            elif slug == "taxi-squid":
                rot("Body", (1, 0, 0.2), tilt * 0.9)
                rot("Head", (0.2, 0, 1), tilt * 1.1)
                rot("Fin", (1, 0, 0), env * 3.5 * math.sin(ph * 2.0))
                for idx_t, tname in enumerate(("TentacleL", "TentacleR", "TentacleF", "TentacleB")):
                    rot(tname, (0, 1, 0.2) if "L" in tname or "R" in tname else (1, 0, 0), env * 4.5 * math.sin(ph * 2.0 + idx_t * 0.9) + tilt * 0.8)
            elif slug == "bok":
                rot("Head", (1, 0, 0.25), tilt * 1.0)
                rot("Tail", (0, 0, 1), env * 5.0 * math.sin(ph * 2.0) + tilt * 1.2)
                rot("Fin.L", (0, 1, 0), -(env * 8.5 * math.sin(ph * 2.0) + tilt * 1.2))
                rot("Fin.R", (0, 1, 0), +(env * 8.5 * math.sin(ph * 2.0) + tilt * 1.2))
            elif slug == "hana":
                rot("Bell", (0.2, 1, 0.15), tilt * 0.85)
                for idx_h, bname in enumerate(("OralL", "OralR", "FringeL", "FringeR", "FringeF", "FringeB")):
                    rot(bname, (0, 1, 0) if idx_h % 2 == 0 else (1, 0, 0), env * 4.0 * math.sin(ph * 2.0 + idx_h * 0.8) + tilt * 0.6)

        for fc in act.fcurves:
            for kp in fc.keyframe_points:
                kp.handle_left_type = "AUTO_CLAMPED"
                kp.handle_right_type = "AUTO_CLAMPED"
        act.use_fake_user = True
        rig.animation_data.action = None
        track = rig.animation_data.nla_tracks.new()
        track.name = clip_name
        track.strips.new(clip_name, 1, act)
        track.mute = True

    rig.animation_data.action = bpy.data.actions["Idle"]
    bpy.context.scene.frame_set(1)


def export_lod(slug, lod, base_body, eye_template, rig, assign_body_weights, out_dir):
    d = HERE / slug
    col_path = d / f"tex-color-{lod}.jpg"
    orm_path = d / f"tex-orm-{lod}.png"
    mat = make_single_material(slug, lod, col_path, orm_path)

    # Duplicate body cleanly
    body = base_body.copy()
    body.data = base_body.data.copy()
    body.name = f"{slug}_{lod}_body"
    bpy.context.scene.collection.objects.link(body)

    if lod == "board":
        cur_tris = len(body.data.polygons)
        target = BOARD_BODY_TRIS[slug]
        if cur_tris > target:
            bpy.ops.object.select_all(action="DESELECT")
            body.select_set(True)
            bpy.context.view_layer.objects.active = body
            dec = body.modifiers.new("BoardDecimate", "DECIMATE")
            dec.decimate_type = "COLLAPSE"
            dec.ratio = max(0.05, min(1.0, target / float(cur_tris)))
            dec.use_collapse_triangulate = True
            bpy.ops.object.modifier_apply(modifier=dec.name)
            bm = bmesh.new()
            bm.from_mesh(body.data)
            bmesh.ops.triangulate(bm, faces=bm.faces[:])
            bm.to_mesh(body.data)
            bm.free()
            for p in body.data.polygons:
                p.use_smooth = True

    assign_body_weights(body)

    # Duplicate un-decimated glossy eyes+lids and join into single unified SkinnedMesh!
    eyes = eye_template.copy()
    eyes.data = eye_template.data.copy()
    bpy.context.scene.collection.objects.link(eyes)

    body.data.materials.clear()
    body.data.materials.append(mat)
    eyes.data.materials.clear()
    eyes.data.materials.append(mat)

    bpy.ops.object.select_all(action="DESELECT")
    eyes.select_set(True)
    body.select_set(True)
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.join()

    # Double-check all faces use single mat & smooth shading & normalized vertex weights
    for p in body.data.polygons:
        p.material_index = 0
        p.use_smooth = True

    # Ensure strictly 1 armature modifier and parented to rig
    body.parent = rig
    mod = body.modifiers.new("Armature", "ARMATURE")
    mod.object = rig

    bpy.ops.object.select_all(action="DESELECT")
    body.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = body

    dest = out_dir / f"{slug}-{lod}.glb"
    bpy.ops.export_scene.gltf(
        filepath=str(dest),
        export_format="GLB",
        use_selection=True,
        export_animations=True,
        export_animation_mode="ACTIONS",
        export_force_sampling=True,
        export_apply=False,
        export_image_format="AUTO",
        export_extras=False,
        export_yup=True,
        export_rest_position_armature=True,
    )
    tris = len(body.data.polygons)
    print(f"[{slug}:{lod}] exported {dest.name}: {dest.stat().st_size:,} B, {tris:,} tris, bones={len(rig.data.bones)}", flush=True)

    bpy.data.objects.remove(body, do_unlink=True)
    if slug == "taxi-squid" and lod == "close":
        shutil.copy2(dest, out_dir / "taxi-squid-view.glb")


def build_character(slug):
    d = HERE / slug
    meta = json.loads((d / "rig_meta.json").read_text())
    out_dir = d / "out"
    out_dir.mkdir(parents=True, exist_ok=True)

    bpy.ops.wm.open_mainfile(filepath=str(d / "_prep_close.blend"))
    body_obj = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]

    # Center frontal casts strictly on eye-pair midline so X=0 splits nose & eyes symmetrically
    if slug != "echo":
        x_mid = 0.5 * (meta["eye_L"][0] + meta["eye_R"][0])
        if abs(x_mid) > 1e-4:
            body_obj.data.transform(Matrix.Translation(Vector((-x_mid, 0.0, 0.0))))
            body_obj.data.update()
            meta["eye_L"][0] -= x_mid
            meta["eye_R"][0] -= x_mid

    recess_eye_sockets(body_obj, slug, meta)
    eye_template = make_eye_and_lid_geometry(slug, meta)
    rig, assign_body_weights = build_rig_and_weights(slug, body_obj, eye_template, meta)
    animate_armature(slug, rig)

    for lod in ("board", "close"):
        export_lod(slug, lod, body_obj, eye_template, rig, assign_body_weights, out_dir)


def main():
    slugs = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else list(BOARD_BODY_TRIS.keys())
    for s in slugs:
        build_character(s)


if __name__ == "__main__":
    main()
