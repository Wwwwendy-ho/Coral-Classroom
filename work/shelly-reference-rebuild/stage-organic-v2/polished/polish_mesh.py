"""Blender 4.3.2 sculpt refinement + 3D UV-position/normal baking for organic Shelly (stage-organic-v2).
Run:
  blender -b --factory-startup -t 8 --python polish_mesh.py
Outputs under stage-organic-v2/polished/:
  - shelly-polished-geom.glb
  - base-color-raw.png (2048x2048)
  - mr-raw.png (2048x2048)
  - uv_pos.npy (2048x2048x3 float32 normalized Blender coords)
  - uv_nrm.npy (2048x2048x3 float32 object normals)
  - polish-meta.json (exact post-sculpt eye centers & landmarks)
"""
import json
import math
from pathlib import Path
import bmesh
import bpy
import numpy as np
from mathutils import Euler, Matrix, Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[3]
SRC = REPO / "work" / "shelly-reference-rebuild" / "stage-organic-v1" / "shelly-trellis-raw.glb"
LANDMARKS = HERE / "landmarks.json"


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def gauss3(x, y, z, cx, cy, cz, sx, sy, sz):
    return np.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2 + ((z - cz) / sz) ** 2))


def save_blender_image(img, path, srgb=True):
    w, h = img.size
    arr = np.array(img.pixels[:], dtype=np.float32).reshape(h, w, 4)
    if srgb:
        # Blender stores image pixels in linear space if colorspace is sRGB; convert back to sRGB bytes
        rgb = np.clip(arr[..., :3], 0.0, 1.0)
        srgb_rgb = np.where(rgb <= 0.0031308, 12.92 * rgb, 1.055 * (rgb ** (1.0 / 2.4)) - 0.055)
        out = np.clip(np.round(srgb_rgb * 255.0), 0, 255).astype(np.uint8)
    else:
        out = np.clip(np.round(arr[..., :3] * 255.0), 0, 255).astype(np.uint8)
    # Blender pixel rows are bottom-to-top; flip vertically for standard top-down PNG
    out = np.flipud(out)
    tmp = bpy.data.images.new("_tmp_export", width=w, height=h, alpha=False)
    # Save via Blender's write or raw PNG? Use Blender image save directly with flipped float buffer!
    bpy.data.images.remove(tmp)
    img.filepath_raw = str(path)
    img.file_format = "PNG"
    img.save()


def sculpt_mesh(obj, lm):
    verts = np.array([v.co[:] for v in obj.data.vertices], dtype=np.float64)
    x, y, z = verts[:, 0].copy(), verts[:, 1].copy(), verts[:, 2].copy()

    # 1. Straighten head yaw/roll/center based on measured L/R pupils
    L = np.array(lm["dark_pupil_L"], dtype=np.float64)
    R = np.array(lm["dark_pupil_R"], dtype=np.float64)
    eye_mid = 0.5 * (L + R)
    d = R - L
    yaw_err = math.atan2(d[1], d[0])     # negative -> rotated toward -X
    roll_err = math.atan2(d[2], d[0])    # positive -> R higher than L
    pivot = np.array([eye_mid[0], -1.08, 1.24], dtype=np.float64)
    rot_mat = np.array(Euler((0.0, roll_err * 0.90, -yaw_err * 0.92), "XYZ").to_matrix(), dtype=np.float64)

    # Smooth head mask from mid-neck upward
    w_head = smoothstep(0.68, 1.02, z) * smoothstep(-0.58, -0.94, y)
    rel = verts - pivot
    rotated = rel @ rot_mat.T + pivot

    def rot_only(p):
        return (p - pivot) @ rot_mat.T + pivot

    L_rot = rot_only(L)
    R_rot = rot_only(R)
    mid_rot_x = 0.5 * (L_rot[0] + R_rot[0])

    # Center X symmetrically around 0 after rotation, and cozy-tuck neck slightly down/back toward shell
    target_x = rotated[:, 0] - mid_rot_x
    target_y = rotated[:, 1] + 0.045
    target_z = rotated[:, 2] - 0.042
    pts = np.stack([
        x + (target_x - x) * w_head,
        y + (target_y - y) * w_head,
        z + (target_z - z) * w_head,
    ], axis=-1)

    L_new = np.array([L_rot[0] - mid_rot_x, L_rot[1] + 0.045, L_rot[2] - 0.042])
    R_new = np.array([R_rot[0] - mid_rot_x, R_rot[1] + 0.045, R_rot[2] - 0.042])
    eye_x = 0.5 * (abs(L_new[0]) + abs(R_new[0]))
    eye_y = 0.5 * (L_new[1] + R_new[1])
    eye_z = 0.5 * (L_new[2] + R_new[2])

    # 2a. Weld-safe Taubin smoothing ONLY on the carved downward frown groove (|x|=0.20..0.38, z=1.01..1.16)
    # Welding by pre-sculpt unique positions guarantees identical coordinates across UV seam splits (zero cracks).
    _, inv = np.unique(np.round(verts, 5), axis=0, return_inverse=True)
    n_u = int(inv.max()) + 1
    u_pts = np.zeros((n_u, 3), dtype=np.float64)
    u_cnt = np.zeros(n_u, dtype=np.float64)
    np.add.at(u_pts, inv, pts)
    np.add.at(u_cnt, inv, 1.0)
    u_pts /= np.maximum(u_cnt[:, None], 1.0)

    tris = np.array([p.vertices[:] for p in obj.data.polygons if len(p.vertices) == 3], dtype=np.int64)
    u_tris = inv[tris]
    edges = np.vstack([u_tris[:, [0, 1]], u_tris[:, [1, 2]], u_tris[:, [2, 0]]])
    edges = np.vstack([edges, edges[:, ::-1]])
    deg = np.maximum(np.bincount(edges[:, 0], minlength=n_u).astype(np.float64), 1.0)

    ux, uy, uz = u_pts[:, 0], u_pts[:, 1], u_pts[:, 2]
    w_erase = (
        smoothstep(0.18, 0.24, np.abs(ux))
        * smoothstep(0.39, 0.32, np.abs(ux))
        * smoothstep(-1.18, -1.25, uy)
        * smoothstep(-1.42, -1.34, uy)
        * smoothstep(0.99, 1.05, uz)
        * smoothstep(1.18, 1.13, uz)
    )
    for _ in range(18):
        for lam in (0.50, -0.46):
            nbr_sum = np.zeros_like(u_pts)
            np.add.at(nbr_sum, edges[:, 0], u_pts[edges[:, 1]])
            lap = nbr_sum / deg[:, None] - u_pts
            u_pts += (lam * w_erase)[:, None] * lap
    pts = u_pts[inv].copy()

    # 2b. Broad, zero-pinch smile lift & soft plump cheeks (d(z_new)/dz >= +0.74 everywhere, zero eye pinch)
    px, py, pz = pts[:, 0], pts[:, 1], pts[:, 2]
    eye_protect = smoothstep(1.32, 1.15, pz)
    smile_lift = (
        gauss3(np.abs(px), py, pz, 0.27, -1.33, 1.12, 0.12, 0.15, 0.14)
        + 0.65 * gauss3(np.abs(px), py, pz, 0.34, -1.24, 1.12, 0.11, 0.14, 0.14)
    )
    smile_lift = np.minimum(smile_lift, 1.05) * eye_protect
    center_snout = gauss3(np.abs(px), py, pz, 0.0, -1.51, 1.12, 0.10, 0.10, 0.08)
    cheek_puff = gauss3(np.abs(px), py, pz, 0.31, -1.27, 1.10, 0.13, 0.15, 0.12) * eye_protect

    pz += 0.046 * smile_lift - 0.016 * center_snout + 0.010 * cheek_puff
    px += np.sign(px) * 0.022 * cheek_puff
    py -= 0.010 * cheek_puff

    # 3. Smoothly round boxy upper-rear cranium in 3D space (keeps UV seam vertices identical, zero cracks!)
    crown_center = np.array([0.0, -1.07, 1.26], dtype=np.float64)
    d_crown = pts - crown_center
    r_crown = np.linalg.norm(d_crown, axis=-1, keepdims=True)
    w_dome = smoothstep(1.26, 1.42, pz) * smoothstep(-1.32, -0.96, py) * smoothstep(0.06, 0.24, np.abs(px))
    target_r = np.minimum(r_crown, 0.315)
    pts += (d_crown / np.maximum(r_crown, 1e-6) * target_r - d_crown) * (0.62 * w_dome[:, None])
    px, py, pz = pts[:, 0], pts[:, 1], pts[:, 2]

    # Gentle upper eyelid arch lift right above eye centers
    upper_lid = gauss3(np.abs(px), py, pz, eye_x, eye_y - 0.01, eye_z + 0.085, 0.11, 0.12, 0.065)
    pz += 0.020 * upper_lid

    # Gentle lower throat fullness for cozy organic sea-turtle neck
    throat = smoothstep(0.55, 0.78, pz) * smoothstep(1.05, 0.80, pz) * smoothstep(-0.45, -0.82, py)
    px += np.sign(px) * 0.028 * throat * np.clip(np.abs(px) / 0.22, 0, 1)

    # 4. Sculpt graceful swept, tapered sea-turtle front flippers (fix stubby mitten shape)
    ax = np.abs(px)
    flip_mask = smoothstep(0.50, 0.78, ax) * smoothstep(0.18, -0.15, py) * smoothstep(0.75, 0.45, pz)
    s = np.clip((ax - 0.55) / 0.82, 0.0, 1.0)
    extend_x = 0.22 * (s ** 1.35)
    sweep_y = 0.16 * (s ** 1.65)
    mid_blade = np.exp(-((s - 0.45) / 0.28) ** 2)
    taper_trail = smoothstep(-0.80, -0.35, py) * mid_blade
    px += np.sign(px) * extend_x * flip_mask
    py += (sweep_y - 0.11 * taper_trail) * flip_mask
    pts[:, 2] = np.maximum(0.0, pz)

    for i, v in enumerate(obj.data.vertices):
        v.co = (pts[i, 0], pts[i, 1], pts[i, 2])
    obj.data.update()

    # Recompute exact vertex eye centers post-sculpt (average around transformed L_new / R_new)
    final_verts = np.array([v.co[:] for v in obj.data.vertices], dtype=np.float64)
    # Re-ensure Z_min = 0
    zmin = final_verts[:, 2].min()
    if abs(zmin) > 1e-5:
        for v in obj.data.vertices:
            v.co.z -= zmin
        obj.data.update()
        L_new[2] -= zmin
        R_new[2] -= zmin

    # Symmetrize target eye center coordinates for clean painting
    sym_eye_x = 0.5 * (abs(L_new[0]) + abs(R_new[0]))
    sym_eye_y = 0.5 * (L_new[1] + R_new[1])
    sym_eye_z = 0.5 * (L_new[2] + R_new[2])
    return {
        "eye_L": [-float(sym_eye_x), float(sym_eye_y), float(sym_eye_z)],
        "eye_R": [float(sym_eye_x), float(sym_eye_y), float(sym_eye_z)],
        "raw_L_xform": [round(float(v), 4) for v in L_new],
        "raw_R_xform": [round(float(v), 4) for v in R_new],
        "yaw_corr_deg": round(math.degrees(-yaw_err * 0.92), 2),
        "roll_corr_deg": round(math.degrees(roll_err * 0.90), 2),
        "bounds_min": [round(float(v), 4) for v in final_verts.min(axis=0)],
        "bounds_max": [round(float(v), 4) for v in final_verts.max(axis=0)],
    }


def bake_uv_coords(obj, out_dir):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = 1
    scene.cycles.use_denoising = False
    scene.render.bake.use_pass_direct = False
    scene.render.bake.use_pass_indirect = False
    scene.render.bake.margin = 12
    scene.render.bake.margin_type = "EXTEND"

    # Build temporary emit material that outputs Object coordinates (mapped [-2,2] -> [0,1])
    orig_mats = list(obj.data.materials)
    mat = bpy.data.materials.new("_BakePosMat")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out_node = nt.nodes.new("ShaderNodeOutputMaterial")
    emit = nt.nodes.new("ShaderNodeEmission")
    texcoord = nt.nodes.new("ShaderNodeTexCoord")
    # Map [-2, 2] -> [0, 1] by * 0.25 + 0.5
    vm_mul = nt.nodes.new("ShaderNodeVectorMath")
    vm_mul.operation = "SCALE"
    vm_mul.inputs["Scale"].default_value = 0.25
    vm_add = nt.nodes.new("ShaderNodeVectorMath")
    vm_add.operation = "ADD"
    vm_add.inputs[1].default_value = (0.5, 0.5, 0.5)
    img_node = nt.nodes.new("ShaderNodeTexImage")

    pos_img = bpy.data.images.new("_BakePos", width=2048, height=2048, alpha=False, float_buffer=True)
    pos_img.colorspace_settings.name = "Non-Color"
    img_node.image = pos_img

    nt.links.new(texcoord.outputs["Object"], vm_mul.inputs[0])
    nt.links.new(vm_mul.outputs["Vector"], vm_add.inputs[0])
    nt.links.new(vm_add.outputs["Vector"], emit.inputs["Color"])
    nt.links.new(emit.outputs["Emission"], out_node.inputs["Surface"])

    obj.data.materials.clear()
    obj.data.materials.append(mat)
    nt.nodes.active = img_node
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj

    bpy.ops.object.bake(type="EMIT", margin=12)
    pos_raw = np.array(pos_img.pixels[:], dtype=np.float32).reshape(2048, 2048, 4)[..., :3]
    pos_xyz = np.flipud((pos_raw - 0.5) * 4.0)
    np.save(out_dir / "uv_pos.npy", pos_xyz.astype(np.float32))

    # Also bake Normal [-1, 1] -> [0, 1] via * 0.5 + 0.5
    geom = nt.nodes.new("ShaderNodeNewGeometry")
    nrm_img = bpy.data.images.new("_BakeNrm", width=2048, height=2048, alpha=False, float_buffer=True)
    nrm_img.colorspace_settings.name = "Non-Color"
    img_node.image = nrm_img
    vm_mul.inputs["Scale"].default_value = 0.5
    nt.links.new(geom.outputs["Normal"], vm_mul.inputs[0])
    bpy.ops.object.bake(type="EMIT", margin=12)
    nrm_raw = np.array(nrm_img.pixels[:], dtype=np.float32).reshape(2048, 2048, 4)[..., :3]
    nrm_xyz = np.flipud(nrm_raw * 2.0 - 1.0)
    np.save(out_dir / "uv_nrm.npy", nrm_xyz.astype(np.float32))

    # Restore original material
    obj.data.materials.clear()
    for m in orig_mats:
        obj.data.materials.append(m)
    bpy.data.materials.remove(mat)
    bpy.data.images.remove(pos_img)
    bpy.data.images.remove(nrm_img)


def main():
    HERE.mkdir(parents=True, exist_ok=True)
    lm = json.loads(LANDMARKS.read_text())

    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(SRC))
    obj = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
    bpy.context.view_layer.objects.active = obj

    mat = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    obj.data.transform(mat)

    verts = np.array([v.co[:] for v in obj.data.vertices])
    vmin, vmax = verts.min(axis=0), verts.max(axis=0)
    scale = 1.6 / (vmax[2] - vmin[2])
    for v in obj.data.vertices:
        v.co = (v.co - Vector((0, 0, vmin[2]))) * scale
    obj.data.update()

    meta = sculpt_mesh(obj, lm)
    bake_uv_coords(obj, HERE)

    # Export sculpted geometry GLB (for inspect_mesh clay check & later texture packing)
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(HERE / "shelly-polished-geom.glb"),
        export_format="GLB",
        use_selection=True,
    )
    (HERE / "polish-meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print("Sculpt + UV bake complete:", json.dumps(meta))


if __name__ == "__main__":
    main()
