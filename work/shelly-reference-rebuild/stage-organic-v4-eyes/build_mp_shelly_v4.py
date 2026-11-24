"""Build rigged Mario-Party Bright-Eye Shelly GLBs (crafted-shelly.glb & crafted-shelly-view.glb) under stage-organic-v4-eyes/."""
import importlib.util
from pathlib import Path

HERE = Path(__file__).resolve().parent
RIG2_SCRIPT = HERE.parent / "stage-organic-v2" / "rigged" / "build_rigged_shelly.py"


def load_rig2():
    spec = importlib.util.spec_from_file_location("build_rigged_shelly", RIG2_SCRIPT)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def main():
    mod = load_rig2()
    mod.clear_scene()
    arm, hat, mouth = mod.setup_rig_from_canonical()
    src = mod.prepare_welded_source()

    hero_glb = HERE / "crafted-shelly.glb"
    view_glb = HERE / "crafted-shelly-view.glb"

    mod.export_rigged_lod(
        arm, hat, mouth, src,
        target_tris=22200, max_tris=23836,
        color_path=HERE / "color-2048.jpg",
        surface_path=HERE / "surface-512.png",
        out_path=hero_glb,
    )
    mod.export_rigged_lod(
        arm, hat, mouth, src,
        target_tris=11200, max_tris=11947,
        color_path=HERE / "color-1024.jpg",
        surface_path=HERE / "surface-256.png",
        out_path=view_glb,
    )
    print("Exported v4 GLBs:", hero_glb, view_glb)


if __name__ == "__main__":
    main()
