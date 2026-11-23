"""Rebuild the accepted pearl Shelly's mouth and stage both GLBs for review.

Run with Python (NumPy, SciPy, Pillow) and Blender 4.3 on PATH:

    python tools/art/refine_shelly_mouth.py --output-dir /tmp/shelly-mouth

Blender triangulates the repaired skin with the existing boundary as constraints.
The packed GLBs reuse every animation, joint, anchor, and unaffected mesh vertex
from the corresponding accepted export. Only the local cut, fill, and atlas bake
are authored here. The output directory must be separate from the source assets.
"""
import argparse
from collections import defaultdict
from copy import deepcopy
from io import BytesIO
import json
from pathlib import Path
import shutil
import struct
import subprocess
import sys
from tempfile import TemporaryDirectory

ROOT = Path(__file__).resolve().parents[2]


def triangulate_in_blender(source, output):
    from mathutils import Vector
    from mathutils.geometry import delaunay_2d_cdt

    request = json.loads(source.read_text())
    points = [Vector(point) for point in request['points']]
    loop = list(range(request['boundary_count']))
    verts, _, faces, ids, _, _ = delaunay_2d_cdt(
        points, request['seam_edges'], [loop], 1, 1e-7
    )
    if any(len(orig) != 1 for orig in ids):
        raise RuntimeError('The replacement seam intersected the cut boundary')
    output.write_text(json.dumps([[ids[index][0] for index in face] for face in faces]))


if '--' in sys.argv and sys.argv[sys.argv.index('--') + 1] == 'triangulate':
    triangulate_in_blender(*map(Path, sys.argv[-2:]))
    raise SystemExit(0)

import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from PIL.JpegImagePlugin import get_sampling
from scipy import ndimage
from scipy.interpolate import RBFInterpolator
from scipy.sparse import coo_matrix
from scipy.sparse.csgraph import connected_components


class Model:
    def __init__(self, path):
        content = path.read_bytes()
        tag, version, size, json_length, kind = struct.unpack_from('<4sIII4s', content)
        if (tag, version, size, kind) != (b'glTF', 2, len(content), b'JSON'):
            raise ValueError(f'Unexpected GLB header in {path}')
        self.doc = json.loads(content[20:20 + json_length])
        self.binary = content[28 + json_length:]
        self.primitive = self.doc['meshes'][0]['primitives'][0]
        self.attributes = self.primitive['attributes']

    def view(self, index):
        view = self.doc['bufferViews'][index]
        offset = view.get('byteOffset', 0)
        return self.binary[offset:offset + view['byteLength']]

    def array(self, index):
        accessor = self.doc['accessors'][index]
        dtype = {5121: 'u1', 5123: '<u2', 5125: '<u4', 5126: '<f4'}[accessor['componentType']]
        return np.frombuffer(self.view(accessor['bufferView']), dtype=dtype).reshape(accessor['count'], -1)

    def image(self, index):
        return Image.open(BytesIO(self.view(self.doc['images'][index]['bufferView'])))

    def write(self, path, arrays, images):
        doc = deepcopy(self.doc)
        replacements = {doc['images'][idx]['bufferView']: data for idx, data in images.items()}
        for idx, array in arrays.items():
            source = self.array(idx)
            accessor = doc['accessors'][idx]
            accessor['count'] = len(array)
            if 'min' in accessor:
                accessor['min'] = array.min(axis=0).tolist()
                accessor['max'] = array.max(axis=0).tolist()
            replacements[accessor['bufferView']] = array.astype(source.dtype).tobytes()
        binary = bytearray()
        for index, view in enumerate(doc['bufferViews']):
            data = replacements.get(index, self.view(index))
            view['byteOffset'] = len(binary)
            view['byteLength'] = len(data)
            binary.extend(data)
            binary.extend(b'\0' * (-len(binary) % 4))
        doc['buffers'][0]['byteLength'] = len(binary)
        metadata = json.dumps(doc, separators=(',', ':')).encode()
        metadata += b' ' * (-len(metadata) % 4)
        with path.open('wb') as file:
            file.write(struct.pack('<4sIII4s', b'glTF', 2, 28 + len(metadata) + len(binary), len(metadata), b'JSON'))
            file.write(metadata)
            file.write(struct.pack('<I4s', len(binary), b'BIN\0'))
            file.write(binary)


# The original tilted pose needs a local frame to follow the muzzle and both
# mouth corners. a runs across the beak. b increases toward the nose.
ANGLE = .25
ORIGIN = np.array([-.015, 1.065])
ROTATION = np.array([[np.cos(ANGLE), -np.sin(ANGLE)], [np.sin(ANGLE), np.cos(ANGLE)]])


def beak_plane(world):
    return (world[:, [0, 2]] - ORIGIN) @ ROTATION


def world_coordinates(plane, depth):
    x, z = (plane @ ROTATION.T + ORIGIN).T
    return np.stack((x, depth, z), axis=1)


def from_gltf(array):
    return array[:, [0, 2, 1]] * [1, -1, 1]


def to_gltf(array):
    return array[:, [0, 2, 1]] * [1, 1, -1]


def face_edges(faces):
    return np.sort(np.concatenate((faces[:, [0, 1]], faces[:, [1, 2]], faces[:, [0, 2]])), axis=1)


def polygon_area(loop):
    a, b = loop.T
    return .5 * np.sum(a * np.roll(b, -1) - b * np.roll(a, -1))


def cut_mouth(world, normals, atlas_faces):
    points, weld = np.unique(world, axis=0, return_inverse=True)
    faces = weld[atlas_faces]
    a, b = beak_plane(points).T
    depth = points[:, 1]
    inside = (((a + .002) / .25)**2 + ((b + .072) / .133)**2 <= 1) & (depth < -.47)
    # Include the old upturned corners below the lower eyelids.
    corners = ((abs(a) - .169) / .058)**2 + ((b - .025) / .030)**2 <= 1
    inside |= corners & (depth < -.673)
    edges, count = np.unique(face_edges(faces), axis=0, return_counts=True)
    local = edges[inside[edges].any(axis=1)]
    graph = coo_matrix((np.ones(len(local)), local.T), shape=(len(points), len(points))).tocsr()
    _, components = connected_components(graph, directed=False)
    anchor = np.argmin(np.linalg.norm(points - [0, -.60, 1.0], axis=1) + 2 * ~inside)
    cut = inside[faces].any(axis=1) & (components[faces[:, 0]] == components[anchor])
    local_edges, local_count = np.unique(face_edges(faces[cut]), axis=0, return_counts=True)
    local_border = local_edges[local_count == 1]
    keys = edges @ [len(points), 1]
    # Old reconstruction holes wholly inside the cut have no outside neighbor.
    trim = local_border[count[np.searchsorted(keys, local_border @ [len(points), 1])] == 2]
    neighbors = defaultdict(list)
    for first, second in trim:
        neighbors[first].append(second)
        neighbors[second].append(first)
    if not neighbors or any(len(values) != 2 for values in neighbors.values()):
        raise RuntimeError('Expected a single continuous skin ring around the mouth')
    loops = []
    while neighbors:
        ring = [min(neighbors)]
        next_vertex = neighbors[ring[0]][0]
        while next_vertex != ring[0] and len(ring) <= len(neighbors):
            ring.append(next_vertex)
            next_vertex = next(vertex for vertex in neighbors[ring[-1]] if vertex != ring[-2])
        if next_vertex != ring[0]:
            raise RuntimeError('Mouth cut did not form a closed loop')
        for vertex in ring:
            del neighbors[vertex]
        ring = np.asarray(ring)
        loops.append(ring if polygon_area(beak_plane(points[ring])) > 0 else ring[::-1])
    # TRELLIS generated a thin closed shell. The front and lining have
    # separate trim loops, distinguished by the normal on their retained skin.
    rim_normals = np.zeros_like(points)
    rim_normals[weld[atlas_faces[~cut]]] = normals[atlas_faces[~cut]]
    loops.sort(key=lambda rim: np.mean(rim_normals[rim, 1]))
    if len(loops) != 2 or np.mean(rim_normals[loops[0], 1]) > -.5 or np.mean(rim_normals[loops[1], 1]) < .5:
        raise RuntimeError('Expected one outward skin loop and one inward lining loop')
    return cut, loops, points, weld


def smooth(distance):
    t = np.clip(distance, 0, 1)
    return t * t * (3 - 2 * t)


def seam(a):
    # A very shallow downward hook at the tip with relaxed, tapering corners.
    relative = (a + .008) / .162
    curve = -.018 + .005 * np.minimum(relative**2, 1) - .008 * relative
    taper = smooth((1 - abs(relative)) / .23)
    return curve, taper


def point_in_polygon(points, ring):
    x, y = points.T
    inside = np.zeros(len(points), dtype=bool)
    for (ax, ay), (bx, by) in zip(ring, np.roll(ring, -1, axis=0)):
        if ay != by:
            inside ^= ((ay > y) != (by > y)) & (x < ax + (y - ay) * (bx - ax) / (by - ay))
    return inside


def distance_to_ring(points, ring):
    edge = np.roll(ring, -1, axis=0) - ring
    offset = points[:, None] - ring
    fraction = np.clip(np.sum(offset * edge, axis=2) / np.sum(edge**2, axis=1), 0, 1)
    return np.linalg.norm(offset - edge * fraction[..., None], axis=2).min(axis=1)


def triangulate(blender, ring, lod, lining=False):
    step = (.062 if lod else .055) if lining else (.041 if lod else .023)
    along = np.linspace(-.170, .155, 17 if lod else 23)
    height, _ = seam(along)
    offsets = [-.012, -.005, 0, .005, .012]
    groove = np.empty((0, 2)) if lining else np.concatenate([np.stack((along, height + delta), axis=1) for delta in offsets])
    groove = groove[point_in_polygon(groove, ring) & (distance_to_ring(groove, ring) > .007)]
    edges = []
    for row in offsets:
        selected = np.flatnonzero(np.isclose(groove[:, 1] - seam(groove[:, 0])[0], row))
        edges += [(len(ring) + first, len(ring) + second) for first, second in zip(selected, selected[1:])]
    aa, bb = np.meshgrid(np.arange(-.28, .28, step), np.arange(-.23, .10, step))
    grid = np.stack((aa.ravel(), bb.ravel()), axis=1)
    grid = grid[
        point_in_polygon(grid, ring) & (distance_to_ring(grid, ring) > step * .35)
    ]
    if not lining:
        grid = grid[np.linalg.norm(grid[:, None] - groove, axis=2).min(axis=1) > step * .53]
    coords = np.concatenate((ring, groove, grid))
    with TemporaryDirectory() as temp:
        request = Path(temp) / 'points.json'
        result = Path(temp) / 'triangles.json'
        request.write_text(json.dumps({
            'points': coords.tolist(), 'boundary_count': len(ring), 'seam_edges': np.asarray(edges, dtype=int).tolist()
        }))
        command = [blender, '-b', '--factory-startup', '-t', '1', '--python-exit-code', '1',
                   '--python', str(Path(__file__).resolve()), '--', 'triangulate', str(request), str(result)]
        subprocess.run(command, check=True, capture_output=True, text=True)
        triangles = np.asarray(json.loads(result.read_text()))
    tri = coords[triangles]
    area = (tri[:, 1, 0] - tri[:, 0, 0]) * (tri[:, 2, 1] - tri[:, 0, 1]) - (tri[:, 1, 1] - tri[:, 0, 1]) * (tri[:, 2, 0] - tri[:, 0, 0])
    triangles[area < 0] = triangles[area < 0][:, [0, 2, 1]]
    return coords, triangles


def fit_surface(ring_world):
    ring = beak_plane(ring_world)

    def muzzle(points):
        a, b = points.T
        distal = smooth((-.160 - b) / .083)
        center = -.764 - .035 * np.exp(-((b - .038) / .083)**2) + .032 * distal
        cheek = -.704 - .033 * np.exp(-((b + .080) / .087)**2) - .011 * a / .25 + .024 * distal
        nose = np.exp(-((a - .004) / .132)**2)
        return cheek * (1 - nose) + center * nose

    # Train only the residual at the original skin ring. The cheek and
    # chin retain their border geometry, while noisy reconstruction details
    # on the border cannot impose a depression across the rebuilt beak.
    correction = RBFInterpolator(ring, ring_world[:, 1] - muzzle(ring),
                                 smoothing=.00038, kernel='thin_plate_spline')

    def surface(points):
        a, b = points.T
        height, taper = seam(a)
        v = b - height
        relief = taper * (.0049 * np.exp(-(v / .0062)**2) +
                          .0025 * np.exp(-((v + .012) / .012)**2))
        ramp = np.exp(-(distance_to_ring(points, ring) / .041)**2)
        return muzzle(points) + correction(points) * ramp + relief

    return surface


# A former mouth-interior chart. The outer skin uses its original UVs.
ATLAS_SLOT = {'shelly': (916, 130, 102, 61), 'shelly-view': (460, 68, 50, 25)}


def bake_uv(plane, ring, size, slot):
    left, top, width, height = np.asarray(slot) / size
    padding = 3.5 / size
    minimum, maximum = ring.min(axis=0), ring.max(axis=0)
    src = (plane - minimum) / (maximum - minimum)
    scale = np.array([width, height]) - 2 * padding
    return np.array([left + padding, top + padding]) + src * [1, -1] * scale + [0, scale[1]]


def project_atlas(world, faces, uv, image, bounds, dimensions):
    left, bottom, right, top = bounds
    width, height = dimensions
    plane = beak_plane(world)
    px = (plane[:, 0] - left) / (right - left) * width
    py = (top - plane[:, 1]) / (top - bottom) * height
    screen = np.stack((px, py), axis=1)[faces]
    depth = np.full((height, width), np.inf)
    mapped = np.zeros((height, width, 2))
    candidate = (world[faces, 1].min(axis=1) < -.58)
    candidate &= ((screen.max(axis=1) > 0) & (screen.min(axis=1) < [width, height])).all(axis=1)
    for triangle in np.flatnonzero(candidate):
        x, y = screen[triangle].T
        low_x, high_x = max(0, int(x.min())), min(width, int(x.max()) + 1)
        low_y, high_y = max(0, int(y.min())), min(height, int(y.max()) + 1)
        xx, yy = np.meshgrid(np.arange(low_x, high_x) + .5, np.arange(low_y, high_y) + .5)
        det = (y[1] - y[2]) * (x[0] - x[2]) + (x[2] - x[1]) * (y[0] - y[2])
        if abs(det) < 1e-7:
            continue
        a = ((y[1] - y[2]) * (xx - x[2]) + (x[2] - x[1]) * (yy - y[2])) / det
        b = ((y[2] - y[0]) * (xx - x[2]) + (x[0] - x[2]) * (yy - y[2])) / det
        bary = np.stack((a, b, 1 - a - b), axis=-1)
        z = bary @ world[faces[triangle], 1]
        cells = np.s_[low_y:high_y, low_x:high_x]
        mask = (bary.min(axis=-1) >= -1e-6) & (z < depth[cells])
        depth[cells][mask] = z[mask]
        mapped[cells][mask] = bary[mask] @ uv[faces[triangle]]
    pixels = np.asarray(image.convert('RGB'), dtype=np.float32)
    coordinates = [mapped[..., 1] * image.height - .5, mapped[..., 0] * image.width - .5]
    color = np.stack([ndimage.map_coordinates(channel, coordinates, order=1, mode='nearest')
                      for channel in np.moveaxis(pixels, -1, 0)], axis=-1)
    return color, np.isfinite(depth)


def fill_pigment(color, affected, iterations=145):
    indices = ndimage.distance_transform_edt(affected, return_distances=False, return_indices=True)
    filled = color[tuple(indices)].copy()
    for _ in range(iterations):
        filled[affected] = ndimage.gaussian_filter(filled, (1.8, 1.8, 0))[affected]
    return filled


def protect_atlas(slot, size, outer_uv, atlas_size):
    # Include a margin around retained triangles for filtering across old UV seams.
    mask = Image.new('L', (atlas_size, atlas_size))
    draw = ImageDraw.Draw(mask)
    for polygon in outer_uv * atlas_size:
        draw.polygon(tuple(map(tuple, polygon)), fill=255)
    ratio = atlas_size / size
    x, y, w, h = slot
    box = (round(x * ratio), round(y * ratio), round((x + w) * ratio), round((y + h) * ratio))
    if mask.filter(ImageFilter.MaxFilter(3)).crop(box).getbbox():
        raise RuntimeError(f'The replacement UV island overlaps original atlas pixels at {atlas_size}px')
    return box


def rebake(model, world, faces, uv, cut, ring, slot):
    original = model.image(0)
    surface = model.image(1)
    images = {}
    width, height = 450, 310
    minimum, maximum = ring.min(axis=0), ring.max(axis=0)
    halo = np.array([.045, .040])
    bounds = tuple(minimum - halo) + tuple(maximum + halo)
    color, visible = project_atlas(world, faces, uv, original, bounds, (width, height))
    red = (color[..., 1] < .75 * color[..., 0]) & (color[..., 2] < .76 * color[..., 0])
    # Include the baked red rim in the fill, while retaining the cream and
    # cheek pigment outside the old mouth. Nostril pigment sits above this mask.
    bb = np.linspace(bounds[3], bounds[1], height)
    red &= bb[:, None] < .028
    aa = np.linspace(bounds[0], bounds[2], width)
    old_corners = ((abs(aa)[None, :] - .166) / .043)**2 + ((bb[:, None] - .025) / .027)**2 < 1
    mouth = ndimage.binary_dilation(red, iterations=9) | old_corners
    pigment = fill_pigment(color, mouth | ~visible)
    for index, image in enumerate([original, surface]):
        left, top, right, bottom = protect_atlas(slot, original.width, uv[faces[~cut]], image.width)
        rows, cols = np.mgrid[top:bottom, left:right]
        # Supersample the color crease to keep it legible in the 1K mobile map.
        stamps = []
        for subpixel in (.125, .375, .625, .875):
            xy = np.stack((cols + .5, rows + subpixel), axis=-1) / image.width
            x, y, sw, sh = np.asarray(slot) / original.width
            pad = 3.5 / original.width
            normal = (xy - [x + pad, y + sh - pad]) / [sw - 2 * pad, -sh + 2 * pad]
            a, b = np.moveaxis(minimum + normal * (maximum - minimum), -1, 0)
            coordinates = [(bounds[3] - b) / (bounds[3] - bounds[1]) * height - .5,
                           (a - bounds[0]) / (bounds[2] - bounds[0]) * width - .5]
            if index == 0:
                now = np.stack([ndimage.map_coordinates(ch, coordinates, order=1, mode='nearest')
                                for ch in np.moveaxis(pigment, -1, 0)], axis=-1)
                h, taper = seam(a)
                shade = np.exp(-((b - h) / .0035)**2) * taper * .53
                now = now * (1 - shade[..., None]) + np.array([119, 88, 65]) * shade[..., None]
            else:
                now = np.broadcast_to([0, 229, 1], a.shape + (3,))
            stamps.append(now)
        stamp = Image.fromarray(np.uint8(np.clip(np.mean(stamps, axis=0).round(), 0, 255)))
        changed = image.convert('RGB')
        changed.paste(stamp, (left, top))
        output = BytesIO()
        if index == 0:
            changed.save(output, 'JPEG', qtables=image.quantization, subsampling=get_sampling(image), optimize=True)
        else:
            changed.save(output, 'PNG', optimize=True)
        images[index] = output.getvalue()
    return images


def normalize(values):
    return values / np.linalg.norm(values, axis=1, keepdims=True)


def weights(model, world, border_source, border_count):
    joint_names = [model.doc['nodes'][idx]['name'] for idx in model.doc['skins'][0]['joints']]
    head = np.maximum(smooth((world[:, 2] - .87) / .23), smooth((world[:, 2] - .77) / .20))
    neck = smooth((world[:, 2] - .60) / .34) * (1 - head)
    all_weights = np.zeros((len(world), len(joint_names)))
    for name, weight in [('Head', head), ('Neck', neck), ('Body', 1 - head - neck)]:
        all_weights[:, joint_names.index(name)] = weight
    for name, x, z in [('EyeL', -.328, 1.193), ('EyeR', .269, 1.297)]:
        radius = np.hypot((world[:, 0] - x) / .20, (world[:, 2] - z) / .17)
        squint = (1 - smooth((radius - .45) / .90)) * .96
        all_weights *= (1 - squint[:, None])
        all_weights[:, joint_names.index(name)] = squint
    joints = np.argsort(-all_weights, axis=1)[:, :4]
    skin = np.take_along_axis(all_weights, joints, axis=1)
    skin /= skin.sum(axis=1, keepdims=True)
    joints[:border_count] = model.array(model.attributes['JOINTS_0'])[border_source]
    skin[:border_count] = model.array(model.attributes['WEIGHTS_0'])[border_source]
    return joints, skin


def refine(source, output, blender):
    model = Model(source)
    attrs = {key: model.array(index) for key, index in model.attributes.items()}
    world = from_gltf(attrs['POSITION'])
    original_normal = from_gltf(attrs['NORMAL'])
    faces = model.array(model.primitive['indices']).reshape(-1, 3)
    cut, (outside_ring, inside_ring), welded, weld = cut_mouth(world, original_normal, faces)
    ring = beak_plane(welded[outside_ring])
    outer = np.unique(faces[~cut])
    outer_by_weld = {weld[index]: index for index in outer}
    surface = fit_surface(welded[outside_ring])
    lod = source.stem == 'shelly-view'
    slot = ATLAS_SLOT[source.stem]

    def lining(plane):
        return surface(plane) + .024

    def build_patch(ring_ids, depth, inward):
        border = welded[ring_ids]
        plane, triangles = triangulate(blender, beak_plane(border), lod, inward)
        boundary_count = len(ring_ids)
        border_source = np.array([outer_by_weld[index] for index in ring_ids])
        patch_world = world_coordinates(plane, depth(plane))
        patch_world[:boundary_count] = border
        disp = np.array([[.0008, 0], [0, .0008]])
        first = world_coordinates(plane + disp[0], depth(plane + disp[0])) - world_coordinates(plane - disp[0], depth(plane - disp[0]))
        second = world_coordinates(plane + disp[1], depth(plane + disp[1])) - world_coordinates(plane - disp[1], depth(plane - disp[1]))
        normals = normalize(np.cross(first, second))
        if inward:
            triangles = triangles[:, [0, 2, 1]]
            normals = -normals
        normals[:boundary_count] = original_normal[border_source]
        skin_joints, skin_weights = weights(model, patch_world, border_source, boundary_count)
        uv_plane = np.clip(plane, ring.min(axis=0), ring.max(axis=0))
        return triangles, {'POSITION': to_gltf(patch_world), 'NORMAL': to_gltf(normals),
                           'TEXCOORD_0': bake_uv(uv_plane, ring, model.image(0).width, slot),
                           'JOINTS_0': skin_joints, 'WEIGHTS_0': skin_weights}

    outside_faces, outside_attrs = build_patch(outside_ring, surface, False)
    lining_faces, lining_attrs = build_patch(inside_ring, lining, True)
    patch_faces = np.vstack((outside_faces, lining_faces + len(outside_attrs['POSITION'])))
    if len(patch_faces) > cut.sum():
        raise RuntimeError(f'Replacement used {len(patch_faces)} of {cut.sum()} available triangles')
    patch_attrs = {key: np.concatenate((outside_attrs[key], lining_attrs[key])) for key in outside_attrs}
    reindex = np.full(len(world), -1)
    reindex[outer] = np.arange(len(outer))
    indices = np.vstack((reindex[faces[~cut]], patch_faces + len(outer))).reshape(-1, 1)
    arrays = {model.attributes[key]: np.concatenate((attrs[key][outer], patch_attrs[key])).astype(attrs[key].dtype)
              for key in patch_attrs}
    arrays[model.primitive['indices']] = indices
    images = rebake(model, world, faces, attrs['TEXCOORD_0'], cut, ring, slot)
    model.write(output, arrays, images)
    return {
        'source': str(source), 'output': str(output), 'triangles': len(indices) // 3,
        'replaced_triangles': int(cut.sum()), 'new_mouth_triangles': len(patch_faces),
        'trim_vertices': len(ring), 'bytes': output.stat().st_size,
        'clip_names': [clip['name'] for clip in model.doc['animations']],
        'skin_joints': len(model.doc['skins'][0]['joints']), 'atlas_slot': slot
    }


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--source-dir', type=Path, default=ROOT / 'assets/models')
    parser.add_argument('--output-dir', type=Path, required=True)
    parser.add_argument('--blender', default=shutil.which('blender'))
    args = parser.parse_args()
    if not args.blender:
        parser.error('Blender is required on PATH or through --blender')
    if args.output_dir.resolve() == args.source_dir.resolve():
        parser.error('Choose an output directory separate from the accepted models')
    args.output_dir.mkdir(parents=True, exist_ok=True)
    report = [refine(args.source_dir / f'{name}.glb', args.output_dir / f'{name}.glb', args.blender)
              for name in ATLAS_SLOT]
    summary = json.dumps(report, indent=2)
    (args.output_dir / 'asset-report.json').write_text(summary + '\n')
    print(summary)


if __name__ == '__main__':
    main()
