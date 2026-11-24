"""Staged TRELLIS reconstruction via gokaygokay/Flux-TRELLIS (stage-organic-v1).
No token or paid endpoint. Writes only under work/shelly-reference-rebuild/stage-organic-v1/.
"""
import json
import shutil
import time
from pathlib import Path
from PIL import Image
from gradio_client import Client, handle_file

STAGE = Path(__file__).resolve().parent
PREPROCESSED = STAGE / "trellis-preprocessed.png"
INPUT_RGB = STAGE / "trellis-input-rgb.png"
TARGET = STAGE / "shelly-trellis-raw.glb"
PREVIEW_MP4 = STAGE / "trellis-preview.mp4"
STATUS = STAGE / "reconstruction-status.json"

report = {
    "service": "gokaygokay/Flux-TRELLIS",
    "input_source": str(PREPROCESSED),
    "input_rgb": str(INPUT_RGB),
    "seed": 17,
    "ss_guidance_strength": 7.5,
    "ss_sampling_steps": 12,
    "slat_guidance_strength": 3.0,
    "slat_sampling_steps": 12,
    "mesh_simplify": 0.92,
    "texture_size": 2048,
    "status": "starting",
}


def save():
    STATUS.write_text(json.dumps(report, indent=2) + "\n")


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


def prepare_rgb_input():
    if not PREPROCESSED.exists():
        raise FileNotFoundError(f"Missing preprocessed image: {PREPROCESSED}")
    img = Image.open(PREPROCESSED)
    report["preprocessed_mode"] = img.mode
    report["preprocessed_size"] = list(img.size)
    if img.mode in ("RGBA", "LA") or ("transparency" in img.info):
        rgba = img.convert("RGBA")
        bg = Image.new("RGBA", rgba.size, (0, 0, 0, 255))
        comp = Image.alpha_composite(bg, rgba).convert("RGB")
    else:
        comp = img.convert("RGB")
    comp.save(INPUT_RGB, format="PNG", optimize=True)
    print(f"Prepared RGB black-bg input: {INPUT_RGB} ({comp.size}, from {img.mode})", flush=True)


def wait(job, label):
    last = None
    t0 = time.time()
    while not job.done():
        s = job.status()
        state = str(s.code)
        if state != last:
            print(f"{label}: {state} ({time.time() - t0:.1f}s)", flush=True)
            last = state
        time.sleep(3)
    res = job.result()
    print(f"{label}: done in {time.time() - t0:.1f}s", flush=True)
    return res


def main():
    prepare_rgb_input()
    save()
    t_start = time.time()
    try:
        client = Client("gokaygokay/Flux-TRELLIS", verbose=False, download_files=str(STAGE / "downloads"))
        print("Connected to gokaygokay/Flux-TRELLIS", flush=True)
        client.predict(api_name="/start_session")

        report["status"] = "generating"
        save()
        video_res = wait(
            client.submit(
                image=handle_file(str(INPUT_RGB)),
                seed=17,
                ss_guidance_strength=7.5,
                ss_sampling_steps=12,
                slat_guidance_strength=3.0,
                slat_sampling_steps=12,
                api_name="/image_to_3d",
            ),
            "image_to_3d",
        )
        video_path = unwrap_path(video_res)
        if video_path and Path(video_path).exists():
            shutil.copy2(video_path, PREVIEW_MP4)
            report["preview_video"] = str(PREVIEW_MP4)

        report["status"] = "extracting"
        save()
        glb_res = wait(
            client.submit(
                mesh_simplify=0.92,
                texture_size=2048,
                api_name="/extract_glb",
            ),
            "extract_glb",
        )
        items = list(glb_res) if isinstance(glb_res, (list, tuple)) else [glb_res]
        glb_path = None
        for item in items:
            candidate = unwrap_path(item)
            if candidate and candidate.endswith(".glb") and Path(candidate).exists():
                glb_path = candidate
                break
        if not glb_path:
            raise RuntimeError(f"Missing GLB in extract_glb output: {glb_res}")
        shutil.copy2(glb_path, TARGET)
        report.update(
            status="completed",
            glb=str(TARGET),
            bytes=TARGET.stat().st_size,
            elapsed_seconds=round(time.time() - t_start, 2),
        )
        save()
        print(f"Saved GLB: {TARGET} ({report['bytes']:,} bytes) in {report['elapsed_seconds']}s", flush=True)
    except Exception as exc:
        report.update(
            status="failed",
            error=f"{type(exc).__name__}: {exc}",
            elapsed_seconds=round(time.time() - t_start, 2),
        )
        save()
        print(f"FAILED: {report['error']}", flush=True)
        raise


if __name__ == "__main__":
    main()
