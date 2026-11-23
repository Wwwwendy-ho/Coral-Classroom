"""Export a café seahorse polish candidate using the original sculpt and atlas layout."""

import importlib.util
import math
from pathlib import Path

import numpy as np
from mathutils import Quaternion


GENERATOR = Path(__file__).resolve().parents[4] / 'tools/art/build_cafe_seahorse.py'
spec = importlib.util.spec_from_file_location('cafe_seahorse', GENERATOR)
base = importlib.util.module_from_spec(spec)
spec.loader.exec_module(base)
original_eye_axes = base.eye_axes
original_other_paint = base.other_paint


def eye_axes(side):
    center, horizontal, vertical, normal = original_eye_axes(side)
    return center - normal * .021, horizontal, vertical, normal


def eye_point(side, u, v):
    center, horizontal, vertical, normal = eye_axes(side)
    phi, theta = math.pi * v, math.tau * u
    tangent = math.cos(theta) * horizontal + math.sin(theta) * vertical
    direction = .174 * (math.sin(phi) * tangent + math.cos(phi) * normal)
    return center + Quaternion(base.Z, math.radians(9 - side * 33)) @ direction


def socket_point(side, u, v):
    center, horizontal, vertical, normal = eye_axes(side)
    a = math.tau * u
    x, y = math.cos(a), math.sin(a)
    bridge = max(0, -side * x)
    cheek = max(0, -y)
    inner_x = .152
    inner_y = .145 + .006 * max(0, y)
    depth = math.sqrt(.174 ** 2 - (inner_x * x) ** 2 - (inner_y * y) ** 2)
    width, height, inset = base.curve([
        (inner_x, inner_y, depth + .004),
        (inner_x + .012, inner_y + .012, depth - .002),
        (inner_x + .034 - .012 * bridge, inner_y + .038, depth - .020 - .009 * cheek),
        (.223 - .035 * bridge, .210 - .016 * cheek, -.023 - .013 * cheek),
        (.247 - .055 * bridge, .222 - .016 * cheek, -.101 - .013 * cheek),
    ], v * 4)
    return center + horizontal * (width * x) + vertical * (height * y) + normal * inset


def upper_orbit_point(side, u, v):
    # Carry the original upper-orbit surface into the skull, under the tapered rim.
    point = socket_point(side, base.lerp(.018, .482, u), base.lerp(.40, 1, v))
    return point - eye_axes(side)[3] * (.012 + .021 * v)


def pocket_point(u, v):
    # Expose the opening just below the waist strap.
    corner = abs(2 * u - 1) ** 5
    at_u = base.lerp(.17, .83, u) + .060 * (1 - 2 * u) * v ** 4
    at_v = base.lerp(.605, .931, v) - .071 * v ** 5 * corner
    across = math.sin(math.pi * u)
    puff = .006 + .019 * across * math.sin(math.pi * v)
    lip = .009 * across * math.exp(-((v - .038) / .070) ** 2)
    return base.apron_point(at_u, at_v, puff + lip)


def painted_skin(tile, u, v, head=False):
    angle = math.tau * u
    if head:
        upper = .5 + .5 * np.cos(angle)
        muzzle = np.clip((v - .35) / .27, 0, 1)
        cheek = np.sin(angle) ** 2 * np.exp(-((v - .31) / .15) ** 2)
        pigment = .5 + .5 * np.sin(angle * 2 + 4 * v)
        result = base.tint((205, 112, 83), (246, 169, 118), .31 + .38 * upper + .18 * muzzle)
        result = base.paint(result, (222, 117, 87), cheek * (.23 + .08 * pigment))
        result = base.paint(result, (243, 183, 137), (.5 - .5 * np.cos(angle)) * (.25 + .29 * muzzle))
        freckles = base.pores(u, v, tile, 707, 310, .0066)
        result = base.paint(result, (175, 77, 53), freckles * (.58 - .34 * muzzle))
        mouth = np.clip((v - .805) / .146, 0, 1) ** .55
        result = base.paint(result, (85, 39, 31), mouth * .97)
        roll = np.exp(-((v - .731) / .031) ** 2)
        result = base.paint(result, (251, 193, 142), roll * .42)
        return result, .59 - .10 * roll, np.zeros_like(u)

    phase = math.tau * (v * 25 - .13 * np.cos(angle * 3))
    plate = .5 + .5 * np.cos(phase)
    ridge = plate ** 8
    underside = (.5 + .5 * np.cos(phase - .70)) ** 13 * (1 - ridge)
    column = (.5 + .5 * np.cos(angle * 6)) ** 12
    belly = (.5 + .5 * np.cos(angle)) ** 2
    pigment = .5 + .5 * np.cos(angle * 2 - 17 * v) * np.sin(29 * v)
    result = base.tint((207, 101, 81), (237, 163, 111), .19 + .66 * belly + .12 * pigment)
    result = base.paint(result, (169, 70, 57), underside * (.31 + .14 * (1 - belly)))
    result = base.paint(result, (253, 192, 125), .68 * ridge + .37 * column)
    result = base.paint(result, (255, 211, 144), .33 * ridge * column)
    freckles = base.pores(u, v, tile, 38, 670, .0036)
    result = base.paint(result, (163, 68, 53), freckles * .31 * (1 - .56 * ridge))
    return result, .62 - .14 * ridge, np.zeros_like(u)


def linen(name, u, v):
    # Use the existing UV seams for the visible stitching and pocket opening.
    fold = .075 * np.sin(math.tau * (u * 2.3 + v * .73))
    weave = .011 * (np.sin(128 * math.tau * u) + np.sin(113 * math.tau * v))
    color = base.tint((196, 155, 115), (246, 225, 191), .74 + fold + weave)
    if name == 'strap':
        edge = np.abs(v - .5)
        seam = base.interrupted_stitch(u * 71, edge - .335, .018)
        hem = np.exp(-((edge - .440) / .046) ** 2)
    else:
        x, y = np.minimum(u, 1 - u), np.minimum(v, 1 - v)
        margin = .062 if name == 'pocket' else .037
        hem = np.maximum(np.exp(-((x - .019) / .022) ** 2), np.exp(-((y - .019) / .021) ** 2))
        seam = np.maximum(base.interrupted_stitch(u * 24, y - margin, .009),
                          base.interrupted_stitch(v * 30, x - margin, .012))
        if name == 'pocket':
            opening = np.exp(-((v - .040) / .021) ** 2) * np.sin(math.pi * u) ** .55
            color = base.paint(color, (251, 231, 197), .24)
            color = base.paint(color, (139, 93, 62), opening * .59)
            hem *= .87
    color = base.paint(color, (164, 114, 76), .44 * hem)
    color = base.paint(color, (167, 118, 73), .65 * seam)
    return color, .83 - .12 * seam, np.zeros_like(u)


def other_paint(name, tile, u, v):
    if name != 'orbit':
        return original_other_paint(name, tile, u, v)
    face = .5 + .5 * np.sin(math.tau * u)
    color = base.tint((217, 120, 88), (243, 166, 115), .57 + .134 * face)
    freckles = base.pores(u, v, tile, 24, 150, .0035)
    color = base.paint(color, (167, 72, 48), freckles * .38)
    inner_edge = np.exp(-((v - .763) / .020) ** 2)
    color = base.paint(color, (126, 64, 48), inner_edge * .35)
    return color, .60 - .12 * inner_edge, np.zeros_like(u)


if __name__ == '__main__':
    base.eye_axes = eye_axes
    base.eye_point = eye_point
    base.socket_point = socket_point
    base.upper_orbit_point = upper_orbit_point
    base.pocket_point = pocket_point
    base.painted_skin = painted_skin
    base.linen = linen
    base.other_paint = other_paint
    base.main()
