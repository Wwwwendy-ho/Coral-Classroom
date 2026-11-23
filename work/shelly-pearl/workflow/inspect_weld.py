import bpy,json,collections,bmesh
from pathlib import Path
bpy.ops.object.select_all(action='SELECT');bpy.ops.object.delete(use_global=False)
bpy.ops.import_scene.gltf(filepath='/workspace/work/shelly-pearl/workflow/shelly-pearl-calibrated.glb')
mesh=next(o for o in bpy.context.scene.objects if o.type=='MESH')
bpy.context.view_layer.objects.active=mesh;mesh.select_set(True)
bpy.ops.object.transform_apply(location=True,rotation=True,scale=True)
bm=bmesh.new();bm.from_mesh(mesh.data);bmesh.ops.remove_doubles(bm,verts=list(bm.verts),dist=0.000002);bm.to_mesh(mesh.data);bm.free();mesh.data.update()
vs=mesh.data.vertices
mins=[min(v.co[i] for v in vs) for i in range(3)];maxs=[max(v.co[i] for v in vs) for i in range(3)]
adj=[[] for v in vs]
for e in mesh.data.edges:
 a,b=e.vertices;adj[a].append(b);adj[b].append(a)
seen=set();parts=[]
for i in range(len(vs)):
 if i in seen:continue
 stack=[i];seen.add(i);component=[]
 while stack:
  a=stack.pop();component.append(a)
  for b in adj[a]:
   if b not in seen:seen.add(b);stack.append(b)
 parts.append(component)
parts.sort(key=len,reverse=True)
stats={'bounds_blender':[mins,maxs],'vertices':len(vs),'polygons':len(mesh.data.polygons),'components':len(parts),'largest_components':[len(p) for p in parts[:20]],'images':[(i.name,list(i.size)) for i in bpy.data.images if i.type=='IMAGE']}
Path('/workspace/work/shelly-pearl/workflow/blender-weld-inspection.json').write_text(json.dumps(stats,indent=2));print(stats)
