"""Normalize and inspect a reconstruction in a separate review directory.

blender -b --factory-startup -t 8 --python inspect_mesh.py -- \
  --source source.glb --output-dir review --views front,quarter,game,side,back

Coordinates are Blender X right, -Y forward, Z up and 1.6 tall by default.
The review cameras and the normalized mesh use the same coordinates as the
staging script so anatomical landmarks can be picked against either output.
"""

import argparse
import json
import math
import sys
from pathlib import Path

import bmesh
import bpy
from mathutils import Matrix, Vector


VIEWS = {
    "front": (0, 7), "quarter": (42, 15), "game": (34, 39),
    "side": (90, 7), "other-side": (-90, 7), "back": (180, 14),
    "top": (0, 90),
}


def bounds(vertices):
    positions = [v.co for v in vertices]
    return [Vector(axis) for axis in zip(*[(min(a), max(a)) for a in zip(*positions)])]


def load_mesh(path, yaw, height):
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(path.resolve()))
    meshes = [o for o in bpy.context.scene.objects if o.type == "MESH"]
    if not meshes:
        raise ValueError(f"No mesh in {path}")

    bpy.ops.object.select_all(action="DESELECT")
    for obj in meshes:
        obj.select_set(True)
    body = meshes[0]
    bpy.context.view_layer.objects.active = body
    if len(meshes) > 1:
        bpy.ops.object.join()
    matrix = Matrix.Rotation(math.radians(yaw), 4, "Z") @ body.matrix_world
    body.parent = None
    body.matrix_world = Matrix.Identity(4)
    body.data.transform(matrix)
    low, high = bounds(body.data.vertices)
    if high.z - low.z < 1e-8:
        raise ValueError("Mesh height is zero")
    scale = height / (high.z - low.z)
    for vertex in body.data.vertices:
        vertex.co = (vertex.co - Vector((0, 0, low.z))) * scale
    body.data.update()
    return body


def components(bm):
    seen = set()
    result = []
    for vertex in bm.verts:
        if vertex in seen:
            continue
        part = [vertex]
        seen.add(vertex)
        for current in part:
            for edge in current.link_edges:
                neighbor = edge.other_vert(current)
                if neighbor not in seen:
                    seen.add(neighbor)
                    part.append(neighbor)
        result.append(part)
    return sorted(result, key=len, reverse=True)


def component_details(mesh, weld):
    bm = bmesh.new()
    try:
        bm.from_mesh(mesh)
        if weld:
            bmesh.ops.remove_doubles(bm, verts=list(bm.verts), dist=weld)
        parts = []
        for part in components(bm):
            low, high = bounds(part)
            edges = {edge for vertex in part for edge in vertex.link_edges}
            faces = {face for vertex in part for face in vertex.link_faces}
            parts.append({
                "vertices": len(part),
                "triangles": sum(len(face.verts) - 2 for face in faces),
                "open_edges": sum(edge.is_boundary for edge in edges),
                "nonmanifold_edges": sum(not edge.is_manifold for edge in edges),
                "bounds": [list(low), list(high)],
            })
        return parts
    finally:
        bm.free()


def render_views(body, folder, views, size, samples, clay):
    scene = bpy.context.scene
    scene.render.engine = "CYCLES"
    scene.cycles.device = "CPU"
    scene.cycles.samples = samples
    scene.cycles.use_denoising = samples >= 8
    scene.render.resolution_x = scene.render.resolution_y = size
    scene.render.resolution_percentage = 100
    scene.render.image_settings.file_format = "PNG"
    scene.world.use_nodes = True
    background = scene.world.node_tree.nodes["Background"]
    background.inputs[0].default_value = (.36, .43, .45, 1)
    background.inputs[1].default_value = .63
    scene.view_settings.view_transform = "Standard"

    low, high = bounds(body.data.vertices)
    center = (low + high) / 2
    for name, offset, energy in (("Key", (-3, -4, 4), 550),
                                  ("Fill", (4, -3, 2), 320),
                                  ("Rim", (1, 4, 5), 410)):
        lamp = bpy.data.lights.new(name, "AREA")
        lamp.energy = energy
        lamp.size = 4
        obj = bpy.data.objects.new(name, lamp)
        scene.collection.objects.link(obj)
        obj.location = center + Vector(offset)
        obj.rotation_euler = (center - obj.location).to_track_quat("-Z", "Y").to_euler()

    camera = bpy.data.cameras.new("Review camera")
    cam = bpy.data.objects.new("Review camera", camera)
    scene.collection.objects.link(cam)
    scene.camera = cam
    camera.type = "ORTHO"
    if clay:
        material = bpy.data.materials.new("Review clay")
        material.use_nodes = True
        shader = material.node_tree.nodes["Principled BSDF"]
        shader.inputs["Base Color"].default_value = (.36, .42, .45, 1)
        shader.inputs["Roughness"].default_value = .65
        scene.view_layers[0].material_override = material

    report = {}
    for name in views:
        azimuth, elevation = (math.radians(a) for a in VIEWS[name])
        direction = Vector((math.sin(azimuth) * math.cos(elevation),
                            -math.cos(azimuth) * math.cos(elevation), math.sin(elevation)))
        cam.location = center + 6 * direction
        cam.rotation_euler = (-direction).to_track_quat("-Z", "Y").to_euler()
        bpy.context.view_layer.update()
        camera_inverse = cam.matrix_world.inverted()
        points = [camera_inverse @ v.co for v in body.data.vertices]
        camera.ortho_scale = 2.14 * max(max(abs(p.x), abs(p.y)) for p in points)
        scene.render.filepath = str(folder / f"{name}{'-clay' if clay else ''}.png")
        bpy.ops.render.render(write_still=True)
        report[name] = {"matrix_world": [list(row) for row in cam.matrix_world],
                        "ortho_scale": camera.ortho_scale, "pixels": size}
    return report


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--source", type=Path, required=True)
    parser.add_argument("--output-dir", type=Path, required=True)
    parser.add_argument("--yaw", type=float, default=0)
    parser.add_argument("--height", type=float, default=1.6)
    parser.add_argument("--views", default="front,quarter,game,side,back")
    parser.add_argument("--pixels", type=int, default=512)
    parser.add_argument("--samples", type=int, default=8)
    parser.add_argument("--weld", type=float, default=.000003)
    parser.add_argument("--clay", action="store_true")
    args = parser.parse_args(sys.argv[sys.argv.index("--") + 1:])
    views = [view for view in args.views.split(",") if view]
    if set(views) - VIEWS.keys():
        parser.error(f"Choose views from {', '.join(VIEWS)}")
    args.output_dir.mkdir(parents=True, exist_ok=True)
    body = load_mesh(args.source, args.yaw, args.height)
    parts = component_details(body.data, args.weld)
    report = {
        "source": str(args.source.resolve()), "height": args.height, "yaw": args.yaw,
        "analysis_weld_distance": args.weld, "blender": bpy.app.version_string,
        "bounds": [list(point) for point in bounds(body.data.vertices)],
        "components": parts, "materials": [mat.name for mat in body.data.materials],
        "images": {image.name: list(image.size) for image in bpy.data.images if image.has_data},
        "cameras": render_views(body, args.output_dir, views, args.pixels, args.samples, args.clay),
    }
    (args.output_dir / "mesh-report.json").write_text(json.dumps(report, indent=2) + "\n")


if __name__ == "__main__":
    main()
