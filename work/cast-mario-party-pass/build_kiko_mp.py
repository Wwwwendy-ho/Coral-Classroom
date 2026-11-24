"""Build Mario-Party clean-skin/shell/bright-eye pass of Kiko Mochi and Kiko Hermit."""
import importlib.util
import math
import sys
from pathlib import Path
import numpy as np
from mathutils import Vector

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
KIKO_GEN = REPO / "game" / "tools" / "art" / "build_kiko_cast.py"

spec = importlib.util.spec_from_file_location("kiko_base", KIKO_GEN)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def make_mesh_smooth(kind, lod, mat, rig):
    m = base.h.MeshBuilder()
    res = (0.85 if lod == "board" else 1.39) if kind == "hermit" else (0.88 if lod == "board" else 1.43)

    def grid(fn, n, t, tile, bone="Body", **kw):
        m.grid(fn, max(4, round(n * res)), max(2, round(t * res)), tile, bone, **kw)

    def pipe(points, radii, tile, bone="Body", n=8, t=10, scale=(1, 1)):
        grid(lambda u, v: base.tube(points, radii, u, v, scale), n, t, tile, bone)

    if kind == "hermit":
        grid(base.shell_surface, 32, 38, "shell")
        grid(
            lambda u, v: base.shell_surface(u, 1)
            + Vector((math.cos(base.TAU * u) * 0.022 * math.cos(base.TAU * v), 0.022 * math.sin(base.TAU * v), math.sin(base.TAU * u) * 0.022 * math.cos(base.TAU * v))),
            36, 5, "shell", wrap_v=True,
        )
        grid(
            lambda u, v: Vector((-0.02, -0.17 + 0.50 * v, 0.72 + 0.12 * v))
            + Vector((math.cos(base.TAU * u) * 0.573 * (1 - 0.55 * v), 0, math.sin(base.TAU * u) * 0.53 * (1 - 0.55 * v))),
            28, 8, "dark", reverse=True,
        )
        grid(lambda u, v: base.ell((0, -0.25, 0.60), (0.37, 0.35, 0.26), u, v), 20, 10, "body")
        grid(lambda u, v: base.ell((0, -0.49, 0.55), (0.405, 0.26, 0.195), u, v), 22, 10, "body")
    else:
        # Smooth Mario-Party carapace without the 31 rough granule blobs
        grid(base.carapace, 36, 18, "body")
        grid(lambda u, v: base.ell((0, -0.015, 0.53), (0.55, 0.32, 0.126), u, v), 28, 10, "underside")
        for side in [-1, 1]:
            for k in range(3):
                y = -0.17 + k * 0.16
                pipe([(side * 0.57, y, 0.72), (side * 0.72, y - 0.015, 0.72), (side * 0.756, y - 0.03, 0.73)], [0.052, 0.030, 0.001], "body", n=6, t=5)

    for side, suf in [(-1, "L"), (1, "R")]:
        base_y = -0.738 if kind == "hermit" else -0.357
        pipe([(side * 0.077, base_y, 0.52), (side * 0.050, base_y - 0.028, 0.475), (side * 0.012, base_y - 0.025, 0.49)], [0.027, 0.024, 0.003], "limb", n=6, t=5)
        count = 3 if kind == "hermit" else 4
        for k in range(count):
            if kind == "hermit":
                root = (side * 0.28, -0.30 + k * 0.18, 0.51)
                knee = (side * (0.59 + 0.065 * k), -0.36 + k * 0.26, 0.45 + 0.035 * k)
                ankle = (side * (0.76 + 0.075 * k), -0.44 + k * 0.26, 0.20)
                tip = (side * (0.80 + 0.07 * k), -0.53 + k * 0.27, 0.035)
            else:
                root = (side * 0.46, -0.16 + k * 0.115, 0.57)
                knee = (side * (0.79 + 0.07 * math.sin(k)), -0.35 + k * 0.25, 0.48)
                ankle = (side * (0.98 + 0.04 * math.sin(k)), -0.46 + k * 0.28, 0.17)
                tip = (side * (1.04 + 0.025 * math.sin(k)), -0.56 + k * 0.30, 0.035)
            pipe([root, knee, ankle, tip], [0.080, 0.070, 0.035, 0.002], "limb", "Leg%d.%s" % (k + 1, suf), n=8, t=12)

        ec = base.eye_center(kind, side)
        origin = (side * 0.178, -0.57, 0.68) if kind == "hermit" else (side * 0.24, -0.33, 0.82)
        stalkbone = "Sensors" if kind == "hermit" else "Eye." + suf
        pipe([origin, tuple(Vector(origin) * 0.45 + ec * 0.55), tuple(ec + Vector((0, 0.018, -0.135)))], [0.043, 0.035, 0.044], "limb", stalkbone, n=10, t=9)
        grid(lambda u, v, s=side: base.eye_surface(kind, s, u, v), 22, 12, "eye", "Eye." + suf)
        grid(
            lambda u, v, e=ec: e
            + Vector(((0.150 + 0.010 * math.cos(base.TAU * v)) * math.cos(base.TAU * u), 0.035 + 0.012 * math.sin(base.TAU * v), (0.167 + 0.010 * math.cos(base.TAU * v)) * math.sin(base.TAU * u))),
            24, 5, "rim", stalkbone, wrap_v=True,
        )
        if kind == "hermit":
            grid(
                lambda u, v, e=ec: e
                + Vector(((0.174 + 0.008 * math.cos(base.TAU * v)) * math.cos(base.TAU * u), -0.148 + 0.008 * math.sin(base.TAU * v), (0.184 + 0.008 * math.cos(base.TAU * v)) * math.sin(base.TAU * u))),
                32, 5, "gold", "Sensors", wrap_v=True,
            )
            pipe([(side * 0.394, -0.791, 1.11), (side * 0.435, -0.65, 1.10), (side * 0.395, -0.42, 1.04)], [0.009, 0.009, 0.006], "gold", "Sensors", n=6, t=8)
            pipe([(side * 0.073, -0.70, 0.67), (side * 0.12, -0.76, 0.84), (side * 0.27, -0.78, 0.94), (side * 0.39, -0.76, 0.96)], [0.012, 0.010, 0.006, 0.001], "antenna", "Antenna." + suf, n=6, t=11)

        if kind == "hermit":
            center = (side * 0.48, -0.755, 0.37)
            arm = [(side * 0.29, -0.52, 0.52), (side * 0.43, -0.64, 0.45), center]
            size = 1.13 if side < 0 else 0.85
            palm = (0.144 * size, 0.153 * size, 0.188 * size)
            fixed = [(side * 0.57, -0.78, 0.35), (side * 0.60, -0.82, 0.22), (side * 0.53, -0.84, 0.145)]
            finger = [(side * 0.405, -0.80, 0.35), (side * 0.42, -0.86, 0.23), (side * 0.50, -0.87, 0.165)]
        else:
            size = 1.26 if side > 0 else 0.85
            center = (side * 0.88, -0.33, 0.99 if side > 0 else 0.48)
            arm = [(side * 0.52, -0.17, 0.60), (side * 0.75, -0.30, 0.72 if side > 0 else 0.47), center]
            palm = (0.177 * size, 0.14 * size, 0.195 * size)
            if side > 0:
                fixed = [(0.99, -0.33, 1.06), (1.12, -0.32, 1.28), (1.055, -0.32, 1.37)]
                finger = [(0.79, -0.34, 1.05), (0.84, -0.34, 1.26), (1.00, -0.33, 1.345)]
            else:
                fixed = [(-0.98, -0.34, 0.47), (-1.07, -0.37, 0.31), (-0.98, -0.39, 0.25)]
                finger = [(-0.81, -0.35, 0.46), (-0.83, -0.40, 0.34), (-0.93, -0.41, 0.27)]

        pipe(arm, [0.097 * size, 0.088 * size, 0.093 * size], "limb", "Claw." + suf, n=10, t=10)
        grid(lambda u, v, c=center, p=palm: base.ell(c, p, u, v), 18, 11, "claw", "Claw." + suf)
        pipe(fixed, [0.080 * size, 0.047 * size, 0.001], "claw", "Claw." + suf, n=9, t=10)
        pipe(finger, [0.063 * size, 0.035 * size, 0.001], "claw", "Claw." + suf, n=9, t=10)

    if kind == "hermit":
        base.pipe_fix if False else pipe([(-0.054, -0.802, 1.108), (0, -0.823, 1.126), (0.054, -0.802, 1.108)], [0.009, 0.008, 0.009], "gold", "Sensors", n=6, t=8)

    obj = m.create(mat, rig)
    obj.name = f"Kiko {kind} | Mario-Party smooth mesh"
    obj.data.name = f"Kiko {kind} single painted mesh"
    obj.modifiers[0].name = "Crustacean skeleton"
    return obj


def paint_mp(kind, name, u, v):
    """Smooth silky Mario-Party surfaces, clean pastel shell swirls, and warm luminous eyes."""
    rgb = np.zeros((*u.shape, 3), np.float32)
    rough = np.full(u.shape, 0.66, dtype=np.float32)
    metal = np.zeros(u.shape, dtype=np.float32)

    def color(c):
        rgb[:] = c

    def over(c, a):
        a = np.clip(a, 0.0, 1.0)[..., None]
        rgb[:] = rgb * (1.0 - a) + np.array(c, dtype=np.float32) * a

    if name == "shell":
        # Pastel cream base with broad, silky lavender-periwinkle spiral swirl (zero brown speckles/noise)
        color((248, 240, 234))
        swirl = 0.5 + 0.5 * np.sin(base.TAU * (u * 5.0 + v * 1.2))
        over((196, 176, 224), smoothstep_arr(0.45, 0.85, swirl) * 0.72)
        over((255, 248, 242), smoothstep_arr(0.75, 0.98, v) * 0.45)
        rough[:] = 0.68
    elif name in ("body", "limb", "claw", "rim"):
        # Smooth coral-peach / warm rose-peach gradients (zero static noise, zero pox freckles)
        top_w = np.clip(0.35 + 0.55 * v + 0.15 * np.cos(base.TAU * u), 0.0, 1.0)
        if kind == "hermit":
            c_lo, c_hi = np.array((228, 132, 138)), np.array((255, 192, 178))
        else:
            c_lo, c_hi = np.array((234, 134, 128)), np.array((255, 196, 174))
        rgb[:] = c_lo * (1.0 - top_w[..., None]) + c_hi * top_w[..., None]
        if name == "body":
            # Subtle sunny peach center highlight
            front = (0.5 - 0.5 * np.cos(base.TAU * u)) ** 2
            over((255, 222, 196), front * 0.34)
        elif name == "limb":
            over((255, 218, 194), np.exp(-((v - 0.38) * 14.0) ** 2) * 0.30)
        elif name == "claw":
            over((255, 226, 198), np.clip((v - 0.55) * 1.8, 0.0, 0.55))
            rough[:] = 0.56
        elif name == "rim":
            over((255, 214, 196), 0.35)
    elif name == "eye":
        # Crisp warm pearl-white sclera + luminous honey-amber iris + dark pupil + twin catchlights
        color((255, 252, 246))
        rad = v
        iris = np.clip((0.415 - rad) * 140.0, 0.0, 1.0)
        a = u * base.TAU
        honey_w = np.clip(0.35 + 0.45 * np.clip((rad - 0.22) / 0.18, 0.0, 1.0) - 0.25 * np.sin(a), 0.0, 1.0)
        ir = np.array((136, 62, 26), dtype=np.float32) * (1.0 - honey_w[..., None]) + np.array((244, 168, 58), dtype=np.float32) * honey_w[..., None]
        limbus = np.clip((rad - 0.375) * 100.0, 0.0, 1.0)
        ir = ir * (1.0 - 0.72 * limbus[..., None]) + np.array((64, 34, 24), dtype=np.float32) * (0.72 * limbus[..., None])
        rgb = rgb * (1.0 - iris[..., None]) + ir * iris[..., None]
        over((18, 14, 20), np.clip((0.255 - rad) * 160.0, 0.0, 1.0))
        rough[:] = 0.14
        x = np.sin(v * math.pi) * np.cos(a)
        z = np.sin(v * math.pi) * np.sin(a)
        over((255, 255, 250), np.clip((0.120 - np.sqrt((x + 0.16) ** 2 + (z - 0.23) ** 2)) * 160.0, 0.0, 1.0))
        over((255, 252, 245), np.clip((0.056 - np.sqrt((x - 0.15) ** 2 + (z + 0.16) ** 2)) * 160.0, 0.0, 0.85))
    elif name == "underside":
        color((255, 232, 204))
        over((236, 178, 166), (0.5 + 0.5 * np.sin(v * base.TAU * 5.0)) ** 6 * 0.22)
    elif name == "gold":
        color((228, 178, 78))
        rough[:] = 0.30
        metal[:] = 0.45
    elif name == "antenna":
        color((244, 142, 108))
        rough[:] = 0.60
    elif name == "dark":
        color((182, 152, 164))
        over((68, 54, 72), np.clip(v * 1.4, 0.0, 1.0))
        rough[:] = 0.80

    return np.clip(rgb, 0.0, 255.0), rough, metal


def smoothstep_arr(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


if __name__ == "__main__":
    base.make_mesh = make_mesh_smooth
    base.paint = paint_mp
    p = base.argparse.ArgumentParser(description=__doc__)
    p.add_argument("--character", choices=["hermit", "mochi"], required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--lod", choices=["both", "board", "close"], default="both")
    p.add_argument("--reuse-atlas", action="store_true")
    a = p.parse_args(sys.argv[sys.argv.index("--") + 1 :])
    a.output = a.output.resolve()
    a.output.mkdir(parents=True, exist_ok=True)
    for lod in ["board", "close"] if a.lod == "both" else [a.lod]:
        base.build(a.character, lod, a.output, a.reuse_atlas)
