#!/usr/bin/env python3
"""Offline Blender CPU inspection of actual reef-static-world-v1 JSON exports.

Usage (from repo root):
 blender -b --python tools/art/render_world_scenery.py -- \
   --exports /workspace/work/world-realism --output /workspace/work/world-realism/renders \
   --regions town cove --frames overview close

Emission only; exported baked colors and exact atlas math, no invented lights.
Simple route disks and Cove seabed are labeled reference context, not game art.
"""
import argparse,json,math,sys
from pathlib import Path
import bpy
from mathutils import Vector


def arguments():
    args=sys.argv[sys.argv.index('--')+1:] if '--' in sys.argv else []
    p=argparse.ArgumentParser(description=__doc__)
    p.add_argument('--exports',type=Path,default=Path('/workspace/work/world-realism'))
    p.add_argument('--output',type=Path,default=Path('/workspace/work/world-realism/renders'))
    p.add_argument('--regions',nargs='+',default=['town','cove'])
    p.add_argument('--frames',nargs='+',choices=['overview','close'],default=['overview','close'])
    p.add_argument('--atlas',type=Path,default=Path(__file__).resolve().parents[2]/'assets/world/world-surfaces.jpg')
    p.add_argument('--width',type=int,default=1024);p.add_argument('--height',type=int,default=768)
    p.add_argument('--fog',action='store_true',help='Apply exported Three smoothstep view-depth fog; omitted by default for inspection.')
    return p.parse_args(args)


def node(nodes,kind,**kwargs):
    n=nodes.new(kind)
    for k,v in kwargs.items():setattr(n,k,v)
    return n


def op(nodes,links,operation,a,b=None):
    n=node(nodes,'ShaderNodeMath',operation=operation)
    for i,value in enumerate([a,b]):
        if value is None:continue
        if isinstance(value,(float,int)):n.inputs[i].default_value=value
        else:links.new(value,n.inputs[i])
    return n.outputs[0]


def flat_material(name,color):
    mat=bpy.data.materials.new(name);mat.use_nodes=True;n=mat.node_tree.nodes;n.clear();l=mat.node_tree.links
    emit=node(n,'ShaderNodeEmission');emit.inputs['Color'].default_value=(*color,1)
    out=node(n,'ShaderNodeOutputMaterial');l.new(emit.outputs[0],out.inputs['Surface']);return mat


def material(src,textures,fog,with_fog):
    mat=bpy.data.materials.new('export-material-'+str(src['id']));mat.use_nodes=True
    n=mat.node_tree.nodes;n.clear();l=mat.node_tree.links
    attr=node(n,'ShaderNodeVertexColor',layer_name='baked');color=attr.outputs['Color']
    multiply=node(n,'ShaderNodeMixRGB',blend_type='MULTIPLY');multiply.inputs[0].default_value=1
    multiply.inputs[2].default_value=(*src.get('color',[1,1,1]),1);l.new(color,multiply.inputs[1]);color=multiply.outputs[0]
    if src.get('map') is not None:
        texture=textures[src['map']];image=bpy.data.images.load(texture['file'],check_existing=True)
        image.colorspace_settings.name='Non-Color'
        size=texture.get('targetSize')
        if size and tuple(image.size)!=(size,size):image.scale(size,size)
        tex=node(n,'ShaderNodeTexImage');tex.image=image;tex.interpolation='Linear';tex.extension='REPEAT'
        uv=node(n,'ShaderNodeUVMap',uv_map='worldUV').outputs[0]
        if src.get('surfaceAtlas'):
            sep=node(n,'ShaderNodeSeparateXYZ');l.new(uv,sep.inputs[0]);panel=node(n,'ShaderNodeAttribute',attribute_name='reefSurface').outputs['Fac']
            column=op(n,l,'MODULO',panel,4);row=op(n,l,'SUBTRACT',1,op(n,l,'FLOOR',op(n,l,'DIVIDE',panel,4)))
            # Exact production shader: inset 8.5/1024, one wrap per source UV.
            x=op(n,l,'ADD',op(n,l,'ADD',op(n,l,'MULTIPLY',column,.25),8.5/1024),op(n,l,'MULTIPLY',op(n,l,'FRACT',sep.outputs[0]),.25-17/1024))
            y=op(n,l,'ADD',op(n,l,'ADD',op(n,l,'MULTIPLY',row,.5),8.5/1024),op(n,l,'MULTIPLY',op(n,l,'FRACT',sep.outputs[1]),.5-17/1024))
            combine=node(n,'ShaderNodeCombineXYZ');l.new(x,combine.inputs[0]);l.new(y,combine.inputs[1]);uv=combine.outputs[0]
        l.new(uv,tex.inputs['Vector'])
        sample=tex.outputs['Color']
        if src.get('surfaceAtlas'):
            blend=node(n,'ShaderNodeMixRGB',blend_type='MIX');blend.inputs[0].default_value=.55;blend.inputs[1].default_value=(1,1,1,1);l.new(sample,blend.inputs[2]);sample=blend.outputs[0]
        mult=node(n,'ShaderNodeMixRGB',blend_type='MULTIPLY');mult.inputs[0].default_value=1;l.new(color,mult.inputs[1]);l.new(sample,mult.inputs[2]);color=mult.outputs[0]
    if with_fog and fog and src.get('fog',True):
        camera=node(n,'ShaderNodeCameraData');depth=camera.outputs['View Z Depth']
        t=op(n,l,'DIVIDE',op(n,l,'SUBTRACT',depth,fog['near']),fog['far']-fog['near'])
        clamp=node(n,'ShaderNodeClamp');l.new(t,clamp.inputs[0]);t=clamp.outputs[0]
        smooth=op(n,l,'MULTIPLY',op(n,l,'MULTIPLY',t,t),op(n,l,'SUBTRACT',3,op(n,l,'MULTIPLY',2,t)))
        mix=node(n,'ShaderNodeMixRGB',blend_type='MIX');l.new(smooth,mix.inputs[0]);l.new(color,mix.inputs[1]);mix.inputs[2].default_value=(*fog['color'],1);color=mix.outputs[0]
    emit=node(n,'ShaderNodeEmission');l.new(color,emit.inputs['Color']);out=node(n,'ShaderNodeOutputMaterial')
    shader=emit.outputs[0]
    if src.get('side',0)==0:
        geometry=node(n,'ShaderNodeNewGeometry');transparent=node(n,'ShaderNodeBsdfTransparent');mix=node(n,'ShaderNodeMixShader')
        l.new(geometry.outputs['Backfacing'],mix.inputs[0]);l.new(shader,mix.inputs[1]);l.new(transparent.outputs[0],mix.inputs[2]);shader=mix.outputs[0]
    l.new(shader,out.inputs['Surface'])
    return mat


def convert(p):return (p[0],-p[2],p[1])


def import_world(data,args):
    textures={t['id']:dict(t) for t in data['textures']}
    for t in textures.values():
        path=Path(t['file'])
        if t.get('kind')=='world-surface-atlas':path=args.atlas
        elif not path.exists():path=args.exports/data['variant']/path.name
        if not path.exists():raise FileNotFoundError(path)
        t['file']=str(path)
    mats={m['id']:material(m,textures,data.get('fog'),args.fog) for m in data['materials']}
    for obj in data['objects']:
        a=obj['attributes'];p=a['position'];vertices=[convert(p[i:i+3]) for i in range(0,len(p),3)]
        indices=obj.get('index') or list(range(len(vertices)));faces=[indices[i:i+3] for i in range(0,len(indices),3)]
        mesh=bpy.data.meshes.new(obj['name']);mesh.from_pydata(vertices,[],faces);mesh.update()
        colors=a.get('color',[1]*len(p));attribute=mesh.color_attributes.new(name='baked',type='FLOAT_COLOR',domain='POINT')
        attribute.data.foreach_set('color',[x for i in range(len(vertices)) for x in (*colors[i*3:i*3+3],1)])
        if 'uv' in a:
            layer=mesh.uv_layers.new(name='worldUV');uv=a['uv']
            layer.data.foreach_set('uv',[value for loop in mesh.loops for value in uv[loop.vertex_index*2:loop.vertex_index*2+2]])
        if 'reefSurface' in a:
            surface=mesh.attributes.new(name='reefSurface',type='FLOAT',domain='POINT');surface.data.foreach_set('value',a['reefSurface'])
        o=bpy.data.objects.new(obj['name'],mesh);bpy.context.collection.objects.link(o);o.data.materials.append(mats[obj['material']])


def context(data):
    route=flat_material('REFERENCE route disks',(.94,.94,.89));start=flat_material('REFERENCE start disk',(.92,.49,.35))
    for s in data['spaces']:
        bpy.ops.mesh.primitive_cylinder_add(vertices=16,radius=.72,depth=.08,location=(s['x'],-s['z'],s.get('y',0)+.035))
        o=bpy.context.object;o.name='REFERENCE route space '+str(s['i']);o.data.materials.append(start if s['i']==0 else route)
    if data['id']=='cove' and not any(o.get('context')=='reference-seabed' for o in data['objects']):
        bpy.ops.mesh.primitive_plane_add(size=250,location=(0,0,-.3));o=bpy.context.object;o.name='REFERENCE seabed (not exported scenery)';o.data.materials.append(flat_material('REFERENCE seabed',(.69,.81,.76)))


def frame_points(pair,kind):
    out=[]
    for data in pair:
        for s in data['spaces']:
            if kind=='overview' or s['i']<7:out.append(Vector(convert([s['x'],s.get('y',0),s['z']])))
        for o in data['objects']:
            if o.get('context'):continue
            p=o['attributes']['position']
            elevated=[p[i:i+3] for i in range(0,len(p),3) if p[i+1]>=.15]
            # Include a complete nearby chunk, rather than cutting a landmark at
            # the spherical selection boundary. Water and low floors stay out.
            if kind=='close' and not any((x+3)**2+(z+4)**2<=13**2 for x,y,z in elevated):continue
            out.extend(Vector(convert(point)) for point in elevated)
    return out


def set_camera(points,args):
    direction=Vector((.45,-.8,.95)).normalized();right=direction.cross(Vector((0,0,1))).normalized();up=right.cross(direction).normalized()
    # right is camera-left here; only its projected extent matters for fitting.
    ranges=[]
    for axis in [right,up,direction]:
        d=[p.dot(axis) for p in points];ranges.append((min(d),max(d)))
    center=sum((axis*((low+high)/2) for axis,(low,high) in zip([right,up,direction],ranges)),Vector())
    cam_data=bpy.data.cameras.new('matched orthographic camera');cam=bpy.data.objects.new('matched orthographic camera',cam_data);bpy.context.collection.objects.link(cam)
    cam.location=center+direction*80;cam.rotation_euler=(center-cam.location).to_track_quat('-Z','Y').to_euler();cam_data.type='ORTHO';cam_data.ortho_scale=max(ranges[0][1]-ranges[0][0],(ranges[1][1]-ranges[1][0])*(args.width/args.height))*1.13;cam_data.clip_end=300;bpy.context.scene.camera=cam
    return {'location':list(cam.location),'target':list(center),'orthographicScale':cam_data.ortho_scale}


def configure(data,args):
    scene=bpy.context.scene;scene.render.engine='CYCLES';scene.cycles.device='CPU';scene.cycles.samples=1;scene.cycles.use_denoising=False
    scene.render.resolution_x=args.width;scene.render.resolution_y=args.height;scene.render.resolution_percentage=100
    scene.render.image_settings.file_format='PNG';scene.render.image_settings.color_mode='RGB';scene.render.film_transparent=False
    scene.view_settings.view_transform='Raw';scene.view_settings.look='None';scene.view_settings.exposure=0;scene.view_settings.gamma=1
    scene.world.use_nodes=True;scene.world.node_tree.nodes.get('Background').inputs['Color'].default_value=(*data['background'],1);scene.world.node_tree.nodes.get('Background').inputs['Strength'].default_value=1
    # This is an inspection scene: no light objects, shadows or postprocessing.
    scene.render.use_compositing=False
    scene.render.use_stamp=True;scene.render.use_stamp_note=True;scene.render.stamp_font_size=13
    for name in ['date','time','render_time','frame','scene','filename','camera','hostname','marker','lens','memory']:
        field='use_stamp_'+name
        if hasattr(scene.render,field):setattr(scene.render,field,False)
    scene.render.stamp_foreground=(1,1,1,1);scene.render.stamp_background=(.02,.03,.04,.9)


def main():
    args=arguments();args.output.mkdir(parents=True,exist_ok=True);manifest=[]
    for region in args.regions:
        pair=[json.loads((args.exports/v/(region+'.json')).read_text()) for v in ['before','after']]
        for kind in args.frames:
            points=frame_points(pair,kind)
            for data in pair:
                bpy.ops.wm.read_factory_settings(use_empty=True);bpy.context.scene.world=bpy.data.worlds.new('background')
                configure(data,args);import_world(data,args);context(data);camera=set_camera(points,args)
                path=args.output/f'{region}-{kind}-{data["variant"]}.png';bpy.context.scene.render.filepath=str(path)
                bpy.context.scene.render.stamp_note_text=f'{region.upper()} / {data["variant"].upper()} / {kind} | OFFLINE SCENERY ONLY | Ref disks; orange=start; no characters/UI; fog '+('on' if args.fog else 'omitted')
                bpy.ops.render.render(write_still=True)
                record={'file':path.name,'region':region,'variant':data['variant'],'frame':kind,'camera':camera,'scope':data['scope'],'sourceHashes':data['sourceHashes'],'stats':data['stats'],'fog':args.fog,'render':'offline scenery-only CPU emission; Raw view; reference route disks; Cove reference seabed'}
                manifest.append(record);(args.output/'manifest.json').write_text(json.dumps(manifest,indent=2))
                print('WORLD_RENDER_READY',path,flush=True)
    (args.output/'README.md').write_text('''# Offline scenery inspection\n\nThese are offline Blender CPU renders of actual exported baked scenery geometry. They are not game screenshots or device performance measurements. Baked vertex colors multiply the actual texture atlas with the production fract/inset formula and 0.55 blend; legacy repeating floor PNGs are used in before views. Emission materials, one sample, Raw color transform, no artistic lights or invented detail. Before/after pairs share camera, bounds and exposure. Distance fog is omitted by default to expose geometry; use `--fog` to apply exported depth fog.\n\nPale simple disks show route tile positions; the orange disk is start. These disks are reference markers, not actual game tile art. Cove includes the exported reference seabed; it is excluded from scenery counts. Character models, full board assets, UI and imported GLTF decorations are outside these exports. Region exports use the actual procedural fallback prop kit. See manifest.json for source hashes, scope, exact camera and CPU geometry counts. Counts are scenery-only and do not establish device FPS or full-game frame rate.\n\nFiles are named REGION-FRAME-VARIANT.png; compare before/after at the same frame.\n''')

if __name__=='__main__':main()
