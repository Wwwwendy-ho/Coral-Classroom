"""Local RTX 5060 Hunyuan3D-2mini image-to-mesh reconstruction (zero quota)."""
import argparse
import gc
import json
import sys
import time
from pathlib import Path

import numpy as np
import torch
from PIL import Image
import rembg

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE / "_hy3d_src"))

from hy3dgen.shapegen import Hunyuan3DDiTFlowMatchingPipeline  # noqa: E402

ALL_SLUGS = ["echo", "taxi-squid", "bok", "hana", "captain-bay"]


def make_clean_cutout(src_png: Path, dst_cutout: Path, session) -> Image.Image:
    """Remove neutral grey backdrop via rembg and save centered square RGBA with ~10% pad."""
    raw = Image.open(src_png).convert("RGBA")
    cut = rembg.remove(raw, session=session).convert("RGBA")
    arr = np.asarray(cut).copy()
    alpha = arr[..., 3]
    # Remove faint halo fringe so silhouette masks stay crisp
    alpha[alpha < 28] = 0
    arr[..., 3] = alpha

    ys, xs = np.nonzero(alpha >= 28)
    if len(xs) == 0 or len(ys) == 0:
        raise RuntimeError(f"Empty foreground mask from {src_png}")
    x0, x1 = int(xs.min()), int(xs.max()) + 1
    y0, y1 = int(ys.min()), int(ys.max()) + 1
    crop = Image.fromarray(arr[y0:y1, x0:x1], mode="RGBA")
    cw, ch = crop.size
    side = max(768, int(round(max(cw, ch) / 0.80)))
    canvas = Image.new("RGBA", (side, side), (0, 0, 0, 0))
    scale = (side * 0.80) / max(cw, ch)
    nw, nh = max(1, int(round(cw * scale))), max(1, int(round(ch * scale)))
    resized = crop.resize((nw, nh), Image.Resampling.LANCZOS)
    canvas.paste(resized, ((side - nw) // 2, (side - nh) // 2), resized)
    if side > 1024:
        canvas = canvas.resize((1024, 1024), Image.Resampling.LANCZOS)
    canvas.save(dst_cutout, format="PNG", optimize=True)
    return canvas


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--slugs", nargs="+", default=ALL_SLUGS)
    p.add_argument("--seed", type=int, default=17)
    p.add_argument("--octree", type=int, default=256)
    p.add_argument("--steps", type=int, default=30)
    p.add_argument("--guidance", type=float, default=5.5)
    p.add_argument("--num-chunks", type=int, default=8000)
    p.add_argument("--skip-existing", action="store_true")
    args = p.parse_args()

    assert torch.cuda.is_available(), "CUDA GPU is required"
    print(
        f"Loading Hunyuan3D-2mini on {torch.cuda.get_device_name(0)} "
        f"(seed={args.seed}, octree={args.octree}, steps={args.steps}, guidance={args.guidance})",
        flush=True,
    )
    t_load = time.time()
    pipeline = Hunyuan3DDiTFlowMatchingPipeline.from_pretrained(
        "tencent/Hunyuan3D-2mini",
        subfolder="hunyuan3d-dit-v2-mini",
        use_safetensors=True,
        variant="fp16",
        dtype=torch.float16,
        device="cuda",
    )
    print(f"Pipeline loaded in {time.time() - t_load:.1f}s", flush=True)

    rembg_session = rembg.new_session("u2net")

    for slug in args.slugs:
        d = HERE / slug
        in_png = d / "concept-mp.png"
        out_cutout = d / "concept-cutout.png"
        out_glb = d / "raw-shape.glb"
        status_json = d / "hy3d-status.json"
        if not in_png.exists():
            raise FileNotFoundError(f"Missing concept image: {in_png}")
        if args.skip_existing and out_glb.exists() and out_glb.stat().st_size > 100_000:
            print(f"[{slug}] skipping existing {out_glb.name}", flush=True)
            continue

        t0 = time.time()
        cutout = make_clean_cutout(in_png, out_cutout, rembg_session)
        torch.cuda.empty_cache()
        torch.cuda.reset_peak_memory_stats()

        gen = torch.Generator("cuda").manual_seed(args.seed)
        res = pipeline(
            image=cutout,
            num_inference_steps=args.steps,
            guidance_scale=args.guidance,
            octree_resolution=args.octree,
            num_chunks=args.num_chunks,
            mc_algo="mc",
            output_type="trimesh",
            generator=gen,
        )
        mesh = res[0]
        if mesh is None or len(mesh.faces) == 0:
            raise RuntimeError(f"[{slug}] Hunyuan3D-2mini returned empty mesh")

        mesh.export(str(out_glb))
        peak_gb = torch.cuda.max_memory_allocated() / 1e9
        elapsed = time.time() - t0
        info = {
            "slug": slug,
            "model": "tencent/Hunyuan3D-2mini",
            "subfolder": "hunyuan3d-dit-v2-mini",
            "seed": args.seed,
            "octree_resolution": args.octree,
            "steps": args.steps,
            "guidance": args.guidance,
            "num_chunks": args.num_chunks,
            "vertices": int(len(mesh.vertices)),
            "faces": int(len(mesh.faces)),
            "bytes": int(out_glb.stat().st_size),
            "peak_vram_gb": round(peak_gb, 3),
            "elapsed_seconds": round(elapsed, 2),
        }
        status_json.write_text(json.dumps(info, indent=2) + "\n")
        print(
            f"[{slug}] DONE -> {out_glb.name}: {info['vertices']:,} verts, {info['faces']:,} faces, "
            f"{info['bytes']:,} B, peak VRAM {peak_gb:.2f} GB, {elapsed:.1f}s",
            flush=True,
        )
        del res, mesh
        gc.collect()
        torch.cuda.empty_cache()


if __name__ == "__main__":
    main()
