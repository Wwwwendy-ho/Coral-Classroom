"""Author and export the 5 Harbor Town residents with species-accurate stylized silhouettes.
Blender 4.3, no external assets. Faces look along -Y; Z is up.
"""
import argparse, importlib.util, json, math, struct, sys, zlib
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, Quaternion

spec = importlib.util.spec_from_file_location('conforming_eye', str(Path(__file__).with_name('conforming_eye.py')))
CE = importlib.util.module_from_spec(spec); spec.loader.exec_module(CE)
T = math.tau
Z = Vector((0, 0, 1))
CHARS = ('restaurant-otter', 'hotel-whale', 'pharmacy-shrimp', 'subway-ray', 'friend-seal', 'taxi-squid')
TILES = {
    'skin': (0, 0, 512, 1024),
    'eye_l': (512, 0, 256, 128),
    'eye_r': (512, 128, 256, 128),
    'cloth': (512, 256, 512, 384),
    'fin': (512, 640, 256, 384),
    'rim': (768, 640, 256, 384),
    'dark': (768, 0, 128, 128),
    'gold': (896, 0, 128, 128),
    'ivory': (768, 128, 256, 128),
}


def _pad(w, h):
    return min(14, min(w, h) // 10)


def uv(tile, u, v):
    x, y, w, h = TILES[tile]
    p = _pad(w, h)
    return ((x + p + u * (w - 2 * p)) / 1024, (y + p + v * (h - 2 * p)) / 1024)


def mix(a, b, t):
    return np.asarray(a) + (np.asarray(b) - np.asarray(a)) * np.asarray(t)[..., None]


def paint(a, c, t):
    return a + (np.asarray(c) - a) * np.clip(t, 0, 1)[..., None]


def cloud(u, v):
    return .45 * np.sin(19 * u + 23 * v + .5 * np.sin(11 * v)) + .3 * np.sin(43 * u - 37 * v) + .25 * np.sin(71 * u + 83 * v)


def mottle3(a, v, s1=3.0, s2=7.0, s3=13.0):
    """Smooth 3-octave periodic painterly skin/fur/scale mottling matching Hero Shelly's organic Nintendo craft."""
    w1 = np.sin(s1 * a + 11.0 * v + .85 * np.sin(5.0 * v))
    w2 = np.sin(s2 * a - 23.0 * v + .65 * np.cos(s1 * a + 9.0 * v))
    w3 = np.cos(s3 * a + 41.0 * v - .55 * np.sin(s2 * a - 15.0 * v))
    return (.52 * w1 + .32 * w2 + .16 * w3)


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


def smooth_w(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3.0 - 2.0 * t)


def _limb_w(parent_bone, child_bone, t0=.02, t1=.34):
    """Smooth gradient bone weight falloff from parent_bone at limb root (v=0) to child_bone along limb."""
    def fn(p, u, v):
        w = smooth_w(t0, t1, v)
        return {parent_bone: 1.0 - w, child_bone: w}
    return fn


def curve(points, t):
    """Connect control stations with a cardinal interpolating spline."""
    q = max(0.0, min(len(points) - 1.000001, t))
    i = int(q)
    u = q - i
    a, b, c, d = (points[max(0, i - 1)], points[i], points[i + 1], points[min(i + 2, len(points) - 1)])
    return tuple(
        b0 + .5 * u * ((c0 - a0) + u * ((2 * a0 - 5 * b0 + 4 * c0 - d0) + u * (3 * b0 - 3 * c0 + d0 - a0)))
        for a0, b0, c0, d0 in zip(a, b, c, d)
    )


def paint_whale_eye_v25(u, v):
    """v25 Minor #4: Tightened 76-78% iris-fill conforming sapphire eye for hotel-whale using CE palettes & skin map."""
    dark, bright, _glow, skin_fb = CE.PALETTES['hotel-whale']
    a = T * u
    ex, ey = v * np.cos(a), v * np.sin(a)
    skin = CE._lookup(CE.SKIN_MAPS['hotel-whale'], ex, ey) if 'hotel-whale' in CE.SKIN_MAPS else np.broadcast_to(np.asarray(skin_fb, float), ex.shape + (3,))
    pr = np.hypot(ex + .028, ey - .010)
    pang = np.arctan2(ey - .010, ex + .028)
    fiber = (np.sin(51 * pang + .8 * np.sin(11 * pang)) * np.sin(8 * pang - 12 * pr) + .6 * np.cos(83 * pang + pr * 35)) / 1.6
    gradient = np.clip(.54 - .84 * ey + .12 * fiber, 0, 1)
    iris = CE._mix(dark, bright, gradient)
    # Rich luminous aquamarine lower-iris crescent (vibrant chroma so it never washes out into white sclera)
    iris = CE._mix(iris, (118, 212, 255), .56 * CE.smooth(.08, -.54, ey) * CE.smooth(.28, .54, v))
    # Soulful deep obsidian-navy pupil
    c = CE._mix(iris, (14, 16, 28), CE.smooth(.388, .338, pr))
    # Crisp slim dark sapphire limbus ring cleanly at v = 0.768 -> colored iris fills 76-78% of visible eye aperture!
    limbus = CE._mix(dark, (12, 18, 36), .62)
    c = CE._mix(c, limbus, CE.smooth(.736, .762, v) * (1.0 - CE.smooth(.776, .796, v)))
    aperture = v + .018 * CE.smooth(.06, .66, ey)
    # Slim crisp pearl-white sclera ring (v ~ 0.784..0.858 -> (0.752/0.858)^2 = 76.8% iris fill!)
    sclera = CE._mix((250, 248, 244), (218, 222, 232), .28 * CE.smooth(.08, .68, ey))
    c = CE._mix(c, sclera, CE.smooth(.776, .792, aperture))
    lash_col = CE._mix(skin * .45, (28, 48, 86), .55)
    lash = np.exp(-((aperture - .852) / .015) ** 2) * (.68 * CE.smooth(.06, .54, ey))
    c = CE._mix(c, lash_col, lash)
    c = CE._mix(c, skin, CE.smooth(.844, .894, aperture))
    crease = CE.smooth(.12, .70, ey) * np.exp(-((v - .902) / .032) ** 2)
    c = CE._mix(c, skin * .88, crease * .22)
    # Bold sparkling pure-white twin catchlights
    c = CE._mix(c, (255, 255, 255), 1.0 * CE.smooth(1.0, .36, np.hypot((ex + .195) / .192, (ey - .236) / .192)))
    c = CE._mix(c, (255, 255, 255), .99 * CE.smooth(1.0, .34, np.hypot((ex - .195) / .114, (ey + .195) / .114)))
    rough = .08 + .76 * CE.smooth(.79, .88, aperture)
    return c, rough


def paint_tile(char, name, u, v):
    n = cloud(u, v)
    zero = np.zeros_like(u)
    rough = np.full_like(u, .84)
    metal = zero

    if name in ('eye', 'eye_l', 'eye_r'):
        # v40 Diverse Mario Party conforming eyes: species-specific almond/upright-oval/half-lidded shapes, glossy 0.06 cornea & 0.90 velvet lids.
        rgb, rough = CE.paint_eye(char, u, v, side=(-1 if name == 'eye_l' else 1))

    elif name == 'skin':
        a = T * u
        front = (.5 + .5 * np.cos(a)) ** 2.2
        side = np.abs((u + .5) % 1 - .5)
        pm = mottle3(a, v)
        if char == 'restaurant-otter':
            # v40: Painterly velvety toasted-cinnamon otter fur with multi-octave fur mottling, warm cream face/belly,
            # soft subsurface cheek/muzzle warmth, and baked neck/under-chin/apron-collar AO!
            belly = front * np.clip((v - .42) * 2.2, 0, 1) * np.clip((.92 - v) * 4.0, 0, 1)
            heart_x = np.abs(side)
            heart_mask = np.exp(-((heart_x / .145) ** 2 + ((v - .225 - .028 * np.cos(heart_x * 24)) / .115) ** 2))
            rgb = mix((162, 108, 74), (212, 158, 118), .46 + .20 * np.sin(math.pi * v) + .055 * pm + .02 * n)
            # Subtle warm sunlit fur dappling on shoulders & crown
            rgb = paint(rgb, (226, 178, 138), np.clip((pm - .22) * 1.4, 0, 1) * (1.0 - heart_mask * .7) * .22)
            rgb = paint(rgb, (252, 240, 224), np.clip(belly + heart_mask * .96, 0, 1) * .92)
            # Soft baked under-chin & neck-collar ambient occlusion crease
            neck_ao = np.exp(-(((v - .365) / .034) ** 2)) * (.55 + .45 * front)
            rgb = paint(rgb, (124, 78, 54), neck_ao * .34)
            # Warm rosy subsurface cheek blush on outer face mask
            cheek = np.exp(-(((side - .118) / .044) ** 2 + ((v - .264) / .036) ** 2))
            rgb = paint(rgb, (246, 124, 122), cheek * .82)
            # Soft warm caramel brow shading above tall upright oval eyes
            brow = np.exp(-(((side - .074) / .034) ** 2 + ((v - .130) / .020) ** 2))
            rgb = paint(rgb, (148, 96, 70), brow * .38)
            rough = np.full_like(u, .90)
        elif char == 'hotel-whale':
            # v40: Painterly velvety coastal-cerulean whale skin with organic multi-octave marine mottling, warm rosy cheek &
            # flipper-edge subsurface warmth, soft baked bellhop-collar crease AO, and pearl-cream rorqual belly!
            pm_w = mottle3(u * math.pi, v, 4.0, 9.0, 15.0)
            crown_col = np.array([34, 98, 184], float)
            cerulean = np.array([62, 136, 212], float)
            sky_flank = np.array([120, 180, 232], float)
            t_upper = np.clip(v / .35, 0, 1)
            t_upper = t_upper * t_upper * (3.0 - 2.0 * t_upper)
            t_flank = np.clip((v - .32) / .29, 0, 1)
            t_flank = t_flank * t_flank * (3.0 - 2.0 * t_flank)
            rgb = crown_col + (cerulean - crown_col) * t_upper[..., None]
            rgb = rgb + (sky_flank - rgb) * (t_flank * .84)[..., None]
            mantle = (np.clip((.34 - v) / .34, 0, 1) ** 1.25) * (.58 + .42 * np.sin(math.pi * u))
            rgb = paint(rgb, (24, 84, 172), mantle * .34)
            # Painterly multi-octave coastal marine mottling on upper back/flanks (off face center)
            back_m = np.clip((u - .24) * 3.5, 0, 1) * np.clip((.62 - v) * 3.5, 0, 1)
            rgb = paint(rgb, (96, 168, 228), np.clip((pm_w - .15) * 1.5, 0, 1) * back_m * .24)
            rgb = paint(rgb, (28, 76, 154), np.clip((-pm_w - .20) * 1.4, 0, 1) * back_m * .18)
            rgb = np.clip(rgb + (pm_w[..., None] * 4.5), 0, 255)
            # Soft baked ambient occlusion crease along standing bellhop jacket collar seam (u ~ 0.42..0.52)
            collar_ao = np.exp(-(((u - .46) / .042) ** 2)) * (1.0 - np.clip((v - .75) * 4.0, 0, 1) * .5)
            rgb = paint(rgb, (24, 56, 114), collar_ao * .32)
            snout_hi = np.exp(-((u / .16) ** 2 + ((v - .49) / .13) ** 2))
            rgb = paint(rgb, (148, 198, 240), snout_hi * .20)
            belly_t = np.clip((v - .59) / .13, 0, 1)
            belly_mask = belly_t * belly_t * (3.0 - 2.0 * belly_t)
            belly_col = mix((248, 240, 224), (255, 250, 238), .50 + .30 * (1.0 - np.abs(u - .25)) + .02 * pm_w)
            pleat_zone = belly_mask * np.clip((.44 - u) / .14, 0, 1) * np.clip((v - .68) / .10, 0, 1) * np.clip((.94 - v) / .08, 0, 1)
            pleat = (.5 + .5 * np.cos(u * 48.0 * math.pi)) ** 6
            belly_col = paint(belly_col, (206, 214, 226), pleat * pleat_zone * .26)
            rgb = rgb + (belly_col - rgb) * belly_mask[..., None]
            cheek = np.exp(-(((u - .272) / .060) ** 2 + ((v - .558) / .040) ** 2))
            rgb = paint(rgb, (248, 134, 146), cheek * .66)
            # Warm expressive arched brows matching the sculpted half-lidded brow ridges
            brow = np.exp(-(((u - .232) / .054) ** 2 + ((v - .246 - .015 * ((u - .232) / .054) ** 2) / .011) ** 2))
            rgb = paint(rgb, (16, 40, 88), brow * .74)
            u_s = np.clip(u / .185, 0, 1)
            smile_v = .612 - .052 * (u_s ** 1.9)
            smile_end = np.clip((1.0 - (u / .188) ** 3.6), 0, 1)
            smile_mask = np.exp(-((v - smile_v) / .0102) ** 2) * smile_end * 1.38
            rgb = paint(rgb, (18, 34, 64), np.clip(smile_mask, 0, 1) * .94)
            rough = np.full_like(u, .89)
        elif char == 'pharmacy-shrimp':
            # v40: Velvety organic coral-peach shrimp cuticle with painterly mottling & segment-overlap crease AO
            pm_s = mottle3(u * math.pi, v, 4.0, 9.0, 15.0)
            base_rgb = mix((244, 154, 130), (255, 216, 196), .44 + .30 * np.sin(math.pi * u) + .045 * pm_s)
            belly_grad = np.clip((u - .40) / .48, 0, 1) * np.clip((v - .18) * 5.0, 0, .86)
            base_rgb = paint(base_rgb, (255, 238, 220), belly_grad)
            cheek = np.exp(-(((u - .298) / .082) ** 2 + ((v - .126) / .030) ** 2))
            cheek_core = np.exp(-(((u - .298) / .046) ** 2 + ((v - .126) / .018) ** 2))
            base_rgb = paint(base_rgb, (252, 112, 128), cheek * .84)
            base_rgb = paint(base_rgb, (255, 148, 158), cheek_core * .36)
            pv = np.clip((v - .44) / .34, 0, 1)
            plate_rgb = mix((246, 158, 132), (255, 212, 188), .38 + .42 * (1.0 - .45 * u) * np.exp(-((pv - .38) / .30) ** 2) + .035 * pm_s)
            plate_rgb = paint(plate_rgb, (198, 100, 78), np.clip((.18 - pv) / .18, 0, 1) * .42)
            band_t = np.clip((pv - .66) / .08, 0, 1) * np.clip((.94 - pv) / .06, 0, 1)
            band_t = band_t * band_t * (3.0 - 2.0 * band_t)
            plate_rgb = paint(plate_rgb, (218, 92, 68), band_t * .92)
            lip_hi = np.exp(-((pv - .955) / .032) ** 2)
            plate_rgb = paint(plate_rgb, (255, 228, 210), lip_hi * .68)
            tv = np.clip((v - .78) / .22, 0, 1)
            tail_rgb = mix((246, 160, 134), (255, 212, 190), .45 * (1.0 - tv) + .20 * (1.0 - u) + .03 * pm_s)
            tail_band = np.clip((tv - .50) / .10, 0, 1) * np.clip((.92 - tv) / .08, 0, 1)
            tail_band = tail_band * tail_band * (3.0 - 2.0 * tail_band)
            tail_rgb = paint(tail_rgb, (220, 92, 68), tail_band * .94)
            tail_rim = np.exp(-((tv - .94) / .045) ** 2)
            tail_rgb = paint(tail_rgb, (255, 228, 210), tail_rim * .65)
            in_plate = np.clip((v - .432) / .012, 0, 1) * np.clip((.786 - v) / .012, 0, 1)
            in_tail = np.clip((v - .774) / .012, 0, 1)
            rgb = base_rgb * (1.0 - in_plate[..., None]) + plate_rgb * in_plate[..., None]
            rgb = rgb * (1.0 - in_tail[..., None]) + tail_rgb * in_tail[..., None]
            rough = np.full_like(u, .88)
        elif char == 'subway-ray':
            # v40: Velvety marine periwinkle-cerulean manta coat with painterly organic ocean mottling, proportional
            # brow & cheek placement matching the fuller arched dorsal head dome & 0.68x almond-oval eyes!
            belly = np.clip((v - .51) * 8.0, 0, 1)
            rgb = mix((54, 92, 146), (108, 152, 204), .46 + .24 * np.sin(math.pi * v) + .055 * pm)
            face_clear = np.clip((side - .14) * 7.0 + np.clip((.24 - v) * 6.0, 0, 1), 0, 1)
            # Soft painterly oceanic dappling along dorsal shoulders & wing roots
            spot = (.5 + .5 * np.sin(5 * a + 12 * v)) ** 8 * (1 - belly) * face_clear
            rgb = paint(rgb, (148, 192, 236), spot * .40)
            rgb = paint(rgb, (42, 72, 122), np.clip((-pm - .24) * 1.4, 0, 1) * (1 - belly) * face_clear * .22)
            # Subtle baked cap-rim AO & dorsal-ventral seam shading
            cap_ao = np.exp(-((v - .145) / .030) ** 2) * (1 - belly)
            rgb = paint(rgb, (34, 58, 98), cap_ao * .28)
            # Refined friendly arched brows cleanly above the proportionate 0.68x sleek almond-oval eyes
            brow_v = .245 + .014 * ((side - .072) / .034) ** 2
            brow = np.exp(-(((side - .072) / .032) ** 2 + ((v - brow_v) / .010) ** 2)) * (1 - belly)
            rgb = paint(rgb, (30, 52, 90), brow * .66)
            # Warm rosy subsurface cheek blush right beneath & outboard of the sleek almond eyes
            cheek = np.exp(-(((side - .118) / .038) ** 2 + ((v - .418) / .030) ** 2)) * (1 - belly * .8)
            rgb = paint(rgb, (248, 128, 152), cheek * .82)
            rgb = paint(rgb, (248, 244, 232), belly * .96)
            rough = np.full_like(u, .89)
        elif char == 'friend-seal':
            # v40: Velvety pearl-silver & warm cream harbor-seal coat with painterly fur mottling, warm muzzle/cheek subsurface
            # glow & baked neckerchief collar AO!
            is_body = np.clip((v - .445) / .02, 0, 1)
            hv = np.clip(v / .44, 0, 1)
            pm_f = mottle3(u * math.pi, v, 3.0, 7.0, 13.0)
            head_rgb = mix((182, 176, 172), (230, 224, 218), .42 + .32 * np.sin(math.pi * hv) + .14 * (1.0 - u) + .040 * pm_f)
            chin_cream = np.clip((hv - .58) * 3.0, 0, 1) * np.clip((.48 - u) * 3.0, 0, 1)
            head_rgb = paint(head_rgb, (250, 242, 228), chin_cream * .76)
            # Soft baked under-chin / neck collar AO crease
            chin_ao = np.exp(-(((hv - .92) / .08) ** 2))
            head_rgb = paint(head_rgb, (142, 134, 132), chin_ao * .34)
            brow = np.exp(-(((u - .185) / .040) ** 2 + ((v - .108) / .012) ** 2))
            head_rgb = paint(head_rgb, (124, 116, 118), brow * .48)
            cheek = np.exp(-(((u - .348) / .062) ** 2 + ((v - .284) / .030) ** 2))
            head_rgb = paint(head_rgb, (248, 138, 142), cheek * .66)
            bv = np.clip((v - .46) / .54, 0, 1)
            belly_b = np.clip((u - .52) * 3.2, 0, 1) * np.clip((.92 - bv) * 3.0, 0, 1)
            body_rgb = mix((174, 168, 166), (224, 218, 212), .44 + .24 * np.sin(math.pi * bv) + .045 * pm_f)
            body_rgb = paint(body_rgb, (250, 242, 228), belly_b * .88)
            # Soft baked neckerchief collar AO on upper chest/shoulders
            body_rgb = paint(body_rgb, (132, 126, 128), np.exp(-(((bv - .08) / .06) ** 2)) * .36)
            rng = np.random.default_rng(79)
            spots = np.zeros_like(u)
            for _ in range(52):
                cx = rng.uniform(.04, .56)
                cy = rng.uniform(.54, .94)
                rx = rng.uniform(.018, .034)
                ry = rng.uniform(.014, .026)
                x0, x1 = np.searchsorted(u[0], (cx - 4 * rx, cx + 4 * rx))
                y0, y1 = np.searchsorted(v[:, 0], (cy - 4 * ry, cy + 4 * ry))
                d = ((u[y0:y1, x0:x1] - cx) / rx) ** 2 + ((v[y0:y1, x0:x1] - cy) / ry) ** 2
                spots[y0:y1, x0:x1] += np.exp(-d)
            body_rgb = paint(body_rgb, (130, 124, 132), np.clip(spots, 0, 1) * .32 * (1.0 - .85 * belly_b))
            rgb = head_rgb * (1.0 - is_body[..., None]) + body_rgb * is_body[..., None]
            rough = np.full_like(u, .90)
        elif char == 'taxi-squid':
            # v40 Authentic Squid Anatomy: velvety pearl-orchid pointed torpedo mantle -> crisp shaded mantle collar seam ->
            # warm rosy-peach smiling face below the collar with painterly cephalopod mottling & warm cheeks!
            # v in [0..0.52] = tall pointed torpedo mantle (apex at v=0, crisp collar rim at v~0.50); v in [0.54..1.0] = head!
            tv = np.clip((v - .10) / .78, 0, 1)
            tv = tv * tv * (3.0 - 2.0 * tv)
            rgb = mix((148, 102, 214), (252, 178, 204), tv * .90 + .05 * pm)
            # Subtle deepened royal-orchid dorsal/apex mantle shading + painterly organic chromatophore spots on mantle!
            apex_d = np.clip((.28 - v) / .28, 0, 1) ** 1.3
            rgb = paint(rgb, (124, 78, 196), apex_d * .46)
            mantle_m = np.clip((.48 - v) / .12, 0, 1) * np.clip((v - .06) / .10, 0, 1)
            spots = np.exp(-((((u * 10) % 1) - .5) / .18) ** 2 - ((((v * 14) % 1) - .5) / .18) ** 2) * (.5 + .5 * np.sin(u * 61 + v * 37)) ** 2
            rgb = paint(rgb, (242, 166, 212), spots * .42 * mantle_m)
            rgb = paint(rgb, (194, 144, 236), np.clip((pm - .20) * 1.5, 0, 1) * mantle_m * .22)
            # v41 MIN-1: Smooth organic transition from pearl-orchid pointed torpedo mantle into rosy-peach head (NO stiff collar brim line!)
            waist_ao = np.exp(-(((v - .525) / .042) ** 2))
            rgb = paint(rgb, (162, 104, 174), waist_ao * .22)
            # Soft warm sunlit peach-blush face front strictly BELOW the tapered mantle waist
            face_zone = np.clip((v - .55) / .16, 0, 1)
            rgb = paint(rgb, (255, 228, 224), front * face_zone * .62)
            # Crisp subtle angled plum-ink brows harmonizing with the +18 deg Splatoon cat-almond eyes
            brow_v = .595 - .022 * ((side - .088) / .038)
            brow = np.exp(-(((side - .090) / .036) ** 2 + ((v - brow_v) / .010) ** 2))
            rgb = paint(rgb, (96, 42, 86), brow * .50)
            # Warm rosy subsurface cheek blushes beneath & outboard of each almond eye
            cheek = np.exp(-(((side - .138) / .046) ** 2 + ((v - .768) / .042) ** 2))
            rgb = paint(rgb, (250, 102, 128), cheek * .82)
            rough = np.full_like(u, .89)

    elif name == 'cloth':
        weave = .025 * np.sin(160 * T * u) + .025 * np.sin(140 * T * v) + .03 * n
        if char == 'taxi-squid':
            # Iconic yellow-and-charcoal checkered harbor taxi driver cap (velvety cloth matte-satin)!
            cu = np.floor(u * 12)
            cv = np.floor(v * 5)
            chk = ((cu + cv) % 2)
            yel = mix((255, 194, 24), (255, 228, 86), .50 + .35 * np.sin(math.pi * v) + .03 * n)
            blk = mix((22, 24, 32), (50, 52, 66), .35 + .25 * v)
            rgb = mix(blk, yel, chk * np.ones_like(u))
            rough = np.full_like(u, .88)
        elif char == 'restaurant-otter':
            # m7 v29: Dual-zone tailored coral-and-cream bistro apron atlas:
            #   v in [0.00, 0.72): Pleated bistro skirt (aligned 1:1 with 5 sculpted 3D vertical pleats + bold coral bottom hem band & side piping)
            #   v in [0.72, 1.00]: u < 0.50 = tailored cream bistro chest bib (coral trim & vertical pintuck seams);
            #                      u >= 0.50 = 3D front bistro pocket (coral scalloped top welt, warm stitched outline & embroidered coral scallop shell!)
            sv = np.clip(v / .72, 0, 1)
            skirt = mix((242, 232, 212), (255, 250, 240), .56 + weave)
            # Soft warm parchment depth shading nested inside the 4 sculpted pleat valleys (cos(5*pi*(2u-1)) < 0)
            pleat_val = np.clip(-np.cos(5.0 * math.pi * (2.0 * u - 1.0)), 0, 1) ** 1.35
            pleat_hi = np.clip(np.cos(5.0 * math.pi * (2.0 * u - 1.0)), 0, 1) ** 1.6
            skirt = paint(skirt, (216, 198, 174), pleat_val * (.34 * np.clip(sv * 1.4, .25, 1.0)))
            skirt = paint(skirt, (255, 252, 244), pleat_hi * .24)
            # Crisp coral-terracotta bottom bistro hem stripe + delicate cream topstitching + side border trim
            hem_band = np.clip((sv - .84) / .035, 0, 1) * np.clip((.97 - sv) / .025, 0, 1)
            hem_band = hem_band * hem_band * (3.0 - 2.0 * hem_band)
            skirt = paint(skirt, (226, 98, 80), hem_band * .95)
            hem_stitch = np.exp(-((sv - .825) / .010) ** 2)
            skirt = paint(skirt, (232, 120, 100), hem_stitch * .72)
            side_trim = np.clip((.045 - np.minimum(u, 1.0 - u)) / .020, 0, 1)
            skirt = paint(skirt, (228, 104, 86), side_trim * .82)
            # Upper zone: bib (u < 0.50) and 3D pocket (u >= 0.50)
            uv_top = np.clip((v - .72) / .28, 0, 1)
            bu = np.clip(u / .50, 0, 1)
            bib = mix((244, 234, 216), (255, 250, 240), .58 + weave)
            # Subtle twin vertical tailored pintuck seams + crisp coral edge piping on bib
            pintuck = np.exp(-((np.abs(bu - .5) - .22) / .016) ** 2) * np.clip(uv_top * 5.0, 0, 1) * np.clip((1.0 - uv_top) * 5.0, 0, 1)
            bib = paint(bib, (216, 194, 168), pintuck * .50)
            bib_e = np.minimum(np.minimum(bu, 1.0 - bu), 1.0 - uv_top)
            bib = paint(bib, (226, 98, 80), np.clip((.075 - bib_e) / .028, 0, 1) * .92)
            pu = np.clip((u - .50) / .50, 0, 1)
            pocket = mix((244, 235, 218), (255, 250, 240), .58 + weave)
            # Crisp coral-terracotta top pocket welt band (uv_top near 1.0 = top of pocket)
            welt = np.clip((uv_top - .80) / .05, 0, 1)
            pocket = paint(pocket, (226, 98, 80), welt * .94)
            # Warm stitched perimeter along sides & bottom of 3D pocket
            p_edge = np.minimum(np.minimum(pu, 1.0 - pu), uv_top)
            p_st = np.exp(-((p_edge - .065) / .018) ** 2) * (uv_top < .80)
            pocket = paint(pocket, (194, 134, 102), p_st * .78)
            # Bold embroidered coral scallop shell emblem centered on the 3D pocket!
            sx, sy = (pu - .50) / .22, (uv_top - .42) / .22
            sr = np.sqrt(sx ** 2 + sy ** 2)
            sa = np.arctan2(sx, sy + 1e-6)
            shell = np.clip((1.0 - .11 * np.cos(sa * 6) - sr) * 12.0, 0, 1) * np.clip((sy + .46) * 10.0, 0, 1)
            ribs = np.exp(-((np.sin(sa * 5)) / .28) ** 2) * shell * np.clip((.86 - sr) * 8.0, 0, 1)
            pocket = paint(pocket, (232, 104, 84), shell * .90)
            pocket = paint(pocket, (254, 236, 206), ribs * .56)
            is_top = (v >= .72).astype(float)
            is_pock = (u >= .50).astype(float)
            top_rgb = bib * (1.0 - is_pock[..., None]) + pocket * is_pock[..., None]
            rgb = skirt * (1.0 - is_top[..., None]) + top_rgb * is_top[..., None]
            rough = np.full_like(u, .90)
        elif char == 'hotel-whale':
            # v35 D1: Rich royal grand-hotel burgundy/claret broadcloth contrasting crisply against
            # the deepened cerulean coastal-blue crown (#6ea8e0) and gleaming gold braid trim!
            weave_w = .012 * np.sin(110 * T * u) + .012 * np.sin(100 * T * v)
            rgb = mix((78, 14, 32), (148, 30, 54), .46 + .16 * (1.0 - v) + .025 * n + weave_w)
            rough = np.full_like(u, .90)
        elif char == 'pharmacy-shrimp':
            # Crisp white apothecary fabric with mint-teal trim & mint cross emblem.
            rgb = mix((238, 242, 238), (254, 255, 252), .58 + weave)
            trim = np.exp(-((v - .10) / .05) ** 2)
            rgb = paint(rgb, (92, 174, 158), trim * .90)
            # Mint cross at u=0.5, v=0.52 (front of cap)
            cross_v = (np.abs(u - .5) < .038) & (np.abs(v - .54) < .14)
            cross_h = (np.abs(u - .5) < .095) & (np.abs(v - .54) < .055)
            rgb = paint(rgb, (88, 172, 154), (cross_v | cross_h).astype(float) * .92)
            rough = np.full_like(u, .89)
        elif char == 'subway-ray':
            rgb = mix((30, 52, 84), (54, 82, 120), .50 + weave)
            band = np.exp(-((v - .08) / .045) ** 2)
            rgb = paint(rgb, (162, 52, 72), band * .92)
            rough = np.full_like(u, .89)
        else:  # friend-seal
            # M5 v20: Cozy bold coral-and-cream nautical striped harbor neckerchief (crisp smooth woven stripes!).
            stripe_w = .5 + .5 * np.cos(T * u * 7.0)
            stripe_mask = np.clip((stripe_w - .42) / .16, 0, 1)
            rgb = mix((218, 76, 68), (242, 108, 94), .48 + .04 * n)
            cream = mix((246, 236, 218), (255, 248, 236), .52 + .02 * n)
            rgb = rgb * (1.0 - stripe_mask[..., None]) + cream * stripe_mask[..., None]
            edge = np.minimum(v, 1.0 - v)
            rgb = paint(rgb, (186, 56, 50), np.exp(-((edge - .06) / .028) ** 2) * .72)
            rough = np.full_like(u, .90)

    elif name == 'fin':
        weave = .025 * np.sin(140 * T * u) + .025 * np.sin(130 * T * v) + .03 * n
        if char == 'restaurant-otter':
            rgb = mix((218, 96, 80), (246, 142, 122), .48 + weave + .15 * v)
        elif char == 'hotel-whale':
            rgb = mix((186, 148, 82), (232, 196, 128), .50 + weave + .18 * v)
        elif char == 'pharmacy-shrimp':
            rgb = mix((88, 158, 146), (138, 206, 192), .48 + weave + .18 * v)
        elif char == 'subway-ray':
            rgb = mix((136, 42, 62), (184, 68, 90), .48 + weave + .18 * v)
        elif char == 'taxi-squid':
            # Sleek spearhead orchid-lavender to warm blush-rose squid mantle fins with pearl-pink outer rim!
            rgb = mix((144, 98, 212), (246, 158, 202), .18 + .66 * v + .02 * n)
            rgb = paint(rgb, (255, 218, 232), np.clip((v - .78) / .22, 0, 1) * .64)
        else:
            rgb = mix((168, 160, 156), (208, 200, 194), .45 + .22 * v + .04 * n)
        rough = np.full_like(u, .89)

    elif name == 'rim':
        if char == 'restaurant-otter':
            rgb = mix((218, 174, 146), (242, 204, 178), .48 + .2 * v + .04 * n)
        elif char == 'hotel-whale':
            rgb = mix((82, 140, 208), (126, 178, 232), .45 + .2 * v + .04 * n)
        elif char == 'pharmacy-shrimp':
            rgb = mix((222, 106, 82), (250, 174, 148), .34 + .46 * v + .03 * n)
        elif char == 'subway-ray':
            rgb = mix((46, 74, 112), (84, 122, 168), .45 + .2 * v + .05 * n)
        elif char == 'taxi-squid':
            # Curled orchid-coral squid tentacles & arms with luminous cream-peach underside & clear cream sucker pads!
            rgb = mix((236, 142, 188), (255, 204, 214), np.clip(v, 0, 1) * .76 + .02 * n)
            rgb = paint(rgb, (255, 236, 228), np.clip((v - .78) / .22, 0, 1) * .62)
            # Soft baked root ambient occlusion where tentacles emerge under collar
            rgb = paint(rgb, (162, 86, 126), np.exp(-((v / .08) ** 2)) * .36)
            u_in = np.abs((u + .5) % 1.0 - .5)
            under = np.exp(-((u_in / .19) ** 2))
            rgb = paint(rgb, (255, 228, 224), under * .44)
            pad_r = np.hypot(((v * 10.0) % 1.0 - .5) / .28, (u_in / .11))
            pad_ring = np.exp(-((pad_r - .68) / .24) ** 2)
            pad_fill = np.clip((.92 - pad_r) * 3.5, 0, 1)
            rgb = paint(rgb, (255, 246, 236), pad_fill * .82 * np.clip((v - .08) / .10, 0, 1) * np.clip((.94 - v) / .08, 0, 1))
            rgb = paint(rgb, (218, 134, 166), pad_ring * .45 * np.clip((v - .08) / .10, 0, 1) * np.clip((.94 - v) / .08, 0, 1))
        else:
            rgb = mix((176, 168, 164), (216, 208, 202), .45 + .2 * v + .05 * n)
        rough = np.full_like(u, .89)

    elif name == 'dark':
        if char == 'subway-ray':
            # Crisp clean dark navy-charcoal visor & smile (matte-satin, zero noise flecks).
            rgb = mix((18, 26, 44), (30, 42, 66), .30 + .35 * v)
            rough = np.full_like(u, .68)
        elif char == 'taxi-squid':
            # Dual-zone: v < 0.50 = glossy charcoal taxi cap visor & band; v >= 0.50 = warm berry-plum curved smile!
            is_sm = (v >= .50).astype(float)
            vis = mix((20, 22, 30), (48, 50, 62), .30 + .40 * (v / .50))
            sm = mix((112, 46, 72), (154, 72, 96), .40 + .35 * ((v - .50) / .50))
            rgb = vis * (1.0 - is_sm[..., None]) + sm * is_sm[..., None]
            rough = np.where(v < .50, .36, .64)
        elif char == 'friend-seal':
            # m9 v23: Dual-zone tile: v < 0.50 = cute glossy warm-espresso button nose; v >= 0.50 = warm brightened rosy-cocoa smile!
            is_smile = (v >= .50).astype(float)
            nose_col = mix((38, 24, 24), (62, 40, 36), .25 + .45 * (v / .50))
            smile_col = mix((84, 42, 40), (118, 62, 56), .35 + .45 * ((v - .50) / .50))
            rgb = nose_col * (1.0 - is_smile[..., None]) + smile_col * is_smile[..., None]
            rough = np.where(v < .50, .14, .46)
        elif char == 'pharmacy-shrimp':
            # m3 v29: Rich warm-mahogany expressive curved smile (matte-satin, crisp & warm, zero black dash or wet glare!).
            rgb = mix((72, 22, 20), (108, 36, 30), .32 + .42 * v)
            rough = np.full_like(u, .50)
        else:
            rgb = mix((24, 20, 22), (54, 38, 34), .22 + .35 * v)
            rough = np.full_like(u, .14)

    elif name == 'ivory':
        if char == 'restaurant-otter':
            grain = .04 * np.sin(36 * u + 10 * np.sin(8 * v))
            rgb = mix((212, 162, 114), (248, 224, 192), .42 + .40 * v + grain)
            rough = np.full_like(u, .80)
        elif char == 'pharmacy-shrimp':
            # Dual-zone tile: v < 0.50 = warm natural cork stopper; v >= 0.50 = cream parchment apothecary label with emerald cross & border.
            is_label = (v >= .50).astype(float)
            speck = .5 + .5 * np.sin(91 * u + 73 * v) * np.cos(67 * u - 109 * v)
            cork = mix((168, 120, 72), (214, 168, 114), .48 + .28 * (v * 2.0) + .12 * n)
            cork = paint(cork, (124, 82, 46), (speck ** 5) * .42)
            lv = np.clip((v - .50) / .50, 0, 1)
            lbl = mix((242, 234, 212), (254, 250, 238), .52 + .03 * n)
            border = np.exp(-((lv - .10) / .032) ** 2) + np.exp(-((lv - .90) / .032) ** 2)
            lbl = paint(lbl, (42, 134, 108), np.clip(border, 0, 1) * .88)
            cv = (np.abs(u - .50) < .036) & (np.abs(lv - .50) < .24)
            ch = (np.abs(u - .50) < .092) & (np.abs(lv - .50) < .092)
            lbl = paint(lbl, (36, 146, 114), (cv | ch).astype(float) * .94)
            rgb = cork * (1.0 - is_label[..., None]) + lbl * is_label[..., None]
            rough = np.where(v < .50, .88, .78)
        else:
            rgb = mix((236, 220, 194), (254, 248, 232), .40 + .50 * v + .03 * n)
            rough = np.full_like(u, .80)

    else:  # gold / brass (or emerald apothecary glass for pharmacy-shrimp)
        if char == 'pharmacy-shrimp':
            # Luminous glossy emerald-glass apothecary herb bottle with sunlit botanical jade refraction sheen.
            sheen = np.exp(-(((u - .34) / .13) ** 2)) * np.clip(1.0 - np.abs(v - .48) * 1.4, 0, 1)
            rgb = mix((14, 102, 78), (44, 184, 142), .36 + .40 * np.sin(math.pi * v) + .14 * np.cos(T * u) + .04 * n)
            rgb = paint(rgb, (164, 244, 206), sheen * .58)
            rgb = paint(rgb, (10, 68, 54), np.exp(-((v - .08) / .08) ** 2) * .45)
            rough = np.full_like(u, .14)
            metal = np.full_like(u, .04)
        elif char == 'hotel-whale':
            # v35 D1: Gleaming grand-hotel burnished gold braid, cap trim & brass buttons contrasting crisply with burgundy.
            rgb = mix((196, 142, 40), (255, 224, 114), .56 + .28 * v + .03 * n)
            rough = np.full_like(u, .30)
            metal = np.full_like(u, .40)
        else:
            rgb = mix((168, 114, 42), (242, 198, 96), .55 + .26 * v + .03 * n)
            rough = np.full_like(u, .38)
            metal = np.full_like(u, .28)

    return rgb, rough, metal


def atlas(char, out, size):
    color = np.full((size, size, 3), 128, np.uint8)
    sur = np.zeros_like(color)
    f = size / 1024
    for name, tile in TILES.items():
        x, y, w, h = (int(n * f) for n in tile)
        p = _pad(tile[2], tile[3]) * f
        u, v = np.meshgrid((np.arange(w) + .5 - p) / (w - 2 * p), (np.arange(h) + .5 - p) / (h - 2 * p))
        u, v = np.clip(u, 0, 1), np.clip(v, 0, 1)
        rgb, r, m = paint_tile(char, name, u, v)
        color[y:y + h, x:x + w] = np.uint8(np.clip(rgb, 0, 255))
        sur[y:y + h, x:x + w, 0] = 255
        sur[y:y + h, x:x + w, 1] = np.uint8(np.clip(r * 255, 0, 255))
        sur[y:y + h, x:x + w, 2] = np.uint8(m * 255)
    raw = out / f'color-{size}.png'
    jpg = out / f'color-{size}.jpg'
    surf = out / f'surface-{size // 4}.png'
    png(raw, color)
    im = bpy.data.images.load(str(raw))
    _ = im.size[:]
    im.file_format = 'JPEG'
    im.save(filepath=str(jpg), quality=90)
    bpy.data.images.remove(im)
    png(surf, np.uint8(sur.reshape(size // 4, 4, size // 4, 4, 3).mean(axis=(1, 3))))
    mat = bpy.data.materials.new(char + ' | painted organic atlas')
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

    def grid(self, fn, n, m, tile, bone, wrap=False, reverse=False, uvfn=None):
        off = len(self.v)
        cols = n if wrap else n + 1
        for j in range(m + 1):
            for i in range(cols):
                u, v = i / n, j / m
                p = Vector(fn(u, v))
                self.v.append(p)
                self.w.append(bone(p, u, v) if callable(bone) else {bone: 1})
        for j in range(m):
            for i in range(n):
                ids = (off + j * cols + i, off + j * cols + (i + 1) % cols, off + (j + 1) * cols + (i + 1) % cols, off + (j + 1) * cols + i)
                ts = ((i / n, j / m), ((i + 1) / n, j / m), ((i + 1) / n, (j + 1) / m), (i / n, (j + 1) / m))
                us = [uv(tile, *(uvfn(*t) if uvfn else t)) for t in ts]
                self.f.append(ids[::-1] if reverse else ids)
                self.uv.extend(us[::-1] if reverse else us)

    def ellipsoid(self, c, scale, tile, bone, n=20, m=12, uvfn=None):
        c = Vector(c)
        self.grid(
            lambda u, v: c + Vector((
                scale[0] * math.sin(math.pi * v) * math.sin(T * u),
                -scale[1] * math.sin(math.pi * v) * math.cos(T * u),
                scale[2] * math.cos(math.pi * v),
            )),
            n, m, tile, bone, True, True, uvfn=uvfn
        )

    def tube(self, fn, rad, n, m, tile, bone, flat=1, uvfn=None):
        def point(u, v):
            p = Vector(fn(v))
            t = (Vector(fn(min(1, v + .002))) - Vector(fn(max(0, v - .002)))).normalized()
            a = t.cross(Z)
            if a.length < .01:
                a = t.cross(Vector((1, 0, 0)))
            a.normalize()
            b = t.cross(a).normalized()
            r = rad(v) if callable(rad) else rad
            return p + r * (a * math.cos(T * u) + b * math.sin(T * u) * flat)
        self.grid(point, n, m, tile, bone, True, uvfn=uvfn)

    def object(self, mat, rig, name, ground=False):
        if ground:
            min_z = min(p.z for p in self.v)
            if abs(min_z) > 1e-4:
                for p in self.v:
                    p.z -= min_z
        me = bpy.data.meshes.new(name + ' continuous painted surfaces')
        me.from_pydata(self.v, [], self.f)
        me.update()
        me.uv_layers.new(name='Atlas').data.foreach_set('uv', np.ravel(self.uv))
        me.polygons.foreach_set('use_smooth', [True] * len(me.polygons))
        if callable(mat):
            mat = mat()   # lazy: atlas is painted after the conforming eyes sampled this character's skin
        me.materials.append(mat)
        ob = bpy.data.objects.new(name, me)
        bpy.context.collection.objects.link(ob)
        ob.parent = rig
        groups = {b.name: ob.vertex_groups.new(name=b.name) for b in rig.data.bones}
        for i, ws in enumerate(self.w):
            for bname, w in ws.items():
                if w > .0001:
                    groups[bname].add([i], w, 'REPLACE')
        mod = ob.modifiers.new('Marine gesture skeleton', 'ARMATURE')
        mod.object = rig
        return ob


CUR = {'char': None}
# Skin-atlas UV mapping used by each character's body grid, so the eye skirt can sample the exact local skin paint.
SKIN_UV = {
    'hotel-whale': lambda u, v: (np.abs((u + .5) % 1 - .5) * 2, v),
    'pharmacy-shrimp': lambda u, v: (np.abs((u + .5) % 1 - .5) * 2, .21 * v),
    'friend-seal': lambda u, v: (np.abs((u + .5) % 1 - .5) * 2, .44 * v),
}


def skin_sampler(char):
    def sample(us, vs):
        uu, vv = SKIN_UV.get(char, lambda u, v: (u, v))(us, vs)
        return paint_tile(char, 'skin', np.clip(uu, 0, 1), np.clip(vv, 0, 1))[0]
    return sample


def shelly_eye(mesh, side, n, m, axes, r, surface, res=None, bone_head='Head', depth=.21, swell=.045, lid_scale=1.0):
    """Conforming radial-disc eye with diverse Mario Party non-circular shapes, sculpted 3D lids/brow ridges & un-mirrored catchlights."""
    CE.calibrate_skin(CUR['char'], axes, r, surface, skin_sampler(CUR['char']))
    tile = 'eye_l' if side < 0 else 'eye_r'
    CE.conforming_eye(mesh, side, n, m, axes, r, surface, bone_head, depth=depth, res=res, swell=swell, tile=tile, lid_scale=lid_scale, char=CUR['char'])

# ---------------------------------------------------------------------------
# 1. SUBWAY RAY (v41 MIN-3: +35% Fuller Organically Arched Dorsal Torso/Dome + Flush Cap & Eyes)
# ---------------------------------------------------------------------------
def ray_eye(side):
    c = Vector((side * .212, -.425, 1.046))
    n = Vector((side * .24, -.86, .45)).normalized()
    h = Z.cross(n).normalized()
    v = n.cross(h).normalized()
    return c, h, v, n


def ray_mesh(close, mat, rig):
    b = Mesh()
    q = lambda a, c: c if close else a

    # v41 MIN-3: +35% thicker central dorsal torso/dome so side.png reads organically arched instead of pancake-thin!
    def disc(u, v):
        a = T * u
        t = math.pi * v
        s = math.sin(t)
        ct = math.cos(t)
        sa2 = math.sin(a) ** 2
        front = (.5 + .5 * math.cos(a)) ** 1.75
        rx = .66 * (1.0 - .08 * math.cos(a))
        ry = .63 * (1.0 - .11 * sa2) * (1.0 - .05 * (front ** 3))
        if ct >= 0.0:
            # v43 MAJ-5: Smooth continuous convex dorsal dome with zero crown pole spike & zero rear cranial dent!
            dome_z = .435 * (ct ** .95) * (1.0 - .14 * sa2 * (s ** 2))
            brow_lift = .095 * front * (ct ** .80) * (s ** 1.5)
            z_thick = dome_z + brow_lift
        else:
            # Organic softly convex ventral belly balancing the fuller arched dorsal torso
            z_thick = .186 * ct * (1.0 - .22 * sa2 * (s ** 2))
        return Vector((rx * s * math.sin(a), -ry * s * math.cos(a), .76 + z_thick))

    # v38: Smooth gradient Head <-> Body <-> Tail weights across the manta disc so eyes, smile, cephalic lobes & conductor cap
    # deform harmoniously WITH the manta body (eliminating the detached Head-vs-Body snowman cut!).
    def ray_body_w(p, u, v):
        if p.y < .18:
            wh = smooth_w(.18, -.28, p.y)
            return {'Head': wh, 'Body': 1.0 - wh}
        if p.y > .34:
            wt = smooth_w(.34, .66, p.y)
            return {'Body': 1.0 - wt, 'Tail': wt}
        return {'Body': 1.0}

    # v goes from 0 (top/dorsal) to 1 (bottom/ventral) -> UV v matches dorsal periwinkle -> ventral ivory!
    b.grid(disc, q(40, 60), q(18, 28), 'skin', ray_body_w, True, True)

    # Broad, fuller sweeping falcate manta pectoral wings + graceful curved cephalic lobes flanking the smiling face.
    for s, suf in ((-1, 'L'), (1, 'R')):
        # v40: Scaled-down (~0.68x: r=0.084 vs 0.124) sleek almond-oval eyes seated neatly on the upper front head crest!
        shelly_eye(b, s, q(18, 28), q(12, 18), ray_eye, .084, disc, (q(40, 60), q(18, 28)), depth=.115, swell=.032, lid_scale=.92)

        # Iconic smoothly curved 3D manta cephalic lobes emerging from leading shoulder margins & framing the wide smile.
        def lobe_center(v, s=s):
            return Vector((
                s * (.455 + .018 * math.sin(v * math.pi) - .105 * (v ** 1.25)),
                -.26 - .36 * v,
                .748 - .008 * v + .012 * math.sin(v * math.pi),
            ))

        def lobe_pt(u, v, s=s):
            a = T * u
            c = lobe_center(v, s)
            t_sp = (lobe_center(min(1.0, v + .004), s) - lobe_center(max(0.0, v - .004), s)).normalized()
            n_up = Vector((-s * .16, .06, .98)).normalized()
            lat = t_sp.cross(n_up).normalized()
            if lat.x * s < 0:
                lat = -lat
            n_up = lat.cross(t_sp).normalized()
            if n_up.z < 0:
                n_up = -n_up
            tip = math.sqrt(max(0.0, 1.0 - (v ** 2.5)))
            root = min(1.0, .70 + .30 * math.sin(min(1.0, v * 3.0) * math.pi * .5))
            hw = .066 * tip * root
            th = .024 * tip * root
            return c + lat * (hw * math.cos(a)) + n_up * (th * math.sin(a))

        b.grid(
            lobe_pt, q(12, 18), q(10, 16), 'skin', ray_body_w, True, reverse=(s < 0),
            uvfn=lambda u, v: (.26 + .20 * abs(2.0 * u - 1.0), .18 + .08 * v)
        )

        # Broad, graceful diamond/falcate manta pectoral wings: wide chord flowing out of the full torso flank to swept feathered tips!
        def wing(u, v, s=s):
            span = v
            # Leading edge (u=0): sweeps gently forward-outward from shoulder (-0.36) arching gracefully back to wingtip (+0.26)
            y_lead = -.36 + .62 * (span ** 1.32) - .07 * math.sin(math.pi * span)
            # Trailing edge (u=1): sweeps inward from wingtip (+0.32) back to rear disc (+0.52) with graceful concave manta curve
            y_trail = .52 - .20 * (span ** 1.15) - .11 * math.sin(math.pi * span)
            # Smooth chord profile from leading edge to trailing edge
            t_ch = .5 * (1.0 - math.cos(math.pi * u))
            y = y_lead + (y_trail - y_lead) * t_ch
            # Slight curved leading-edge shoulder sweep in X for natural diamond wing silhouette
            x_base = .32 + 1.08 * span
            x_edge = -.04 * (1.0 - span) * (t_ch ** 1.4)
            x = s * (x_base + x_edge)
            # Graceful undulating manta glide camber (gentle shoulder arch + soft swept wingtip lift)
            camber = .056 * math.sin(math.pi * span) * math.sin(math.pi * u)
            glide_z = .028 * math.sin(math.pi * span * 1.15) - .038 * (span ** 1.5) + .046 * (span ** 2.6)
            z = .76 + glide_z + camber
            return Vector((x, y, z))

        def wing_w(p, u, v, suf=suf):
            w_in = smooth_w(.02, .34, v)
            w_tip = smooth_w(.28, .82, v)
            return {'Body': 1.0 - w_in, 'WingIn.' + suf: w_in * (1.0 - w_tip), 'WingTip.' + suf: w_in * w_tip}

        for layer in (-1, 1):
            b.grid(
                lambda u, v, layer=layer: wing(u, v) + Vector((0, 0, layer * .096 * (1.0 - .84 * (v ** 1.05)) * (math.sin(math.pi * u) ** .65) * (math.sin(math.pi * v) ** .44))),
                q(16, 24), q(12, 18), 'skin', wing_w, reverse=layer * s < 0,
                uvfn=lambda u, v, layer=layer: (.25 + .25 * u, .20 if (layer > 0 or v > .84) else .80)
            )

    # v40: Scaled-down proportionate friendly smile (~0.72x width) seated neatly on the fuller front head crest below the eyes!
    def ray_smile_pt(t):
        a = (2.0 * t - 1.0) * .235
        u_s = (a / T) % 1.0
        v_s = .435 + .030 * math.cos((2.0 * t - 1.0) * math.pi * .5)
        p = disc(u_s, v_s)
        nrm = Vector((math.sin(a), -math.cos(a), .18)).normalized()
        return p + nrm * .008

    b.tube(
        ray_smile_pt,
        lambda t: .0102 * (math.sin(math.pi * (.08 + .84 * t)) ** .55),
        q(8, 10), q(14, 20), 'dark', 'Head'
    )
    # Slender whip-tail with rounded closed tip & small dorsal fin (smooth Body->Tail root blend!).
    def tail_rad(t):
        base = .058 * (1 - .84 * t) + .007
        if t > .90:
            k = (t - .90) / .10
            return base * math.sqrt(max(0.0, 1.0 - k * k))
        return base
    b.tube(
        lambda t: Vector((0, .56 + .90 * t, .75 - .07 * math.sin(t * 2.5))),
        tail_rad, q(8, 12), q(14, 20), 'skin', _limb_w('Body', 'Tail', .02, .28),
        uvfn=lambda u, v: (u, .20)
    )
    b.ellipsoid((0, .66, .85), (.024, .086, .074), 'skin', ray_body_w, q(8, 12), q(6, 8), uvfn=lambda u, v: (u, .20))
    # Neat navy conductor cap seated flush & snug directly into the smooth dorsal crown (0.02-0.03u rim overlap, zero stalk!).
    cap_c = Vector((0, -.01, 1.158))
    cap_w = ray_body_w(cap_c, .5, .1)
    cap_w_fn = lambda p, u, v, cw=cap_w: cw
    b.grid(
        lambda u, v: cap_c + Vector((.240 * math.sin(T * u) * math.sin(v * math.pi * .5), -.220 * math.cos(T * u) * math.sin(v * math.pi * .5), .116 * math.cos(v * math.pi * .5))),
        q(20, 30), q(6, 10), 'cloth', cap_w_fn, True, True, uvfn=lambda u, v: (u, 1 - v)
    )
    # Closed solid 3D dark navy-charcoal conductor visor (top + clean underside + rounded rim, clear of eyes & brow).
    def visor_pt(u, v, layer):
        ang = (u - .5) * math.pi * .84
        s_edge = math.sin(math.pi * u) ** .85
        r_out = .140 * s_edge * v
        x = .225 * math.sin(ang) + .016 * math.sin(ang) * v
        y = -.205 * math.cos(ang) - r_out
        z_mid = .012 - .015 * v - .005 * (1.0 - math.cos(ang))
        half_th = .0080 * (math.sin(math.pi * v) ** .55) * (s_edge ** .45)
        return cap_c + Vector((x, y, z_mid + layer * half_th))
    for layer in (-1, 1):
        b.grid(lambda u, v, layer=layer: visor_pt(u, v, layer), q(16, 24), q(4, 6), 'dark', cap_w_fn, reverse=layer > 0)
    b.ellipsoid(cap_c + Vector((0, -.210, .066)), (.032, .014, .035), 'gold', cap_w_fn, q(8, 12), q(5, 8))
    return b.object(mat, rig, 'Subway Ray', ground=False)


# ---------------------------------------------------------------------------
# 2. HOTEL WHALE (v41 MAJ-1/MAJ-3: Half-Lidded Gentleman Sapphire Eyes + Rolled ~22 deg Thickened Two-Lobed Crescent Fluke!)
# ---------------------------------------------------------------------------
def whale_eye(side):
    # v41 MAJ-1: Gentle relaxed half-lidded gentleman sapphire eyes seated cleanly inside sculpted orbital sockets!
    c = Vector((side * .336, -.712, .946))
    n = Vector((side * .28, -.955, .10)).normalized()
    h = Z.cross(n).normalized()
    v = n.cross(h).normalized()
    return c, h, v, n


def whale_mesh(close, mat, rig):
    b = Mesh()
    q = lambda a, c: c if close else a
    eye_frames = [(-1, *whale_eye(-1)), (1, *whale_eye(1))]
    r_eye_w = .190

    def _sm(a0, b0, x):
        t = max(0.0, min(1.0, (x - a0) / (b0 - a0)))
        return t * t * (3.0 - 2.0 * t)

    # v31 M1 + v34 MIN 2: Iconic Pixar/MP8 cetacean silhouette — organic sculpted head with genuine recessed 3D orbital
    # sockets & snug outer brow/cheek wrap (far eye tucks cleanly inside quarter.png silhouette!), muscular caudal
    # peduncle (~0.68x body length), smooth dorsal hump behind vest, and prominently bilobed crescent horizontal flukes!
    def body(u, v):
        a = T * u  # 0=front(-Y), pi/2=right(+X), pi=tail(+Y), 3pi/2=left(-X)
        ve = .002 + .996 * v
        sv = math.sin(math.pi * ve)
        cv = math.cos(math.pi * ve)
        front = .5 * (1.0 + math.cos(a))  # 1=snout, 0=tail
        back = .5 * (1.0 - math.cos(a))   # 0=snout, 1=tail
        sa2 = math.sin(a) ** 2

        # 1. Frontal silhouette sculpting (preserved front head + fuller, plumper muscular tailstock base):
        crown_narrow = -.11 * (max(0.0, cv) ** 1.45) * (.55 + .45 * front)
        cheek_swell = .145 * (front ** .65) * math.exp(-((ve - .58) / .19) ** 2) * (.55 + .45 * sa2)
        jaw_width = .085 * (front ** .80) * math.exp(-((ve - .74) / .16) ** 2)
        # Keep torso & tailstock base plump and muscular, tapering laterally into a muscular cetacean caudal peduncle.
        peduncle_x = 1.0 - .77 * (back ** 1.85) * (sv ** 1.05)
        x = .555 * math.sin(a) * sv * (1.0 + crown_narrow + cheek_swell + jaw_width) * peduncle_x

        # 2. Longitudinal cetacean profile: preserved organic melon/snout + muscular tapered caudal peduncle (~0.68x body length)
        #    ending cleanly at y = 1.22 inside the prominently bilobed crescent fluke bridge!
        melon_brow = .056 * (front ** 2.1) * math.exp(-((ve - .26) / .14) ** 2)
        brow_dip = -.024 * (front ** 2.0) * math.exp(-((ve - .38) / .085) ** 2)
        rostrum_snout = .118 * (front ** 1.75) * math.exp(-((ve - .53) / .145) ** 2)
        jaw_tuck = -.022 * (front ** 1.5) * math.exp(-((ve - .78) / .15) ** 2)
        tail_ext = .92 * (back ** 1.50) * (sv ** 1.08)
        y_base = -.24 - .62 * math.cos(a) * sv - (melon_brow + brow_dip + rostrum_snout + jaw_tuck) + tail_ext

        # 3. Vertical profile: preserved vaulted crown & gently flattened whale belly + buoyant up-arched caudal peduncle!
        melon_lift = .028 * (front ** 1.5) * (max(0.0, cv) ** 1.4) * sv
        belly_flat = +.076 * (max(0.0, -cv) ** 1.9)
        back_arch = .054 * (back ** 1.75) * (max(0.0, cv) ** 1.25) * math.exp(-((ve - .22) / .17) ** 2)
        peduncle_z_drop = -.255 * (back ** 1.60) * (sv ** 1.08) + .160 * (back ** 3.0) * (sv ** 1.15)
        peduncle_z_taper = 1.0 - .58 * (back ** 1.95) * (sv ** 1.25)
        keel_ridge = .034 * math.exp(-((y_base - 1.02) / .22) ** 2) * (back ** 2.4) * (max(0.0, cv) ** 1.3) * math.exp(-((math.sin(a)) / .34) ** 2)
        y = y_base
        z = .82 + peduncle_z_drop + (.455 * cv + melon_lift + belly_flat + back_arch) * peduncle_z_taper + keel_ridge
        p0 = Vector((x, y, z))

        # 4. v34 MIN 2: Silky-smooth 3D orbital socket recess (~0.035 inward along eye normal) + snug outer brow/cheek wrap
        #    so the far eye stays cleanly tucked INSIDE the head silhouette in quarter.png while retaining rich wet cornea depth!
        if front > .20:
            for s_e, ec, eh, ez, en in eye_frames:
                d = p0 - ec
                dn = d.dot(en)
                if dn > -.38:
                    fg = _sm(-.38, -.06, dn)
                    dh = d.dot(eh)
                    dz = d.dot(ez)
                    rr = math.hypot(dh, dz) / r_eye_w
                    if rr < 2.4:
                        dh_out = s_e * dh / r_eye_w
                        socket = -.044 * math.exp(-((rr / .96) ** 2))
                        rim_ring = math.exp(-(((rr - 1.28) / .40) ** 2))
                        out_w = .42 + .58 * _sm(-.25, .60, dh_out)
                        brow_cheek = .028 * rim_ring * out_w
                        p0 = p0 + en * ((socket + brow_cheek) * fg)
        return p0

    def body_w(p, u, v):
        # v38: Smoothstep Head <-> Body neck blend centered right under the standing bellhop collar (y in [-0.14, +0.20])
        # so the burgundy pillbox cap + crown stay 100% unified with Head while collar bridges Head <-> Body cleanly!
        if p.y < .20:
            wb = smooth_w(-.14, .20, p.y)
            return {'Head': 1.0 - wb, 'Body': wb}
        if p.y > .54:
            wt = smooth_w(.54, 1.06, p.y)
            return {'Body': 1.0 - wt, 'Tail': wt}
        return {'Body': 1.0}

    b.grid(
        body, q(36, 68), q(24, 46), 'skin', body_w, True, True,
        uvfn=lambda u, v: (abs((u + .5) % 1 - .5) * 2, v)
    )

    # v33 MAJ 4: Silky-smooth sculpted organic cetacean dorsal hump/falcate ridge seated cleanly behind the burgundy vest
    # (~60% back along the spine, y = 0.56..0.94, smoothly rounded crest peaking at z ~ 1.01, zero flat plateau or faceting!).
    def dorsal_hump_mesh(u, v):
        # v = 0 rooted cleanly inside dorsal spine -> v = 1 smoothly rounded organic dorsal ridge crest
        # u wraps 360 deg around the smooth swept cetacean hydrofoil cross-section (0=leading edge, 0.5=trailing edge)
        ang = T * u
        ca, sa = math.cos(ang), math.sin(ang)
        # Smooth organic rounded dome height profile: broad graceful base curving cleanly to a soft rounded cetacean crest
        v_h = math.sin(v * math.pi * .5)
        crest_t = math.cos(v * math.pi * .5)   # 1 at base -> 0 at rounded apex
        # Leading margin rises gently & sweeps smoothly backward; trailing margin has subtle organic cetacean falcate curve
        y_center = .74 + .085 * (v_h ** 1.35)
        half_len = .195 * (crest_t ** .62)
        # Plump smooth hydrodynamic thickness (wide soft fillet at base blending flush into back -> rounded narrow ridge crest)
        xc = .5 * (1.0 - ca)  # 0 at leading edge, 1 at trailing edge
        foil_w = math.sin(math.pi * max(1e-4, min(1.0 - 1e-4, xc))) ** .68
        half_w = (.095 * (crest_t ** .78) + .018 * (crest_t ** .35)) * (1.05 - .22 * xc)
        # Base follows the buoyant dorsal spine cleanly from z=0.88 (y=0.56) down to z=0.79 (y=0.94), seated -0.04 inside skin
        yl = y_center - half_len * ca
        z_spine = .88 - .22 * max(0.0, yl - .55)
        h_rise = .215 * v_h
        zl = z_spine - .045 * (crest_t ** 1.5) + h_rise
        xl = half_w * math.copysign(abs(sa) ** .88, sa) * (.85 + .15 * foil_w)
        return Vector((xl, yl, zl))

    b.grid(
        dorsal_hump_mesh, q(12, 18), q(6, 10), 'skin', body_w, True, False,
        uvfn=lambda u, v: (.62 + .18 * (.5 - .5 * math.cos(T * u)), .14 - .06 * v)
    )

    for s, suf in ((-1, 'L'), (1, 'R')):
        # v41 MAJ-1: Gentle relaxed half-lidded gentleman deep-sapphire eyes (aspect=1.38, top 32% covered + warm arched brow ridge!)
        shelly_eye(b, s, q(16, 26), q(12, 18), whale_eye, .188, body, (q(36, 68), q(24, 46)), depth=.072, swell=.042, lid_scale=.96)

        # v40 MIN-11: Smoothly tucked, gently swept-back & downward-curved whale paddle pectoral flippers
        # (plump rounded leading edge, organic dorsal camber, cozy downward belly sweep so front.png reads 100%
        # as a charming bellhop whale — ZERO sharp horizontal axolotl spikes!).
        def pec_spine(t, s=s):
            return Vector((
                s * (.29 + .26 * (t ** .86)),
                .17 + .40 * (t ** 1.12) - .020 * math.sin(math.pi * t),
                .555 - .210 * (t ** 1.08) + .020 * math.sin(math.pi * t),
            ))

        def pec_hydrofoil(u, v, s=s):
            ang = T * u
            # Broad, cuddly rounded whale-paddle tip envelope (full mid-paddle, soft semicircular rounded tip at v -> 1!)
            tip_env = math.sqrt(max(0.0, 1.0 - (v ** 4.2)))
            chord_env = (.74 + .44 * math.sin(math.pi * min(1.0, v * 1.04)) ** .70) * tip_env
            chord = .172 * chord_env
            s_ch = .5 * (1.0 - math.cos(ang))   # 1 at leading edge, 0 at trailing edge
            xc = 1.0 - s_ch                      # 0 at leading edge, 1 at trailing edge
            foil_t = (2.15 * math.sqrt(max(1e-5, xc)) * (1.0 - .66 * xc - .24 * (xc ** 2)))
            max_th = .060 * (1.0 - .38 * v) * tip_env
            side_sign = 1.0 if math.sin(ang) >= 0.0 else -1.0
            camber = .024 * math.sin(math.pi * xc) * (1.0 - .30 * v) * tip_env
            c_pt = pec_spine(v, s)
            t_dir = (pec_spine(min(1.0, v + .004), s) - pec_spine(max(0.0, v - .004), s)).normalized()
            ch_dir = Vector((0.0, 1.0, -.24)).normalized()
            ch_dir = (ch_dir - t_dir * ch_dir.dot(t_dir)).normalized()
            up_dir = ch_dir.cross(t_dir).normalized()
            if up_dir.z < 0:
                up_dir = -up_dir
            ch_off = (xc - .36) * (2.0 * chord)
            th_off = camber + side_sign * max_th * foil_t * (.95 if side_sign > 0 else .82)
            return c_pt + ch_dir * ch_off + up_dir * th_off

        b.grid(
            pec_hydrofoil, q(14, 24), q(8, 14), 'skin', _limb_w('Body', 'Fin.' + suf, .02, .30), True, reverse=(s < 0),
            uvfn=lambda u, v: (.42 + .18 * v, .18 + .32 * (.5 - .5 * math.sin(T * u)))
        )

    # v41 MAJ-3: Boldly two-lobed crescent horizontal whale fluke rolled/canted by ~21 deg with wide lateral sweeping
    # paddle lobes (thickness >= 0.08), deep crisp median V-notch & arched S-curve so BOTH lobes read unmistakably as a
    # classic forked whale tail from side.png, quarter.png AND 04-hotel.png while tucking cleanly behind shoulders in front.png!
    fluke_pitch = math.radians(-13.0)
    fluke_roll = math.radians(21.0)
    cp_f, sp_f = math.cos(fluke_pitch), math.sin(fluke_pitch)
    cr_f, sr_f = math.cos(fluke_roll), math.sin(fluke_roll)
    fluke_root = Vector((0.0, 1.31, .715))

    for s in (-1, 1):
        def fluke_lobe(u, v, s=s):
            # v = 0 at deep crisp cetacean median V-notch midline (x = 0) -> v = 1 at wide swept crescent paddle tip!
            ang = T * u
            xc = .5 * (1.0 + math.cos(ang))      # 0 at leading edge (u=0.5), 1 at trailing edge (u=0/1)
            s_ang = math.sin(ang)                # +1 dorsal top, -1 ventral bottom

            u_x = math.sin(v * math.pi * .5)
            tip_c = math.cos(v * math.pi * .5)
            lx = s * (.58 * u_x)

            # Wide laterally spread crescent leading edge shifted aft with tighter forward curl for daylight from pectoral
            y_lead = -.14 + .62 * (u_x ** 1.35) - .04 * math.sin(math.pi * (u_x ** .85))
            # Crisp deep median V-notch (+0.02 at x=0) flaring out into wide lush curved paddle lobes (+0.52..0.56)!
            y_trail = .02 + .44 * (u_x ** .82) + .220 * math.sin(math.pi * (u_x ** .74))
            chord_y = max(.022, y_trail - y_lead)

            # Thickened plush cambered hydrofoil cross-section (total thickness >= 0.08 across both wide sweeping paddle lobes!)
            foil_oval = 1.12 - .26 * xc
            asym = 1.06 if s_ang >= 0.0 else .94
            tip_th = tip_c ** .28
            root_blend = .024 * math.exp(-((u_x / .30) ** 2))
            half_th = (.066 * (1.0 - .22 * u_x) + root_blend) * tip_th

            ly_local = y_lead + xc * chord_y
            # Graceful buoyant arched S-curve along span & chord
            s_wave = .056 * math.sin(math.pi * (u_x ** .82)) - .048 * (u_x ** 2.05)
            lz_camber = .040 * math.sin(math.pi * xc) * (1.0 - .24 * u_x) * (tip_c ** .22)
            lz_local = s_wave + lz_camber + half_th * foil_oval * s_ang * asym

            # 1) Apply subtle buoyant pitch in (Y, Z)
            py = ly_local * cp_f - lz_local * sp_f
            pz = ly_local * sp_f + lz_local * cp_f
            # 2) Apply ~21 deg cant/roll about longitudinal tail axis (+Y) so both wide paddle lobes separate cleanly in side, quarter & 04-hotel!
            rx = lx * cr_f + pz * sr_f
            rz = -lx * sr_f + pz * cr_f
            return fluke_root + Vector((rx, py, rz))

        b.grid(
            fluke_lobe, q(14, 22), q(14, 22), 'skin', 'Tail', True, reverse=(s < 0),
            uvfn=lambda u, v: (.80 + .16 * v, .14 + .34 * (.5 - .5 * math.sin(T * u)))
        )

    # Build an exact 3D axial (y, theta) skin envelope over the whale's mid-torso so the tailored burgundy bellhop vest,
    # standing 3D bellhop collar & braided gold piping rings seat 100% flush with ZERO dark crevice gap!
    n_y, n_th = 36, 72
    y_min, y_max = -.34, .80
    z_min_s = [1e9] * n_y
    z_max_s = [-1e9] * n_y
    pts_cache = []
    for iu in range(120):
        for iv in range(84):
            pt = body(iu / 120, iv / 84)
            if y_min - .03 <= pt.y <= y_max + .03:
                pts_cache.append(pt)
                yi = max(0, min(n_y - 1, int(round((pt.y - y_min) / (y_max - y_min) * (n_y - 1)))))
                if pt.z < z_min_s[yi]:
                    z_min_s[yi] = pt.z
                if pt.z > z_max_s[yi]:
                    z_max_s[yi] = pt.z
    z_mid_s = [0.5 * (z_min_s[j] + z_max_s[j]) if z_max_s[j] > z_min_s[j] else .82 for j in range(n_y)]
    for _ in range(3):
        z_mid_s = [z_mid_s[0]] + [.25 * z_mid_s[j - 1] + .5 * z_mid_s[j] + .25 * z_mid_s[j + 1] for j in range(1, n_y - 1)] + [z_mid_s[-1]]

    r_env = [[.14] * n_th for _ in range(n_y)]
    for pt in pts_cache:
        yi = max(0, min(n_y - 1, int(round((pt.y - y_min) / (y_max - y_min) * (n_y - 1)))))
        dz = pt.z - z_mid_s[yi]
        rr = math.hypot(pt.x, dz)
        ti = int(round((math.atan2(pt.x, dz) % T) / T * n_th)) % n_th
        for dy in (-1, 0, 1):
            yj = max(0, min(n_y - 1, yi + dy))
            for dt in (-1, 0, 1):
                tj = (ti + dt) % n_th
                if rr > r_env[yj][tj]:
                    r_env[yj][tj] = rr
    raw_env = [row[:] for row in r_env]
    for _ in range(4):
        nxt = [[0.0] * n_th for _ in range(n_y)]
        for j in range(n_y):
            jm, jp = max(0, j - 1), min(n_y - 1, j + 1)
            for i in range(n_th):
                avg = (.48 * r_env[j][i] + .16 * r_env[j][(i - 1) % n_th] + .16 * r_env[j][(i + 1) % n_th]
                       + .10 * r_env[jm][i] + .10 * r_env[jp][i])
                nxt[j][i] = max(avg, raw_env[j][i])
        r_env = nxt
    for j in range(n_y):
        for i in range(n_th):
            k = (-i) % n_th
            m = max(r_env[j][i], r_env[j][k])
            r_env[j][i] = r_env[j][k] = m

    def env_pt(y_val, theta, dr):
        fy = max(0.0, min(n_y - 1.0001, (y_val - y_min) / (y_max - y_min) * (n_y - 1)))
        j = int(fy)
        ty = fy - j
        zm = z_mid_s[j] * (1.0 - ty) + z_mid_s[j + 1] * ty
        ft = ((theta % T) / T) * n_th
        i = int(ft) % n_th
        ti = ft - int(ft)
        i1 = (i + 1) % n_th
        r0 = r_env[j][i] * (1.0 - ti) + r_env[j][i1] * ti
        r1 = r_env[j + 1][i] * (1.0 - ti) + r_env[j + 1][i1] * ti
        rr = (r0 * (1.0 - ty) + r1 * ty) + dr
        return Vector((rr * math.sin(theta), y_val, zm + rr * math.cos(theta)))

    def jacket_bounds(theta):
        # Compact tailored grand-hotel burgundy bellhop coat seated cleanly behind the sculpted cheeks
        nape = max(0.0, math.cos(theta)) ** 1.5
        belly = max(0.0, -math.cos(theta)) ** 1.4
        side_sweep = (math.sin(theta) ** 2) * .055
        y0 = .10 + .085 * nape - side_sweep + .095 * belly
        y1 = .535 + .012 * math.cos(theta) - .025 * (math.sin(theta) ** 2)
        return y0, y1

    def jacket_surf(u, v):
        theta = T * u
        y0, y1 = jacket_bounds(theta)
        if v < .10:
            t = v / .10
            ts = t * t * (3.0 - 2.0 * t)
            yv = y0 + .016 * ts
            dr = .006 + .007 * ts
        elif v > .88:
            t = (1.0 - v) / .12
            ts = t * t * (3.0 - 2.0 * t)
            yv = y1 - .020 * ts
            dr = .002 + .011 * ts
        else:
            t = (v - .10) / .78
            yv = (y0 + .016) + ((y1 - .020) - (y0 + .016)) * t
            dr = .013 + .0025 * math.sin(math.pi * t)
        return env_pt(yv, theta, dr)

    b.grid(jacket_surf, q(32, 56), q(8, 16), 'cloth', body_w, True, False, uvfn=lambda u, v: (u, .08 + .84 * v))

    # v25 Minor #3: Tailored 3D standing bellhop collar seated 100% FLUSH against the skin (inner edge nestled cleanly inside skin,
    # rising smoothly into a plump beveled burgundy bellhop collar — ZERO floating shadow crevice all 360 deg around, including belly!).
    def bellhop_collar(u, v):
        theta = T * u
        y0, _ = jacket_bounds(theta)
        c_len = .094 + .018 * max(0.0, math.cos(theta))
        c_h = .028 + .007 * max(0.0, math.cos(theta))
        belly_snug = -.016 * (max(0.0, -math.cos(theta)) ** 1.4)
        b_ang = T * v
        yc = (y0 + .016) + (.5 * c_len) * math.cos(b_ang)
        drc = .005 + belly_snug + c_h * (.45 + .55 * math.sin(b_ang))
        return env_pt(yc, theta, drc)

    b.grid(bellhop_collar, q(32, 56), q(8, 14), 'cloth', body_w, True, False, uvfn=lambda u, v: (u, .15 + .70 * v))

    # v25 Minor #3: Sculpted 3D braided gold piping rings seated 100% FLUSH against skin & collar (ZERO dark air gap!)
    for ring_kind, y_off, r_base, dr_ring in (
        ('collar_front', -.026, .0165, .0065),
        ('collar_back',  +.064, .0125, .0170),
        ('hem_rear',     None,  .0115, .0075),
    ):
        def gold_braid_ring(u, v, ring_kind=ring_kind, y_off=y_off, r_base=r_base, dr_ring=dr_ring):
            theta = T * u
            y0, y1 = jacket_bounds(theta)
            yc = y1 if ring_kind == 'hem_rear' else (y0 + y_off)
            belly_snug = -.016 * (max(0.0, -math.cos(theta)) ** 1.4) if ring_kind != 'hem_rear' else -.008 * (max(0.0, -math.cos(theta)) ** 1.4)
            a_sec = T * v
            braid = 1.0 + .15 * math.cos(2.0 * a_sec + 42.0 * theta)
            rad = r_base * braid
            return env_pt(yc + rad * math.cos(a_sec), theta, dr_ring + belly_snug + rad * math.sin(a_sec))
        b.grid(gold_braid_ring, q(28, 48), q(6, 8), 'gold', body_w, True, False)

    # Tailored double-breasted brass bellhop buttons + horizontal gold frogging braid cleanly ABOVE the pectoral flippers!
    for by, th_top, th_bot in ((.22, .34 * math.pi, .50 * math.pi), (.35, .36 * math.pi, .52 * math.pi), (.48, .38 * math.pi, .54 * math.pi)):
        for s in (-1, 1):
            for th in (th_top, th_bot):
                bp = env_pt(by, s * th, .019)
                b.ellipsoid(bp, (.025, .025, .023), 'gold', body_w, q(6, 10), q(4, 6))
            b.tube(
                lambda t, by=by, s=s, th_top=th_top, th_bot=th_bot: env_pt(by, s * (th_top + (th_bot - th_top) * t), .016),
                .0056, 4, 4, 'gold', body_w
            )

    # v35 D1: Subtly jauntier gold-trimmed royal-burgundy bellhop pillbox cap (~9.5 deg jaunty roll + 4.5 deg forward pitch),
    # seated 100% flush into the deepened cerulean coastal-blue crown with bold gold hatband, upper gold rim piping,
    # gleaming brass top button & crisp front gold bellhop medallion crest!
    cap_c = Vector((.052, -.315, 1.202))
    cap_roll = math.radians(9.5)
    cap_pitch = math.radians(4.5)
    cr_c, sr_c = math.cos(cap_roll), math.sin(cap_roll)
    cp_c, sp_c = math.cos(cap_pitch), math.sin(cap_pitch)
    cap_r = Vector((cr_c, 0.0, -sr_c)).normalized()
    cap_u = Vector((sr_c * cp_c, -sp_c, cr_c * cp_c)).normalized()
    cap_f = cap_r.cross(cap_u).normalized()  # points forward (-Y) in tilted cap frame

    def cap_pt(rx, rf, zc):
        return cap_c + cap_r * rx + cap_f * rf + cap_u * zc

    def cap_pillbox(u, v):
        if v < .34:
            t = v / .34
            r = .218 * t
            zc = .208 - .007 * (t ** 2.2)
        elif v < .46:
            t = (v - .34) / .12
            ang_b = t * math.pi * .5
            r = .218 + .005 * math.sin(ang_b)
            zc = .201 - .014 * (1.0 - math.cos(ang_b))
        else:
            t = (v - .46) / .54
            r = .223 - .018 * t
            zc = .187 * (1.0 - t)
        return cap_pt(r * math.sin(T * u), r * .95 * math.cos(T * u), zc)

    b.grid(cap_pillbox, q(18, 30), q(6, 10), 'cloth', 'Head', True, True, uvfn=lambda u, v: (u, 1 - v))

    # Bold sculpted lower gold braid hatband seated flush against the vaulted cerulean crown (outward normals!)
    def cap_gold_band(u, v):
        t = 1.0 - v  # top -> bottom so reverse=True faces cleanly outward
        zc = .074 * t
        bulge = .0065 * math.sin(math.pi * max(0.0, min(1.0, (t - .10) / .90)))
        r = (.205 + .018 * (zc / .187)) + .0045 + bulge
        return cap_pt(r * math.sin(T * u), r * .95 * math.cos(T * u), zc)

    b.grid(cap_gold_band, q(18, 30), q(3, 5), 'gold', 'Head', True, True)

    # Crisp delicate upper gold crown piping ring catching sunlit contrast along the jaunty top bevel!
    def cap_top_piping(u, v):
        ang_u = T * u
        ang_v = T * v
        su, cu = math.sin(ang_u), math.cos(ang_u)
        cv, sv = math.cos(ang_v), math.sin(ang_v)
        r_ring = .222
        rt = .0078
        return cap_pt((r_ring + rt * cv) * su, (r_ring * .95 + rt * cv) * cu, .194 + rt * sv)

    b.grid(cap_top_piping, q(18, 28), q(4, 6), 'gold', 'Head', True, False)

    # Gleaming domed brass top button aligned cleanly with the jaunty tilted crown
    def cap_top_btn(u, v):
        a = T * u
        sv, cv = math.sin(math.pi * v), math.cos(math.pi * v)
        return cap_pt(.035 * sv * math.sin(a), .035 * sv * math.cos(a), .210 + .016 * cv)

    b.grid(cap_top_btn, q(6, 10), q(4, 6), 'gold', 'Head', True, True)

    # Crisp sculpted front gold hotel-bell crest medallion centered on the front face of the burgundy pillbox!
    def cap_front_crest(u, v):
        a = T * u
        sv, cv = math.sin(math.pi * v), math.cos(math.pi * v)
        return cap_pt(.028 * sv * math.sin(a), .208 + .013 * sv * math.cos(a), .132 + .032 * cv)

    b.grid(cap_front_crest, q(6, 10), q(4, 6), 'gold', 'Head', True, True)
    return b.object(mat, rig, 'Hotel Whale', ground=False)


# ---------------------------------------------------------------------------
# 3. PHARMACY SHRIMP (C-Arched Segmented Shrimp, Swimmer)
# ---------------------------------------------------------------------------
def shrimp_eye(side):
    # v32: Gentle inward eye-contact convergence (~4 deg) hugging the shrimp head cleanly.
    c = Vector((side * .124, -.538, 1.056))
    n = Vector((side * .28, -.96, .06)).normalized()
    h = Z.cross(n).normalized()
    v = n.cross(h).normalized()
    return c, h, v, n


SHRIMP_BODY = [
    (-.30, 1.04, .000, .000),
    (-.24, 1.02, .20, .18),
    (-.18, .99, .260, .232),
    (-.05, .94, .254, .222),
    (.10, .86, .232, .206),
    (.26, .74, .200, .178),
    (.37, .58, .164, .148),
    (.39, .43, .122, .112),
    (.31, .31, .000, .000),
]


def shrimp_mesh(close, mat, rig):
    b = Mesh()
    q = lambda a, c: c if close else a

    # Vertical-Z polar plush head dome (v=0 crown under white cap, v=1 chin inside collar; ZERO front-face pole!).
    def head_dome(u, v):
        a = T * u
        phi = math.pi * (.002 + .996 * v)
        s_phi = math.sin(phi)
        return Vector((
            .275 * s_phi * math.sin(a),
            -.30 - .265 * s_phi * math.cos(a),
            1.04 + .245 * math.cos(phi),
        ))

    def dome_y(x, z):  # front surface of head_dome at lateral x / height z (keeps brows & antenna roots seated on the skin)
        sp = math.sqrt(max(0.0, 1 - ((z - 1.04) / .245) ** 2))
        sa = min(1.0, x / (.275 * sp))
        return -.30 - .265 * sp * math.sqrt(1 - sa * sa)

    # v38: Smooth Head <-> Body gradient on rear hemisphere of head_dome (front face y <= -0.22 stays 100% Head so eyes/smile/cap stay crisp!)
    def shrimp_head_w(p, u, v):
        wh = smooth_w(-.02, -.24, p.y)
        return {'Head': wh, 'Body': 1.0 - wh}

    b.grid(
        head_dome, q(26, 42), q(16, 28), 'skin', shrimp_head_w, True, True,
        uvfn=lambda u, v: (abs((u + .5) % 1 - .5) * 2, .21 * v)
    )

    def _shrimp_frame(v_sp):
        yc, zc, rx, rz = curve(SHRIMP_BODY, v_sp * (len(SHRIMP_BODY) - 1))
        y1, z1, _, _ = curve(SHRIMP_BODY, min(1.0, v_sp + .004) * (len(SHRIMP_BODY) - 1))
        y0, z0, _, _ = curve(SHRIMP_BODY, max(0.0, v_sp - .004) * (len(SHRIMP_BODY) - 1))
        ty, tz = y1 - y0, z1 - z0
        tlen = math.hypot(ty, tz) or 1.0
        ty, tz = ty / tlen, tz / tlen
        ny, nz = -tz, ty  # dorsal normal in YZ plane
        return yc, zc, max(0.0, rx), max(0.0, rz), ty, tz, ny, nz

    # Smooth pale-cream inner ventral abdomen core starting cleanly inside rear of spherical head (v_sp = 0.24 -> 1.0 tail tip).
    def body_surf(u, v):
        a = T * u  # 0=dorsal crest, pi=ventral belly
        v_body = .24 + .76 * v
        cap_len = .08
        if v < .06:
            t_cap = v / .06
            v_sp = .24 + .76 * .06
            s_cap = math.sin(t_cap * math.pi * .5)
            cap_off = -.06 * math.cos(t_cap * math.pi * .5)
        elif v_body > 1.0 - cap_len:
            t_cap = (1.0 - v_body) / cap_len
            v_sp = 1.0 - cap_len
            s_cap = math.sin(t_cap * math.pi * .5)
            cap_off = .08 * math.cos(t_cap * math.pi * .5)
        else:
            v_sp = v_body
            s_cap = 1.0
            cap_off = 0.0
        yc, zc, rx, rz, ty, tz, ny, nz = _shrimp_frame(v_sp)
        rx *= s_cap
        rz *= s_cap
        ca, sa = math.cos(a), math.sin(a)
        return Vector((
            rx * sa,
            yc + ty * cap_off + rz * ca * ny,
            zc + tz * cap_off + rz * ca * nz,
        ))

    def _v_weight(v_body):
        if v_body < .64:
            wb = smooth_w(.28, .64, v_body)
            return {'Head': 1.0 - wb, 'Body': wb}
        wt = smooth_w(.64, .92, v_body)
        return {'Body': 1.0 - wt, 'Tail': wt}

    def body_w(p, u, v):
        return _v_weight(.24 + .76 * v)

    b.grid(
        body_surf, q(18, 36), q(12, 24), 'skin', body_w, True, False,
        uvfn=lambda u, v: (abs((u + .5) % 1 - .5) * 2, .25 + .17 * v)
    )

    # M1 v22: 5 distinct overlapping sculpted curved shrimp carapace segments with crisp coral-terracotta rear band piping!
    for seg_idx in range(5):
        v0_seg = .300 + seg_idx * .115
        v1_seg = v0_seg + .142
        # Slightly broader skirt overhang on mid-segments for iconic overlapping shrimp armor silhouette
        step_out = .034 - .003 * seg_idx

        def seg_surf(u, v, v0_seg=v0_seg, v1_seg=v1_seg, step_out=step_out):
            # Wrap generously around dorsal back and both curved side pleuron skirts (-138 deg .. +138 deg)
            a = (u - .5) * 2.0 * .77 * math.pi
            ca, sa = math.cos(a), math.sin(a)
            skirt_env = math.sin(math.pi * u) ** .38
            # Smooth rounded lateral pleuron scallop curving slightly backward at lower flank
            pleuron = .018 * (math.sin(math.pi * u) ** .65) * (1.0 - max(0.0, ca))
            if v < .16:
                t = v / .16
                ts = t * t * (3.0 - 2.0 * t)
                v_sp = v0_seg + .012 * ts
                dr = -.010 + (.024 * skirt_env) * ts
            elif v < .84:
                t = (v - .16) / .68
                v_sp = v0_seg + .012 + (v1_seg - v0_seg - .018) * t + pleuron * t
                # Shingled outward flare toward overlapping rear edge creates crisp 3D shadow crevices between all 5 segments!
                dr = (.014 + step_out * (t ** .78)) * skirt_env
            else:
                t = (v - .84) / .16
                ts = t * t * (3.0 - 2.0 * t)
                v_sp = v1_seg - .006 + .005 * math.sin(t * math.pi) + pleuron * (1.0 - .35 * ts)
                dr = (.014 + step_out) * skirt_env * (1.0 - ts) - .008 * ts
            yc, zc, rx, rz, ty, tz, ny, nz = _shrimp_frame(min(.96, v_sp))
            return Vector((
                (rx + dr) * sa,
                yc + (rz + dr) * ca * ny,
                zc + (rz + dr) * ca * nz,
            ))

        def seg_w(p, u, v, v0_seg=v0_seg, v1_seg=v1_seg):
            return _v_weight(v0_seg + (v1_seg - v0_seg) * v)

        b.grid(
            seg_surf, q(14, 24), q(5, 9), 'skin', seg_w, False, False,
            uvfn=lambda u, v: (abs(2.0 * u - 1.0), .445 + .330 * min(1.0, v / .86))
        )

    # v37 MIN 6: 3 neat pairs of cute, delicate shrimp pleopods (ventral swimming paddles) tucked sleekly
    # inside the underside contour, sweeping gently downward-back in warm pastel peach (zero protruding ribcage!).
    pleopod_specs = [
        (.48, .0160, .096),
        (.60, .0146, .088),
        (.72, .0130, .078),
    ]
    for v_lw, r0, plen in pleopod_specs:
        yc, zc, rx, rz, ty, tz, ny, nz = _shrimp_frame(v_lw)
        lw = _v_weight(v_lw)
        # Anchor cleanly inside the ventral-lateral belly contour (tucked well inboard of carapace flanks)
        x_root = rx * .42
        y_root = yc - rz * .84 * ny
        z_root = zc - rz * .84 * nz
        # Outward-ventral unit (gently away from belly) & rearward-downward glide direction along abdomen
        vy, vz = -ny, -nz
        for s in (-1, 1):
            pts = [
                (s * (x_root * .76), y_root + ny * .040, z_root + nz * .040),
                (s * (x_root * .98), y_root + vy * (plen * .20) + ty * (plen * .26), z_root + vz * (plen * .20) + tz * (plen * .26) - plen * .10),
                (s * (x_root * .88), y_root + vy * (plen * .32) + ty * (plen * .66), z_root + vz * (plen * .32) + tz * (plen * .66) - plen * .22),
                (s * (x_root * .68), y_root + vy * (plen * .26) + ty * (plen * .98), z_root + vz * (plen * .26) + tz * (plen * .98) - plen * .26),
            ]
            def leg_pt(t, pts=pts):
                return Vector(curve(pts, t * (len(pts) - 1)))
            def leg_rad(t, r0=r0):
                base = r0 * (1.0 - .32 * t)
                if t < .08:
                    k = (.08 - t) / .08
                    return base * math.sqrt(max(0.0, 1.0 - k * k))
                if t > .78:
                    k = (t - .78) / .22
                    return base * math.sqrt(max(0.0, 1.0 - k * k))
                return base
            b.tube(
                leg_pt, leg_rad, q(5, 8), q(7, 10), 'skin', lambda p, u, v, lw=lw: lw,
                flat=.68, uvfn=lambda u, v: (.48 - .32 * v, .31)
            )

    # M1 v22: Crisp fanned 5-petal shrimp uropod tail fan (center telson + 2 inner uropods + 2 outer uropods with coral-terracotta fan border!).
    tail_base = Vector((0, .355, .362))
    for idx in (-2, -1, 0, 1, 2):
        ang = idx * .38
        L = .255 if idx == 0 else (.285 if abs(idx) == 1 else .268)
        fwd = Vector((math.sin(ang), math.cos(ang), 0))
        lat = Vector((math.cos(ang), -math.sin(ang), 0))
        z_layer = -.008 * abs(idx)
        w_max = .060 if idx == 0 else (.072 if abs(idx) == 1 else .068)
        def lobe_center(v, fwd=fwd, L=L, z_layer=z_layer):
            return tail_base + fwd * (L * (.84 * v - .08 * v * v)) + Vector((0, 0, z_layer - L * (.24 * v + .44 * v * v)))
        def tail_petal(u, v, fwd=fwd, lat=lat, w_max=w_max, L=L, z_layer=z_layer):
            c = lobe_center(v, fwd, L, z_layer)
            t_sp = (lobe_center(min(1.0, v + .004), fwd, L, z_layer) - lobe_center(max(0.0, v - .004), fwd, L, z_layer)).normalized()
            n_up = lat.cross(t_sp).normalized()
            env = (math.sin(math.pi * v) ** .46) * (.56 + .58 * v)
            w = w_max * env
            th = .019 * (math.sin(math.pi * v) ** .58)
            return c + lat * (w * math.cos(T * u)) + n_up * (th * math.sin(T * u))
        b.grid(
            tail_petal, q(8, 14), q(5, 9), 'skin', 'Tail', True, True,
            uvfn=lambda u, v: (.20 + .60 * abs(2.0 * u - 1.0), .785 + .210 * v)
        )

    for s, suf in ((-1, 'L'), (1, 'R')):
        # m10 v22: Recessed conforming eyes (depth=0.085, swell=0.012) hug head contour cleanly with ZERO frog-eye bulge!
        shelly_eye(b, s, q(16, 24), q(12, 18), shrimp_eye, .094, head_dome, (q(26, 42), q(16, 28)), depth=.085, swell=.038, lid_scale=.80)
        # Soft arched coral brows over eyes.
        b.tube(
            lambda t, s=s: Vector((s * (.092 + .080 * t), dome_y(.092 + .080 * t, 1.182 + .016 * (1 - t)) + .004, 1.182 + .020 * math.sin(t * math.pi) + .016 * (1 - t))),
            lambda t: .018 * math.sin(math.pi * (.15 + .70 * t)), q(6, 8), q(6, 8), 'rim', 'Head'
        )
        # Primary antennae above eyes (smooth Head->Ant root blend!)
        b.tube(lambda t, s=s: Vector((s * (.082 + .30 * t), dome_y(.082, 1.202) + .002 - .26 * t + .18 * t * t, 1.202 + .120 * math.sin(t * math.pi * .80) - .05 * (t ** 1.6))), lambda t: .015 * (1 - .86 * t) + .0025, q(6, 8), q(12, 18), 'rim', _limb_w('Head', 'Ant.' + suf, .04, .34))

    # Left cheliped (Arm.L): smooth Body->Arm.L shoulder root blend so waving arm bends organically out of body!
    b.tube(
        lambda t: Vector((-.265 - .065 * t, -.23 - .25 * t, .865 - .050 * math.sin(t * math.pi * .75) - .030 * t)),
        lambda t: .045 * (1.0 + .18 * math.exp(-((t / .20) ** 2))) * (1.0 - .28 * t), q(8, 12), q(7, 12), 'skin', _limb_w('Body', 'Arm.L', .04, .38),
        uvfn=lambda u, v: (.55, .25)
    )
    b.ellipsoid((-.335, -.495, .830), (.068, .084, .064), 'skin', 'Arm.L', q(10, 16), q(7, 12), uvfn=lambda u, v: (.55, .25))
    def left_pincer(u, v, upper):
        a = T * u
        phi = math.pi * v
        sp, cp = math.sin(phi), math.cos(phi)
        lx = .034 * sp * math.sin(a)
        ly = -.082 * sp * math.cos(a)
        lz = .031 * cp
        fwd = max(0.0, -ly / .082)
        cx = -.352 - .038 * fwd
        cy = -.562 + ly * .92
        cz = (.876 + .026 * fwd) if upper else (.790 - .010 * fwd)
        return Vector((cx + lx, cy, cz + lz))
    b.grid(lambda u, v: left_pincer(u, v, True), q(10, 16), q(6, 12), 'skin', 'Arm.L', True, True, uvfn=lambda u, v: (.55, .25))
    b.grid(lambda u, v: left_pincer(u, v, False), q(10, 16), q(6, 12), 'skin', 'Arm.L', True, True, uvfn=lambda u, v: (.55, .25))

    # Right cheliped (Arm.R): smooth Body->Arm.R shoulder blend on upper arm + palm, clamping pincers & emerald herb bottle 100% locked to Arm.R!
    def r_arm_pt(t):
        return Vector((.265 - .011 * t, -.23 - .278 * t, .865 - .055 * math.sin(t * math.pi * .75) - .080 * t))
    def r_arm_rad(t):
        base = .046 * (1.0 + .18 * math.exp(-((t / .20) ** 2))) * (1.0 - .22 * t)
        if t > .88:
            k = (t - .88) / .12
            return base * math.sqrt(max(0.0, 1.0 - k * k))
        return base
    b.tube(r_arm_pt, r_arm_rad, q(8, 12), q(7, 12), 'skin', _limb_w('Body', 'Arm.R', .04, .38), uvfn=lambda u, v: (.55, .25))
    # Palm nestled flush against rear wall of the emerald glass flask (fully encloses wrist tip!).
    b.ellipsoid((.254, -.508, .785), (.062, .058, .058), 'skin', 'Arm.R', q(10, 16), q(7, 12), uvfn=lambda u, v: (.55, .25))

    # Curved pincer claws physically wrapping & clamping the bottle from upper-right shoulder and lower-left belly (solid contact, zero gap!).
    def grip_jaw(pts, rad0):
        def j_pt(t, pts=pts):
            x, y, z = curve(pts, t * (len(pts) - 1))
            return Vector((x, y, z))
        def j_rad(t, rad0=rad0):
            base = rad0 * (1.0 - .28 * t)
            if t > .84:
                k = (t - .84) / .16
                return base * math.sqrt(max(0.0, 1.0 - k * k))
            return base
        b.tube(j_pt, j_rad, q(8, 12), q(8, 12), 'skin', 'Arm.R', uvfn=lambda u, v: (.55, .25))

    # Upper-right pincer curving around right-front shoulder of bottle cleanly clear of centered front label.
    grip_jaw([
        (.276, -.522, .812),
        (.314, -.582, .816),
        (.312, -.640, .820),
        (.276, -.676, .822),
    ], .032)
    # Lower-left pincer curving underneath & around left-lower belly of bottle cradling it securely.
    grip_jaw([
        (.230, -.524, .752),
        (.180, -.576, .744),
        (.180, -.636, .742),
        (.214, -.670, .746),
    ], .033)

    # Charming emerald-glass apothecary herb bottle + cream apothecary label + natural cork stopper (100% Arm.R weighted!).
    bot_base = Vector((.245, -.605, .715))
    ax_up = Vector((-.08, -.16, .984)).normalized()
    f_raw = Vector((-.16, -1.0, 0.0))
    ax_f = (f_raw - ax_up * f_raw.dot(ax_up)).normalized()
    ax_r = ax_f.cross(ax_up).normalized()
    BOTTLE_PROF = [
        (0.000, 0.000),
        (0.005, 0.044),
        (0.022, 0.064),
        (0.064, 0.070),
        (0.104, 0.062),
        (0.128, 0.036),
        (0.158, 0.030),
        (0.180, 0.032),
        (0.194, 0.042),
        (0.204, 0.036),
        (0.198, 0.025),
        (0.178, 0.023),
    ]
    def bot_hr(v):
        h, r = curve(BOTTLE_PROF, v * (len(BOTTLE_PROF) - 1))
        return h, max(0.0, r)
    def bottle_surf(u, v):
        h, r = bot_hr(v)
        a = T * u
        return bot_base + ax_up * h + (ax_r * math.sin(a) + ax_f * math.cos(a)) * r
    b.grid(bottle_surf, q(14, 24), q(12, 20), 'gold', 'Arm.R', True, True)

    # Crisp cream parchment apothecary label with emerald cross wrapped cleanly around front belly of flask.
    def label_surf(u, v):
        ang = (u - .5) * 3.4
        vb = .19 + .25 * v
        h, r = bot_hr(vb)
        dr = .0028 * (math.sin(math.pi * (.08 + .84 * v)) ** .4)
        return bot_base + ax_up * h + (ax_r * math.sin(ang) + ax_f * math.cos(ang)) * (r + dr)
    b.grid(label_surf, q(10, 18), q(3, 6), 'ivory', 'Arm.R', False, True, uvfn=lambda u, v: (u, .52 + .46 * v))

    # Tapered natural cork stopper seated snugly inside the emerald glass bottle neck.
    CORK_PROF = [
        (0.176, 0.023),
        (0.200, 0.026),
        (0.232, 0.033),
        (0.242, 0.030),
        (0.247, 0.018),
        (0.249, 0.000),
    ]
    def cork_surf(u, v):
        h, r = curve(CORK_PROF, v * (len(CORK_PROF) - 1))
        r = max(0.0, r)
        a = T * u
        return bot_base + ax_up * h + (ax_r * math.sin(a) + ax_f * math.cos(a)) * r
    b.grid(cork_surf, q(10, 16), q(5, 8), 'ivory', 'Arm.R', True, True, uvfn=lambda u, v: (u, .04 + .42 * v))

    # m3 v29: Warm, expressive curved happy smile (~2.2x wider & 2.7x deeper upturned warm-mahogany arc)
    # hugging head_dome cleanly below eyes & above apothecary collar, clearly readable in 05-pharmacy & proofs-v29!
    def shrimp_smile_pt(t):
        s = 2.0 * t - 1.0
        x = .140 * s
        z = .922 + .048 * (s ** 2)
        y = dome_y(abs(x), z) - .0045
        return Vector((x, y, z))

    def shrimp_smile_rad(t):
        base = .0112 * (.80 + .26 * math.sin(math.pi * t))
        if t < .12:
            k = (.12 - t) / .12
            return base * math.sqrt(max(0.0, 1.0 - k * k))
        if t > .88:
            k = (t - .88) / .12
            return base * math.sqrt(max(0.0, 1.0 - k * k))
        return base

    b.tube(shrimp_smile_pt, shrimp_smile_rad, q(7, 10), q(16, 24), 'dark', 'Head')

    # v30 Minor #10: Open, lowered tailored white lab-coat V-neck collar & folded twin lapels seated cleanly
    # BELOW the cheeks onto the ventral neck & upper chest (Z <= 0.835, |X| <= 0.215 — strictly inboard & below
    # the pink cheeks so in front.png it NEVER wraps around the sides of the face like a helmet ring!).
    # Build two sculpted 3D closed folded collar lapels wrapping softly across the lower neck & chest (s = -1 L, +1 R)
    # meeting at an open V-neck throat right behind the cute mint apothecary bow tie!
    def _chest_pt(v_sp, a_rad, dr):
        yc, zc, rx, rz, _ty, _tz, ny, nz = _shrimp_frame(v_sp)
        ca, sa = math.cos(a_rad), math.sin(a_rad)
        return Vector((
            (rx + dr) * sa,
            yc + (rz + dr) * ca * ny,
            zc + (rz + dr) * ca * nz,
        ))

    # Open lower neckband + folded twin pointed white lab-coat lapels draped smoothly down onto the chest (cleanly below chin Z=0.795 & cheeks Z>=0.85!)
    for s in (-1, 1):
        def lapel_3d(u, v, s=s):
            # u in [0, 1] runs from open V-neck throat center (u=0) outward/back along lower chest & underarm side (u=1, max 50 deg off ventral bottom -> Z <= 0.82!)
            # v in [0, 1] wraps 360 deg around the plush folded 3D lapel cross-section (top face, rounded outer hem, tucked inner underside).
            ang_lat = s * (math.pi - (.03 + .84 * u))   # pi = ventral bottom center -> pi -/+ 0.87 rad (~50 deg), keeping Z <= 0.82 & |X| <= 0.21!
            # Classic pointed folded lab-coat collar tip peaking gracefully downward on the chest at u=0.34 beside the mint bow tie!
            lapel_peak = math.exp(-((u - .34) / .24) ** 2)
            v_front = .282 + .018 * (1.0 - u) + .046 * (u ** 1.35) - .010 * lapel_peak
            lapel_len = (.076 + .092 * lapel_peak) * (1.0 - .48 * (u ** 1.7))
            v_back = v_front + lapel_len
            end_env = math.sin(math.pi * (.04 + .92 * u)) ** .32
            bv = T * v
            t_len = .5 * (1.0 - math.cos(bv))    # 0 at upper neck fold -> 1 at lower pointed chest lapel tip
            s_out = math.sin(bv)                 # +1 outward away from chest, -1 tucked smoothly into chest
            v_sp = v_front + t_len * (v_back - v_front)
            base_lift = .009 + .014 * t_len + .005 * lapel_peak
            thick = (.012 + .0045 * math.sin(math.pi * t_len)) * end_env
            dr = base_lift + thick * s_out
            p = _chest_pt(v_sp, ang_lat, dr)
            # Keep EVERY vertex strictly below the cheek contour (Z <= 0.818) so front.png cheeks stay 100% open & pink!
            if p.z > .818:
                p.z = .818
            return p

        # UV u stays in [0.06, 0.34] (clear of nurse cap cross at u=0.5), UV v places crisp mint piping along lower lapel hem (t_len -> 1 -> uv_v = 0.10)!
        def lapel_w(p, u, v):
            t_len = .5 * (1.0 - math.cos(T * v))
            return _v_weight(.285 + .145 * t_len)
        b.grid(
            lapel_3d, q(14, 24), q(10, 18), 'cloth', lapel_w, False, reverse=(s > 0),
            uvfn=lambda u, v: (.06 + .28 * u, max(.08, .92 - .84 * (.5 * (1.0 - math.cos(T * v)))))
        )

    # Crisp small white V-neck inner shirt-front placket tucked neatly between the two open pointed lapels on the upper chest
    def chest_placket(u, v):
        s_lat = 2.0 * u - 1.0
        ang_lat = math.pi - s_lat * .26 * (1.0 - .60 * v)
        v_sp = .285 + .145 * v
        dr = .004 + .007 * math.sin(math.pi * (.12 + .76 * u)) * math.sin(math.pi * (.12 + .76 * v))
        return _chest_pt(v_sp, ang_lat, dr)

    b.grid(
        chest_placket, q(8, 14), q(6, 10), 'cloth', lambda p, u, v: _v_weight(.285 + .145 * v), False, True,
        uvfn=lambda u, v: (.12 + .16 * u, .42 + .44 * v)
    )

    # Small mint apothecary bow tie seated flush at the center of the lowered open V-neck collar on the upper chest!
    bow_c = _chest_pt(.312, math.pi, .028) + Vector((0, -.016, .004))
    bow_w = _v_weight(.312)
    bow_w_fn = lambda p, u, v, bw=bow_w: bw
    for s in (-1, 1):
        b.ellipsoid(bow_c + Vector((s * .038, .006, .002)), (.038, .018, .024), 'fin', bow_w_fn, q(8, 12), q(5, 8))
    b.ellipsoid(bow_c + Vector((0, -.004, .002)), (.018, .018, .018), 'fin', bow_w_fn, q(8, 10), q(5, 6))
    cap_c = Vector((0, -.29, 1.205))
    b.grid(lambda u, v: cap_c + Vector((.195 * math.sin(T * u) * math.sin(v * math.pi * .5), -.185 * math.cos(T * u) * math.sin(v * math.pi * .5), .14 * math.cos(v * math.pi * .5))), q(18, 28), q(6, 10), 'cloth', 'Head', True, True, uvfn=lambda u, v: ((u + .5) % 1, 1 - v))
    return b.object(mat, rig, 'Pharmacy Shrimp', ground=False)


# ---------------------------------------------------------------------------
# 4. RESTAURANT OTTER (Sleek Otter Crown, Side Ears, Elongated Muzzle, Curled Tail & Cupped Paw)
# ---------------------------------------------------------------------------
def otter_eye(side):
    # v41 MAJ-1: Bright playful tall-almond warm forest-hazel/green eyes cleanly framed above muzzle!
    c = Vector((side * .142, -.304, 1.436))
    n = Vector((side * .27, -.96, .06)).normalized()
    h = Z.cross(n).normalized()
    v = n.cross(h).normalized()
    return c, h, v, n


OTTER_BODY = [
    (-.010, 1.668, .000, .000),  # 0: sleek head crown (preserved)
    (-.010, 1.615, .210, .195),  # 1: forehead (preserved)
    (-.020, 1.500, .330, .290),  # 2: temples (preserved)
    (-.020, 1.380, .350, .310),  # 3: plush cheeks (preserved)
    (-.020, 1.260, .270, .250),  # 4: jaw (preserved)
    (-.010, 1.150, .195, .188),  # 5: slender mustelid neck (preserved)
    (-.006, 1.020, .262, .228),  # 6: m7 v29 subtle cozy rounded shoulders
    (-.016,  .890, .272, .242),  # 7: m7 v29 soft rounded chest fullness
    (-.010,  .760, .244, .222),  # 8: m7 v29 clearly tapered organic waist (cinched sash seat!)
    (-.028,  .560, .342, .308),  # 9: m7 v29 cozy rounded plush otter belly & hips
    (-.020,  .360, .358, .312),  # 10: m7 v29 plump pear-shaped lower belly/haunches
    (-.005,  .180, .295, .262),  # 11: lower rump taper
    ( .000,  .060, .000, .000),  # 12: closed base above grounded webbed paws
]


def otter_mesh(close, mat, rig):
    b = Mesh()
    q = lambda a, c: c if close else a
    fur_uv = lambda u, v: (.38 + .24 * abs(2.0 * u - 1.0), .30 + .34 * v)

    # m7 v29: Continuous cardinal-spline sleek otter head -> subtle cozy shoulders -> soft chest -> tapered waist -> plush rounded otter belly!
    def body(u, v, extra=0):
        a = T * u
        ca, sa = math.cos(a), math.sin(a)
        # v43 MIN-9: Cluster v-rings gently near crown pole (v < 0.16) for a silky-smooth cranium silhouette with 0 extra tris
        if v < .16:
            t_cr = v / .16
            v_sp = .16 * (.30 * t_cr + .70 * (t_cr ** 2.2))
        else:
            v_sp = v
        y, z, rx, rz = curve(OTTER_BODY, v_sp * (len(OTTER_BODY) - 1))
        # Subtle organic asymmetric front belly fullness & gentle back lumbar hollow strictly on torso (v > 0.45 -> head untouched!)
        belly_puff = .030 * (max(0.0, ca) ** 1.55) * math.exp(-((v - .77) / .11) ** 2)
        chest_puff = .014 * (max(0.0, ca) ** 1.60) * math.exp(-((v - .57) / .07) ** 2)
        lumbar_in = -.016 * (max(0.0, -ca) ** 1.75) * math.exp(-((v - .66) / .075) ** 2)
        d_rad = belly_puff + chest_puff + lumbar_in
        return Vector(((rx + extra) * sa, y - (rz + d_rad + extra) * ca, z))

    def body_w(p, u, v):
        # v38: Silky smoothstep neck (Head <-> Torso) & grounded lower base (Torso <-> Root) so webbed feet stay planted on Z = 0!
        if v < .58:
            wt = smooth_w(.36, .58, v)
            return {'Head': 1.0 - wt, 'Torso': wt}
        if v > .84:
            wr = smooth_w(.84, .98, v)
            return {'Torso': 1.0 - wr, 'Root': wr}
        return {'Torso': 1.0}

    b.grid(body, q(28, 46), q(24, 38), 'skin', body_w, True, True)

    for s, suf in ((-1, 'L'), (1, 'R')):
        shelly_eye(b, s, q(16, 26), q(12, 18), otter_eye, .102, body, (q(28, 46), q(24, 38)), depth=.135, swell=.052, lid_scale=1.08)
        # Soft upward-arched eyebrows.
        b.tube(
            lambda t, s=s: Vector((s * (.10 + .095 * t), -.276 + .022 * t, 1.528 + .016 * math.sin(t * math.pi))),
            lambda t: .012 * math.sin(math.pi * (.20 + .60 * t)), q(5, 8), q(5, 8), 'rim', 'Head'
        )
        # Authentic low side-set otter ears (positioned on sides of head at eye-to-brow level, projecting laterally, NOT bear ears on top!).
        def ear_outer(u, v, s=s):
            a = T * u
            phi = math.pi * (.005 + .990 * v)
            sp, cp = math.sin(phi), math.cos(phi)
            lx = .060 * sp * math.sin(a)
            ly = -.044 * sp * math.cos(a)
            lz = .052 * cp
            # Gently tilt ear outward-downward ~14 deg so it sits sleekly on the temple/side-head
            ct14, st14 = .970, .242
            rx = lx * ct14 + s * lz * st14
            rz = -s * lx * st14 + lz * ct14
            return Vector((s * .348 + rx, .020 + ly, 1.466 + rz))
        b.grid(ear_outer, q(10, 14), q(6, 10), 'skin', 'Head', True, True, uvfn=fur_uv)

        def ear_inner(u, v, s=s):
            a = T * u
            phi = math.pi * (.005 + .990 * v)
            sp, cp = math.sin(phi), math.cos(phi)
            taper = 1.0 - .18 * cp
            ex = .034 * taper * sp * math.sin(a)
            ey = -.016 * sp * math.cos(a)
            ez = .030 * cp
            return Vector((s * .358 + ex, -.008 + ey, 1.464 + ez))
        b.grid(
            ear_inner, q(8, 12), q(4, 8), 'skin', 'Head', True, True,
            uvfn=lambda u, v: (.116 + .028 * abs(math.cos(math.pi * v)), .260)
        )

        # Lengthened, broad plush otter whisker pads projecting clearly forward in front & quarter views.
        b.ellipsoid((s * .088, -.402, 1.304), (.106, .118, .082), 'ivory', 'Head', q(12, 18), q(7, 12))

        # 3 clean, crisp sculpted stylized otter whiskers per side (clam-side right whiskers ~26% shorter & gently swept back so they NEVER cross the clam prop!).
        for wi, (dz, dy_off, dz_arc, wlen) in enumerate(((.022, -.446, .024, .218), (.000, -.452, -.014, .232), (-.022, -.444, -.048, .206))):
            is_clam_side = s > 0
            wlen_use = wlen * (.72 if is_clam_side else 1.0)
            dz_use = dz + (.010 if is_clam_side else 0.0)
            dz_arc_use = (.034, .006, -.016)[wi] if is_clam_side else dz_arc
            dy_sweep = .145 if is_clam_side else .082
            dy_fwd = .008 if is_clam_side else -.014
            droop = .012 if is_clam_side else .022
            root = Vector((s * .142, dy_off, 1.302 + dz_use))
            def whisk_rad(t):
                base = .0088 * (1.0 - .55 * t)
                if t > .88:
                    k = (t - .88) / .12
                    return base * math.sqrt(max(0.0, 1.0 - k * k))
                return base
            b.tube(
                lambda t, s=s, root=root, dz_arc_use=dz_arc_use, wlen_use=wlen_use, dy_sweep=dy_sweep, dy_fwd=dy_fwd, droop=droop: root + Vector((
                    s * wlen_use * t,
                    dy_fwd * t + dy_sweep * (t ** 1.45),
                    dz_arc_use * t - droop * (t ** 2),
                )),
                whisk_rad, q(5, 8), q(6, 10), 'ivory', 'Head',
                uvfn=lambda u, v: (.5, .94)
            )

        # Grounded webbed hind paws anchored 100% to Root so feet stay solidly planted on Z = 0 (zero hovering/floor sinking!).
        b.ellipsoid((s * .148, -.09, .092), (.120, .192, .088), 'skin', 'Root', q(10, 16), q(6, 10), uvfn=fur_uv)

    # Continuous otter snout bridge + soft chin + broad sleek glossy diamond otter nose + warm welcoming curved otter smile (NO startled 'O' mouth!).
    b.ellipsoid((0, -.364, 1.356), (.136, .122, .076), 'ivory', 'Head', q(10, 16), q(6, 10))
    b.ellipsoid((0, -.370, 1.224), (.092, .086, .046), 'ivory', 'Head', q(8, 12), q(5, 8))
    def otter_nose(u, v):
        a = T * u
        phi = math.pi * (.005 + .990 * v)
        sp, cp = math.sin(phi), math.cos(phi)
        w_shape = 1.0 + .22 * cp - .12 * (cp ** 2)
        return Vector((.064 * w_shape * sp * math.sin(a), -.488 - .044 * sp * math.cos(a), 1.356 + .038 * cp))
    b.grid(otter_nose, q(10, 16), q(6, 10), 'dark', 'Head', True, True)
    # Warm, unmistakably joyful curved upturned otter smile hugging proud along the exact front contour of whisker pads & chin (zero frown or startled 'O'!).
    def _muzzle_front_y(x, z):
        px = (abs(x) - .088) / .106
        pz = (z - 1.304) / .082
        p_in = 1.0 - px * px - pz * pz
        py = (-.402 - .118 * math.sqrt(p_in)) if p_in > 0.0 else -.402
        cx = x / .092
        cz = (z - 1.224) / .046
        c_in = 1.0 - cx * cx - cz * cz
        cy = (-.370 - .086 * math.sqrt(c_in)) if c_in > 0.0 else -.370
        return min(py, cy, -.452)

    def otter_smile_pt(t):
        s = 2.0 * t - 1.0
        x = .124 * s
        z = 1.250 + .046 * (s ** 2)
        y = _muzzle_front_y(x, z) - .004
        return Vector((x, y, z))

    def otter_smile_rad(t):
        base = .0095 * (.76 + .28 * math.sin(math.pi * t))
        if t < .12:
            k = (.12 - t) / .12
            return base * math.sqrt(max(0.0, 1.0 - k * k))
        if t > .88:
            k = (t - .88) / .12
            return base * math.sqrt(max(0.0, 1.0 - k * k))
        return base

    b.tube(otter_smile_pt, otter_smile_rad, q(6, 8), q(16, 22), 'dark', 'Head')

    # v41 MAJ-4: Thick streamlined otter tail extending 0.20u DEEPER inside the pelvis/lower back with a closed root cap
    # and smooth vertex normal & Torso<->Root<->Tail weight blending so the black crescent gap/void disappears 100%!
    tail_pts = [
        ( 0.06, -0.02, 0.29, 0.168),   # 0: buried 0.20u deep inside pelvis/lower back core (ZERO exposed open pipe edge!)
        (-0.02,  0.16, 0.25, 0.156),   # 1: plush smooth tail-root fillet emerging seamlessly from pelvis
        (-0.22,  0.34, 0.22, 0.128),   # 2: sweeping behind rump
        (-0.46,  0.24, 0.34, 0.098),   # 3: curving around left flank
        (-0.56,  0.06, 0.56, 0.072),   # 4: curling gracefully upward
        (-0.55, -0.04, 0.76, 0.050),   # 5: upper curl
        (-0.48, -0.07, 0.86, 0.032),   # 6: sleek tapered tip
    ]
    def tail_center(t):
        x, y, z, _ = curve(tail_pts, t * (len(tail_pts) - 1))
        return Vector((x, y, z))
    def tail_rad(t):
        _, _, _, r = curve(tail_pts, t * (len(tail_pts) - 1))
        cap0 = math.sin(min(1.0, t / .08) * math.pi * .5)   # closed smooth rounded root cap deep inside pelvis!
        if t > .90:
            k = (t - .90) / .10
            return r * cap0 * math.sqrt(max(0.0, 1.0 - k * k))
        return r * cap0
    def otter_tail_w(p, u, v):
        if v < .18:
            return {'Torso': .85, 'Root': .15}
        wt = smooth_w(.18, .48, v)
        wr = (1.0 - smooth_w(.18, .32, v)) * .15
        return {'Torso': max(0.0, 1.0 - wt - wr), 'Root': wr, 'Tail': wt}
    b.tube(tail_center, tail_rad, q(10, 18), q(18, 28), 'skin', otter_tail_w, uvfn=fur_uv)

    # m7 v29: Tailored 3D pleated coral-and-cream bistro apron (chest bib + cinched waist sash with tied bow & draped ribbons +
    # 5-pleat flared A-line skirt + sculpted 3D front pocket with coral welt & scallop shell emblem — clearly visible ABOVE the counter in 03-restaurant!).
    # 1) Tailored cream bistro chest bib (bv = 0.495..0.665, z ~ 1.03..0.76) tucking cleanly under the folded neckerchief & framed by cozy rounded otter shoulders!
    def apron_bib(u, v, inner=False):
        s = 2.0 * u - 1.0
        half_ang = .54 + .28 * (v ** .85)
        a = s * half_ang
        bv = .495 + .172 * v
        edge_roll = math.sin(math.pi * u) ** .35
        seam_dip = -.004 * math.exp(-((abs(s) - .44) / .08) ** 2) * math.sin(math.pi * v)
        dr = (.002 if inner else (.016 * edge_roll + .004 + seam_dip))
        return body((a / T) % 1.0, bv, dr)
    b.grid(lambda u, v: apron_bib(u, v, False), q(10, 20), q(4, 8), 'cloth', 'Torso', False, True, uvfn=lambda u, v: (.02 + .46 * u, .98 - .24 * v))
    b.grid(lambda u, v: apron_bib(u, v, True), q(8, 12), q(3, 5), 'cloth', 'Torso', False, False, uvfn=lambda u, v: (.02 + .46 * u, .98 - .24 * v))

    # 2) Tailored 3D pleated bistro apron skirt (bv = 0.667..0.900, z ~ 0.76..0.21) with 5 crisp sculpted pleats & gentle A-line hem flare!
    def apron_skirt(u, v, thick=0.0):
        s = 2.0 * u - 1.0
        a = s * (1.22 + .12 * v)
        bv = .667 + .233 * v
        # 5 smooth symmetrical box/knife pleats expanding naturally downward into a soft bistro hem flare
        pleat = (.007 + .018 * (v ** .78)) * math.cos(5.0 * math.pi * s) * (.45 + .55 * (math.sin(math.pi * u) ** .35))
        hem_flare = .016 + .034 * (v ** 1.15)
        edge_taper = .65 + .35 * (math.sin(math.pi * u) ** .35)
        return body((a / T) % 1.0, bv, (hem_flare + pleat) * edge_taper + thick)
    b.grid(lambda u, v: apron_skirt(u, v, .0), q(22, 40), q(7, 14), 'cloth', 'Torso', False, True, uvfn=lambda u, v: (u, .01 + .69 * v))
    b.grid(lambda u, v: apron_skirt(u, v, -.009), q(14, 22), q(5, 8), 'cloth', 'Torso', False, False, uvfn=lambda u, v: (u, .01 + .69 * v))
    # Closed crisp hem lip along bottom edge of flared skirt (zero paper-thin gap!)
    b.grid(lambda u, v: apron_skirt(u, 1.0, -.009 * v), q(22, 40), 1, 'cloth', 'Torso', False, True, uvfn=lambda u, v: (u, .68))

    # 3) Sculpted 3D front bistro pocket seated prominently right below cinched waist sash (z ~ 0.55..0.72 -> 100% VISIBLE ABOVE COUNTER in 03-restaurant!).
    def apron_pocket(u, v):
        # Smooth rounded pillow-pocket proud of upper pleated skirt center
        us = .32 + .36 * u
        vs = .09 + .30 * v
        p_base = apron_skirt(us, vs, .0)
        # Outward unit normal in horizontal XY
        ang = (2.0 * us - 1.0) * (1.22 + .12 * vs)
        n_out = Vector((math.sin(ang), -math.cos(ang), 0.0))
        # Taper pocket edges smoothly onto skirt along left/right/bottom, crisp standing welt at top (v=0)!
        env_u = math.sin(math.pi * u) ** .32
        env_b = math.sin(math.pi * (.14 + .86 * (1.0 - v))) ** .32 if v > .65 else 1.0
        puff = .018 * env_u * env_b + .004 * (1.0 - v)
        return p_base + n_out * puff
    b.grid(apron_pocket, q(10, 18), q(5, 9), 'cloth', 'Torso', False, True, uvfn=lambda u, v: (.52 + .46 * u, .98 - .24 * v))
    # Crisp 3D rounded coral welt lip crowning the top edge of the front pocket!
    b.tube(lambda t: apron_pocket(t, .02), lambda t: .0095 * (.75 + .25 * math.sin(math.pi * t)), q(4, 7), q(8, 12), 'fin', 'Torso')

    # 4) Tailored cinched 3D coral waist sash wrapping snugly at the tapered otter waist (bv = 0.667, z = 0.76 -> clearly above counter!)
    def waist_sash(u, v):
        # Rounded cushioned fabric sash profile
        bv = .667 + (v - .5) * .048
        dr = .012 + .018 * (math.sin(math.pi * v) ** .55)
        return body(u, bv, dr)
    b.grid(waist_sash, q(22, 38), q(3, 5), 'fin', 'Torso', True, True)

    # 5) Prominent 3D tied coral waist sash bow & gently draped ribbon tails at the open front-right waist (visible in front, quarter & 03-restaurant!)
    bow_ang = .76  # ~43 deg right-front waist (open side below raised shell paw!)
    bow_n = Vector((math.sin(bow_ang), -math.cos(bow_ang), 0.0))
    bow_t = Vector((math.cos(bow_ang), math.sin(bow_ang), 0.0))
    bow_c = body((bow_ang / T) % 1.0, .667, .036)
    b.ellipsoid(bow_c, (.030, .030, .028), 'fin', 'Torso', q(6, 10), q(4, 6))
    for sb in (-1, 1):
        # Two plump tailored fabric bow loops angling crisply outward & slightly up
        def bow_loop(u, v, sb=sb):
            a = T * u
            phi = math.pi * (.04 + .92 * v)
            sp, cp = math.sin(phi), math.cos(phi)
            lx = sb * (.042 + .046 * sp * math.cos(a))
            ly = .020 * sp * math.sin(a)
            lz = .012 * sb * (sp * math.cos(a)) + .026 * cp
            return bow_c + bow_t * lx + bow_n * (.012 + ly) + Vector((0, 0, .006 + lz))
        b.grid(bow_loop, q(6, 10), q(4, 7), 'fin', 'Torso', True, True)
        # Twin gracefully draped coral sash ribbon tails hanging visibly beside the pocket (z ~ 0.74 -> 0.56, above counter!)
        def sash_tail(u, v, sb=sb):
            a = T * u
            w = (.018 + .012 * v) * math.sqrt(max(0.0, 1.0 - (v ** 6.0)))
            th = .0085 * math.sqrt(max(0.0, 1.0 - (v ** 5.0)))
            ang_t = bow_ang + sb * (.08 + .12 * v)
            bv_t = .672 + .095 * v
            c_t = body((ang_t / T) % 1.0, bv_t, .038 + .018 * v + .006 * math.sin(math.pi * v))
            nt = Vector((math.sin(ang_t), -math.cos(ang_t), 0.0))
            tt = Vector((math.cos(ang_t), math.sin(ang_t), 0.0))
            return c_t + tt * (w * math.cos(a)) + nt * (th * math.sin(a))
        b.grid(sash_tail, q(5, 9), q(5, 8), 'fin', 'Torso', True, False)
    # Neat secondary back sash knot at rear waist
    for s in (-1, 1):
        b.ellipsoid((s * .042, .248, .76), (.046, .022, .026), 'fin', 'Torso', q(5, 8), q(3, 5))
    b.ellipsoid((0, .254, .76), (.020, .020, .020), 'fin', 'Torso', q(5, 7), q(3, 5))

    # Folded triangular neckerchief hugging the sleeker otter neck snugly (smooth Head<->Torso collar blend so it moves with neck!).
    def kerchief(u, v):
        a = T * u
        front = (.5 + .5 * math.cos(a)) ** 2.2
        r_x = .218 + .034 * v
        r_y = .210 + .042 * v
        z = 1.15 - .05 * v - .11 * front * v
        return Vector((r_x * math.sin(a), -r_y * math.cos(a) - .01, z))
    def kerchief_w(p, u, v):
        wh = (1.0 - smooth_w(.00, .85, v)) * .52
        return {'Head': wh, 'Torso': 1.0 - wh}
    b.grid(kerchief, q(16, 28), q(3, 6), 'fin', kerchief_w, True, True)
    b.ellipsoid((0, -.220, 1.11), (.025, .021, .023), 'fin', lambda p, u, v: {'Head': .24, 'Torso': .76}, q(6, 10), q(4, 6))
    for s in (-1, 1):
        b.tube(lambda t, s=s: Vector((s * (.014 + .052 * t), -.230 - .024 * t, 1.10 - .092 * t)), lambda t: .021 * math.sin(math.pi * (.15 + .75 * t)), q(5, 8), q(5, 8), 'fin', lambda p, u, v: {'Head': .20 * (1.0 - smooth_w(.0, .6, v)), 'Torso': 1.0 - .20 * (1.0 - smooth_w(.0, .6, v))})

    # Left arm & paw tucked cleanly along cozy rounded left shoulder & hip (smooth Torso->Paw.L shoulder blend!).
    b.ellipsoid((-.235, -.02, .99), (.074, .076, .078), 'skin', lambda p, u, v: {'Torso': .62, 'Paw.L': .38}, q(8, 12), q(5, 8), uvfn=fur_uv)
    b.tube(lambda t: Vector((-.235 - .095 * math.sin(t * math.pi * .68), -.02 - .14 * t, .99 - .29 * t)), lambda t: .068 - .011 * t, q(8, 12), q(6, 10), 'skin', _limb_w('Torso', 'Paw.L', .04, .44), uvfn=fur_uv)
    b.ellipsoid((-.318, -.16, .695), (.076, .086, .062), 'skin', 'Paw.L', q(10, 14), q(6, 10), uvfn=fur_uv)

    # Right arm & naturally cupped gripping paw (smooth Torso->Paw.R shoulder blend on upper arm; cupped palm, fingers, saucer & scallop 100% locked to Paw.R!).
    paw_c = Vector((.51, -.42, .895))
    dish_c = paw_c + Vector((.015, -.025, .092))
    palm_c = dish_c + Vector((-.020, .018, -.072))
    b.ellipsoid((.235, -.02, .99), (.074, .076, .078), 'skin', lambda p, u, v: {'Torso': .62, 'Paw.R': .38}, q(8, 12), q(5, 8), uvfn=fur_uv)
    def r_arm_pt(t):
        p0 = Vector((.235, -.02, .99))
        p1 = palm_c + Vector((-.010, .010, -.002))
        return p0.lerp(p1, t) + Vector((0, 0, -.042 * math.sin(t * math.pi)))
    def r_arm_rad(t):
        base = .066 - .014 * t
        if t > .88:
            k = (t - .88) / .12
            return base * math.sqrt(max(0.0, 1.0 - k * k))
        return base
    b.tube(r_arm_pt, r_arm_rad, q(8, 12), q(6, 10), 'skin', _limb_w('Torso', 'Paw.R', .04, .44), uvfn=fur_uv)

    # Cupped palm tucked directly under the curved saucer bowl (seamlessly encloses wrist, top strictly below saucer inner floor!).
    b.ellipsoid(palm_c, (.084, .088, .038), 'skin', 'Paw.R', q(10, 14), q(6, 10), uvfn=fur_uv)

    # 4 naturally curved otter fingers radiating beneath the bowl and curling cleanly up around the outer-front saucer rim + opposing curved thumb!
    def grip_digit(phi, r_end, z_end, rad0):
        d = Vector((math.sin(phi), -math.cos(phi), 0))
        pts = [
            dish_c + d * .055 + Vector((0, 0, -.062)),
            dish_c + d * .156 + Vector((0, 0, -.040)),
            dish_c + d * .224 + Vector((0, 0, -.004)),
            dish_c + d * r_end + Vector((0, 0, z_end)),
        ]
        def d_pt(t, pts=pts):
            x, y, z = curve([(p.x, p.y, p.z) for p in pts], t * (len(pts) - 1))
            return Vector((x, y, z))
        def d_rad(t, rad0=rad0):
            base = rad0 * (1.0 - .22 * t)
            if t > .84:
                k = (t - .84) / .16
                return base * math.sqrt(max(0.0, 1.0 - k * k))
            return base
        b.tube(d_pt, d_rad, q(5, 8), q(6, 10), 'skin', 'Paw.R', uvfn=fur_uv)

    for phi in (-.32, .16, .64, 1.12):
        grip_digit(phi, .230, .034, .0215)
    # Opposing curved thumb wrapping cleanly around the inner-front rim edge
    grip_digit(-1.26, .226, .036, .0205)

    # Sculpted porcelain saucer cupped tightly by the curved fingers & thumb + large fluted pearl-cream scallop shell.
    def dish(u, v):
        a = T * u
        r = .215 * math.sin(math.pi * .5 * v)
        z_cup = -.024 * math.cos(math.pi * .5 * v) + .038 * (v ** 2)
        return dish_c + Vector((r * math.sin(a), -r * math.cos(a), z_cup))
    b.grid(dish, q(14, 24), q(5, 9), 'ivory', 'Paw.R', True, True, uvfn=lambda u, v: (u, .5))
    b.grid(lambda u, v: dish(u, v) - Vector((0, 0, .014 * (1 - .4 * v))), q(14, 24), q(4, 7), 'ivory', 'Paw.R', True, False, uvfn=lambda u, v: (u, .5))
    shell_c = dish_c + Vector((0, -.01, .018))
    ca72, sa72 = math.cos(math.radians(72)), math.sin(math.radians(72))
    for layer in (-1, 1):
        def scallop_shell(u, v, layer=layer):
            ang = (u - .5) * 2.2
            rad = .24 * v
            flute = .018 * math.cos(ang * 7) * math.sin(math.pi * v)
            dome = .044 * math.sin(math.pi * v) * math.cos(ang * .5)
            sy0 = rad * math.cos(ang)
            sz0 = layer * (dome * .5 + .007) + flute
            return shell_c + Vector((rad * math.sin(ang), sy0 * ca72 - sz0 * sa72, sy0 * sa72 + sz0 * ca72))
        b.grid(scallop_shell, q(14, 24), q(6, 10), 'ivory', 'Paw.R', False, reverse=layer < 0)
    b.ellipsoid(shell_c + Vector((0, 0, .008)), (.048, .028, .020), 'ivory', 'Paw.R', q(6, 10), q(4, 6))
    return b.object(mat, rig, 'Restaurant Otter', ground=True)


# ---------------------------------------------------------------------------
# 5. FRIEND SEAL (M5 v20: Shelly-Grade Plush Harbor Seal + Striped Neckerchief)
# ---------------------------------------------------------------------------
def seal_eye(side):
    # v41 MAJ-1: Tall expressive Mario Party vertical pill-oval eyes (aspect=0.68, warm chestnut-violet) sitting cleanly above whisker pads!
    c = Vector((side * .174, -.584, .988))
    n = Vector((side * .27, -.92, .22)).normalized()
    h = Z.cross(n).normalized()
    v = n.cross(h).normalized()
    return c, h, v, n


SEAL_TORSO = [
    (-.30, .82, .000, .000),
    (-.26, .79, .26, .24),
    (-.19, .71, .32, .29),
    (-.09, .59, .37, .34),
    (.04, .47, .43, .38),
    (.24, .38, .45, .39),
    (.48, .29, .40, .34),
    (.72, .21, .26, .22),
    (.92, .16, .000, .000),
]


def seal_mesh(close, mat, rig):
    b = Mesh()
    q = lambda a, c: c if close else a

    # M5 v20 + v38: Smooth high-segment vertical-Z polar plush head dome with smooth Head <-> Torso lower-neck blend (zero snowman pivot!).
    def seal_head(u, v):
        a = T * u
        phi = math.pi * (.002 + .996 * v)
        sp, cp = math.sin(phi), math.cos(phi)
        cheek = 1.0 + .072 * math.exp(-((v - .58) / .18) ** 2) * (math.sin(a) ** 2)
        return Vector((
            .325 * sp * math.sin(a) * cheek,
            -.34 - .315 * sp * math.cos(a),
            .92 + .295 * cp,
        ))

    def seal_head_w(p, u, v):
        # Keep front face (eyes, nose, whiskers, smile) 100% Head while blending lower-rear neck cleanly into Torso!
        if p.y < -.38 or p.z > .86:
            return {'Head': 1.0}
        wz = smooth_w(.64, .86, p.z)
        wy = smooth_w(-.12, -.38, p.y)
        wh = max(wz, wy)
        return {'Head': wh, 'Torso': 1.0 - wh}

    b.grid(
        seal_head, q(34, 56), q(20, 34), 'skin', seal_head_w, True, True,
        uvfn=lambda u, v: (abs((u + .5) % 1 - .5) * 2, .44 * v)
    )

    # Smooth continuous lounging harbor-seal torso flowing organically from inside the neck crease down to the reclining tail.
    def body_frame(v):
        st = v * (len(SEAL_TORSO) - 1)
        y, z, rx, rz = curve(SEAL_TORSO, st)
        b0 = curve(SEAL_TORSO, max(0.0, st - .02))
        a0 = curve(SEAL_TORSO, min(len(SEAL_TORSO) - 1.0, st + .02))
        dy, dz = a0[0] - b0[0], a0[1] - b0[1]
        nrm = Vector((0, -dz, dy)).normalized() if abs(dy) + abs(dz) > 1e-5 else Vector((0, 0, 1))
        return Vector((0, y, z)), nrm, rx, rz

    def body_surf(u, v):
        c, nrm, rx, rz = body_frame(v)
        a = T * u
        return c + Vector((math.sin(a) * rx, 0, 0)) + nrm * (math.cos(a) * rz)

    def body_w(p, u, v):
        if v < .30:
            wt = smooth_w(.00, .30, v)
            return {'Head': 1.0 - wt, 'Torso': wt}
        if v > .70:
            wt = smooth_w(.70, .94, v)
            return {'Torso': 1.0 - wt, 'Tail': wt}
        return {'Torso': 1.0}

    b.grid(
        body_surf, q(34, 56), q(24, 40), 'skin', body_w, True, False,
        uvfn=lambda u, v: (abs((u + .5) % 1 - .5) * 2, .46 + .54 * v)
    )

    for s, suf in ((-1, 'L'), (1, 'R')):
        # v42 MIN-9: Tall unmistakable Mario Party vertical pill-oval eyes (aspect=0.58, warm chestnut-violet + vertical sparkle)!
        shelly_eye(b, s, q(18, 28), q(12, 18), seal_eye, .136, seal_head, (q(34, 56), q(20, 34)), depth=.110, swell=.046)
        # Plump sculpted cream whisker pads + 3 clean sturdy tapered whiskers per side.
        b.ellipsoid((s * .076, -.632, .852), (.098, .084, .072), 'ivory', 'Head', q(14, 22), q(8, 14))
        for i, (dz_w, pitch_w, len_w) in enumerate(((.022, .055, .165), (0.0, -.005, .180), (-.022, -.060, .155))):
            root = Vector((s * .115, -.685, .845 + dz_w))
            b.tube(
                lambda t, s=s, root=root, pitch_w=pitch_w, len_w=len_w: root + Vector((s * len_w * t, -.030 * t + .055 * (t ** 2), pitch_w * t - .025 * (t ** 2))),
                lambda t: .0068 * (1.0 - .64 * t) * math.sqrt(max(0.0, 1.0 - max(0.0, (t - .85) / .15) ** 2)),
                q(4, 6), q(6, 10), 'ivory', 'Head'
            )
        # Gracefully curved plush teardrop paddle fore-flippers resting naturally along the flanks.
        def flipper_spine(v, s=s):
            return Vector((
                s * (.32 + .29 * math.sin(v * math.pi * .62) + .04 * v),
                -.04 + .32 * (v ** 1.35),
                .34 - .23 * (v ** .85) + .035 * math.sin(math.pi * v),
            ))
        def flipper_paddle(u, v, s=s):
            c = flipper_spine(v, s)
            t_sp = (flipper_spine(min(1.0, v + .004), s) - flipper_spine(max(0.0, v - .004), s)).normalized()
            n_ref = Vector((s * .25, .10, .96)).normalized()
            c_dir = t_sp.cross(n_ref).normalized()
            n_up = c_dir.cross(t_sp).normalized()
            tip = math.sqrt(max(0.0, 1.0 - (v ** 2.6)))
            chord = .140 * (math.sin(math.pi * (.04 + .92 * v)) ** .60) * (.74 + .46 * v) * tip
            thick = .054 * (math.sin(math.pi * (.04 + .92 * v)) ** .60) * tip
            return c + c_dir * (chord * math.cos(T * u)) + n_up * (thick * math.sin(T * u))
        b.grid(
            flipper_paddle, q(14, 22), q(10, 16), 'skin', _limb_w('Torso', 'Fin.' + suf, .02, .32), True, True,
            uvfn=lambda u, v: (.20 + .22 * abs(2 * u - 1), .56 + .20 * v)
        )
        # Broad sculpted fanned hind flippers sweeping cleanly back on Z = 0.
        b.ellipsoid((s * .17, .98, .12), (.145, .265, .080), 'skin', 'Tail', q(14, 20), q(8, 14), uvfn=lambda u, v: (.22, .84))

    # m9 v23: Soft unified cream chin cushion + cute glossy espresso button nose + BRIGHTENED, RAISED, FULLY-EXPOSED upturned 'w' smile!
    # Computes exact outer whisker-pad/chin front Y so the joyful upturned corners NEVER bury inside the whisker pads!
    b.ellipsoid((0, -.598, .792), (.098, .070, .048), 'ivory', 'Head', q(12, 18), q(7, 12))
    b.ellipsoid((0, -.706, .908), (.050, .032, .035), 'dark', 'Head', q(14, 20), q(8, 12), uvfn=lambda u, v: (u, .06 + .36 * v))

    def _seal_muzzle_y(x, z):
        px = (abs(x) - .076) / .098
        pz = (z - .852) / .072
        p_in = 1.0 - px * px - pz * pz
        py = (-.632 - .084 * math.sqrt(p_in)) if p_in > 0.0 else -.632
        cx = x / .098
        cz = (z - .792) / .048
        c_in = 1.0 - cx * cx - cz * cz
        cy = (-.598 - .070 * math.sqrt(c_in)) if c_in > 0.0 else -.598
        # Also stay cleanly proud of the head sphere itself at outer corners
        hx = x / .332
        hz = (z - .920) / .295
        h_in = 1.0 - hx * hx - hz * hz
        hy = (-.340 - .315 * math.sqrt(h_in)) if h_in > 0.0 else -.600
        return min(py, cy, hy)

    for s in (-1, 1):
        def seal_smile_pt(t, s=s):
            x = s * .132 * t
            # Joyful raised upturned 'w' smile: cute shallow center cusp (0.838) -> soft dip (0.826) -> high happy upturned cheek corners (0.870)!
            z = .838 - .022 * math.sin(t * math.pi * .88) + .038 * (t ** 1.45)
            y = _seal_muzzle_y(x, z) - .007
            return Vector((x, y, z))
        b.tube(
            seal_smile_pt,
            lambda t: .0112 * (.86 + .16 * math.sin(math.pi * t)) * math.sqrt(max(0.0, 1.0 - max(0.0, (t - .84) / .16) ** 2)),
            q(5, 8), q(8, 12), 'dark', 'Head',
            uvfn=lambda u, v: (u, .62 + .32 * v)
        )

    # Cozy coral-and-cream striped harbor neckerchief with smooth Head<->Torso collar weights so it moves naturally with the seal's neck!
    def kerchief_ring(u, v):
        a = T * u
        b_ang = T * v
        rc_x = .272 + .050 * math.cos(b_ang)
        rc_y = .256 + .050 * math.cos(b_ang)
        z_ring = .658 - .052 * math.cos(a) + .050 * math.sin(b_ang)
        return Vector((rc_x * math.sin(a), -.25 - rc_y * math.cos(a), z_ring))
    def seal_kerchief_w(p, u, v):
        wh = smooth_w(.55, .80, p.z) * .48
        return {'Head': wh, 'Torso': 1.0 - wh}
    b.grid(kerchief_ring, q(28, 44), q(10, 16), 'cloth', seal_kerchief_w, True, False, uvfn=lambda u, v: (u, v))
    # Neat sculpted bandana knot tucked cleanly to the LEFT-FRONT SIDE (x=-0.245, well clear of chin/mouth!).
    knot_c = Vector((-.248, -.402, .622))
    b.ellipsoid(knot_c, (.068, .062, .062), 'cloth', lambda p, u, v: {'Head': .20, 'Torso': .80}, q(12, 18), q(8, 12), uvfn=lambda u, v: (.20 + .30 * u, .50))
    # Two short adorable flared triangular kerchief ends fluttering cleanly outward to the left side!
    for dy_k, dz_k, tilt_k, L_k in ((-.02, .01, .28, .22), (.04, -.06, -.22, .19)):
        u_w = Vector((0.0, math.sin(tilt_k), math.cos(tilt_k)))
        u_t = Vector((0.0, -math.cos(tilt_k), math.sin(tilt_k)))
        def k_tail(u, v, dy_k=dy_k, dz_k=dz_k, u_w=u_w, u_t=u_t, L_k=L_k):
            a = T * u
            c = knot_c + Vector((-.02 - L_k * v, dy_k * v - .04 * (v ** 1.5), dz_k * v - .04 * (v ** 2)))
            w = (.034 + .054 * v) * math.sqrt(max(0.0, 1.0 - (v ** 7.0)))
            th = .015 * math.sqrt(max(0.0, 1.0 - (v ** 5.0)))
            return c + u_w * (w * math.cos(a)) + u_t * (th * math.sin(a))
        b.grid(k_tail, q(10, 14), q(8, 12), 'cloth', lambda p, u, v: {'Head': .18 * (1.0 - smooth_w(.0, .6, v)), 'Torso': 1.0 - .18 * (1.0 - smooth_w(.0, .6, v))}, True, True, uvfn=lambda u, v: (.5 * v, abs(2 * u - 1)))
    return b.object(mat, rig, 'Friend Seal', ground=True)


# ---------------------------------------------------------------------------
# 6. TAXI SQUID (v41 MIN-1 & MAJ-1: Seamless Organic Torpedo Mantle into Head — ZERO Protruding Brim Lip!
#    + Bold +18 deg Splatoon Cat-Almond Emerald-Teal Eyes + 2 Long Sleek Club-Tipped Feeding Tentacles!)
# ---------------------------------------------------------------------------
_SQUID_PROFILE = [
    # (z, r, lean_y) — silky C1 cardinal-spline silhouette from rounded bullet apex -> smoothly tapered organic mantle waist -> plump head!
    (2.64, .000, .220),   # 0: rounded torpedo apex
    (2.48, .158, .180),   # 1: smooth ogive bullet tip
    (2.16, .322, .112),   # 2: sleek upper mantle
    (1.79, .426, .032),   # 3: full torpedo mid-mantle
    (1.48, .414, -.004),  # 4: silky organic gently tapered mantle-to-head waist (NO protruding hat-brim lip!)
    (1.20, .456, -.016),  # 5: expressive face & bold cat-almond eye cheeks
    (0.96, .442, -.010),  # 6: plump lower head & arm-crown base
    (0.76, .295,  .000),  # 7: plump closed lower dome burying all arm roots
    (0.66, .000,  .000),  # 8: closed bottom pole
]


def _squid_mantle(u, v):
    # v in [0..1]: ONE continuous silky C1 spline from rounded pointed torpedo apex (z=2.64) seamlessly into the sculpted head (z=0.66)!
    a = T * u
    ve = .001 + .998 * v
    ca, sa = math.cos(a), math.sin(a)
    z, r_base, lean = curve(_SQUID_PROFILE, ve * (len(_SQUID_PROFILE) - 1))
    r_base = max(.001, r_base)
    cheek_oval = 1.0 + .055 * math.exp(-(((ve - .68) / .14) ** 2)) * (sa ** 2)
    w = r_base * 1.03 * cheek_oval
    d = r_base * .95
    return Vector((w * sa, lean - d * ca, z))


def _squid_mantle_pt(angle, z):
    # Invert z monotonically across _squid_mantle (z in [0.66..2.64])
    lo, hi = .002, .998
    u = (angle / T) % 1.0
    for _ in range(16):
        mid = .5 * (lo + hi)
        if _squid_mantle(u, mid).z > z:
            lo = mid
        else:
            hi = mid
    return _squid_mantle(u, .5 * (lo + hi))


def squid_eye(side):
    # v41 MAJ-1: Bold sleek diagonal cat-almond Splatoon-style emerald-teal eyes (+18 deg tilt, crisp dark lash+wing)!
    cen = _squid_mantle_pt(side * .56, 1.17)
    n = Vector((side * .42, -.90, .08)).normalized()
    h = Z.cross(n).normalized()
    v = n.cross(h).normalized()
    return cen, h, v, n


# v41 MIN-1: Two noticeably LONGER sleek club-tipped feeding tentacles sweeping gracefully outward (±1.48u reach!)
# alongside the 6 shorter tapering squid arms (while staying cleanly below eye height so side.png stays 100% unobstructed!).
SQUID_HERO_TENTS = {
    -1: [
        (-.18, -.02, .88),
        (-.56, -.12, .74),
        (-.96, -.20, .66),
        (-1.30, -.24, .74),
        (-1.48, -.26, .88),
        (-1.42, -.28, .98),
        (-1.26, -.27, .94),
    ],
    1: [
        (.18, -.02, .88),
        (.56, -.12, .75),
        (.96, -.20, .68),
        (1.30, -.24, .77),
        (1.48, -.26, .91),
        (1.41, -.28, 1.00),
        (1.25, -.27, .96),
    ],
}

SQUID_ARMS = [
    # 0, 1: Compact shorter forward-swept tapering squid arms curling below smile (ZERO mouth/eye overlap!)
    [(-.14, -.14, .84), (-.30, -.34, .64), (-.44, -.44, .58), (-.49, -.42, .66), (-.41, -.36, .70)],
    [( .14, -.14, .84), ( .30, -.34, .64), ( .44, -.44, .58), ( .49, -.42, .66), ( .41, -.36, .70)],
    # 2, 3: Shorter streamlined tapering front-lateral lower squid arms grounded on Z = 0
    [(-.14, -.10, .82), (-.26, -.18, .38), (-.44, -.22, .12), (-.60, -.18, .19), (-.66, -.12, .34)],
    [( .14, -.10, .82), ( .26, -.18, .38), ( .44, -.22, .12), ( .60, -.18, .19), ( .66, -.12, .34)],
    # 4, 5: Shorter streamlined tapering rear-lateral lower squid arms grounded on Z = 0
    [(-.14,  .12, .82), (-.24,  .26, .38), (-.40,  .40, .12), (-.52,  .50, .20), (-.54,  .56, .35)],
    [( .14,  .12, .82), ( .24,  .26, .38), ( .40,  .40, .12), ( .52,  .50, .20), ( .54,  .56, .35)],
]


def _squid_tentacle_tube(b, pts, r0, club_amp, weights, nu, nv, face_hint=Vector((0, -1, 0))):
    """Parallel-transported smooth curled squid arm/tentacle with CLOSED rounded root cap, flared hip, spade club & closed dome tip."""
    n_seg = len(pts) - 1
    c_pts = [Vector(curve(pts, (k / nv) * n_seg)) for k in range(nv + 1)]
    frames = []
    for k in range(nv + 1):
        t_ax = (c_pts[min(nv, k + 1)] - c_pts[max(0, k - 1)]).normalized()
        if k == 0:
            a = face_hint - t_ax * face_hint.dot(t_ax)
            if a.length < .05:
                a = Vector((0, 0, 1)) - t_ax * t_ax.z
            a.normalize()
        else:
            prev_a = frames[-1][0]
            a = prev_a - t_ax * prev_a.dot(t_ax)
            if a.length < .05:
                a = Vector((1, 0, 0)) - t_ax * t_ax.x
            a.normalize()
        bb = t_ax.cross(a).normalized()  # a x bb == +t_ax -> outward normals with reverse=False!
        frames.append((a, bb))

    def rad(v):
        cap0 = math.sin(min(1.0, v / .07) * math.pi * .5)
        hip = 1.0 + .28 * math.exp(-(((v - .08) / .14) ** 2))
        club = 1.0 + club_amp * math.exp(-(((v - .80) / .12) ** 2))
        tip = max(0.0, (v - .86) / .14)
        return (r0 * (1.0 - .68 * (v ** .88)) + .015) * cap0 * hip * club * math.sqrt(max(0.0, 1.0 - tip * tip)) + .0015

    def point(u, v):
        j = min(nv, int(round(v * nv)))
        a, bb = frames[j]
        r = rad(v)
        club_flat = 1.0 + .28 * club_amp * math.exp(-(((v - .80) / .12) ** 2))
        return c_pts[j] + r * (a * math.cos(T * u) + bb * (club_flat * math.sin(T * u)))

    b.grid(point, nu, nv, 'rim', weights, True, False)


def squid_mesh(close, mat, rig):
    b = Mesh()
    q = lambda a, c: c if close else a

    # 1. v41 MIN-1: Tall sleek pointed torpedo squid mantle tapering SEAMLESSLY into the expressive head (NO protruding collar/brim lip!)
    b.grid(_squid_mantle, q(36, 56), q(28, 44), 'skin', 'Head', True, True)

    # 2. Bold sleek +18 deg Splatoon cat-almond emerald-teal eyes + CLASSIC SPEARHEAD/ARROWHEAD SQUID FINS!
    for s, suf in ((-1, 'L'), (1, 'R')):
        shelly_eye(b, s, q(18, 28), q(12, 18), squid_eye, .174, _squid_mantle, (q(36, 56), q(28, 44)), depth=.110, swell=.046, lid_scale=.92)

        # v42 MIN-7: Hydrodynamic diamond/arrowhead squid fins sweeping smoothly backward & downward along the rear mantle apex!
        def squid_fin(u, v, s=s):
            ang = T * u
            ca, sa = math.cos(ang), math.sin(ang)
            v_s = math.sin(v * math.pi * .5)
            tip_c = math.cos(v * math.pi * .5)
            # Sweep smoothly backward (+Y) and downward (-Z) from the rear tapered torpedo apex
            z_top = 2.58 - .40 * (v_s ** .92) + .024 * math.sin(math.pi * v)
            z_bot = 1.98 - .10 * (v_s ** 1.05) - .024 * math.sin(math.pi * v)
            z_mid = .5 * (z_top + z_bot)
            hz = max(.008, .5 * (z_top - z_bot))
            z_p = z_mid + hz * ca
            t_cone = max(0.0, min(1.0, (2.64 - z_p) / 1.16))
            x_root = .38 * (t_cone ** .68)
            x = s * (x_root * (1.0 - v_s) + .68 * v_s)
            y_root = .19 * ((1.0 - t_cone) ** 1.25) + .08 * (1.0 - ca) * .35
            y_mid = y_root * (1.0 - v_s) + .64 * v_s + .035 * math.sin(math.pi * v)
            hy = (.042 * (1.0 - .64 * v) + .012 * math.exp(-((v / .20) ** 2))) * (tip_c ** .44)
            return Vector((x, y_mid + hy * sa, z_p))

        b.grid(
            squid_fin, q(14, 22), q(12, 18), 'fin', _limb_w('Head', 'Fin.' + suf, .04, .34),
            True, reverse=(s > 0), uvfn=lambda u, v: (u, v)
        )

        # v41 MIN-1: Two noticeably LONGER sleek club-tipped feeding tentacles sweeping gracefully outward (±1.48u)!
        _squid_tentacle_tube(
            b, SQUID_HERO_TENTS[s], r0=.078, club_amp=.78,
            weights=_limb_w('Head', 'Tent.' + suf, .06, .38),
            nu=q(10, 16), nv=q(24, 38), face_hint=Vector((0, -1, 0))
        )

    # 3. Six shorter streamlined tapering squid arms (2 compact forward arms + 4 grounded lower tapering arms)
    for i, pts in enumerate(SQUID_ARMS):
        r0 = .086 if i < 2 else .104
        _squid_tentacle_tube(
            b, pts, r0=r0, club_amp=0.0,
            weights=_limb_w('Head', f'Arm.{i}', .08, .44),
            nu=q(8, 14), nv=q(16, 28), face_hint=Vector((0, -1, 0))
        )

    # 4. Warm joyful upturned berry-plum smile projected 100% FLUSH onto the exact lower cheek surface (zero floating gap in side.png!)
    def squid_smile_pt(t):
        s_x = 2.0 * t - 1.0
        p = _squid_mantle_pt(s_x * .25, .968 + .034 * (s_x ** 2))
        return p + Vector((0.0, -.005, 0.0))
    def squid_smile_r(t):
        base = .0120 * (.78 + .24 * math.sin(math.pi * t))
        if t < .12:
            return base * math.sqrt(max(0.0, 1.0 - ((.12 - t) / .12) ** 2))
        if t > .88:
            return base * math.sqrt(max(0.0, 1.0 - ((t - .88) / .12) ** 2))
        return base
    b.tube(squid_smile_pt, squid_smile_r, q(6, 8), q(10, 16), 'dark', 'Head', uvfn=lambda u, v: (u, .62 + .30 * v))

    # 5. Jaunty SMALL yellow-and-black checkered taxi cap nestled 100% flush on the front-right tapered torpedo mantle
    #    WITHOUT hiding the tall pointed torpedo squid mantle or spearhead triangular tail fins!
    cap_c = Vector((.11, -.265, 1.665))
    cap_pitch = math.radians(26.0)   # tilts forward along the curved front torpedo slope
    cap_roll = math.radians(-14.0)   # jaunty side tilt
    cp_s, sp_s = math.cos(cap_pitch), math.sin(cap_pitch)
    cr_s, sr_s = math.cos(cap_roll), math.sin(cap_roll)
    cap_r = Vector((cr_s, 0.0, sr_s)).normalized()
    cap_u = Vector((-sr_s * cp_s, -sp_s, cr_s * cp_s)).normalized()
    cap_f = cap_r.cross(cap_u).normalized()  # forward (-Y-ish) in tilted cap frame
    if cap_f.y > 0:
        cap_f = -cap_f
    cap_s = (.295, .275, .175)

    def cap_pt(rx, rf, rz):
        return cap_c + cap_r * rx + cap_f * rf + cap_u * rz

    b.grid(
        lambda u, v: cap_pt(
            cap_s[0] * math.sin(T * u) * math.sin((.001 + .999 * v) * math.pi * .5),
            cap_s[1] * math.cos(T * u) * math.sin((.001 + .999 * v) * math.pi * .5),
            cap_s[2] * math.cos((.001 + .999 * v) * math.pi * .5),
        ),
        q(24, 36), q(8, 12), 'cloth', 'Head', True, True, uvfn=lambda u, v: (u, v)
    )
    # Snug charcoal cap band overlapping slightly into dome (zero seam gap, strictly outward normals!)
    b.grid(
        lambda u, v: cap_pt((cap_s[0] + .007) * math.sin(T * u), (cap_s[1] + .007) * math.cos(T * u), -.050 + .062 * v),
        q(24, 36), q(2, 3), 'dark', 'Head', True, False, uvfn=lambda u, v: (u, .10 + .30 * v)
    )
    # Compact charcoal cap visor angled jauntily forward above the right brow
    def squid_visor(u, v):
        a = T * u
        t = math.pi * (.002 + .996 * v)
        vx = .245 * math.sin(t) * math.sin(a)
        vf = .170 * math.sin(t) * math.cos(a)
        vz = .028 * math.cos(t)
        return cap_pt(vx, .275 + vf, -.026 - .032 * math.sin(t) * max(0.0, math.cos(a)) + vz)
    b.grid(squid_visor, q(18, 28), q(6, 10), 'dark', 'Head', True, True, uvfn=lambda u, v: (u, .10 + .32 * v))
    b.grid(
        lambda u, v: cap_pt(
            .034 * math.sin(math.pi * v) * math.sin(T * u),
            .034 * math.sin(math.pi * v) * math.cos(T * u),
            cap_s[2] + .006 + .026 * math.cos(math.pi * v),
        ),
        q(8, 12), q(5, 8), 'gold', 'Head', True, True
    )
    return b.object(mat, rig, 'Taxi Squid', ground=True)


# ---------------------------------------------------------------------------
# Rig, Species-Specific Animation, Export & Stats
# ---------------------------------------------------------------------------
MESH_FNS = {
    'restaurant-otter': otter_mesh,
    'hotel-whale': whale_mesh,
    'pharmacy-shrimp': shrimp_mesh,
    'subway-ray': ray_mesh,
    'friend-seal': seal_mesh,
    'taxi-squid': squid_mesh,
}


def rig_create(char):
    data = bpy.data.armatures.new(char + ' species skeleton')
    ob = bpy.data.objects.new(char + ' rig', data)
    bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob
    ob.select_set(True)
    bpy.ops.object.mode_set(mode='EDIT')

    def bone(name, head, tail, parent=None):
        b = data.edit_bones.new(name)
        b.head = head
        b.tail = tail
        if parent:
            b.parent = data.edit_bones[parent]

    if char == 'subway-ray':
        bone('Float', (0, 0, 0), (0, 0, .25))
        bone('Body', (0, 0, .76), (0, -.12, .76), 'Float')
        bone('Head', (0, -.12, .76), (0, -.56, .76), 'Body')
        bone('Tail', (0, .64, .75), (0, 1.15, .75), 'Body')
        for s, suf in ((-1, 'L'), (1, 'R')):
            bone('WingIn.' + suf, (s * .42, 0, .76), (s * .88, .08, .75), 'Body')
            bone('WingTip.' + suf, (s * .88, .08, .75), (s * 1.38, .24, .74), 'WingIn.' + suf)
    elif char == 'hotel-whale':
        bone('Float', (0, 0, 0), (0, 0, .25))
        bone('Body', (0, .24, .80), (0, -.06, .82), 'Float')
        bone('Head', (0, -.06, .82), (0, -.68, .82), 'Body')
        bone('Tail', (0, .74, .70), (0, 1.56, .66), 'Body')
        for s, suf in ((-1, 'L'), (1, 'R')):
            bone('Fin.' + suf, (s * .32, .19, .54), (s * .54, .52, .36), 'Body')
    elif char == 'pharmacy-shrimp':
        bone('Float', (0, 0, 0), (0, 0, .25))
        bone('Body', (0, 0, .82), (0, -.15, .96), 'Float')
        bone('Head', (0, -.15, .96), (0, -.40, 1.06), 'Body')
        bone('Tail', (0, .18, .58), (0, .42, .36), 'Body')
        for s, suf in ((-1, 'L'), (1, 'R')):
            bone('Ant.' + suf, (s * .12, -.48, 1.12), (s * .36, -.70, 1.32), 'Head')
            bone('Arm.' + suf, (s * .24, -.26, .86), (s * .18, -.55, .82), 'Body')
    elif char == 'restaurant-otter':
        bone('Root', (0, 0, 0), (0, 0, .25))
        bone('Torso', (0, 0, .60), (0, 0, 1.12), 'Root')
        bone('Head', (0, 0, 1.15), (0, 0, 1.50), 'Torso')
        bone('Tail', (0, .18, .25), (-.48, .10, .55), 'Torso')
        bone('Paw.L', (-.25, -.04, .98), (-.28, -.17, .65), 'Torso')
        bone('Paw.R', (.25, -.04, .98), (.48, -.44, .88), 'Torso')
    elif char == 'taxi-squid':
        bone('Float', (0, 0, 0), (0, 0, .25))
        bone('Head', (0, 0, 1.15), (0, .12, 2.35), 'Float')
        for s, suf in ((-1, 'L'), (1, 'R')):
            bone('Fin.' + suf, (s * .28, .20, 2.24), (s * .86, .34, 2.15), 'Head')
            tp = SQUID_HERO_TENTS[s]
            bone('Tent.' + suf, tp[0], tp[3], 'Head')
        for i, pts in enumerate(SQUID_ARMS):
            bone(f'Arm.{i}', pts[0], pts[2], 'Head')
    else:  # friend-seal
        bone('Root', (0, 0, 0), (0, 0, .25))
        bone('Torso', (0, 0, .42), (0, -.22, .65), 'Root')
        bone('Head', (0, -.22, .68), (0, -.32, 1.04), 'Torso')
        bone('Tail', (0, .55, .26), (0, .96, .14), 'Torso')
        for s, suf in ((-1, 'L'), (1, 'R')):
            bone('Fin.' + suf, (s * .32, -.06, .34), (s * .58, .22, .14), 'Torso')

    bpy.ops.object.mode_set(mode='OBJECT')
    return ob


def animate(rig, char):
    # Lively, unmistakable Idle / Listen / React clips with anticipation, squash-and-stretch, and phase-delayed secondary motion.
    clips = {
        'Idle': [(1, 0, 0, 0), (22, .055, 2.0, 1), (42, .085, 3.0, 2), (65, -.040, -2.0, -1), (96, 0, 0, 0)],
        'Listen': [(1, 0, 0, 0), (12, .035, -3.5, 2), (34, .050, -3.5, 2), (52, .025, 3.0, -1), (78, 0, 0, 0)],
        'React': [(1, 0, 0, 0), (7, -.045, -3.5, -2), (16, .165, 7.5, 3), (28, .085, 3.0, 1), (42, .020, -1.0, 0), (54, 0, 0, 0)],
    }
    bpy.context.scene.render.fps = 30
    rig.animation_data_create()
    root_name = 'Root' if char in ('restaurant-otter', 'friend-seal') else 'Float'
    body_name = 'Torso' if char in ('restaurant-otter', 'friend-seal') else ('Head' if char == 'taxi-squid' else 'Body')

    for name, keys in clips.items():
        act = bpy.data.actions.new(name)
        rig.animation_data.action = act
        for f, bob, tilt, sec in keys:
            env = 0 if f in (keys[0][0], keys[-1][0]) else 1
            for bone in rig.pose.bones:
                bone.rotation_mode = 'QUATERNION'
                bone.rotation_quaternion = Quaternion()
                bone.location = (0, 0, 0)
                bone.scale = (1, 1, 1)

            root = rig.pose.bones[root_name]
            # Grounded characters (otter & seal) keep Root solidly planted on Z = 0 (ZERO mid-air hovering or floor sinking!)
            root.location = (0, 0 if char in ('restaurant-otter', 'friend-seal') else bob, 0)
            root.keyframe_insert('location', frame=f)

            def rotate(n, axis, deg):
                p = rig.pose.bones[n]
                local = rig.data.bones[n].matrix_local.to_quaternion().inverted() @ Vector(axis)
                p.rotation_quaternion = Quaternion(local, math.radians(deg))
                p.keyframe_insert('rotation_quaternion', frame=f)

            body = rig.pose.bones[body_name]
            b_amp = (.045 if name == 'React' else .024) if char in ('restaurant-otter', 'friend-seal') else (.08 if name == 'React' else .03)
            sq = 1 + b_amp * math.sin(f * .18) * env
            body.scale = (sq, 1 / math.sqrt(sq), sq)
            body.keyframe_insert('scale', frame=f)

            if char == 'subway-ray':
                rotate('Body', (1, 0, .25), tilt * .8)
                rotate('Head', (0, 1, 0), tilt * .75 if name == 'Listen' else tilt * .38)
                rotate('Tail', (1, 0, 0), env * math.sin(f * .16 - .8) * 10)
                for s, suf in ((-1, 'L'), (1, 'R')):
                    amp = 22 if name == 'React' else 11
                    rotate('WingIn.' + suf, (0, 1, 0), s * env * amp * math.sin(f * .16))
                    rotate('WingTip.' + suf, (0, 1, 0), s * env * amp * 1.15 * math.sin(f * .16 - .85))
            elif char == 'hotel-whale':
                # Clean frontal rest pose at frame 1 (true frontal view), with gentle lively sway during clips.
                rotate('Body', (0, 0, 1), tilt * .75)
                rotate('Head', (0, 0, 1), 6.0 * env if name == 'Listen' else 3.0 * env * math.sin(f * .14))
                rotate('Tail', (1, 0, 0), env * math.sin(f * .14 - .7) * 14)
                for s, suf in ((-1, 'L'), (1, 'R')):
                    amp = 24 if name == 'React' else 9
                    rotate('Fin.' + suf, (0, 1, 0), s * (env * amp * math.sin(f * .18 + s) + (14 * env if name == 'React' else 0)))
            elif char == 'pharmacy-shrimp':
                rotate('Body', (1, 0, 0), tilt)
                rotate('Head', (0, 1, 0), tilt * 1.3)
                rotate('Tail', (1, 0, 0), env * (12 * math.sin(f * .20 - .6) - (10 if name == 'React' else 0)))
                for s, suf in ((-1, 'L'), (1, 'R')):
                    ant_amp = 16 if name in ('Listen', 'React') else 7
                    rotate('Ant.' + suf, (1, 0, .3 * s), env * ant_amp * math.sin(f * .22 + s))
                # Welcoming left hand waves warmly; right hand offers the gripped apothecary herb bottle steadily.
                rotate('Arm.L', (1, 0, .3), env * (16 if name == 'React' else 6) * math.sin(f * .26))
                rotate('Arm.R', (1, 0, 0), env * (9 if name == 'React' else 3.5) * math.sin(f * .22 + 1.0))
            elif char == 'restaurant-otter':
                rotate('Torso', (0, 1, 0), tilt * .7)
                rotate('Head', (0, 1, .3), 10 * env if name == 'Listen' else tilt * 1.2)
                rotate('Tail', (0, 0, 1), env * (10 if name == 'React' else 5) * math.sin(f * .22))
                rotate('Paw.L', (0, 1, 0), -env * 6 * math.sin(f * .18))
                rotate('Paw.R', (1, 0, 0), env * (12 if name == 'React' else 3) * math.sin(f * .18))
            elif char == 'taxi-squid':
                rotate('Head', (1, 0, .22), tilt * .75)
                for s, suf in ((-1, 'L'), (1, 'R')):
                    fin_amp = 14 if name == 'React' else 6
                    tent_amp = 18 if name == 'React' else 8
                    rotate('Fin.' + suf, (0, 1, 0), s * (env * fin_amp * math.sin(f * .24 + s) + tilt * .9))
                    rotate('Tent.' + suf, (0, 1, .25 * s), s * (env * tent_amp * math.sin(f * .20 + .6 * s) + (10 * env if name == 'React' else 0)))
                for i in range(len(SQUID_ARMS)):
                    amp = 14 if name == 'React' else 6
                    rotate(f'Arm.{i}', (1, 0, 0), env * amp * math.sin(f * .22 + i * .9) + tilt * .8)
            else:  # friend-seal
                rotate('Torso', (1, 0, 0), tilt * .6)
                rotate('Head', (0, 1, .25), 11 * env if name == 'Listen' else tilt * 1.3)
                rotate('Tail', (0, 0, 1), env * 12 * math.sin(f * .20))
                for s, suf in ((-1, 'L'), (1, 'R')):
                    amp = 26 if name == 'React' else 8
                    rotate('Fin.' + suf, (0, 1, 0), s * env * amp * math.sin(f * .28))

        for c in act.fcurves:
            for k in c.keyframe_points:
                k.handle_left_type = k.handle_right_type = 'AUTO_CLAMPED'
        act.use_fake_user = True
        rig.animation_data.action = None
        track = rig.animation_data.nla_tracks.new()
        track.name = name
        track.strips.new(name, 1, act)
        track.mute = True
    rig.animation_data.action = bpy.data.actions['Idle']
    bpy.context.scene.frame_set(1)


def stats(path):
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
    clips = []
    for a in d['animations']:
        clips.append({
            'name': a['name'],
            'duration': max(d['accessors'][s['input']]['max'][0] for s in a['samplers']),
            'animatedBones': sorted({d['nodes'][c['target']['node']]['name'] for c in a['channels']}),
        })
    return {
        'file': path.name,
        'bytes': len(raw),
        'triangles': tris,
        'meshCount': len(d['meshes']),
        'primitives': sum(len(m['primitives']) for m in d['meshes']),
        'materials': len(d['materials']),
        'bones': len(d['skins'][0]['joints']),
        'maps': imgs,
        'clips': clips,
    }


def build(char, lod, out):
    CE.SKIN_MAPS.pop(char, None)
    bpy.ops.wm.read_factory_settings(use_empty=True)
    mat = lambda: atlas(char, out, 1024)
    CUR['char'] = char
    rig = rig_create(char)
    mesh = MESH_FNS[char](lod == 'close', mat, rig)
    animate(rig, char)
    bpy.ops.object.select_all(action='DESELECT')
    mesh.select_set(True)
    rig.select_set(True)
    bpy.context.view_layer.objects.active = mesh
    dest = out / f'{char}-{lod}.glb'
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
    report = stats(dest)
    (out / f'{lod}-report.json').write_text(json.dumps(report, indent=2) + '\n')
    assert report['triangles'] <= (21000 if lod == 'close' else 7500), report
    assert report['bytes'] < (1400000 if lod == 'close' else 650000), report
    assert report['primitives'] == report['materials'] == report['meshCount'] == 1, report
    assert report['bones'] <= 16, report
    assert {a['name'] for a in report['clips']} == {'Idle', 'Listen', 'React'}, report
    print('TOWN_RESIDENT_REPORT', json.dumps(report), flush=True)


def main():
    p = argparse.ArgumentParser()
    p.add_argument('--character', choices=CHARS, required=True)
    p.add_argument('--output', type=Path, required=True)
    p.add_argument('--lod', choices=['board', 'close', 'both'], default='both')
    a = p.parse_args(sys.argv[sys.argv.index('--') + 1:])
    a.output = a.output.resolve()
    a.output.mkdir(parents=True, exist_ok=True)
    for lod in ('board', 'close') if a.lod == 'both' else [a.lod]:
        build(a.character, lod, a.output)


if __name__ == '__main__':
    main()
