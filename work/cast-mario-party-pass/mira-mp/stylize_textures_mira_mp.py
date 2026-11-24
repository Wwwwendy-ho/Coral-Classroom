"""Generate smooth Mario-Party textures + accessory atlas for coastal teenage female turtle Mira."""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[2]
REBUILD = REPO / "work" / "shelly-reference-rebuild"
POL = REBUILD / "stage-organic-v2" / "polished"
ST1 = REBUILD / "stage-organic-v1"

ATLAS_W = 2048
BODY_W = 1638  # left 80% for organic turtle body/shell/eyes; right 20% for Mira accessories

PATCHES = {
    "coral_canvas": ((226, 102, 82), (242, 134, 112), 0.80, 0.00),
    "strap_teal": ((46, 84, 92), (68, 112, 120), 0.76, 0.00),
    "copper": ((184, 112, 54), (236, 178, 112), 0.36, 0.30),
    "lens": ((38, 138, 168), (172, 236, 248), 0.18, 0.05),
    "scroll_cream": ((214, 194, 152), (246, 232, 196), 0.82, 0.00),
}


def patch_rects():
    rects = {}
    h = 380
    for i, name in enumerate(PATCHES.keys()):
        y0 = 24 + i * 400
        rects[name] = (1652, y0, 376, h)
    return rects


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def gauss3(x, y, z, cx, cy, cz, sx, sy, sz):
    return np.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2 + ((z - cz) / sz) ** 2))


def paint_turtle_layer():
    pos = np.load(POL / "uv_pos.npy")
    nrm = np.load(POL / "uv_nrm.npy")
    raw = np.array(Image.open(ST1 / "raw-tex-0.webp").convert("RGB"), dtype=np.float32)
    mr = np.array(Image.open(ST1 / "raw-tex-1.webp").convert("RGB"), dtype=np.float32)
    meta = json.loads((POL / "polish-meta.json").read_text())

    covered = pos[..., 2] > -0.2
    x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]
    r, g, b = raw[..., 0], raw[..., 1], raw[..., 2]
    luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

    # --- 1. Crisp, Clean Region Masks ---
    shell_box = (
        smoothstep(0.36, 0.50, z)
        * smoothstep(-0.62, -0.44, y)
        * smoothstep(1.62, 1.48, y)
        * smoothstep(0.88, 0.76, np.abs(x))
    )
    shell_hue = smoothstep(-12.0, 10.0, b - g) * smoothstep(90.0, 130.0, b)
    w_shell = np.clip(shell_box * (0.25 + 0.75 * shell_hue), 0.0, 1.0) * covered
    w_shell = gaussian_filter(w_shell, sigma=2.0)

    cream_hue = smoothstep(145.0, 185.0, r) * smoothstep(135.0, 175.0, g) * smoothstep(-5.0, 24.0, g - b)
    belly_zone = smoothstep(0.45, 0.28, z) * smoothstep(0.60, 0.35, np.abs(x)) * smoothstep(-0.70, -0.30, y)
    beak_zone = smoothstep(-1.12, -1.32, y) * smoothstep(1.24, 1.08, z) * smoothstep(0.32, 0.16, np.abs(x))
    snout_bridge = smoothstep(-1.26, -1.40, y) * smoothstep(1.255, 1.14, z) * smoothstep(0.24, 0.09, np.abs(x))
    w_cream = np.clip(
        np.maximum(cream_hue * 0.85, np.maximum(belly_zone, np.maximum(beak_zone * cream_hue, snout_bridge))),
        0.0,
        1.0,
    )
    w_cream = gaussian_filter(w_cream * (1.0 - w_shell) * covered, sigma=2.2)

    w_skin = np.clip((1.0 - w_shell - w_cream) * covered, 0.0, 1.0)
    w_sum = np.maximum(w_shell + w_cream + w_skin, 1e-6)
    w_shell = np.where(covered, w_shell / w_sum, 0.0)
    w_cream = np.where(covered, w_cream / w_sum, 0.0)
    w_skin = np.where(covered, w_skin / w_sum, 0.0)

    luma_s2 = gaussian_filter(luma, sigma=2.5)
    luma_s4 = gaussian_filter(luma, sigma=4.2)
    luma_s14 = gaussian_filter(luma, sigma=15.0)

    # --- 2. Mira Carapace: Smooth Coastal Slate-Teal / Ocean-Sage + Crisp Scutes ---
    groove = smoothstep(0.052, 0.115, luma_s14 - luma_s4)
    bevel = smoothstep(0.032, 0.095, luma_s4 - luma_s14) * (1.0 - groove)

    dome_h = smoothstep(0.42, 1.15, z)
    sh_low = np.array([58.0, 108.0, 128.0], dtype=np.float32)
    sh_top = np.array([82.0, 146.0, 160.0], dtype=np.float32)
    shell_col = sh_low * (1.0 - dome_h[..., None]) + sh_top * dome_h[..., None]

    sea_var = 0.5 + 0.5 * np.sin(x * 3.6 + 0.4) * np.cos(y * 3.0 - 0.2)
    sea_wash = np.clip(smoothstep(0.22, 0.85, nrm[..., 2]) * (0.35 + 0.65 * sea_var) * (1.0 - groove), 0.0, 0.34)
    shell_col = shell_col * (1.0 - sea_wash[..., None]) + np.array([124.0, 188.0, 182.0], dtype=np.float32) * sea_wash[..., None]

    rim_zone = smoothstep(0.62, 0.44, z) * smoothstep(0.45, 0.72, np.hypot(x * 1.15, (y - 0.45) * 0.85))
    shell_col = shell_col * (1.0 - 0.34 * rim_zone[..., None]) + np.array([176.0, 218.0, 210.0], dtype=np.float32) * (0.34 * rim_zone[..., None])

    shell_col = shell_col * (1.0 - 0.28 * bevel[..., None]) + np.array([158.0, 206.0, 202.0], dtype=np.float32) * (0.28 * bevel[..., None])
    shell_col = shell_col * (1.0 - 0.58 * groove[..., None]) + np.array([38.0, 68.0, 86.0], dtype=np.float32) * (0.58 * groove[..., None])

    # --- 3. Plastron / Chin / Lower Beak: Silky Sunlit Cream ---
    sun_cream = smoothstep(-0.35, 0.65, nrm[..., 2]) * 0.5 + smoothstep(0.20, 1.05, z) * 0.5
    cr_low = np.array([208.0, 194.0, 148.0], dtype=np.float32)
    cr_top = np.array([234.0, 218.0, 174.0], dtype=np.float32)
    cream_col = cr_low * (1.0 - sun_cream[..., None]) + cr_top * sun_cream[..., None]
    plastron_hint = smoothstep(0.03, 0.10, luma_s14 - luma_s2) * smoothstep(0.55, 0.25, z)
    cream_col = cream_col * (1.0 - 0.16 * plastron_hint[..., None]) + np.array([172.0, 156.0, 114.0], dtype=np.float32) * (0.16 * plastron_hint[..., None])

    # --- 4. Skin: Coastal Aqua-Seafoam + Stylized Flipper Markings ---
    sun_skin = smoothstep(-0.45, 0.72, nrm[..., 2])
    sk_mid = np.array([88.0, 178.0, 162.0], dtype=np.float32)
    sk_lit = np.array([112.0, 200.0, 180.0], dtype=np.float32)
    skin_col = sk_mid * (1.0 - sun_skin[..., None]) + sk_lit * sun_skin[..., None]

    throat_warm = smoothstep(0.0, -0.55, nrm[..., 2]) * smoothstep(0.95, 0.45, z)
    skin_col = skin_col * (1.0 - 0.34 * throat_warm[..., None]) + np.array([182.0, 214.0, 182.0], dtype=np.float32) * (0.34 * throat_warm[..., None])

    flipper_edge = (
        smoothstep(0.62, 0.90, np.abs(x))
        * smoothstep(0.10, -0.35, y)
        * np.clip(
            smoothstep(0.55, 0.78, luma_s2) * smoothstep(-0.35, -0.70, y)
            + smoothstep(0.28, 0.08, z),
            0.0,
            1.0,
        )
    )
    flipper_w = np.clip(flipper_edge * 0.50, 0.0, 0.54)
    skin_col = skin_col * (1.0 - flipper_w[..., None]) + np.array([226.0, 216.0, 176.0], dtype=np.float32) * flipper_w[..., None]

    spot_zone_front = (
        smoothstep(0.60, 0.78, np.abs(x))
        * smoothstep(0.15, 0.45, nrm[..., 2])
        * smoothstep(0.10, -0.20, y)
        * (1.0 - flipper_w * 0.85)
    )
    spot_zone_rear = (
        smoothstep(0.42, 0.56, np.abs(x))
        * smoothstep(0.60, 0.88, y)
        * smoothstep(0.15, 0.45, nrm[..., 2])
    )
    spot_zone = np.clip(np.maximum(spot_zone_front, spot_zone_rear), 0.0, 1.0)

    ax = np.abs(x)
    spots = np.zeros_like(ax, dtype=np.float32)
    halo = np.zeros_like(ax, dtype=np.float32)
    front_centers = [
        (0.72, -0.78, 0.078, 0.070),
        (0.76, -0.98, 0.072, 0.066),
        (0.92, -0.70, 0.082, 0.072),
        (0.95, -0.90, 0.085, 0.072),
        (0.96, -1.06, 0.070, 0.064),
        (1.14, -0.66, 0.080, 0.068),
        (1.16, -0.84, 0.078, 0.068),
        (1.32, -0.62, 0.072, 0.062),
        (1.30, -0.78, 0.072, 0.062),
    ]
    rear_centers = [
        (0.54, 0.80, 0.068, 0.065),
        (0.68, 0.92, 0.070, 0.065),
        (0.62, 1.10, 0.068, 0.064),
    ]
    for cx, cy, rx, ry in front_centers + rear_centers:
        d = np.hypot((ax - cx) / rx, (y - cy) / ry)
        spots = np.maximum(spots, smoothstep(1.0, 0.55, d))
        halo = np.maximum(halo, smoothstep(1.26, 0.96, d) * smoothstep(0.55, 0.88, d))

    halo = halo * (1.0 - spots) * spot_zone
    spots = spots * spot_zone
    skin_col = skin_col * (1.0 - 0.14 * halo[..., None]) + np.array([182.0, 224.0, 198.0], dtype=np.float32) * (0.14 * halo[..., None])
    skin_col = skin_col * (1.0 - 0.36 * spots[..., None]) + np.array([64.0, 142.0, 146.0], dtype=np.float32) * (0.36 * spots[..., None])

    # Delicate teenage cheek blush
    blush = gauss3(ax, y, z, 0.29, -1.26, 1.18, 0.09, 0.10, 0.07) * (1.0 - w_shell)
    skin_col = skin_col * (1.0 - 0.22 * blush[..., None]) + np.array([242.0, 162.0, 152.0], dtype=np.float32) * (0.22 * blush[..., None])

    beak_seam = (
        smoothstep(0.22, 0.14, ax)
        * smoothstep(-1.32, -1.42, y)
        * smoothstep(1.08, 1.11, z)
        * smoothstep(1.18, 1.14, z)
        * smoothstep(0.58, 0.38, luma_s2)
    )
    seam_col = np.array([154.0, 140.0, 106.0], dtype=np.float32)
    skin_col = skin_col * (1.0 - 0.38 * beak_seam[..., None]) + seam_col * (0.38 * beak_seam[..., None])
    cream_col = cream_col * (1.0 - 0.42 * beak_seam[..., None]) + seam_col * (0.42 * beak_seam[..., None])

    out_rgb = np.zeros_like(raw)
    out_rgb[...] = np.array([104.0, 188.0, 168.0], dtype=np.float32)
    base_blend = skin_col * w_skin[..., None] + cream_col * w_cream[..., None] + shell_col * w_shell[..., None]
    out_rgb[covered] = base_blend[covered]

    nostril_w = (
        smoothstep(0.13, 0.08, ax)
        * smoothstep(-1.36, -1.43, y)
        * smoothstep(1.14, 1.21, z)
        * smoothstep(0.36, 0.18, luma_s2)
    )
    nostril_w = np.clip(gaussian_filter(nostril_w, sigma=1.2) * 0.70, 0.0, 0.70)
    out_rgb = out_rgb * (1.0 - nostril_w[..., None]) + np.array([52.0, 70.0, 68.0], dtype=np.float32) * (nostril_w[..., None])

    rough = 178.0 * w_shell + 198.0 * (w_skin + w_cream) + 198.0 * (1.0 - covered)

    # --- 5. Feminine Expressive Teenage Eyes (Coastal Turquoise / Emerald-Aqua) ---
    head_zone = (z > 1.10) & (y < -0.95) & covered
    non_green = (raw[..., 1] - raw[..., 0]) < 15.0
    for side, key in [(-1.0, "eye_L"), (1.0, "eye_R")]:
        c_guess = np.array(meta[key], dtype=np.float32)
        side_mask = head_zone & ((x < 0) if side < 0 else (x > 0))
        dist_guess = np.linalg.norm(pos - c_guess, axis=-1)
        socket_mask = side_mask & ((mr[..., 2] > 45.0) | ((dist_guess < 0.095) & (luma < 0.32)))

        pts_eye = pos[socket_mask]
        if len(pts_eye) == 0:
            continue
        pupil_core = socket_mask & (luma < 0.22)
        center = pos[pupil_core].mean(axis=0) if pupil_core.sum() > 200 else pts_eye.mean(axis=0)
        center = center + np.array([-side * 0.004, -0.004, 0.004], dtype=np.float32)

        gaze = np.array([side * 0.56, -0.815, 0.145], dtype=np.float32)
        gaze /= np.linalg.norm(gaze)
        right_vec = np.cross(np.array([0.0, 0.0, 1.0], dtype=np.float32), gaze)
        right_vec /= np.linalg.norm(right_vec)
        up_vec = np.cross(gaze, right_vec)

        rel = pos - center
        u_local = np.sum(rel * right_vec, axis=-1) / 0.112
        v_local = np.sum(rel * up_vec, axis=-1) / 0.110
        r_eye = np.hypot(u_local, v_local)

        dist_3d = np.linalg.norm(rel, axis=-1)
        core_eyeball = (dist_3d < 0.112) & ((mr[..., 2] > 30.0) | (mr[..., 1] < 95.0) | (r_eye < 0.85))
        in_orbit = side_mask & (dist_3d < 0.23) & (
            core_eyeball
            | ((mr[..., 2] > 38.0) & non_green)
            | ((mr[..., 1] < 132.0) & non_green & (dist_3d < 0.21))
            | ((r_eye < 0.94) & (dist_3d < 0.14) & non_green)
            | ((luma < 0.34) & (r_eye < 1.15) & (dist_3d < 0.16) & non_green)
        )
        orbit_soft = gaussian_filter(in_orbit.astype(np.float32), sigma=1.4)
        cornea_w = smoothstep(0.10, 0.45, orbit_soft)

        u_out = side * u_local
        u_iris = u_out + 0.04
        v_iris = v_local - 0.02
        r_iris = np.hypot(u_iris / 0.82, v_iris / 0.88)
        iris_w = smoothstep(1.03, 0.95, r_iris)

        sclera_base = np.array([246.0, 244.0, 240.0], dtype=np.float32)
        sclera_lid = np.array([194.0, 206.0, 212.0], dtype=np.float32)
        lid_tint = smoothstep(0.15, 0.88, v_local) * 0.24
        sclera_col = sclera_base * (1.0 - lid_tint[..., None]) + sclera_lid * lid_tint[..., None]

        # Coastal turquoise / emerald-aqua iris
        v_grad = np.clip(0.48 - 0.75 * v_iris, 0.0, 1.0)
        iris_top = np.array([16.0, 86.0, 102.0], dtype=np.float32)
        iris_mid = np.array([34.0, 176.0, 172.0], dtype=np.float32)
        iris_low = np.array([144.0, 242.0, 218.0], dtype=np.float32)
        iris_col = iris_top * (1.0 - v_grad[..., None]) + iris_mid * v_grad[..., None]

        ang = np.arctan2(v_iris, u_iris)
        iris_col = np.clip(iris_col * (1.0 + 0.05 * np.cos(16.0 * ang))[..., None], 0.0, 255.0)

        warm_crescent = smoothstep(-0.02, -0.60, v_iris) * smoothstep(0.45, 0.65, r_iris) * smoothstep(0.92, 0.78, r_iris)
        iris_col = iris_col * (1.0 - 0.76 * warm_crescent[..., None]) + iris_low * (0.76 * warm_crescent[..., None])

        limbus = smoothstep(0.85, 0.92, r_iris) * smoothstep(1.02, 0.95, r_iris)
        iris_col = iris_col * (1.0 - 0.80 * limbus[..., None]) + np.array([22.0, 64.0, 72.0], dtype=np.float32) * (0.80 * limbus[..., None])

        pupil_w = smoothstep(0.52, 0.46, r_iris)
        iris_col = iris_col * (1.0 - pupil_w[..., None]) + np.array([16.0, 24.0, 30.0], dtype=np.float32) * pupil_w[..., None]

        eye_col = sclera_col * (1.0 - iris_w[..., None]) + iris_col * iris_w[..., None]
        lid_shadow = smoothstep(0.22, 0.88, v_local) * 0.25
        eye_col = eye_col * (1.0 - lid_shadow[..., None])

        hl1 = smoothstep(0.24, 0.11, np.hypot(u_iris + 0.19, v_iris - 0.25))
        hl2 = smoothstep(0.11, 0.04, np.hypot(u_iris - 0.23, v_iris + 0.24)) * 0.90
        hl = np.clip(hl1 + hl2, 0.0, 1.0)
        eye_col = eye_col * (1.0 - hl[..., None]) + np.array([255.0, 254.0, 252.0], dtype=np.float32) * hl1[..., None]
        eye_col = np.clip(eye_col + np.array([248.0, 255.0, 254.0], dtype=np.float32) * (hl2 * (1.0 - hl1))[..., None], 0.0, 255.0)

        # Sleek feminine upper lash line + subtle outer lash flick
        rim_band = smoothstep(0.06, 0.26, orbit_soft) * smoothstep(0.68, 0.26, orbit_soft)
        wing = smoothstep(0.35, 0.85, u_out) * smoothstep(0.12, 0.38, v_local) * smoothstep(0.95, 0.72, r_eye)
        upper_lid = np.clip(rim_band * smoothstep(0.05, 0.34, v_local) + 0.45 * wing, 0.0, 1.0)
        lower_lid = rim_band * (1.0 - smoothstep(0.05, 0.34, v_local))
        out_rgb = out_rgb * (1.0 - 0.78 * upper_lid[..., None]) + np.array([24.0, 48.0, 52.0], dtype=np.float32) * (0.78 * upper_lid[..., None])
        out_rgb = out_rgb * (1.0 - 0.26 * lower_lid[..., None]) + np.array([52.0, 90.0, 88.0], dtype=np.float32) * (0.26 * lower_lid[..., None])

        out_rgb = out_rgb * (1.0 - cornea_w[..., None]) + eye_col * cornea_w[..., None]
        rough = rough * (1.0 - cornea_w) + 20.0 * cornea_w
        rough = rough * (1.0 - 0.40 * upper_lid) + 148.0 * (0.40 * upper_lid)

    color_u8 = np.clip(np.round(out_rgb), 0, 255).astype(np.uint8)
    rough_u8 = np.clip(np.round(rough), 0, 255).astype(np.uint8)
    return color_u8, rough_u8


def main():
    color_u8, rough_u8 = paint_turtle_layer()

    # Build combined 2048x2048 atlas: left 80% turtle, right 20% accessory swatches
    col_body = Image.fromarray(color_u8, mode="RGB").resize((BODY_W, ATLAS_W), Image.Resampling.LANCZOS)
    atlas_col = np.zeros((ATLAS_W, ATLAS_W, 3), dtype=np.uint8)
    atlas_col[:, :BODY_W] = np.array(col_body, dtype=np.uint8)
    # Pad bleed edge cleanly into 1638..1648
    atlas_col[:, BODY_W:] = np.array([120, 120, 120], dtype=np.uint8)

    r_full = Image.fromarray(rough_u8, mode="L").resize((BODY_W, ATLAS_W), Image.Resampling.BILINEAR)
    atlas_rough = np.full((ATLAS_W, ATLAS_W), 196, dtype=np.float32)
    atlas_metal = np.zeros((ATLAS_W, ATLAS_W), dtype=np.float32)
    atlas_rough[:, :BODY_W] = np.array(r_full, dtype=np.float32) / 255.0

    rects = patch_rects()
    for name, (c0, c1, r_val, m_val) in PATCHES.items():
        x, y, w, h = rects[name]
        yy, xx = np.mgrid[0:h, 0:w]
        u = xx / max(1, w - 1)
        v = yy / max(1, h - 1)
        grad = 0.5 + 0.5 * np.sin(u * 1.8 + v * 2.2)
        patch_rgb = np.array(c0)[None, None, :] * (1.0 - grad[..., None]) + np.array(c1)[None, None, :] * grad[..., None]
        if name == "lens":
            shine = np.exp(-((((u - 0.32) / 0.18) ** 2) + (((v - 0.72) / 0.14) ** 2))) * 0.55
            patch_rgb = patch_rgb * (1.0 - shine[..., None]) + np.array([235.0, 250.0, 255.0]) * shine[..., None]
        if name == "scroll_cream":
            roll = np.exp(-(((v - 0.85) / 0.08) ** 2)) * 0.25
            patch_rgb = patch_rgb * (1.0 - roll[..., None]) + np.array([175.0, 154.0, 114.0]) * roll[..., None]
        # Fill full right-column strip band vertically with slight pad so clamping stays clean
        y0_pad, y1_pad = max(0, y - 10), min(ATLAS_W, y + h + 10)
        atlas_col[y0_pad:y1_pad, BODY_W:] = np.array(c0, dtype=np.uint8)
        atlas_col[y : y + h, x : x + w] = np.clip(np.round(patch_rgb), 0, 255).astype(np.uint8)
        atlas_rough[y0_pad:y1_pad, BODY_W:] = r_val
        atlas_metal[y0_pad:y1_pad, BODY_W:] = m_val

    col_2048 = Image.fromarray(atlas_col, mode="RGB")
    col_2048.save(HERE / "color-2048.jpg", format="JPEG", quality=90, optimize=True)
    col_2048.resize((1024, 1024), Image.Resampling.LANCZOS).save(HERE / "color-1024.jpg", format="JPEG", quality=88, optimize=True)

    # Pack ORM (R=1, G=roughness, B=metalness) carefully using 512x512 without blurring patch boundaries
    r_512 = np.array(Image.fromarray(np.clip(np.round(atlas_rough * 255.0), 0, 255).astype(np.uint8), mode="L").resize((512, 512), Image.Resampling.NEAREST))
    m_512 = np.array(Image.fromarray(np.clip(np.round(atlas_metal * 255.0), 0, 255).astype(np.uint8), mode="L").resize((512, 512), Image.Resampling.NEAREST))
    surf_512 = Image.fromarray(np.stack([np.full_like(r_512, 255), r_512, m_512], axis=-1), mode="RGB")
    surf_512.save(HERE / "surface-512.png", format="PNG", optimize=True)

    r_256 = np.array(Image.fromarray(r_512, mode="L").resize((256, 256), Image.Resampling.NEAREST))
    m_256 = np.array(Image.fromarray(m_512, mode="L").resize((256, 256), Image.Resampling.NEAREST))
    surf_256 = Image.fromarray(np.stack([np.full_like(r_256, 255), r_256, m_256], axis=-1), mode="RGB")
    surf_256.save(HERE / "surface-256.png", format="PNG", optimize=True)

    (HERE / "atlas-patches.json").write_text(json.dumps({"atlas_w": ATLAS_W, "body_w": BODY_W, "patches": rects}, indent=2) + "\n")
    print("Mira MP atlas generated cleanly in", HERE)


if __name__ == "__main__":
    main()
