"""Taxi Squid v13 plush Mario-Party-8 procedural rebuild (board + close GLBs). Blender 4.3, no external assets.
blender -b --factory-startup --python tools/art/build_taxi_squid.py -- --output ../work/cast-upgrade/v13/taxi-squid

Architecture matches build_supporting_hosts.py (same Mesh/eye/rig/animate conventions, one skinned mesh, one opaque
2-image atlas, Idle/Listen/React clips, <= 16 bones, faces look along -Y, Z up). Replaces the legacy 0.58-matte
art-source/npcs/taxi-squid/source-reconstruction.glb with a clean plush squid:
  plump rounded egg mantle, big glossy dark-espresso eyes with twin catchlights, rosy cheeks, a yellow-and-black
  checkered taxi driver cap with glossy black visor, little ear fins and eight soft curled tentacles.
"""
import argparse, importlib.util, json, math, struct, sys
from pathlib import Path
import bpy
import numpy as np
from mathutils import Vector, Quaternion

spec = importlib.util.spec_from_file_location('supporting_hosts', str(Path(__file__).with_name('build_supporting_hosts.py')))
H = importlib.util.module_from_spec(spec); spec.loader.exec_module(H)
T = math.tau; Z = Vector((0, 0, 1)); PI = math.pi
TILES = {'skin': (0, 0, 512, 1024), 'eye': (512, 0, 256, 256), 'cap': (512, 256, 512, 384), 'arm': (512, 640, 256, 384),
         'rim': (768, 640, 256, 384), 'dark': (768, 0, 128, 128), 'gold': (896, 0, 128, 128), 'mouth': (768, 128, 128, 128), 'fin': (896, 128, 128, 128)}
H.TILES = TILES   # H.uv() reads the module-global tile table

def smooth(a, b, x):
    t = np.clip((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t)

# ---------------------------------------------------------------- textures
def paint_tile(name, u, v):
    n = H.cloud(u, v); zero = np.zeros_like(u); rough = np.full_like(u, .84); metal = zero
    if name == 'eye':
        # Shelly-grade continuous skin-blended eye (shared conforming_eye.paint_eye), warm espresso-amber iris.
        rgb, rough = H.CE.paint_eye('taxi-squid', u, v)
    elif name == 'skin':
        a = T * u
        # Soft pearl-lavender crown flowing to rosy-peach belly; velvet felt finish.
        rgb = H.mix((186, 148, 232), (252, 176, 200), smooth(.16, .84, v) * .92 + .04 * n)
        front = (.5 + .5 * np.cos(a)) ** 2 * smooth(.50, .86, v)
        rgb = H.paint(rgb, (255, 228, 224), front * .55)
        # A few friendly soft spots (plush appliqué, not photoreal chromatophores).
        spots = np.exp(-((((u * 9) % 1) - .5) / .17) ** 2 - ((((v * 13) % 1) - .5) / .17) ** 2) * (.5 + .5 * np.sin(u * 61 + v * 37)) ** 2
        rgb = H.paint(rgb, (238, 156, 190), spots * .30 * smooth(.08, .30, v) * (1 - smooth(.55, .80, v)))
        # Warm rosy cheek blush beneath and outboard of each eye.
        du = np.minimum(np.abs(u - .127), np.abs(u - .873))
        cheek = np.exp(-(du / .042) ** 2 - ((v - .644) / .078) ** 2)
        rgb = H.paint(rgb, (250, 104, 124), cheek * .86)
        rough = np.clip(.84 + .02 * n, .80, .88)
    elif name == 'cap':
        # Yellow-and-black taxi checker: 14 squares around, 6 rows crown-to-rim; soft dome shading.
        cu = np.floor(u * 14); cv = np.floor(v * 6); chk = ((cu + cv) % 2)
        yel = H.mix((255, 196, 28), (255, 224, 78), .5 + .35 * np.sin(PI * v) + .05 * n)
        blk = H.mix((24, 24, 30), (52, 52, 62), .35 + .25 * v)
        rgb = H.mix(blk, yel, chk * np.ones_like(u))
        rough = np.full_like(u, .62)
    elif name == 'arm':
        rgb = H.mix((250, 170, 196), (255, 214, 214), smooth(.0, 1.0, v) * .75 + .04 * n)
        rgb = H.paint(rgb, (255, 238, 228), smooth(.86, 1.0, v) * .55)
        # Soft cream sucker pads down the underside.
        pad = np.exp(-(((v * 11) % 1 - .5) / .24) ** 2) * np.exp(-((np.abs((u + .5) % 1 - .5) - .0) / .09) ** 2)
        rgb = H.paint(rgb, (255, 242, 232), pad * .80)
        rough = np.full_like(u, .82)
    elif name == 'rim':
        rgb = H.mix((228, 186, 220), (250, 204, 214), .5 + .1 * n + .2 * v)
        rough = np.full_like(u, .84)
    elif name == 'dark':
        rgb = H.mix((20, 20, 26), (46, 46, 58), .3 + .4 * v); rough = np.full_like(u, .38)
    elif name == 'mouth':
        rgb = H.mix((120, 52, 74), (158, 76, 96), .5 + .3 * v); rough = np.full_like(u, .70)
    elif name == 'gold':
        rgb = H.mix((250, 190, 30), (255, 226, 92), .45 + .3 * v); rough = np.full_like(u, .44); metal = np.full_like(u, .06)
    elif name == 'fin':
        rgb = H.mix((184, 144, 224), (246, 174, 206), .30 + .55 * v + .04 * n); rough = np.full_like(u, .84)
    else:
        rgb = np.broadcast_to(np.array((255., 255., 255.)), u.shape + (3,)).copy()
    return rgb, rough, metal

def atlas(out, size):
    color = np.full((size, size, 3), 128, np.uint8); sur = np.zeros_like(color); f = size / 1024
    for name, tile in TILES.items():
        x, y, w, h = (int(q * f) for q in tile)
        u, v = np.meshgrid((np.arange(w) + .5 - 4 * f) / (w - 8 * f), (np.arange(h) + .5 - 4 * f) / (h - 8 * f)); u, v = np.clip(u, 0, 1), np.clip(v, 0, 1)
        rgb, r, m = paint_tile(name, u, v)
        color[y:y + h, x:x + w] = np.uint8(np.clip(rgb, 0, 255)); sur[y:y + h, x:x + w, 0] = 255
        sur[y:y + h, x:x + w, 1] = np.uint8(np.clip(r * 255, 0, 255)); sur[y:y + h, x:x + w, 2] = np.uint8(m * 255)
    raw = out / f'color-{size}.png'; jpg = out / f'color-{size}.jpg'; surf = out / f'surface-{size // 4}.png'; H.png(raw, color)
    im = bpy.data.images.load(str(raw)); _ = im.size[:]; im.file_format = 'JPEG'; im.save(filepath=str(jpg), quality=88); bpy.data.images.remove(im)
    H.png(surf, np.uint8(sur.reshape(size // 4, 4, size // 4, 4, 3).mean(axis=(1, 3))))
    mat = bpy.data.materials.new('taxi-squid | plush painted atlas'); mat.use_nodes = True; ns = mat.node_tree.nodes; lk = mat.node_tree.links
    bs = ns.get('Principled BSDF'); bs.inputs['Specular IOR Level'].default_value = .16
    tex = ns.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(str(jpg)); tex.image.pack(); lk.new(tex.outputs['Color'], bs.inputs['Base Color'])
    tex = ns.new('ShaderNodeTexImage'); tex.image = bpy.data.images.load(str(surf)); tex.image.colorspace_settings.name = 'Non-Color'; tex.image.pack()
    sep = ns.new('ShaderNodeSeparateColor'); lk.new(tex.outputs['Color'], sep.inputs[0]); lk.new(sep.outputs['Green'], bs.inputs['Roughness']); lk.new(sep.outputs['Blue'], bs.inputs['Metallic'])
    return mat

# ---------------------------------------------------------------- geometry
ZC, RW, RD, RH = 1.42, .76, .72, 1.03    # softly lowered upper mantle (-8% height) for peak Nintendo cuteness
def egg(u, v, extra=0.):
    a = T * u; t = PI * (.001 + .998 * v); s = math.sin(t); c = math.cos(t)
    width = RW * s * (1 - .14 * c); depth = RD * s * (1 - .12 * c)
    lean = .26 * max(0., c) ** 1.5
    p = Vector((width * math.sin(a), lean - depth * math.cos(a), ZC + RH * c))
    return p + Vector((math.sin(a), -math.cos(a), .3 * c)) * extra

def egg_point(angle, z):
    c = (z - ZC) / RH; t = math.acos(max(-1., min(1., c))); return egg(angle / T, t / PI)

def squid_eye(side):
    cen = egg_point(side * .56, 1.14); n = Vector((side * .42, -.90, .09)).normalized(); h = Z.cross(n).normalized(); v = n.cross(h).normalized()
    return cen, h, v, n

CAP_C = Vector((0, .135, 2.09)); CAP_S = (.59, .58, .40)
ARM_N = 8
def arm_path(i):
    th = T * i / ARM_N + .26; length = (1.34, 1.06)[i % 2]; curl = (3.6, 3.0)[i % 2]
    R = .40; start = Vector((R * math.sin(th), -.30 * math.cos(th) * 1.05 - .04, .66))
    pts = [start]; p = start.copy(); steps = 40; ds = length / steps
    out = Vector((math.sin(th), -math.cos(th), 0)); side = Vector((math.cos(th), math.sin(th), 0))
    for k in range(steps):
        t = (k + .5) / steps; beta = .20 + curl * t ** 2.2          # 0 = straight down, grows into a soft outward/up curl
        d = Vector((0, 0, -1)) * math.cos(beta) + out * math.sin(beta) * (1.0 - .35 * t)
        d += side * (.16 * math.sin(T * t * .5 + i)) * t
        p = p + d.normalized() * ds; pts.append(p.copy())
    return pts, th

def _min_arm_z():
    return min(p.z for i in range(ARM_N) for p in arm_path(i)[0]) - .03
OFFZ = .02 - _min_arm_z()

def interp(pts, v):
    q = max(0., min(len(pts) - 1.000001, v * (len(pts) - 1))); i = int(q); f = q - i; return pts[i].lerp(pts[i + 1], f)

def arm_tube(b, pts, th, weights, n, m):
    """Tentacle with a parallel-transported frame (no t x Z flips/twists) and a smooth hemispherical closed tip."""
    side = Vector((math.cos(th), math.sin(th), 0)); frames = []
    for k in range(m + 1):
        v = k / m; t = (interp(pts, min(1, v + .004)) - interp(pts, max(0, v - .004))).normalized()
        a = (side - t * side.dot(t)).normalized(); frames.append((a, t.cross(a).normalized()))
    def rad(v):
        tip = max(0., (v - .88) / .12)
        return (.165 * (1 - .74 * v ** .9) + .018) * math.sqrt(max(0., 1 - tip * tip)) + .0015
    def point(u, v):
        a, bb = frames[min(m, int(round(v * m)))]
        return interp(pts, v) + rad(v) * (a * math.cos(T * u) + bb * math.sin(T * u))
    b.grid(point, n, m, 'arm', weights, True)

def squid_mesh(close, mat, rig):
    b = H.Mesh(); q = lambda a, c: c if close else a
    b.grid(egg, q(36, 56), q(24, 38), 'skin', 'Head', True, True)
    for s in (-1, 1):
        H.eye(b, s, q(22, 32), q(14, 22), squid_eye, .215, egg, 'taxi-squid', lambda us, vs: paint_tile('skin', us, vs)[0], (q(36, 56), q(24, 38)))
        # Cute plush rounded triangular-diamond squid mantle fins at upper-rear mantle beneath the checkered cap.
        suf = 'L' if s < 0 else 'R'
        def squid_fin(u, v, layer, s=s):
            th_a = -PI * .48 + PI * .96 * u
            r_out = .36 + .28 * math.exp(-((th_a - .16) / .38) ** 2)
            dx = r_out * math.cos(th_a) * v
            dz = r_out * math.sin(th_a) * .76 * v
            y_mid = .22 + .24 * v + .14 * v * math.cos(th_a - .20)
            dy = layer * .092 * (math.sin(PI * v) ** .55) * (.40 + .60 * (math.sin(PI * u) ** .50))
            return Vector((s * (.43 + dx), y_mid + dy, 1.74 + dz))
        for layer in (-1, 1):
            b.grid(lambda u, v, layer=layer: squid_fin(u, v, layer), q(12, 18), q(6, 10), 'fin', 'Fin.' + suf, reverse=(layer * s < 0))
    # Friendly curved smile.
    def smile(t):
        x = (2 * t - 1) * .115; return Vector((x, -.648 + .95 * x * x - .018, .905 - .050 * (1 - (2 * t - 1) ** 2)))
    b.tube(smile, .0125, q(5, 7), q(10, 14), 'mouth', 'Head')
    # Eight soft curled tentacles with rounded tips; weights ease from Head into each Arm bone.
    for i in range(ARM_N):
        pts, th = arm_path(i); name = 'Arm.%d' % i
        weights = lambda p, u, v, name=name: {'Head': 1 - float(smooth(.10, .50, np.array(v))), name: float(smooth(.10, .50, np.array(v)))}
        arm_tube(b, pts, th, weights, q(8, 12), q(16, 28))
    # Taxi cap: puffy checkered dome + glossy black visor + yellow button.
    b.grid(lambda u, v: CAP_C + Vector((CAP_S[0] * math.sin(T * u) * math.sin((.001 + .999 * v) * PI / 2), -CAP_S[1] * math.cos(T * u) * math.sin((.001 + .999 * v) * PI / 2), CAP_S[2] * math.cos((.001 + .999 * v) * PI / 2) - .02 * math.sin(T * u) * 0)),
           q(28, 44), q(8, 14), 'cap', 'Head', True, True, uvfn=lambda u, v: (u, v))
    # Cap lower band (thick rounded rim) overlaps slightly upward into dome to eliminate any seam gap.
    b.grid(lambda u, v: CAP_C + Vector(((CAP_S[0] + .008) * math.sin(T * u), -(CAP_S[1] + .008) * math.cos(T * u), .015 - .110 * v)) , q(28, 44), q(2, 3), 'dark', 'Head', True, False)
    th = .20
    def visor(u, v):
        a = T * u; t = PI * (.002 + .996 * v)
        x = .48 * math.sin(t) * math.sin(a); y = -.29 * math.sin(t) * math.cos(a); z = .062 * math.cos(t)
        return Vector((x, y * math.cos(th) - z * math.sin(th) + -.72, y * math.sin(th) + z * math.cos(th) + 2.035))
    b.grid(visor, q(24, 36), q(10, 16), 'dark', 'Head', True, True)
    b.ellipsoid((0, .135, 2.495), (.065, .065, .055), 'gold', 'Head', q(10, 16), q(6, 10))
    b.v = [Vector(p) + Vector((0, 0, OFFZ)) for p in b.v]
    return b.object(mat, rig, 'Taxi Squid')

def rig_create():
    data = bpy.data.armatures.new('taxi-squid species skeleton'); ob = bpy.data.objects.new('taxi-squid rig', data); bpy.context.collection.objects.link(ob)
    bpy.context.view_layer.objects.active = ob; ob.select_set(True); bpy.ops.object.mode_set(mode='EDIT')
    def bone(name, head, tail, parent=None):
        e = data.edit_bones.new(name); e.head = Vector(head) + Vector((0, 0, OFFZ)); e.tail = Vector(tail) + Vector((0, 0, OFFZ))
        if parent: e.parent = data.edit_bones[parent]
    bone('Float', (0, 0, 0), (0, 0, .25)); bone('Head', (0, 0, 1.2), (0, 0, 2.05), 'Float')
    for s, suf in ((-1, 'L'), (1, 'R')):
        c, h, v, n = squid_eye(s); bone('Eye.' + suf, c, c + n * .2, 'Head'); bone('Fin.' + suf, (s * .46, .24, 1.79), (s * .98, .50, 1.93), 'Head')
    for i in range(ARM_N):
        pts, th = arm_path(i); bone('Arm.%d' % i, pts[0], pts[len(pts) // 2], 'Head')
    bpy.ops.object.mode_set(mode='OBJECT'); return ob

def animate(rig):
    clips = {
        'Idle': [(1, 0, 0, 0, 0), (21, .035, 1.2, 0, -1.2), (38, .055, 2.0, 5, -1.2), (48, .042, 1.0, 5, -.4), (67, -.025, -1.4, -3, 0), (99, 0, 0, 0, 0)],
        'Listen': [(1, 0, 0, 0, 0), (10, .020, -2.5, 3, -3), (30, .034, -2.5, 3, -3), (44, .024, 3.0, 1, -1.5), (62, .004, .5, 0, 0), (85, 0, 0, 0, 0)],
        'React': [(1, 0, 0, 0, 0), (7, -.040, -2.5, -6, -3), (16, .150, 6.0, -4, 4), (26, .075, 2.5, 3, 1.5), (40, .016, -1.0, 0, 0), (53, 0, 0, 0, 0)]}
    bpy.context.scene.render.fps = 30; rig.animation_data_create()
    for name, keys in clips.items():
        act = bpy.data.actions.new(name); rig.animation_data.action = act
        for f, bob, tilt, gaze, pitch in keys:
            env = 0 if f in (keys[0][0], keys[-1][0]) else 1
            for bone in rig.pose.bones:
                bone.rotation_mode = 'QUATERNION'; bone.rotation_quaternion = Quaternion(); bone.location = (0, 0, 0); bone.scale = (1, 1, 1)
            root = rig.pose.bones['Float']; root.location = (0, bob, 0); root.keyframe_insert('location', frame=f)
            def rotate(n, axis, deg):
                p = rig.pose.bones[n]; local = rig.data.bones[n].matrix_local.to_quaternion().inverted() @ Vector(axis); p.rotation_quaternion = Quaternion(local, math.radians(deg)); p.keyframe_insert('rotation_quaternion', frame=f)
            hd = rig.pose.bones['Head']; sq = 1 + (.07 if name == 'React' else .026) * math.sin(f * (.22 if name == 'React' else .14)) * env
            hd.scale = (sq, 1 / sq, sq); hd.keyframe_insert('scale', frame=f); rotate('Head', (1, 0, .25), tilt)
            amp = 15 if name == 'React' else 7
            for i in range(ARM_N):
                th = T * i / ARM_N + .26
                rotate('Arm.%d' % i, (-math.sin(th), math.cos(th), 0), env * amp * math.sin(f * (.34 if name == 'React' else .19) + i * .8) + tilt * 1.2)
            for s, suf in ((-1, 'L'), (1, 'R')):
                p = rig.pose.bones['Eye.' + suf]; inv = rig.data.bones[p.name].matrix_local.to_quaternion().inverted()
                eg = max(-3., min(3., gaze * .45)); ep = max(-3., min(3., pitch * .6)); p.rotation_quaternion = Quaternion(inv @ Z, math.radians(eg)) @ Quaternion(inv @ Vector((1, 0, 0)), math.radians(ep)); p.keyframe_insert('rotation_quaternion', frame=f)
                rotate('Fin.' + suf, (0, 1, 0), s * (env * (10 if name == 'React' else 5) * math.sin(f * .27 + s) + tilt * 1.0))
        for c in act.fcurves:
            for k in c.keyframe_points: k.handle_left_type = k.handle_right_type = 'AUTO_CLAMPED'
        act.use_fake_user = True; rig.animation_data.action = None; track = rig.animation_data.nla_tracks.new(); track.name = name; track.strips.new(name, 1, act); track.mute = True
    rig.animation_data.action = bpy.data.actions['Idle']; bpy.context.scene.frame_set(1)

def build(lod, out):
    bpy.ops.wm.read_factory_settings(use_empty=True); mat = lambda: atlas(out, 2048 if lod == 'close' else 1024); rig = rig_create(); mesh = squid_mesh(lod == 'close', mat, rig); animate(rig)
    bpy.ops.object.select_all(action='DESELECT'); mesh.select_set(True); rig.select_set(True); bpy.context.view_layer.objects.active = mesh
    dest = out / f'taxi-squid-{lod}.glb' if lod == 'close' else out / 'taxi-squid.glb'
    bpy.ops.export_scene.gltf(filepath=str(dest), export_format='GLB', use_selection=True, export_animations=True, export_animation_mode='ACTIONS', export_force_sampling=True, export_apply=False, export_image_format='AUTO', export_extras=False, export_yup=True, export_rest_position_armature=True)
    report = H.stats(dest); (out / f'{lod}-report.json').write_text(json.dumps(report, indent=2) + '\n')
    assert report['primitives'] == report['materials'] == report['meshCount'] == 1 and report['bones'] <= 16, report
    assert {a['name'] for a in report['clips']} >= {'Idle', 'React'}, report
    assert report['bytes'] < (1433.6 * 1024 if lod == 'close' else 650 * 1024), report
    if lod == 'close':
        bpy.context.preferences.filepaths.save_version = 0; bpy.ops.wm.save_as_mainfile(filepath=str(out / 'taxi-squid.blend'), compress=True)
    print('TAXI_SQUID_REPORT', json.dumps(report), flush=True)

if __name__ == '__main__':
    p = argparse.ArgumentParser(); p.add_argument('--output', type=Path, required=True); p.add_argument('--lod', choices=['board', 'close', 'both'], default='both')
    a = p.parse_args(sys.argv[sys.argv.index('--') + 1:]); a.output = a.output.resolve(); a.output.mkdir(parents=True, exist_ok=True)
    for lod in ('board', 'close') if a.lod == 'both' else [a.lod]: build(lod, a.output)
