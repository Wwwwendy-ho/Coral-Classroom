"""Mira v22 Mario-Party-8 warm golden-honey & terracotta-coral storyteller rebuild (board + close GLBs).

python tools/art/build_mira.py -- --output ../work/cast-upgrade/v22/mira

m5 v22 upgrade over v13:
  * Distinct warm amber-gold & toasted-caramel tortoise shell + sunlit golden-honey skin (ZERO cyan-teal clone of Hero Shelly on 08-lagoon!),
  * Warm cream-coral headband, satchel strap & cozy draped storyteller neck scarf + terracotta-coral map satchel,
  * Warm burnished-gold rims & glowing sunlit amber glasses lenses,
  * 78% warm amber-chestnut iris eyes with crisp twin white catchlights, glossy 0.12 cornea roughness & rosy terracotta-coral cheek blush.
Budgets: mira.glb < 650 KB (aim <= 600), mira-close.glb < 1,433.6 KB, 1 mesh / 1 primitive / 1 material.
"""
import argparse, importlib.util, json, math, sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Matrix, Vector
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[2]          # game/
REPO = ROOT.parent
MP_DIR = REPO / 'work' / 'cast-mario-party-pass' / 'mira-mp'
_ce_spec = importlib.util.spec_from_file_location('conforming_eye', str(Path(__file__).with_name('conforming_eye.py')))
CE = importlib.util.module_from_spec(_ce_spec); _ce_spec.loader.exec_module(CE)
P = argparse.ArgumentParser()
P.add_argument('--output', type=Path, required=True)
P.add_argument('--board-tris', type=int, default=6800)
P.add_argument('--board-max', type=int, default=8000)
P.add_argument('--close-tris', type=int, default=18800)
P.add_argument('--close-max', type=int, default=19800)
args = P.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
OUT = args.output.resolve(); OUT.mkdir(parents=True, exist_ok=True)

spec = importlib.util.spec_from_file_location('build_mira_mp', str(MP_DIR / 'build_mira_mp.py'))
mp = importlib.util.module_from_spec(spec); spec.loader.exec_module(mp)

W = 2048


def read_img(path):
    im = bpy.data.images.load(str(path), check_existing=False)
    w, h = im.size
    a = np.array(im.pixels[:], dtype=np.float32).reshape(h, w, 4)
    bpy.data.images.remove(im)
    return a


def write_img(path, a, fmt, quality=88, noncolor=False):
    h, w, _ = a.shape
    im = bpy.data.images.new(path.stem, width=w, height=h, alpha=False)
    if noncolor:
        im.colorspace_settings.name = 'Non-Color'
    out = np.ones((h, w, 4), np.float32); out[..., :3] = np.clip(a[..., :3], 0, 1)
    im.pixels = out.ravel(); im.filepath_raw = str(path); im.file_format = fmt
    im.save(quality=quality) if fmt == 'JPEG' else im.save()
    bpy.data.images.remove(im)


def smooth_muzzle_source(src):
    """v25 Minor #1: Zero-shrinkage Taubin smoothing strictly on Mira's anterior muzzle/snout/chin
    (leaving eye sockets, forehead goggle crown, shell, and flippers 100% untouched) so the pale
    muzzle contour is silky-smooth and free of reconstructed lip/nostril lumpiness."""
    me = src.data
    n_v = len(me.vertices)
    co_orig = np.array([v.co[:] for v in me.vertices], np.float64)
    co_m = np.array([mp.morph_mira(v.co)[:] for v in me.vertices], np.float64)

    # Spatial C2 mask strictly covering the anterior snout/muzzle/chin well below & clear of eye sockets
    x_m, y_m, z_m = co_m[:, 0], co_m[:, 1], co_m[:, 2]
    w_y = 1.0 - smooth(-0.92, -0.82, y_m)  # front muzzle only (y_m more negative -> 1)
    w_z = smooth(0.70, 0.76, z_m) * (1.0 - smooth(0.935, 0.975, z_m))
    w_x = 1.0 - smooth(0.105, 0.168, np.abs(x_m))
    # Explicitly exclude eye socket regions (around |x_m| > 0.068, z_m > 0.865)
    eye_guard = smooth(0.066, 0.100, np.abs(x_m)) * smooth(0.862, 0.902, z_m)
    w_muz = np.clip(w_y * w_z * w_x * (1.0 - eye_guard), 0.0, 1.0)
    # Extra localized smoothing strictly on the tiny reconstructed nostril pits so dark AO craters flatten smoothly
    w_pit = (1.0 - smooth(-0.94, -0.89, y_m)) * (1.0 - smooth(0.048, 0.072, np.abs(x_m))) * smooth(0.870, 0.892, z_m) * (1.0 - smooth(0.930, 0.955, z_m))

    active = np.where((w_muz > 1e-4) | (w_pit > 1e-4))[0]
    if len(active) == 0:
        return

    # Build sparse neighbor lists for vertices in/adjacent to the muzzle patch
    nbrs = [set() for _ in range(n_v)]
    active_set = set(active.tolist())
    for e in me.edges:
        a, b = e.vertices[0], e.vertices[1]
        if a in active_set or b in active_set:
            nbrs[a].add(b)
            nbrs[b].add(a)

    # First gently flatten the tiny reconstructed nostril/lip indentations, then run zero-shrinkage Taubin smoothing
    pos = co_orig.copy()
    pit_idx = np.where(w_pit > 1e-4)[0]
    for _ in range(10):
        nxt = pos.copy()
        for vi in pit_idx:
            nb = nbrs[vi]
            if not nb:
                continue
            avg = pos[list(nb)].mean(axis=0)
            nxt[vi] = pos[vi] + (avg - pos[vi]) * (0.55 * w_pit[vi])
        pos = nxt
    for _ in range(22):
        for factor in (0.50, -0.45):
            nxt = pos.copy()
            for vi in active:
                nb = nbrs[vi]
                if not nb:
                    continue
                avg = pos[list(nb)].mean(axis=0)
                nxt[vi] = pos[vi] + (avg - pos[vi]) * (factor * w_muz[vi])
            pos = nxt

    for vi in active:
        me.vertices[vi].co = Vector(pos[vi].tolist())
    me.update()
    print(f'MIRA_V25_MUZZLE_SMOOTHED verts={len(active)} max_disp={np.linalg.norm(pos[active] - co_orig[active], axis=-1).max():.4f}', flush=True)


def enlarge_mira_eyes_source(src):
    """v28 Minor #4: Smooth C2 diffeomorphic 1.43x radial expansion of Mira's 3D eye domes & orbital sockets
    on the welded source mesh (before bake_positions & decimation) so both board & close LODs carry genuinely
    enlarged, smooth Mario-Party eyes with zero old-socket crease cutting across the enlarged iris."""
    me = src.data
    co = np.array([v.co[:] for v in me.vertices], np.float64)
    # Build smooth vertex normals for gentle corneal dome swell
    me.calc_loop_triangles()
    tris_v = np.array([list(tri.vertices) for tri in me.loop_triangles], np.int32)
    vn = np.zeros_like(co)
    fn = np.cross(co[tris_v[:, 1]] - co[tris_v[:, 0]], co[tris_v[:, 2]] - co[tris_v[:, 0]])
    for k in range(3):
        np.add.at(vn, tris_v[:, k], fn)
    vn /= np.maximum(np.linalg.norm(vn, axis=-1, keepdims=True), 1e-8)

    disp = np.zeros_like(co)
    eye_centers = [(-0.1943, -0.7804, 0.8792), (0.1943, -0.7804, 0.8792)]
    for sgn, ec_t in ((-1.0, eye_centers[0]), (1.0, eye_centers[1])):
        ec = np.array(ec_t, np.float64)
        # Keep deformation strictly on this side of the head (zero cross-midline pinch)
        side_mask = smooth(0.025, 0.068, sgn * co[:, 0])
        # Compute local outward eye normal from surface vertices closest to the eye center
        d_all = np.linalg.norm(co - ec, axis=-1)
        near = (d_all < 0.055) & (sgn * co[:, 0] > 0.08)
        n_eye = vn[near].mean(axis=0) if near.any() else np.array([sgn * 0.65, -0.72, 0.24])
        n_eye /= max(1e-8, np.linalg.norm(n_eye))
        # Eye surface center slightly on the outer eyeball dome
        c_surf = co[near].mean(axis=0) if near.any() else ec

        rel = co - c_surf
        proj_n = rel @ n_eye
        tan_v = rel - proj_n[:, None] * n_eye[None, :]
        r_tan = np.linalg.norm(tan_v, axis=-1)
        tan_dir = tan_v / np.maximum(r_tan[:, None], 1e-8)

        # Restrict to front/side eye hemisphere (exclude back of skull or inner eyeball back-face)
        front_h = smooth(-0.06, 0.01, proj_n)
        # Monotonic C2 radial expansion mapping r=0.082 -> r=0.118 (~1.44x) with d(r_new)/dr >= 0.72 everywhere
        R_mid = 0.098
        A_exp = 0.058
        falloff = 1.0 - smooth(0.155, 0.235, r_tan)
        dr = A_exp * (r_tan / R_mid) * np.exp(-0.5 * ((r_tan / R_mid) ** 2)) * falloff * side_mask * front_h
        # Gentle smooth corneal dome lift + subtle sculpted 3D upper/lower eyelid rim fold cupping the eye cleanly
        swell = 0.010 * np.exp(-((r_tan / 0.102) ** 2)) * side_mask * front_h
        up_loc = np.array([0.0, 0.0, 1.0], np.float64) - n_eye * n_eye[2]
        up_loc /= max(1e-8, np.linalg.norm(up_loc))
        ez_loc = rel @ up_loc
        up_lid_w = smooth(0.015, 0.075, ez_loc)
        lo_lid_w = smooth(-0.025, -0.085, ez_loc)
        lid_rim = (0.0045 * up_lid_w + 0.0022 * lo_lid_w) * np.exp(-(((r_tan - 0.118) / 0.034) ** 2)) * side_mask * front_h
        # Subtle forward-facing rotation (~4 deg inward eye-contact convergence) of eye dome so front.png shows warm eye contact
        fwd_dir = np.array([-sgn * 0.22, -0.96, 0.10], np.float64)
        fwd_dir /= np.linalg.norm(fwd_dir)
        fwd_pull = 0.010 * np.exp(-((r_tan / 0.115) ** 2)) * side_mask * front_h

        disp += tan_dir * dr[:, None] + n_eye[None, :] * (swell + lid_rim)[:, None] + fwd_dir[None, :] * fwd_pull[:, None]

    new_co = co + disp
    changed = np.where(np.linalg.norm(disp, axis=-1) > 1e-5)[0]
    for vi in changed:
        me.vertices[vi].co = Vector(new_co[vi].tolist())
    me.update()
    print(f'MIRA_V28_EYES_ENLARGED verts={len(changed)} max_disp={np.linalg.norm(disp, axis=-1).max():.4f}', flush=True)


def bake_positions(src, u_scale):
    """Per-texel 3D position (welded source space + morphed space & morphed normal) by rasterizing every UV triangle."""
    me = src.data; me.calc_loop_triangles(); uv = me.uv_layers.active.data
    co = np.array([v.co[:] for v in me.vertices], np.float32)
    co_m = np.array([mp.morph_mira(v.co)[:] for v in me.vertices], np.float32)
    # Compute smooth morphed vertex normals via area-weighted face accumulation
    vn_m = np.zeros_like(co_m)
    tris_v = np.array([list(tri.vertices) for tri in me.loop_triangles], np.int32)
    fn_m = np.cross(co_m[tris_v[:, 1]] - co_m[tris_v[:, 0]], co_m[tris_v[:, 2]] - co_m[tris_v[:, 0]])
    for k in range(3):
        np.add.at(vn_m, tris_v[:, k], fn_m)
    vn_len = np.linalg.norm(vn_m, axis=-1, keepdims=True)
    vn_m /= np.maximum(vn_len, 1e-8)

    pos = np.zeros((W, W, 3), np.float32)
    pos_m = np.zeros((W, W, 3), np.float32)
    nrm_m = np.zeros((W, W, 3), np.float32)
    cover = np.zeros((W, W), bool)
    for tri in me.loop_triangles:
        t = np.array([(uv[i].uv.x * u_scale, uv[i].uv.y) for i in tri.loops]) * (W - 1)
        x0, y0 = np.floor(t.min(axis=0)).astype(int); x1, y1 = np.ceil(t.max(axis=0)).astype(int)
        x0 = max(0, x0); y0 = max(0, y0); x1 = min(W - 1, x1); y1 = min(W - 1, y1)
        if x1 < x0 or y1 < y0: continue
        yy, xx = np.mgrid[y0:y1 + 1, x0:x1 + 1]; p0, p1, p2 = t
        den = (p1[1] - p2[1]) * (p0[0] - p2[0]) + (p2[0] - p1[0]) * (p0[1] - p2[1])
        if abs(den) < 1e-9: continue
        a = ((p1[1] - p2[1]) * (xx - p2[0]) + (p2[0] - p1[0]) * (yy - p2[1])) / den
        b = ((p2[1] - p0[1]) * (xx - p2[0]) + (p0[0] - p2[0]) * (yy - p2[1])) / den
        m = (a >= -.02) & (b >= -.02) & (a + b <= 1.02)
        vi = list(tri.vertices)
        w0, w1, w2 = a[..., None], b[..., None], (1 - a - b)[..., None]
        c = co[vi]; cm = co_m[vi]; nm = vn_m[vi]
        pos[y0:y1 + 1, x0:x1 + 1][m] = (w0 * c[0] + w1 * c[1] + w2 * c[2])[m]
        pos_m[y0:y1 + 1, x0:x1 + 1][m] = (w0 * cm[0] + w1 * cm[1] + w2 * cm[2])[m]
        nrm_m[y0:y1 + 1, x0:x1 + 1][m] = (w0 * nm[0] + w1 * nm[1] + w2 * nm[2])[m]
        cover[y0:y1 + 1, x0:x1 + 1] |= m
    return pos, pos_m, nrm_m, cover


def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)


def ramp(t, stops):
    """Piecewise linear RGB color ramp over t in [0, 1]; stops = [(t0, (r,g,b)), ...]."""
    out = np.zeros(t.shape + (3,), np.float32)
    out[:] = np.array(stops[0][1], np.float32) / 255.0
    for (t0, c0), (t1, c1) in zip(stops[:-1], stops[1:]):
        w = smooth(t0, t1, t)
        col1 = np.array(c1, np.float32) / 255.0
        out = out + (col1 - out) * w[..., None]
    return out


def paint_patches(rgb, sur, meta):
    """Repaint the 5 accessory patches to Mira's warm terracotta-coral, cream-coral headband/scarf & sunlit amber glasses palette."""
    patches = meta['patches']
    for name, (px, py, pw, ph) in patches.items():
        x0, x1 = px, px + pw
        y0, y1 = W - (py + ph), W - py
        # Expand 12px bleed margin into patch border so mipmaps never bleed grey
        bx0, bx1 = max(meta['body_w'] + 2, x0 - 12), min(W, x1 + 12)
        by0, by1 = max(0, y0 - 12), min(W, y1 + 12)
        H, Wp = by1 - by0, bx1 - bx0
        yy, xx = np.mgrid[0:H, 0:Wp]
        u = np.clip((xx - (x0 - bx0)) / max(1, pw - 1), 0, 1).astype(np.float32)
        v = np.clip((yy - (y0 - by0)) / max(1, ph - 1), 0, 1).astype(np.float32)
        weave = .018 * np.sin(90 * u) + .018 * np.sin(90 * v)

        if name == 'coral_canvas':
            # v28 Minor #9: Vibrant saturated coral-red storyteller map satchel with crisp ivory stitched hem border
            c0 = np.array([216, 48, 42], np.float32) / 255.0
            c1 = np.array([248, 92, 68], np.float32) / 255.0
            pat = c0 + (c1 - c0) * np.clip(.45 + .30 * v + weave, 0, 1)[..., None]
            edge = np.minimum(np.minimum(u, 1 - u), np.minimum(v, 1 - v))
            trim = np.exp(-((edge - .075) / .022) ** 2)
            pat = pat + (np.array([255, 246, 228], np.float32) / 255.0 - pat) * (trim * .86)[..., None]
            r_val, m_val = .82, 0.0
        elif name == 'strap_teal':
            # v28 Minor #9: Vibrant coral-red & ivory neckerchief, headband & satchel strap!
            coral = np.array([224, 44, 44], np.float32) / 255.0
            ivory = np.array([255, 248, 232], np.float32) / 255.0
            gold = np.array([248, 192, 62], np.float32) / 255.0
            band = smooth(.28, .36, v) * (1.0 - smooth(.64, .72, v))
            pin = np.exp(-((v - .26) / .026) ** 2) + np.exp(-((v - .74) / .026) ** 2)
            pat = coral * (1.0 + weave[..., None] * .8)
            pat = pat + (ivory - pat) * (band * .96)[..., None]
            pat = pat + (gold - pat) * np.clip(pin * .90, 0, 1)[..., None]
            r_val, m_val = .80, 0.0
        elif name == 'copper':
            # Gleaming burnished warm copper-bronze explorer goggle frames & nose bridge
            c0 = np.array([154, 82, 24], np.float32) / 255.0
            c1 = np.array([234, 158, 66], np.float32) / 255.0
            pat = c0 + (c1 - c0) * np.clip(.38 + .46 * v + .08 * np.sin(u * math.tau), 0, 1)[..., None]
            r_val, m_val = .30, .44
        elif name == 'lens':
            # v28 Minor #9: Luminous sparkling aqua forehead goggle lenses (crisp contrast against honey forehead, ZERO pole dot!)
            lx = (u - .5) * 2.0
            ly = (v - .5) * 2.0
            rr = np.hypot(lx, ly)
            r0 = np.array([152, 246, 242], np.float32) / 255.0
            r1 = np.array([28, 188, 200], np.float32) / 255.0
            r2 = np.array([14, 114, 136], np.float32) / 255.0
            pat = r0 + (r1 - r0) * smooth(.15, .72, rr)[..., None]
            pat = pat + (r2 - pat) * smooth(.68, 1.0, rr)[..., None]
            # Crisp diagonal glass reflection gleam in upper-left of each lens
            gleam = np.exp(-(((lx + .30) / .26) ** 2 + ((ly - .32) / .20) ** 2))
            streak = np.exp(-(((lx + ly - .18) / .14) ** 2)) * smooth(.95, .35, rr) * .32
            pat = pat + (np.array([250, 255, 254], np.float32) / 255.0 - pat) * np.clip(gleam * .85 + streak, 0, 1)[..., None]
            r_val, m_val = .12, .05
        else:  # scroll_cream
            c0 = np.array([248, 232, 198], np.float32) / 255.0
            c1 = np.array([255, 248, 228], np.float32) / 255.0
            pat = c0 + (c1 - c0) * np.clip(.40 + .45 * v + weave, 0, 1)[..., None]
            ribbon = np.exp(-((v - .50) / .075) ** 2)
            pat = pat + (np.array([224, 48, 44], np.float32) / 255.0 - pat) * (ribbon * .92)[..., None]
            r_val, m_val = .76, 0.0

        rgb[by0:by1, bx0:bx1] = np.clip(pat, 0, 1)
        sx0, sx1 = bx0 // 4, min(512, (bx1 + 3) // 4)
        sy0, sy1 = by0 // 4, min(512, (by1 + 3) // 4)
        sur[sy0:sy1, sx0:sx1, 1] = r_val
        sur[sy0:sy1, sx0:sx1, 2] = m_val


def polish(color_path, surface_path, src, meta):
    u_scale = meta['body_w'] / meta['atlas_w']
    col = read_img(color_path); sur = read_img(surface_path)
    body_w = int(round(u_scale * W))
    rough = sur[..., 1] * 255
    low = (rough < 110); low[:, 405:] = False
    lab, n = ndimage.label(low)
    pos, pos_m, nrm_m, cover = bake_positions(src, u_scale)
    rgb = col[..., :3].copy()

    # Nearest-neighbor extrapolate 3D positions into uncovered UV gutters (within body_w) so ZERO original cyan-teal bleeds at UV seams!
    cov_body = cover[:, :body_w]
    _, idx = ndimage.distance_transform_edt(~cov_body, return_indices=True)
    pos_b = pos[:, :body_w][idx[0], idx[1]]
    pos_mb = pos_m[:, :body_w][idx[0], idx[1]]
    nrm_mb = nrm_m[:, :body_w][idx[0], idx[1]]
    px, py, pz = pos_b[..., 0], pos_b[..., 1], pos_b[..., 2]
    mx, my, mz = pos_mb[..., 0], pos_mb[..., 1], pos_mb[..., 2]

    # Separate carapace shell vs plastron cream vs sea-turtle skin cleanly using 3D geometry + original paint value!
    src_b = rgb[:, :body_w]
    r_in, g_in, b_in = src_b[..., 0], src_b[..., 1], src_b[..., 2]
    lum = .299 * r_in + .587 * g_in + .114 * b_in

    # Carapace shell mask in welded Shelly space (y > -0.32, z > 0.25, clear of lateral flippers)
    dome_y = smooth(-.34, -.16, py)
    dome_z = smooth(.24, .34, pz)
    not_flip = 1.0 - smooth(.46, .58, np.abs(px)) * smooth(.40, .28, pz)
    shell_w = np.clip(dome_y * dome_z * not_flip, 0, 1)
    # Reinforce shell mask on the unmistakable dusty slate-blue shell islands
    slate_hint = smooth(.04, .18, b_in - r_in) * smooth(.66, .48, g_in) * smooth(-.38, -.20, py) * smooth(.18, .30, pz)
    shell_w = np.maximum(shell_w, slate_hint)
    shell_w = ndimage.gaussian_filter(shell_w, 1.8)

    # v35 D2 MIN: Replace streaky photo-baked neck/shoulder/flipper skin & cream transitions with 100% clean,
    # symmetrical 3D surface-mapped countershading + crisp, evenly mapped organic cream-and-sage sea-turtle flipper speckles!
    nx_m, ny_m, nz_m = nrm_mb[..., 0], nrm_mb[..., 1], nrm_mb[..., 2]
    ax_m = np.abs(mx)

    # Clean 3D face chin/throat cream mask (preserves Mira's silky muzzle/chin contour)
    face_zone = (1.0 - smooth(-.72, -.58, my)) * smooth(.66, .74, mz)
    chin_curve_z = .862 - .018 * np.clip(ax_m / .14, 0, 1.4) ** 1.6
    smooth_face_cream = (1.0 - smooth(chin_curve_z - .036, chin_curve_z + .034, mz)) * (1.0 - smooth(-.84, -.74, my))
    throat_cream = (1.0 - smooth(.73, .81, mz)) * (1.0 - smooth(-.80, -.64, my))
    face_cream_clean = np.clip(np.maximum(smooth_face_cream * .78, throat_cream * .88), 0, 1)

    # Clean 3D lower-body (plastron, neck/chest column, flipper undersides) cream mask — ZERO streaky UV smudges!
    belly_cream = smooth(.08, -.28, nz_m) * (1.0 - smooth(.20, .34, mz))
    throat_col = smooth(.20, .09, ax_m) * smooth(-.06, -.44, ny_m) * (1.0 - smooth(-.38, -.16, my)) * smooth(.16, .34, mz)
    flip_ventral = smooth(-.04, -.42, nz_m) * smooth(.16, .28, ax_m) * (1.0 - smooth(.32, .42, mz))
    body_cream_3d = np.clip(np.maximum.reduce([belly_cream, throat_col * .88, flip_ventral * .86]), 0, 1)

    cream_w = (body_cream_3d * (1.0 - face_zone) + face_cream_clean * face_zone) * (1.0 - shell_w)
    cream_w = ndimage.gaussian_filter(cream_w, 1.4)

    # 1. v28 Minor #9: Unmistakable warm TERRACOTTA-TANGERINE & GOLDEN-CREAM PATTERNED DOME SHELL!
    #    Crisp 3D-projected hexagonal tortoise scute plates with golden-cream seams & scalloped marginal rim
    #    (instantly distinct from solid lavender-shelled Shelly in 08-lagoon!).
    ts = np.clip((lum - .24) / .52, 0, 1)
    ts = np.clip(ts + .06 * smooth(.42, .68, pz), 0, 1)
    # 3D carapace dome normalized coords (symmetric L/R, 100% UV-seam free!)
    cx_d = px / .46
    cy_d = (py - .16) / .48
    r_dome = np.hypot(cx_d, cy_d)
    # 9 symmetric sea-turtle scute plate centers (3 central vertebral + 3 pairs lateral costal)
    scute_ctrs = [
        (0.0, -0.46), (0.0, 0.00), (0.0, 0.46),
        (-0.54, -0.34), (0.54, -0.34),
        (-0.58,  0.10), (0.58,  0.10),
        (-0.46,  0.52), (0.46,  0.52),
    ]
    d1 = np.full_like(r_dome, 9.0)
    d2 = np.full_like(r_dome, 9.0)
    for scx, scy in scute_ctrs:
        dc = np.hypot(cx_d - scx, cy_d - scy)
        take1 = dc < d1
        d2 = np.where(take1, d1, np.minimum(d2, dc))
        d1 = np.where(take1, dc, d1)
    edge_d = d2 - d1
    # Outer golden-cream scalloped marginal rim band hugging the crisp lower shell edge so vibrant terracotta scutes fill the dome!
    rim_band = np.clip(np.maximum(smooth(.88, .96, r_dome), (1.0 - smooth(.27, .34, pz)) * smooth(-.34, -.18, py)), 0, 1)
    rim_ang = np.arctan2(cx_d, cy_d)
    rim_ticks = np.exp(-((np.sin(rim_ang * 6.0) / .18) ** 2)) * rim_band * smooth(.82, .94, r_dome)
    # Rich sunlit terracotta-tangerine scute dome base + warm glowing apricot center per plate
    scute_center_glow = np.exp(-((d1 / .26) ** 2)) * (1.0 - rim_band)
    shell_col = ramp(np.clip(ts * .75 + .22 * scute_center_glow, 0, 1), [
        (.00, (124, 34, 14)),
        (.35, (206, 68, 22)),
        (.72, (244, 120, 38)),
        (1.0, (255, 178, 82)),
    ])
    # Subtle burnt-terracotta bevel line hugging each scute inside the golden-cream ribs
    seam_bevel = np.exp(-(((edge_d - .068) / .028) ** 2)) * (1.0 - rim_band)
    shell_col = shell_col + (np.array([136, 38, 14], np.float32) / 255.0 - shell_col) * (seam_bevel * .55)[..., None]
    # Crisp luminous golden-cream hexagonal scute ribs + warm golden-cream marginal rim border
    seam_cream = np.exp(-((edge_d / .052) ** 2)) * (1.0 - rim_band)
    cream_rib_col = np.array([255, 232, 162], np.float32) / 255.0
    rim_cream_col = np.array([254, 224, 146], np.float32) / 255.0
    shell_col = shell_col + (cream_rib_col - shell_col) * (seam_cream * .88)[..., None]
    shell_col = shell_col + (rim_cream_col - shell_col) * (rim_band * .90)[..., None]
    shell_col = shell_col + (np.array([196, 68, 26], np.float32) / 255.0 - shell_col) * (rim_ticks * .52)[..., None]

    # 2. Distinct WARM GOLDEN-HONEY / APRICOT-SAND SEA-TURTLE SKIN (zero cool cyan-teal, zero UV flipper streaks!)
    # Replace noisy photo-baked snout/nostril/mouth & neck/shoulder/flipper luminance with silky-smooth 3D-guided shading!
    lum_smooth = ndimage.gaussian_filter(lum, 6.0)
    muzzle_clean = (1.0 - smooth(-.90, -.82, my)) * smooth(.72, .78, mz) * (1.0 - smooth(.945, .985, mz)) * (1.0 - smooth(.105, .155, ax_m))
    lum_ideal = np.clip(.69 + .06 * smooth(.83, .95, mz) - .04 * (1.0 - smooth(.73, .81, mz)), .55, .82)
    lum_face = lum * (1.0 - face_zone * .65) + lum_smooth * (face_zone * .65)
    lum_face = lum_face * (1.0 - muzzle_clean * .92) + lum_ideal * (muzzle_clean * .92)

    # Clean 3D-shaded luminance for neck, shoulders, front/rear flippers & torso (100% immune to streaky source UVs!)
    shoulder_ao = np.exp(-(((ax_m - .23) / .085) ** 2)) * smooth(-.54, -.22, my) * (1.0 - smooth(.30, .48, mz))
    lum_body_3d = np.clip(.66 + .09 * smooth(-.25, .75, nz_m) + .05 * smooth(.28, .92, ax_m) - .055 * shoulder_ao, .54, .82)
    lum_clean = lum_face * face_zone + lum_body_3d * (1.0 - face_zone)

    tk = np.clip((lum_clean - .34) / .48, 0, 1)
    skin_col = ramp(tk, [
        (.00, (156, 110, 48)),
        (.44, (218, 180, 100)),
        (.80, (246, 216, 138)),
        (1.0, (255, 240, 188)),
    ])

    # 3. Warm VANILLA-HONEY CREAM plastron, chin, throat & ventral flipper undersides
    tc = np.clip((lum_clean - .52) / .38, 0, 1)
    cream_col = ramp(tc, [
        (.00, (224, 188, 132)),
        (.55, (246, 224, 178)),
        (1.0, (254, 240, 204)),
    ])

    recolored = skin_col * (1.0 - cream_w[..., None]) + cream_col * cream_w[..., None]

    # 3b. v35 D2 MIN: Crisp, evenly mapped 3D organic CREAM-AND-SAGE sea-turtle flipper speckles!
    # Evaluated in orthonormal 3D blade-tangent coordinates (s_fl, c_fl) so speckles have ZERO UV stretching
    # across the inner shoulder root (230-300, 360-420), mid-blade, outer tip, and rear flippers.
    s_fl = (ax_m - .24) * .939 + (.335 - mz) * .343
    y_mid_fl = -.52 + .06 * (np.clip((s_fl - .35) / .50, 0, 1) ** 1.4)
    c_fl = my - y_mid_fl
    front_flip_vis = (
        smooth(.21, .28, ax_m)
        * (1.0 - smooth(-.27, -.13, my))
        * (1.0 - smooth(.37, .45, mz))
        * smooth(-.24, .14, nz_m + .46 * np.maximum(0.0, -ny_m))
        * (1.0 - shell_w)
    )
    # Hand-composed natural coastal sea-turtle pebble layout: (s0, c0, rs, rc, rot_deg, phase)
    sage_scales_front = [
        # Inner shoulder root & front-upper curve (directly visible in front.png at 230-300, 360-420!)
        (.032, -.045, .022, .020,  -8.0, 1.1),
        (.065, -.108, .031, .027, -14.0, 0.4),
        (.115, -.015, .033, .029,  10.0, 1.7),
        (.160, -.105, .038, .032, -10.0, 2.8),
        (.220,  .005, .042, .035,   8.0, 0.9),
        # Mid-blade staggered dorsal sea-turtle pebble rows
        (.275, -.110, .044, .036, -12.0, 3.6),
        (.350,  .010, .048, .040,   6.0, 2.1),
        (.295,  .110, .035, .030,  16.0, 4.4),
        (.405, -.100, .045, .036,  -8.0, 1.2),
        (.480,  .020, .044, .036,   7.0, 5.0),
        (.425,  .115, .036, .030,  14.0, 0.6),
        # Outer tapered blade & tip
        (.530, -.078, .039, .032,  -6.0, 3.1),
        (.600,  .030, .035, .029,   9.0, 1.9),
        (.555,  .105, .029, .024,  12.0, 4.8),
        (.655, -.050, .032, .026,  -5.0, 2.5),
        (.710,  .040, .026, .022,   8.0, 0.3),
        (.760, -.018, .023, .019,  -4.0, 3.9),
    ]
    cream_speckles_front = [
        (.018, -.105, .015, .013,  -6.0, 0.3),
        (.078,  .042, .016, .014,  12.0, 0.8),
        (.105, -.155, .018, .015, -18.0, 2.2),
        (.192, -.052, .020, .018,   6.0, 3.5),
        (.250, -.165, .019, .015, -14.0, 1.1),
        (.320, -.048, .022, .019,   8.0, 4.7),
        (.365,  .082, .019, .016,  14.0, 2.9),
        (.448, -.038, .022, .018,  -6.0, 0.5),
        (.500,  .082, .018, .015,  10.0, 3.8),
        (.575, -.022, .019, .016,  -5.0, 1.6),
        (.678, -.002, .016, .014,   7.0, 4.2),
    ]
    sage_fill = np.zeros((W, body_w), np.float32)
    sage_inner = np.zeros((W, body_w), np.float32)
    sage_halo = np.zeros((W, body_w), np.float32)
    cream_dots = np.zeros((W, body_w), np.float32)

    def _eval_organic_disc(u_coord, v_coord, u0, v0, ru, rv, rot_deg, phase):
        ang_r = math.radians(rot_deg)
        ca, sa = math.cos(ang_r), math.sin(ang_r)
        du = u_coord - u0
        dv = v_coord - v0
        ur = (du * ca + dv * sa) / ru
        vr = (-du * sa + dv * ca) / rv
        rr = np.hypot(ur, vr)
        ang = np.arctan2(vr, ur)
        return rr / (1.0 + .085 * np.cos(2.0 * ang + phase) + .050 * np.sin(3.0 * ang - 1.3 * phase))

    for s0, c0, rs, rc, rot_d, ph in sage_scales_front:
        r_org = _eval_organic_disc(s_fl, c_fl, s0, c0, rs, rc, rot_d, ph)
        f_i = 1.0 - smooth(.83, 1.03, r_org)
        h_i = np.exp(-(((r_org - 1.09) / .22) ** 2))
        in_i = (1.0 - smooth(.08, .80, r_org)) * f_i
        sage_fill = np.maximum(sage_fill, f_i)
        sage_inner = np.maximum(sage_inner, in_i)
        sage_halo = np.maximum(sage_halo, h_i)
    for s0, c0, rs, rc, rot_d, ph in cream_speckles_front:
        r_org = _eval_organic_disc(s_fl, c_fl, s0, c0, rs, rc, rot_d, ph)
        cream_dots = np.maximum(cream_dots, 1.0 - smooth(.78, 1.02, r_org))

    # Matching cohesive smaller cream-and-sage speckles on rear flippers (visible in quarter.png & side.png)
    rear_flip_vis = (
        smooth(.15, .23, ax_m)
        * smooth(.46, .56, my)
        * (1.0 - smooth(.31, .39, mz))
        * smooth(-.08, .25, nz_m)
        * (1.0 - shell_w)
    )
    sage_scales_rear = [
        (.28, .64, .034, .030,  15.0, 1.0),
        (.36, .72, .036, .032,  10.0, 2.7),
        (.43, .80, .030, .026,  18.0, 4.1),
        (.27, .76, .026, .024,  -8.0, 0.5),
    ]
    cream_speckles_rear = [
        (.33, .67, .016, .014,   8.0, 2.0),
        (.39, .76, .015, .013,  12.0, 3.6),
    ]
    r_sage_fill = np.zeros((W, body_w), np.float32)
    r_sage_inner = np.zeros((W, body_w), np.float32)
    r_sage_halo = np.zeros((W, body_w), np.float32)
    r_cream_dots = np.zeros((W, body_w), np.float32)
    for x0, y0, rx, ry, rot_d, ph in sage_scales_rear:
        r_org = _eval_organic_disc(ax_m, my, x0, y0, rx, ry, rot_d, ph)
        f_i = 1.0 - smooth(.83, 1.03, r_org)
        r_sage_fill = np.maximum(r_sage_fill, f_i)
        r_sage_inner = np.maximum(r_sage_inner, (1.0 - smooth(.08, .80, r_org)) * f_i)
        r_sage_halo = np.maximum(r_sage_halo, np.exp(-(((r_org - 1.09) / .22) ** 2)))
    for x0, y0, rx, ry, rot_d, ph in cream_speckles_rear:
        r_org = _eval_organic_disc(ax_m, my, x0, y0, rx, ry, rot_d, ph)
        r_cream_dots = np.maximum(r_cream_dots, 1.0 - smooth(.78, 1.02, r_org))

    all_sage = np.clip(np.maximum(sage_fill * front_flip_vis, r_sage_fill * rear_flip_vis), 0, 1)
    all_inner = np.clip(np.maximum(sage_inner * front_flip_vis, r_sage_inner * rear_flip_vis), 0, 1)
    all_halo = np.clip(np.maximum(sage_halo * front_flip_vis, r_sage_halo * rear_flip_vis) * (1.0 - all_sage), 0, 1)
    all_cream = np.clip(np.maximum(cream_dots * front_flip_vis, r_cream_dots * rear_flip_vis) * (1.0 - all_sage), 0, 1)

    # Warm coastal sea-sage scale tones + luminous vanilla-cream rim halos & inter-scale speckles
    sage_rim_col = np.array([116, 146, 100], np.float32) / 255.0
    sage_mid_col = np.array([148, 176, 126], np.float32) / 255.0
    speck_cream_col = np.array([255, 249, 226], np.float32) / 255.0
    sage_col = sage_rim_col + (sage_mid_col - sage_rim_col) * all_inner[..., None]
    recolored = recolored + (speck_cream_col - recolored) * np.clip(all_halo * .62 + all_cream * .82, 0, .86)[..., None]
    recolored = recolored + (sage_col - recolored) * (all_sage * .78)[..., None]

    recolored = recolored * (1.0 - shell_w[..., None]) + shell_col * shell_w[..., None]
    rgb[:, :body_w] = np.clip(recolored, 0, 1)

    # Repaint all 5 accessory patches (terracotta-coral satchel, cream-coral headband/scarf, amber-gold rims, sunlit amber lenses)
    paint_patches(rgb, sur, meta)

    # v32 Living Pixar/Hero-Shelly sunlit-amber eyes: un-mirrored upper-right world catchlight, rich upper-eyelid shadow,
    # warm pearl-cream sclera, Hero-Shelly vertical iris depth, feathered limbus & warm inward eye-contact convergence!
    def paint_mira_eye_v32(ex, ey, v_e, side_sgn, skin_rgb255):
        dark, bright, glow, _skin_fb = CE.PALETTES['mira']
        lash_tint = CE.LASH_TINTS['mira']
        skin_arr = np.broadcast_to(np.asarray(skin_rgb255, float), ex.shape + (3,))
        c255, r_e = CE.paint_living_eye(ex, ey, v_e, side_sgn, dark, bright, glow, skin_arr, lash_tint, gaze_in=.036)
        return np.clip(c255 / 255.0, 0.0, 1.0).astype(np.float32), r_e.astype(np.float32)

    eyes = []
    rough_map = np.full((W, W), -1.0, np.float32)
    for i in range(1, n + 1):
        ys, xs = np.where(lab == i)
        if len(ys) < 60: continue
        up = np.kron((lab == i).astype(np.uint8), np.ones((4, 4), np.uint8)).astype(bool)
        near = ndimage.binary_dilation(up, iterations=7)
        white = (col[..., :3].min(axis=-1) > .74) & near
        ap = ndimage.binary_fill_holes(ndimage.binary_closing(up | white, iterations=2))
        m_cov = ap & cover
        if not m_cov.any(): continue
        # Sample Mira's exact surrounding recolored golden-honey skin outside the enlarged eye zone
        ring = ndimage.binary_dilation(ap, iterations=18) & (~ndimage.binary_dilation(ap, iterations=10)) & cover
        if not ring.any():
            ring = ndimage.binary_dilation(ap, iterations=6) & (~ndimage.binary_dilation(ap, iterations=1)) & cover
        skin_rgb255 = tuple((rgb[ring].mean(axis=0) * 255.0).tolist()) if ring.any() else (238.0, 208.0, 132.0)

        pts_m = pos_m[m_cov]
        ns_m = nrm_m[m_cov]
        c3m = pts_m.mean(axis=0)
        n3m = ns_m.mean(axis=0)
        n3m /= max(1e-8, np.linalg.norm(n3m))
        is_outward = (c3m[0] * n3m[0]) > 0.0

        yy, xx = np.where(ap)
        if not is_outward:
            y0, y1 = max(0, yy.min() - 6), min(W, yy.max() + 7)
            x0, x1 = max(0, xx.min() - 6), min(W, xx.max() + 7)
            paint_mask = ndimage.binary_dilation(ap, iterations=2)[y0:y1, x0:x1]
            blk = rgb[y0:y1, x0:x1]
            blk[paint_mask] = np.array(skin_rgb255, np.float32) / 255.0
            rough_map[y0:y1, x0:x1][paint_mask] = .84
            continue

        # Build true 3D eye tangent basis (up3 = +Z perp to n3m, out_h = outboard/back, -out_h = forward/nasal)
        up3 = np.array([0.0, 0.0, 1.0], np.float32) - n3m * n3m[2]
        up3 /= max(1e-8, np.linalg.norm(up3))
        h3 = np.cross(up3, n3m)
        h3 /= max(1e-8, np.linalg.norm(h3))
        out_h = h3 if h3[1] > 0 else -h3

        # Shift gaze gently forward/nasal & upward for warm inward eye-contact convergence!
        side_sgn = 1.0 if c3m[0] > 0 else -1.0
        gaze_c = c3m - out_h * .018 + up3 * .004
        # Search across ALL of body_w in 3D morphed space (never clipped by separate UV islands!)
        cand_b = (
            (np.abs(pos_mb[..., 0] - gaze_c[0]) < .168)
            & (np.abs(pos_mb[..., 1] - gaze_c[1]) < .168)
            & (np.abs(pos_mb[..., 2] - gaze_c[2]) < .168)
            & (pos_mb[..., 0] * c3m[0] > .004)
        ) | ap[:, :body_w]
        cy_i, cx_i = np.where(cand_b)
        y0, y1 = max(0, int(cy_i.min()) - 6), min(W, int(cy_i.max()) + 7)
        x0, x1 = max(0, int(cx_i.min()) - 6), min(body_w, int(cx_i.max()) + 7)
        blk = rgb[y0:y1, x0:x1]

        sub_pm = pos_mb[y0:y1, x0:x1]
        sub_nm = nrm_mb[y0:y1, x0:x1]
        rel = sub_pm - gaze_c
        eh = rel @ out_h
        ez = rel @ up3
        en = rel @ n3m
        # v32: Preserves Mira's 1.43x enlarged eye aperture (0.815 * 0.132 = 0.1076) with full sculpted Pixar upper-lid fold!
        r_scale = .132
        ex = eh / r_scale
        ey = ez / r_scale
        v_eye = np.hypot(ex, ey)

        eye_rgb, eye_rough = paint_mira_eye_v32(ex, ey, np.minimum(v_eye, .998), side_sgn, skin_rgb255)
        # Apply cleanly across the front-facing 3D eye hemisphere & concave upper-lid crease (never leaving raw base white flecks!)
        same_side = (sub_pm[..., 0] * c3m[0] > 0.004) & ((sub_nm @ n3m) > -0.15) & (en > -0.095)
        in_eye = ((v_eye < 1.02) & same_side) | ap[y0:y1, x0:x1]
        w_soft = np.clip((1.0 - smooth(.88, 1.01, v_eye)) * same_side.astype(np.float32), 0.0, 1.0)
        w_soft = np.where(ap[y0:y1, x0:x1], 1.0, w_soft)
        w_soft = ndimage.gaussian_filter(w_soft, 1.0)
        w_soft = np.where(ap[y0:y1, x0:x1] | ((v_eye < .86) & same_side), 1.0, w_soft)

        blk[:] = blk * (1.0 - w_soft[..., None]) + eye_rgb * w_soft[..., None]
        rm_sub = rough_map[y0:y1, x0:x1]
        rm_sub[:] = np.where(w_soft > .05, np.where(rm_sub >= 0, rm_sub, .84) * (1.0 - w_soft) + eye_rough * w_soft, rm_sub)

        # Record enlarged aperture mask for cheek/brow exclusion
        enlarged_ap = np.zeros((W, W), bool)
        enlarged_ap[y0:y1, x0:x1] = in_eye & (v_eye < .94)
        enlarged_ap |= ap
        c3_unmorphed = pos[m_cov].mean(axis=0)
        cx, cy = (xx.min() + xx.max()) / 2, (yy.min() + yy.max()) / 2
        ax, az = (xx.max() - xx.min()) / 2 + 1.0, (yy.max() - yy.min()) / 2 + 1.0
        eyes.append({'center_px': (cx, cy), 'half_px': (ax, az), 'center3d': c3_unmorphed, 'center3d_m': c3m, 'out_h': out_h, 'up3': up3, 'ap': enlarged_ap})

    has_r = rough_map >= 0
    r_w = has_r.astype(np.float32).reshape(512, 4, 512, 4).mean(axis=(1, 3))
    r_val = np.where(has_r, rough_map, 0.0).reshape(512, 4, 512, 4).sum(axis=(1, 3)) / np.maximum(1e-6, has_r.reshape(512, 4, 512, 4).sum(axis=(1, 3)))
    g = sur[..., 1]; g[:] = g * (1.0 - r_w) + r_val * r_w

    # v28: Warm rosy coral-peach cheek blush + raised arched caramel brows framing the 1.43x enlarged eyes cleanly!
    eye_ap_all = np.zeros((W, W), bool)
    for e in eyes: eye_ap_all |= ndimage.binary_dilation(e['ap'], iterations=5)
    eye_ap_b = eye_ap_all[:, :body_w]
    blush_b = np.zeros((W, body_w), np.float32)
    brows_b = np.zeros((W, body_w), np.float32)
    for e in eyes:
        sgn = 1.0 if e['center3d_m'][0] > 0 else -1.0
        cheek_c = np.array([sgn * .136, -.908, .838], np.float32)
        d_ch = pos_mb - cheek_c
        el_d = np.sqrt((d_ch[..., 0] / .056) ** 2 + (d_ch[..., 1] / .058) ** 2 + (d_ch[..., 2] / .038) ** 2)
        blush_b = np.maximum(blush_b, np.exp(-(el_d ** 2)))
        rel_b = pos_mb - (e['center3d_m'] + e['up3'] * .114 - e['out_h'] * .010)
        bh = rel_b @ e['out_h']
        bz = rel_b @ e['up3']
        bn = np.abs(rel_b @ np.cross(e['out_h'], e['up3']))
        arch = bz + .016 * ((bh / .052) ** 2)
        b_mask = np.exp(-((bh / .048) ** 2 + (arch / .011) ** 2 + (bn / .045) ** 2))
        brows_b = np.maximum(brows_b, b_mask)
    blush_b *= (~eye_ap_b)
    blush_b = ndimage.gaussian_filter(blush_b, 1.8)
    rgb_b = rgb[:, :body_w]
    tint = np.array([250, 114, 96], np.float32) / 255.0
    rgb_b[:] = rgb_b + (tint - rgb_b) * (.78 * blush_b)[..., None]

    # Crisp, joyful warm-chestnut curved smile line + subtle warm lower-lip sculpt shading (100% seamless across UV midline!)
    pm_x, pm_y, pm_z = pos_mb[..., 0], pos_mb[..., 1], pos_mb[..., 2]
    front_face = (pm_y < -.85) & (nrm_mb[..., 1] < -.16) & (~eye_ap_b)
    smile_half_w = .126
    ax_s = np.abs(pm_x)
    u_s = np.clip(ax_s / smile_half_w, 0.0, 1.25)
    z_smile = .820 + .040 * (u_s ** 1.95)
    end_env = 1.0 - smooth(.82, 1.03, u_s)
    half_thick = .0068 * (1.0 - .28 * np.clip(u_s, 0, 1) ** 2)
    dz_s = pm_z - z_smile
    smile_core = np.exp(-((dz_s / half_thick) ** 2)) * end_env * front_face
    lip_shade = np.exp(-(((dz_s + .011) / .013) ** 2)) * (1.0 - smooth(.72, 1.0, u_s)) * front_face
    dimple = np.zeros((W, body_w), np.float32)
    for sgn in (-1.0, 1.0):
        dx_d = (pm_x - sgn * .124) / .0085
        dz_d = (pm_z - .862) / .0075
        dimple = np.maximum(dimple, np.exp(-(dx_d ** 2 + dz_d ** 2)) * front_face)

    lip_shade = ndimage.gaussian_filter(lip_shade, 1.6)
    smile_core = ndimage.gaussian_filter(smile_core, 0.85)
    dimple = ndimage.gaussian_filter(dimple, 0.85)
    lip_col = np.array([194, 130, 88], np.float32) / 255.0
    smile_col = np.array([96, 46, 22], np.float32) / 255.0
    rgb_b[:] = rgb_b + (lip_col - rgb_b) * (.28 * lip_shade)[..., None]
    rgb_b[:] = rgb_b + (smile_col - rgb_b) * np.clip(.95 * smile_core + .48 * dimple, 0, .96)[..., None]

    # Two subtle, 100% symmetrical warm-chestnut nostril dots cleanly on the smooth upper snout tip
    nostrils = np.zeros((W, body_w), np.float32)
    snout_front = (pm_y < -.90) & (nrm_mb[..., 1] < -.28) & (~eye_ap_b)
    for sgn in (-1.0, 1.0):
        dx_n = pm_x - sgn * .028
        dz_n = pm_z - .908
        ang_n = sgn * math.radians(16.0)
        ca_n, sa_n = math.cos(ang_n), math.sin(ang_n)
        rx_n = dx_n * ca_n + dz_n * sa_n
        rz_n = -dx_n * sa_n + dz_n * ca_n
        nostrils = np.maximum(nostrils, np.exp(-((rx_n / .0062) ** 2 + (rz_n / .0068) ** 2)) * snout_front)
    nostrils = ndimage.gaussian_filter(nostrils, 0.7)
    nostril_col = np.array([106, 56, 28], np.float32) / 255.0
    rgb_b[:] = rgb_b + (nostril_col - rgb_b) * (.82 * nostrils)[..., None]

    brows_b *= (~eye_ap_b)
    brows_b = ndimage.gaussian_filter(brows_b, 1.2)
    brow_tint = np.array([128, 72, 26], np.float32) / 255.0
    rgb_b[:] = rgb_b + (brow_tint - rgb_b) * (.54 * brows_b)[..., None]

    col[..., :3] = rgb
    info = [{'center_px': [float(e['center_px'][0]), float(e['center_px'][1])], 'half_px': [float(e['half_px'][0]), float(e['half_px'][1])]} for e in eyes]
    print('MIRA_V25_EYES', json.dumps(info), flush=True)
    return col, sur


def _build_accessories_v24(body_obj, rig, mat, patches, atlas_w, lod_scale=1):
    """M4 v24: Move explorer goggles cleanly UP onto Mira's upper forehead crown (100% unobstructed eyes, zero skin clipping!),
    keep sleek copper rims + pole-free sea-glass lenses, terracotta map satchel + scroll, and cozy cream-coral neck scarf."""
    parts = []
    # 1. Forehead Explorer Goggles seated snugly UP on upper forehead crown (100% unobstructed above 1.43x enlarged eyes!)
    brow_L_hint = mp.morph_mira(Vector((-0.092, -0.710, 1.055)))
    brow_R_hint = mp.morph_mira(Vector((0.092, -0.710, 1.055)))

    goggle_centers = []
    for side, hint in ((-1.0, brow_L_hint), (1.0, brow_R_hint)):
        surf_pt, surf_n = mp.snap_surface(body_obj, hint, offset=0.0)
        # Pitch ~37 deg upward-forward like classic explorer goggles pushed cleanly up onto the forehead crown
        forward = Vector((side * 0.16, -0.79, 0.59)).normalized()
        right = forward.cross(Vector((0.0, 0.0, 1.0))).normalized()
        up = right.cross(forward).normalized()
        # Seat bottom outer rim flush against the upper crown (zero floating air gap, zero forehead clipping, 100% above eyes!)
        center = surf_pt + surf_n * 0.048 + forward * 0.015
        goggle_centers.append((center, forward, right, up))

        R = 0.064
        rt = 0.013

        def rim_pt(u, v, c=center, f=forward, r=right, upv=up, R=R, rt=rt):
            a = math.tau * u
            b = math.tau * v
            ring_p = r * (math.cos(a) * (R + rt * math.cos(b))) + upv * (math.sin(a) * (R + rt * math.cos(b)))
            return c + ring_p + f * (rt * math.sin(b) + 0.004)

        parts.append(mp.make_patch_part(
            f"GoggleRim_{side}",
            mp.build_grid_mesh(f"GoggleRim_{side}", rim_pt, 20 * lod_scale, 8 * lod_scale, wrap_u=True, wrap_v=True),
            patches["copper"], atlas_w, rig, mat, "Head",
        ))

        # Smooth pole-free planar-UV convex sea-glass lens tucked cleanly inside the copper torus rim
        def lens_pt(u, v, c=center, f=forward, r=right, upv=up, R=R):
            sx = 2.0 * u - 1.0
            sy = 2.0 * v - 1.0
            dx = sx * math.sqrt(max(0.0, 1.0 - 0.5 * sy * sy))
            dy = sy * math.sqrt(max(0.0, 1.0 - 0.5 * sx * sx))
            r2 = dx * dx + dy * dy
            rho = R * 0.90
            return c + r * (rho * dx) + upv * (rho * dy) + f * (0.002 + 0.015 * max(0.0, 1.0 - r2))

        parts.append(mp.make_patch_part(
            f"GoggleLens_{side}",
            mp.build_grid_mesh(f"GoggleLens_{side}", lens_pt, 10 * lod_scale, 10 * lod_scale, wrap_u=False, wrap_v=False),
            patches["lens"], atlas_w, rig, mat, "Head",
        ))

    # Burnished copper nose bridge connecting the inner edges of the raised forehead rims (cleanly clear of aqua lenses)
    pL, fL, rL, uL = goggle_centers[0]
    pR, fR, rR, uR = goggle_centers[1]
    brL = pL + rL * 0.067 + fL * 0.005
    brR = pR - rR * 0.067 + fR * 0.005
    brM = 0.5 * (brL + brR) + (fL + fR).normalized() * 0.008

    def bridge_fn(u, v):
        t = u
        p = ((1 - t) ** 2) * brL + 2 * (1 - t) * t * brM + (t ** 2) * brR
        ang_s = math.tau * v
        return p + Vector((0.0, math.cos(ang_s) * 0.009, math.sin(ang_s) * 0.009))

    parts.append(mp.make_patch_part(
        "GoggleBridge",
        mp.build_grid_mesh("GoggleBridge", bridge_fn, 8, 6, wrap_u=False, wrap_v=True),
        patches["copper"], atlas_w, rig, mat, "Head",
    ))

    # Smooth kink-free head strap wrapping from outer rim temple mounts around the back crown well ABOVE the eyes!
    head_mid = mp.morph_mira(Vector((0.0, -0.66, 0.92)))
    end_R = pR + rR * 0.070 - uR * 0.014 - fR * 0.008
    end_L = pL - rL * 0.070 - uL * 0.014 - fL * 0.008
    raw_strap = [end_R]
    for k in range(1, 18):
        t = k / 18.0
        ang = (0.50 - 1.00 * t) * math.pi  # +0.50*pi (+X temple) -> 0 (+Y back crown) -> -0.50*pi (-X temple)
        # Descend smoothly from the upper rim mount height around the back of the skull (zero temple bump/hook!)
        z_arc = 1.032 - 0.055 * (math.cos(ang) ** 1.4)
        probe = mp.morph_mira(Vector((0.25 * math.sin(ang), -0.66 + 0.25 * math.cos(ang), z_arc)))
        sp, _ = mp.snap_surface(body_obj, probe, offset=0.006)
        raw_strap.append(sp)
    raw_strap.append(end_L)
    # C2 relaxation along interior strap points while preserving outward skull clearance
    strap_pts = [p.copy() for p in raw_strap]
    for _ in range(4):
        nxt = [strap_pts[0]]
        for k in range(1, len(strap_pts) - 1):
            avg = strap_pts[k - 1] * 0.25 + strap_pts[k] * 0.50 + strap_pts[k + 1] * 0.25
            d_raw = raw_strap[k] - head_mid
            d_avg = avg - head_mid
            if d_avg.length < d_raw.length:
                avg = head_mid + d_avg.normalized() * d_raw.length
            nxt.append(avg)
        nxt.append(strap_pts[-1])
        strap_pts = nxt

    def strap_fn(u, v):
        idx_f = min(len(strap_pts) - 1.0001, u * (len(strap_pts) - 1))
        i = int(idx_f)
        f = idx_f - i
        p = strap_pts[i].lerp(strap_pts[i + 1], f)
        t_dir = (strap_pts[min(i + 1, len(strap_pts) - 1)] - strap_pts[max(i - 1, 0)]).normalized()
        out_n = (p - head_mid).normalized()
        up_w = out_n.cross(t_dir).normalized()
        ang_s = math.tau * v
        return p + up_w * (0.013 * math.cos(ang_s)) + out_n * (0.006 * math.sin(ang_s))

    parts.append(mp.make_patch_part(
        "GoggleStrap",
        mp.build_grid_mesh("GoggleStrap", strap_fn, 24 * lod_scale, 6 * lod_scale, wrap_u=False, wrap_v=True),
        patches["strap_teal"], atlas_w, rig, mat, "Head",
    ))

    # 2. Coral Map Satchel + Scroll clearly perched on upper right carapace shoulder/flank (visible in 3/4 view)
    sat_hint = mp.morph_mira(Vector((0.43, -0.04, 0.50)))
    sat_c, sat_n = mp.snap_surface(body_obj, sat_hint, offset=0.052)
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
    parts.append(mp.make_patch_part("MapSatchel", bag, patches["coral_canvas"], atlas_w, rig, mat, "Body"))

    scr_c = sat_c + sat_up * 0.088 - sat_side * 0.006
    bpy.ops.mesh.primitive_cylinder_add(vertices=14 * lod_scale, radius=0.040, depth=0.205, location=(0, 0, 0))
    scr = bpy.context.object
    scr.rotation_euler = (math.pi * 0.5, 0.0, 0.0)
    bpy.ops.object.transform_apply(location=False, rotation=True, scale=True)
    scr.matrix_world = Matrix.Translation(scr_c) @ rot_m
    parts.append(mp.make_patch_part("MapScroll", scr, patches["scroll_cream"], atlas_w, rig, mat, "Body"))

    # v35 D2 MIN: Seat Mira's coral messenger-bag strap cleanly OVER the upper shoulder & carapace contour
    # (strictly hugging the outer convex upper shell dome z >= 0.52 with true local outward surface normals —
    # NEVER plunging downward into the left flipper root or carapace overhang!).
    def _catmull_closed(pts, sub=4):
        n_p = len(pts)
        out = []
        for i in range(n_p):
            p0, p1, p2, p3 = pts[(i - 1) % n_p], pts[i], pts[(i + 1) % n_p], pts[(i + 2) % n_p]
            for k in range(sub):
                t = k / float(sub)
                t2, t3 = t * t, t * t * t
                q = 0.5 * (
                    (2.0 * p1)
                    + (-p0 + p2) * t
                    + (2.0 * p0 - 5.0 * p1 + 4.0 * p2 - p3) * t2
                    + (-p0 + 3.0 * p1 - 3.0 * p2 + p3) * t3
                )
                out.append(q)
        return out

    strap_anchors = [
        sat_c + sat_up * 0.044 - sat_side * 0.015 + sat_fwd * 0.052,   # front-top satchel mount (+X, forward)
        mp.morph_mira(Vector(( 0.34, -0.14, 0.64))),                   # right upper carapace shoulder contour
        mp.morph_mira(Vector(( 0.21, -0.24, 0.69))),                   # right-front carapace collar
        mp.morph_mira(Vector(( 0.00, -0.27, 0.71))),                   # center nape / front carapace collar behind neck
        mp.morph_mira(Vector((-0.21, -0.24, 0.69))),                   # left-front carapace collar (cleanly OVER shoulder)
        mp.morph_mira(Vector((-0.36, -0.13, 0.63))),                   # left upper shoulder contour (smooth & high above flipper root!)
        mp.morph_mira(Vector((-0.46,  0.06, 0.58))),                   # left outer-upper carapace flank
        mp.morph_mira(Vector((-0.42,  0.28, 0.58))),                   # left rear-upper carapace flank
        mp.morph_mira(Vector((-0.20,  0.50, 0.60))),                   # rear-left outer carapace dome
        mp.morph_mira(Vector(( 0.20,  0.50, 0.60))),                   # rear-right outer carapace dome
        mp.morph_mira(Vector(( 0.42,  0.26, 0.58))),                   # right rear-upper carapace flank
        sat_c + sat_up * 0.036 - sat_side * 0.015 - sat_fwd * 0.054,   # rear-top satchel mount (+X, rear)
    ]
    shell_ctr = Vector((0.0, 0.08, 0.34))

    def _ray_outer_carapace(probe):
        """Single continuous outside-in radial raycast onto the outer convex carapace dome (zero branch discontinuity,
        zero dipping into shell or flipper root!)."""
        d_out = probe - shell_ctr
        if d_out.length < 1e-4:
            d_out = Vector((0.0, 0.0, 1.0))
        d_out.normalize()
        # Start just outside the carapace dome (dist=0.30 along d_out) so front collar rays never clip the back of the head!
        origin = probe + d_out * 0.30
        ok, loc, nrm, _ = body_obj.ray_cast(origin, -d_out)
        if ok and nrm.dot(d_out) > 0.15 and loc.z > 0.44:
            return loc, nrm.normalized()
        ok2, loc2, nrm2, _ = body_obj.ray_cast(shell_ctr + d_out * 1.6, -d_out)
        if ok2 and nrm2.dot(d_out) > 0.10 and loc2.z > 0.44:
            return loc2, nrm2.normalized()
        sp, sn = mp.snap_surface(body_obj, probe, offset=0.0)
        if sn.dot(d_out) < 0.0:
            sn = d_out
        return sp, sn.normalized()

    dense_probes = _catmull_closed(strap_anchors, sub=4)
    bag_strap_pts = []
    bag_strap_nrms = []
    for pr in dense_probes:
        sp, sn = _ray_outer_carapace(pr)
        bag_strap_pts.append(sp + sn * 0.010)
        bag_strap_nrms.append(sn)
    # 6 passes of C2 Laplacian smoothing re-projected along the single smooth radial field -> silky kink-free curve!
    n_sp = len(bag_strap_pts)
    for _ in range(6):
        nxt_p, nxt_n = [], []
        for k in range(n_sp):
            avg_p = bag_strap_pts[(k - 1) % n_sp] * 0.25 + bag_strap_pts[k] * 0.50 + bag_strap_pts[(k + 1) % n_sp] * 0.25
            avg_n = (bag_strap_nrms[(k - 1) % n_sp] * 0.25 + bag_strap_nrms[k] * 0.50 + bag_strap_nrms[(k + 1) % n_sp] * 0.25).normalized()
            sp, sn = _ray_outer_carapace(avg_p)
            sn = (sn * 0.60 + avg_n * 0.40).normalized()
            nxt_p.append(sp + sn * 0.010)
            nxt_n.append(sn)
        bag_strap_pts, bag_strap_nrms = nxt_p, nxt_n
    print(
        f'MIRA_V35_STRAP_AUDIT n={n_sp} z_min={min(p.z for p in bag_strap_pts):.3f} '
        f'z_max={max(p.z for p in bag_strap_pts):.3f} min_nz={min(n.z for n in bag_strap_nrms):.2f}',
        flush=True,
    )

    def bag_strap_fn(u, v):
        idx_f = (u % 1.0) * n_sp
        i = int(idx_f) % n_sp
        f = idx_f - int(idx_f)
        p = bag_strap_pts[i].lerp(bag_strap_pts[(i + 1) % n_sp], f)
        out_n = bag_strap_nrms[i].lerp(bag_strap_nrms[(i + 1) % n_sp], f).normalized()
        t_dir = (bag_strap_pts[(i + 1) % n_sp] - bag_strap_pts[(i - 1) % n_sp]).normalized()
        w_dir = out_n.cross(t_dir).normalized()
        ang_s = math.tau * v
        return p + w_dir * (0.019 * math.cos(ang_s)) + out_n * (0.0072 * math.sin(ang_s))

    parts.append(mp.make_patch_part(
        "SatchelStrap",
        mp.build_grid_mesh("SatchelStrap", bag_strap_fn, 36 * lod_scale, 6 * lod_scale, wrap_u=True, wrap_v=True),
        patches["strap_teal"], atlas_w, rig, mat, "Body",
    ))

    # 3. Cozy smooth cream-coral storyteller neck scarf hugging Mira's cylindrical mid-neck
    neck_mid = mp.morph_mira(Vector((0.0, -0.54, 0.655)))
    raw_pts = []
    n_ring = 28
    for k in range(n_ring):
        ang = math.tau * k / n_ring
        probe = neck_mid + Vector((0.20 * math.sin(ang), -0.19 * math.cos(ang), -0.025 * math.cos(ang)))
        sp, _ = mp.snap_surface(body_obj, probe, offset=0.008)
        raw_pts.append(sp)
    ring_pts = [p.copy() for p in raw_pts]
    for _ in range(5):
        nxt = []
        for k in range(n_ring):
            avg = ring_pts[(k - 1) % n_ring] * 0.25 + ring_pts[k] * 0.50 + ring_pts[(k + 1) % n_ring] * 0.25
            d_raw = (raw_pts[k] - neck_mid)
            d_avg = (avg - neck_mid)
            if d_avg.length < d_raw.length:
                avg = neck_mid + d_avg.normalized() * d_raw.length
            nxt.append(avg)
        ring_pts = nxt

    def scarf_fn(u, v):
        idx_f = (u % 1.0) * n_ring
        i = int(idx_f) % n_ring
        f = idx_f - int(idx_f)
        p = ring_pts[i].lerp(ring_pts[(i + 1) % n_ring], f)
        t_dir = (ring_pts[(i + 1) % n_ring] - ring_pts[(i - 1) % n_ring]).normalized()
        out_n = (p - neck_mid).normalized()
        up_w = out_n.cross(t_dir).normalized()
        if up_w.z < 0:
            up_w = -up_w
        ang_s = math.tau * v
        return p + up_w * (0.050 * math.cos(ang_s)) + out_n * (0.027 * math.sin(ang_s) + 0.013)

    parts.append(mp.make_patch_part(
        'StorytellerScarf',
        mp.build_grid_mesh('StorytellerScarf', scarf_fn, 28 * lod_scale, 8 * lod_scale, wrap_u=True, wrap_v=True),
        patches['strap_teal'], atlas_w, rig, mat, 'Neck',
    ))

    knot_anchor = ring_pts[n_ring - 3]
    out_k = (knot_anchor - neck_mid).normalized()
    knot_c = knot_anchor + out_k * 0.028 + Vector((0.0, 0.0, -0.012))
    bpy.ops.mesh.primitive_uv_sphere_add(segments=12, ring_count=8, radius=0.042, location=knot_c)
    knot = bpy.context.object
    knot.scale = (1.10, 0.85, 0.92)
    parts.append(mp.make_patch_part('ScarfKnot', knot, patches['strap_teal'], atlas_w, rig, mat, 'Neck'))

    tail_base = knot_c + Vector((-0.015, -0.008, -0.018))
    def tail_fn(u, v):
        ang = math.tau * u
        c = tail_base + Vector((-0.042 * v, -0.022 * v + 0.018 * (v ** 2), -0.115 * v))
        w = (0.024 + 0.030 * v) * math.sqrt(max(0.0, 1.0 - (v ** 6.0)))
        th = 0.012 * math.sqrt(max(0.0, 1.0 - (v ** 5.0)))
        return c + Vector((w * math.cos(ang), th * math.sin(ang), 0.0))

    parts.append(mp.make_patch_part(
        'ScarfTail',
        mp.build_grid_mesh('ScarfTail', tail_fn, 10, 6, wrap_u=True, wrap_v=False),
        patches['strap_teal'], atlas_w, rig, mat, 'Neck',
    ))
    return parts


mp.build_accessories = _build_accessories_v24


def main():
    meta = json.loads((MP_DIR / 'atlas-patches.json').read_text())
    mod = mp.load_rig2(); mod.clear_scene()
    arm, hat, mouth = mod.setup_rig_from_canonical()
    for anc in (hat, mouth): bpy.data.objects.remove(anc, do_unlink=True)
    bpy.context.view_layer.objects.active = arm; bpy.ops.object.mode_set(mode='EDIT')
    for eb in arm.data.edit_bones:
        eb.head = mp.morph_mira(eb.head); eb.tail = mp.morph_mira(eb.tail)
    bpy.ops.object.mode_set(mode='OBJECT')
    mp.build_resident_clips(arm)
    src = mod.prepare_welded_source()
    smooth_muzzle_source(src)
    enlarge_mira_eyes_source(src)
    col, sur = polish(MP_DIR / 'color-2048.jpg', MP_DIR / 'surface-512.png', src, meta)
    write_img(OUT / 'color-2048.jpg', col, 'JPEG', 88)
    write_img(OUT / 'surface-512.png', sur, 'PNG', noncolor=True)

    def down(a, n):
        im = bpy.data.images.new('tmp', width=a.shape[1], height=a.shape[0], alpha=False)
        out = np.ones(a.shape, np.float32); out[..., :3] = a[..., :3]; im.pixels = out.ravel(); im.scale(n, n)
        r = np.array(im.pixels[:], np.float32).reshape(n, n, 4); bpy.data.images.remove(im); return r

    write_img(OUT / 'color-768.jpg', down(col, 768), 'JPEG', 85)
    write_img(OUT / 'surface-256.png', down(sur, 256), 'PNG', noncolor=True)
    mp.export_mira_lod(mod, arm, src, meta, target_tris=args.board_tris, max_tris=args.board_max, color_path=OUT / 'color-768.jpg', surface_path=OUT / 'surface-256.png', out_path=OUT / 'mira-board.glb', lod_scale=1)
    mp.export_mira_lod(mod, arm, src, meta, target_tris=args.close_tris, max_tris=args.close_max, color_path=OUT / 'color-2048.jpg', surface_path=OUT / 'surface-512.png', out_path=OUT / 'mira-close.glb', lod_scale=1)
    for n in ('mira-board.glb', 'mira-close.glb'):
        print('MIRA_V22_SIZE', n, (OUT / n).stat().st_size, flush=True)


main()
