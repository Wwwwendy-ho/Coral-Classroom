"""Pack color-polished.png and surface-polished.png into shelly-polished-geom.glb -> shelly-polished.glb."""
from pathlib import Path
import bpy

POL = Path(__file__).resolve().parent
GEOM = POL / "shelly-polished-geom.glb"
COLOR = POL / "color-polished.jpg"
SURFACE = POL / "surface-polished.png"
OUT = POL / "shelly-polished.glb"


def main():
    bpy.ops.object.select_all(action="SELECT")
    bpy.ops.object.delete(use_global=False)
    bpy.ops.import_scene.gltf(filepath=str(GEOM))
    obj = [o for o in bpy.context.scene.objects if o.type == "MESH"][0]
    bpy.context.view_layer.objects.active = obj

    mat = bpy.data.materials.new("Shelly | organic seafoam and lavender carapace")
    mat.use_nodes = True
    nt = mat.node_tree
    nt.nodes.clear()
    out_node = nt.nodes.new("ShaderNodeOutputMaterial")
    bsdf = nt.nodes.new("ShaderNodeBsdfPrincipled")
    bsdf.inputs["Metallic"].default_value = 0.0
    bsdf.inputs["Roughness"].default_value = 1.0
    if "Specular IOR Level" in bsdf.inputs:
        bsdf.inputs["Specular IOR Level"].default_value = 0.35

    tex_col = nt.nodes.new("ShaderNodeTexImage")
    img_col = bpy.data.images.load(str(COLOR))
    img_col.colorspace_settings.name = "sRGB"
    img_col.name = "Shelly | organic base color"
    tex_col.image = img_col

    tex_surf = nt.nodes.new("ShaderNodeTexImage")
    img_surf = bpy.data.images.load(str(SURFACE))
    img_surf.colorspace_settings.name = "Non-Color"
    img_surf.name = "Shelly | dielectric roughness and zero metal"
    tex_surf.image = img_surf

    sep = nt.nodes.new("ShaderNodeSeparateColor")
    nt.links.new(tex_col.outputs["Color"], bsdf.inputs["Base Color"])
    nt.links.new(tex_surf.outputs["Color"], sep.inputs["Color"])
    nt.links.new(sep.outputs["Green"], bsdf.inputs["Roughness"])
    nt.links.new(sep.outputs["Blue"], bsdf.inputs["Metallic"])
    nt.links.new(bsdf.outputs["BSDF"], out_node.inputs["Surface"])

    obj.data.materials.clear()
    obj.data.materials.append(mat)
    obj.name = "Shelly | organic sea turtle"

    bpy.ops.object.select_all(action="DESELECT")
    obj.select_set(True)
    bpy.ops.export_scene.gltf(
        filepath=str(OUT),
        export_format="GLB",
        use_selection=True,
        export_image_format="AUTO",
    )
    print(f"Exported {OUT} ({OUT.stat().st_size:,} bytes)")


if __name__ == "__main__":
    main()
