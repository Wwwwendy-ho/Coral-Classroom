"""Staged authenticated TRELLIS.2 1536 reconstruction for organic Shelly (stage-organic-v2).
Uses local HF token cache (never stored in repo). Writes only under stage-organic-v2/.
"""
import json
import shutil
import time
from pathlib import Path
from gradio_client import Client, handle_file
from huggingface_hub import get_token

STAGE = Path(__file__).resolve().parent
INPUT = STAGE.parent / "stage-organic-v1" / "input-shelly-clean.png"
TARGET = STAGE / "shelly-trellis1536-raw.glb"
STATUS = STAGE / "reconstruction-status.json"

report = {
    "service": "microsoft/TRELLIS.2",
    "input": str(INPUT),
    "seed": 42,
    "resolution": "1536",
    "ss_guidance_strength": 7.5,
    "ss_guidance_rescale": 0.7,
    "ss_sampling_steps": 12,
    "ss_rescale_t": 5.0,
    "shape_slat_guidance_strength": 7.5,
    "shape_slat_guidance_rescale": 0.5,
    "shape_slat_sampling_steps": 16,
    "shape_slat_rescale_t": 3.0,
    "tex_slat_guidance_strength": 3.5,
    "tex_slat_guidance_rescale": 0.5,
    "tex_slat_sampling_steps": 20,
    "tex_slat_rescale_t": 3.0,
    "decimation_target": 120000,
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
    if not INPUT.exists():
        raise FileNotFoundError(f"Missing clean input image: {INPUT}")
    token = get_token()
    assert token, "Missing local HF token"
    save()
    t_start = time.time()
    try:
        client = Client("microsoft/TRELLIS.2", token=token, verbose=False, download_files=str(STAGE / "downloads"))
        print("Connected to microsoft/TRELLIS.2 (authenticated)", flush=True)
        client.predict(api_name="/start_session")

        report["status"] = "preprocessing"
        save()
        processed = wait(client.submit(handle_file(str(INPUT)), api_name="/preprocess_image"), "preprocess")
        proc_path = unwrap_path(processed) or processed
        if isinstance(proc_path, str) and Path(proc_path).exists():
            shutil.copy2(proc_path, STAGE / "trellis-preprocessed.png")
            report["preprocessed"] = str(STAGE / "trellis-preprocessed.png")

        report["status"] = "generating"
        save()
        preview = wait(
            client.submit(
                image=handle_file(proc_path),
                seed=42,
                resolution="1536",
                ss_guidance_strength=7.5,
                ss_guidance_rescale=0.7,
                ss_sampling_steps=12,
                ss_rescale_t=5.0,
                shape_slat_guidance_strength=7.5,
                shape_slat_guidance_rescale=0.5,
                shape_slat_sampling_steps=16,
                shape_slat_rescale_t=3.0,
                tex_slat_guidance_strength=3.5,
                tex_slat_guidance_rescale=0.5,
                tex_slat_sampling_steps=20,
                tex_slat_rescale_t=3.0,
                api_name="/image_to_3d",
            ),
            "image_to_3d",
        )
        (STAGE / "remote-preview.html").write_text(preview if isinstance(preview, str) else str(preview))

        report["status"] = "extracting"
        save()
        outputs = wait(
            client.submit(
                decimation_target=120000,
                texture_size=2048,
                api_name="/extract_glb",
            ),
            "extract_glb",
        )
        files = list(outputs) if isinstance(outputs, (list, tuple)) else [outputs]
        source = None
        for item in files:
            candidate = unwrap_path(item)
            if candidate and candidate.endswith(".glb") and Path(candidate).exists():
                source = Path(candidate)
                break
        if not source:
            raise RuntimeError(f"Missing GLB in extract_glb output: {outputs}")
        shutil.copy2(source, TARGET)
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
