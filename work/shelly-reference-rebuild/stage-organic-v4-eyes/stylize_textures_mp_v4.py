"""Generate bright-eye, clean-snout Mario Party / Animal Crossing textures on organic Shelly (stage-organic-v4-eyes).
Preserves stage-organic-v3-mp's clean body/shell/flipper surfaces while fixing dark eye sockets and nostril fringes.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

ST4 = Path(__file__).resolve().parent
POL = ST4.parent / "stage-organic-v2" / "polished"
ST1 = ST4.parent / "stage-organic-v1"


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def gauss3(x, y, z, cx, cy, cz, sx, sy, sz):
    return np.exp(-(((x - cx) / sx) ** 2 + ((y - cy) / sy) ** 2 + ((z - cz) / sz) ** 2))


def main():
    pos = np.load(POL / "uv_pos.npy")          # (2048, 2048, 3)
    nrm = np.load(POL / "uv_nrm.npy")          # (2048, 2048, 3)
    raw = np.array(Image.open(ST1 / "raw-tex-0.webp").convert("RGB"), dtype=np.float32)
    mr = np.array(Image.open(ST1 / "raw-tex-1.webp").convert("RGB"), dtype=np.float32)
    meta = json.loads((POL / "polish-meta.json").read_text())

    covered = pos[..., 2] > -0.2
    x, y, z = pos[..., 0], pos[..., 1], pos[..., 2]
    r, g, b = raw[..., 0], raw[..., 1], raw[..., 2]
    luma = (0.299 * r + 0.587 * g + 0.114 * b) / 255.0

    # --- 1. Crisp, Clean Region Masks (carapace / cream plastron+beak / skin) ---
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
    # Extend cream smoothly across the upper beak / nostril bridge so no ragged mint islands surround the nostrils
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

    # Smoothed structural luma only (eliminates high-frequency painterly noise & fine dome speckles)
    luma_s2 = gaussian_filter(luma, sigma=2.5)
    luma_s4 = gaussian_filter(luma, sigma=4.2)
    luma_s14 = gaussian_filter(luma, sigma=15.0)

    # --- 2. Carapace: Smooth Lavender/Periwinkle + Broad Warm Peach Glow + Crisp Scutes ---
    groove = smoothstep(0.052, 0.115, luma_s14 - luma_s4)
    bevel = smoothstep(0.032, 0.095, luma_s4 - luma_s14) * (1.0 - groove)

    dome_h = smoothstep(0.42, 1.15, z)
    sh_low = np.array([126.0, 122.0, 216.0], dtype=np.float32)
    sh_top = np.array([160.0, 132.0, 228.0], dtype=np.float32)
    shell_col = sh_low * (1.0 - dome_h[..., None]) + sh_top * dome_h[..., None]

    warm_var = 0.5 + 0.5 * np.sin(x * 3.8 + 0.6) * np.cos(y * 3.2 - 0.3)
    warm_wash = np.clip(smoothstep(0.20, 0.85, nrm[..., 2]) * (0.35 + 0.65 * warm_var) * (1.0 - groove), 0.0, 0.38)
    shell_col = shell_col * (1.0 - warm_wash[..., None]) + np.array([240.0, 180.0, 142.0], dtype=np.float32) * warm_wash[..., None]

    rim_zone = smoothstep(0.62, 0.44, z) * smoothstep(0.45, 0.72, np.hypot(x * 1.15, (y - 0.45) * 0.85))
    shell_col = shell_col * (1.0 - 0.26 * rim_zone[..., None]) + np.array([224.0, 206.0, 240.0], dtype=np.float32) * (0.26 * rim_zone[..., None])

    shell_col = shell_col * (1.0 - 0.24 * bevel[..., None]) + np.array([238.0, 222.0, 248.0], dtype=np.float32) * (0.24 * bevel[..., None])
    shell_col = shell_col * (1.0 - 0.60 * groove[..., None]) + np.array([92.0, 68.0, 158.0], dtype=np.float32) * (0.60 * groove[..., None])

    # --- 3. Cream Plastron / Chin / Lower Beak: Silky Sunlit Buttercream ---
    sun_cream = smoothstep(-0.35, 0.65, nrm[..., 2]) * 0.5 + smoothstep(0.20, 1.05, z) * 0.5
    cr_low = np.array([204.0, 186.0, 134.0], dtype=np.float32)
    cr_top = np.array([234.0, 218.0, 166.0], dtype=np.float32)
    cream_col = cr_low * (1.0 - sun_cream[..., None]) + cr_top * sun_cream[..., None]
    plastron_hint = smoothstep(0.03, 0.10, luma_s14 - luma_s2) * smoothstep(0.55, 0.25, z)
    cream_col = cream_col * (1.0 - 0.18 * plastron_hint[..., None]) + np.array([166.0, 146.0, 98.0], dtype=np.float32) * (0.18 * plastron_hint[..., None])

    # --- 4. Skin: Silky Seafoam-Mint Face + Clean Stylized Flipper Spots ---
    sun_skin = smoothstep(-0.45, 0.72, nrm[..., 2])
    sk_mid = np.array([86.0, 182.0, 150.0], dtype=np.float32)
    sk_lit = np.array([104.0, 200.0, 162.0], dtype=np.float32)
    skin_col = sk_mid * (1.0 - sun_skin[..., None]) + sk_lit * sun_skin[..., None]

    throat_warm = smoothstep(0.0, -0.55, nrm[..., 2]) * smoothstep(0.95, 0.45, z)
    skin_col = skin_col * (1.0 - 0.35 * throat_warm[..., None]) + np.array([178.0, 208.0, 164.0], dtype=np.float32) * (0.35 * throat_warm[..., None])

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
    flipper_w = np.clip(flipper_edge * 0.54, 0.0, 0.58)
    skin_col = skin_col * (1.0 - flipper_w[..., None]) + np.array([228.0, 214.0, 156.0], dtype=np.float32) * flipper_w[..., None]

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
    skin_col = skin_col * (1.0 - 0.14 * halo[..., None]) + np.array([188.0, 222.0, 174.0], dtype=np.float32) * (0.14 * halo[..., None])
    skin_col = skin_col * (1.0 - 0.34 * spots[..., None]) + np.array([62.0, 158.0, 140.0], dtype=np.float32) * (0.34 * spots[..., None])

    # Soft Mario-Party cheek blush
    blush = gauss3(ax, y, z, 0.29, -1.26, 1.18, 0.09, 0.10, 0.07) * (1.0 - w_shell)
    skin_col = skin_col * (1.0 - 0.18 * blush[..., None]) + np.array([244.0, 168.0, 156.0], dtype=np.float32) * (0.18 * blush[..., None])

    beak_seam = (
        smoothstep(0.22, 0.14, ax)
        * smoothstep(-1.32, -1.42, y)
        * smoothstep(1.08, 1.11, z)
        * smoothstep(1.18, 1.14, z)
        * smoothstep(0.58, 0.38, luma_s2)
    )
    seam_col = np.array([152.0, 134.0, 96.0], dtype=np.float32)
    skin_col = skin_col * (1.0 - 0.38 * beak_seam[..., None]) + seam_col * (0.38 * beak_seam[..., None])
    cream_col = cream_col * (1.0 - 0.42 * beak_seam[..., None]) + seam_col * (0.42 * beak_seam[..., None])

    # Combine regions cleanly
    out_rgb = np.zeros_like(raw)
    out_rgb[...] = np.array([110.0, 188.0, 154.0], dtype=np.float32)
    base_blend = (
        skin_col * w_skin[..., None]
        + cream_col * w_cream[..., None]
        + shell_col * w_shell[..., None]
    )
    out_rgb[covered] = base_blend[covered]

    # Clean, smooth nostril dots on the blended surface (no green rim fringes)
    nostril_w = (
        smoothstep(0.13, 0.08, ax)
        * smoothstep(-1.36, -1.43, y)
        * smoothstep(1.14, 1.21, z)
        * smoothstep(0.36, 0.18, luma_s2)
    )
    nostril_w = np.clip(gaussian_filter(nostril_w, sigma=1.2) * 0.72, 0.0, 0.72)
    out_rgb = out_rgb * (1.0 - nostril_w[..., None]) + np.array([58.0, 72.0, 64.0], dtype=np.float32) * (nostril_w[..., None])

    rough = 168.0 * w_shell + 204.0 * (w_skin + w_cream) + 204.0 * (1.0 - covered)

    # --- 5. Bright, Expressive Mario-Party Eyes (warm pearl sclera + radiant rose-amethyst iris) ---
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

        # u_out > 0 toward outer temple/ear, u_out < 0 toward inner snout on both eyes
        u_out = side * u_local
        # Large soulful Mario-Party iris (~85% of socket height) with gentle 4% inward convergence
        u_iris = u_out + 0.04
        v_iris = v_local - 0.02
        r_iris = np.hypot(u_iris / 0.84, v_iris / 0.90)
        iris_w = smoothstep(1.03, 0.95, r_iris)

        # Natural warm pearl-white sclera (soft upper lid tint, visible outer crescent)
        sclera_base = np.array([245.0, 242.0, 238.0], dtype=np.float32)
        sclera_lid_tint = np.array([196.0, 192.0, 206.0], dtype=np.float32)
        lid_tint_w = smoothstep(0.15, 0.88, v_local) * 0.26
        sclera_col = sclera_base * (1.0 - lid_tint_w[..., None]) + sclera_lid_tint * lid_tint_w[..., None]

        # Rich jewel indigo-plum -> amethyst-violet -> glowing rose-peach lower crescent
        v_grad = np.clip(0.45 - 0.72 * v_iris, 0.0, 1.0)
        iris_top = np.array([48.0, 28.0, 72.0], dtype=np.float32)
        iris_mid = np.array([128.0, 48.0, 128.0], dtype=np.float32)
        iris_low = np.array([248.0, 152.0, 184.0], dtype=np.float32)
        iris_col = iris_top * (1.0 - v_grad[..., None]) + iris_mid * v_grad[..., None]

        ang = np.arctan2(v_iris, u_iris)
        sheen = 1.0 + 0.05 * np.cos(16.0 * ang)
        iris_col = np.clip(iris_col * sheen[..., None], 0.0, 255.0)

        warm_crescent = smoothstep(-0.02, -0.62, v_iris) * smoothstep(0.46, 0.66, r_iris) * smoothstep(0.92, 0.78, r_iris)
        iris_col = iris_col * (1.0 - 0.78 * warm_crescent[..., None]) + iris_low * (0.78 * warm_crescent[..., None])

        # Thin deep plum limbal ring + proportioned dark espresso-plum pupil (r_iris < 0.54)
        limbus_ring = smoothstep(0.86, 0.92, r_iris) * smoothstep(1.02, 0.95, r_iris)
        iris_col = iris_col * (1.0 - 0.78 * limbus_ring[..., None]) + np.array([44.0, 22.0, 54.0], dtype=np.float32) * (0.78 * limbus_ring[..., None])

        pupil_w = smoothstep(0.56, 0.50, r_iris)
        iris_col = iris_col * (1.0 - pupil_w[..., None]) + np.array([18.0, 12.0, 24.0], dtype=np.float32) * pupil_w[..., None]

        # Combine sclera + iris cleanly
        eye_col = sclera_col * (1.0 - iris_w[..., None]) + iris_col * iris_w[..., None]

        # Soft upper-lid cast shadow across cornea
        lid_shadow = smoothstep(0.20, 0.88, v_local) * 0.28
        eye_col = eye_col * (1.0 - lid_shadow[..., None])

        # Crisp twin Nintendo catchlights anchored cleanly on iris/pupil edge
        hl1 = smoothstep(0.24, 0.11, np.hypot(u_iris + 0.20, v_iris - 0.25))
        hl2 = smoothstep(0.11, 0.04, np.hypot(u_iris - 0.24, v_iris + 0.24)) * 0.88
        hl = np.clip(hl1 + hl2, 0.0, 1.0)
        eye_col = eye_col * (1.0 - hl[..., None]) + np.array([255.0, 254.0, 252.0], dtype=np.float32) * hl1[..., None]
        eye_col = np.clip(eye_col + np.array([255.0, 252.0, 255.0], dtype=np.float32) * (hl2 * (1.0 - hl1))[..., None], 0.0, 255.0)

        # Clean upper eyelid crease + gentle lower orbit crease so eye sits recessed in socket
        rim_band = smoothstep(0.06, 0.26, orbit_soft) * smoothstep(0.68, 0.26, orbit_soft)
        upper_lid = rim_band * smoothstep(0.05, 0.35, v_local)
        lower_lid = rim_band * (1.0 - smoothstep(0.05, 0.35, v_local))
        out_rgb = out_rgb * (1.0 - 0.72 * upper_lid[..., None]) + np.array([30.0, 48.0, 48.0], dtype=np.float32) * (0.72 * upper_lid[..., None])
        out_rgb = out_rgb * (1.0 - 0.28 * lower_lid[..., None]) + np.array([58.0, 92.0, 86.0], dtype=np.float32) * (0.28 * lower_lid[..., None])

        out_rgb = out_rgb * (1.0 - cornea_w[..., None]) + eye_col * cornea_w[..., None]
        rough = rough * (1.0 - cornea_w) + 22.0 * cornea_w
        rough = rough * (1.0 - 0.40 * upper_lid) + 150.0 * (0.40 * upper_lid)

    # --- 6. Export Hero (2048/512) & View (1024/256) Texture Sets ---
    color_u8 = np.clip(np.round(out_rgb), 0, 255).astype(np.uint8)
    col_img = Image.fromarray(color_u8, mode="RGB")
    col_img.save(ST4 / "color-2048.png", format="PNG", optimize=True)
    col_img.save(ST4 / "color-2048.jpg", format="JPEG", quality=90, optimize=True)
    col_1024 = col_img.resize((1024, 1024), Image.Resampling.LANCZOS)
    col_1024.save(ST4 / "color-1024.jpg", format="JPEG", quality=88, optimize=True)

    r_512 = np.array(
        Image.fromarray(np.clip(np.round(rough), 0, 255).astype(np.uint8), mode="L").resize((512, 512), Image.Resampling.BILINEAR),
        dtype=np.uint8,
    )
    surf_512 = Image.fromarray(np.stack([np.full_like(r_512, 255), r_512, np.zeros_like(r_512)], axis=-1), mode="RGB")
    surf_512.save(ST4 / "surface-512.png", format="PNG", optimize=True)

    surf_256_arr = np.array(surf_512.resize((256, 256), Image.Resampling.BILINEAR), dtype=np.uint8)
    surf_256_arr[..., 0] = 255
    surf_256_arr[..., 2] = 0
    Image.fromarray(surf_256_arr, mode="RGB").save(ST4 / "surface-256.png", format="PNG", optimize=True)

    print("MP v4 bright-eye export ready:", ST4)
    print("Surface metallic max:", int(surf_256_arr[..., 2].max()), "roughness min/med/max:", int(r_512.min()), int(np.median(r_512)), int(r_512.max()))


if __name__ == "__main__":
    main()
