"""Build genuine Mario-Party / Animal-Crossing pass of Café Seahorse from parametric generator + open-eye polish geometry.
Stages outputs to work/cast-mario-party-pass/cafe-seahorse-mp/ without touching canonical game/assets/models/.
"""
import importlib.util
import math
import sys
from pathlib import Path
import numpy as np
from mathutils import Quaternion

HERE = Path(__file__).resolve().parent
REPO = HERE.parents[1]
GENERATOR = REPO / "game" / "tools" / "art" / "build_cafe_seahorse.py"

spec = importlib.util.spec_from_file_location("cafe_seahorse", GENERATOR)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)

original_eye_axes = base.eye_axes
original_apron_point = base.apron_point


def eye_axes(side):
    center, horizontal, vertical, normal = original_eye_axes(side)
    return center - normal * 0.021, horizontal, vertical, normal


def eye_point(side, u, v):
    center, horizontal, vertical, normal = eye_axes(side)
    phi, theta = math.pi * v, math.tau * u
    tangent = math.cos(theta) * horizontal + math.sin(theta) * vertical
    direction = 0.174 * (math.sin(phi) * tangent + math.cos(phi) * normal)
    return center + Quaternion(base.Z, math.radians(9 - side * 33)) @ direction


def socket_point(side, u, v):
    center, horizontal, vertical, normal = eye_axes(side)
    a = math.tau * u
    x, y = math.cos(a), math.sin(a)
    bridge = max(0.0, -side * x)
    cheek = max(0.0, -y)
    inner_x = 0.152
    inner_y = 0.145 + 0.006 * max(0.0, y)
    depth = math.sqrt(0.174 ** 2 - (inner_x * x) ** 2 - (inner_y * y) ** 2)
    width, height, inset = base.curve(
        [
            (inner_x, inner_y, depth + 0.004),
            (inner_x + 0.012, inner_y + 0.012, depth - 0.002),
            (inner_x + 0.034 - 0.012 * bridge, inner_y + 0.038, depth - 0.020 - 0.009 * cheek),
            (0.223 - 0.035 * bridge, 0.210 - 0.016 * cheek, -0.023 - 0.013 * cheek),
            (0.247 - 0.055 * bridge, 0.222 - 0.016 * cheek, -0.101 - 0.013 * cheek),
        ],
        v * 4,
    )
    return center + horizontal * (width * x) + vertical * (height * y) + normal * inset


def upper_orbit_point(side, u, v):
    point = socket_point(side, base.lerp(0.018, 0.482, u), base.lerp(0.40, 1.0, v))
    return point - eye_axes(side)[3] * (0.012 + 0.021 * v)


def pocket_point(u, v):
    corner = abs(2 * u - 1) ** 5
    at_u = base.lerp(0.17, 0.83, u) + 0.060 * (1 - 2 * u) * v ** 4
    at_v = base.lerp(0.605, 0.931, v) - 0.071 * v ** 5 * corner
    across = math.sin(math.pi * u)
    puff = 0.006 + 0.019 * across * math.sin(math.pi * v)
    lip = 0.009 * across * math.exp(-((v - 0.038) / 0.070) ** 2)
    return original_apron_point(at_u, at_v, puff + lip)


def painted_skin(tile, u, v, head=False):
    angle = math.tau * u
    if head:
        upper = 0.5 + 0.5 * np.cos(angle)
        muzzle = np.clip((v - 0.35) / 0.27, 0.0, 1.0)
        cheek = (np.sin(angle) ** 2) * np.exp(-((v - 0.31) / 0.14) ** 2)

        # Rich silky coral-apricot dorsal tones -> warm peach-cream lower snout (zero pore noise)
        result = base.tint((214, 108, 76), (248, 172, 118), 0.22 + 0.44 * upper + 0.16 * muzzle)
        # Warm butter-peach lower snout / jaw (not washed-out white)
        result = base.paint(result, (252, 204, 150), (0.5 - 0.5 * np.cos(angle)) * (0.24 + 0.32 * muzzle))
        # Delicate rosy Mario-Party cheek blush + warm snout-tip coral glow
        result = base.paint(result, (242, 112, 106), cheek * 0.36)
        snout_tip = np.exp(-((v - 0.68) / 0.09) ** 2) * (0.35 + 0.65 * upper)
        result = base.paint(result, (244, 148, 104), snout_tip * 0.28)
        # Clean soft trumpet-snout mouth interior & warm lip roll
        mouth = np.clip((v - 0.805) / 0.146, 0.0, 1.0) ** 0.55
        result = base.paint(result, (108, 48, 38), mouth * 0.96)
        roll = np.exp(-((v - 0.731) / 0.031) ** 2)
        result = base.paint(result, (254, 198, 144), roll * 0.52)
        return result, 0.68 - 0.08 * roll, np.zeros_like(u)

    # Body: keep clean sculpted ridge rhythm with silky coral-peach -> sunny peach-gold gradients
    phase = math.tau * (v * 25.0 - 0.13 * np.cos(angle * 3.0))
    plate = 0.5 + 0.5 * np.cos(phase)
    ridge = plate ** 8
    underside = (0.5 + 0.5 * np.cos(phase - 0.70)) ** 10 * (1.0 - ridge)
    column = (0.5 + 0.5 * np.cos(angle * 6.0)) ** 10
    belly = (0.5 + 0.5 * np.cos(angle)) ** 2

    result = base.tint((226, 118, 88), (255, 204, 146), 0.24 + 0.68 * belly)
    result = base.paint(result, (184, 86, 68), underside * (0.34 + 0.12 * (1.0 - belly)))
    result = base.paint(result, (255, 216, 148), 0.72 * ridge + 0.38 * column)
    result = base.paint(result, (255, 232, 172), 0.36 * ridge * column)
    return result, 0.72 - 0.08 * ridge, np.zeros_like(u)


def eye_paint(u, v):
    u = u % 1.0
    a = math.tau * u
    r = math.pi * v
    iris = np.clip((0.718 - r) / 0.028, 0.0, 1.0)
    t = np.clip((r - 0.44) / 0.26, 0.0, 1.0)

    # Clean warm-ivory sclera (no muddy brown outer vignette)
    result = base.tint((255, 252, 244), (236, 230, 234), np.clip((r - 0.72) * 0.35, 0.0, 0.08))
    # Smooth luminous honey-gold / amber iris (no noisy sin(87*a) radial fibers)
    honey_w = np.clip(0.32 + 0.52 * np.sin(t * math.pi) - 0.36 * np.sin(a), 0.0, 1.0)
    pigment = base.tint((152, 74, 24), (250, 180, 56), honey_w)
    result = result + (pigment - result) * iris[..., None]
    # Soft warm limbal ring
    result = base.paint(result, (64, 34, 22), np.exp(-((r - 0.685) / 0.026) ** 2) * 0.72)
    # Clean espresso-black pupil (r < 0.47 leaves wider glowing iris)
    pupil = np.clip((0.470 - r) / 0.020, 0.0, 1.0)
    result = base.paint(result, (24, 15, 14), pupil)
    # Larger crisp twin Nintendo catchlights
    x, y = np.sin(r) * np.cos(a), np.sin(r) * np.sin(a)
    light = np.exp(-(((x + 0.165) / 0.105) ** 2 + ((y - 0.225) / 0.095) ** 2))
    low = np.exp(-(((x - 0.155) / 0.052) ** 2 + ((y + 0.195) / 0.052) ** 2))
    result = base.paint(result, (255, 254, 250), np.clip((light - 0.18) * 1.45, 0.0, 0.96) + 0.78 * low)
    return result, 0.14 + 0.44 * np.clip(r - 0.95, 0.0, 1.0), np.zeros_like(u)


def linen(name, u, v):
    # Clean creamy vanilla-linen with gentle broad folds (zero high-freq sin(224*u) weave static)
    fold = 0.5 + 0.5 * np.sin(math.tau * (u * 2.0 + v * 0.65))
    color = base.tint((226, 198, 158), (252, 236, 206), 0.65 + 0.35 * fold)
    if name == "strap":
        edge = np.abs(v - 0.5)
        seam = base.interrupted_stitch(u * 68, edge - 0.335, 0.018)
        hem = np.exp(-((edge - 0.440) / 0.046) ** 2)
    else:
        x, y = np.minimum(u, 1.0 - u), np.minimum(v, 1.0 - v)
        margin = 0.062 if name == "pocket" else 0.037
        hem = np.maximum(np.exp(-((x - 0.019) / 0.022) ** 2), np.exp(-((y - 0.019) / 0.021) ** 2))
        seam = np.maximum(
            base.interrupted_stitch(u * 24, y - margin, 0.009),
            base.interrupted_stitch(v * 30, x - margin, 0.012),
        )
        if name == "pocket":
            opening = np.exp(-((v - 0.040) / 0.021) ** 2) * (np.clip(np.sin(math.pi * u), 0.0, 1.0) ** 0.55)
            color = base.paint(color, (255, 240, 212), 0.22)
            color = base.paint(color, (142, 92, 60), opening * 0.56)
            hem *= 0.85
    color = base.paint(color, (178, 126, 86), 0.38 * hem)
    color = base.paint(color, (174, 122, 78), 0.62 * seam)
    return color, 0.80 - 0.06 * seam, np.zeros_like(u)


def badge_paint(u, v):
    r = np.sqrt((u - 0.5) ** 2 + (v - 0.5) ** 2)
    frame = np.exp(-((r - 0.426) / 0.012) ** 2)
    result = base.tint((236, 180, 96), (255, 224, 156), 0.58 + 0.25 * (v - 0.5))
    result = base.paint(result, (158, 96, 44), frame * 0.78)
    x, y = u - 0.474, v - 0.483
    bowl = (y < 0.06) & (y > -0.123) & (np.abs(x) < (0.143 - 0.055 * np.clip((0.055 - y) / 0.19, 0, 1)))
    bowl &= ((x / 0.139) ** 2 + ((y - 0.032) / 0.162) ** 2) < 1.06
    rim = ((x / 0.145) ** 2 + ((y - 0.054) / 0.021) ** 2) < 1
    handle_r = np.sqrt(((x - 0.139) / 0.067) ** 2 + ((y - 0.020) / 0.076) ** 2)
    handle = (handle_r < 1) & (handle_r > 0.66) & (x > 0.114)
    saucer = (x / 0.179) ** 2 + ((y + 0.169) / 0.020) ** 2 < 1
    steam = np.zeros_like(bowl)
    for shift, height in ((-0.055, 0.129), (0.0, 0.176), (0.056, 0.134)):
        wave = np.sin((y - 0.114) / height * math.tau + 0.18) * 0.016 + shift
        steam |= (np.abs(x - wave) < 0.012) & (y > 0.107) & (y < 0.112 + height)
    result = base.paint(result, (106, 52, 28), (bowl | handle | saucer | steam) * 0.95)
    result = base.paint(result, (106, 52, 28), rim * 0.90)
    result = base.paint(result, (252, 224, 168), (((x / 0.111) ** 2 + ((y - 0.058) / 0.010) ** 2) < 1) * 0.88)
    return result, np.full_like(u, 0.45), np.full_like(u, 0.15)


def other_paint(name, tile, u, v):
    empty = np.zeros_like(u)
    if name == "orbit":
        face = 0.5 + 0.5 * np.sin(math.tau * u)
        color = base.tint((230, 134, 96), (255, 198, 150), 0.52 + 0.18 * face)
        inner_edge = np.exp(-((v - 0.763) / 0.022) ** 2)
        color = base.paint(color, (138, 68, 52), inner_edge * 0.36)
        return color, 0.66 - 0.06 * inner_edge, empty
    if name == "crest":
        rays = (0.5 + 0.5 * np.cos(math.tau * (u * 9.5 - 0.5 - 0.08 * v))) ** 5
        result = base.tint((220, 114, 90), (255, 178, 132), 0.45 + 0.42 * v)
        result = base.paint(result, (255, 208, 148), np.clip(v, 0.0, 1.0) ** 2 * 0.62)
        result = base.paint(result, (255, 226, 166), 0.46 * rays)
        return result, 0.66, empty
    if name == "fin":
        rays = (0.5 + 0.5 * np.cos(math.tau * (u * 10.5 + 0.05))) ** 9
        result = base.tint((232, 146, 102), (255, 228, 194), 0.38 + 0.58 * v)
        result = base.paint(result, (255, 204, 138), (0.38 + 0.25 * v) * rays)
        result = base.paint(result, (255, 236, 208), 0.36 * np.clip(v, 0.0, 1.0) ** 4)
        return result, 0.64, empty
    if name == "gold":
        result = base.tint((216, 154, 72), (252, 214, 126), 0.65 + 0.22 * np.sin(math.tau * (u + v)))
        return result, np.full_like(u, 0.38), np.full_like(u, 0.22)
    raise KeyError(name)


if __name__ == "__main__":
    base.eye_axes = eye_axes
    base.eye_point = eye_point
    base.socket_point = socket_point
    base.upper_orbit_point = upper_orbit_point
    base.pocket_point = pocket_point
    base.painted_skin = painted_skin
    base.eye_paint = eye_paint
    base.linen = linen
    base.badge_paint = badge_paint
    base.other_paint = other_paint
    base.main()
