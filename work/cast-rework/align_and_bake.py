"""Stage 4B: Auto-align concept camera pose, project crisp front textures with symmetric fill + 3D harmonic back diffusion, paint unified eye/ORM atlas."""
import argparse
import json
import shutil
import time
from pathlib import Path

import cv2
import numpy as np
from PIL import Image
import scipy.sparse as sp
import scipy.sparse.linalg as spla
from scipy.ndimage import distance_transform_edt, gaussian_filter
from scipy.optimize import minimize
from scipy.spatial import cKDTree
import trimesh

HERE = Path(__file__).resolve().parent
SCRATCH = Path("/mnt/c/Users/20750/.gemini/antigravity/brain/d166c57a-61c7-4fac-a88e-e23166d364f3/scratch")

# Clean Mario-Party per-character configs in Blender Z-up (-Y forward, Z_min=0) coordinates
CHAR_CFG = {
    "echo": {
        "az_grid": range(-180, 180, 10),
        "el_grid": (-4, 8, 20),
        "eye_hints": [(0.421, 0.350)],  # single clearly visible left eye in 3/4 view -> mirrored across X=0
        "eye_uv_r": 0.044,
        "iris_scale": 0.78,
        "iris_top": (18, 92, 108),
        "iris_bot": (62, 204, 212),
        "dorsal_col": (240, 244, 248),
        "belly_col": (244, 234, 218),
        "belly_z": 0.45,
        "asym_cobalt_guard": True,
        "has_lid": False,
        "socket_blend_scale": 1.18,
    },
    "taxi-squid": {
        "az_grid": range(-36, 37, 6),
        "el_grid": (-6, 6, 18),
        "eye_hints": [(0.408, 0.438), (0.528, 0.438)],
        "eye_uv_r": 0.045,
        "iris_scale": 0.70,
        "iris_top": (152, 84, 16),
        "iris_bot": (246, 178, 52),
        "dorsal_col": (222, 202, 236),
        "belly_col": (242, 232, 224),
        "belly_z": 0.55,
        "asym_scarf_guard": True,
        "has_lid": True,
        "lid_col": (226, 206, 236),
        "socket_blend_scale": 1.32,
    },
    "bok": {
        "az_grid": range(-44, 45, 6),
        "el_grid": (-6, 8, 20),
        "eye_hints": [(0.248, 0.408), (0.465, 0.418)],
        "eye_uv_r": 0.056,
        "iris_scale": 0.76,
        "iris_top": (132, 72, 18),
        "iris_bot": (236, 158, 46),
        "dorsal_col": (244, 198, 86),
        "belly_col": (250, 238, 204),
        "belly_z": 0.48,
        "cap_top_z": 0.86,
        "cap_band_z": 0.78,
        "cap_col": (242, 236, 218),
        "navy_col": (42, 62, 98),
        "apron_col": (244, 238, 224),
        "asym_cap_guard": True,
        "has_lid": False,
        "socket_blend_scale": 1.38,
    },
    "hana": {
        "az_grid": range(-30, 31, 6),
        "el_grid": (-8, 6, 18),
        "eye_hints": [(0.300, 0.339), (0.518, 0.347)],
        "eye_uv_r": 0.056,
        "iris_scale": 0.78,
        "iris_top": (84, 40, 74),
        "iris_bot": (224, 146, 98),
        "dorsal_col": (245, 192, 180),
        "belly_col": (242, 206, 212),
        "belly_z": 0.52,
        "clean_inner_gap": True,
        "asym_charm_guard": True,
        "has_lid": False,
        "socket_blend_scale": 1.44,
    },
    "captain-bay": {
        "az_grid": range(-44, 45, 6),
        "el_grid": (-6, 8, 20),
        "eye_hints": [(0.363, 0.285), (0.475, 0.286)],
        "eye_uv_r": 0.032,
        "iris_scale": 0.78,
        "iris_top": (68, 36, 18),
        "iris_bot": (168, 102, 46),
        "dorsal_col": (166, 128, 108),
        "belly_col": (242, 222, 196),
        "belly_z": 0.46,
        "cap_top_z": 0.89,
        "cap_band_z": 0.815,
        "cap_col": (242, 238, 220),
        "navy_col": (40, 64, 112),
        "has_lid": False,
        "socket_blend_scale": 1.08,
    },
}


def smoothstep(a, b, x):
    if a > b:
        return 1.0 - smoothstep(b, a, x)
    t = np.clip((x - a) / max(1e-6, b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def load_cutout_clean(slug, cfg):
    rgba = np.array(Image.open(HERE / slug / "concept-cutout.png").convert("RGBA"))
    H, W = rgba.shape[:2]
    if cfg.get("clean_inner_gap"):
        # Remove isolated grey background dot inside Hana's central tentacle gap
        rgb_f = rgba[..., :3].astype(np.float32)
        sat = rgb_f.max(axis=-1) - rgb_f.min(axis=-1)
        lum = rgb_f.mean(axis=-1)
        yy, xx = np.mgrid[0:H, 0:W]
        in_gap = (xx > 0.42 * W) & (xx < 0.53 * W) & (yy > 0.54 * H) & (yy < 0.84 * H)
        rgba[in_gap & (sat < 14) & (lum > 155) & (lum < 228), 3] = 0

    alpha = rgba[..., 3]
    mask = alpha >= 128
    # Extrude clean interior RGB outward 14px so edges never bleed background grey
    solid = alpha >= 210
    _, idx = distance_transform_edt(~solid, return_indices=True)
    extruded = rgba[..., :3][idx[0], idx[1]].astype(np.float32) / 255.0
    return extruded, mask


def build_camera(params, center, radius):
    az_deg, el_deg, roll_deg, fov_deg, scale_s, dx, dy = params
    az, el, roll = np.radians(az_deg), np.radians(el_deg), np.radians(roll_deg)
    fov = np.radians(np.clip(fov_deg, 18.0, 68.0))
    view_dir = np.array(
        [np.sin(az) * np.cos(el), -np.cos(az) * np.cos(el), np.sin(el)],
        dtype=np.float64,
    )
    forward = -view_dir
    world_up = np.array([0.0, 0.0, 1.0], dtype=np.float64)
    right = np.cross(forward, world_up)
    right /= max(1e-8, np.linalg.norm(right))
    up = np.cross(right, forward)
    r2 = right * np.cos(roll) + up * np.sin(roll)
    u2 = -right * np.sin(roll) + up * np.cos(roll)
    dist = radius * 1.15 / np.tan(fov * 0.5)
    cam_pos = center + view_dir * dist
    focal = 0.5 / np.tan(fov * 0.5) * scale_s
    return cam_pos, r2, u2, forward, focal, dx, dy


def project_points(pts, cam):
    cam_pos, right, up, forward, focal, dx, dy = cam
    rel = pts - cam_pos
    xc = rel @ right
    yc = rel @ up
    zc = np.maximum(0.05, rel @ forward)
    u = 0.5 + dx + focal * (xc / zc)
    v = 0.5 + dy - focal * (yc / zc)
    return u, v, zc


def rasterize_silhouette_cv(faces, u, v, size):
    canvas = np.zeros((size, size), dtype=np.uint8)
    pts2d = np.stack([u * (size - 1), v * (size - 1)], axis=-1)
    tri_pts = np.round(pts2d[faces]).astype(np.int32)
    cv2.fillPoly(canvas, list(tri_pts), 1)
    return canvas > 0


def find_best_pose(verts, faces, target_mask, cfg):
    center = 0.5 * (verts.min(axis=0) + verts.max(axis=0))
    radius = float(np.linalg.norm(verts.max(axis=0) - verts.min(axis=0)) * 0.5)

    # Target centroid & radius for rapid scale/translation init
    ty, tx = np.nonzero(target_mask)
    tcx = float(tx.mean()) / target_mask.shape[1] - 0.5
    tcy = float(ty.mean()) / target_mask.shape[0] - 0.5
    t_span = float(max(tx.max() - tx.min(), ty.max() - ty.min())) / target_mask.shape[0]

    sz = 192
    tgt_sm = cv2.resize(target_mask.astype(np.uint8), (sz, sz), interpolation=cv2.INTER_NEAREST) > 0
    sub_idx = np.linspace(0, len(verts) - 1, min(3500, len(verts)), dtype=int)
    v_sub = verts[sub_idx]

    best_score = -1.0
    best_p = None
    for az in cfg["az_grid"]:
        for el in cfg["el_grid"]:
            cam0 = build_camera((az, el, 0.0, 38.0, 1.0, 0.0, 0.0), center, radius)
            u0, v0, _ = project_points(v_sub, cam0)
            m_span = max(1e-3, max(u0.max() - u0.min(), v0.max() - v0.min()))
            s_est = t_span / m_span
            mcx = 0.5 * (u0.min() + u0.max()) - 0.5
            mcy = 0.5 * (v0.min() + v0.max()) - 0.5
            p = (float(az), float(el), 0.0, 38.0, float(s_est), float(tcx - mcx * s_est), float(tcy - mcy * s_est))
            cam = build_camera(p, center, radius)
            u, v, _ = project_points(verts, cam)
            sil = rasterize_silhouette_cv(faces, u, v, sz)
            inter = np.logical_and(sil, tgt_sm).sum()
            union = np.logical_or(sil, tgt_sm).sum()
            iou = inter / max(1, union)
            if iou > best_score:
                best_score = iou
                best_p = p

    sz_ref = 256
    tgt_ref = cv2.resize(target_mask.astype(np.uint8), (sz_ref, sz_ref), interpolation=cv2.INTER_NEAREST) > 0

    def loss(vec):
        az, el, roll, fov, sc, dx, dy = vec
        if abs(roll) > 16 or fov < 18 or fov > 68 or sc < 0.20 or sc > 8.0 or abs(dx) > 0.35 or abs(dy) > 0.35:
            return 1.0
        cam = build_camera(vec, center, radius)
        u, v, _ = project_points(verts, cam)
        sil = rasterize_silhouette_cv(faces, u, v, sz_ref)
        inter = np.logical_and(sil, tgt_ref).sum()
        union = np.logical_or(sil, tgt_ref).sum()
        return 1.0 - float(inter) / max(1, union)

    res = minimize(
        loss,
        np.array(best_p, dtype=np.float64),
        method="Powell",
        options={"maxiter": 180, "xtol": 1e-3, "ftol": 1e-4},
    )
    final_iou = 1.0 - float(res.fun)
    return tuple(float(x) for x in res.x), center, radius, final_iou


def rasterize_camera_zbuf(verts, faces, cam, size):
    u, v, zc = project_points(verts, cam)
    px = u * (size - 1)
    py = v * (size - 1)
    zbuf = np.full((size, size), np.inf, dtype=np.float32)

    tri_px = px[faces]
    tri_py = py[faces]
    tri_z = zc[faces]
    x0s = np.maximum(0, np.floor(tri_px.min(axis=1)).astype(np.int32))
    x1s = np.minimum(size - 1, np.ceil(tri_px.max(axis=1)).astype(np.int32))
    y0s = np.maximum(0, np.floor(tri_py.min(axis=1)).astype(np.int32))
    y1s = np.minimum(size - 1, np.ceil(tri_py.max(axis=1)).astype(np.int32))

    xs_grid = np.arange(size, dtype=np.float32)
    ys_grid = np.arange(size, dtype=np.float32)

    for fi in range(len(faces)):
        x0, x1 = x0s[fi], x1s[fi]
        y0, y1 = y0s[fi], y1s[fi]
        if x1 < x0 or y1 < y0:
            continue
        ax, bx, cx = tri_px[fi]
        ay, by, cy = tri_py[fi]
        area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
        if abs(area) < 1e-6:
            continue
        gx = xs_grid[x0 : x1 + 1][None, :]
        gy = ys_grid[y0 : y1 + 1][:, None]
        w0 = ((bx - gx) * (cy - gy) - (by - gy) * (cx - gx)) / area
        w1 = ((cx - gx) * (ay - gy) - (cy - gy) * (ax - gx)) / area
        w2 = 1.0 - w0 - w1
        inside = (w0 >= -1e-4) & (w1 >= -1e-4) & (w2 >= -1e-4)
        if not inside.any():
            continue
        z_interp = w0 * tri_z[fi, 0] + w1 * tri_z[fi, 1] + w2 * tri_z[fi, 2]
        sub = zbuf[y0 : y1 + 1, x0 : x1 + 1]
        upd = inside & (z_interp < sub)
        sub[upd] = z_interp[upd]
    return zbuf


def rasterize_uv_attributes(verts, vnormals, faces, loop_uvs, tex_size):
    pos_map = np.zeros((tex_size, tex_size, 3), dtype=np.float32)
    nrm_map = np.zeros((tex_size, tex_size, 3), dtype=np.float32)
    tri_id_map = np.full((tex_size, tex_size), -1, dtype=np.int32)

    # Note: image row 0 is UV V=1.0, row tex_size-1 is UV V=0.0
    ux = loop_uvs[..., 0] * (tex_size - 1)
    vy = (1.0 - loop_uvs[..., 1]) * (tex_size - 1)

    x0s = np.maximum(0, np.floor(ux.min(axis=1)).astype(np.int32))
    x1s = np.minimum(tex_size - 1, np.ceil(ux.max(axis=1)).astype(np.int32))
    y0s = np.maximum(0, np.floor(vy.min(axis=1)).astype(np.int32))
    y1s = np.minimum(tex_size - 1, np.ceil(vy.max(axis=1)).astype(np.int32))

    xs_grid = np.arange(tex_size, dtype=np.float32)
    ys_grid = np.arange(tex_size, dtype=np.float32)

    tri_v = verts[faces]
    tri_n = vnormals[faces]

    for fi in range(len(faces)):
        x0, x1 = x0s[fi], x1s[fi]
        y0, y1 = y0s[fi], y1s[fi]
        if x1 < x0 or y1 < y0:
            continue
        ax, bx, cx = ux[fi]
        ay, by, cy = vy[fi]
        area = (bx - ax) * (cy - ay) - (by - ay) * (cx - ax)
        if abs(area) < 1e-6:
            continue
        gx = xs_grid[x0 : x1 + 1][None, :]
        gy = ys_grid[y0 : y1 + 1][:, None]
        w0 = ((bx - gx) * (cy - gy) - (by - gy) * (cx - gx)) / area
        w1 = ((cx - gx) * (ay - gy) - (cy - gy) * (ax - gx)) / area
        w2 = 1.0 - w0 - w1
        inside = (w0 >= -0.02) & (w1 >= -0.02) & (w2 >= -0.02)
        if not inside.any():
            continue
        W = np.stack([w0[inside], w1[inside], w2[inside]], axis=-1)
        P = W @ tri_v[fi]
        N = W @ tri_n[fi]
        sub_mask = tri_id_map[y0 : y1 + 1, x0 : x1 + 1]
        pos_map[y0 : y1 + 1, x0 : x1 + 1][inside] = P
        nrm_map[y0 : y1 + 1, x0 : x1 + 1][inside] = N
        sub_mask[inside] = fi

    valid = tri_id_map >= 0
    norms = np.linalg.norm(nrm_map[valid], axis=-1, keepdims=True)
    nrm_map[valid] = nrm_map[valid] / np.maximum(1e-8, norms)
    return pos_map, nrm_map, valid


def project_and_score(pts, nrms, cam, zbuf, img_rgb, eps=0.012):
    H_i, W_i = img_rgb.shape[:2]
    H_z, W_z = zbuf.shape
    cam_pos = cam[0]
    u, v, zc = project_points(pts, cam)
    in_bounds = (u >= 0.0) & (u <= 1.0) & (v >= 0.0) & (v <= 1.0)
    sx_z = np.clip(np.round(u * (W_z - 1)).astype(np.int32), 0, W_z - 1)
    sy_z = np.clip(np.round(v * (H_z - 1)).astype(np.int32), 0, H_z - 1)
    # 3x3 min depth filter avoids false grazing self-occlusion
    z_min3 = cv2.erode(zbuf, np.ones((3, 3), np.float32))
    visible = in_bounds & (zc <= z_min3[sy_z, sx_z] + eps)

    to_cam = cam_pos - pts
    to_cam /= np.maximum(1e-8, np.linalg.norm(to_cam, axis=-1, keepdims=True))
    cos_n = np.sum(nrms * to_cam, axis=-1)
    conf = np.where(visible & (cos_n > 0.24), smoothstep(0.24, 0.56, cos_n), 0.0).astype(np.float32)

    # Bilinear sample from extruded concept RGB
    fx = np.clip(u * (W_i - 1), 0.0, W_i - 1.001)
    fy = np.clip(v * (H_i - 1), 0.0, H_i - 1.001)
    x0 = np.floor(fx).astype(np.int32)
    y0 = np.floor(fy).astype(np.int32)
    dx = (fx - x0)[..., None]
    dy = (fy - y0)[..., None]
    c00 = img_rgb[y0, x0]
    c10 = img_rgb[y0, x0 + 1]
    c01 = img_rgb[y0 + 1, x0]
    c11 = img_rgb[y0 + 1, x0 + 1]
    rgb = (c00 * (1 - dx) * (1 - dy) + c10 * dx * (1 - dy) + c01 * (1 - dx) * dy + c11 * dx * dy).astype(np.float32)
    return rgb, conf


def solve_harmonic_backfill(verts, faces, v_rgb_front, v_conf_front, v_prior, v_beta, alpha=18.0):
    V = len(verts)
    edges0 = np.concatenate([faces[:, 0], faces[:, 1], faces[:, 2], faces[:, 1], faces[:, 2], faces[:, 0]])
    edges1 = np.concatenate([faces[:, 1], faces[:, 2], faces[:, 0], faces[:, 0], faces[:, 1], faces[:, 2]])
    A = sp.coo_matrix((np.ones(len(edges0), dtype=np.float64), (edges0, edges1)), shape=(V, V)).tocsr()
    A.sum_duplicates()
    A.data[:] = 1.0
    deg = np.asarray(A.sum(axis=1)).ravel()
    L = sp.diags(deg) - A

    w_front = alpha * v_conf_front.astype(np.float64)
    bv = v_beta.astype(np.float64)
    M = L + sp.diags(w_front + bv)
    rhs = (w_front[:, None] * v_rgb_front + bv[:, None] * v_prior)
    sol = spla.spsolve(M, rhs)
    return np.clip(sol, 0.0, 1.0).astype(np.float32)


def build_vertex_prior(slug, verts, cfg, v_rgb_obs, v_conf_obs):
    z = verts[:, 2]
    zn = (z - z.min()) / max(1e-4, z.max() - z.min())
    y = verts[:, 1]
    yn = (y - y.min()) / max(1e-4, y.max() - y.min())
    top = np.array(cfg["dorsal_col"], dtype=np.float32) / 255.0
    bot = np.array(cfg["belly_col"], dtype=np.float32) / 255.0

    # Front/lower belly tint vs dorsal back tone
    w_top = smoothstep(cfg["belly_z"] - 0.14, cfg["belly_z"] + 0.14, zn)[:, None]
    w_back = smoothstep(0.30, 0.65, yn)[:, None]
    mix = np.clip(np.maximum(w_top, w_back * 0.85), 0.0, 1.0)
    prior = bot * (1.0 - mix) + top * mix
    beta_v = np.full(len(verts), 0.14, dtype=np.float32)

    if slug == "echo":
        # Follow sculpted diagonal crossbody strap ridge across unseen back: z_strap = 0.585 - 0.075 * y
        z_line = 0.585 - 0.075 * verts[:, 1]
        d_strap = np.abs(verts[:, 2] - z_line)
        on_strap = (d_strap < 0.038) & ((verts[:, 1] > -0.35) | (verts[:, 0] < 0.05)) & (v_conf_obs < 0.48)
        strap_col = np.array([47, 91, 168], dtype=np.float32) / 255.0
        w_st = (1.0 - smoothstep(0.015, 0.038, d_strap)) * on_strap.astype(np.float32)
        prior = prior * (1.0 - w_st[:, None]) + strap_col * w_st[:, None]
        beta_v = np.maximum(beta_v, w_st * 9.0)
    elif slug == "bok":
        cap_col = np.array(cfg["cap_col"], dtype=np.float32) / 255.0
        navy_col = np.array(cfg["navy_col"], dtype=np.float32) / 255.0
        apron_col = np.array(cfg["apron_col"], dtype=np.float32) / 255.0
        wc = smoothstep(cfg["cap_top_z"], cfg["cap_top_z"] + 0.04, zn)
        wb = smoothstep(cfg["cap_band_z"] - 0.02, cfg["cap_band_z"] + 0.02, zn) * (1.0 - wc)
        unseen = (y > 0.05) | (v_conf_obs < 0.45)
        prior[unseen] = prior[unseen] * (1.0 - wc[unseen, None]) + cap_col * wc[unseen, None]
        prior[unseen] = prior[unseen] * (1.0 - wb[unseen, None]) + navy_col * wb[unseen, None]
        # Horizontal apron strap wrapping behind torso just above/across mid-belt
        w_apron = unseen & (zn >= 0.47) & (zn <= 0.555)
        prior[w_apron] = apron_col
        beta_v[unseen & ((wc > 0.3) | (wb > 0.3))] = 2.0
        beta_v[w_apron] = 2.0
    elif slug == "captain-bay":
        cap_col = np.array(cfg["cap_col"], dtype=np.float32) / 255.0
        navy_col = np.array(cfg["navy_col"], dtype=np.float32) / 255.0
        white_col = np.array([244, 246, 250], dtype=np.float32) / 255.0
        unseen = (y > -0.04) | (v_conf_obs < 0.45)
        wc = unseen & (zn > cfg["cap_top_z"])
        wb = unseen & (zn >= cfg["cap_band_z"]) & (zn <= cfg["cap_top_z"])
        w_collar = unseen & (zn >= 0.495) & (zn <= 0.68)
        w_stripe = unseen & (zn >= 0.468) & (zn < 0.495)
        prior[wc] = cap_col
        prior[wb | w_collar] = navy_col
        prior[w_stripe] = white_col
        beta_v[wc | wb | w_collar | w_stripe] = 2.4

    return prior, beta_v


def _ray_mesh_first_hit(verts, faces, ray_orig, ray_dir):
    """Vectorized Moller-Trumbore ray-triangle intersection (nearest positive t hit)."""
    v0 = verts[faces[:, 0]]
    v1 = verts[faces[:, 1]]
    v2 = verts[faces[:, 2]]
    e1 = v1 - v0
    e2 = v2 - v0
    h = np.cross(ray_dir[None, :], e2)
    a = np.einsum("ij,ij->i", e1, h)
    valid = np.abs(a) > 1e-7
    f = np.zeros_like(a)
    f[valid] = 1.0 / a[valid]
    s = ray_orig[None, :] - v0
    u = f * np.einsum("ij,ij->i", s, h)
    q = np.cross(s, e1)
    v = f * np.einsum("ij,j->i", q, ray_dir)
    t = f * np.einsum("ij,ij->i", e2, q)
    hit = valid & (u >= -1e-4) & (v >= -1e-4) & (u + v <= 1.0 + 1e-4) & (t > 0.05)
    if not hit.any():
        return None, None
    idx = np.flatnonzero(hit)[int(np.argmin(t[hit]))]
    p = ray_orig + float(t[idx]) * ray_dir
    n = np.cross(e1[idx], e2[idx])
    n /= max(1e-8, float(np.linalg.norm(n)))
    if float(np.dot(n, -ray_dir)) < 0:
        n = -n
    return p.astype(np.float32), n.astype(np.float32)


def detect_3d_eyes(slug, cfg, verts, faces, cam):
    cam_pos, right, up, forward, focal, dx, dy = cam
    hits = []
    for ux, uy in cfg["eye_hints"]:
        xc = (ux - 0.5 - dx) / focal
        yc = -(uy - 0.5 - dy) / focal
        ray_dir = (forward + xc * right + yc * up)
        ray_dir /= np.linalg.norm(ray_dir)
        p, n = _ray_mesh_first_hit(verts, faces, cam_pos, ray_dir)
        if p is None:
            raise RuntimeError(f"[{slug}] Eye hint ray ({ux}, {uy}) missed mesh!")
        dist = float(np.linalg.norm(p - cam_pos))
        eye_r_3d = float(cfg["eye_uv_r"] * dist / focal)
        hits.append((p, n, eye_r_3d))

    # Report raw hit alignment & symmetric eye locations (using mirrored symmetry only when 1 eye visible)
    if len(hits) == 1:
        p, n, r = hits[0]
        # Mirror across Echo's X=0 midplane cleanly
        eye_dir = np.array([-p[0], p[1], p[2]], dtype=np.float32)
        if p[0] < 0:
            eye_L, eye_R = p.astype(np.float32), eye_dir
            nrm_L, nrm_R = n.astype(np.float32), np.array([-n[0], n[1], n[2]], dtype=np.float32)
        else:
            eye_R, eye_L = p.astype(np.float32), eye_dir
            nrm_R, nrm_L = n.astype(np.float32), np.array([-n[0], n[1], n[2]], dtype=np.float32)
        eye_r = r
        raw_yaw_deg = 0.0
    else:
        p0, n0, r0 = hits[0]
        p1, n1, r1 = hits[1]
        if p0[0] > p1[0]:
            p0, p1 = p1, p0
            n0, n1 = n1, n0
        eye_L = p0.astype(np.float32)
        eye_R = p1.astype(np.float32)
        nrm_L = n0.astype(np.float32)
        nrm_R = n1.astype(np.float32)
        eye_r = 0.5 * (r0 + r1)
        d_lr = eye_R - eye_L
        raw_yaw_deg = float(np.degrees(np.arctan2(d_lr[1], d_lr[0])))
        print(f"  [{slug}] raw eyes L={eye_L.round(3).tolist()} R={eye_R.round(3).tolist()} eye_axis_yaw={raw_yaw_deg:+.2f} deg", flush=True)

    nrm_L /= max(1e-8, np.linalg.norm(nrm_L))
    nrm_R /= max(1e-8, np.linalg.norm(nrm_R))
    # Snap both symmetric eye centers onto exact nearest mesh surface vertices cleanly
    vtree = cKDTree(verts)
    _, iL = vtree.query(eye_L)
    _, iR = vtree.query(eye_R)
    eye_L = verts[int(iL)].astype(np.float32)
    eye_R = verts[int(iR)].astype(np.float32)
    return eye_L, eye_R, nrm_L.astype(np.float32), nrm_R.astype(np.float32), float(eye_r)


def paint_eye_and_lid_tiles(atlas_rgb, orm_img, cfg, tex_size=1024):
    # Eye tile sits at U in [0.79, 0.99], V in [0.53, 0.73] (top-right square in UV coords -> y_top=(1-0.73)*N)
    # Note: prepare_oriented_meshes uses U in [0.02, 0.77], so keep U in [0.79, 0.99] cleanly separated!
    x0 = int(round(0.79 * tex_size))
    x1 = int(round(0.99 * tex_size))
    y0 = int(round((1.0 - 0.73) * tex_size))
    y1 = int(round((1.0 - 0.53) * tex_size))
    S = min(x1 - x0, y1 - y0)

    yy, xx = np.mgrid[0:S, 0:S].astype(np.float32)
    u = (xx / (S - 1)) * 2.0 - 1.0  # -1..+1 horizontal
    v = 1.0 - (yy / (S - 1)) * 2.0  # +1 top, -1 bottom
    r = np.hypot(u, v)

    # Warm pearl-white sclera with delicate top & outer orbital shading (prevents harsh white ring)
    sclera = np.ones((S, S, 3), dtype=np.float32) * np.array([255, 250, 244], dtype=np.float32)
    top_ao = smoothstep(0.22, 0.88, v)
    sclera = sclera * (1.0 - 0.24 * top_ao[..., None]) + np.array([184, 186, 198], dtype=np.float32) * (0.24 * top_ao[..., None])
    edge_ao = smoothstep(0.70, 1.0, r)
    sclera = sclera * (1.0 - 0.18 * edge_ao[..., None]) + np.array([192, 192, 200], dtype=np.float32) * (0.18 * edge_ao[..., None])

    # Crisp slightly oval Nintendo iris centered cleanly at (0, -0.02)
    isc = float(cfg.get("iris_scale", 0.54))
    ri = np.hypot(u / isc, (v + 0.02) / (isc * 1.07))
    iris_mask = 1.0 - smoothstep(0.94, 1.02, ri)
    grad_t = smoothstep(0.65, -0.75, v)
    itop = np.array(cfg["iris_top"], dtype=np.float32)
    ibot = np.array(cfg["iris_bot"], dtype=np.float32)
    iris_col = itop * (1.0 - grad_t[..., None]) + ibot * grad_t[..., None]
    # Soft outer limbal ring
    limbal = np.exp(-((ri - 0.92) / 0.065) ** 2)
    iris_col = iris_col * (1.0 - 0.58 * limbal[..., None]) + np.array([28, 22, 34], dtype=np.float32) * (0.58 * limbal[..., None])

    tile = sclera * (1.0 - iris_mask[..., None]) + iris_col * iris_mask[..., None]

    # Rich jet pupil
    ps = isc * 0.53
    rp = np.hypot(u / ps, (v + 0.02) / (ps * 1.07))
    pupil_mask = 1.0 - smoothstep(0.92, 1.04, rp)
    tile = tile * (1.0 - pupil_mask[..., None]) + np.array([16, 14, 24], dtype=np.float32) * pupil_mask[..., None]

    # Luminous twin catchlights (upper-left crisp oval + lower-right small gem inside iris)
    c1 = np.exp(-(((u + 0.22) / 0.14) ** 2 + ((v - 0.24) / 0.12) ** 2) ** 1.3)
    c2 = np.exp(-(((u - 0.18) / 0.075) ** 2 + ((v + 0.22) / 0.075) ** 2) ** 1.3)
    catch = np.clip(smoothstep(0.28, 0.72, c1) * 0.98 + smoothstep(0.28, 0.72, c2) * 0.86, 0.0, 1.0)
    tile = tile * (1.0 - catch[..., None]) + np.array([255, 255, 254], dtype=np.float32) * catch[..., None]

    atlas_rgb[y0 : y0 + S, x0 : x0 + S] = np.clip(tile / 255.0, 0.0, 1.0)

    # Mark glossy eye roughness in ORM (B=metallic, G=roughness, R=AO)
    oH, oW = orm_img.shape[:2]
    ox0 = int(round(0.785 * oW))
    ox1 = int(round(0.995 * oW))
    oy0 = int(round((1.0 - 0.74) * oH))
    oy1 = int(round((1.0 - 0.52) * oH))
    orm_img[oy0:oy1, ox0:ox1] = (255, 33, 0)  # roughness=0.13 glossy eyes

    if cfg.get("has_lid"):
        ly0 = int(round((1.0 - 0.42) * tex_size))
        ly1 = int(round((1.0 - 0.22) * tex_size))
        lS = min(x1 - x0, ly1 - ly0)
        lyy, _ = np.mgrid[0:lS, 0:lS].astype(np.float32)
        lt = lyy / max(1.0, lS - 1)  # 0=top brow, 1=bottom lash rim
        base_lid = np.array(cfg["lid_col"], dtype=np.float32)
        top_lid = base_lid * 0.86
        lid_rgb = top_lid * (1.0 - lt[..., None]) + base_lid * lt[..., None]
        lash = smoothstep(0.88, 0.96, lt)
        lash_col = np.array([78, 52, 42], dtype=np.float32) if cfg.get("lid_style") == "kind" else np.array([112, 88, 128], dtype=np.float32)
        lid_rgb = lid_rgb * (1.0 - 0.55 * lash[..., None]) + lash_col * (0.55 * lash[..., None])
        atlas_rgb[ly0 : ly0 + lS, x0 : x0 + lS] = np.clip(lid_rgb / 255.0, 0.0, 1.0)

        oly0 = int(round((1.0 - 0.43) * oH))
        oly1 = int(round((1.0 - 0.21) * oH))
        orm_img[oly0:oly1, ox0:ox1] = (255, 168, 5)


def bake_character(slug):
    t0 = time.time()
    d = HERE / slug
    cfg = CHAR_CFG[slug]
    data = np.load(d / "_prep_close.npz")
    verts = data["verts"].astype(np.float32)
    vnormals = data["vnormals"].astype(np.float32)
    faces = data["faces"].astype(np.int32)
    loop_uvs = data["loop_uvs"].astype(np.float32)

    img_rgb, tgt_mask = load_cutout_clean(slug, cfg)
    cam_params, center, radius, iou = find_best_pose(verts, faces, tgt_mask, cfg)
    cam = build_camera(cam_params, center, radius)

    # Detect exact 3D eye sockets via aligned camera raycast
    eye_L, eye_R, nrm_L, nrm_R, eye_r = detect_3d_eyes(slug, cfg, verts, faces, cam)

    # Render high-res Z-buffer + UV attribute maps
    tex_size = 1024
    zbuf = rasterize_camera_zbuf(verts, faces, cam, 1024)
    pos_map, nrm_map, valid_uv = rasterize_uv_attributes(verts, vnormals, faces, loop_uvs, tex_size)

    P_uv = pos_map[valid_uv]
    N_uv = nrm_map[valid_uv]
    rgb_direct, conf_direct = project_and_score(P_uv, N_uv, cam, zbuf, img_rgb, eps=0.015)

    # Bilateral symmetric mirror projection onto hidden X opposite side (guarding midline & asymmetric accessories)
    sym_x = float(0.5 * (eye_L[0] + eye_R[0])) if len(cfg["eye_hints"]) > 1 else 0.0
    P_mir = P_uv.copy(); P_mir[:, 0] = 2.0 * sym_x - P_mir[:, 0]
    N_mir = N_uv.copy(); N_mir[:, 0] *= -1.0
    rgb_mir, conf_mir = project_and_score(P_mir, N_mir, cam, zbuf, img_rgb, eps=0.015)

    # Never mirror directly onto well-lit front texels or near front midline props (badges/knots/beaks)
    conf_mir[conf_direct > 0.25] = 0.0
    if len(cfg["eye_hints"]) > 1:
        conf_mir[np.abs(P_uv[:, 0] - sym_x) < 0.20] = 0.0

    if cfg.get("asym_cobalt_guard"):
        # Echo: don't copy cobalt blue crossbody bag / strap from the visible side onto clean opposite torso/flank
        sat_mir = rgb_mir.max(axis=-1) - rgb_mir.min(axis=-1)
        is_blue_mir = (rgb_mir[:, 2] > rgb_mir[:, 0] + 0.12) & (sat_mir > 0.14)
        is_bag_side = P_mir[:, 2] < 0.68
        conf_mir[is_blue_mir | (is_bag_side & (P_uv[:, 0] * P_mir[:, 0] < 0) & (np.abs(P_uv[:, 0]) > 0.25) & (rgb_mir[:, 2] > rgb_mir[:, 1] + 0.04))] = 0.0
    elif cfg.get("asym_charm_guard"):
        # Hana hanging lantern is at +X lateral bell edge; avoid mirroring onto empty opposite rim
        is_charm = (np.abs(P_uv[:, 0] - sym_x) > 0.54) & (P_uv[:, 2] < 1.15) & (P_uv[:, 2] > 0.72)
        conf_mir[is_charm] = 0.0
    elif cfg.get("asym_cap_guard"):
        # Avoid mirroring asymmetric tilted cap onto back/other side incorrectly
        conf_mir[P_uv[:, 2] > 1.38] = 0.0
    elif cfg.get("asym_scarf_guard"):
        # Avoid ghosting hanging front scarf knot onto the clean opposite shoulder
        conf_mir[(P_uv[:, 2] < 0.76) & (P_uv[:, 1] < -0.10)] = 0.0

    use_mir = np.clip((conf_mir - conf_direct * 1.15) * 2.5, 0.0, 1.0) * conf_mir
    tot_w = np.clip(conf_direct + use_mir * 0.9, 0.0, 1.0)
    rgb_front_mir = (rgb_direct * conf_direct[:, None] + rgb_mir * (use_mir * 0.9)[:, None]) / np.maximum(1e-5, conf_direct + use_mir * 0.9)[:, None]

    # Solve 3D vertex graph harmonic back-fill (seam-free across all UV islands!)
    V = len(verts)
    tree = cKDTree(verts)
    _, nn_v = tree.query(P_uv)
    v_sum = np.zeros((V, 3), dtype=np.float64)
    v_wt = np.zeros(V, dtype=np.float64)
    np.add.at(v_sum, nn_v, rgb_front_mir * tot_w[:, None])
    np.add.at(v_wt, nn_v, tot_w)
    v_rgb_obs = np.divide(v_sum, np.maximum(1e-6, v_wt[:, None]))
    v_conf_obs = np.clip(v_wt / np.maximum(1.0, np.percentile(v_wt[v_wt > 0], 60)) if (v_wt > 0).any() else v_wt, 0.0, 1.0)
    v_prior, v_beta = build_vertex_prior(slug, verts, cfg, v_rgb_obs, v_conf_obs)
    v_harmonic = solve_harmonic_backfill(verts, faces, v_rgb_obs, v_conf_obs, v_prior, v_beta)

    # Interpolate smooth harmonic fill at valid UV texels cleanly via mesh triangles/verts
    # Rasterize vertex harmonic colors cleanly in UV space
    v_col_uv = np.zeros((tex_size, tex_size, 3), dtype=np.float32)
    # Use nearest K=3 vertices for crisp smooth harmonic texel fill
    d3, idx3 = tree.query(P_uv, k=3)
    inv_d3 = 1.0 / np.maximum(1e-5, d3)
    w3 = inv_d3 / inv_d3.sum(axis=-1, keepdims=True)
    harm_uv = np.sum(v_harmonic[idx3] * w3[..., None], axis=1)

    blend = smoothstep(0.18, 0.44, tot_w)[:, None]
    final_uv_rgb = harm_uv * (1.0 - blend) + rgb_front_mir * blend

    # Per-character seamless back texture polish
    if slug == "taxi-squid":
        # Wrap crisp yellow/navy checkered scarf continuously around sculpted cylindrical neck collar [0.665..0.820]
        z_sc0, z_sc1 = 0.665, 0.820
        r_xy = np.hypot(P_uv[:, 0], P_uv[:, 1])
        in_band = (P_uv[:, 2] >= z_sc0) & (P_uv[:, 2] <= z_sc1) & (r_xy > 0.21) & (conf_direct < 0.38)
        theta = np.arctan2(P_uv[in_band, 0], -P_uv[in_band, 1]) + np.pi
        col_i = np.floor((theta / (2.0 * np.pi)) * 22.0).astype(np.int32)
        row_h = (z_sc1 - z_sc0) / 3.0
        row_i = np.clip(np.floor((P_uv[in_band, 2] - z_sc0) / row_h).astype(np.int32), 0, 2)
        is_y_cell = ((col_i + row_i) % 2 == 0)[:, None]
        yel_c = np.array([242, 207, 70], dtype=np.float32) / 255.0
        nav_c = np.array([38, 60, 108], dtype=np.float32) / 255.0
        checker = np.where(is_y_cell, yel_c, nav_c)
        edge_z = smoothstep(z_sc0, z_sc0 + 0.014, P_uv[in_band, 2]) * (1.0 - smoothstep(z_sc1 - 0.014, z_sc1, P_uv[in_band, 2]))
        bw = (1.0 - smoothstep(0.14, 0.38, conf_direct[in_band])) * edge_z
        final_uv_rgb[in_band] = final_uv_rgb[in_band] * (1.0 - bw[:, None]) + checker * bw[:, None]
    elif slug == "hana":
        # Gently unify upper bell dome with warm peach-rose Mario-Party tint
        zn_uv = (P_uv[:, 2] - verts[:, 2].min()) / max(1e-4, verts[:, 2].max() - verts[:, 2].min())
        upper = smoothstep(0.72, 0.96, zn_uv)[:, None] * 0.14
        peach = np.array([246, 188, 176], dtype=np.float32) / 255.0
        final_uv_rgb = final_uv_rgb * (1.0 - upper) + peach * upper

    # Paint out projected dark eyeball pixels inside eye sockets on the body texture so 3D eyes sit cleanly
    s_scale = cfg.get("socket_blend_scale", 1.10)
    for e_ctr in (eye_L, eye_R):
        dist_e = np.linalg.norm(P_uv - e_ctr[None, :], axis=-1)
        ring = (dist_e > eye_r * 1.15 * s_scale) & (dist_e < eye_r * 1.55 * s_scale)
        if ring.any():
            # Take warm orbital skin percentile so highlights/lashes aren't copied into socket
            skin_ref = np.median(final_uv_rgb[ring], axis=0)
            inside_sock = dist_e < eye_r * 1.18 * s_scale
            t_in = 1.0 - smoothstep(eye_r * 0.70 * s_scale, eye_r * 1.18 * s_scale, dist_e[inside_sock])
            final_uv_rgb[inside_sock] = final_uv_rgb[inside_sock] * (1.0 - t_in[:, None]) + skin_ref[None, :] * t_in[:, None]

    # Scatter valid texels into atlas
    atlas = np.zeros((tex_size, tex_size, 3), dtype=np.float32)
    atlas[valid_uv] = final_uv_rgb

    # Mario-Party gentle edge-preserving smoothing across valid UV area
    body_mask_u8 = valid_uv.astype(np.uint8)
    atlas_u8 = np.clip(atlas * 255.0, 0, 255).astype(np.uint8)
    # Dilate islands 12px cleanly BEFORE bilateral filter so edges don't pull black background!
    _, nearest_idx = distance_transform_edt(~valid_uv, return_indices=True)
    dist_outside = distance_transform_edt(~valid_uv)
    atlas_dil = atlas_u8[nearest_idx[0], nearest_idx[1]]
    atlas_dil[dist_outside > 14] = 200
    smooth_bil = cv2.bilateralFilter(atlas_dil, d=7, sigmaColor=24, sigmaSpace=5)
    # Mix 65% smoothed + 35% crisp projected so checkers/emblems stay sharp while skin noise vanishes
    atlas_clean = (smooth_bil.astype(np.float32) * 0.65 + atlas_dil.astype(np.float32) * 0.35) / 255.0
    # Zero out reserved right eye/ORM column before painting crisp eye tiles
    atlas_clean[:, int(0.775 * tex_size) :] = 0.92

    # ORM map: R=AO(255), G=Roughness(0.68 -> 173), B=Metallic(0.03 -> 8)
    orm_close = np.zeros((512, 512, 3), dtype=np.uint8)
    orm_close[..., 0] = 255
    orm_close[..., 1] = 173
    orm_close[..., 2] = 8

    paint_eye_and_lid_tiles(atlas_clean, orm_close, cfg, tex_size=tex_size)

    # Save Close & Board texture assets
    out_close_col = d / "tex-color-close.jpg"
    out_board_col = d / "tex-color-board.jpg"
    out_close_orm = d / "tex-orm-close.png"
    out_board_orm = d / "tex-orm-board.png"

    col_close_pil = Image.fromarray(np.clip(atlas_clean * 255.0, 0, 255).astype(np.uint8), mode="RGB")
    col_close_pil.save(out_close_col, format="JPEG", quality=90, optimize=True)
    col_close_pil.resize((512, 512), Image.Resampling.LANCZOS).save(out_board_col, format="JPEG", quality=86, optimize=True)

    orm_close_pil = Image.fromarray(orm_close, mode="RGB")
    orm_close_pil.save(out_close_orm, format="PNG", optimize=True)
    orm_close_pil.resize((256, 256), Image.Resampling.NEAREST).save(out_board_orm, format="PNG", optimize=True)

    # Save diagnostic alignment + reprojected EyeL/EyeR overlay for verification
    z_dbg = rasterize_camera_zbuf(verts, faces, cam, 512)
    sil_dbg = np.isfinite(z_dbg)
    dbg = (img_rgb * 255.0).astype(np.uint8)
    dbg = cv2.resize(dbg, (512, 512), interpolation=cv2.INTER_AREA)
    contours, _ = cv2.findContours(sil_dbg.astype(np.uint8), cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
    cv2.drawContours(dbg, contours, -1, (0, 230, 120), 2)
    u_e, v_e, _ = project_points(np.stack([eye_L, eye_R]), cam)
    for idx_e, (eu, ev) in enumerate(zip(u_e, v_e)):
        col_c = (255, 60, 200) if idx_e == 0 else (40, 180, 255)
        cv2.circle(dbg, (int(round(eu * 511)), int(round(ev * 511))), 9, col_c, 2)
    Image.fromarray(dbg).save(d / "pose-align-overlay.png", format="PNG")

    meta = {
        "slug": slug,
        "silhouette_iou": round(iou, 4),
        "cam_params": [round(x, 4) for x in cam_params],
        "eye_L": [round(float(x), 5) for x in eye_L],
        "eye_R": [round(float(x), 5) for x in eye_R],
        "normal_L": [round(float(x), 5) for x in nrm_L],
        "normal_R": [round(float(x), 5) for x in nrm_R],
        "eye_radius": round(float(eye_r), 5),
        "has_lid": bool(cfg.get("has_lid")),
        "lid_style": cfg.get("lid_style", "deadpan"),
        "elapsed_s": round(time.time() - t0, 2),
    }
    (d / "rig_meta.json").write_text(json.dumps(meta, indent=2) + "\n")
    print(f"[{slug}] baked atlas: IoU={iou:.3f} eye_r={eye_r:.3f} eyeL={meta['eye_L']} in {meta['elapsed_s']}s", flush=True)


def stitch_pose_overlays(slugs):
    tiles = [Image.open(HERE / s / "pose-align-overlay.png").convert("RGB").resize((280, 280), Image.Resampling.LANCZOS) for s in slugs]
    W = len(tiles) * 280 + (len(tiles) + 1) * 12
    H = 340
    sheet = Image.new("RGB", (W, H), (240, 245, 246))
    for i, im in enumerate(tiles):
        sheet.paste(im, (12 + i * 292, 44))
    out = HERE / "pose-align-sheet.png"
    sheet.save(out, format="PNG")
    SCRATCH.mkdir(parents=True, exist_ok=True)
    shutil.copy2(out, SCRATCH / "pose-align-sheet.png")
    print("Saved", out, flush=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--slugs", nargs="+", default=list(CHAR_CFG.keys()))
    args = p.parse_args()
    for s in args.slugs:
        bake_character(s)
    stitch_pose_overlays(list(CHAR_CFG.keys()))


if __name__ == "__main__":
    main()
