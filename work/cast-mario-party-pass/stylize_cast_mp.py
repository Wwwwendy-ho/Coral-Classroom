"""Stage Mario-Party / Animal-Crossing texture unification pass for existing canonical resident GLBs.
Preserves exact meshes, bones, vertex weights, NLA animations, material names/extras, and OctopusSkinMask alpha.
Outputs to work/cast-mario-party-pass/ without modifying canonical game/assets/models/.
"""
import io
import json
import struct
from pathlib import Path
import numpy as np
from PIL import Image

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
SRC_MODELS = REPO / "game" / "assets" / "models"


def bilateral_rgb(rgb_f32, radius=4, sigma_space=3.0, sigma_color=22.0, passes=2):
    img = rgb_f32.astype(np.float32)
    offs = [
        (dy, dx)
        for dy in range(-radius, radius + 1)
        for dx in range(-radius, radius + 1)
        if 0 < dy * dy + dx * dx <= radius * radius
    ]
    inv2_s = 1.0 / (2.0 * sigma_space * sigma_space)
    inv2_c = 1.0 / (2.0 * sigma_color * sigma_color)
    H, W = img.shape[:2]
    for _ in range(passes):
        pad = np.pad(img, ((radius, radius), (radius, radius), (0, 0)), mode="edge")
        acc = img.copy()
        wsum = np.ones((H, W, 1), dtype=np.float32)
        for dy, dx in offs:
            nb = pad[radius + dy : radius + dy + H, radius + dx : radius + dx + W]
            dc2 = np.sum((nb - img) ** 2, axis=-1, keepdims=True)
            w = np.exp(-(dy * dy + dx * dx) * inv2_s - dc2 * inv2_c)
            acc += nb * w
            wsum += w
        img = acc / wsum
    return img


def rgb_to_hsv(rgb):
    arr = np.clip(rgb / 255.0, 0.0, 1.0)
    r, g, b = arr[..., 0], arr[..., 1], arr[..., 2]
    mx = np.maximum(np.maximum(r, g), b)
    mn = np.minimum(np.minimum(r, g), b)
    df = mx - mn
    h = np.zeros_like(mx)
    m = df > 1e-6
    rm = (mx == r) & m
    gm = (mx == g) & m
    bm = (mx == b) & m
    h[rm] = ((g[rm] - b[rm]) / df[rm]) % 6.0
    h[gm] = ((b[gm] - r[gm]) / df[gm]) + 2.0
    h[bm] = ((r[bm] - g[bm]) / df[bm]) + 4.0
    h = (h / 6.0) % 1.0
    s = np.where(mx > 1e-6, df / np.maximum(mx, 1e-6), 0.0)
    return h, s, mx


def hsv_to_rgb(h, s, v):
    h6 = (h % 1.0) * 6.0
    i = np.floor(h6).astype(np.int32)
    f = h6 - i
    p = v * (1.0 - s)
    q = v * (1.0 - s * f)
    t = v * (1.0 - s * (1.0 - f))
    i = i % 6
    out = np.zeros(h.shape + (3,), dtype=np.float32)
    for k, (c0, c1, c2) in enumerate([(v, t, p), (q, v, p), (p, v, t), (p, q, v), (t, p, v), (v, p, q)]):
        m = i == k
        out[m, 0] = c0[m]
        out[m, 1] = c1[m]
        out[m, 2] = c2[m]
    return np.clip(out * 255.0, 0.0, 255.0)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def style_surface_satin(surf_img):
    arr = np.array(surf_img.convert("RGB"), dtype=np.float32)
    g = arr[..., 1]
    # Keep glossy eyes shiny (g < 85); pull matte/scratched body into clean satin [178..210], zero metallic
    gloss_w = smoothstep(95.0, 60.0, g)
    clean_g = np.clip(176.0 + (g - 150.0) * 0.25, 172.0, 212.0)
    out_g = g * gloss_w + clean_g * (1.0 - gloss_w)
    out = np.stack([
        np.full_like(out_g, 255.0),
        np.clip(np.round(out_g), 22.0, 225.0),
        np.zeros_like(out_g),
    ], axis=-1).astype(np.uint8)
    return Image.fromarray(out, mode="RGB")


def style_jisu_color(col_img):
    arr = np.array(col_img.convert("RGB"), dtype=np.float32)
    base_smooth = bilateral_rgb(arr, radius=4, sigma_space=3.0, sigma_color=20.0, passes=2)
    heavy_shell = bilateral_rgb(arr, radius=5, sigma_space=4.0, sigma_color=42.0, passes=2)

    h, s, v = rgb_to_hsv(base_smooth)
    # Identify speckled pale/neutral shell regions vs dark eyes/vivid orange mail props
    is_shell = smoothstep(0.36, 0.56, v) * smoothstep(0.32, 0.16, s)
    mixed = base_smooth * (1.0 - is_shell[..., None]) + heavy_shell * is_shell[..., None]

    # Harmonize to Mario Party clarity: soften dark shell contrast toward warm creamy shell, lift dark charcoal body
    h, s, v = rgb_to_hsv(mixed)
    is_orange_bag = (h < 0.14) | (h > 0.94)
    is_orange = is_orange_bag * smoothstep(0.35, 0.55, s) * smoothstep(0.25, 0.40, v)
    is_pupil = smoothstep(0.12, 0.05, v)

    # Warm clean pastel boost
    s = np.where(is_orange > 0.3, np.clip(s * 1.14, 0, 0.94), s)
    v = v + 0.08 * is_shell * (1.0 - smoothstep(0.75, 0.92, v))
    # Lift mid-dark blue/charcoal legs & crab body slightly without washing black pupils
    dark_body = smoothstep(0.08, 0.16, v) * smoothstep(0.45, 0.25, v) * (1.0 - is_pupil)
    v = v + 0.10 * dark_body
    s = np.where(dark_body > 0.2, np.clip(s * 1.15, 0, 0.85), s)
    rgb = hsv_to_rgb(h, np.clip(s, 0, 1), np.clip(v, 0, 0.96))
    return Image.fromarray(np.round(rgb).astype(np.uint8), mode="RGB")


def style_squid_color(col_img):
    arr = np.array(col_img.convert("RGB"), dtype=np.float32)
    smooth = bilateral_rgb(arr, radius=4, sigma_space=3.2, sigma_color=26.0, passes=2)
    h, s, v = rgb_to_hsv(smooth)
    is_pupil = smoothstep(0.11, 0.05, v)
    # Lift muted grey-purple mantle to pastel plum-lilac, keep bright yellow accents sunny
    is_yellow = smoothstep(0.09, 0.12, h) * smoothstep(0.20, 0.16, h) * smoothstep(0.22, 0.42, s)
    s = np.where(is_pupil < 0.5, np.clip(s * 1.24 + 0.05, 0.0, 0.88), s)
    v = v + 0.07 * (1.0 - is_pupil) * smoothstep(0.85, 0.45, v)
    v = v + 0.06 * is_yellow
    rgb = hsv_to_rgb(h, np.clip(s, 0, 1), np.clip(v, 0, 0.96))
    return Image.fromarray(np.round(rgb).astype(np.uint8), mode="RGB")


def style_seahorse_color(col_img):
    arr = np.array(col_img.convert("RGB"), dtype=np.float32)
    smooth = bilateral_rgb(arr, radius=3, sigma_space=2.5, sigma_color=18.0, passes=1)
    h, s, v = rgb_to_hsv(smooth)
    is_pupil = smoothstep(0.11, 0.05, v)
    s = np.where((is_pupil < 0.5) & (s > 0.12), np.clip(s * 1.08, 0, 0.90), s)
    v = v + 0.03 * (1.0 - is_pupil) * smoothstep(0.88, 0.45, v)
    rgb = hsv_to_rgb(h, np.clip(s, 0, 1), np.clip(v, 0, 0.96))
    return Image.fromarray(np.round(rgb).astype(np.uint8), mode="RGB")


def style_octopus_color(col_img):
    # CRITICAL: Preserve original PNG Alpha channel (OctopusSkinMask baseColorAlpha) BIT-IDENTICAL
    # and re-encode in mode='P' (2x128 palette: 0..127 alpha=0, 128..255 alpha=255) to fit byte caps!
    rgba = np.array(col_img.convert("RGBA"), dtype=np.uint8)
    alpha = rgba[..., 3].copy()
    rgb = rgba[..., :3].astype(np.float32)

    smooth = bilateral_rgb(rgb, radius=3, sigma_space=2.5, sigma_color=18.0, passes=1)
    h, s, v = rgb_to_hsv(smooth)
    is_pupil = smoothstep(0.11, 0.05, v)
    s = np.where((is_pupil < 0.5) & (s > 0.12), np.clip(s * 1.09, 0, 0.92), s)
    v = v + 0.045 * (1.0 - is_pupil) * smoothstep(0.82, 0.30, v)
    out_rgb = np.round(hsv_to_rgb(h, np.clip(s, 0, 1), np.clip(v, 0, 0.96))).astype(np.uint8)

    def quantize_masked(mask, n_colors=128):
        pts = out_rgb[mask]
        side = max(8, int(np.ceil(np.sqrt(len(pts)))))
        pad_pts = np.zeros((side * side, 3), dtype=np.uint8)
        pad_pts[: len(pts)] = pts
        if len(pts) > 0:
            pad_pts[len(pts) :] = pts[0]
        pal_ref = Image.fromarray(pad_pts.reshape(side, side, 3), mode="RGB").quantize(
            colors=n_colors, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE
        )
        pal_bytes = list(pal_ref.getpalette() or [])
        if len(pal_bytes) < n_colors * 3:
            pal_bytes.extend([0] * (n_colors * 3 - len(pal_bytes)))
        mapped = Image.fromarray(out_rgb, mode="RGB").quantize(palette=pal_ref, dither=Image.Dither.NONE)
        return np.array(mapped, dtype=np.uint8), pal_bytes[: n_colors * 3]

    idx0, pal0 = quantize_masked(alpha == 0, 128)
    idx1, pal1 = quantize_masked(alpha != 0, 128)
    idx_full = np.where(alpha == 0, idx0, idx1 + 128).astype(np.uint8)

    im_p = Image.fromarray(idx_full, mode="P")
    im_p.putpalette(pal0 + pal1)
    trns = bytes([0] * 128 + [255] * 128)
    im_p.info["transparency"] = trns
    # Verify round-trip alpha is 100% bit-identical
    assert np.array_equal(np.array(im_p.convert("RGBA"))[..., 3], alpha), "OctopusSkinMask alpha mismatch!"
    return im_p


def repack_glb_images(src_path, dst_path, color_fn, surf_fn, jpeg_quality=88):
    raw = src_path.read_bytes()
    magic, version, total_len = struct.unpack_from("<3I", raw, 0)
    assert magic == 0x46546C67 and version == 2 and total_len == len(raw)

    json_len, json_type = struct.unpack_from("<2I", raw, 12)
    assert json_type == 0x4E4F534A
    doc = json.loads(raw[20 : 20 + json_len].decode("utf-8"))

    bin_off = 20 + json_len
    bin_len, bin_type = struct.unpack_from("<2I", raw, bin_off)
    assert bin_type == 0x004E4942
    bin_data = raw[bin_off + 8 : bin_off + 8 + bin_len]

    # Identify color and surface image indices from materials
    mat = doc["materials"][0]
    pbr = mat["pbrMetallicRoughness"]
    col_img_idx = doc["textures"][pbr["baseColorTexture"]["index"]]["source"]
    surf_img_idx = doc["textures"][pbr["metallicRoughnessTexture"]["index"]]["source"]
    col_bv = doc["images"][col_img_idx]["bufferView"]
    surf_bv = doc["images"][surf_img_idx]["bufferView"]

    # Sanity check: ensure no bufferViews overlap
    bvs = doc["bufferViews"]
    spans = sorted((bv.get("byteOffset", 0), bv.get("byteOffset", 0) + bv["byteLength"], idx) for idx, bv in enumerate(bvs))
    for k in range(len(spans) - 1):
        assert spans[k][1] <= spans[k + 1][0], f"Overlapping bufferViews in {src_path.name}"

    def decode_bv(bv_idx):
        bv = bvs[bv_idx]
        off = bv.get("byteOffset", 0)
        return Image.open(io.BytesIO(bin_data[off : off + bv["byteLength"]]))

    def encode_img(im, mime):
        buf = io.BytesIO()
        if mime == "image/png":
            kw = {"optimize": True}
            if "transparency" in im.info:
                kw["transparency"] = im.info["transparency"]
            im.save(buf, format="PNG", **kw)
        elif mime == "image/jpeg":
            im.convert("RGB").save(buf, format="JPEG", quality=jpeg_quality, optimize=True)
        else:
            raise ValueError(f"Unsupported image mime: {mime}")
        return buf.getvalue()

    new_col_bytes = encode_img(color_fn(decode_bv(col_bv)), doc["images"][col_img_idx]["mimeType"])
    new_surf_bytes = encode_img(surf_fn(decode_bv(surf_bv)), doc["images"][surf_img_idx]["mimeType"])

    replacements = {col_bv: new_col_bytes, surf_bv: new_surf_bytes}

    new_bin = bytearray()
    for idx, bv in enumerate(bvs):
        while len(new_bin) % 4 != 0:
            new_bin.append(0)
        start = len(new_bin)
        if idx in replacements:
            payload = replacements[idx]
        else:
            old_off = bv.get("byteOffset", 0)
            payload = bin_data[old_off : old_off + bv["byteLength"]]
        new_bin.extend(payload)
        bv["byteOffset"] = start
        bv["byteLength"] = len(payload)

    while len(new_bin) % 4 != 0:
        new_bin.append(0)
    doc["buffers"][0]["byteLength"] = len(new_bin)

    new_json = bytearray(json.dumps(doc, separators=(",", ":"), ensure_ascii=False).encode("utf-8"))
    while len(new_json) % 4 != 0:
        new_json.append(0x20)

    total = 12 + 8 + len(new_json) + 8 + len(new_bin)
    out = bytearray()
    out.extend(struct.pack("<3I", 0x46546C67, 2, total))
    out.extend(struct.pack("<2I", len(new_json), 0x4E4F534A))
    out.extend(new_json)
    out.extend(struct.pack("<2I", len(new_bin), 0x004E4942))
    out.extend(new_bin)
    dst_path.write_bytes(bytes(out))
    print(f"Repacked {dst_path.name:24s} {src_path.stat().st_size:8,d} -> {dst_path.stat().st_size:8,d} bytes")


def main():
    HERE.mkdir(parents=True, exist_ok=True)
    jobs = [
        ("jisu.glb", style_jisu_color, 86),
        ("jisu-close.glb", style_jisu_color, 88),
        ("taxi-squid.glb", style_squid_color, 86),
        ("taxi-squid-view.glb", style_squid_color, 86),
        ("taxi-squid-close.glb", style_squid_color, 88),
        ("cafe-seahorse.glb", style_seahorse_color, 85),
        ("cafe-seahorse-close.glb", style_seahorse_color, 88),
        ("shop-octopus.glb", style_octopus_color, 88),
        ("shop-octopus-close.glb", style_octopus_color, 88),
    ]
    for fname, cfn, q in jobs:
        repack_glb_images(SRC_MODELS / fname, HERE / fname, cfn, style_surface_satin, jpeg_quality=q)


if __name__ == "__main__":
    main()
