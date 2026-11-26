"""Author two Shelly-grade Mario-Party-8 Kiko companions: Mochi (pastel-coral mochi crab) & Hermit (lavender-shell hermit crab).
Faces look along -Y; Z is up. Single skinned mesh, single opaque atlas, 76%-iris conforming eyes via conforming_eye.py.
Usage:
  python tools/art/build_kiko_cast.py -- --character mochi --output ../work/cast-upgrade/v22/kiko-mochi
  python tools/art/build_kiko_cast.py -- --character hermit --output ../work/cast-upgrade/v22/kiko-hermit
"""
import argparse, importlib.util, json, math, struct, sys, zlib
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, Quaternion

_ce_spec = importlib.util.spec_from_file_location('conforming_eye', str(Path(__file__).with_name('conforming_eye.py')))
CE = importlib.util.module_from_spec(_ce_spec); _ce_spec.loader.exec_module(CE)

T = math.tau
Z = Vector((0, 0, 1))
TILES = {
    'skin': (0, 0, 512, 1024),
    'eye_l': (512, 0, 256, 128),
    'eye_r': (512, 128, 256, 128),
    'shell': (512, 256, 512, 384),
    'limb': (512, 640, 256, 384),
    'claw': (768, 640, 256, 384),
    'dark': (768, 0, 128, 128),
    'gold': (896, 0, 128, 128),
    'underside': (768, 128, 256, 128),
}


def _pad(w, h):
    return min(16, min(w, h) // 10)


def uv(tile, u, v):
    x, y, w, h = TILES[tile]
    p = _pad(w, h)
    return ((x + p + u * (w - 2 * p)) / 1024, (y + p + v * (h - 2 * p)) / 1024)


def mix(a, b, t):
    return np.asarray(a, float) + (np.asarray(b, float) - np.asarray(a, float)) * np.asarray(t, float)[..., None]


def paint_over(a, c, t):
    return a + (np.asarray(c, float) - a) * np.clip(t, 0, 1)[..., None]


def smooth_w(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def curve(points, t):
    q = max(0.0, min(len(points) - 1.000001, t))
    i = int(q)
    u = q - i
    a, b, c, d = (points[max(0, i - 1)], points[i], points[i + 1], points[min(i + 2, len(points) - 1)])
    return tuple(
        b0 + .5 * u * ((c0 - a0) + u * ((2 * a0 - 5 * b0 + 4 * c0 - d0) + u * (3 * b0 - 3 * c0 + d0 - a0)))
        for a0, b0, c0, d0 in zip(a, b, c, d)
    )


def png(path, a):
    def chunk(n, p):
        return struct.pack('>I', len(p)) + n + p + struct.pack('>I', zlib.crc32(n + p))
    h, w, _ = a.shape
    d = a.copy()
    d[:, 1:] -= a[:, :-1]
    path.write_bytes(
        b'\x89PNG\r\n\x1a\n'
        + chunk(b'IHDR', struct.pack('>IIBBBBB', w, h, 8, 2, 0, 0, 0))
        + chunk(b'IDAT', zlib.compress(b''.join(b'\1' + r.tobytes() for r in d[::-1]), 8))
        + chunk(b'IEND', b'')
    )


def paint_tile(kind, name, u, v):
    char = f'kiko-{kind}'
    a = T * u
    # Ultra-smooth periodic velvet shade (ZERO speckle noise, ZERO high-frequency grain!)
    soft_n = .5 * np.sin(3 * a + 7 * v) + .5 * np.cos(5 * a - 9 * v)
    zero = np.zeros_like(u)
    rough = np.full_like(u, .82)
    metal = zero

    if name in ('eye', 'eye_l', 'eye_r'):
        rgb, rough = CE.paint_eye(char, u, v, side=(-1 if name == 'eye_l' else 1))
    elif name == 'skin':
        side = np.abs((u + .5) % 1 - .5)
        pm = .52 * np.sin(3 * a + 11 * v + .8 * np.sin(5 * v)) + .32 * np.sin(7 * a - 23 * v) + .16 * np.cos(13 * a + 41 * v)
        if kind == 'mochi':
            # v41 MIN-2: Warm painterly coral-peach organic mottling & glowing rosy cheek blush (NO flat unmottled pink & ZERO pole pinch!)
            pole_fade = np.clip((v - .03) / .16, 0, 1)
            pole_fade = pole_fade * pole_fade * (3.0 - 2.0 * pole_fade)
            pm_p = pm * pole_fade
            rgb = mix((226, 98, 78), (254, 186, 150), .30 + .34 * np.sin(math.pi * v) + .12 * (1.0 - v) + .080 * pm_p)
            # Clear face window right around the iconic round starry eyes so mottling enriches crown, back & flanks without muddying face
            eye_clear = np.exp(-(((side - .063) / .055) ** 2 + ((v - .420) / .115) ** 2))
            mottle_mask = (1.0 - .78 * eye_clear) * np.clip((.68 - v) * 4.5, 0, 1) * pole_fade
            # Painterly warm cream-apricot dappled highlights + deeper coral-terracotta organic shell mottling
            dapple_hi = np.clip((pm - .08) * 1.6, 0, 1)
            dapple_lo = np.clip((-pm - .10) * 1.5, 0, 1)
            rgb = paint_over(rgb, (255, 214, 174), dapple_hi * mottle_mask * .42)
            rgb = paint_over(rgb, (206, 84, 68), dapple_lo * mottle_mask * .34)
            # Delicate organic coral-apricot shell spots across upper dorsal dome & rear flanks
            spots = (
                np.exp(-((((u * 9.0) % 1.0) - .5) / .20) ** 2 - ((((v * 11.0) % 1.0) - .5) / .20) ** 2)
                * (.5 + .5 * np.sin(u * 47.0 + v * 31.0)) ** 2
                * np.clip((.56 - v) * 4.0, 0, 1)
                * pole_fade
                * (1.0 - .85 * eye_clear)
            )
            rgb = paint_over(rgb, (255, 226, 192), spots * .38)
            # Warm sunlit apricot-peach face centerpiece between eyes & smile
            sun_face = np.clip((.58 - v) * 2.4, 0, 1) * np.clip((.16 - side) * 6.0, 0, 1)
            rgb = paint_over(rgb, (255, 206, 176), sun_face * .34)
            belly = np.clip((v - .66) * 4.2, 0, 1)
            rgb = paint_over(rgb, (255, 234, 210), belly * .92)
            # Soft baked lower-flank leg-socket crease AO
            flank_ao = np.exp(-(((v - .66) / .055) ** 2)) * np.clip((side - .18) * 5.0, 0, 1)
            rgb = paint_over(rgb, (194, 86, 74), flank_ao * .30)
            # Soft arched warm coral-berry brows aligned cleanly right ABOVE mochi_eye (side ~ 0.063, v ~ 0.29)
            brow_v = .288 + .014 * ((side - .066) / .034) ** 2
            brow = np.exp(-(((side - .066) / .032) ** 2 + ((v - brow_v) / .013) ** 2))
            rgb = paint_over(rgb, (156, 54, 56), brow * .54)
            # Warm glowing rosy coral-pink cheek blush aligned RIGHT below & outboard of the starry eyes (visible in front & quarter!)
            cheek = np.exp(-(((side - .104) / .038) ** 2 + ((v - .512) / .042) ** 2))
            cheek_core = np.exp(-(((side - .104) / .022) ** 2 + ((v - .512) / .024) ** 2))
            rgb = paint_over(rgb, (246, 86, 108), cheek * .78)
            rgb = paint_over(rgb, (255, 134, 148), cheek_core * .36)
            rough = np.full_like(u, .88)
        else:
            # v40: Velvety sunlit coral-peach hermit-crab head & thorax with painterly organic mottling & shell-collar AO!
            rgb = mix((244, 160, 146), (255, 226, 208), .46 + .38 * np.sin(math.pi * v) + .032 * pm)
            sun_crown = np.clip((.58 - v) * 2.6, 0, 1) * np.clip((.28 - side) * 4.2, 0, 1)
            rgb = paint_over(rgb, (255, 236, 222), sun_crown * .44)
            belly = np.clip((v - .64) * 3.2, 0, 1)
            rgb = paint_over(rgb, (255, 236, 218), belly * .68)
            rear_ao = np.clip((side - .34) * 5.0, 0, 1) * .24
            rgb = paint_over(rgb, (214, 128, 118), rear_ao)
            brow_v = .218 + .010 * ((side - .094) / .042) ** 2
            brow = np.exp(-(((side - .094) / .036) ** 2 + ((v - brow_v) / .014) ** 2))
            rgb = paint_over(rgb, (222, 146, 138), brow * .22)
            cheek = np.exp(-(((side - .158) / .052) ** 2 + ((v - .565) / .028) ** 2))
            rgb = paint_over(rgb, (250, 108, 134), cheek * .82)
            rough = np.full_like(u, .88)
    elif name == 'shell':
        # v39 MIN-13: Pixar pearly-lavender & wisteria coiled gastropod shell with DISTINCT mother-of-pearl rolled lip & warm sunlit interior collar!
        #   v in [0.00, 0.84): Coiled 3D spiral shell body synced 1:1 with 3.2 helical whorls + soft suture AO
        #   v in [0.84, 0.93): Clearly sculpted, luminous warm champagne-ivory & rose-pearl rolled mother-of-pearl aperture lip with soft lilac crease separation
        #   v in [0.93, 1.00]: Warm softly shaded cream-peach-rose mother-of-pearl interior collar (NEVER dark brown/black void!)
        vs = np.clip(v / .84, 0.0, 1.0)
        phi = 3.2 * (vs ** .78) + u
        wf = phi % 1.0
        suture_d = np.minimum(wf, 1.0 - wf)
        suture_ao = np.exp(-((suture_d / .075) ** 2)) * np.clip(vs / .10, 0.0, 1.0) * np.clip((.96 - vs) / .10, 0.0, 1.0)
        whorl_hi = np.sin(math.pi * wf)
        pearl_col = mix((232, 220, 246), (250, 242, 255), .42 + .34 * whorl_hi + .14 * vs + .012 * soft_n)
        wist_t = np.clip((wf - .16) / .10, 0.0, 1.0) * (1.0 - np.clip((wf - .64) / .10, 0.0, 1.0))
        wist_t = wist_t * wist_t * (3.0 - 2.0 * wist_t)
        wist_col = mix((150, 118, 210), (202, 176, 242), .36 + .44 * whorl_hi + .012 * soft_n)
        shell_rgb = pearl_col * (1.0 - wist_t[..., None] * .86) + wist_col * (wist_t[..., None] * .86)
        # Delicate warm rose-peach nacre pinstripe accent gliding along each spiral coil
        rose_pin = np.exp(-(((wf - .74) / .038) ** 2)) * np.clip((vs - .12) / .16, 0.0, 1.0)
        shell_rgb = paint_over(shell_rgb, (244, 198, 214), rose_pin * .60)
        # Soft amethyst ambient occlusion nestled cleanly inside each 3D helical whorl suture
        shell_rgb = paint_over(shell_rgb, (108, 78, 158), suture_ao * .56)
        # Subtle wisteria-amethyst shadow accent right where the outer shell meets the rolled mother-of-pearl lip (v ~ 0.82..0.85)
        shell_rgb = paint_over(shell_rgb, (124, 92, 172), np.exp(-(((v - .840) / .018) ** 2)) * .62)
        # Sculpted iridescent champagne-ivory & warm rose mother-of-pearl rolled aperture lip (distinct warm nacre contrasting against cool lavender whorls!)
        lip_t = np.clip((v - .842) / .088, 0.0, 1.0)
        lip_irid = .5 + .5 * np.sin(T * u * 2.0 + math.pi * lip_t)
        lip_rgb = mix((255, 238, 212), (255, 224, 226), .28 + .42 * lip_irid + .012 * soft_n)
        # Gleaming sunlit mother-of-pearl specular ridge along the rolled lip crown + delicate warm gold-pearl accent
        lip_rgb = paint_over(lip_rgb, (255, 252, 240), np.exp(-(((lip_t - .46) / .22) ** 2)) * .78)
        # Soft tucked groove shadow right at the outer seam of the rolled lip so the lip rim reads crisply in front, quarter & side!
        lip_rgb = paint_over(lip_rgb, (148, 114, 176), np.exp(-((lip_t / .12) ** 2)) * .58)
        # Warm softly shaded cream-peach-rose mother-of-pearl interior collar (warm sunlit pearl at opening -> cozy warm peach-mauve deeper inside; ZERO dark void!)
        in_t = np.clip((v - .930) / .070, 0.0, 1.0)
        in_smooth = in_t * in_t * (3.0 - 2.0 * in_t)
        in_rgb = mix((255, 234, 216), (206, 156, 158), np.clip(in_smooth ** .88, 0.0, 1.0))
        in_rgb = paint_over(in_rgb, (255, 244, 228), np.exp(-((in_t / .28) ** 2)) * .60)
        is_lip = np.clip((v - .836) / .010, 0.0, 1.0)
        is_in = np.clip((v - .926) / .008, 0.0, 1.0)
        rgb = shell_rgb * (1.0 - is_lip[..., None]) + lip_rgb * is_lip[..., None]
        rgb = rgb * (1.0 - is_in[..., None]) + in_rgb * is_in[..., None]
        rough = np.where(v >= .93, .46 + .18 * in_t, np.where(v >= .84, .30, .56))
    elif name in ('limb', 'claw'):
        if kind == 'mochi':
            pm_l = .55 * np.sin(3 * a + 9 * v) + .45 * np.cos(7 * a - 17 * v)
            if name == 'limb':
                # v41 MIN-2: Silky warm coral-peach mottled mochi leg gradient (ZERO harsh joint-ring stripes!) -> creamy apricot toe!
                rgb = mix((228, 106, 86), (254, 192, 160), .28 + .54 * v + .055 * pm_l)
                rgb = paint_over(rgb, (196, 84, 70), np.exp(-((v / .10) ** 2)) * .28)
                rgb = paint_over(rgb, (255, 234, 212), np.clip((v - .76) / .22, 0, 1) * .78)
                rough = np.full_like(u, .88)
            else:
                # Matched warm painterly coral-peach claw shading (seamless wrist transition into curved apricot-cream pincer tips!)
                rgb = mix((228, 110, 90), (254, 194, 162), .30 + .52 * v + .055 * pm_l)
                rgb = paint_over(rgb, (255, 224, 196), np.clip((v - .66) / .32, 0, 1) * .58)
                rough = np.full_like(u, .88)
        else:
            if name == 'limb':
                rgb = mix((242, 154, 138), (255, 216, 198), .30 + .54 * v + .012 * soft_n)
                rgb = paint_over(rgb, (216, 124, 112), np.exp(-((v / .10) ** 2)) * .28)
                joint_k = np.exp(-(((v - .42) / .034) ** 2)) + np.exp(-(((v - .73) / .030) ** 2))
                rgb = paint_over(rgb, (230, 138, 126), np.clip(joint_k, 0, 1) * .26)
                rgb = paint_over(rgb, (255, 238, 220), np.clip((v - .75) / .22, 0, 1) * .74)
                rough = np.full_like(u, .88)
            else:
                rgb = mix((242, 156, 142), (255, 218, 200), .34 + .52 * v + .012 * soft_n)
                rgb = paint_over(rgb, (255, 238, 220), np.clip((v - .74) / .24, 0, 1) * .58)
                rough = np.full_like(u, .88)
    elif name == 'underside':
        rgb = mix((248, 224, 202), (255, 244, 228), .45 + .35 * v + .01 * soft_n)
        rough = np.full_like(u, .90)
    elif name == 'gold':
        # Warm gleaming amber-gold wire glasses for Kiko Hermit
        rgb = mix((204, 140, 42), (255, 214, 102), .52 + .28 * v + .015 * soft_n)
        rough = np.full_like(u, .28)
        metal = np.full_like(u, .42)
    else:  # dark (smile & inner shell throat)
        rgb = mix((42, 26, 38), (74, 48, 62), .22 + .35 * v)
        rough = np.full_like(u, .78)
    return np.clip(rgb, 0, 255), rough, metal


def atlas(kind, out, size):
    color = np.full((size, size, 3), 128, np.uint8)
    sur = np.zeros_like(color)
    f = size / 1024
    for name, tile in TILES.items():
        x, y, w, h = (int(n * f) for n in tile)
        p = _pad(tile[2], tile[3]) * f
        u, v = np.meshgrid((np.arange(w) + .5 - p) / (w - 2 * p), (np.arange(h) + .5 - p) / (h - 2 * p))
        u, v = np.clip(u, 0, 1), np.clip(v, 0, 1)
        rgb, r, m = paint_tile(kind, name, u, v)
        color[y:y + h, x:x + w] = np.uint8(np.clip(rgb, 0, 255))
        sur[y:y + h, x:x + w, 0] = 255
        sur[y:y + h, x:x + w, 1] = np.uint8(np.clip(r * 255, 0, 255))
        sur[y:y + h, x:x + w, 2] = np.uint8(m * 255)
    raw = out / f'kiko-{kind}-color-{size}.png'
    jpg = out / f'kiko-{kind}-color-{size}.jpg'
    surf = out / f'kiko-{kind}-surface-{size // 4}.png'
    png(raw, color)
    im = bpy.data.images.load(str(raw))
    _ = im.size[:]
    im.file_format = 'JPEG'
    im.save(filepath=str(jpg), quality=88)
    bpy.data.images.remove(im)
    png(surf, np.uint8(sur.reshape(size // 4, 4, size // 4, 4, 3).mean(axis=(1, 3))))
    mat = bpy.data.materials.new(f'Kiko {kind} | smooth satin cuticle, shell and eyes')
    mat.use_nodes = True
    ns = mat.node_tree.nodes
    lk = mat.node_tree.links
    bs = ns.get('Principled BSDF')
    bs.inputs['Specular IOR Level'].default_value = .14
    if 'Coat Weight' in bs.inputs:
        bs.inputs['Coat Weight'].default_value = 0.0
    tex = ns.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(jpg))
    tex.image.pack()
    lk.new(tex.outputs['Color'], bs.inputs['Base Color'])
    tex = ns.new('ShaderNodeTexImage')
    tex.image = bpy.data.images.load(str(surf))
    tex.image.colorspace_settings.name = 'Non-Color'
    tex.image.pack()
    sep = ns.new('ShaderNodeSeparateColor')
    lk.new(tex.outputs['Color'], sep.inputs[0])
    lk.new(sep.outputs['Green'], bs.inputs['Roughness'])
    lk.new(sep.outputs['Blue'], bs.inputs['Metallic'])
    return mat


class Mesh:
    def __init__(self):
        self.v = []
        self.f = []
        self.uv = []
        self.w = []

    def grid(self, fn, n, m, tile, bone, wrap=False, reverse=False, uvfn=None, wrap_v=False):
        off = len(self.v)
        cols = n if wrap else n + 1
        rows = m if wrap_v else m + 1
        for j in range(rows):
            for i in range(cols):
                u, v = i / n, j / m
                p = Vector(fn(u, v))
                self.v.append(p)
                self.w.append(bone(p, u, v) if callable(bone) else {bone: 1.0})
        for j in range(m):
            jn = (j + 1) % rows if wrap_v else j + 1
            for i in range(n):
                inn = (i + 1) % cols if wrap else i + 1
                ids = (off + j * cols + i, off + j * cols + inn, off + jn * cols + inn, off + jn * cols + i)
                ts = ((i / n, j / m), ((i + 1) / n, j / m), ((i + 1) / n, (j + 1) / m), (i / n, (j + 1) / m))
                us = [uv(tile, *(uvfn(*t) if uvfn else t)) for t in ts]
                self.f.append(ids[::-1] if reverse else ids)
                self.uv.extend(us[::-1] if reverse else us)

    def ellipsoid(self, c, scale, tile, bone, n=18, m=10, uvfn=None):
        c = Vector(c)
        self.grid(
            lambda u, v: c + Vector((
                scale[0] * math.sin(math.pi * (.002 + .996 * v)) * math.sin(T * u),
                -scale[1] * math.sin(math.pi * (.002 + .996 * v)) * math.cos(T * u),
                scale[2] * math.cos(math.pi * (.002 + .996 * v)),
            )),
            n, m, tile, bone, True, True, uvfn=uvfn
        )

    def tube(self, fn, rad, n, m, tile, bone, flat=1.0, uvfn=None, ref=None):
        ref_v = Vector(ref).normalized() if ref is not None else Z
        def point(u, v):
            p = Vector(fn(v))
            t = (Vector(fn(min(1.0, v + .002))) - Vector(fn(max(0.0, v - .002)))).normalized()
            a = t.cross(ref_v)
            if a.length < .05:
                a = t.cross(Vector((0, 1, 0)))
                if a.length < .05:
                    a = t.cross(Vector((1, 0, 0)))
            a.normalize()
            b = t.cross(a).normalized()
            r = rad(v) if callable(rad) else rad
            return p + r * (a * math.cos(T * u) + b * math.sin(T * u) * flat)
        self.grid(point, n, m, tile, bone, True, uvfn=uvfn)

    def object(self, mat, rig, name, ground=True):
        if ground:
            min_z = min(p.z for p in self.v)
            if abs(min_z) > 1e-4:
                for p in self.v:
                    p.z -= min_z
        me = bpy.data.meshes.new(name + ' single painted mesh')
        me.from_pydata(self.v, [], self.f)
        me.update()
        me.uv_layers.new(name='Atlas').data.foreach_set('uv', np.ravel(self.uv))
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        if callable(mat):
            mat = mat()
        me.materials.append(mat)
        ob = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob)
        ob.parent = rig
        groups = {b.name: ob.vertex_groups.new(name=b.name) for b in rig.data.bones}
        for i, ws in enumerate(self.w):
            for bname, w in ws.items():
                if w > .0001:
                    groups[bname].add([i], w, 'REPLACE')
        mod = ob.modifiers.new('Crustacean skeleton', 'ARMATURE')
        mod.object = rig
        return ob


# ---------------------------------------------------------------------------
# 1. KIKO MOCHI (v40 MIN-12: Classic Wide Adorable Mochi-Crab Carapace + Splayed Outward Crab Walking Legs!)
# ---------------------------------------------------------------------------
def mochi_carapace(u, v):
    a = T * u
    phi = math.pi * (.002 + .996 * v)
    sp, cp = math.sin(phi), math.cos(phi)
    ca, sa = math.cos(a), math.sin(a)
    front = .5 * (1.0 + ca)
    # v40 MIN-12: Widened & gently flattened classic mochi-crab carapace (transverse oval crab shell with scalloped
    # lateral crab contour & low sturdy center of gravity — NEVER a tall round tick/spider egg in side.png!).
    flank = 1.0 + .074 * (sa ** 2) * math.exp(-((v - .54) / .18) ** 2)
    crab_rim = .034 * (sa ** 2) * math.exp(-((v - .47) / .11) ** 2) * (.65 + .35 * math.cos(4.0 * a))
    cheek_puff = .032 * (front ** 1.4) * (sa ** 2) * math.exp(-((v - .58) / .16) ** 2)
    brow_arch = .016 * (front ** 1.8) * math.exp(-((v - .28) / .14) ** 2)
    z_flat = (.335 + brow_arch) * cp if cp >= 0 else .245 * cp
    return Vector((
        .76 * sp * sa * (flank + crab_rim),
        -(.445 + cheek_puff) * sp * ca,
        .455 + z_flat,
    ))


def mochi_eye(side):
    # v42 MAJ-B: Cute round starry Kiko eyes placed slightly further forward & outward on the cheek/brow curve!
    c = Vector((side * .305, -.422, .560))
    n = Vector((side * .28, -.92, .26)).normalized()
    h = Z.cross(n).normalized()
    v = n.cross(h).normalized()
    return c, h, v, n


# ---------------------------------------------------------------------------
# 2. KIKO HERMIT (Pixar Cohesive Lavender-Shell Hermit Crab + Glasses — v38)
# ---------------------------------------------------------------------------
def hermit_head(u, v):
    a = T * u
    phi = math.pi * (.002 + .996 * v)
    sp, cp = math.sin(phi), math.cos(phi)
    ca, sa = math.cos(a), math.sin(a)
    front = .5 * (1.0 + ca)
    back = max(0.0, -ca)
    # Expressive Pixar cheek fullness & smooth rear carapace flow into the thorax/shell collar (zero snowman crease!).
    cheek = 1.0 + .072 * (sp ** 2) * (sa ** 2) * math.exp(-((v - .58) / .24) ** 2)
    brow_puff = .012 * (front ** 1.6) * math.exp(-((v - .28) / .16) ** 2)
    rear_flow = .075 * (back ** 1.4) * sp
    return Vector((
        .435 * sp * sa * cheek,
        -.60 - (.375 + brow_puff) * sp * ca + rear_flow,
        .74 + .325 * cp,
    ))


def hermit_eye(side):
    c = Vector((side * .186, -.915, .860))
    n = Vector((side * .24, -.93, .28)).normalized()
    h = Z.cross(n).normalized()
    v = n.cross(h).normalized()
    return c, h, v, n


# v38 Pixar coiled gastropod shell spine: tapers smoothly rearward-upward to a rounded coiled spire
# while framing Kiko's forehead & shoulders with an airy pearl-trimmed aperture collar (ZERO dark hole or forehead pinch!).
HERMIT_SHELL_SPINE = [
    (-.08,  1.25, 1.50),  # 0 (v=0.00): rounded coiled spire apex tip
    (-.06,  0.93, 1.40),  # 1 (v=0.25): 3rd coiled whorl tapering rearward
    (-.03,  0.53, 1.24),  # 2 (v=0.50): 2nd plump bulbous whorl
    (-.01,  0.15, 1.03),  # 3 (v=0.75): full body whorl belly
    ( .00, -0.14, 0.81),  # 4 (v=1.00): airy pearl-trimmed oblique aperture framing shoulders cleanly
]


def _hermit_shell_center(t):
    return Vector(curve(HERMIT_SHELL_SPINE, max(0.0, min(1.0, t)) * (len(HERMIT_SHELL_SPINE) - 1)))


def _hermit_shell_frame(t):
    p0 = _hermit_shell_center(max(0.0, t - .004))
    p1 = _hermit_shell_center(min(1.0, t + .004))
    fwd = (p1 - p0).normalized()
    right = fwd.cross(Z)
    if right.length < .05:
        right = Vector((1, 0, 0))
    right.normalize()
    if right.x < 0:
        right = -right
    up = right.cross(fwd).normalized()
    if up.z < 0:
        up = -up
    return _hermit_shell_center(t), fwd, right, up


def hermit_shell(u, v, extra=0.0):
    # v38: Volumetric coiled 3D pearly-lavender gastropod shell (3.2 sculpted whorls with recessed helical
    # sutures, organic corkscrew coil, and a snug oblique hooded aperture cradling Kiko's shoulders!).
    p, fwd, right, up = _hermit_shell_frame(v)
    a = T * u
    ca, sa = math.cos(a), math.sin(a)
    cap_k = math.sin(min(1.0, v / .055) * math.pi * .5)
    front_tuck = smooth_w(.80, 1.0, v) ** 1.55
    dome_env = .615 * (v ** .88) * (1.0 + .20 * math.sin(math.pi * (v ** 1.32))) - .145 * front_tuck
    dome_env = max(0.0, dome_env) * cap_k
    phi_v = 3.2 * (max(0.0, min(1.0, v)) ** .78)
    phi = phi_v + u
    wf = phi % 1.0
    whorl_fade = smooth_w(.02, .12, v) * (1.0 - smooth_w(.84, .985, v))
    s_w = math.sqrt(math.sin(math.pi * wf) ** 2 + .014)
    bulb = ((s_w - .1183) / .8877) ** .56
    whorl_dr = (.235 * (bulb - .42)) * dome_env * whorl_fade
    ds_ax = -.038 * (.38 + .62 * v) * math.sin(T * wf) * whorl_fade
    ecc = .045 * dome_env * whorl_fade
    coil_off = right * (ecc * math.cos(T * phi_v)) + up * (ecc * math.sin(T * phi_v))
    # Graceful oblique prosocline aperture hood: upper lip arches warmly over shoulders while lower lip tucks cleanly behind legs
    ap_t = smooth_w(.64, 1.0, v) ** 1.35
    hood = .115 * sa * ap_t
    r = max(.003, dome_env + whorl_dr) + extra
    rx = r * (1.03 + .025 * abs(ca))
    rz = r * (.94 + .03 * max(0.0, sa))
    return p + coil_off + fwd * (ds_ax + hood) + right * (rx * ca) + up * (rz * sa)


def add_kiko_eye(b, kind, side, n, m, axes, r, surface, res, root_bone, depth=.105, swell=.044, lid_scale=.80):
    char = f'kiko-{kind}'
    eb = 'Eye.' + ('L' if side < 0 else 'R')
    def weights(p, u, v):
        w = smooth_w(.75, .52, v)
        return {root_bone: 1.0 - w, eb: w}
    if side < 0:
        CE.SKIN_MAPS.pop(char, None)
    CE.calibrate_skin(char, axes, r, surface, lambda us, vs: paint_tile(kind, 'skin', us, vs)[0])
    tile = 'eye_l' if side < 0 else 'eye_r'
    return CE.conforming_eye(b, side, n, m, axes, r, surface, weights, depth=depth, res=res, swell=swell, tile=tile, lid_scale=lid_scale, char=char)


def _limb_w(parent_bone, child_bone, t0=.02, t1=.32):
    """Smooth gradient bone weight falloff from parent_bone at limb root (v=0) to child_bone along the limb."""
    def fn(p, u, v):
        w = smooth_w(t0, t1, v)
        return {parent_bone: 1.0 - w, child_bone: w}
    return fn


def _add_crab_leg(b, p0, p1, p2, p3, sc, s, bone_name, q, tile='limb'):
    """v39 MAJ-9 / MIN-13: Sculpted 3-segment jointed tapering crab leg (curved merus -> carpus -> tapered dactylus)
    with flared hip root, smooth knee/ankle condyle transitions & grounded toe at Z = 0."""
    def seg(pa, pb, r0, rm, r1, bow, nu, nv, v0, v1, bname, oval=(1.0, 1.0), tip_cap=False, hip_flare=False):
        t_ax = (pb - pa).normalized()
        ref = Vector((0, 1, 0)) if abs(t_ax.y) < .85 else Z
        u_ax = t_ax.cross(ref).normalized()
        w_ax = t_ax.cross(u_ax).normalized()
        def seg_fn(u, v):
            ang = T * u
            c = pa.lerp(pb, v) + bow * math.sin(math.pi * v)
            if tip_cap and v > .82:
                kt = (v - .82) / .18
                r = r1 * math.sqrt(max(0.0, 1.0 - kt * kt))
                c = c + t_ax * (r1 * math.sin(kt * math.pi * .5) * .45)
            else:
                base_r = r0 * (1.0 - v) + r1 * v + (rm - .5 * (r0 + r1)) * math.sin(math.pi * v)
                p0_pinch = 0.0 if hip_flare else math.exp(-((v / .15) ** 2))
                end_pinch = 1.0 - .08 * (p0_pinch + math.exp(-(((1.0 - v) / .15) ** 2)))
                hf = (1.0 + .30 * math.exp(-((v / .22) ** 2))) if hip_flare else 1.0
                r = base_r * hf * (1.0 if (tip_cap and v > .55) else end_pinch)
            return c + u_ax * (r * oval[0] * math.cos(ang)) + w_ax * (r * oval[1] * math.sin(ang))
        b.grid(seg_fn, nu, nv, tile, bname, True, False, uvfn=lambda u, v: (u, v0 + (v1 - v0) * v))

    # Segment 1: Curved Merus (body hip -> elevated arched crab knee) with smooth Body->Leg weight blend!
    seg(p0, p1, .076 * sc, .088 * sc, .058 * sc, Vector((0, 0, .042 * sc)), q(6, 11), q(4, 8), .04, .39,
        _limb_w('Body', bone_name, .02, .42), oval=(.94, 1.06), hip_flare=True)
    # Smooth knee condyle collar (plump enough to cleanly enclose merus & carpus ends with ZERO hairline seam!)
    b.ellipsoid(p1, (.070 * sc, .068 * sc, .070 * sc), tile, bone_name, q(6, 10), q(3, 6), uvfn=lambda u, v: (u, .40 + .05 * v))
    # Segment 2: Curved Carpus/Propodus (elevated knee -> angled ankle)
    seg(p1, p2, .057 * sc, .068 * sc, .045 * sc, Vector((s * .030 * sc, 0, .016 * sc)), q(6, 11), q(4, 8), .46, .71,
        bone_name, oval=(1.04, .96))
    # Subtle ankle condyle collar cleanly enclosing carpus & dactylus junction
    b.ellipsoid(p2, (.053 * sc, .051 * sc, .053 * sc), tile, bone_name, q(6, 9), q(3, 5), uvfn=lambda u, v: (u, .71 + .04 * v))
    # Segment 3: Gracefully curved tapering Dactylus foot claw (ankle -> sleek rounded crab toe!)
    seg(p2, p3, .045 * sc, .035 * sc, .015 * sc, Vector((s * .022 * sc, -.016 * sc, 0)), q(6, 11), q(4, 8), .76, .98,
        bone_name, oval=(1.0, .96), tip_cap=True)


def _add_smooth_mochi_leg(b, p0, p1, p2, p3, sc, s, bone_name, q, tile='limb'):
    """v41 MIN-2: ONE continuous parallel-transported curved mochi crab leg (hip -> arched knee -> ankle -> rounded cream toe)
    with ZERO disconnected segment collars, ZERO lumpy knee/ankle beads, and ZERO ring seams!"""
    # Insert mid-arch guide points so the cardinal spline traces the exact iconic splayed crab silhouette smoothly!
    p_m1 = p0.lerp(p1, .50) + Vector((0, 0, .036 * sc))
    p_m2 = p1.lerp(p2, .50) + Vector((s * .026 * sc, 0, .016 * sc))
    pts = [
        (p0.x, p0.y, p0.z),
        (p_m1.x, p_m1.y, p_m1.z),
        (p1.x, p1.y, p1.z),
        (p_m2.x, p_m2.y, p_m2.z),
        (p2.x, p2.y, p2.z),
        (p3.x, p3.y, p3.z),
    ]
    nu = q(8, 14)
    nv = q(16, 28)
    n_seg = len(pts) - 1
    c_pts = [Vector(curve(pts, (k / nv) * n_seg)) for k in range(nv + 1)]
    frames = []
    for k in range(nv + 1):
        t_ax = (c_pts[min(nv, k + 1)] - c_pts[max(0, k - 1)]).normalized()
        if k == 0:
            ref = Vector((0, 1, 0)) if abs(t_ax.y) < .85 else Z
            a = t_ax.cross(ref).normalized()
        else:
            prev_a = frames[-1][0]
            a = prev_a - t_ax * prev_a.dot(t_ax)
            if a.length < .05:
                a = t_ax.cross(Vector((0, 1, 0)))
            a.normalize()
        bb = t_ax.cross(a).normalized()  # a x bb == +t_ax -> outward normals with reverse=False!
        frames.append((a, bb))

    v_cap = .82
    c_cap = Vector(curve(pts, v_cap * n_seg))
    t_cap = (Vector(curve(pts, min(1.0, v_cap + .01) * n_seg)) - Vector(curve(pts, max(0.0, v_cap - .01) * n_seg))).normalized()

    def leg_rad(v):
        # v43 MIN-2: Sturdy plush crab legs with smooth hemispherical rounded toe dome (ZERO sharp vertex-pole spikes!)
        hip_flare = 1.0 + .34 * math.exp(-((v / .14) ** 2))
        cap0 = math.sin(min(1.0, v / .04) * math.pi * .5)
        base_r = (.110 * (1.0 - .46 * (v ** 1.05)) + .018 * math.sin(math.pi * min(1.0, v * 1.4))) * sc
        return base_r * hip_flare * cap0

    r_tip = leg_rad(v_cap)
    # Last frame before cap for smooth continuous tangent frame across the dome
    j_cap = min(nv, int(round(v_cap * nv)))
    a_cap, bb_cap = frames[j_cap]

    def leg_fn(u, v):
        ang = T * u
        if v <= v_cap:
            j = min(nv, int(round(v * nv)))
            a, bb = frames[j]
            r = leg_rad(v)
            return c_pts[j] + r * (a * math.cos(ang) + bb * math.sin(ang))
        phi = ((v - v_cap) / (1.0 - v_cap)) * (math.pi * .5)
        r = r_tip * math.cos(phi)
        c_dome = c_cap + t_cap * (r_tip * .95 * math.sin(phi))
        return c_dome + r * (a_cap * math.cos(ang) + bb_cap * math.sin(ang))

    b.grid(leg_fn, nu, nv, tile, _limb_w('Body', bone_name, .02, .32), True, False, uvfn=lambda u, v: (u, .04 + .94 * v))


def _add_sculpted_chela(b, arm_pts, main_pts, thumb_pts, arm_r, palm_ru, palm_rw, pin_ru, pin_rw, thumb_r, in_hint, ref_n, bone_name, q, arm_tile='limb'):
    """v39/v41: Seamless sculpted crab chela:
    - Smoothly flared shoulder-to-wrist arm tapering cleanly INSIDE the palm wrist sleeve (ZERO wrist step or jagged shoulder seam!),
    - ONE continuous closed loft from tapered wrist collar -> plump teardrop palm -> curved fixed outer pincer,
    - Smoothly nested curved movable inner dactyl pincer with rounded buried root (ZERO stacked-knuckle-ball look!)."""
    # 1. Organic curved arm (merus + carpus) with broad flared shoulder socket & smooth wrist taper tucking inside palm sleeve!
    def arm_rad(t):
        sh = 1.0 + .38 * math.exp(-((t / .24) ** 2))
        wr = 1.0 - .04 * smooth_w(.75, 1.0, t)
        cap = math.sqrt(max(0.0, 1.0 - max(0.0, (t - .92) / .08) ** 2))
        return arm_r * sh * wr * cap
    b.tube(
        lambda t, pts=arm_pts: Vector(curve(pts, t * (len(pts) - 1))),
        arm_rad, q(8, 14), q(7, 14), arm_tile,
        _limb_w('Body', bone_name, .06, .42), ref=ref_n,
        uvfn=lambda u, v: (u, .06 + .24 * v)
    )

    # 2. Unified continuous loft: tapered wrist sleeve -> plump teardrop crab palm -> curved fixed outer pincer!
    nv_m = q(12, 26)
    nu_m = q(10, 20)
    n_seg = len(main_pts) - 1
    ref_v = Vector(ref_n).normalized()
    # Ensure u_ax consistently points toward inner thumb side (in_hint) while (u_ax, w_ax, t_ax) stays strictly right-handed!
    t0 = (Vector(curve(main_pts, .02 * n_seg)) - Vector(curve(main_pts, 0.0))).normalized()
    w0 = (ref_v - t0 * ref_v.dot(t0)).normalized()
    if w0.cross(t0).dot(Vector(in_hint)) < 0:
        ref_v = -ref_v
    frames = []
    for j in range(nv_m + 1):
        v = j / nv_m
        p = Vector(curve(main_pts, v * n_seg))
        t_ax = (Vector(curve(main_pts, min(1.0, v + .004) * n_seg)) - Vector(curve(main_pts, max(0.0, v - .004) * n_seg))).normalized()
        w_ax = (ref_v - t_ax * ref_v.dot(t_ax))
        if w_ax.length < .05:
            alt = Vector((0, 0, 1)) if abs(t_ax.z) < .85 else Vector((1, 0, 0))
            w_ax = (alt - t_ax * alt.dot(t_ax))
        w_ax.normalize()
        u_ax = w_ax.cross(t_ax).normalized()   # u_ax x w_ax == +t_ax -> outward normals with reverse=False!
        frames.append((p, u_ax, w_ax, t_ax))

    def chela_main(u, v):
        ang = T * u
        j = min(nv_m, int(round(v * nv_m)))
        p, u_ax, w_ax, _t = frames[j]
        # Smooth organic teardrop flare from wrist radius (arm_r*1.02) into plump crab palm -> sleek curved outer pincer!
        cap0 = math.sin(min(1.0, v / .04) * math.pi * .5)
        cap1 = math.sqrt(max(0.0, 1.0 - max(0.0, (v - .85) / .15) ** 2))
        from_wrist = smooth_w(.04, .38, v)
        to_pin = smooth_w(.42, .66, v)
        palm_swell = .88 + .12 * math.sin(math.pi * min(1.0, max(0.0, (v - .08) / .52)))
        pin_taper = 1.0 - .52 * smooth_w(.56, 1.0, v)
        wr_r = arm_r * 1.02
        ru_body = wr_r * (1.0 - from_wrist) + (palm_ru * palm_swell) * from_wrist
        rw_body = wr_r * (1.0 - from_wrist) + (palm_rw * palm_swell) * from_wrist
        ru = (ru_body * (1.0 - to_pin) + pin_ru * pin_taper * to_pin) * cap0 * cap1
        rw = (rw_body * (1.0 - to_pin) + pin_rw * pin_taper * to_pin) * cap0 * cap1
        # Asymmetric organic palm cheek swelling subtly toward inner movable thumb hinge!
        inner_shift = palm_ru * .22 * from_wrist * (1.0 - to_pin)
        return p + u_ax * (inner_shift + ru * math.cos(ang)) + w_ax * (rw * math.sin(ang))

    b.grid(chela_main, nu_m, nv_m, 'claw', bone_name, True, False, uvfn=lambda u, v: (u, .14 + .82 * v))

    # 3. Smoothly nested curved movable inner pincer (closed rounded root buried inside palm cheek -> silky curved thumb tip!)
    def thumb_rad(t):
        cap0 = math.sin(min(1.0, t / .12) * math.pi * .5)
        cap1 = math.sqrt(max(0.0, 1.0 - max(0.0, (t - .82) / .18) ** 2))
        fillet = 1.0 + .16 * math.exp(-(((t - .20) / .14) ** 2))
        return thumb_r * fillet * (1.0 - .50 * t) * cap0 * cap1
    b.tube(
        lambda t, pts=thumb_pts: Vector(curve(pts, t * (len(pts) - 1))),
        thumb_rad, q(8, 14), q(8, 14), 'claw', bone_name, ref=ref_n,
        uvfn=lambda u, v: (u, .36 + .60 * v)
    )


def _snap_hermit_head(pt, margin=.010):
    """Project a point near Kiko Hermit's face cleanly onto the exact analytical hermit_head surface + outward margin."""
    hc = Vector((0.0, -.60, .74))
    d = Vector(pt) - hc
    sx = d.x / .435
    sy = -d.y / .375
    sz = d.z / .325
    a = math.atan2(sx, sy)
    phi = math.atan2(math.hypot(sx, sy), sz)
    u = (a / T) % 1.0
    v = max(.02, min(.98, (phi / math.pi - .002) / .996))
    # Two fast fixed-point angular refinements so surface point aligns tightly along ray from hc
    for _ in range(2):
        s_p = hermit_head(u, v) - hc
        da = math.atan2(d.x, -d.y) - math.atan2(s_p.x, -s_p.y)
        da = (da + math.pi) % T - math.pi
        dp = math.atan2(math.hypot(d.x, d.y), d.z) - math.atan2(math.hypot(s_p.x, s_p.y), s_p.z)
        u = (u + da / T * .7) % 1.0
        v = max(.02, min(.98, v + dp / math.pi * .7))
    surf = hermit_head(u, v)
    du = hermit_head((u + .002) % 1.0, v) - hermit_head((u - .002) % 1.0, v)
    dv = hermit_head(u, min(.99, v + .002)) - hermit_head(u, max(.01, v - .002))
    nrm = dv.cross(du)
    if nrm.dot(surf - hc) < 0:
        nrm = -nrm
    nrm.normalize()
    return surf + nrm * margin, nrm


def make_mesh(kind, lod, mat, rig):
    b = Mesh()
    close = lod == 'close'
    q = lambda a, c: c if close else a

    if kind == 'mochi':
        # v40 MIN-12: Widened & gently flattened adorable mochi-crab carapace + classic wide splayed crab stance!
        b.grid(mochi_carapace, q(34, 54), q(20, 32), 'skin', 'Body', True, True)
        # Cute round starry Kiko conforming eyes!
        for s in (-1, 1):
            add_kiko_eye(b, 'mochi', s, q(18, 28), q(12, 18), mochi_eye, .178, mochi_carapace, (q(34, 54), q(20, 32)), 'Body', depth=.108, swell=.056, lid_scale=.82)
        # Cute happy upturned dark-berry smile centered cleanly between the rosy cheeks (tucked flush into cheek curve)!
        def mochi_smile_pt(t):
            s = 2.0 * t - 1.0
            return Vector((.130 * s, -.434 + .026 * (s ** 2), .395 + .034 * (s ** 2)))
        def mochi_smile_r(t):
            base = .0122 * (.78 + .24 * math.sin(math.pi * t))
            if t < .12:
                return base * math.sqrt(max(0.0, 1.0 - ((.12 - t) / .12) ** 2))
            if t > .88:
                return base * math.sqrt(max(0.0, 1.0 - ((t - .88) / .12) ** 2))
            return base
        b.tube(mochi_smile_pt, mochi_smile_r, q(6, 8), q(12, 18), 'dark', 'Body')

        # v41 MIN-2: 3 pairs (6 total) of silky-smooth continuous splayed crab walking legs (ZERO leg-joint ring seams!)
        leg_fans = [
            (-.07, -.22, -.35, -.44, 1.00),  # front walking leg arching forward-outward (clear of claw shoulder!)
            ( .04,  .07,  .12,  .16, 0.98),  # middle walking leg splayed boldly laterally outward
            ( .17,  .33,  .46,  .56, 0.93),  # rear walking leg sweeping gracefully backward-outward
        ]
        for s, suf in ((-1, 'L'), (1, 'R')):
            for k, (y0, y1, y2, y3, sc_k) in enumerate(leg_fans):
                p0 = Vector((s * (.56 - .03 * k), y0, .34))
                p1 = Vector((s * (1.03 + .05 * (1 - abs(k - 1))), y1, .46 + .016 * k))   # elevated arched outward crab knee!
                p2 = Vector((s * (1.25 + .05 * (1 - abs(k - 1))), y2, .19))               # wide diagonal crab ankle!
                p3 = Vector((s * (1.33 + .04 * (1 - abs(k - 1))), y3, .014))              # tapered dactylus toe planted on Z = 0!
                _add_smooth_mochi_leg(b, p0, p1, p2, p3, sc_k, s, f'Leg{k + 1}.{suf}', q, tile='limb')

            # v42 MAJ-B: Separate both claws cleanly outward (±X), forward (-Y), and below eye level
            # so in strict side.png they read as distinct rounded crab pincers with a clear gap from the face!
            if s > 0:
                arm_pts = [(.52, -.24, .37), (.74, -.36, .34), (.88, -.48, .33), (.93, -.56, .34)]
                main_pts = [(.86, -.50, .33), (.95, -.58, .34), (1.02, -.66, .37), (1.04, -.72, .42), (.97, -.73, .45)]
                thumb_pts = [(.92, -.59, .36), (.86, -.66, .39), (.88, -.72, .43), (.94, -.73, .45)]
                _add_sculpted_chela(
                    b, arm_pts, main_pts, thumb_pts,
                    arm_r=.068, palm_ru=.126, palm_rw=.108, pin_ru=.060, pin_rw=.054, thumb_r=.054,
                    in_hint=(-1, -.35, 0), ref_n=(.32, -.94, .08), bone_name='Claw.R', q=q, arm_tile='claw'
                )
            else:
                arm_pts = [(-.52, -.24, .36), (-.74, -.34, .30), (-.86, -.44, .26), (-.90, -.51, .24)]
                main_pts = [(-.84, -.46, .26), (-.93, -.53, .22), (-1.00, -.60, .17), (-1.02, -.65, .11), (-.95, -.66, .08)]
                thumb_pts = [(-.89, -.54, .21), (-.84, -.60, .18), (-.85, -.65, .12), (-.91, -.66, .09)]
                _add_sculpted_chela(
                    b, arm_pts, main_pts, thumb_pts,
                    arm_r=.062, palm_ru=.120, palm_rw=.108, pin_ru=.052, pin_rw=.048, thumb_r=.050,
                    in_hint=(1, 0, 0), ref_n=(0, -1, 0), bone_name='Claw.L', q=q, arm_tile='claw'
                )
        return b.object(mat, rig, 'Kiko mochi | organic authored mesh', ground=True)

    # --- KIKO HERMIT (v39 MIN-3 & MIN-13: Mother-of-Pearl Rolled Lip + Warm Interior Collar + Flush Glasses + Smooth Claws + Clean Forehead) ---
    # 1. Coiled 3D pearly-lavender gastropod shell body (uv_v in [0.00, 0.835] matches spiral whorl paint)
    b.grid(
        lambda u, v: hermit_shell(u, v),
        q(22, 42), q(22, 44), 'shell', 'Body', True, False,
        uvfn=lambda u, v: (u, .835 * v)
    )
    # 2. Prominent sculpted mother-of-pearl rolled shell aperture lip (uv_v in [0.844, 0.926] -> luminous champagne-rose nacre roll!)
    _, fwd_ap, r_ap, u_ap = _hermit_shell_frame(1.0)
    def hermit_lip(u, v):
        base = hermit_shell(u, 1.0, .010)
        a = T * u
        ba = T * v
        rad = (r_ap * math.cos(a) + u_ap * math.sin(a)).normalized()
        return base + rad * (.054 * math.cos(ba)) + fwd_ap * (.050 * math.sin(ba))
    b.grid(
        hermit_lip, q(22, 42), q(5, 10), 'shell', 'Body', True, False,
        uvfn=lambda u, v: (u, .845 + .080 * (.5 - .5 * math.cos(T * v))), wrap_v=True
    )
    # 3. Warm softly shaded mother-of-pearl interior collar closing smoothly behind Kiko's thorax (ZERO dark void!)
    p_back = _hermit_shell_center(.72)
    def hermit_interior(u, v):
        # Starts cleanly inside the plump rolled mother-of-pearl lip at v=0, curves warmly inward around the shoulders,
        # and closes seamlessly to exact radius 0 at v=1 behind Kiko's thorax (FrontSide faces front -Y camera!).
        rim = hermit_shell(u, .992, -.020)
        k = v ** 1.15
        collar_bow = math.sin(math.pi * v) * .060
        p_lin = rim.lerp(p_back, k)
        return p_lin + (rim - _hermit_shell_center(.992)).normalized() * collar_bow
    b.grid(
        hermit_interior, q(16, 32), q(5, 11), 'shell', 'Body', True, False,
        uvfn=lambda u, v: (u, .932 + .066 * v)
    )

    # 4. Smooth unified cephalothorax-head & organic neck/shoulder bridge (ZERO floating snowman oval!)
    def hermit_head_w(p, u, v):
        wh = smooth_w(-.26, -.64, p.y)
        return {'Head': wh, 'Body': 1.0 - wh}

    b.grid(hermit_head, q(24, 42), q(14, 26), 'skin', hermit_head_w, True, True)

    THORAX_PROFILE = [
        (-.62, .74, .37, .28),  # 0: tucked cleanly inside rear of hermit_head
        (-.42, .75, .42, .31),  # 1: seamless upper-carapace & shoulder flow (zero neck step!)
        (-.18, .77, .42, .32),  # 2: plump carapace entering the pearl-trimmed shell aperture
        ( .08, .81, .36, .30),  # 3: tucked snugly inside warm interior shell collar
        ( .28, .86, .00, .00),  # 4: closed abdomen core deep inside shell
    ]
    def hermit_thorax(u, v):
        a = T * u
        ca, sa = math.cos(a), math.sin(a)
        y, zc, rx, rz = curve(THORAX_PROFILE, v * (len(THORAX_PROFILE) - 1))
        rx = max(0.0, rx)
        rz = max(0.0, rz)
        return Vector((rx * sa, y, zc + rz * ca))
    b.grid(
        hermit_thorax, q(14, 24), q(6, 12), 'skin', hermit_head_w, True, False,
        uvfn=lambda u, v: (.36 + .14 * abs(2.0 * u - 1.0), .44 + .28 * v)
    )

    # 5. Wide-open cheerful 76%-iris warm golden-violet conforming eyes + FLUSH face-hugging amber-gold wire glasses!
    bridge_ends = {}
    for s, suf in ((-1, 'L'), (1, 'R')):
        add_kiko_eye(b, 'hermit', s, q(16, 28), q(10, 18), hermit_eye, .150, hermit_head, (q(24, 42), q(14, 26)), 'Head', depth=.095, swell=.036, lid_scale=.65)
        e_base, h_ax, z_ax, n_ax = hermit_eye(s)
        R_g = .152
        rt_g = .0115
        # v39 MIN-13: Conform the gold glasses rim 360 deg FLUSH onto the curved face surface (zero floating gap in side.png!)
        n_rim = q(20, 36)
        rim_pts = []
        rim_nrms = []
        for iu in range(n_rim):
            au = T * (iu / n_rim)
            raw_pt = e_base + h_ax * (R_g * math.cos(au)) + z_ax * (R_g * math.sin(au))
            sp, sn = _snap_hermit_head(raw_pt, margin=.013)
            rim_pts.append(sp)
            rim_nrms.append(sn)
        def rim_fn(u, v, rp=rim_pts, rn=rim_nrms, nr=n_rim):
            idx = int(round(u * nr)) % nr
            p_c = rp[idx]
            p_next = rp[(idx + 1) % nr]
            p_prev = rp[(idx - 1) % nr]
            t_r = (p_next - p_prev).normalized()
            n_out = rn[idx]
            n_out = (n_out - t_r * n_out.dot(t_r)).normalized()
            r_rad = t_r.cross(n_out).normalized()
            bv = T * v
            return p_c + r_rad * (rt_g * math.cos(bv)) + n_out * (rt_g * math.sin(bv))
        b.grid(rim_fn, n_rim, q(5, 10), 'gold', 'Head', True, False, wrap_v=True)

        # Save exact inner rim anchor (facing midline x=0) and outer rim anchor (facing temple)
        in_raw = e_base + h_ax * (-s * R_g)
        out_raw = e_base + h_ax * (s * R_g)
        in_pt, _ = _snap_hermit_head(in_raw, margin=.013)
        out_pt, _ = _snap_hermit_head(out_raw, margin=.013)
        bridge_ends[s] = in_pt

        # Flush temple arm hugging the cheek contour cleanly back into the shell collar (ends cleanly in Head zone at y = -0.56)
        t_mid, _ = _snap_hermit_head((s * .42, -.76, .87), margin=.008)
        t_end, _ = _snap_hermit_head((s * .42, -.56, .85), margin=.006)
        t_pts = [tuple(out_pt), tuple(t_mid), tuple(t_end)]
        b.tube(lambda t, pts=t_pts: Vector(curve(pts, t * 2.0)), lambda t: .0105 * (1.0 - .20 * t), q(6, 8), q(8, 12), 'gold', 'Head')

        # v39 MIN-3: Dainty bright coral-peach antennae rooted wider on upper crown (clear of forehead -> ZERO dark V-crease!)
        ant_pts = [(s * .18, -.76, 1.03), (s * .28, -.79, 1.18), (s * .40, -.80, 1.28), (s * .51, -.77, 1.31)]
        b.tube(
            lambda t, pts=ant_pts: Vector(curve(pts, t * 3.0)),
            lambda t: .014 * (1.0 - .78 * t) + .0028,
            q(5, 7), q(9, 14), 'limb', _limb_w('Head', 'Antenna.' + suf, .04, .36),
            uvfn=lambda u, v: (u, .66 + .30 * v)
        )

        # v39: Three grounded sculpted 3-segment jointed tapering crab walking legs per side!
        for j in range(3):
            sc_j = 1.0 - .06 * j
            p0 = Vector((s * (.28 + .02 * j), -.36 + .20 * j, .56))
            p1 = Vector((s * (.64 + .08 * j), -.42 + .26 * j, .55 + .04 * j))
            p2 = Vector((s * (.83 + .09 * j), -.52 + .28 * j, .25 + .01 * j))
            p3 = Vector((s * (.83 + .08 * j), -.62 + .29 * j, .016))
            _add_crab_leg(b, p0, p1, p2, p3, sc_j * 1.08, s, f'Leg{j + 1}.{suf}', q, tile='limb')

    # v39 MIN-13: Arched gold nose bridge seated 100% FLUSH onto the curved face surface (zero floating standoff in side view!)
    brL = bridge_ends[-1]
    brR = bridge_ends[1]
    brM_raw = 0.5 * (brL + brR) + Vector((0, 0, .016))
    brM, _ = _snap_hermit_head(brM_raw, margin=.011)
    def bridge_pt(t):
        raw = ((1.0 - t) ** 2) * brL + 2.0 * (1.0 - t) * t * brM + (t ** 2) * brR
        sp, _ = _snap_hermit_head(raw, margin=.012)
        return sp
    b.tube(bridge_pt, .0105, q(6, 8), q(8, 12), 'gold', 'Head')

    # Cheerful upturned warm smile cleanly centered below the glasses!
    def herm_smile_pt(t):
        s = 2.0 * t - 1.0
        return Vector((.118 * s, -.972 + .028 * (s ** 2), .638 + .034 * (s ** 2)))
    def herm_smile_r(t):
        base = .0145 * (.78 + .24 * math.sin(math.pi * t))
        if t < .12:
            return base * math.sqrt(max(0.0, 1.0 - ((.12 - t) / .12) ** 2))
        if t > .88:
            return base * math.sqrt(max(0.0, 1.0 - ((t - .88) / .12) ** 2))
        return base
    b.tube(herm_smile_pt, herm_smile_r, q(6, 8), q(10, 16), 'dark', 'Head')

    # v39 MIN-13: Seamless unequal sculpted hermit-crab chelipeds (smooth arm -> unified teardrop palm/pincer -> nested thumb; ZERO stacked knuckle balls!)
    l_arm = [(-.28, -.54, .58), (-.46, -.71, .49), (-.54, -.84, .43), (-.57, -.89, .41)]
    l_main = [(-.54, -.85, .44), (-.59, -.91, .38), (-.67, -.96, .30), (-.69, -.99, .21), (-.61, -1.00, .15)]
    l_thumb = [(-.55, -.91, .37), (-.49, -.96, .32), (-.51, -1.01, .23), (-.58, -1.01, .18)]
    _add_sculpted_chela(
        b, l_arm, l_main, l_thumb,
        arm_r=.084, palm_ru=.152, palm_rw=.142, pin_ru=.068, pin_rw=.062, thumb_r=.060,
        in_hint=(1, 0, 0), ref_n=(0, -1, 0), bone_name='Claw.L', q=q
    )
    r_arm = [(.27, -.54, .58), (.43, -.70, .51), (.50, -.82, .47), (.53, -.87, .45)]
    r_main = [(.50, -.83, .48), (.54, -.88, .43), (.61, -.93, .36), (.63, -.96, .29), (.56, -.97, .24)]
    r_thumb = [(.51, -.89, .42), (.46, -.93, .38), (.47, -.97, .31), (.53, -.97, .27)]
    _add_sculpted_chela(
        b, r_arm, r_main, r_thumb,
        arm_r=.070, palm_ru=.124, palm_rw=.116, pin_ru=.055, pin_rw=.050, thumb_r=.048,
        in_hint=(-1, 0, 0), ref_n=(0, -1, 0), bone_name='Claw.R', q=q
    )
    return b.object(mat, rig, 'Kiko hermit | organic authored mesh', ground=True)


def make_rig(kind):
    data = bpy.data.armatures.new(f'Kiko {kind} skeleton')
    rig = bpy.data.objects.new(f'Kiko {kind} rig', data)
    bpy.context.collection.objects.link(rig)
    bpy.context.view_layer.objects.active = rig
    rig.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')

    def bone(name, a, b_, parent='Body'):
        q = data.edit_bones.new(name)
        q.head = Vector(a)
        q.tail = Vector(b_)
        if parent:
            q.parent = data.edit_bones[parent]

    bone('Root', (0, 0, 0), (0, 0, .20), None)
    if kind == 'mochi':
        bone('Body', (0, 0, .38), (0, 0, .66), 'Root')
        for s, suf in ((-1, 'L'), (1, 'R')):
            c, _h, _v, n = mochi_eye(s)
            bone('Eye.' + suf, c, c + n * .14, 'Body')
            bone('Claw.' + suf, (s * .56, -.22, .40), (s * .86, -.31, .68 if s > 0 else .30), 'Body')
            for k, (y0, y1) in enumerate(((-.07, -.20), (.05, .07), (.17, .32))):
                bone(f'Leg{k + 1}.{suf}', (s * (.56 - .03 * k), y0, .35), (s * 1.02, y1, .45), 'Body')
    else:
        bone('Body', (0, -.04, .60), (0, -.04, .90), 'Root')
        bone('Head', (0, -.44, .74), (0, -.82, .84), 'Body')
        for s, suf in ((-1, 'L'), (1, 'R')):
            c, _h, _v, n = hermit_eye(s)
            bone('Eye.' + suf, c, c + n * .14, 'Head')
            bone('Antenna.' + suf, (s * .18, -.76, 1.03), (s * .40, -.80, 1.28), 'Head')
            bone('Claw.' + suf, (s * .30, -.58, .59), (s * .55, -.90, .40), 'Body')
            for k in range(3):
                bone(f'Leg{k + 1}.{suf}', (s * (.28 + .02 * k), -.36 + .19 * k, .57), (s * (.64 + .09 * k), -.42 + .26 * k, .46), 'Body')
    bpy.ops.object.mode_set(mode='OBJECT')
    return rig


def animate(kind, rig):
    # v38 Pixar cohesive full-body breathing + expressive anticipation & follow-through (feet stay grounded on Z = 0!)
    clips = {
        'Idle': [(1, 0, 0, 0, 0.0), (16, -5.5, 1.5, .45, 1.0), (32, 5.5, -1.5, -.35, -1.0), (48, -2.0, .8, .20, .6), (64, 0, 0, 0, 0.0)],
        'Listen': [(1, 0, 0, 0, 0.0), (10, 4.5, -2.8, .40, .8), (28, 4.5, -2.4, .35, .5), (42, 0, 0, 0, 0.0)],
        'React': [(1, 0, 0, 0, 0.0), (6, -5.0, 2.8, -.55, -1.2), (14, 7.0, -3.0, 1.25, 1.8), (24, 3.0, -.5, .50, .7), (36, 0, 0, 0, 0.0)],
    }
    rig.animation_data_create()
    bpy.context.scene.render.fps = 30
    for clip, keys in clips.items():
        action = bpy.data.actions.new(clip)
        rig.animation_data.action = action
        for frame, yaw, pitch, energy, breath in keys:
            env = 0.0 if frame in (keys[0][0], keys[-1][0]) else 1.0
            for pb in rig.pose.bones:
                pb.rotation_mode = 'QUATERNION'
                pb.location = (0, 0, 0)
                pb.scale = (1, 1, 1)
                axis = rig.data.bones[pb.name].matrix_local.to_quaternion().inverted()
                q = Quaternion()
                if pb.name == 'Body':
                    # Cohesive volume-preserving full-body breathing (squash/stretch + gentle organic pitch/roll!)
                    b_amp = (.044 if clip == 'React' else .022) if kind == 'mochi' else (.030 if clip == 'React' else .016)
                    sq = 1.0 + b_amp * breath * env
                    pb.scale = (sq, 1.0 / math.sqrt(sq), sq)
                    pb.keyframe_insert(data_path='scale', frame=frame, group=pb.name)
                    roll_deg = energy * (2.6 if kind == 'mochi' else 1.3)
                    pitch_deg = (breath * (1.8 if kind == 'mochi' else 1.2) + pitch * .22) * env
                    q = Quaternion(axis @ Vector((0, 1, 0)), math.radians(roll_deg)) @ Quaternion(axis @ Vector((1, 0, 0)), math.radians(pitch_deg))
                elif pb.name == 'Head':
                    # Curious tilted head glance working harmoniously with breathing Body!
                    q = (
                        Quaternion(axis @ Z, math.radians(yaw * .65))
                        @ Quaternion(axis @ Vector((1, 0, 0)), math.radians(pitch * .55))
                        @ Quaternion(axis @ Vector((0, 1, 0)), math.radians(yaw * .24))
                    )
                elif pb.name.startswith('Eye.'):
                    # Subtle clamped conforming-eye glance (never tears skin skirt!)
                    eg = max(-3.0, min(3.0, yaw * .42))
                    ep = max(-3.0, min(3.0, pitch * .45))
                    q = Quaternion(axis @ Z, math.radians(eg)) @ Quaternion(axis @ Vector((1, 0, 0)), math.radians(ep))
                elif pb.name.startswith('Claw.'):
                    s = -1 if pb.name.endswith('L') else 1
                    deg = energy * (11.5 if kind == 'mochi' else 7.0) * (1 if s > 0 else -.55)
                    q = Quaternion(axis @ Vector((0, 1, 0)), math.radians(deg)) @ Quaternion(axis @ Z, math.radians(energy * 4.5 * s))
                elif pb.name.startswith('Antenna.'):
                    s = -1 if pb.name.endswith('L') else 1
                    q = Quaternion(axis @ Vector((0, 1, 0)), math.radians((energy * 6.0 + breath * 2.5 * s) * env))
                elif pb.name.startswith('Leg'):
                    # Gentle grounded poise counter-flexing with Body breathing so feet stay planted solidly on Z = 0!
                    s = -1 if pb.name.endswith('L') else 1
                    q = Quaternion(axis @ Vector((0, 1, 0)), math.radians(s * breath * .85 * env))
                pb.rotation_quaternion = q
                pb.keyframe_insert(data_path='rotation_quaternion', frame=frame, group=pb.name)
        for channel in action.fcurves:
            for k in channel.keyframe_points:
                k.handle_left_type = k.handle_right_type = 'AUTO_CLAMPED'
        action.use_fake_user = True
        rig.animation_data.action = None
        track = rig.animation_data.nla_tracks.new()
        track.name = clip
        track.strips.new(clip, 1, action)
        track.mute = True
    rig.animation_data.action = bpy.data.actions['Idle']
    bpy.context.scene.frame_set(1)


def glb_stats(path):
    raw = path.read_bytes()
    jl = struct.unpack_from('<I', raw, 12)[0]
    d = json.loads(raw[20:20 + jl])
    bn = 28 + jl
    tris = sum(d['accessors'][p['indices']]['count'] // 3 for m in d['meshes'] for p in m['primitives'])
    imgs = []
    for im in d['images']:
        bv = d['bufferViews'][im['bufferView']]
        s = bn + bv.get('byteOffset', 0)
        data = raw[s:s + bv['byteLength']]
        if data.startswith(b'\x89PNG'):
            w, h = struct.unpack_from('>II', data, 16)
        else:
            k = 2
            while data[k + 1] not in (0xc0, 0xc1, 0xc2, 0xc3):
                k += struct.unpack_from('>H', data, k + 2)[0] + 2
            h, w = struct.unpack_from('>HH', data, k + 5)
        imgs.append({'width': w, 'height': h, 'bytes': len(data), 'mime': im['mimeType']})
    clips = [a['name'] for a in d.get('animations', [])]
    return {
        'file': path.name,
        'bytes': len(raw),
        'triangles': tris,
        'meshCount': len(d['meshes']),
        'draws': sum(len(m['primitives']) for m in d['meshes']),
        'materials': len(d['materials']),
        'bones': len(d['skins'][0]['joints']),
        'textureImages': imgs,
        'clips': clips,
    }


def build(kind, lod, output):
    bpy.ops.wm.read_factory_settings(use_empty=True)
    size = 1024 if lod == 'board' else 2048
    mat = lambda: atlas(kind, output, size)
    rig = make_rig(kind)
    mesh = make_mesh(kind, lod, mat, rig)
    animate(kind, rig)
    bpy.ops.object.select_all(action='DESELECT')
    rig.select_set(True)
    mesh.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    dest = output / f'kiko-{kind}-{lod}.glb'
    bpy.ops.export_scene.gltf(
        filepath=str(dest),
        export_format='GLB',
        use_selection=True,
        export_animations=True,
        export_animation_mode='ACTIONS',
        export_force_sampling=True,
        export_apply=False,
        export_image_format='AUTO',
        export_extras=False,
        export_yup=True,
        export_rest_position_armature=True,
    )
    report = glb_stats(dest)
    report['authorVertices'] = len(mesh.data.vertices)
    report['bounds'] = [[min(p[i] for p in mesh.bound_box) for i in range(3)], [max(p[i] for p in mesh.bound_box) for i in range(3)]]
    assert report['triangles'] <= (21000 if lod == 'close' else 7500), report
    assert report['bytes'] < (1350 * 1024 if lod == 'close' else 620 * 1024), report
    assert report['draws'] == report['materials'] == report['meshCount'] == 1, report
    assert report['bones'] <= 16 and len(report['textureImages']) == 2, report
    assert set(report['clips']) == {'Idle', 'Listen', 'React'}, report
    (output / f'{lod}-report.json').write_text(json.dumps(report, indent=2) + '\n')
    if lod == 'close':
        bpy.context.preferences.filepaths.save_version = 0
        bpy.ops.wm.save_as_mainfile(filepath=str(output / f'kiko-{kind}-production.blend'), compress=True)
    print('KIKO_REPORT', json.dumps(report), flush=True)


if __name__ == '__main__':
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--character', choices=['hermit', 'mochi'], required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--lod', choices=['both', 'board', 'close'], default='both')
    p.add_argument('--reuse-atlas', action='store_true')
    a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
    a.output = a.output.resolve()
    a.output.mkdir(parents=True, exist_ok=True)
    for lod in ['board', 'close'] if a.lod == 'both' else [a.lod]:
        build(a.character, lod, a.output)
