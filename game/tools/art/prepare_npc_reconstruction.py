"""Prepare an actual TRELLIS-style reconstruction for the mobile NPC renderer.

Example:
 blender -b --factory-startup --python tools/art/prepare_npc_reconstruction.py -- \
   --source /path/source.glb --output /path/npc.glb --name Jisu \
   --forward=-Y --triangles 7500 --texture-size 1024

Forward is the source's visible face direction in Blender coordinates after GLB
import. Output glTF faces +Z; feet rest on y=0 and horizontal bounds are centered.
Asset policy: board defaults to 7,500 triangles and 1024 color; embedded can
request 512 color; close conversations can request up to 24,000 triangles and
2048 color. Surface maps remain at most 512. The caller selects the tier and
budgets explicitly so changing a close asset never changes the board asset.
Inspect the report and model visually before using it. No procedural substitute or
semantic mask is generated. An authored UV-aligned skin mask can be supplied with
--skin-mask; it is copied alongside the GLB and described in the report.
"""
import argparse
import json
import math
import shutil
import struct
import sys
import tempfile
from pathlib import Path

import bpy
import bmesh
from mathutils import Matrix

parser = argparse.ArgumentParser()
parser.add_argument('--source', required=True, type=Path)
parser.add_argument('--output', required=True, type=Path)
parser.add_argument('--name', required=True)
parser.add_argument('--forward', choices=['-Y', '+Y', '-X', '+X'], default='-Y')
parser.add_argument('--triangles', type=int, default=7500)
parser.add_argument('--texture-size', type=int, choices=[512, 1024, 2048], default=1024)
parser.add_argument('--jpeg-quality', type=int, default=90)
parser.add_argument('--tier', choices=['board', 'embedded', 'close'], default='board')
parser.add_argument('--height', type=float, default=1.6)
parser.add_argument('--roughness-floor', type=float, default=None, help='Floor packed glTF roughness (green), 0–1')
parser.add_argument('--metallic-scale', type=float, default=None, help='Scale packed glTF metallic (blue), 0–1')
parser.add_argument('--skin-mask', type=Path)
parser.add_argument('--allow-over-budget', action='store_true', help='Export and report a mesh whose topology cannot meet the target')
parser.add_argument('--blend-output', type=Path)
args = parser.parse_args(sys.argv[sys.argv.index('--') + 1:] if '--' in sys.argv else [])
if not 5000 <= args.triangles <= 24000:
    parser.error('--triangles must be between 5000 and 24000')
if not 1 <= args.jpeg_quality <= 100:
    parser.error('--jpeg-quality must be between 1 and 100')
if any(v is not None and not 0 <= v <= 1 for v in [args.roughness_floor, args.metallic_scale]):
    parser.error('roughness floor and metallic scale must be between 0 and 1')
if args.height <= 0:
    parser.error('--height must be positive')
if not args.source.is_file():
    parser.error('source GLB does not exist')
if args.skin_mask and (not args.skin_mask.is_file() or args.skin_mask.suffix.lower() != '.png'):
    parser.error('skin mask must be an existing PNG file')
if args.skin_mask:
    probe = bpy.data.images.load(str(args.skin_mask.resolve()), check_existing=False)
    if tuple(probe.size) != (args.texture_size, args.texture_size):
        parser.error('skin mask must match requested square texture size')
    bpy.data.images.remove(probe)
args.output.parent.mkdir(parents=True, exist_ok=True)

bpy.ops.object.select_all(action='SELECT')
bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath=str(args.source.resolve()))
meshes = [o for o in bpy.context.scene.objects if o.type == 'MESH']
if not meshes:
    raise RuntimeError('No mesh in source GLB')
# Real reconstructions can have separate material surfaces. Do not silently bake
# them together or throw away details; the report records material/draw counts.
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
if len(meshes) > 1:
    bpy.ops.object.join()
body = bpy.context.object
body.name = args.name + ' surface'
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)
# Preserve split vertices: welding reconstruction seams can join unrelated
# surfaces and catastrophically collapse features on some TRELLIS meshes.
body.data.validate(verbose=False, clean_customdata=True)
body.data.update()
angle = {'-Y': 0, '+X': -math.pi / 2, '+Y': math.pi, '-X': math.pi / 2}[args.forward]
rotation = Matrix.Rotation(angle, 4, 'Z')
for v in body.data.vertices:
    v.co = rotation @ v.co
mins = [min(v.co[i] for v in body.data.vertices) for i in range(3)]
maxs = [max(v.co[i] for v in body.data.vertices) for i in range(3)]
height = maxs[2] - mins[2]
if height < 1e-8:
    raise RuntimeError('Source has zero height')
scale = args.height / height
for v in body.data.vertices:
    v.co.x = (v.co.x - (mins[0] + maxs[0]) / 2) * scale
    v.co.y = (v.co.y - (mins[1] + maxs[1]) / 2) * scale
    v.co.z = (v.co.z - mins[2]) * scale
triangles = sum(len(p.vertices) - 2 for p in body.data.polygons)
if triangles > args.triangles:
    modifier = body.modifiers.new('Mobile silhouette budget', 'DECIMATE')
    modifier.ratio = args.triangles / triangles
    modifier.use_collapse_triangulate = True
    bpy.context.view_layer.objects.active = body
    bpy.ops.object.modifier_apply(modifier=modifier.name)
body.data.validate(verbose=False, clean_customdata=True)
body.data.update()
# Decimation is approximate for non-manifold reconstructions: measure the
# resulting mesh and repeat until the actual exported triangle budget is met.
for attempt in range(8):
    actual = sum(len(p.vertices) - 2 for p in body.data.polygons)
    print('NPC_DECIMATION', attempt, actual, flush=True)
    if actual <= args.triangles or args.allow_over_budget: break
    correction = body.modifiers.new('Triangle budget correction', 'DECIMATE')
    correction.ratio = min(.95, args.triangles / actual * .75)
    correction.use_collapse_triangulate = True
    bpy.ops.object.modifier_apply(modifier=correction.name)
    body.data.validate(verbose=False, clean_customdata=True)
    body.data.update()
else:
    if not args.allow_over_budget and sum(len(p.vertices)-2 for p in body.data.polygons) > args.triangles:
        raise RuntimeError('Could not meet triangle budget on this mesh')
for polygon in body.data.polygons:
    polygon.use_smooth = True

# Classify image usage by the Principled sockets reached through the node graph.
# Alpha-linked images stay PNG; color images use JPEG, and other data maps use
# compact lossless PNG. Shared images take the most conservative role.
image_usage = {}
def reachable_sockets(node):
    found, visited, todo = set(), set(), [node]
    while todo:
        current = todo.pop()
        if current in visited: continue
        visited.add(current)
        for output in current.outputs:
            for link in output.links:
                if link.to_node.type == 'BSDF_PRINCIPLED': found.add(link.to_socket.name)
                else: todo.append(link.to_node)
    return found
for mat in body.data.materials:
    if not mat or not mat.use_nodes: continue
    for node in mat.node_tree.nodes:
        if node.type != 'TEX_IMAGE' or not node.image: continue
        usage = image_usage.setdefault(node.image.as_pointer(), set())
        usage.update(reachable_sockets(node))
image_copies, image_details = {}, []
tmp = tempfile.TemporaryDirectory(prefix='npc-textures-')
bpy.context.scene.render.image_settings.quality = args.jpeg_quality
for mat in body.data.materials:
    if not mat or not mat.use_nodes: continue
    for node in mat.node_tree.nodes:
        if node.type != 'TEX_IMAGE' or not node.image: continue
        image = node.image
        key = image.as_pointer()
        if key not in image_copies:
            usage = image_usage[key]
            color = bool(usage.intersection({'Base Color', 'Emission Color', 'Emission'}))
            alpha = 'Alpha' in usage
            # Unknown paths are kept lossless at full size rather than guessing.
            unknown = not usage
            limit = args.texture_size if color or alpha or unknown else min(512, args.texture_size)
            clone = image.copy()
            w, h = image.size
            if not w or not h: raise RuntimeError('Source contains an empty texture')
            ratio = min(1.0, limit / max(w, h))
            clone.scale(max(1, round(w * ratio)), max(1, round(h * ratio)))
            calibrated = False
            if args.roughness_floor is not None or args.metallic_scale is not None:
                # glTF stores roughness in green and metallic in blue in the
                # shared, non-color metallicRoughness map. Refuse ambiguous
                # graphs rather than altering base color or unrelated data.
                if {'Metallic', 'Roughness'}.issubset(usage) and not color:
                    from array import array
                    pixels = array('f', [0]) * (len(clone.pixels))
                    clone.pixels.foreach_get(pixels)
                    for pixel in range(0, len(pixels), 4):
                        if args.roughness_floor is not None: pixels[pixel+1] = max(args.roughness_floor, pixels[pixel+1])
                        if args.metallic_scale is not None: pixels[pixel+2] *= args.metallic_scale
                    clone.pixels.foreach_set(pixels)
                    clone.update()
                    calibrated = True
            jpeg = color and not alpha and not unknown
            path = Path(tmp.name) / ('texture-%d.%s' % (len(image_copies), 'jpg' if jpeg else 'png'))
            if jpeg:
                # Image.save ignores scene JPEG quality in some Blender builds.
                # Encode the lossless pixel copy explicitly at the requested quality.
                from PIL import Image
                lossless = Path(tmp.name) / ('color-%d.png' % len(image_copies))
                clone.file_format = 'PNG'
                clone.filepath_raw = str(lossless)
                clone.save()
                with Image.open(lossless) as color_image:
                    color_image.convert('RGB').save(path, format='JPEG', quality=args.jpeg_quality)
            else:
                clone.file_format = 'PNG'
                clone.filepath_raw = str(path)
                clone.save()
            replacement = bpy.data.images.load(str(path), check_existing=False)
            replacement.colorspace_settings.name = image.colorspace_settings.name
            image_copies[key] = replacement
            image_details.append({'source': image.name, 'role': sorted(usage),
                'source_dimensions': [w, h], 'dimensions': list(replacement.size), 'bytes': path.stat().st_size,
                'format': 'JPEG' if jpeg else 'PNG', 'alpha_preserved': alpha, 'surface_calibrated': calibrated})
        node.image = image_copies[key]

if (args.roughness_floor is not None or args.metallic_scale is not None) and not any(i['surface_calibrated'] for i in image_details):
    raise RuntimeError('No unambiguous packed metallic/roughness map found for calibration')

# Two gentle bones make a subtle, inexpensive breathing/acknowledgement motion.
# This intentionally avoids inventing limbs or stretching reconstructed eyes.
arm = bpy.data.armatures.new(args.name + ' armature')
rig = bpy.data.objects.new(args.name + 'Rig', arm)
bpy.context.collection.objects.link(rig)
bpy.ops.object.select_all(action='DESELECT')
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
root = arm.edit_bones.new('Root')
root.head = (0, 0, .03 * args.height)
root.tail = (0, 0, .3 * args.height)
upper = arm.edit_bones.new('Upper')
upper.head = (0, 0, .38 * args.height)
upper.tail = (0, 0, .7 * args.height)
upper.parent = root
bpy.ops.object.mode_set(mode='OBJECT')
groups = {name: body.vertex_groups.new(name=name) for name in ('Root', 'Upper')}
for vertex in body.data.vertices:
    t = max(0.0, min(1.0, (vertex.co.z / args.height - .25) / .45))
    t = t * t * (3 - 2 * t)
    if t < 1: groups['Root'].add([vertex.index], 1-t, 'REPLACE')
    if t > 0: groups['Upper'].add([vertex.index], t, 'REPLACE')
modifier = body.modifiers.new('NPC skeletal motion', 'ARMATURE')
modifier.object = rig
body.parent = rig
rig.animation_data_create()
for clip, end, keys in [
    ('Idle', 73, [(1, 0, 0), (19, .018, .012), (37, 0, 0), (55, -.018, -.012), (73, 0, 0)]),
    ('React', 49, [(1, 0, 0), (13, -.035, .035), (28, .025, -.025), (49, 0, 0)]),
]:
    rig.animation_data.action = None
    bone = rig.pose.bones['Upper']
    bone.rotation_mode = 'XYZ'
    for frame, pitch, lean in keys:
        bone.rotation_euler = (pitch, 0, lean)
        bone.keyframe_insert('rotation_euler', frame=frame, group='Upper')
    action = rig.animation_data.action
    action.name = clip
    for curve in action.fcurves:
        for key in curve.keyframe_points: key.interpolation = 'BEZIER'
    track = rig.animation_data.nla_tracks.new()
    track.name = clip
    track.strips.new(clip, 1, action)
    track.mute = True
    rig.animation_data.action = None
rig.animation_data.action = bpy.data.actions['Idle']
bpy.context.scene.frame_set(1)
bpy.context.scene.render.fps = 24
bpy.ops.object.select_all(action='DESELECT')
body.select_set(True)
rig.select_set(True)
bpy.context.view_layer.objects.active = rig
bpy.ops.export_scene.gltf(filepath=str(args.output.resolve()), export_format='GLB',
    use_selection=True, export_materials='EXPORT', export_animations=True,
    export_animation_mode='NLA_TRACKS', export_skins=True, export_apply=False,
    export_extras=True)
if args.blend_output:
    for image in image_copies.values(): image.pack()
    args.blend_output.parent.mkdir(parents=True, exist_ok=True)
    bpy.ops.wm.save_as_mainfile(filepath=str(args.blend_output.resolve()))
with args.output.open('rb') as f:
    f.read(12)
    length, kind = struct.unpack('<I4s', f.read(8))
    if kind != b'JSON': raise RuntimeError('Invalid GLB JSON chunk')
    doc = json.loads(f.read(length))
    binary_length, binary_kind = struct.unpack('<I4s', f.read(8))
    if binary_kind != b'BIN\x00': raise RuntimeError('Invalid GLB binary chunk')
    binary = f.read(binary_length)
exported_images = []
for i, item in enumerate(doc.get('images', [])):
    view = doc['bufferViews'][item['bufferView']]
    data = binary[view.get('byteOffset', 0):view.get('byteOffset', 0) + view['byteLength']]
    suffix = '.jpg' if item.get('mimeType') == 'image/jpeg' else '.png'
    path = Path(tmp.name) / ('exported-%d%s' % (i, suffix))
    path.write_bytes(data)
    probe = bpy.data.images.load(str(path), check_existing=False)
    exported_images.append({'name': item.get('name'), 'dimensions': list(probe.size),
                            'bytes': len(data), 'mime_type': item.get('mimeType')})
    bpy.data.images.remove(probe)
primitives = [p for mesh in doc.get('meshes', []) for p in mesh['primitives']]
count = sum(doc['accessors'][p['indices']]['count'] // 3 for p in primitives)
mask_info = None
if args.skin_mask:
    mask = bpy.data.images.load(str(args.skin_mask.resolve()), check_existing=False)
    mask_path = args.output.with_name(args.output.stem + '-skin-mask.png')
    if args.skin_mask.resolve() != mask_path.resolve(): shutil.copyfile(args.skin_mask, mask_path)
    mask_info = {'file': mask_path.name, 'dimensions': list(mask.size),
                 'uv_set': 'TEXCOORD_0', 'three_texture_flip_y': False,
                 'white': 'skin', 'black': 'apron, eyes and other non-skin',
                 'semantic_review_required': True}
report = {'name': args.name, 'source': str(args.source), 'tier': args.tier,
          'target_triangles': args.triangles, 'texture_limit': args.texture_size,
          'jpeg_quality': args.jpeg_quality, 'triangles': count,
          'primitive_count': len(primitives), 'materials': len(doc.get('materials', [])),
          'textures': image_details, 'embedded_images': exported_images,
          'clips': [a.get('name') for a in doc.get('animations', [])],
          'bones': len(arm.bones), 'forward': '+Z glTF', 'ground': 'y=0 glTF',
          'skin_mask': mask_info, 'surface_calibration': {'roughness_floor': args.roughness_floor, 'metallic_scale': args.metallic_scale}, 'bytes': args.output.stat().st_size,
          'review': 'Inspect geometry, UV seams, orientation, animation and skin mask visually.'}
report_path = args.output.with_name(args.output.stem + '-report.json')
report_path.write_text(json.dumps(report, indent=2) + '\n')
print('NPC_ASSET_REPORT', json.dumps(report), flush=True)
tmp.cleanup()
