"""Stage 4A: Clean, orient (-Y forward, Z=0 ground), smooth, decimate Close LOD, Smart UV into [0.02, 0.77], export .blend + .npz."""
import math
import sys
from pathlib import Path
import bmesh
import bpy
import numpy as np
from mathutils import Matrix, Vector

HERE = Path(__file__).resolve().parent

SPECS = {
    "echo": {"rot_z_deg": 112.0, "sym_z_frac": 0.60, "target_h": 1.65, "close_tris": 14000},
    "taxi-squid": {"rot_z_deg": 2.6, "sym_z_frac": 0.58, "target_h": 1.60, "close_tris": 15500},
    "bok": {"rot_z_deg": -10.0, "sym_z_frac": 0.55, "target_h": 1.75, "close_tris": 15500},
    "hana": {"rot_z_deg": 0.0, "sym_z_frac": 0.74, "target_h": 1.85, "close_tris": 16500},
    "captain-bay": {"rot_z_deg": 0.7, "sym_z_frac": 0.65, "target_h": 1.85, "close_tris": 15500},
}


def clear_scene():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    for col in (bpy.data.meshes, bpy.data.materials, bpy.data.images, bpy.data.armatures, bpy.data.actions):
        for it in list(col):
            if it.users == 0:
                col.remove(it)


def keep_significant_components(obj, min_frac=0.005):
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bm.verts.ensure_lookup_table()
    bm.faces.ensure_lookup_table()
    total = len(bm.faces)
    visited = set()
    comps = []
    for f in bm.faces:
        if f.index in visited:
            continue
        stack = [f]
        comp = []
        visited.add(f.index)
        while stack:
            cur = stack.pop()
            comp.append(cur)
            for e in cur.edges:
                for nf in e.link_faces:
                    if nf.index not in visited:
                        visited.add(nf.index)
                        stack.append(nf)
        comps.append(comp)
    drop_faces = [f for comp in comps if len(comp) < total * min_frac for f in comp]
    if drop_faces:
        bmesh.ops.delete(bm, geom=drop_faces, context="FACES")
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(obj.data)
    bm.free()
    obj.data.update()


def prepare_one(slug):
    spec = SPECS[slug]
    d = HERE / slug
    raw_glb = d / "raw-shape.glb"
    clear_scene()
    bpy.ops.import_scene.gltf(filepath=str(raw_glb))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    bpy.context.view_layer.update()

    # Join if multiple and bake world matrix
    bpy.ops.object.select_all(action="DESELECT")
    for m in meshes:
        m.select_set(True)
    bpy.context.view_layer.objects.active = meshes[0]
    if len(meshes) > 1:
        bpy.ops.object.join()
    obj = bpy.context.view_layer.objects.active
    obj.name = f"{slug}_body"
    mw = obj.matrix_world.copy()
    obj.parent = None
    obj.matrix_world = Matrix.Identity(4)
    obj.data.transform(mw)
    obj.data.materials.clear()
    obj.data.update()

    # Remove tiny noise islands and smooth voxel stepping before decimation
    keep_significant_components(obj, min_frac=0.005)
    rz = Matrix.Rotation(math.radians(spec["rot_z_deg"]), 4, "Z")
    obj.data.transform(rz)
    obj.data.update()

    # Scale to canonical target height, center X by upper symmetric core, Y by bbox, Z_min = 0
    co = np.array([v.co[:] for v in obj.data.vertices], dtype=np.float32)
    z0, z1 = float(co[:, 2].min()), float(co[:, 2].max())
    scale = spec["target_h"] / max(1e-4, z1 - z0)
    co *= scale
    z0_s, z1_s = float(co[:, 2].min()), float(co[:, 2].max())
    sym_mask = co[:, 2] >= (z0_s + (z1_s - z0_s) * spec["sym_z_frac"])
    cx = float(0.5 * (np.percentile(co[sym_mask, 0], 10) + np.percentile(co[sym_mask, 0], 90)))
    cy = float(0.5 * (co[:, 1].min() + co[:, 1].max()))
    shift = Vector((-cx, -cy, -z0_s))
    obj.data.transform(Matrix.Translation(shift) @ Matrix.Scale(scale, 4))
    obj.data.update()

    # Apply gentle smooth at high res to eliminate marching-cubes terracing
    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.context.view_layer.objects.active = obj
    sm = obj.modifiers.new("Smooth", "SMOOTH")
    sm.factor = 0.35
    sm.iterations = 3
    bpy.ops.object.modifier_apply(modifier=sm.name)

    # Collapse decimate cleanly to Close LOD target triangle count
    cur_tris = len(obj.data.polygons)
    if cur_tris > spec["close_tris"]:
        dec = obj.modifiers.new("Decimate", "DECIMATE")
        dec.decimate_type = "COLLAPSE"
        dec.ratio = max(0.01, min(1.0, spec["close_tris"] / float(cur_tris)))
        dec.use_collapse_triangulate = True
        bpy.ops.object.modifier_apply(modifier=dec.name)

    # Ensure strictly triangulated & consistent normals & shade smooth
    bm = bmesh.new()
    bm.from_mesh(obj.data)
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.triangulate(bm, faces=bm.faces[:])
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces[:])
    bm.to_mesh(obj.data)
    bm.free()
    for p in obj.data.polygons:
        p.use_smooth = True
    obj.data.update()

    # Smart UV Project cleanly into [0.02, 0.77] x [0.02, 0.98]
    if not obj.data.uv_layers:
        obj.data.uv_layers.new(name="UVMap")
    bpy.ops.object.mode_set(mode="EDIT")
    bpy.ops.mesh.select_all(action="SELECT")
    bpy.ops.uv.smart_project(angle_limit=math.radians(62.0), island_margin=0.018, correct_aspect=True)
    bpy.ops.object.mode_set(mode="OBJECT")

    uv_layer = obj.data.uv_layers.active.data
    uvs = np.array([l.uv[:] for l in uv_layer], dtype=np.float32)
    u_min, u_max = float(uvs[:, 0].min()), float(uvs[:, 0].max())
    v_min, v_max = float(uvs[:, 1].min()), float(uvs[:, 1].max())
    u_span = max(1e-5, u_max - u_min)
    v_span = max(1e-5, v_max - v_min)
    uvs[:, 0] = 0.02 + ((uvs[:, 0] - u_min) / u_span) * 0.75
    uvs[:, 1] = 0.02 + ((uvs[:, 1] - v_min) / v_span) * 0.96
    for idx, l in enumerate(uv_layer):
        l.uv = (float(uvs[idx, 0]), float(uvs[idx, 1]))
    obj.data.update()

    # Save .blend and exact numpy geometry (.npz) in Blender Z-up (-Y forward) coordinates
    verts = np.array([v.co[:] for v in obj.data.vertices], dtype=np.float32)
    vnormals = np.array([v.normal[:] for v in obj.data.vertices], dtype=np.float32)
    faces = np.array([[p.vertices[0], p.vertices[1], p.vertices[2]] for p in obj.data.polygons], dtype=np.int32)
    loop_uvs = np.array([[uv_layer[li].uv[:] for li in p.loop_indices] for p in obj.data.polygons], dtype=np.float32)

    bpy.ops.wm.save_as_mainfile(filepath=str(d / "_prep_close.blend"))
    np.savez_compressed(d / "_prep_close.npz", verts=verts, vnormals=vnormals, faces=faces, loop_uvs=loop_uvs)
    mn = verts.min(axis=0).round(3).tolist()
    mx = verts.max(axis=0).round(3).tolist()
    print(f"[{slug}] prepped -> verts={len(verts):,} tris={len(faces):,} bounds={mn}..{mx}", flush=True)


def main():
    slugs = sys.argv[sys.argv.index("--") + 1 :] if "--" in sys.argv else list(SPECS.keys())
    for s in slugs:
        prepare_one(s)


if __name__ == "__main__":
    main()
