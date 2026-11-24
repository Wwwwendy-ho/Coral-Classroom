"""Inspect exact normalized vertex coordinates & UV color mapping on shelly-trellis-raw.glb."""
import json
import sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Matrix, Vector

REPO = Path(r"C:\Users\20750\.gemini\antigravity\scratch\Coral-Classroom")
SRC = REPO / "work" / "shelly-reference-rebuild" / "stage-organic-v1" / "shelly-trellis-raw.glb"
OUT = REPO / "work" / "shelly-reference-rebuild" / "stage-organic-v2" / "polished" / "landmarks.json"


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(SRC))
    objs = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    obj = objs[0]
    bpy.context.view_layer.objects.active = obj
    obj.parent = None
    mat = obj.matrix_world.copy()
    obj.matrix_world = Matrix.Identity(4)
    obj.data.transform(mat)

    verts = np.array([v.co[:] for v in obj.data.vertices])
    vmin = verts.min(axis=0)
    vmax = verts.max(axis=0)
    scale = 1.6 / (vmax[2] - vmin[2])
    for v in obj.data.vertices:
        v.co = (v.co - Vector((0, 0, vmin[2]))) * scale
    obj.data.update()

    verts = np.array([v.co[:] for v in obj.data.vertices])
    vmin = verts.min(axis=0)
    vmax = verts.max(axis=0)

    def stats(mask, label):
        pts = verts[mask]
        if len(pts) == 0:
            return {"count": 0}
        return {
            "count": int(len(pts)),
            "min": [round(float(x), 4) for x in pts.min(axis=0)],
            "max": [round(float(x), 4) for x in pts.max(axis=0)],
            "mean": [round(float(x), 4) for x in pts.mean(axis=0)],
        }

    # Probe slices along Y (front = -Y, back = +Y) and Z (height 0..1.6)
    info = {
        "total_verts": int(len(verts)),
        "total_tris": int(sum(len(p.vertices) - 2 for p in obj.data.polygons)),
        "bounds_min": [round(float(x), 4) for x in vmin],
        "bounds_max": [round(float(x), 4) for x in vmax],
        "head_top_z_gt_1_0": stats(verts[:, 2] > 1.0, "head_top"),
        "head_front_y_lt_neg0_95_z_gt_0_8": stats((verts[:, 1] < -0.95) & (verts[:, 2] > 0.8), "snout"),
        "front_left_flipper_x_lt_neg0_65_y_lt_0": stats((verts[:, 0] < -0.65) & (verts[:, 1] < 0.0), "fl_flipper"),
        "front_right_flipper_x_gt_0_65_y_lt_0": stats((verts[:, 0] > 0.65) & (verts[:, 1] < 0.0), "fr_flipper"),
        "rear_left_flipper_x_lt_neg0_45_y_gt_0_8": stats((verts[:, 0] < -0.45) & (verts[:, 1] > 0.8), "rl_flipper"),
        "rear_right_flipper_x_gt_0_45_y_gt_0_8": stats((verts[:, 0] > 0.45) & (verts[:, 1] > 0.8), "rr_flipper"),
        "carapace_z_gt_0_45_y_gt_neg0_65": stats((verts[:, 2] > 0.45) & (verts[:, 1] > -0.65), "carapace"),
        "images_loaded": {im.name: list(im.size) for im in bpy.data.images},
    }

    # Check head centerline offset across Z slices (1.0..1.55) and Y slices (-1.5..-0.7)
    slices = []
    for y0 in np.linspace(-1.55, -0.75, 9):
        m = (verts[:, 1] >= y0 - 0.05) & (verts[:, 1] <= y0 + 0.05) & (verts[:, 2] > 0.82)
        if np.any(m):
            pts = verts[m]
            slices.append({
                "y": round(float(y0), 2),
                "x_min": round(float(pts[:, 0].min()), 4),
                "x_max": round(float(pts[:, 0].max()), 4),
                "x_mid": round(float((pts[:, 0].min() + pts[:, 0].max()) / 2), 4),
                "z_min": round(float(pts[:, 2].min()), 4),
                "z_max": round(float(pts[:, 2].max()), 4),
            })
    info["head_y_slices"] = slices

    # Check dark eye pixel clusters in 3D via UV sampling on Image_0
    uv_layer = obj.data.uv_layers.active.data
    img0 = next((im for im in bpy.data.images if im.size[0] == 2048 and len(im.pixels) > 0), None)
    if img0:
        w, h = img0.size
        px = np.array(img0.pixels[:], dtype=np.float32).reshape(h, w, 4)[..., :3]
        dark_eye_pts = []
        rose_eye_pts = []
        lavender_pts = []
        cream_pts = []
        for poly in obj.data.polygons:
            if poly.center.z > 0.85 and poly.center.y < -0.7:
                loop_idx = poly.loop_indices[0]
                u, v = uv_layer[loop_idx].uv
                ix = int(np.clip(u % 1.0, 0, 0.9999) * w)
                iy = int(np.clip(v % 1.0, 0, 0.9999) * h)
                r, g, b = px[iy, ix]
                if r < 0.16 and g < 0.16 and b < 0.22:
                    dark_eye_pts.append(poly.center[:])
                elif r > b * 0.9 and r > g * 1.15 and r > 0.25 and g < 0.45:
                    rose_eye_pts.append(poly.center[:])
            if poly.center.z > 0.40 and poly.center.y > -0.60:
                loop_idx = poly.loop_indices[0]
                u, v = uv_layer[loop_idx].uv
                ix = int(np.clip(u % 1.0, 0, 0.9999) * w)
                iy = int(np.clip(v % 1.0, 0, 0.9999) * h)
                r, g, b = px[iy, ix]
                if b > g * 1.12 and b > 0.35:
                    lavender_pts.append(poly.center[:])
        for name, pts_list in (("dark_pupil", dark_eye_pts), ("rose_iris", rose_eye_pts)):
            if pts_list:
                arr = np.array(pts_list)
                left = arr[arr[:, 0] < 0]
                right = arr[arr[:, 0] > 0]
                info[name + "_L"] = [round(float(x), 4) for x in left.mean(axis=0)] if len(left) else None
                info[name + "_R"] = [round(float(x), 4) for x in right.mean(axis=0)] if len(right) else None
                info[name + "_L_bounds"] = ([round(float(x), 4) for x in left.min(axis=0)], [round(float(x), 4) for x in left.max(axis=0)]) if len(left) else None
                info[name + "_R_bounds"] = ([round(float(x), 4) for x in right.min(axis=0)], [round(float(x), 4) for x in right.max(axis=0)]) if len(right) else None
        if lavender_pts:
            arr = np.array(lavender_pts)
            info["lavender_shell_bounds"] = ([round(float(x), 4) for x in arr.min(axis=0)], [round(float(x), 4) for x in arr.max(axis=0)])

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(info, indent=2) + "\n")
    print(f"Wrote landmarks to {OUT}")


if __name__ == "__main__":
    main()
