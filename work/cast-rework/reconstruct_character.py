"""Reusable Hugging Face TRELLIS.2 image-to-3D reconstruction (with Flux-TRELLIS fallback)."""
import argparse
import json
import shutil
import time
from pathlib import Path
from PIL import Image
from gradio_client import Client, handle_file
from huggingface_hub import get_token


def wait(job, label):
    last = None
    t0 = time.time()
    while not job.done():
        s = job.status()
        state = str(s.code)
        if state != last:
            print(f"  {label}: {state} ({time.time() - t0:.1f}s)", flush=True)
            last = state
        time.sleep(3)
    res = job.result()
    print(f"  {label}: done in {time.time() - t0:.1f}s", flush=True)
    return res


def unwrap_path(item):
    if isinstance(item, str):
        return item
    if isinstance(item, dict):
        for key in ("value", "path", "name", "url"):
            val = item.get(key)
            if isinstance(val, str) and val:
                return val
            if isinstance(val, dict):
                nested = unwrap_path(val)
                if nested:
                    return nested
    return None


def try_trellis2(in_path, out_glb, work_dir, seed):
    token = get_token()
    assert token, "Missing local HF token"
    client = Client("microsoft/TRELLIS.2", token=token, verbose=False, download_files=str(work_dir / "downloads"))
    print("Connected to microsoft/TRELLIS.2", flush=True)
    client.predict(api_name="/start_session")
    processed = wait(client.submit(handle_file(str(in_path)), api_name="/preprocess_image"), "preprocess")
    if isinstance(processed, str) and Path(processed).exists():
        shutil.copy2(processed, work_dir / "trellis-preprocessed.png")
    preview = wait(
        client.submit(image=handle_file(processed), seed=seed, resolution="1024", api_name="/image_to_3d"),
        "image_to_3d",
    )
    (work_dir / "remote-preview.html").write_text(preview if isinstance(preview, str) else str(preview))
    outputs = wait(
        client.submit(decimation_target=80000, texture_size=2048, api_name="/extract_glb"),
        "extract_glb",
    )
    files = outputs if isinstance(outputs, (list, tuple)) else [outputs]
    source = next(Path(v) for v in files if isinstance(v, str) and v.endswith(".glb"))
    shutil.copy2(source, out_glb)


def try_flux_trellis(in_path, out_glb, work_dir, seed):
    token = get_token()
    pre_path = work_dir / "trellis-preprocessed.png"
    src_img = Image.open(pre_path if pre_path.exists() else in_path)
    if src_img.mode in ("RGBA", "LA") or ("transparency" in src_img.info):
        rgba = src_img.convert("RGBA")
        comp = Image.alpha_composite(Image.new("RGBA", rgba.size, (0, 0, 0, 255)), rgba).convert("RGB")
    else:
        comp = src_img.convert("RGB")
    rgb_in = work_dir / "trellis-input-rgb.png"
    comp.save(rgb_in, format="PNG", optimize=True)

    client = Client("gokaygokay/Flux-TRELLIS", token=token, verbose=False, download_files=str(work_dir / "downloads_flux"))
    print("Connected to gokaygokay/Flux-TRELLIS fallback", flush=True)
    client.predict(api_name="/start_session")
    wait(
        client.submit(
            image=handle_file(str(rgb_in)),
            seed=seed,
            ss_guidance_strength=7.5,
            ss_sampling_steps=12,
            slat_guidance_strength=3.0,
            slat_sampling_steps=12,
            api_name="/image_to_3d",
        ),
        "flux_image_to_3d",
    )
    glb_res = wait(client.submit(mesh_simplify=0.92, texture_size=2048, api_name="/extract_glb"), "flux_extract_glb")
    items = list(glb_res) if isinstance(glb_res, (list, tuple)) else [glb_res]
    glb_path = next(unwrap_path(it) for it in items if unwrap_path(it) and str(unwrap_path(it)).endswith(".glb"))
    shutil.copy2(glb_path, out_glb)


def main():
    p = argparse.ArgumentParser()
    p.add_argument("--input", type=Path, required=True)
    p.add_argument("--output", type=Path, required=True)
    p.add_argument("--seed", type=int, default=17)
    args = p.parse_args()

    out_glb = args.output.resolve()
    work_dir = out_glb.parent
    work_dir.mkdir(parents=True, exist_ok=True)
    (work_dir / "downloads").mkdir(exist_ok=True)

    status = {"input": str(args.input), "output": str(out_glb), "seed": args.seed, "t0": time.time()}
    try:
        try_trellis2(args.input, out_glb, work_dir, args.seed)
        status["backend"] = "microsoft/TRELLIS.2"
    except Exception as exc:
        print(f"TRELLIS.2 error ({type(exc).__name__}: {exc}), falling back to Flux-TRELLIS...", flush=True)
        status["trellis2_error"] = f"{type(exc).__name__}: {exc}"
        try_flux_trellis(args.input, out_glb, work_dir, args.seed)
        status["backend"] = "gokaygokay/Flux-TRELLIS"

    status["bytes"] = out_glb.stat().st_size
    status["elapsed"] = round(time.time() - status["t0"], 2)
    (work_dir / "trellis-status.json").write_text(json.dumps(status, indent=2) + "\n")
    print(f"RECONSTRUCTED {out_glb.name}: {status['bytes']:,} B via {status['backend']} in {status['elapsed']}s", flush=True)


if __name__ == "__main__":
    main()
