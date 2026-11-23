#!/usr/bin/env python3
"""Audit a Shelly natural-mouth candidate against preserved pre-change GLBs.

Usage:
  python3 tools/check/shelly_mouth_asset_test.py \
    --before-dir /workspace/work/phase2-before-models \
    --after-dir /workspace/work/shelly-natural-mouth/final \
    --report /workspace/work/shelly-natural-mouth/mouth-asset-audit.json

This checks GLB payloads directly; it does not trust the candidate generator's
report. Geometry retention is compared by complete, per-triangle vertex records
(position, normal, UV, joints and weights), independently of vertex indexing.
"""
from __future__ import annotations

import argparse
import json
import math
import struct
from collections import Counter
from pathlib import Path

import numpy as np


COMPONENTS = {5120: ("i1", 1), 5121: ("u1", 1), 5122: ("i2", 2),
              5123: ("u2", 2), 5125: ("u4", 4), 5126: ("f4", 4)}
WIDTHS = {"SCALAR": 1, "VEC2": 2, "VEC3": 3, "VEC4": 4, "MAT2": 4,
          "MAT3": 9, "MAT4": 16}
GEOMETRY_ATTRS = ("POSITION", "NORMAL", "TEXCOORD_0", "JOINTS_0", "WEIGHTS_0")
EXPECTED_CLIPS = {"Idle", "Swim", "Turn", "Happy", "Curious", "Celebrate"}


def require(ok: bool, message: str) -> None:
    if not ok:
        raise AssertionError(message)


def read_glb(path: Path):
    data = path.read_bytes()
    require(len(data) >= 20, f"{path}: truncated GLB")
    magic, version, total = struct.unpack_from("<III", data)
    require(magic == 0x46546C67 and version == 2 and total == len(data),
            f"{path}: invalid GLB header")
    json_len, json_type = struct.unpack_from("<II", data, 12)
    require(json_type == 0x4E4F534A, f"{path}: JSON chunk missing")
    doc = json.loads(data[20:20 + json_len])
    off = 20 + json_len
    bin_len, bin_type = struct.unpack_from("<II", data, off)
    require(bin_type == 0x004E4942 and off + 8 + bin_len <= len(data),
            f"{path}: BIN chunk missing/truncated")
    blob = data[off + 8:off + 8 + bin_len]

    def accessor(index: int):
        a = doc["accessors"][index]
        require("bufferView" in a, f"{path}: sparse/no-buffer accessor {index} unsupported")
        v = doc["bufferViews"][a["bufferView"]]
        dtype, component_size = COMPONENTS[a["componentType"]]
        width = WIDTHS[a["type"]]
        stride = v.get("byteStride", component_size * width)
        start = v.get("byteOffset", 0) + a.get("byteOffset", 0)
        require(stride >= component_size * width, f"{path}: invalid stride accessor {index}")
        raw = np.ndarray((a["count"], width), dtype=np.dtype("<" + dtype), buffer=blob,
                         offset=start, strides=(stride, component_size))
        return a, np.array(raw, copy=True)

    return {"path": path, "bytes": data, "doc": doc, "blob": blob,
            "accessor": accessor}


def image_dimensions(model):
    doc, blob = model["doc"], model["blob"]
    result = []
    for image in doc.get("images", []):
        require("bufferView" in image, f"{model['path']}: external image")
        view = doc["bufferViews"][image["bufferView"]]
        payload = blob[view.get("byteOffset", 0):view.get("byteOffset", 0) + view["byteLength"]]
        mime = image.get("mimeType", "")
        if mime == "image/png" or payload.startswith(b"\x89PNG\r\n\x1a\n"):
            require(payload.startswith(b"\x89PNG\r\n\x1a\n"), "PNG signature invalid")
            width, height = struct.unpack_from(">II", payload, 16)
        elif mime == "image/jpeg" or payload.startswith(b"\xff\xd8"):
            width = height = None
            p = 2
            while p + 4 <= len(payload):
                if payload[p] != 0xFF:
                    p += 1
                    continue
                while p < len(payload) and payload[p] == 0xFF:
                    p += 1
                if p >= len(payload):
                    break
                marker = payload[p]
                p += 1
                if marker in (0xD8, 0xD9) or 0xD0 <= marker <= 0xD7:
                    continue
                if p + 2 > len(payload):
                    break
                seglen = struct.unpack_from(">H", payload, p)[0]
                if seglen < 2 or p + seglen > len(payload):
                    break
                if marker in (0xC0, 0xC1, 0xC2, 0xC3, 0xC5, 0xC6, 0xC7,
                              0xC9, 0xCA, 0xCB, 0xCD, 0xCE, 0xCF):
                    height, width = struct.unpack_from(">HH", payload, p + 3)
                    break
                p += seglen
            require(width and height, f"{model['path']}: cannot read JPEG dimensions")
        else:
            raise AssertionError(f"{model['path']}: unsupported image {mime}")
        result.append({"name": image.get("name", ""), "mime": mime,
                       "width": width, "height": height, "bytes": len(payload)})
    return result


def accessor_value_key(values):
    # Compare values, not accessor offsets or buffer packing.
    return values.tobytes(order="C")


def geometry_records(model):
    doc = model["doc"]
    require(len(doc.get("meshes", [])) == 1, f"{model['path']}: expected one mesh")
    primitives = doc["meshes"][0]["primitives"]
    require(len(primitives) == 1, f"{model['path']}: expected one primitive")
    primitive = primitives[0]
    arrays = {}
    for name in GEOMETRY_ATTRS:
        require(name in primitive["attributes"], f"{model['path']}: missing {name}")
        _, arrays[name] = model["accessor"](primitive["attributes"][name])
    _, indices = model["accessor"](primitive["indices"])
    indices = indices.reshape(-1)
    require(len(indices) % 3 == 0, f"{model['path']}: non-triangle primitive")
    require(all(np.isfinite(arrays[k]).all() for k in ("POSITION", "NORMAL", "TEXCOORD_0", "WEIGHTS_0")),
            f"{model['path']}: non-finite vertex attribute")
    weights = arrays["WEIGHTS_0"]
    require(np.all(np.abs(weights.sum(axis=1) - 1.0) < 0.002),
            f"{model['path']}: skin weights not normalized")
    require(int(indices.max()) < len(arrays["POSITION"]), f"{model['path']}: bad index")

    # Records include all authored attributes and ignore vertex numbering and
    # triangle order. Rounding is only used for float canonicalization after
    # comparing their representable float32 values.
    def vertex_record(index):
        return tuple(tuple(float(x) for x in arrays[name][index]) for name in GEOMETRY_ATTRS)

    records = Counter()
    tri_points = {}
    for ti, tri in enumerate(indices.reshape(-1, 3)):
        vertices = tuple(vertex_record(int(i)) for i in tri)
        record = tuple(sorted(vertices))
        records[record] += 1
        pts = np.array([arrays["POSITION"][int(i)] for i in tri], dtype=np.float64)
        tri_points[record] = pts
    return {"attrs": arrays, "indices": indices, "records": records,
            "tri_points": tri_points, "triangles": len(indices) // 3,
            "vertices": len(arrays["POSITION"]), "primitive": primitive}


def vector3_equal(a, b):
    return np.array_equal(np.asarray(a), np.asarray(b))


def audit_tier(name: str, before_path: Path, after_path: Path):
    before, after = read_glb(before_path), read_glb(after_path)
    bdoc, adoc = before["doc"], after["doc"]
    report = {"tier": name, "before": str(before_path), "after": str(after_path),
              "before_bytes": len(before["bytes"]), "after_bytes": len(after["bytes"])}
    require(report["after_bytes"] <= report["before_bytes"], f"{name}: GLB bytes increased")

    # Contract descriptors should not change. Node hierarchy includes named
    # eye, head, root and both attachment anchors; skin joints/inverse-bind
    # references and animation channel topology remain intact.
    for field in ("scene", "scenes", "nodes", "skins", "animations"):
        require(bdoc.get(field) == adoc.get(field), f"{name}: {field} descriptors changed")
    clips = {a["name"] for a in adoc.get("animations", [])}
    require(clips == EXPECTED_CLIPS, f"{name}: unexpected clips {sorted(clips)}")
    require(len(adoc.get("skins", [])) == 1, f"{name}: expected one skin")
    joint_count = len(adoc["skins"][0]["joints"])
    require(joint_count == 11, f"{name}: expected 11 joints, got {joint_count}")
    inverse_bind = adoc["skins"][0].get("inverseBindMatrices")
    require(inverse_bind is not None, f"{name}: inverse-bind matrices missing")
    b_ib_desc, b_ib = before["accessor"](inverse_bind)
    a_ib_desc, a_ib = after["accessor"](inverse_bind)
    require(b_ib_desc == a_ib_desc and accessor_value_key(b_ib) == accessor_value_key(a_ib),
            f"{name}: inverse-bind matrix payload changed")
    node_names = {n.get("name") for n in adoc["nodes"]}
    require({"HatAnchor", "MouthAnchor", "Head"} <= node_names,
            f"{name}: required rig anchors missing")

    # Animation sampler payloads are compared by accessor values, not just
    # matching descriptor JSON/accessor indices.
    animation_accessor_ids = set()
    for clip in adoc["animations"]:
        for sampler in clip["samplers"]:
            animation_accessor_ids.update((sampler["input"], sampler["output"]))
    for index in sorted(animation_accessor_ids):
        ba, bv = before["accessor"](index)
        aa, av = after["accessor"](index)
        require(ba == aa and accessor_value_key(bv) == accessor_value_key(av),
                f"{name}: animation accessor payload changed at {index}")
    report["clips"] = sorted(clips)
    report["bones"] = joint_count
    report["inverse_bind_matrices_identical"] = True
    report["animation_accessors_identical"] = len(animation_accessor_ids)

    require(len(bdoc.get("materials", [])) == len(adoc.get("materials", [])) == 1,
            f"{name}: material count changed")
    require(len(bdoc.get("meshes", [])) == len(adoc.get("meshes", [])) == 1 and
            len(bdoc["meshes"][0].get("primitives", [])) ==
            len(adoc["meshes"][0].get("primitives", [])) == 1,
            f"{name}: mesh/primitive count changed")
    require(len(bdoc.get("images", [])) == len(adoc.get("images", [])) == 2,
            f"{name}: expected two embedded images")
    bimages, aimages = image_dimensions(before), image_dimensions(after)
    require([(x["width"], x["height"], x["mime"]) for x in bimages] ==
            [(x["width"], x["height"], x["mime"]) for x in aimages],
            f"{name}: image dimensions/types changed")
    report["images"] = aimages

    bg, ag = geometry_records(before), geometry_records(after)
    require(ag["triangles"] <= bg["triangles"], f"{name}: triangles increased")
    report["before_triangles"] = bg["triangles"]
    report["after_triangles"] = ag["triangles"]
    report["before_vertices"] = bg["vertices"]
    report["after_vertices"] = ag["vertices"]

    # Ensure every unmatched whole-triangle record belongs to the compact
    # mouth patch near MouthAnchor; every common record is fully preserved.
    before_records, after_records = bg["records"], ag["records"]
    common = before_records & after_records
    removed = before_records - after_records
    added = after_records - before_records
    require(sum(common.values()) + sum(removed.values()) == bg["triangles"],
            f"{name}: internal before triangle accounting error")
    require(sum(common.values()) + sum(added.values()) == ag["triangles"],
            f"{name}: internal after triangle accounting error")
    # In this skinned mesh the joint anchor is expressed in the rig hierarchy,
    # while the accessor positions are mesh-local bind-pose coordinates. The
    # mouth patch is centered near the lower front of the face in those coords.
    # The conservative sphere covers both tiers and is fixed independently of
    # the observed changed-triangle set.
    mouth_patch_center = np.array([0.0, 1.0, 0.73], dtype=np.float64)
    mouth_patch_radius = 0.34
    unmatched = []
    for records, sign in ((removed, "removed"), (added, "added")):
        for record, count in records.items():
            pts = bg["tri_points"].get(record) if sign == "removed" else ag["tri_points"].get(record)
            centroid = np.asarray(pts, dtype=np.float64).mean(axis=0)
            distance = float(np.linalg.norm(centroid - mouth_patch_center))
            unmatched.append((sign, distance, count, centroid.tolist()))
    max_distance = max((x[1] for x in unmatched), default=0.0)
    # Every unmatched triangle is contained in a small, face-local region;
    # every common triangle record retains all five attributes exactly.
    require(max_distance <= mouth_patch_radius,
            f"{name}: unmatched triangle outside mouth patch (max patch distance {max_distance:.4f})")
    report["retained_triangles_identical"] = sum(common.values())
    report["removed_triangles"] = sum(removed.values())
    report["added_triangles"] = sum(added.values())
    report["mouth_patch_center_mesh_local"] = mouth_patch_center.tolist()
    report["mouth_patch_radius_mesh_local"] = mouth_patch_radius
    report["unmatched_triangle_max_distance_from_patch_center"] = round(max_distance, 6)
    report["unmatched_triangle_examples"] = [
        {"kind": kind, "distance": round(distance, 6), "count": count,
         "centroid": [round(v, 6) for v in centroid]}
        for kind, distance, count, centroid in unmatched[:5]
    ]
    report["geometry_retention_pass"] = True
    report["pass"] = True
    return report


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--before-dir", type=Path, required=True)
    parser.add_argument("--after-dir", type=Path, required=True)
    parser.add_argument("--report", type=Path, required=True)
    args = parser.parse_args()
    results = []
    for stem in ("shelly", "shelly-view"):
        result = audit_tier(stem, args.before_dir / f"{stem}.glb",
                            args.after_dir / f"{stem}.glb")
        results.append(result)
    report = {"audit": "Shelly natural mouth candidate GLB before/after",
              "pass": True, "tiers": results}
    args.report.parent.mkdir(parents=True, exist_ok=True)
    args.report.write_text(json.dumps(report, indent=2) + "\n")
    print(json.dumps(report, indent=2))


if __name__ == "__main__":
    main()
