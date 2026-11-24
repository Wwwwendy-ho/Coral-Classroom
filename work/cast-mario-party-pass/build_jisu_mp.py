"""Build Mario-Party clean-shell/clean-claw/bright-eye Jisu (board & close GLBs)."""
import importlib.util
import math
import sys
from pathlib import Path
import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
JISU_GEN = REPO / "game" / "tools" / "art" / "build_jisu.py"

spec = importlib.util.spec_from_file_location("jisu_base", JISU_GEN)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def paint_mp(name, u, v):
    rgb = np.zeros((*u.shape, 3), np.float32)
    rough = np.full(u.shape, 0.68, dtype=np.float32)
    metal = np.zeros(u.shape, dtype=np.float32)

    def color(c):
        rgb[:] = c

    def overlay(c, a):
        a = np.clip(a, 0.0, 1.0)[..., None]
        rgb[:] = rgb * (1.0 - a) + np.array(c, dtype=np.float32) * a

    if name == "shell":
        # Silky warm ivory-cream shell with smooth sand-caramel spiral bands (zero dark speckle noise)
        color((246, 238, 224))
        band = (0.5 + 0.5 * np.cos(base.TAU * (u * 5.0 + v * 1.15))) ** 2
        overlay((208, 186, 154), band * 0.48)
        overlay((255, 248, 236), smoothstep(0.70, 0.98, v) * 0.42)
        rough[:] = 0.64
    elif name in ("limb", "claw", "body"):
        rough[:] = 0.58 if name == "claw" else 0.64
        color((36, 56, 98))
        overlay((54, 82, 134), smoothstep(0.15, 0.85, v) * 0.65)
        if name == "limb":
            bands = smoothstep(0.35, 0.55, 0.5 + 0.5 * np.sin(base.TAU * (v * 2.45 + 0.03 * np.sin(u * 9.0))))
            overlay((28, 134, 242), bands * 0.94)
            overlay((84, 182, 255), bands * smoothstep(0.2, 0.9, v) * 0.32)
        elif name == "body":
            overlay((52, 136, 234), smoothstep(0.30, 0.85, v) * 0.45)
        elif name == "claw":
            overlay((64, 96, 152), smoothstep(0.45, 0.95, v) * 0.52)
    elif name == "eye":
        # Crisp warm pearl-white sclera + glowing golden-amber iris + twin Nintendo catchlights
        color((255, 252, 246))
        rad = v
        iris = np.clip((0.430 - rad) * 140.0, 0.0, 1.0)
        a = u * base.TAU
        honey_w = np.clip(0.35 + 0.48 * np.clip((rad - 0.22) / 0.19, 0.0, 1.0) - 0.24 * np.sin(a), 0.0, 1.0)
        irisrgb = np.array((132, 62, 22), dtype=np.float32) * (1.0 - honey_w[..., None]) + np.array((248, 174, 54), dtype=np.float32) * honey_w[..., None]
        limbal = np.clip((rad - 0.39) * 110.0, 0.0, 1.0)
        irisrgb = irisrgb * (1.0 - 0.75 * limbal[..., None]) + np.array((52, 34, 24), dtype=np.float32) * (0.75 * limbal[..., None])
        rgb = rgb * (1.0 - iris[..., None]) + irisrgb * iris[..., None]
        overlay((16, 14, 22), np.clip((0.270 - rad) * 160.0, 0.0, 1.0))
        rough[:] = 0.14
        x = np.sin(v * math.pi) * np.cos(a)
        z = np.sin(v * math.pi) * np.sin(a)
        overlay((255, 255, 250), np.clip((0.118 - np.sqrt((x + 0.16) ** 2 + (z - 0.22) ** 2)) * 160.0, 0.0, 1.0))
        overlay((255, 252, 245), np.clip((0.054 - np.sqrt((x - 0.15) ** 2 + (z + 0.16) ** 2)) * 160.0, 0.0, 0.85))
    elif name == "cloth":
        # Clean silky tangerine-orange postal pouch + golden stitch trim
        fold = 0.5 + 0.5 * np.sin(u * math.pi) * np.sin(v * math.pi)
        color((226, 98, 22))
        overlay((248, 128, 36), fold * 0.72)
        seam = np.minimum(np.minimum(u, 1.0 - u), np.minimum(v, 1.0 - v))
        overlay((186, 76, 16), np.exp(-seam * 55.0) * 0.35)
        stitch = (np.abs(seam - 0.036) < 0.007) & (np.sin((u + v) * base.TAU * 36.0) > 0.08)
        overlay((255, 218, 128), stitch * 0.90)
        rough[:] = 0.80
    elif name == "paper":
        color((248, 240, 224))
        d = np.minimum(np.abs(v - (1.0 - u * 0.78)), np.abs(v - (0.22 + u * 0.78)))
        overlay((214, 200, 176), np.exp(-d * 140.0) * 0.42)
        rough[:] = 0.82
    elif name == "orange":
        color((248, 122, 28))
        overlay((255, 168, 54), (0.5 + 0.5 * np.sin(u * base.TAU)) * 0.28)
        rough[:] = 0.52
    elif name == "metal":
        color((224, 178, 84))
        rough[:] = 0.34
        metal[:] = 0.50
    elif name == "dark":
        color((156, 146, 136))
        overlay((44, 48, 56), np.clip(v * 1.55, 0.0, 1.0))
        rough[:] = 0.85
    else:
        color((242, 238, 226))
    return np.clip(rgb, 0.0, 255.0), rough, metal


if __name__ == "__main__":
    base.paint = paint_mp
    parser = base.argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--output", required=True, type=Path)
    parser.add_argument("--lod", choices=["both", "board", "close"], default="both")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else [])
    args.output = args.output.resolve()
    args.output.mkdir(parents=True, exist_ok=True)
    for lod in (["board", "close"] if args.lod == "both" else [args.lod]):
        base.build(lod, args.output)
