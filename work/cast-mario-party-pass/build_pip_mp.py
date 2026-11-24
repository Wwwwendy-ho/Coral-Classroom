"""Build Mario-Party silky-gradient Pip (Royal Gramma) without dense diamond scales."""
import importlib.util
import math
import sys
import types
from pathlib import Path
import numpy as np

# Provide lightweight pure-NumPy scipy.ndimage.map_coordinates stub for Windows Blender Python
if "scipy" not in sys.modules:
    scipy_mod = types.ModuleType("scipy")
    ndimage_mod = types.ModuleType("scipy.ndimage")

    def map_coordinates(arr, coords, order=1, mode="wrap"):
        H, W = arr.shape
        r = np.asarray(coords[0], dtype=np.float32) % H
        c = np.asarray(coords[1], dtype=np.float32) % W
        r0 = np.floor(r).astype(np.int32) % H
        c0 = np.floor(c).astype(np.int32) % W
        r1 = (r0 + 1) % H
        c1 = (c0 + 1) % W
        dr = r - np.floor(r)
        dc = c - np.floor(c)
        return (
            arr[r0, c0] * (1 - dr) * (1 - dc)
            + arr[r0, c1] * (1 - dr) * dc
            + arr[r1, c0] * dr * (1 - dc)
            + arr[r1, c1] * dr * dc
        )

    ndimage_mod.map_coordinates = map_coordinates
    scipy_mod.ndimage = ndimage_mod
    sys.modules["scipy"] = scipy_mod
    sys.modules["scipy.ndimage"] = ndimage_mod

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
EPI_GEN = REPO / "game" / "tools" / "art" / "build_echo_pip.py"

spec = importlib.util.spec_from_file_location("ep_base", EPI_GEN)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def pigment_pip_mp(tile, u, v):
    zero = np.zeros_like(u)
    if tile == "eye":
        a = -base.TAU * u
        r = 1.48 * v
        iris = np.clip((0.88 - r) / 0.03, 0.0, 1.0)
        # Clean bright warm pearl-white sclera
        rgb = np.zeros((*u.shape, 3), dtype=np.float32) + np.array((255, 252, 246), dtype=np.float32)
        honey_w = np.clip(0.32 + 0.50 * np.clip((0.88 - r) / 0.25, 0.0, 1.0) - 0.28 * np.sin(a), 0.0, 1.0)
        col = base.tint((138, 62, 18), (252, 184, 52), honey_w)
        rgb = rgb + (col - rgb) * iris[..., None]
        rgb = base.paint(rgb, (48, 24, 18), np.exp(-((r - 0.84) / 0.028) ** 2) * 0.78)
        rgb = base.paint(rgb, (16, 14, 22), np.clip((0.56 - r) / 0.018, 0.0, 1.0))
        x, y = np.sin(r) * np.cos(a), np.sin(r) * np.sin(a)
        l1 = np.exp(-(((x + 0.16) / 0.095) ** 2 + ((y - 0.23) / 0.085) ** 2))
        l2 = np.exp(-(((x - 0.15) / 0.048) ** 2 + ((y + 0.19) / 0.048) ** 2))
        rgb = base.paint(rgb, (255, 255, 250), np.clip((l1 - 0.18) * 1.45, 0.0, 0.96) + 0.80 * l2)
        return rgb, 0.16 + zero, zero
    if tile == "brass":
        return base.tint((178, 134, 62), (244, 208, 128), 0.6 + 0.2 * u), 0.36 + zero, 0.35 + zero
    if tile == "jaw":
        return base.tint((214, 218, 224), (248, 246, 238), 0.7 + 0.2 * v), 0.56 + zero, zero
    if tile == "orbit":
        rgb = base.tint((98, 36, 168), (156, 72, 214), 0.55 + 0.3 * np.sin(u * math.pi))
        upper = np.maximum(0.0, np.sin(base.TAU * u)) ** 0.55
        rgb = base.paint(rgb, (64, 22, 108), np.exp(-((v / 0.075) ** 2)) * (0.14 + 0.45 * upper))
        return rgb, 0.58 + zero, zero
    if tile == "dark":
        return base.tint((34, 28, 48), (64, 52, 82), 0.45 + 0.3 * v), 0.68 + zero, zero
    if tile == "body":
        # Smooth silky royal-violet -> golden-yellow Mario-Party transition (zero dense diamond scales!)
        transition = smoothstep(0.47, 0.67, v)
        rgb = base.tint((118, 46, 198), (254, 196, 46), transition)
        belly = (0.5 - 0.5 * np.cos(base.TAU * u)) ** 2
        rgb = base.paint(rgb, (166, 92, 224), 0.22 * belly * (1.0 - transition))
        rgb = base.paint(rgb, (255, 226, 122), 0.24 * belly * transition)
        # Soft gentle gill arc tint (not harsh dark line)
        gill = np.exp(-((v - (0.365 + 0.025 * np.cos(base.TAU * u))) / 0.007) ** 2) * (np.abs(np.sin(base.TAU * u)) ** 5)
        rgb = base.paint(rgb, (86, 30, 148), 0.30 * gill)
        return rgb, 0.64 + zero, zero
    if tile == "tailfin":
        rays = (0.5 + 0.5 * np.cos(base.TAU * u * 10)) ** 10
        rgb = base.tint((236, 162, 34), (255, 228, 92), 0.40 + 0.50 * v)
        rgb = base.paint(rgb, (255, 242, 178), 0.46 * rays)
        return rgb, 0.64 - 0.06 * rays, zero
    if tile == "fin":
        ray = (0.5 + 0.5 * np.cos(base.TAU * u * 12 + 0.10 * v)) ** 10
        rgb = base.tint((124, 48, 196), (255, 206, 62), np.clip(0.14 + 0.72 * v, 0.0, 1.0))
        rgb = base.paint(rgb, (255, 232, 168), 0.45 * ray)
        return rgb, 0.64 - 0.06 * ray, zero
    if tile in ("cloth", "strap"):
        fold = 0.5 + 0.5 * np.sin(u * 3.0 + v * 4.0)
        rgb = base.tint((108, 176, 150), (194, 226, 192), 0.55 + 0.40 * fold)
        edge = np.minimum(np.minimum(u, 1.0 - u), np.minimum(v, 1.0 - v))
        stitch = np.exp(-(((edge - 0.05) / 0.009) ** 2)) * np.clip(np.cos(base.TAU * (u + v) * 32.0) * 4.0, 0.0, 1.0)
        rgb = base.paint(rgb, (242, 232, 188), 0.85 * stitch)
        if tile == "cloth":
            x, y = u - 0.5, v - 0.52
            mark = (np.abs(x) < 0.12) & (np.abs(y) < 0.12)
            mark |= ((x - 0.12) ** 2 + (y / 0.9) ** 2) < 0.055 ** 2
            mark &= ~(((x + 0.12) ** 2 + (y / 0.9) ** 2) < 0.055 ** 2)
            rgb = base.paint(rgb, (248, 240, 212), mark * 0.94)
        return rgb, 0.80 + zero, zero
    raise KeyError(tile)


if __name__ == "__main__":
    base.pigment = pigment_pip_mp
    base.main()
