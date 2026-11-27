"""Shelly-grade living Pixar/MP8 conforming eye shared by build_town_residents / build_supporting_hosts / build_kiko_cast / build_taxi_squid.

Instead of a rigid half-sphere stuck onto a curved head, the eye is a radial disc (v = 0 pupil centre ... v = 1 outer
skin skirt) whose every vertex is projected onto the *actual* head surface, lifted by a convex wet cornea sitting
inside a sculpted 3D upper & lower eyelid cuff, then smoothly blended flush onto the head at v -> 1.

Key living-eye principles (modeled on Hero Shelly in build_crafted_shelly.py:320-354):
  * Un-mirrored single-sun world-space catchlights: wx = side * ex puts the primary warm-cream sunlit catchlight in the
    EXACT same upper-right world direction on both left and right eyes (zero mirrored '\\ /' cross-eyed reflections).
  * Rich upper-eyelid occlusion shadow across the top ~28% of BOTH sclera and iris + subtle lower-lid & corner ambient
    shadow so the eyeball sits genuinely inside the socket rather than looking pasted-on.
  * Warm living pearl-cream sclera (#ede6dc / #e8dfd3 shaded toward #b8b2ba under lids and corners — never stark white).
  * Soulful vertical iris depth (Hero-Shelly 0.47 - 0.99*ey + organic radial fibers + luminous caustic lower-iris
    crescent bounce + soft feathered limbus ring — zero harsh MS-Paint circle edge).
  * Subtle inward eye-contact convergence (iris & pupil gently converged inboard toward the viewer/nose).
  * Restrained luminous warm-cream primary sunlit catchlight (#fff6e6) + tiny delicate lower-left secondary bounce.
  * Only the wet inner cornea is glossy (rough = .08 -> .84 across the eyelid margin) so live Three.js envMap catches
    natural living eye sparkle while eyelids and face stay velvety matte-satin.
"""
import math
import numpy as np
from mathutils import Vector

T = math.tau
Z = Vector((0, 0, 1))

# char -> (iris dark, iris bright, lower-iris caustic glow, outer face-skin RGB fallback)
PALETTES = {
    # v41 MAJ-1: Boldly distinct varied iris hues across the cast!
    'restaurant-otter': ((28, 92, 42), (76, 178, 64), (214, 232, 86), (246, 224, 204)),    # Warm forest-hazel/green
    'pharmacy-shrimp': ((16, 80, 74), (44, 166, 140), (242, 198, 108), (242, 174, 152)),
    'hotel-whale': ((10, 30, 112), (26, 98, 224), (86, 184, 250), (164, 198, 232)),        # Deep sapphire-blue
    'friend-seal': ((86, 36, 78), (176, 82, 178), (236, 158, 240), (210, 202, 194)),       # Warm chestnut-violet
    'subway-ray': ((16, 66, 116), (44, 154, 206), (124, 224, 242), (94, 108, 162)),
    'bok': ((76, 34, 10), (228, 136, 26), (254, 216, 94), (248, 198, 92)),
    'captain-bay': ((16, 54, 118), (42, 140, 212), (108, 204, 244), (148, 172, 206)),
    'hana': ((52, 20, 110), (132, 62, 212), (202, 138, 248), (248, 198, 190)),
    'echo': ((10, 64, 78), (26, 156, 166), (92, 218, 214), (232, 240, 230)),
    'jisu': ((146, 72, 12), (252, 184, 28), (255, 238, 108), (252, 202, 142)),             # Bright golden-amber
    'pip': ((86, 32, 10), (230, 136, 22), (255, 210, 78), (138, 62, 212)),
    'taxi-squid': ((8, 92, 92), (18, 204, 184), (106, 250, 224), (246, 192, 224)),         # Vibrant emerald-teal
    'kiko-mochi': ((96, 26, 48), (212, 92, 68), (252, 196, 94), (254, 204, 192)),          # Coral-amber (iconic Kiko)
    'kiko-hermit': ((58, 26, 110), (148, 82, 206), (250, 202, 82), (252, 196, 184)),       # Violet (iconic Kiko)
    'mira': ((74, 28, 10), (224, 134, 24), (252, 214, 88), (238, 208, 132)),
}

# Warm species-harmonized upper-lash tint
LASH_TINTS = {
    'restaurant-otter': (44, 34, 22),
    'pharmacy-shrimp': (112, 56, 52),
    'hotel-whale': (18, 34, 74),
    'friend-seal': (64, 34, 54),
    'subway-ray': (32, 46, 82),
    'bok': (108, 54, 22),
    'captain-bay': (38, 54, 86),
    'hana': (88, 44, 96),
    'echo': (32, 68, 76),
    'jisu': (104, 48, 24),
    'pip': (58, 22, 72),
    'taxi-squid': (18, 14, 28),
    'kiko-mochi': (108, 40, 54),
    'kiko-hermit': (78, 42, 98),
    'mira': (98, 48, 22),
}

# Subtle optical inward eye-contact convergence per species (positive = shifts iris/pupil gently toward nose/camera)
GAZE_IN = {
    'hotel-whale': .036,
    'pip': .066,
    'echo': .046,
    'captain-bay': .038,
    'bok': .038,
    'hana': .034,
    'jisu': .038,
    'pharmacy-shrimp': .036,
    'restaurant-otter': .036,
    'subway-ray': .040,
    'friend-seal': .038,
    'kiko-mochi': .034,
    'kiko-hermit': .034,
    'mira': .036,
    'taxi-squid': .036,
}


def smooth(a, b, x):
    t = np.clip((np.asarray(x, float) - a) / (b - a), 0, 1)
    return t * t * (3 - 2 * t)


def _mix(a, b, t):
    return np.asarray(a, float) + (np.asarray(b, float) - np.asarray(a, float)) * np.asarray(t, float)[..., None]


SKIN_MAPS = {}


def _lookup(m, ex, ey):
    g = m.shape[0]
    fx = np.clip((ex + 1) / 2 * (g - 1), 0, g - 1 - 1e-6)
    fy = np.clip((ey + 1) / 2 * (g - 1), 0, g - 1 - 1e-6)
    x0, y0 = fx.astype(int), fy.astype(int)
    tx, ty = (fx - x0)[..., None], (fy - y0)[..., None]
    top = m[y0, x0] * (1 - tx) + m[y0, x0 + 1] * tx
    bot = m[y0 + 1, x0] * (1 - tx) + m[y0 + 1, x0 + 1] * tx
    return top * (1 - ty) + bot * ty


# Per-species expressive Mario Party / Pixar eye-shape profiles (v41 MAJ-1 bold silhouette + hue diversity!):
#   aspect:         width/height ratio (>1 almond/wide, <1 tall upright pill/almond, 1.0 cute round starry Kiko ONLY)
#   tilt:           outer-corner tilt in degrees (+ upward cat/almond tilt, - warm relaxed gentleman droop)
#   style:          'cat_almond' | 'crescent_smile' | 'half_lid' | 'pill_tall' | 'tall_almond' | 'round' | 'default'
#   upper_lid_arch: expressive arched upper eyelid lift (0..0.16)
#   lower_lid_lift: warm smiling lower eyelid curve lift (0..0.38)
#   brow_ridge:     sculpted 3D brow-ridge overhang & orbital crease depth (0..1.5)
#   lash_flick:     delicate/bold tapering outer-corner eyelash wing (0..1.25)
#   lid_hood:       warm half-lidded upper-lid descent over top of iris (0..0.36)
EYE_SHAPES = {
    # 1. taxi-squid: Bold sleek diagonal cat-almond Splatoon-style eyes (aspect=1.45, +18 deg tilt, crisp dark lash+wing, EMERALD-TEAL)
    'taxi-squid':      {'aspect': 1.45, 'tilt': 18.0, 'style': 'cat_almond',     'upper_lid_arch': .14, 'lower_lid_lift': .14, 'brow_ridge': .74, 'lash_flick': 1.20, 'lid_hood': .04},
    # 2. jisu: Warm joyful smiling crescent-almond eyes (aspect=1.32, sculpted curved lower-lid smile lift, GOLDEN-AMBER)
    'jisu':            {'aspect': 1.32, 'tilt': 10.0, 'style': 'crescent_smile', 'upper_lid_arch': .12, 'lower_lid_lift': .34, 'brow_ridge': .62, 'lash_flick': .78, 'lid_hood': .02},
    # 3. hotel-whale: Gentle relaxed half-lidded gentleman eyes (aspect=1.38, upper lid covers top 32% of iris + arched brow ridge, DEEP SAPPHIRE-BLUE)
    'hotel-whale':     {'aspect': 1.38, 'tilt': -3.0, 'style': 'half_lid',       'upper_lid_arch': .02, 'lower_lid_lift': .10, 'brow_ridge': 1.45, 'lash_flick': .20, 'lid_hood': .32},
    # 4. friend-seal (Sua): Tall expressive Mario Party vertical pill-oval eyes (aspect=0.58, WARM CHESTNUT-VIOLET + vertical sparkle)
    'friend-seal':     {'aspect': 0.58, 'tilt':  2.0, 'style': 'pill_tall',      'upper_lid_arch': .08, 'lower_lid_lift': .04, 'brow_ridge': .46, 'lash_flick': .28, 'lid_hood': .00},
    # 5. restaurant-otter: Bright playful tall-almond eyes (aspect=0.78, cheerful lower-lid lift, WARM FOREST-HAZEL/GREEN + distinct upper eyelid fold)
    'restaurant-otter':{'aspect': 0.78, 'tilt':  6.5, 'style': 'tall_almond',    'upper_lid_arch': .10, 'lower_lid_lift': .20, 'brow_ridge': 1.15, 'lash_flick': .44, 'lid_hood': .04},
    # Other cast (preserved backward-compatible profiles)
    'hana':            {'aspect': 1.24, 'tilt':  8.5, 'style': 'crescent_smile', 'upper_lid_arch': .11, 'lower_lid_lift': .24, 'brow_ridge': .52, 'lash_flick': .92, 'lid_hood': .04},
    'mira':            {'aspect': 1.18, 'tilt':  9.0, 'style': 'default',        'upper_lid_arch': .10, 'lower_lid_lift': .09, 'brow_ridge': .52, 'lash_flick': .88, 'lid_hood': .06},
    'cafe-seahorse':   {'aspect': 0.80, 'tilt':  4.0, 'style': 'default',        'upper_lid_arch': .09, 'lower_lid_lift': .08, 'brow_ridge': .48, 'lash_flick': .40, 'lid_hood': .04},
    'captain-bay':     {'aspect': 1.32, 'tilt': -3.0, 'style': 'half_lid',       'upper_lid_arch': .03, 'lower_lid_lift': .12, 'brow_ridge': 1.38, 'lash_flick': .18, 'lid_hood': .28},
    'subway-ray':      {'aspect': 1.26, 'tilt':  7.0, 'style': 'default',        'upper_lid_arch': .08, 'lower_lid_lift': .11, 'brow_ridge': .62, 'lash_flick': .48, 'lid_hood': .09},
    'pharmacy-shrimp': {'aspect': 1.20, 'tilt':  6.5, 'style': 'default',        'upper_lid_arch': .08, 'lower_lid_lift': .09, 'brow_ridge': .54, 'lash_flick': .38, 'lid_hood': .08},
    'bok':             {'aspect': 1.24, 'tilt':  6.0, 'style': 'crescent_smile', 'upper_lid_arch': .10, 'lower_lid_lift': .24, 'brow_ridge': .72, 'lash_flick': .34, 'lid_hood': .06},
    'echo':            {'aspect': 1.30, 'tilt':  7.5, 'style': 'cat_almond',     'upper_lid_arch': .10, 'lower_lid_lift': .14, 'brow_ridge': .68, 'lash_flick': .52, 'lid_hood': .08},
    'pip':             {'aspect': 1.32, 'tilt': 11.0, 'style': 'cat_almond',     'upper_lid_arch': .12, 'lower_lid_lift': .16, 'brow_ridge': .64, 'lash_flick': .66, 'lid_hood': .04},
    # Iconic cute round starry eyes (reserved ONLY for Kiko Hermit & Kiko Mochi!)
    'kiko-hermit':     {'aspect': 1.00, 'tilt':  0.0, 'style': 'round',          'upper_lid_arch': .04, 'lower_lid_lift': .03, 'brow_ridge': .28, 'lash_flick': .16, 'lid_hood': .00},
    'kiko-mochi':      {'aspect': 1.00, 'tilt':  0.0, 'style': 'round',          'upper_lid_arch': .04, 'lower_lid_lift': .03, 'brow_ridge': .28, 'lash_flick': .16, 'lid_hood': .00},
}

DEFAULT_EYE_SHAPE = {'aspect': 1.0, 'tilt': 0.0, 'style': 'default', 'upper_lid_arch': .04, 'lower_lid_lift': .03, 'brow_ridge': .35, 'lash_flick': .15, 'lid_hood': .00}


def get_eye_shape(char=None, overrides=None):
    sh = dict(DEFAULT_EYE_SHAPE)
    if char and char in EYE_SHAPES:
        sh.update(EYE_SHAPES[char])
    if overrides:
        for k in DEFAULT_EYE_SHAPE:
            if k in overrides and overrides[k] is not None:
                sh[k] = overrides[k]
    return sh


def _shape_offset(ex, ey, side, r_outer, h, zz, aspect=1.0, tilt=0.0):
    """Map anatomical disc coords (ex=+outboard, ey=+up) onto tilted elliptical surface offset."""
    sx = math.sqrt(max(.5, aspect))
    sy = 1.0 / sx
    rad = math.radians(tilt)
    ct, st = math.cos(rad), math.sin(rad)
    dx = ex * sx
    dy = ey * sy
    rx = dx * ct - dy * st
    ry = dx * st + dy * ct
    out_ax = h * float(side)
    return (out_ax * rx + zz * ry) * r_outer


def _smax(a, b, k=.048):
    return .5 * (a + b + np.sqrt((a - b) ** 2 + k * k))


def _aperture_eval(ex, ey, v, aspect=1.0, upper_lid_arch=.04, lower_lid_lift=.03, lid_hood=.0, style='default'):
    """Unified expressive non-circular eyelid aperture shared by 2D paint_living_eye and 3D conforming_eye.
    Strictly smooth and monotonically increasing in radial v along every ray so 2D paint & 3D eyelids lock 1:1!"""
    if style == 'cat_almond':
        # Bold sleek Splatoon cat-almond lens: smooth rounded upper arch sweeping into crisp tapered outer cat-eye corner!
        ey_c = ey - .04 * ex
        rx = .825
        ax_u = (np.abs(ex) / rx) ** 2.15
        ax_l = (np.abs(ex) / rx) ** 2.05
        ap_up = .815 * (ey_c / .66 + ax_u)
        ap_lo = .815 * ((-ey_c) / .58 + ax_l)
        return _smax(ap_up, ap_lo, .054)

    if style == 'crescent_smile':
        # Joyful smiling crescent-almond: plush smoothly rounded upper arch (NOT pointy!) + upward-curving smiling lower eyelid!
        rx = .785
        y_c = -.24
        # Elliptical-arch upper curve (smooth plush dome across top, graceful almond taper into corners)
        ap_up = .815 * np.hypot(ex / rx, np.maximum(0.0, ey - y_c) / .96)
        # Gently upward-curved smiling lower eyelid arc (concave-up crescent cheek push!)
        y_lo = y_c + .115 * (1.0 - (ex / rx) ** 2)
        ap_lo = .815 + 1.18 * (y_lo - ey)
        ap_base = _smax(ap_up, ap_lo, .048)
        return _smax(ap_base, .815 * np.hypot(ex / .81, (ey + .04) / .84), .040)

    if style == 'half_lid':
        # Gentle relaxed half-lidded gentleman eye: plump rounded lower lid + calm gently-arched upper lid covering top ~32% of iris!
        ap_oval = .815 * np.hypot(ex / .82, ey / .72)
        # Gently arched upper lid crossing ey = +0.190 at center (covers ~31-32% of sapphire iris!)
        y_top = .190 - .150 * ((ex / .82) ** 2)
        ap_top = .815 + 1.25 * (ey - y_top)
        return _smax(ap_oval, ap_top, .042)

    if style == 'pill_tall':
        # Tall expressive Mario Party vertical pill-oval (Yoshi / Toad / Pauline superellipse pill!)
        return .815 * ((np.abs(ex) / .76) ** 2.40 + (np.abs(ey) / .82) ** 2.40) ** (1.0 / 2.40)

    if style == 'tall_almond':
        # Bright playful tall-almond: smooth rounded arched top + tapered almond sides + buttery cheerful lower-lid lift!
        rx = .755
        y_c = -.12
        # Smooth rounded elliptical upper arch peaking at ey = +0.76
        ap_up = .815 * np.hypot(ex / rx, np.maximum(0.0, ey - y_c) / .88)
        # Smooth cheerful gently-lifted curved lower eyelid peaking cleanly at ey = -0.53 (zero ripple!)
        ap_lo = .815 * np.hypot(ex / rx, np.maximum(0.0, y_c - ey) / .41)
        return _smax(ap_up, ap_lo, .056)

    # 'round' (iconic Kiko) and 'default' (backward-compatible)
    vn = np.maximum(v, 1e-4)
    ex_n = ex / vn
    ey_n = ey / vn
    up_f = smooth(.04, .74, ey_n)
    lo_f = smooth(-.18, -.80, ey_n)
    arch_lift = -upper_lid_arch * .48 * np.exp(-((ex_n - .14) / .52) ** 2) * up_f
    hood_drop = lid_hood * (.82 + .18 * (1.0 - ex_n ** 2)) * smooth(.05, .70, ey)
    lower_lift = lower_lid_lift * (.74 + .26 * (1.0 - ex_n ** 2)) * lo_f
    almond_taper = max(0.0, aspect - 1.02) * .16 * (1.0 - np.abs(ex_n) ** 1.7) * (up_f * .55 + lo_f * .45)
    delta = (.076 * up_f + .024 * lo_f) + hood_drop + lower_lift + arch_lift - almond_taper * .28
    return v + delta


def _v_lid_for_angle(ang, aspect=1.0, upper_lid_arch=.04, lower_lid_lift=.03, lid_hood=.0, target=.815, style='default'):
    """Solve _aperture_eval(v*cos(ang), v*sin(ang), v) == target for exact 3D/2D eyelid rim alignment."""
    ca, sa = math.cos(ang), math.sin(ang)
    lo, hi = .08, .92
    for _ in range(14):
        mid = .5 * (lo + hi)
        val = float(_aperture_eval(mid * ca, mid * sa, mid, aspect, upper_lid_arch, lower_lid_lift, lid_hood, style=style))
        if val < target:
            lo = mid
        else:
            hi = mid
    return .5 * (lo + hi)


# Per-character fine-tuning overrides (iris size, crease depth, specular highlights, collarette warmth)
EYE_TUNING = {
    'hotel-whale': {
        'r_iris': .625,
        'p_rad': .300,
        'iy_off': -.055,
        'lid_shadow': 1.35,
        'crease_strength': 1.90,
        'lash_strength': 1.18,
        'limbus_strength': .68,
        'limbus_dark_mix': .36,
        'hl1_off': (.160, .085),
        'hl2_scale': 1.35,
        'hl2_strength': .88,
        'hl2_col': (255, 246, 230),
        'hl2_off': (.165, .155),
    },
    'taxi-squid': {
        'r_iris': .635,
        'p_rad': .315,
        'iy_off': .015,
        'lid_shadow': 1.25,
        'crease_strength': 1.55,
        'lash_strength': 1.50,
        'lash_dark_override': .86,
        'limbus_strength': .82,
        'limbus_dark_mix': .48,
        'hl1_off': (.150, .175),
        'hl2_scale': 1.25,
        'hl2_strength': .82,
    },
    'jisu': {
        'r_iris': .585,
        'p_rad': .288,
        'iy_off': .145,
        'lid_shadow': 1.26,
        'crease_strength': 1.65,
        'lash_strength': 1.32,
        'limbus_strength': .72,
        'limbus_dark_mix': .40,
        'hl1_off': (.150, .165),
        'hl2_scale': 1.30,
        'hl2_strength': .85,
    },
    'friend-seal': {
        'r_iris': .660,
        'p_rad': .336,
        'iy_off': .005,
        'lid_shadow': 1.18,
        'crease_strength': 1.40,
        'lash_strength': 1.15,
        'limbus_strength': .76,
        'limbus_dark_mix': .42,
        'collarette_col': (196, 102, 134),
        'vertical_sparkle': True,
        'hl1_off': (.148, .210),
        'hl2_scale': 1.25,
        'hl2_strength': .82,
    },
    'restaurant-otter': {
        'r_iris': .625,
        'p_rad': .315,
        'iy_off': .060,
        'lid_shadow': 1.30,
        'crease_strength': 1.95,
        'lash_strength': 1.24,
        'limbus_strength': .78,
        'limbus_dark_mix': .44,
        'collarette_col': (224, 174, 58),
        'hl1_off': (.148, .185),
        'hl2_scale': 1.25,
        'hl2_strength': .82,
    },
    'captain-bay': {
        'r_iris': .680,
        'p_rad': .354,
        'lid_shadow': 1.32,
        'crease_strength': 1.75,
        'lash_strength': .92,
    },
    'pip': {
        'r_iris': .718,
        'p_rad': .372,
        'lid_shadow': 1.36,
        'crease_strength': 1.70,
        'lash_strength': 1.18,
    },
    'bok': {
        'r_iris': .716,
        'p_rad': .370,
        'lid_shadow': 1.36,
        'crease_strength': 1.78,
        'lash_strength': 1.18,
    },
    'subway-ray': {
        'r_iris': .675,
        'p_rad': .348,
        'lid_shadow': 1.22,
        'crease_strength': 1.55,
        'lash_strength': 1.12,
    },
}


def paint_living_eye(ex, ey, v, side, dark, bright, glow, skin, lash_tint, gaze_in=.040,
                     r_iris=.682, p_rad=.352, lid_shadow=1.0, crease_strength=1.0, lash_strength=1.0,
                     limbus_strength=.88, limbus_dark_mix=.52, hl2_scale=1.0, hl2_strength=.62,
                     hl2_col=(238, 234, 224), hl2_off=(.195, .195),
                     aspect=1.0, tilt=0.0, style='default', upper_lid_arch=.04, lower_lid_lift=.03,
                     brow_ridge=.35, lash_flick=.15, lid_hood=.0,
                     iy_off=None, hl1_off=None, lash_dark_override=.60, collarette_col=None,
                     vertical_sparkle=False):
    """Core Hero-Shelly / Pixar living eye shader with bold diverse Mario Party eye shapes & varied iris hues!

    Coordinates:
      ex: anatomical horizontal (- = inboard/nose, + = outboard/temple)
      ey: vertical (- = down, + = up)
      v:  radial distance hypot(ex, ey) in [0, 1]
      side: -1 for viewer's LEFT eye (-X), +1 for viewer's RIGHT eye (+X)
      wx = side * ex: world-space horizontal (- = viewer's left, + = viewer's right / sun-side)
    Returns (rgb_0_255, rough_0_1).
    """
    ex = np.asarray(ex, float)
    ey = np.asarray(ey, float)
    v = np.asarray(v, float)
    skin = np.asarray(skin, float)

    sx = math.sqrt(max(.5, aspect))
    sy = 1.0 / sx
    # Compensate iris & pupil aspect:
    # - Wide almond / crescent / half-lid eyes keep a crisp PHYSICAL ROUND iris with generous clean sclera corners!
    # - Tall pill-oval eyes (Sua) inherit the iconic tall narrow Mario Party pill-oval iris!
    # - Tall almond eyes (Otter) keep a lively slightly tall almond-oval iris!
    if style in ('cat_almond', 'crescent_smile', 'half_lid'):
        iris_sx = aspect ** .88
        iris_sy = 1.0
    elif style == 'pill_tall':
        iris_sx = 1.02
        iris_sy = 1.00
    elif style == 'tall_almond':
        iris_sx = .96
        iris_sy = 1.00
    elif aspect >= 1.0:
        iris_sx = sx * (1.0 / (1.0 + .12 * (sx - 1.0)))
        iris_sy = sy
    else:
        iris_sx = sx ** .38
        iris_sy = sy ** .38

    y_shift = (.008 + .04 * lid_hood) if iy_off is None else iy_off

    # 1. Subtle inward eye-contact convergence: iris & pupil shift gently inboard (-ex) toward viewer/camera
    ix = (ex + gaze_in) * iris_sx
    iy = (ey - y_shift) * iris_sy
    ir = np.hypot(ix, iy)
    px = ix + .008
    py = iy - .004
    pr = np.hypot(px, py)
    pang = np.arctan2(py, px)

    # 2. Hero-Shelly soulful vertical iris depth + organic multi-harmonic radial fibers + caustic lower-iris bounce
    fiber = (np.sin(51 * pang + .8 * np.sin(11 * pang)) * np.sin(8 * pang - 12 * pr)
             + .6 * np.cos(83 * pang + pr * 35)) / 1.6
    gradient = np.clip(.50 - .96 * (iy / max(.55, r_iris / .68)) + .14 * fiber, 0, 1)
    iris = _mix(dark, bright, gradient)
    col_target = np.asarray(collarette_col, float) if collarette_col is not None else _mix(bright, glow, .45)
    col_amp = .34 if collarette_col is not None else .18
    collarette = np.exp(-((pr - (p_rad + .055)) / .060) ** 2) * smooth(.40, -.32, iy) * col_amp
    iris = _mix(iris, col_target, collarette)
    lower_caustic = .60 * smooth(.06, -.52, iy) * smooth(p_rad - .06, p_rad + .14, pr) * (1.0 - smooth(r_iris - .075, r_iris + .005, ir))
    iris = _mix(iris, glow, lower_caustic)

    # 3. Deep velvety soulful pupil (warm midnight, soft feathered pupillary edge + delicate inner halo)
    pup_halo = smooth(p_rad + .085, p_rad + .012, pr) * (1.0 - smooth(p_rad + .018, p_rad - .022, pr)) * .22
    iris = _mix(iris, np.asarray(dark, float) * .50, pup_halo)
    iris = _mix(iris, (16, 14, 26), smooth(p_rad + .026, p_rad - .026, pr))

    # 4. Soft feathered limbus ring (organic jewel dark border blending softly into BOTH iris and sclera)
    limbus_col = _mix(dark, (20, 16, 30), limbus_dark_mix)
    limbus_w = smooth(r_iris - .095, r_iris - .010, ir) * (1.0 - smooth(r_iris - .004, r_iris + .038, ir))
    iris = _mix(iris, limbus_col, limbus_w * limbus_strength)

    # 5. Warm living pearl-cream sclera (#ede6dc / #e8dfd3 shaded toward #b8b2ba in corners & under lids — NEVER paper white!)
    sclera = _mix((238, 232, 224), (232, 224, 212), smooth(.25, -.55, ey))
    sph_ao = smooth(.42, .84, v) * .38 + smooth(.48, .84, np.abs(ex)) * .26
    lower_sclera_ao = smooth(-.20, -.76, ey) * smooth(.42, .82, v) * .34
    sclera = _mix(sclera, (182, 176, 186), np.clip(sph_ao + lower_sclera_ao, 0, .78))
    canthus = smooth(.66, .85, np.abs(ex)) * np.exp(-((ey + .03) / .26) ** 2) * .22
    sclera = _mix(sclera, _mix(skin, (222, 152, 146), .45), canthus)

    sclera_mask = smooth(r_iris - .008, r_iris + .034, ir)
    eyeball = _mix(iris, sclera, sclera_mask)

    # 6. Rich sculpted UPPER-EYELID & HALF-LID OCCLUSION SHADOW across top of BOTH sclera AND iris!
    if style == 'half_lid':
        # Real Pixar cast shadow from the overhanging half-closed upper eyelid right below y_top(ex)!
        y_top = .190 - .150 * ((ex / .82) ** 2)
        d_under = y_top - ey
        top_shadow = smooth(.28, -.02, d_under)
        deep_lip_shadow = smooth(.12, -.02, d_under)
    else:
        lid_y = ey + .13 * (ex ** 2) + .85 * lid_hood
        top_lo = .16 - .05 * max(0.0, lid_shadow - 1.0)
        top_shadow = smooth(top_lo, .64, lid_y)
        deep_lip_shadow = smooth(.42 - .04 * max(0.0, lid_shadow - 1.0), .75, lid_y)
    shad_mult = 1.0 - np.clip(top_shadow * lid_shadow, 0, 1.15)[..., None] * np.array([.38, .41, .31])
    shad_mult = shad_mult * (1.0 - np.clip(deep_lip_shadow * lid_shadow, 0, 1.15)[..., None] * np.array([.26, .28, .20]))
    bot_shadow = smooth(-.44 + .25 * lower_lid_lift, -.80, ey) * (.20 + .16 * min(.35, lower_lid_lift))
    shad_mult = shad_mult * (1.0 - bot_shadow[..., None] * np.array([.85, .90, .75]))
    eyeball = eyeball * np.clip(shad_mult, .20, 1.0)

    # 7. Diverse expressive eyelid aperture (cat_almond / crescent_smile / half_lid / pill_tall / tall_almond / round)
    aperture = _aperture_eval(ex, ey, v, aspect=aspect, upper_lid_arch=upper_lid_arch, lower_lid_lift=lower_lid_lift, lid_hood=lid_hood, style=style)
    eyeball_vis = 1.0 - smooth(.770, .815, aperture)

    # 8. Un-mirrored SINGLE-SUN world-space catchlights (with vertical Mario Party pill sparkle for Sua!)
    wx_p = float(side) * px
    h1x, h1y = (.162, .198) if hl1_off is None else hl1_off
    dx1 = wx_p - h1x
    dy1 = py - h1y
    if vertical_sparkle:
        # Signature Nintendo/Pauline/Yoshi vertical pill sparkle!
        rx1 = dx1 / .084
        ry1 = dy1 / .168
        r2 = np.hypot((wx_p + hl2_off[0] * .75) / (.046 * hl2_scale), (py + hl2_off[1] * 1.15) / (.082 * hl2_scale))
    else:
        rx1 = (dx1 * .927 + dy1 * .375) / .122
        ry1 = (-dx1 * .375 + dy1 * .927) / .100
        r2 = np.hypot((wx_p + hl2_off[0]) / (.058 * hl2_scale), (py + hl2_off[1]) / (.052 * hl2_scale))
    hl1 = smooth(1.04, .44, np.hypot(rx1, ry1)) * .98 * eyeball_vis
    hl1_halo = smooth(1.50, .65, np.hypot(rx1, ry1)) * .16 * eyeball_vis
    hl2 = smooth(1.04, .42, r2) * hl2_strength * eyeball_vis
    hl2_halo = (smooth(1.38, .64, r2) * .12 * eyeball_vis) if hl2_strength > .75 else 0.0

    c = _mix(eyeball, (255, 248, 234), np.clip(hl1 + hl1_halo, 0, .98))
    c = _mix(c, hl2_col, np.clip(hl2 + hl2_halo, 0, .98))

    # 9. Sculpted upper-lid lash line + graceful/bold outer-corner lash wing + lower-lid rim + seamless skin blend!
    lash_col = _mix(skin * .22, lash_tint, lash_dark_override)
    if style == 'cat_almond':
        # Bold crisp Splatoon-style dark upper cat-eyeliner tapering thicker toward outer temple!
        upper_lash_w = .044 + .024 * smooth(.08, .76, ex)
        ey_lash_mask = smooth(-.10, .18, ey - .04 * ex)
        upper_lash = np.exp(-((aperture - .816) / upper_lash_w) ** 2) * (.96 * ey_lash_mask)
        # Subtle crisp lower-outer eyeliner framing the cat-eye corner
        lower_outer = np.exp(-((aperture - .818) / .024) ** 2) * (.48 * smooth(.20, .75, ex) * smooth(.05, -.30, ey))
        c = _mix(c, lash_col, np.clip(upper_lash + lower_outer, 0, .96))
    elif style == 'half_lid':
        # Crisp gentle dark sapphire-navy upper lash line hugging the half-closed lid!
        y_top = .190 - .150 * ((ex / .82) ** 2)
        upper_lash = np.exp(-((aperture - .815) / .034) ** 2) * (.92 * smooth(-.14, .06, ey - y_top + .12))
        c = _mix(c, lash_col, np.clip(upper_lash, 0, .94))
    else:
        upper_lash_w = .028 + .010 * min(1.0, lash_flick)
        ey_lo_m = -.24 if style == 'crescent_smile' else -.08
        ey_hi_m = .20 if style == 'crescent_smile' else .42
        upper_lash = np.exp(-((aperture - .812) / upper_lash_w) ** 2) * (min(.96, (.78 + .14 * lash_flick) * lash_strength) * smooth(ey_lo_m, ey_hi_m, ey))
        c = _mix(c, lash_col, upper_lash)

    # Lower-lid smile/cheek rim line (warmer & crisper on Jisu's crescent_smile and Otter's tall_almond!)
    lo_rim_w = .028 if style in ('crescent_smile', 'tall_almond') else .024
    lo_rim_amp = (.42 if style == 'crescent_smile' else (.34 if style == 'tall_almond' else (.16 + .20 * lower_lid_lift)))
    lo_rim_mask = smooth(.02, -.20, ey) if style == 'crescent_smile' else smooth(-.16, -.66, ey)
    lower_lip = np.exp(-((aperture - .818) / lo_rim_w) ** 2) * (lo_rim_amp * lo_rim_mask)
    c = _mix(c, _mix(skin * .66, lash_tint, .32), np.clip(lower_lip, 0, .65))

    # Seamless transition into exact calibrated local face skin over the sculpted 3D eyelid cuff
    skin_blend = smooth(.804, .874, aperture)
    c = _mix(c, skin, skin_blend)

    # Re-apply crisp upper eyeliner border & sweeping outer cat-eye wing cleanly ON TOP of the eyelid skin rim (NEVER inside sclera!)
    if style == 'cat_almond':
        # Crisp bold dark upper liner riding smoothly around the upper almond rim & flowing seamlessly into the outer wing!
        ey_m = smooth(-.08, .22, ey - .04 * ex)
        rim_liner = np.exp(-((aperture - .828) / (.036 + .022 * smooth(.12, .76, ex))) ** 2) * (.95 * ey_m)
        c = _mix(c, lash_col, np.clip(rim_liner, 0, .96))
        # Sweeping sharp Splatoon cat-eye outer wing flowing directly off the outer corner (ex=0.72..0.98, ey=0.05 -> +0.28)!
        fl_t = np.clip((ex - .72) / .26, 0.0, 1.0)
        fl_y = .055 + .21 * (fl_t ** 1.15)
        fl_w = .054 * (1.0 - .78 * fl_t) + .008
        wing = (
            np.exp(-(((ey - fl_y) / fl_w) ** 2))
            * smooth(.68, .77, ex)
            * (1.0 - smooth(.88, .99, ex))
            * smooth(.78, .84, aperture)
        )
        c = _mix(c, lash_col, np.clip(wing * .96, 0, .96))
    elif lash_flick > .35:
        if style == 'crescent_smile':
            # Charming delicate lash wing sweeping cleanly off Jisu's actual outer almond corner (ex=0.73..0.95, ey=-0.24 -> -0.05)
            fl_t = np.clip((ex - .73) / .23, 0.0, 1.0)
            fl_y = -.23 + .17 * (fl_t ** 1.2)
            fl_start, fl_end = .70, .79
        elif style == 'tall_almond':
            # Subtle playful lash accent off Otter's outer-upper corner (ex=0.68..0.90)
            fl_t = np.clip((ex - .68) / .22, 0.0, 1.0)
            fl_y = -.06 + .16 * (fl_t ** 1.2)
            fl_start, fl_end = .66, .75
        else:
            fl_t = np.clip((ex - .74) / .24, 0.0, 1.0)
            fl_y = .08 + .18 * (fl_t ** 1.25) - .06 * lid_hood
            fl_start, fl_end = .72, .80
        fl_w = .028 * (1.0 - .74 * fl_t) + .007
        flick_tip = (
            np.exp(-(((ey - fl_y) / fl_w) ** 2))
            * smooth(fl_start, fl_end, ex)
            * (1.0 - smooth(.86, .98, ex))
            * smooth(.79, .85, aperture)
            * (min(1.0, lash_flick) * .80)
        )
        c = _mix(c, lash_col, np.clip(flick_tip, 0, .86))

    # Raised 3D upper eyelid fold highlight + rich baked orbital brow-ridge crease AO (matches Hero Shelly craft!)
    ap_d = aperture - .815
    if style == 'half_lid':
        # Plump lit half-closed upper eyelid dome highlight + crisp deep upper-lid fold crease + warm arched brow ridge!
        lid_dome_hi = smooth(.10, .42, ey) * np.exp(-((ap_d - .11) / .085) ** 2) * .22 * (1.0 - smooth(.86, .98, v))
        c = _mix(c, np.minimum(skin * 1.10 + 7.0, 255.0), np.clip(lid_dome_hi, 0, .28))
        # Crisp orbital eyelid crease right above the half-closed lid dome
        lid_fold = smooth(.18, .55, ey) * np.exp(-((ap_d - .26) / .058) ** 2) * .56 * (1.0 - smooth(.88, .99, v))
        crease_col = _mix(skin * .54, lash_tint, .36)
        c = _mix(c, crease_col, np.clip(lid_fold, 0, .58))
        # Warm arched gentleman brow ridge shadow/highlight tucked high near the brow
        brow_hi = smooth(.45, .82, ey) * np.exp(-(((v - .78) / .09) ** 2)) * .20 * (1.0 - smooth(.88, .99, v))
        c = _mix(c, np.minimum(skin * 1.12 + 8.0, 255.0), np.clip(brow_hi, 0, .24))
    else:
        lid_ridge_hi = smooth(.06, .62, ey) * np.exp(-((ap_d - .052) / .036) ** 2) * (.16 + .08 * brow_ridge) * (1.0 - smooth(.88, .99, v))
        c = _mix(c, np.minimum(skin * 1.09 + 6.0, 255.0), np.clip(lid_ridge_hi, 0, .30))

        brow_ao_amp = min(.72, (.28 * crease_strength) * (.78 + .44 * brow_ridge))
        crease_col = _mix(skin * .74, _mix(skin * .46, lash_tint, .36), np.clip((crease_strength - .85 + .35 * brow_ridge) / 1.3, 0, 1))
        fold_off = .105 if style == 'tall_almond' else .116
        fold_w = .038 if style == 'tall_almond' else .042
        upper_crease = smooth(.08, .64, ey) * np.exp(-((ap_d - fold_off) / fold_w) ** 2) * brow_ao_amp * (1.0 - smooth(.88, .99, v))
        c = _mix(c, crease_col, np.clip(upper_crease, 0, .68))

    # Warm baked under-lid cheek-bolster highlight & shadow (sculpted curved lower-lid smile lift for Jisu & Otter!)
    if style in ('crescent_smile', 'tall_almond'):
        lo_hi = smooth(-.05, -.42, ey) * np.exp(-((ap_d - .065) / .042) ** 2) * (.22 if style == 'crescent_smile' else .16) * (1.0 - smooth(.88, .99, v))
        c = _mix(c, np.minimum(skin * 1.08 + 6.0, 255.0), np.clip(lo_hi, 0, .24))
        lo_sh = smooth(-.10, -.52, ey) * np.exp(-((ap_d - .155) / .052) ** 2) * (.34 if style == 'crescent_smile' else .24) * (1.0 - smooth(.88, .99, v))
        c = _mix(c, _mix(skin * .74, (224, 128, 118), .22), np.clip(lo_sh, 0, .38))
    else:
        lower_crease = smooth(-.22, -.72, ey) * np.exp(-((ap_d - .095) / .040) ** 2) * (.15 + .22 * lower_lid_lift) * (1.0 - smooth(.88, .99, v))
        c = _mix(c, skin * .84, np.clip(lower_crease, 0, .32))

    # Glossy wet cornea strictly inside visible eyeball (rough=0.06 <= 0.08!), velvety matte-satin eyelid skin (0.90) outside!
    rough = .06 + .84 * smooth(.770, .845, aperture)
    return c, rough


def paint_eye(char, u, v, side=1):
    """Return (rgb, rough) for an eye tile; u = angle fraction, v = radial 0..1, side = -1 (L) or +1 (R)."""
    dark, bright, glow, skin_fb = PALETTES[char]
    a = T * u
    ex, ey = v * np.cos(a), v * np.sin(a)
    skin = _lookup(SKIN_MAPS[char], ex, ey) if char in SKIN_MAPS else np.broadcast_to(np.asarray(skin_fb, float), ex.shape + (3,))
    lash_tint = LASH_TINTS.get(char, (72, 44, 48))
    gaze_in = GAZE_IN.get(char, .040)
    tune = dict(EYE_TUNING.get(char, {}))
    tune.update(get_eye_shape(char))
    return paint_living_eye(ex, ey, v, side, dark, bright, glow, skin, lash_tint, gaze_in=gaze_in, **tune)


class _Projector:
    """Projects points onto a parametric surface S(u, v) along a fixed axis (Gauss-Newton on 2 params)."""

    def __init__(self, surface, axis):
        self.S = surface
        self.axis = axis
        self.samples = None

    def _grid(self):
        if self.samples is None:
            us = [i / 120 for i in range(120)]
            vs = [.02 + .96 * j / 80 for j in range(81)]
            pts, uvs = [], []
            for vv in vs:
                for uu in us:
                    pts.append(tuple(self.S(uu, vv)))
                    uvs.append((uu, vv))
            self.samples = (np.array(pts), uvs)
        return self.samples

    def seed(self, p):
        pts, uvs = self._grid()
        d = ((pts - np.array(p)) ** 2).sum(axis=1)
        return uvs[int(d.argmin())]

    def solve(self, p0, guess):
        S, ax = self.S, self.axis
        u, v = guess
        e = 1e-4
        res = 1e9
        for _ in range(30):
            s = Vector(S(u, v))
            r = s - p0
            r -= ax * r.dot(ax)
            res = r.length
            if res < 1e-8:
                break
            su = (Vector(S(u + e, v)) - Vector(S(u - e, v))) / (2 * e)
            sv = (Vector(S(u, v + e)) - Vector(S(u, v - e))) / (2 * e)
            su -= ax * su.dot(ax)
            sv -= ax * sv.dot(ax)
            a, b, c = su.dot(su), su.dot(sv), sv.dot(sv)
            det = a * c - b * b
            if abs(det) < 1e-16:
                break
            r0, r1 = -su.dot(r), -sv.dot(r)
            du = (c * r0 - b * r1) / det
            dv = (a * r1 - b * r0) / det
            step = max(abs(du), abs(dv))
            if step > .08:
                du, dv = du * .08 / step, dv * .08 / step
            u += du
            v = min(.997, max(.003, v + dv))
        return u, v, res

    def point(self, p0, guess):
        u, v, res = self.solve(p0, guess)
        if res > 1e-5:
            u, v, res = self.solve(p0, self.seed(p0))
        S = self.S
        e = 1e-4
        su = Vector(S(u + e, v)) - Vector(S(u - e, v))
        sv = Vector(S(u, v + e)) - Vector(S(u, v - e))
        nrm = su.cross(sv)
        if nrm.length < 1e-12:
            nrm = self.axis.copy()
        nrm.normalize()
        if nrm.dot(self.axis) < 0:
            nrm = -nrm
        return Vector(S(u, v)), nrm, (u, v)


def conforming_eye(mesh, side, n, m, axes, r_outer, surface, bone='Head', depth=.21, lift=0.0, res=None, swell=.045, tile='eye', lid_scale=1.0, char=None, shape=None):
    """Add a conforming eye disc with diverse non-circular Mario Party eye shapes, sculpted 3D eyelid cuff & brow ridge.
    axes(side) -> (centre, h, z, normal). `tile` can be 'eye_l'/'eye_r' for un-mirrored world catchlights or 'eye' (legacy)."""
    sh = get_eye_shape(char, shape)
    aspect = sh['aspect']
    tilt = sh['tilt']
    style = sh.get('style', 'default')
    upper_lid_arch = sh['upper_lid_arch']
    lower_lid_lift = sh['lower_lid_lift']
    brow_ridge = sh['brow_ridge']
    lid_hood = sh['lid_hood']

    c, _h, _z, normal = axes(side)
    normal = Vector(normal).normalized()
    h = Z.cross(normal).normalized()
    zz = normal.cross(h).normalized()
    proj = _Projector(surface, normal)
    centre, _n, uv0 = proj.point(Vector(c), proj.seed(c))
    state = {'g': uv0}

    def chord(ub, vb):
        """Point on the discrete body grid (bilinear over the quad containing surface param ub, vb)."""
        nu, nv = res
        fu = (ub % 1.0) * nu
        i = min(int(fu), nu - 1)
        tu = fu - i
        fv = min(max(vb, 0.0), 1.0) * nv
        j = min(int(fv), nv - 1)
        tv = fv - j
        a = Vector(surface(i / nu, j / nv))
        b = Vector(surface((i + 1) / nu, j / nv))
        c = Vector(surface((i + 1) / nu, (j + 1) / nv))
        d = Vector(surface(i / nu, (j + 1) / nv))
        return (a * (1 - tu) + b * tu) * (1 - tv) + (d * (1 - tu) + c * tu) * tv

    # Keep sculpted eyelid fold & brow ridge tactile & clean without frog-eye bulging on low-profile swimmers
    lid_amp = max(swell, .044) * lid_scale * r_outer
    brow_amp = brow_ridge * .055 * lid_scale * r_outer

    # Pre-cache exact v_lid per angular sample so 3D sculpted eyelid fold aligns 1:1 with painted aperture!
    v_lid_cache = {}

    def fn(u, v):
        ang = T * u
        ex, ey = v * math.cos(ang), v * math.sin(ang)
        p0 = centre + _shape_offset(ex, ey, side, r_outer, h, zz, aspect=aspect, tilt=tilt)
        s, nl, state['g'] = proj.point(p0, state['g'] if v > 0 else uv0)

        key = round(u, 6)
        v_lid = v_lid_cache.get(key)
        if v_lid is None:
            v_lid = _v_lid_for_angle(ang, aspect=aspect, upper_lid_arch=upper_lid_arch, lower_lid_lift=lower_lid_lift, lid_hood=lid_hood, style=style)
            v_lid_cache[key] = v_lid

        ey_u = math.sin(ang)
        up_f = float(smooth(.05, .75, ey_u))
        lo_f = float(smooth(-.20, -.82, ey_u))
        v_peak = min(.90, v_lid + .056)

        # Smooth convex wet cornea tucking neatly under the sculpted eyelid rim at v = v_lid
        cornea = depth * r_outer * (max(0.0, 1.0 - (v / max(.16, v_lid + .040)) ** 2) ** 1.25)
        # Sculpted 3D eyelid fold cuff cupping the eyeball (plump overhanging half-lid dome, smiling lower cheek bolster, distinct lid fold)
        lid_env = math.exp(-((v - v_peak) / .068) ** 2) * (1.0 - float(smooth(.90, 1.0, v)))
        lid = lid_amp * (.34 + (1.18 + .90 * lid_hood) * up_f + (.44 + .65 * lower_lid_lift) * lo_f) * lid_env
        if style == 'half_lid' and up_f > .02:
            # Plump continuous 3D half-closed upper eyelid dome spanning from lash rim up to orbital crease
            dome_w = float(smooth(v_lid - .01, v_lid + .09, v)) * (1.0 - float(smooth(.58, .76, v)))
            lid += lid_amp * 1.15 * up_f * dome_w
        elif style == 'crescent_smile' and lo_f > .02:
            # Plump smiling 3D curved lower-lid cheek bolster cradling the golden-amber crescent
            bolster_w = float(smooth(v_lid - .01, v_lid + .09, v)) * (1.0 - float(smooth(.62, .84, v)))
            lid += lid_amp * .95 * lo_f * bolster_w

        # Sculpted 3D upper orbital brow ridge overhang above the upper eyelid crease (Hero Shelly craft!)
        v_brow = max(.72, min(.92, v_lid + .145)) if style == 'half_lid' else min(.93, v_lid + .145)
        brow_env = math.exp(-((v - v_brow) / .090) ** 2) * (1.0 - float(smooth(.89, 1.0, v)))
        brow_lift_3d = brow_amp * float(smooth(.10, .74, ey_u)) * brow_env

        raised = cornea + lid + brow_lift_3d + .0032 + lift
        t = float(smooth(.85, 1.0, v))
        hi = s + nl * raised
        base = chord(*state['g']) if res else s
        lo = base + nl * .0003       # outer skirt ends 100% flush on body faces: exact skin colour, zero seam
        return hi + (lo - hi) * t

    mesh.grid(fn, n, m, tile, bone, True, side > 0)   # mirrored eye flips winding, so reverse only the right eye
    return centre


def calibrate_skin(char, axes, r_outer, surface, sampler, g=28, shape=None):
    """Sample the character's own skin paint over the EXACT non-circular eye disc footprint so outer skirt blends seamlessly.
    sampler(us, vs) takes body-surface (u, v) arrays and returns RGB (0..255) with shape (..., 3)."""
    if char in SKIN_MAPS:
        return
    sh = get_eye_shape(char, shape)
    c, _h, _z, normal = axes(1)
    normal = Vector(normal).normalized()
    h = Z.cross(normal).normalized()
    zz = normal.cross(h).normalized()
    proj = _Projector(surface, normal)
    centre, _n, guess = proj.point(Vector(c), proj.seed(c))
    us = np.zeros((g, g))
    vs = np.zeros((g, g))
    for iy in range(g):
        for ix in range(g):
            ex, ey = -1 + 2 * ix / (g - 1), -1 + 2 * iy / (g - 1)
            rr = math.hypot(ex, ey)
            if rr > 1:
                ex, ey = ex / rr, ey / rr
            off = _shape_offset(ex, ey, 1, r_outer, h, zz, aspect=sh['aspect'], tilt=sh['tilt'])
            _s, _nl, guess = proj.point(centre + off, guess)
            us[iy, ix], vs[iy, ix] = guess
    SKIN_MAPS[char] = np.clip(np.asarray(sampler(us % 1.0, np.clip(vs, 0, 1)), float), 0, 255)
