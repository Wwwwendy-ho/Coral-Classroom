"""Build Mario-Party Shop Octopus preserving exact 8 independent arms & bit-identical OctopusSkinMask alpha."""
import importlib.util
import json
import math
import subprocess
from pathlib import Path
import bpy
import numpy as np

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
OCT_GEN = REPO / "game" / "tools" / "art" / "build_shop_octopus.py"

spec = importlib.util.spec_from_file_location("octopus_base", OCT_GEN)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)


def win_to_wsl(p):
    s = str(Path(p).resolve()).replace("\\", "/")
    if len(s) >= 2 and s[1] == ":":
        return f"/mnt/{s[0].lower()}{s[2:]}"
    return s


def smoothstep(a, b, x):
    t = np.clip((x - a) / (b - a), 0.0, 1.0)
    return t * t * (3.0 - 2.0 * t)


def pigment_mp(tile, u, v):
    # Clean Mario-Party coral-ruby gradients + soft broad pearlescent accent spots (zero papilla grain/pores)
    a = u * base.TAU
    grad = 0.5 + 0.5 * np.sin(a * 2.0 + v * 2.4)
    col = base.mix([178, 46, 48], [218, 76, 68], grad)
    if tile == "skin":
        spots = 0.5 + 0.5 * np.sin(a * 5.0 + 0.6 * np.sin(v * 12.0)) * np.cos(v * 9.0 - 0.5 * np.sin(a * 3.0))
        soft_spot = smoothstep(0.66, 0.88, spots) * smoothstep(0.20, 0.55, v)
        col = col * (1.0 - 0.28 * soft_spot[..., None]) + np.array([236, 198, 178], dtype=np.float32) * (0.28 * soft_spot[..., None])
    else:
        spots = 0.5 + 0.5 * np.sin(a * 3.0 + v * 14.0) * np.cos(v * 18.0)
        soft_spot = smoothstep(0.68, 0.90, spots)
        col = col * (1.0 - 0.22 * soft_spot[..., None]) + np.array([234, 192, 172], dtype=np.float32) * (0.22 * soft_spot[..., None])
    rough = np.full_like(u, 0.68)
    return col, rough, np.zeros_like(u)


def paint_mp(tile, u, v):
    if tile in ("skin", "arm"):
        return (*pigment_mp(tile, u, v), np.ones_like(u))
    if tile in ("cloth", "pocket", "strap"):
        fold = 0.5 + 0.5 * np.sin(u * 4.0 + v * 3.0)
        col = base.mix([42, 68, 114], [58, 88, 138], 0.35 + 0.65 * fold)
        edge = np.minimum(np.minimum(u, 1.0 - u), np.minimum(v, 1.0 - v))
        col *= np.clip(0.82 + edge * 6.0, 0.82, 1.0)[..., None]
        line = (np.abs(u - 0.042) < 0.006) | (np.abs(u - 0.958) < 0.006) | (np.abs(v - 0.035) < 0.006) | (np.abs(v - 0.96) < 0.006)
        dash = np.where((np.abs(u - 0.042) < 0.006) | (np.abs(u - 0.958) < 0.006), np.sin(v * base.TAU * 38.0) > 0.0, np.sin(u * base.TAU * 42.0) > 0.0)
        col[line & dash] = [224, 184, 108]
        if tile == "pocket":
            opening = (v > 0.945) & (v < 0.968)
            col[opening] = [22, 36, 62]
        return col, np.full_like(u, 0.80), np.zeros_like(u), np.zeros_like(u)
    if tile == "eye":
        a = (u - 0.5) * base.TAU
        phi = math.pi * (1.0 - v)
        x = np.sin(a) * np.sin(phi)
        z = np.cos(phi)
        r = np.sqrt((x + 0.025) ** 2 + (z + 0.015) ** 2)
        front = np.cos(a) > 0
        iris = (r < 0.82) & front
        pupil = (r < 0.46) & front
        col = np.zeros((*u.shape, 3), dtype=np.float32) + np.array([255, 252, 246], dtype=np.float32)
        honey_w = np.clip(0.32 + 0.52 * (1.0 - r) - 0.25 * z, 0.0, 1.0)
        gold = base.mix([138, 66, 22], [244, 168, 52], honey_w)
        limbal = smoothstep(0.72, 0.81, r)
        gold = gold * (1.0 - 0.65 * limbal[..., None]) + np.array([62, 32, 20], dtype=np.float32) * (0.65 * limbal[..., None])
        col[iris] = gold[iris]
        col[pupil] = [18, 14, 20]
        hl1 = (((x + 0.16) ** 2 / 0.014 + (z - 0.21) ** 2 / 0.022) < 1.0) & front
        hl2 = (((x - 0.15) ** 2 + (z + 0.16) ** 2) < 0.004) & front
        col[hl1] = [255, 255, 250]
        col[hl2] = [255, 252, 246]
        return col, np.full_like(u, 0.14), np.zeros_like(u), np.zeros_like(u)
    if tile == "sucker":
        col = base.mix([214, 146, 132], [250, 232, 206], np.clip(v * 1.55, 0.0, 1.0))
        return col, np.full_like(u, 0.56), np.zeros_like(u), np.zeros_like(u)
    if tile == "gold":
        col = base.mix([174, 124, 52], [244, 198, 98], 0.58 + 0.25 * np.sin(u * base.TAU))
        return col, np.full_like(u, 0.32), np.full_like(u, 0.52), np.zeros_like(u)
    raise ValueError(tile)


def atlas_wsl_p(output, size):
    color = np.zeros((size, size, 4), dtype=np.uint8)
    surface = np.zeros((size, size, 3), dtype=np.uint8)
    surface[..., 0] = 255
    factor = size / 1024
    evidence = {}
    for name, rect in base.ATLAS.items():
        x, y, w, h = (int(a * factor) for a in rect)
        u, v = np.meshgrid(
            np.clip((np.arange(w, dtype=np.float32) + 0.5 - 4 * factor) / (w - 8 * factor), 0, 1),
            np.clip((np.arange(h, dtype=np.float32) + 0.5 - 4 * factor) / (h - 8 * factor), 0, 1),
        )
        rgb, rough, metal, mask = paint_mp(name, u, v)
        color[y : y + h, x : x + w, :3] = np.uint8(np.clip(np.rint(rgb), 0, 255))
        color[y : y + h, x : x + w, 3] = np.uint8(mask * 255)
        surface[y : y + h, x : x + w, 1] = np.uint8(np.clip(rough * 255, 0, 255))
        surface[y : y + h, x : x + w, 2] = np.uint8(np.clip(metal * 255, 0, 255))
        evidence[name] = {"alphaMin": int(mask.min() * 255), "alphaMax": int(mask.max() * 255), "region": list(rect)}

    color_path = output / f"painted-color-{size}.png"
    surface_path = output / f"painted-surface-{size // 4}.png"
    base.png(color_path, color)

    wsl_p = win_to_wsl(color_path)
    py_code = (
        "from PIL import Image, ImageChops; import sys; "
        "p=sys.argv[1]; n=128; im=Image.open(p).convert('RGBA'); "
        "q=im.convert('RGB').quantize(colors=n, method=Image.Quantize.MEDIANCUT, dither=Image.Dither.NONE); "
        "pal=q.getpalette()[:n*3]; "
        "idx=Image.frombytes('L', q.size, q.tobytes()); "
        "mask=im.getchannel('A').point(lambda a: n if a>127 else 0); "
        "res=Image.frombytes('P', q.size, ImageChops.add(idx, mask).tobytes()); "
        "res.putpalette(pal+pal); res.info['transparency']=bytes([0]*n + [255]*n); "
        "res.save(p, optimize=True)"
    )
    subprocess.run(["wsl.exe", "-d", "Ubuntu", "--", "/home/wendy/.venvs/coral-classroom/bin/python", "-c", py_code, wsl_p], check=True)

    down = np.uint8(np.rint(surface.reshape(size // 4, 4, size // 4, 4, 3).mean(axis=(1, 3))))
    down[..., 1] = np.uint8(np.clip(np.rint(down[..., 1].astype(np.float32) / 8) * 8, 0, 255))
    base.png(surface_path, down)
    (output / f"skin-mask-{size}.json").write_text(
        json.dumps({"rule": "alpha 255 only skin/arm; 0 eyes/suckers/clothing/brass; OPAQUE material", "tiles": evidence}, indent=2) + "\n"
    )
    return color_path, surface_path


if __name__ == "__main__":
    base.pigment = pigment_mp
    base.paint = paint_mp
    base.atlas = atlas_wsl_p
    base.main()
