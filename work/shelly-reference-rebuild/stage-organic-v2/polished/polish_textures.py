"""Palette-match 2048x2048 color texture and repair PBR metallic/roughness for organic Shelly (stage-organic-v2).
Uses Blender-baked 3D UV positions (uv_pos.npy) + normals (uv_nrm.npy) + raw textures.
"""
import json
from pathlib import Path
import numpy as np
from PIL import Image
from scipy.ndimage import gaussian_filter

POL = Path(__file__).resolve().parent
ST1 = POL.parents[1] / "stage-organic-v1"


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def unit(v):
    n = np.linalg.norm(v, axis=-1, keepdims=True)
    return v / np.maximum(n, 1e-8)


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

    # --- 1. Carapace Dome + Marginal Rim Mask ---
    # 3D bounds of shell plus color affinity so we don't bleed onto underside skin/flippers
    shell_box = (
        smoothstep(0.36, 0.50, z)
        * smoothstep(-0.62, -0.44, y)
        * smoothstep(1.62, 1.48, y)
        * smoothstep(0.88, 0.76, np.abs(x))
    )
    shell_hue = smoothstep(-12.0, 10.0, b - g) * smoothstep(90.0, 130.0, b)
    w_shell = np.clip(shell_box * (0.25 + 0.75 * shell_hue), 0.0, 1.0) * covered
    w_shell = gaussian_filter(w_shell, sigma=1.5)

    # --- 2. Eye Socket & Cornea Detection (symmetric left & right) ---
    # Use raw metallic mask + 3D proximity to locate each eye's exact socket & gaze apex
    head_zone = (z > 1.10) & (y < -0.95) & covered
    raw_eye_mask = head_zone & (mr[..., 2] > 50.0)

    # Compute local tangent frame & paint glowing rose-plum eyes symmetrically
    out_rgb = raw.copy()
    rough = np.full((2048, 2048), 204.0, dtype=np.float32)  # ~0.80 soft satin-matte default

    # --- 3. Transform Carapace Palette (cool slate-blue -> warm lavender-orchid + peach-gold) ---
    luma_blur = gaussian_filter(luma, sigma=11.0)
    groove = np.clip((luma_blur - luma) * 6.5, 0.0, 1.0)
    bevel = np.clip((luma - luma_blur) * 4.5, 0.0, 1.0)

    # Core rich lavender-periwinkle albedo (calibrated so lit Cycles/WebGL renders match APPROVED without blowing out)
    sh_r = np.clip(r * 0.84 + 0.56 * np.maximum(0.0, b - r) + 4.0, 0, 232)
    sh_g = np.clip(g * 0.78 + 0.10 * np.maximum(0.0, b - g) + 4.0, 0, 210)
    sh_b = np.clip(b * 0.88 + 26.0, 0, 242)
    shell_col = np.stack([sh_r, sh_g, sh_b], axis=-1)

    # Warm peach-gold mineral mottling inside brighter scute facets + rich periwinkle-aqua accents
    mottle_warm = smoothstep(0.46, 0.76, luma + 0.26 * (r - g) / 255.0) * (1.0 - groove)
    scute_var = 0.5 + 0.5 * np.sin(x * 9.5 + np.cos(y * 7.2) * 1.4) * np.cos(y * 8.1 - x * 3.0)
    peach_mix = np.clip(mottle_warm * (0.48 + 0.44 * scute_var), 0.0, 0.78)
    shell_col = shell_col * (1.0 - peach_mix[..., None]) + np.array([244.0, 180.0, 128.0]) * peach_mix[..., None]

    aqua_var = smoothstep(0.62, 0.88, 1.0 - scute_var) * smoothstep(0.40, 0.68, luma) * (1.0 - groove)
    shell_col = shell_col * (1.0 - 0.30 * aqua_var[..., None]) + np.array([104.0, 152.0, 224.0]) * (0.30 * aqua_var[..., None])

    # Crisp soft-cream scute bevels & rich deep plum seams
    shell_col = shell_col * (1.0 - 0.28 * bevel[..., None]) + np.array([228.0, 204.0, 234.0]) * (0.28 * bevel[..., None])
    shell_col = shell_col * (1.0 - 0.56 * groove[..., None]) + np.array([76.0, 56.0, 132.0]) * (0.56 * groove[..., None])

    # --- 4. Transform Cream Plastron / Lower Beak / Throat Underside ---
    cream_hue = smoothstep(145.0, 185.0, r) * smoothstep(135.0, 175.0, g) * smoothstep(-5.0, 24.0, g - b)
    belly_zone = smoothstep(0.45, 0.28, z) * smoothstep(0.60, 0.35, np.abs(x)) * smoothstep(-0.70, -0.30, y)
    beak_zone = smoothstep(-1.12, -1.32, y) * smoothstep(1.24, 1.08, z) * smoothstep(0.32, 0.16, np.abs(x))
    w_cream = np.clip(np.maximum(cream_hue * 0.85, np.maximum(belly_zone, beak_zone * cream_hue)), 0.0, 1.0)
    w_cream = w_cream * (1.0 - w_shell) * covered
    w_cream = gaussian_filter(w_cream, sigma=1.5)

    cr_r = np.clip(r * 0.90 + 18.0, 0, 238)
    cr_g = np.clip(g * 0.84 + 14.0, 0, 222)
    cr_b = np.clip(b * 0.84 + 14.0, 0, 172)
    cream_col = np.stack([cr_r, cr_g, cr_b], axis=-1)

    # --- 5. Transform Lush Seafoam-Jade Skin & Crisp Polygonal Scales (warm buttercream-mint, not icy cyan) ---
    w_skin = np.clip((1.0 - w_shell - w_cream) * covered, 0.0, 1.0)
    sk_r = np.clip(r * 0.84 + 22.0, 0, 212)
    sk_g = np.clip(g * 0.88 + 22.0, 0, 222)
    sk_b = np.clip(b * 0.76 + 16.0, 0, 186)
    skin_col = np.stack([sk_r, sk_g, sk_b], axis=-1)

    # Crisp polygonal scale rims (warm buttercream-mint) & rich seafoam-jade scale interiors
    luma_fine = gaussian_filter(luma, sigma=4.0)
    scale_rim = np.clip((luma - luma_fine) * 5.6, 0.0, 1.0)
    scale_tile = np.clip((luma_fine - luma) * 5.0, 0.0, 1.0)
    skin_col = skin_col * (1.0 - 0.36 * scale_rim[..., None]) + np.array([216.0, 220.0, 158.0]) * (0.36 * scale_rim[..., None])
    skin_col = skin_col * (1.0 - 0.34 * scale_tile[..., None]) + np.array([62.0, 154.0, 132.0]) * (0.34 * scale_tile[..., None])

    # Subtle warm buttercream edge blend along front flipper leading/outer edges
    flipper_edge = (
        smoothstep(0.62, 0.90, np.abs(x))
        * smoothstep(0.10, -0.35, y)
        * np.clip(
            smoothstep(0.55, 0.78, luma) * smoothstep(-0.35, -0.70, y)
            + smoothstep(0.28, 0.08, z),
            0.0,
            1.0,
        )
    )
    flipper_w = np.clip(flipper_edge * 0.48, 0.0, 0.52)
    skin_col = skin_col * (1.0 - flipper_w[..., None]) + np.array([226.0, 206.0, 148.0]) * flipper_w[..., None]

    # Softly erase the raw-baked frown shadow inside the smoothed outer cheek zone (preserving front beak & scales)
    old_frown_tail = (
        smoothstep(0.19, 0.24, np.abs(x))
        * smoothstep(0.40, 0.33, np.abs(x))
        * smoothstep(-1.18, -1.25, y)
        * smoothstep(-1.41, -1.33, y)
        * smoothstep(1.01, 1.06, z)
        * smoothstep(1.20, 1.15, z)
        * smoothstep(0.68, 0.44, luma)
    )
    warm_cheek_fill = np.array([208.0, 196.0, 148.0], dtype=np.float32)
    skin_col = skin_col * (1.0 - 0.78 * old_frown_tail[..., None]) + warm_cheek_fill * (0.78 * old_frown_tail[..., None])
    cream_col = cream_col * (1.0 - 0.85 * old_frown_tail[..., None]) + warm_cheek_fill * (0.85 * old_frown_tail[..., None])

    # Keep nostrils / front beak crease crisp (without darkening outer mouth corners)
    dark_detail = (
        smoothstep(0.28, 0.14, luma)
        * smoothstep(-1.26, -1.38, y)
        * smoothstep(1.00, 1.12, z)
        * smoothstep(0.20, 0.12, np.abs(x))
        * (1.0 - old_frown_tail)
    )
    skin_col = skin_col * (1.0 - 0.70 * dark_detail[..., None]) + raw * (0.70 * dark_detail[..., None])

    # Blend shell, cream, and skin cleanly
    out_rgb = raw.copy()
    base_blend = (
        skin_col * w_skin[..., None]
        + cream_col * w_cream[..., None]
        + shell_col * w_shell[..., None]
    )
    out_rgb[covered] = base_blend[covered]
    rough = 212.0 * w_skin + 200.0 * w_cream + 192.0 * w_shell + 206.0 * (1.0 - covered)

    # --- 6. Paint Luminous Symmetric Dark-Plum / Rose-Amber Eyes (full socket fill, zero metallic!) ---
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
        # Keep iris centered cleanly on socket (minimal shift so rear corners never expose raw sclera)
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
        in_orbit = side_mask & (dist_3d < 0.23) & (
            ((mr[..., 2] > 38.0) & non_green)
            | ((mr[..., 1] < 132.0) & non_green & (dist_3d < 0.21))
            | ((r_eye < 0.94) & (dist_3d < 0.14) & non_green)
            | ((luma < 0.34) & (r_eye < 1.15) & (dist_3d < 0.16) & non_green)
        )
        orbit_soft = gaussian_filter(in_orbit.astype(np.float32), sigma=1.4)
        socket_fill = smoothstep(0.10, 0.45, orbit_soft)
        cornea_w = socket_fill

        # Deep soulful dark plum-aubergine iris + soft luminous rose-plum lower crescent (matches APPROVED crop!)
        ang = np.arctan2(v_local, u_local)
        fiber = 0.5 + 0.5 * np.sin(24.0 * ang + 1.5 * np.sin(6.0 * ang)) * np.cos(8.0 * r_eye)
        v_grad = np.clip(0.42 - 0.88 * v_local + 0.10 * fiber, 0.0, 1.0)
        iris_top = np.array([28.0, 14.0, 34.0], dtype=np.float32)
        iris_mid = np.array([98.0, 38.0, 86.0], dtype=np.float32)
        iris_low = np.array([196.0, 104.0, 132.0], dtype=np.float32)
        iris = iris_top * (1.0 - v_grad[..., None]) + iris_mid * v_grad[..., None]
        warm_crescent = smoothstep(-0.08, -0.62, v_local) * smoothstep(0.46, 0.72, r_eye) * smoothstep(0.92, 0.72, r_eye)
        iris = iris * (1.0 - 0.66 * warm_crescent[..., None]) + iris_low * (0.66 * warm_crescent[..., None])

        # Large expressive dark pupil (r < 0.58) + deep plum-espresso full-socket rim (zero pale/grey sclera)
        pupil_w = smoothstep(0.62, 0.54, r_eye)
        limbus_w = smoothstep(0.76, 0.90, r_eye)
        eye_col = iris * (1.0 - pupil_w[..., None]) + np.array([12.0, 8.0, 18.0], dtype=np.float32) * pupil_w[..., None]
        eye_col = eye_col * (1.0 - limbus_w[..., None]) + np.array([22.0, 13.0, 28.0], dtype=np.float32) * limbus_w[..., None]

        lid_shadow = smoothstep(0.18, 0.74, v_local) * 0.48
        eye_col *= (1.0 - lid_shadow[..., None])

        hl1 = smoothstep(0.20, 0.08, np.hypot(u_local + 0.22 * side, v_local - 0.26))
        hl2 = smoothstep(0.10, 0.04, np.hypot(u_local - 0.24 * side, v_local + 0.24)) * 0.78
        hl = np.clip(hl1 + hl2, 0.0, 1.0)
        eye_col = eye_col * (1.0 - hl[..., None]) + np.array([255.0, 250.0, 246.0], dtype=np.float32) * hl[..., None]

        lash_ring = smoothstep(0.05, 0.25, orbit_soft) * smoothstep(0.65, 0.25, orbit_soft) * smoothstep(-0.20, 0.50, v_local)
        out_rgb = out_rgb * (1.0 - 0.58 * lash_ring[..., None]) + np.array([30.0, 44.0, 42.0], dtype=np.float32) * (0.58 * lash_ring[..., None])

        out_rgb = out_rgb * (1.0 - cornea_w[..., None]) + eye_col * cornea_w[..., None]
        rough = rough * (1.0 - cornea_w) + 26.0 * cornea_w
        rough = rough * (1.0 - 0.5 * lash_ring) + 140.0 * (0.5 * lash_ring)

    # Save polished 2048 color (PNG + JPEG q92) + 512 packed metallic/roughness PNG (R=255 AO, G=Roughness, B=0 Metallic)
    color_u8 = np.clip(np.round(out_rgb), 0, 255).astype(np.uint8)
    color_img = Image.fromarray(color_u8, mode="RGB")
    color_img.save(POL / "color-polished.png", format="PNG", optimize=True)
    color_img.save(POL / "color-polished.jpg", format="JPEG", quality=92, subsampling=0, optimize=True)

    rough_img = Image.fromarray(np.clip(np.round(rough), 0, 255).astype(np.uint8), mode="L").resize((512, 512), Image.Resampling.BILINEAR)
    r_arr = np.array(rough_img, dtype=np.uint8)
    surf = np.stack([np.full_like(r_arr, 255), r_arr, np.zeros_like(r_arr)], axis=-1)
    Image.fromarray(surf, mode="RGB").save(POL / "surface-polished.png", format="PNG", optimize=True)

    # Log post-polish medians for verification
    print("Post-polish medians:")
    for name, m in [("shell", w_shell > 0.6), ("skin", w_skin > 0.6), ("cream", w_cream > 0.6)]:
        if m.sum():
            print(" ", name, "n=", int(m.sum()), "median=", np.median(color_u8[m], axis=0).astype(int).tolist())
    print("Surface map metallic max:", int(surf[..., 2].max()), "roughness min/median/max:", int(surf[..., 1].min()), int(np.median(surf[..., 1])), int(surf[..., 1].max()))


if __name__ == "__main__":
    main()
